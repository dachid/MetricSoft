'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallbackUrl?: string;
}

interface UserRole {
  role: {
    code: string;
    permissions: string[];
  };
}

export default function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [],
  fallbackUrl = '/dashboard'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Fetch user roles if we need to check permissions/roles
        if (requiredPermissions.length > 0 || requiredRoles.length > 0) {
          const token = localStorage.getItem('metricsoft_auth_token');
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            const userRoles: UserRole[] = userData.data.roles || [];
            
            // Check if user has required roles
            if (requiredRoles.length > 0) {
              const hasRequiredRole = userRoles.some(userRole => 
                requiredRoles.includes(userRole.role.code)
              );
              
              if (!hasRequiredRole) {
                router.push(fallbackUrl);
                return;
              }
            }

            // Check if user has required permissions
            if (requiredPermissions.length > 0) {
              const userPermissions = userRoles.flatMap(userRole => userRole.role.permissions);
              const hasAllPermissions = requiredPermissions.every(permission => 
                userPermissions.includes('*') || userPermissions.includes(permission)
              );
              
              if (!hasAllPermissions) {
                router.push(fallbackUrl);
                return;
              }
            }
          } else {
            router.push('/login');
            return;
          }
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Error checking access:', error);
        router.push('/login');
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, loading, router, requiredPermissions, requiredRoles, fallbackUrl]);

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
