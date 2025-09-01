'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/apiClient';

interface KPI {
  id: string;
  name: string;
  shares: KPIShare[];
}

interface KPIShare {
  id: string;
  sharedWithUserId: string;
  sharedWithUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  canEdit: boolean;
  canView: boolean;
  kpiId: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface KPIShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: KPI | null;
  onUpdate: (updatedKpi: KPI) => void;
}

export default function KPIShareModal({
  isOpen,
  onClose,
  kpi,
  onUpdate
}: KPIShareModalProps) {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState({
    canView: true,
    canEdit: false
  });

  useEffect(() => {
    if (isOpen && kpi) {
      fetchAvailableUsers();
    }
  }, [isOpen, kpi]);

  const fetchAvailableUsers = async () => {
    try {
      if (!user?.tenantId) return;
      
      const response = await apiClient.get(`/api/tenants/${user.tenantId}/users`);
      if (response.success && response.data) {
        // Filter out current user and users already shared with
        const users = Array.isArray(response.data) ? response.data : [];
        const sharedUserIds = kpi?.shares.map(share => share.sharedWithUserId) || [];
        const available = users.filter((u: User) => 
          u.id !== user.id && !sharedUserIds.includes(u.id)
        );
        setAvailableUsers(available);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedUser || !kpi) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/api/kpis/${kpi.id}/shares`, {
        sharedWithUserId: selectedUser.id,
        canView: permissions.canView,
        canEdit: permissions.canEdit
      });

      if (response.success && response.data) {
        // Refresh KPI data to get updated shares
        const kpiResponse = await apiClient.get(`/api/kpis/${kpi.id}`);
        if (kpiResponse.success && kpiResponse.data) {
          onUpdate(kpiResponse.data as KPI);
        }
        
        setSelectedUser(null);
        setSearchTerm('');
        fetchAvailableUsers(); // Refresh available users
      }
    } catch (error: any) {
      console.error('Error sharing KPI:', error);
      setError(error?.response?.data?.message || 'Failed to share KPI');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (shareId: string) => {
    if (!kpi) return;

    try {
      setLoading(true);
      const response = await apiClient.delete(`/api/kpis/${kpi.id}/shares/${shareId}`);
      
      if (response.success) {
        // Refresh KPI data to get updated shares
        const kpiResponse = await apiClient.get(`/api/kpis/${kpi.id}`);
        if (kpiResponse.success && kpiResponse.data) {
          onUpdate(kpiResponse.data as KPI);
        }
        
        fetchAvailableUsers(); // Refresh available users
      }
    } catch (error) {
      console.error('Error unsharing KPI:', error);
      setError('Failed to remove sharing');
    } finally {
      setLoading(false);
    }
  };

  const updateSharePermissions = async (shareId: string, newPermissions: { canView: boolean; canEdit: boolean }) => {
    if (!kpi) return;

    try {
      setLoading(true);
      const response = await apiClient.put(`/api/kpis/${kpi.id}/shares/${shareId}`, newPermissions);
      
      if (response.success) {
        // Refresh KPI data to get updated shares
        const kpiResponse = await apiClient.get(`/api/kpis/${kpi.id}`);
        if (kpiResponse.success && kpiResponse.data) {
          onUpdate(kpiResponse.data as KPI);
        }
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      setError('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen || !kpi) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Share "{kpi.name}"
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add new share */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Share with someone new</h3>
            
            <div className="space-y-4">
              {/* User search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for users
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* User list */}
              {searchTerm && (
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No users found</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setSearchTerm('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected user and permissions */}
              {selectedUser && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{selectedUser.email}</div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canView}
                        onChange={(e) => setPermissions({ ...permissions, canView: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Can view</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canEdit}
                        onChange={(e) => setPermissions({ ...permissions, canEdit: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Can edit</span>
                    </label>
                  </div>

                  <button
                    onClick={handleShare}
                    disabled={loading || !permissions.canView}
                    className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Current shares */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Currently shared with</h3>
            
            {kpi.shares.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                This KPI is not shared with anyone yet
              </div>
            ) : (
              <div className="space-y-3">
                {kpi.shares.map((share) => (
                  <div key={share.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {share.sharedWithUser.firstName} {share.sharedWithUser.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{share.sharedWithUser.email}</div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={share.canView}
                              onChange={(e) => updateSharePermissions(share.id, {
                                canView: e.target.checked,
                                canEdit: share.canEdit
                              })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-1 text-xs text-gray-600">View</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={share.canEdit}
                              onChange={(e) => updateSharePermissions(share.id, {
                                canView: share.canView,
                                canEdit: e.target.checked
                              })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-1 text-xs text-gray-600">Edit</span>
                          </label>
                        </div>
                        
                        <button
                          onClick={() => handleUnshare(share.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
