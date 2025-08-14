'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Eye, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';

interface Perspective {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

function PerspectivesContent() {
  const { user } = useAuth();
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerspective, setEditingPerspective] = useState<Perspective | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN');

  // Load available tenants for Super Admin
  useEffect(() => {
    const loadTenants = async () => {
      if (!isSuperAdmin) return;
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`http://localhost:5000/api/admin/tenants`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setAvailableTenants(result.data);
          if (result.data.length > 0 && !selectedTenantId) {
            setSelectedTenantId(result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
        setErrorMessage('Failed to load tenants');
      }
    };

    loadTenants();
  }, [isSuperAdmin, user]);

  // Load perspectives
  useEffect(() => {
    const loadPerspectives = async () => {
      let tenantIdToUse;
      
      if (isSuperAdmin) {
        if (!selectedTenantId) {
          setLoading(false);
          return;
        }
        tenantIdToUse = selectedTenantId;
      } else {
        if (!user?.tenantId) {
          setLoading(false);
          return;
        }
        tenantIdToUse = user.tenantId;
      }
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/perspectives`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setPerspectives(result.data || []);
        } else {
          const error = await response.json();
          setErrorMessage(error.error || 'Failed to load perspectives');
        }
      } catch (error) {
        console.error('Error loading perspectives:', error);
        setErrorMessage('Failed to load perspectives');
      } finally {
        setLoading(false);
      }
    };

    loadPerspectives();
  }, [user, selectedTenantId, isSuperAdmin]);

  const handleAddPerspective = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let tenantIdToUse;
    if (isSuperAdmin) {
      if (!selectedTenantId) return;
      tenantIdToUse = selectedTenantId;
    } else {
      if (!user?.tenantId) return;
      tenantIdToUse = user.tenantId;
    }

    if (!formData.name.trim()) return;

    setSaving(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/perspectives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setPerspectives([...perspectives, result.data]);
        setFormData({ name: '', description: '', color: '#3B82F6' });
        setShowAddForm(false);
        setSuccessMessage('Perspective added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to add perspective');
      }
    } catch (error) {
      console.error('Error adding perspective:', error);
      setErrorMessage('Failed to add perspective');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPerspective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerspective) return;

    let tenantIdToUse;
    if (isSuperAdmin) {
      if (!selectedTenantId) return;
      tenantIdToUse = selectedTenantId;
    } else {
      if (!user?.tenantId) return;
      tenantIdToUse = user.tenantId;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/perspectives/${editingPerspective.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setPerspectives(perspectives.map(p => p.id === editingPerspective.id ? result.data : p));
        setFormData({ name: '', description: '', color: '#3B82F6' });
        setEditingPerspective(null);
        setSuccessMessage('Perspective updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to update perspective');
      }
    } catch (error) {
      console.error('Error updating perspective:', error);
      setErrorMessage('Failed to update perspective');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePerspective = async (perspective: Perspective) => {
    if (!confirm(`Are you sure you want to delete "${perspective.name}"?`)) return;

    let tenantIdToUse;
    if (isSuperAdmin) {
      if (!selectedTenantId) return;
      tenantIdToUse = selectedTenantId;
    } else {
      if (!user?.tenantId) return;
      tenantIdToUse = user.tenantId;
    }

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/perspectives/${perspective.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPerspectives(perspectives.filter(p => p.id !== perspective.id));
        setSuccessMessage('Perspective deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to delete perspective');
      }
    } catch (error) {
      console.error('Error deleting perspective:', error);
      setErrorMessage('Failed to delete perspective');
    }
  };

  const startEdit = (perspective: Perspective) => {
    setEditingPerspective(perspective);
    setFormData({
      name: perspective.name,
      description: perspective.description || '',
      color: perspective.color
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingPerspective(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading perspectives...</p>
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

      {/* Organization Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Super Admin - Organization Management</h3>
              <p className="text-sm text-blue-700 mt-1">Select an organization to manage its perspectives</p>
            </div>
            <div className="min-w-64">
              <label htmlFor="tenant-select" className="block text-sm font-medium text-blue-900 mb-2">
                Select Organization
              </label>
              <select
                id="tenant-select"
                value={selectedTenantId || ''}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an organization...</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.subdomain})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no organization selected for Super Admin */}
      {isSuperAdmin && !selectedTenantId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">👁️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
          <p className="text-gray-600">
            Please select an organization from the dropdown above to manage its perspectives.
          </p>
        </div>
      )}

      {/* Main Content */}
      {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && (
        <>
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Perspectives Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your strategic perspectives for balanced scorecards and performance metrics.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingPerspective(null);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Perspective
              </button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingPerspective) && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPerspective ? 'Edit Perspective' : 'Add New Perspective'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {editingPerspective ? 'Update the perspective details' : 'Create a new strategic perspective for your organization'}
                </p>
              </div>

              <form onSubmit={editingPerspective ? handleEditPerspective : handleAddPerspective} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Perspective Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Financial, Customer, Internal Process"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-600 font-mono">{formData.color}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe what this perspective covers..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={editingPerspective ? cancelEdit : cancelAdd}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingPerspective ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        {editingPerspective ? 'Update Perspective' : 'Add Perspective'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Perspectives Grid */}
          {perspectives.length > 0 ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Current Perspectives ({perspectives.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {perspectives.map((perspective) => (
                  <div key={perspective.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: perspective.color }}
                        ></div>
                        <h4 className="font-medium text-gray-900">{perspective.name}</h4>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => startEdit(perspective)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit perspective"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePerspective(perspective)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete perspective"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {perspective.description || 'No description provided'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="bg-gray-200 px-2 py-1 rounded">Code: {perspective.code}</span>
                      <span>Order: #{perspective.sortOrder}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Perspectives Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Start by adding your first strategic perspective to organize your performance metrics.
              </p>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingPerspective(null);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Perspective
              </button>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">About Perspectives</h3>
                <p className="text-blue-700 mb-3">
                  Perspectives help organize your performance metrics into logical categories. Common perspectives include:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
                  <li><strong>Financial:</strong> Revenue, profit, cost management</li>
                  <li><strong>Customer:</strong> Satisfaction, retention, acquisition</li>
                  <li><strong>Internal Process:</strong> Efficiency, quality, innovation</li>
                  <li><strong>Learning & Growth:</strong> Skills, culture, capabilities</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PerspectivesPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Perspectives" subtitle="Manage strategic perspectives for balanced scorecards">
        <PerspectivesContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
