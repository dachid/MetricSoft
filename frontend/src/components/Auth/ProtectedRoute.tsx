'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

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

  console.log('🔍 ProtectedRoute render:', { 
    user: !!user, 
    loading, 
    hasAccess, 
    checkingAccess, 
    requiredRoles,
    userRoles: user?.roles?.map(r => r.code)
  });

  useEffect(() => {
    console.log('🔍 ProtectedRoute useEffect triggered:', { user: !!user, loading });
    const checkAccess = async () => {
      if (loading) {
        console.log('🔍 ProtectedRoute - Still loading auth, waiting...');
        return;
      }
      
      if (!user) {
        console.log('🔍 ProtectedRoute - No user, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('🔍 ProtectedRoute - User found, checking access...', { requiredRoles, requiredPermissions });

      // Fetch user roles if we need to check permissions/roles
      if (requiredPermissions.length > 0 || requiredRoles.length > 0) {
        console.log('🔍 ProtectedRoute - Fetching user roles from API...');
        try {
          const response = await apiClient.get('/auth/me');
          console.log('🔍 ProtectedRoute - API response status: 200 (success)');
          
          const userData = response.data as any;
          console.log('🔍 ProtectedRoute - User data from API:', userData);
          const userRoles: UserRole[] = userData.roles || [];
          
          // Check if user has required roles
          if (requiredRoles.length > 0) {
            const hasRequiredRole = userRoles.some(userRole => 
              requiredRoles.includes(userRole.role.code)
            );
            
            console.log('🔍 ProtectedRoute - Role check:', { hasRequiredRole, userRoles: userRoles.map(r => r.role.code) });
            
            if (!hasRequiredRole) {
              console.log('🔍 ProtectedRoute - No required role, redirecting to fallback');
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
            
            console.log('🔍 ProtectedRoute - Permission check:', { hasAllPermissions, userPermissions });
            
            if (!hasAllPermissions) {
              console.log('🔍 ProtectedRoute - No required permissions, redirecting to fallback');
              router.push(fallbackUrl);
              return;
            }
          }
        } catch (error) {
          console.log('🔍 ProtectedRoute - API call failed, redirecting to login');
          router.push('/login');
          return;
        }
      } else {
        console.log('🔍 ProtectedRoute - No role/permission checks required');
      }

      console.log('🔍 ProtectedRoute - Access granted!');
      setHasAccess(true);
      setCheckingAccess(false);
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
