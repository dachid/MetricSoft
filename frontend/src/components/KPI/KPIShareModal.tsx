'use client';

import { useState, useEffect, useRef } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [permissions, setPermissions] = useState({
    canView: true,
    canEdit: false
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && kpi) {
      fetchAvailableUsers();
    }
  }, [isOpen, kpi]);

  const fetchAvailableUsers = async () => {
    try {
      if (!user?.tenantId) return;
      
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/kpis/users`);
      if (response.success && response.data) {
        // Filter out users already shared with
        const users = Array.isArray(response.data) ? response.data : [];
        const sharedUserIds = kpi?.shares.map(share => share.sharedWithUserId) || [];
        const available = users.filter((u: User) => 
          u && u.id && !sharedUserIds.includes(u.id)
        );
        setAvailableUsers(available);
      } else {
        setError('Failed to load users. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
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
        
        clearSelection();
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

  const filteredUsers = availableUsers.filter(user => {
    if (!user || !user.id) return false;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const handleUserSelect = (user: User) => {
    if (!user || !user.id) return;
    setSelectedUser(user);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    setSearchTerm(fullName || user.email || '');
    setShowDropdown(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(value.length > 0);
    if (value.length === 0) {
      setSelectedUser(null);
    }
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setSearchTerm('');
    setShowDropdown(false);
  };

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
              {/* User search autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for users to share with
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowDropdown(searchTerm.length > 0)}
                    placeholder="Type name or email to search..."
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {selectedUser && (
                    <button
                      onClick={clearSelection}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && filteredUsers && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.map((user) => {
                      if (!user || !user.id) return null;
                      
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {(user.firstName?.[0] || '').toUpperCase()}{(user.lastName?.[0] || '').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.firstName || ''} {user.lastName || ''}
                              </div>
                              <div className="text-sm text-gray-500">{user.email || ''}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* No results message */}
                {showDropdown && searchTerm && (!filteredUsers || filteredUsers.length === 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    <div className="px-3 py-4 text-center text-gray-500">
                      <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm">No users found matching "{searchTerm}"</p>
                      <p className="text-xs text-gray-400 mt-1">Try searching by name or email</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected user and permissions */}
              {selectedUser && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="font-medium text-blue-600">
                          {(selectedUser.firstName?.[0] || '').toUpperCase()}{(selectedUser.lastName?.[0] || '').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedUser.firstName || ''} {selectedUser.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-500">{selectedUser.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={clearSelection}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-white transition-colors"
                      title="Clear selection"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Permissions
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={permissions.canView}
                            onChange={(e) => setPermissions({ ...permissions, canView: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Can view this KPI</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={permissions.canEdit}
                            onChange={(e) => setPermissions({ ...permissions, canEdit: e.target.checked })}
                            disabled={!permissions.canView}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Can edit this KPI</span>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleShare}
                      disabled={loading || !permissions.canView}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Sharing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          <span>Share KPI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current shares */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Currently shared with ({kpi.shares.length})
            </h3>
            
            {kpi.shares.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500 font-medium">This KPI is not shared with anyone yet</p>
                <p className="text-sm text-gray-400 mt-1">Use the search above to share with team members</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kpi.shares.map((share) => (
                  <div key={share.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-medium text-purple-600">
                            {(share.sharedWithUser.firstName?.[0] || '').toUpperCase()}{(share.sharedWithUser.lastName?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {share.sharedWithUser.firstName || ''} {share.sharedWithUser.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">{share.sharedWithUser.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
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
                            <span className="ml-1 text-xs font-medium text-gray-600">View</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={share.canEdit}
                              onChange={(e) => updateSharePermissions(share.id, {
                                canView: share.canView,
                                canEdit: e.target.checked
                              })}
                              disabled={!share.canView}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <span className="ml-1 text-xs font-medium text-gray-600">Edit</span>
                          </label>
                        </div>
                        
                        <button
                          onClick={() => handleUnshare(share.id)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors disabled:opacity-50"
                          title="Remove sharing"
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
