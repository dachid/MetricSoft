'use client';

import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';

function FiscalYearContent() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Fiscal Year Management</h2>
        <p className="text-gray-600">
          This is a simplified version to test if the page loads correctly.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            User ID: {user?.id}<br/>
            Tenant ID: {user?.tenantId}<br/>
            Roles: {user?.roles?.map(r => r.code).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FiscalYearPageSimple() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Fiscal Year Management" subtitle="Test page">
        <FiscalYearContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
