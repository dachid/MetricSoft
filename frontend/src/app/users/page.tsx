'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { Card } from '@/components/ui'
import { apiClient } from '@/lib/apiClient'
import BulkUserImportDialog from '@/components/features/BulkUserImportDialog'
import { Users as UsersIcon, Plus, Mail, User, Building, Edit, Trash2, Search, ChevronLeft, ChevronRight, ChevronDown, Upload } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  lineManager?: string
  roles: Array<{
    role: {
      id: string
      code: string
      name: string
    }
  }>
}

interface UserFormData {
  name: string
  email: string
  lineManager?: string
}

export default function UsersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Check if current user is Super Admin
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN') || false
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    lineManager: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Bulk import state
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false)
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage] = useState(10)
  
  // Autocomplete state for line manager
  const [lineManagerSuggestions, setLineManagerSuggestions] = useState<User[]>([])
  const [showLineManagerDropdown, setShowLineManagerDropdown] = useState(false)
  const [lineManagerQuery, setLineManagerQuery] = useState('')
  const lineManagerRef = useRef<HTMLDivElement>(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user?.tenantId) {
      loadUsers()
    }
  }, [user?.tenantId])

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lineManagerRef.current && !lineManagerRef.current.contains(event.target as Node)) {
        setShowLineManagerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/tenants/${user?.tenantId}/users`)
      
      if (response.success && response.data) {
        const userData = response.data as { users: User[] }
        setUsers(userData.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Handle line manager autocomplete
    if (field === 'lineManager') {
      setLineManagerQuery(value)
      if (value.length > 0) {
        searchLineManagers(value)
        setShowLineManagerDropdown(true)
      } else {
        setShowLineManagerDropdown(false)
        setLineManagerSuggestions([])
      }
    }
  }

  const searchLineManagers = async (query: string) => {
    try {
      if (!user?.tenantId || query.length < 1) return
      
      // Filter existing users for suggestions (excluding the current user being edited)
      const filteredUsers = users.filter(u => {
        const matchesQuery = u.name?.toLowerCase().includes(query.toLowerCase()) || 
                            u.email.toLowerCase().includes(query.toLowerCase())
        const isNotCurrentUser = editingUser ? u.id !== editingUser.id : true
        return matchesQuery && isNotCurrentUser
      })
      
      setLineManagerSuggestions(filteredUsers.slice(0, 5)) // Limit to 5 suggestions
    } catch (error) {
      console.error('Error searching line managers:', error)
    }
  }

  const selectLineManager = (selectedUser: User) => {
    setFormData(prev => ({ ...prev, lineManager: selectedUser.email }))
    setLineManagerQuery(selectedUser.name || selectedUser.email)
    setShowLineManagerDropdown(false)
    setLineManagerSuggestions([])
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      lineManager: ''
    })
    setLineManagerQuery('')
    setShowLineManagerDropdown(false)
    setLineManagerSuggestions([])
    setShowAddForm(false)
    setEditingUser(null)
    setError('')
    setSuccess('')
  }

  // Filter and pagination logic
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    
    // Get line manager name for search
    const lineManagerUser = users.find(u => u.email === user.lineManager)
    const lineManagerName = lineManagerUser?.name || user.lineManager || ''
    
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      lineManagerName.toLowerCase().includes(searchLower) ||
      user.roles.some(userRole => userRole.role.name.toLowerCase().includes(searchLower))
    )
  })

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and Email are required fields')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate line manager email if provided
    if (formData.lineManager && formData.lineManager.trim()) {
      const lineManagerValue = formData.lineManager.trim()
      if (!emailRegex.test(lineManagerValue)) {
        // If it's not an email format, check if it matches a user name and convert to email
        const userByName = users.find(u => u.name?.toLowerCase() === lineManagerValue.toLowerCase())
        if (userByName) {
          // Update formData with the email - this will be sent to the backend
          formData.lineManager = userByName.email
        } else {
          setError('Line Manager must be a valid email address or existing user name')
          return
        }
      }
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        lineManager: formData.lineManager?.trim() || null
      }

      let response
      if (editingUser) {
        // Update existing user
        response = await apiClient.put(`/tenants/${user?.tenantId}/users/${editingUser.id}`, payload)
      } else {
        // Create new user
        response = await apiClient.post(`/tenants/${user?.tenantId}/users`, payload)
      }

      if (response.success) {
        setSuccess(editingUser ? 'User updated successfully!' : 'User added successfully!')
        resetForm()
        loadUsers() // Reload the users list
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(typeof response.error === 'string' ? response.error : 'Failed to save user')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      setError('Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      lineManager: userToEdit.lineManager || ''
    })
    
    // For display purposes, find the line manager's name if it's an email
    let displayValue = userToEdit.lineManager || ''
    if (userToEdit.lineManager) {
      const lineManagerUser = users.find(u => u.email === userToEdit.lineManager)
      if (lineManagerUser) {
        displayValue = lineManagerUser.name || lineManagerUser.email
      }
    }
    setLineManagerQuery(displayValue)
    setShowAddForm(true)
  }

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await apiClient.delete(`/tenants/${user?.tenantId}/users/${userId}`)
      
      if (response.success) {
        setSuccess('User deleted successfully!')
        loadUsers() // Reload the users list
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Failed to delete user')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Users" subtitle="Manage Organization Users">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Users" subtitle="Manage Organization Users">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Users</h2>
              <p className="text-gray-600">Manage employees in your organization</p>
            </div>
          </div>
          
          {!showAddForm && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </button>
              
              <button
                onClick={() => setShowBulkImportDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import</span>
              </button>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Add/Edit User Form */}
        {showAddForm && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Required Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      readOnly={!!(editingUser && !isSuperAdmin)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editingUser && !isSuperAdmin 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : ''
                      }`}
                      placeholder="Enter email address"
                      title={editingUser && !isSuperAdmin ? "Email cannot be changed by Organization Admin" : ""}
                    />
                    {editingUser && !isSuperAdmin && (
                      <p className="text-xs text-gray-500 mt-1">
                        Email address can only be changed by Super Admin
                      </p>
                    )}
                  </div>

                  {/* Optional Fields */}
                  <div ref={lineManagerRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Line Manager
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.lineManager}
                        onChange={(e) => handleInputChange('lineManager', e.target.value)}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Start typing name or email to search for line manager..."
                        autoComplete="off"
                      />
                      {formData.lineManager && (
                        <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Dropdown for suggestions */}
                    {showLineManagerDropdown && lineManagerSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {lineManagerSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            onClick={() => selectLineManager(suggestion)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">
                              {suggestion.name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {suggestion.email}
                            </div>
                            {suggestion.roles.length > 0 && (
                              <div className="text-xs text-gray-400">
                                {suggestion.roles[0].role.name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No results message */}
                    {showLineManagerDropdown && lineManagerSuggestions.length === 0 && (formData.lineManager?.length || 0) > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No users found matching "{formData.lineManager}"
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : (editingUser ? 'Update User' : 'Add User')}
                  </button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                Users ({filteredUsers.length} of {users.length})
              </h3>
              
              {/* Search Bar */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {searchTerm ? (
                  <>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No users found</h4>
                    <p className="text-gray-600 mb-4">
                      No users match your search criteria "{searchTerm}"
                    </p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Clear Search
                    </button>
                  </>
                ) : users.length === 0 ? (
                  <>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Users Yet</h4>
                    <p className="text-gray-600 mb-4">
                      Start by adding users to your organization
                    </p>
                    {!showAddForm && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Add First User
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="grid gap-4">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{user.name}</h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Employee
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                              <Mail className="w-4 h-4" />
                              <span>{user.email}</span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                              {user.lineManager && (
                                <div>
                                  <span className="font-medium">Line Manager:</span> {
                                    (() => {
                                      const lineManagerUser = users.find(u => u.email === user.lineManager)
                                      return lineManagerUser?.name || user.lineManager
                                    })()
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              page === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        
        {/* Bulk Import Dialog */}
        <BulkUserImportDialog
          isOpen={showBulkImportDialog}
          onClose={() => setShowBulkImportDialog(false)}
          onImportComplete={() => {
            setShowBulkImportDialog(false)
            setSuccess('Users imported successfully!')
            setTimeout(() => setSuccess(''), 5000)
            loadUsers() // Refresh the users list
          }}
        />
      </div>
    </DashboardLayout>
  )
}
