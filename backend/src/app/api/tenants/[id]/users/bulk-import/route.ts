import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler } from '@/lib/errors';
import { ConflictError, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/middleware';

const prisma = new PrismaClient();

interface BulkImportUser {
  name: string;
  email: string;
  lineManager?: string;
  rowNumber: number;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
  created: Array<{
    id: string;
    email: string;
    name: string;
    lineManager?: string;
  }>;
}

// POST /api/tenants/[id]/users/bulk-import - Bulk import users
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is Organization Admin or Super Admin
    const isAuthorized = authResult.user.roles.some((role: any) => {
      const hasCorrectRole = ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(role.code);
      const hasCorrectTenant = (role.code === 'SUPER_ADMIN' || authResult.user?.tenantId === tenantId);
      return hasCorrectRole && hasCorrectTenant;
    });

    if (!isAuthorized) {
      throw new AuthorizationError('Insufficient permissions to bulk import users in this tenant');
    }

    // Parse request body
    const body = await request.json();
    const { users } = body;

    // Validate input
    if (!users || !Array.isArray(users) || users.length === 0) {
      throw new ValidationError('Users array is required and must not be empty');
    }

    // Validate array size (limit for performance)
    if (users.length > 1000) {
      throw new ValidationError('Maximum 1000 users allowed per bulk import');
    }

    // Get tenant to check domain restrictions
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { allowedDomains: true }
    });

    if (!tenant) {
      throw new ValidationError('Tenant not found');
    }

    // Get Employee role
    const employeeRole = await prisma.role.findUnique({
      where: { code: 'EMPLOYEE' }
    });

    if (!employeeRole) {
      throw new ValidationError('Employee role not found in system configuration');
    }

    // Get existing users in tenant to check for duplicates and line manager validation
    const existingUsers = await prisma.user.findMany({
      where: { tenantId },
      select: { email: true }
    });
    const existingEmails = new Set(existingUsers.map(u => u.email));

    // Track emails in current import batch to prevent duplicates within the batch
    const importEmails = new Set<string>();

    const results: ImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      created: []
    };

    // Validate all users first
    const validUsers: BulkImportUser[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const userData of users) {
      const { name, email, lineManager, rowNumber } = userData;
      let hasError = false;

      // Validate required fields
      if (!name?.trim()) {
        results.errors.push(`Row ${rowNumber}: Name is required`);
        hasError = true;
      }

      if (!email?.trim()) {
        results.errors.push(`Row ${rowNumber}: Email is required`);
        hasError = true;
      } else {
        const cleanEmail = email.trim().toLowerCase();

        // Validate email format
        if (!emailRegex.test(cleanEmail)) {
          results.errors.push(`Row ${rowNumber}: Invalid email format`);
          hasError = true;
        } else {
          // Check domain restrictions
          if (tenant.allowedDomains && tenant.allowedDomains.length > 0) {
            const emailDomain = cleanEmail.split('@')[1];
            if (!tenant.allowedDomains.includes(emailDomain)) {
              results.errors.push(
                `Row ${rowNumber}: Email domain '${emailDomain}' not allowed. Allowed domains: ${tenant.allowedDomains.join(', ')}`
              );
              hasError = true;
            }
          }

          // Check for existing users
          if (existingEmails.has(cleanEmail)) {
            results.errors.push(`Row ${rowNumber}: Email '${cleanEmail}' already exists in the system`);
            hasError = true;
          }

          // Check for duplicates within import batch
          if (importEmails.has(cleanEmail)) {
            results.errors.push(`Row ${rowNumber}: Duplicate email '${cleanEmail}' found in import batch`);
            hasError = true;
          } else {
            importEmails.add(cleanEmail);
          }
        }
      }

      // Validate line manager if provided
      if (lineManager?.trim()) {
        const cleanLineManager = lineManager.trim().toLowerCase();
        
        if (!emailRegex.test(cleanLineManager)) {
          results.errors.push(`Row ${rowNumber}: Line manager email has invalid format`);
          hasError = true;
        } else {
          // Check domain restrictions for line manager
          if (tenant.allowedDomains && tenant.allowedDomains.length > 0) {
            const managerDomain = cleanLineManager.split('@')[1];
            if (!tenant.allowedDomains.includes(managerDomain)) {
              results.errors.push(
                `Row ${rowNumber}: Line manager domain '${managerDomain}' not allowed`
              );
              hasError = true;
            }
          }

          // Check if line manager exists in system or import batch
          const managerExistsInSystem = existingEmails.has(cleanLineManager);
          const managerExistsInBatch = importEmails.has(cleanLineManager);
          
          if (!managerExistsInSystem && !managerExistsInBatch) {
            results.errors.push(
              `Row ${rowNumber}: Line manager '${cleanLineManager}' not found in system or current import`
            );
            hasError = true;
          }

          // User cannot be their own line manager
          if (cleanLineManager === email?.trim().toLowerCase()) {
            results.errors.push(`Row ${rowNumber}: User cannot be their own line manager`);
            hasError = true;
          }
        }
      }

      if (!hasError) {
        validUsers.push({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          lineManager: lineManager?.trim().toLowerCase() || undefined,
          rowNumber
        });
      } else {
        results.failed++;
      }
    }

    // If there are validation errors, return them without creating any users
    if (results.errors.length > 0) {
      return NextResponse.json({
        success: false,
        data: results,
        message: 'Validation errors found. Please fix them before importing.'
      }, { status: 400 });
    }

    // Create users in database
    for (const userData of validUsers) {
      try {
        const newUser = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            tenantId,
            lineManager: userData.lineManager || null,
            roles: {
              create: {
                tenantId,
                roleId: employeeRole.id
              }
            }
          },
          select: {
            id: true,
            email: true,
            name: true,
            lineManager: true
          }
        });

        results.successful++;
        results.created.push({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name || '',
          lineManager: newUser.lineManager || undefined
        });

      } catch (error) {
        console.error(`Error creating user at row ${userData.rowNumber}:`, error);
        results.failed++;
        
        if (error instanceof Error) {
          if (error.message.includes('Unique constraint')) {
            results.errors.push(`Row ${userData.rowNumber}: Email already exists`);
          } else {
            results.errors.push(`Row ${userData.rowNumber}: ${error.message}`);
          }
        } else {
          results.errors.push(`Row ${userData.rowNumber}: Failed to create user`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Import completed. ${results.successful} users created successfully${results.failed > 0 ? `, ${results.failed} failed` : ''}.`
    });

  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
