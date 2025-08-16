'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Button, Card, Input } from '@/components/ui';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
  };
}

interface TenantFormData {
  name: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
  allowedDomains: string;
}

function TenantManagementContent() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    subdomain: '',
    adminEmail: '',
    adminName: '',
    allowedDomains: ''
  });

  // Load tenants (Super Admin only)
  useEffect(() => {
    const loadTenants = async () => {
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`http://localhost:5000/api/admin/tenants`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setTenants(result.data);
        } else {
          const error = await response.json();
          setErrorMessage(error.error || 'Failed to load tenants');
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
        setErrorMessage('Failed to load tenants');
      } finally {
        setLoading(false);
      }
    };

    if (user?.roles?.some(role => role.code === 'SUPER_ADMIN')) {
      loadTenants();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleCreateTenant = async () => {
    if (!formData.name || !formData.subdomain || !formData.adminEmail || !formData.adminName) {
      setErrorMessage('All fields are required');
      return;
    }

    // Validate allowed domains format if provided
    let allowedDomainsArray: string[] = [];
    if (formData.allowedDomains.trim()) {
      // Parse comma or space separated domains
      allowedDomainsArray = formData.allowedDomains
        .split(/[,\s]+/)
        .map(domain => domain.trim().toLowerCase())
        .filter(domain => domain.length > 0);

      // Validate domain format
      const domainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]*\.[a-z]{2,}$/;
      for (const domain of allowedDomainsArray) {
        if (!domainRegex.test(domain)) {
          setErrorMessage(`Invalid domain format: ${domain}`);
          return;
        }
      }

      // Validate admin email against allowed domains
      const adminEmailDomain = formData.adminEmail.split('@')[1]?.toLowerCase();
      if (adminEmailDomain && !allowedDomainsArray.includes(adminEmailDomain)) {
        setErrorMessage(`Admin email domain "${adminEmailDomain}" is not in the allowed domains list: ${allowedDomainsArray.join(', ')}`);
        return;
      }
    }

    setCreating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`http://localhost:5000/api/admin/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          allowedDomains: allowedDomainsArray
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTenants([...tenants, result.data.tenant]);
        setSuccessMessage(`Tenant "${formData.name}" created successfully! Organization Admin: ${formData.adminEmail}`);
        setShowCreateForm(false);
        setFormData({ name: '', subdomain: '', adminEmail: '', adminName: '', allowedDomains: '' });
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to create tenant');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      setErrorMessage('Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleSubdomainChange = (value: string) => {
    // Auto-generate subdomain from name, or allow manual override
    const subdomain = value.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setFormData({ ...formData, subdomain });
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    // Auto-generate subdomain only if subdomain is empty
    if (!formData.subdomain) {
      handleSubdomainChange(value);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-1">Create and manage MetricSoft tenant organizations</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={creating}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Tenant'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card title="Create New Tenant" className="mb-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Organization Name"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={handleNameChange}
                required
                helpText="The display name for this organization"
              />

              <Input
                label="Subdomain"
                placeholder="e.g., acme"
                value={formData.subdomain}
                onChange={(value) => handleSubdomainChange(value)}
                required
                helpText="URL: https://acme.metricsoft.com"
              />

              <Input
                label="Admin Name"
                placeholder="e.g., John Smith"
                value={formData.adminName}
                onChange={(value) => setFormData({ ...formData, adminName: value })}
                required
                helpText="Full name of the organization administrator"
              />

              <Input
                label="Admin Email"
                type="email"
                placeholder="e.g., admin@acme.com"
                value={formData.adminEmail}
                onChange={(value) => setFormData({ ...formData, adminEmail: value })}
                required
                helpText="This person will receive login instructions"
              />

              <Input
                label="Allowed Email Domains (optional)"
                placeholder="e.g., acme.com, company.org"
                value={formData.allowedDomains}
                onChange={(value) => setFormData({ ...formData, allowedDomains: value })}
                helpText="Comma-separated list of domains allowed for user registration. Leave empty to allow all domains."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">🏢 What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Tenant instance created with subdomain: <strong>{formData.subdomain || '[subdomain]'}.metricsoft.com</strong></li>
                <li>• Organization Admin account created for: <strong>{formData.adminEmail || '[admin-email]'}</strong></li>
                <li>• Login instructions sent to the admin email</li>
                <li>• Admin can then set up organizational hierarchy and manage users</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTenant}
                disabled={creating || !formData.name || !formData.subdomain || !formData.adminEmail || !formData.adminName}
                loading={creating}
              >
                {creating ? 'Creating Tenant...' : 'Create Tenant'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tenants List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenant.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tenant.isActive ? '✅ Active' : '❌ Inactive'}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Subdomain:</span> {tenant.subdomain}
                </div>
                <div>
                  <span className="font-medium">URL:</span> 
                  <a 
                    href={`https://${tenant.subdomain}.metricsoft.com`}
                    className="text-blue-600 hover:text-blue-800 ml-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tenant.subdomain}.metricsoft.com ↗
                  </a>
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(tenant.createdAt).toLocaleDateString()}
                </div>
                {tenant._count && (
                  <div>
                    <span className="font-medium">Users:</span> {tenant._count.users}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  Manage
                </Button>
                <Button size="sm" variant={tenant.isActive ? "danger" : "success"}>
                  {tenant.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {tenants.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenants Yet</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            Create your first tenant organization to get started with MetricSoft.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Your First Tenant
          </Button>
        </Card>
      )}
    </div>
  );
}

export default function TenantManagementPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN']}>
      <DashboardLayout title="Super Admin" subtitle="Manage MetricSoft tenant organizations">
        <TenantManagementContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
