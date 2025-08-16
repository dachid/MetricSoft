'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import DashboardLayout from '@/components/Layout/DashboardLayout'
import { Card } from '@/components/ui'
import { apiClient } from '@/lib/apiClient'
import { 
  Building, 
  Plus, 
  Users, 
  Calendar,
  Network,
  CheckCircle,
  AlertCircle,
  X,
  Edit3,
  ChevronDown,
  Search
} from 'lucide-react'

interface FiscalYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
  status: string
  _count: {
    levelDefinitions: number
  }
}

interface LevelDefinition {
  id: string
  code: string
  name: string
  hierarchyLevel: number
  isIndividualUnit: boolean
  isEnabled: boolean
  isConfirmed?: boolean
}

interface User {
  id: string
  name: string
  email: string
}

interface KpiChampion {
  id: string
  assignedAt: string
  user: User
}

interface OrgUnit {
  id: string
  code: string
  name: string
  description?: string
  parentId?: string
  sortOrder: number
  isActive: boolean
  levelDefinition: LevelDefinition
  parent?: {
    id: string
    name: string
    code: string
  }
  children?: {
    id: string
    name: string
    code: string
  }[]
  kpiChampions: KpiChampion[]
}

interface OrgUnitFormData {
  fiscalYearId: string
  levelDefinitionId: string
  name: string
  code: string
  description: string
  kpiChampionIds: string[]
}

interface Tenant {
  id: string
  name: string
  subdomain: string
  isActive: boolean
}

export default function OrganizationalUnitsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [levelDefinitions, setLevelDefinitions] = useState<LevelDefinition[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('')
  
  // Super Admin tenant selection
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN')
  
  const [formData, setFormData] = useState<OrgUnitFormData>({
    fiscalYearId: '',
    levelDefinitionId: '',
    name: '',
    code: '',
    description: '',
    kpiChampionIds: []
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // KPI Champions autocomplete
  const [championSearch, setChampionSearch] = useState('')
  const [championSuggestions, setChampionSuggestions] = useState<User[]>([])
  const [showChampionDropdown, setShowChampionDropdown] = useState(false)
  const [selectedChampions, setSelectedChampions] = useState<User[]>([])
  
  // Edit form KPI Champions search
  const [championSearchTerm, setChampionSearchTerm] = useState('')
  
  // Available users for KPI champion selection
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  
  // Computed filtered users for edit form
  const filteredUsers = availableUsers.filter(user =>
    championSearchTerm.trim() && (
      user.name?.toLowerCase().includes(championSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(championSearchTerm.toLowerCase())
    )
  )
  
  // Organizational units for code uniqueness checking
  const [existingUnits, setExistingUnits] = useState<OrgUnit[]>([])
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean
    message: string
    isChecking: boolean
  }>({
    isValid: true,
    message: '',
    isChecking: false
  })
  
  // Edit mode state
  const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const championRef = useRef<HTMLDivElement>(null)

  // Utility functions for code generation and validation
  const generateSmartCode = (name: string): string => {
    if (!name.trim()) return ''
    
    // Remove common words and get meaningful parts
    const cleanName = name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
    
    const words = cleanName.split(/\s+/).filter(word => 
      word.length > 0 && !['THE', 'OF', 'AND', 'FOR', 'WITH', 'TO', 'FROM', 'IN', 'ON', 'AT', 'BY'].includes(word)
    )
    
    if (words.length === 0) return ''
    
    // Strategy 1: Take first 2-4 characters of first word
    if (words[0].length >= 4) {
      return words[0].substring(0, 4)
    }
    
    // Strategy 2: Take first word + first char of second word
    if (words.length > 1 && words[0].length >= 2) {
      return (words[0].substring(0, 3) + words[1].charAt(0)).substring(0, 4)
    }
    
    // Strategy 3: Take first chars of multiple words
    if (words.length >= 3) {
      return words.slice(0, 4).map(w => w.charAt(0)).join('')
    }
    
    if (words.length === 2) {
      return words.map(w => w.substring(0, 2)).join('').substring(0, 4)
    }
    
    // Fallback: pad with numbers if too short
    const result = words[0]
    return result.length >= 2 ? result.substring(0, 4) : result.padEnd(2, '1')
  }

  const generateUniqueCode = (baseName: string, existingCodes: string[]): string => {
    let baseCode = generateSmartCode(baseName)
    if (!baseCode) return 'ORG1'
    
    // If the base code is unique, use it
    if (!existingCodes.includes(baseCode)) {
      return baseCode
    }
    
    // Try variations with numbers
    for (let i = 1; i <= 99; i++) {
      const variation = baseCode.substring(0, 3) + i
      if (!existingCodes.includes(variation)) {
        return variation
      }
    }
    
    // Fallback to random
    return 'ORG' + Math.floor(Math.random() * 100)
  }

  const validateCodeUniqueness = async (code: string, levelDefinitionId: string): Promise<boolean> => {
    if (!code || !levelDefinitionId) return false
    
    const tenantId = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (!tenantId) return false
    
    try {
      // Get existing units and filter by level definition ID on the frontend
      const response = await apiClient.get(`/tenants/${tenantId}/org-units`)
      if (response.success && response.data) {
        const data = response.data as any
        if (data.orgUnits && Array.isArray(data.orgUnits)) {
          const units = data.orgUnits as OrgUnit[]
          return !units.some(unit => 
            unit.levelDefinition.id === levelDefinitionId && 
            unit.code.toUpperCase() === code.toUpperCase()
          )
        }
      }
      return true
    } catch (error) {
      console.error('Error checking code uniqueness:', error)
      return false
    }
  }

  const loadExistingUnits = async (levelDefinitionId?: string) => {
    const tenantId = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (!tenantId) return
    
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/org-units`)
      if (response.success && response.data) {
        const data = response.data as any
        if (data.orgUnits && Array.isArray(data.orgUnits)) {
          const allUnits = data.orgUnits as OrgUnit[]
          // Filter by level definition if specified
          const filteredUnits = levelDefinitionId 
            ? allUnits.filter(unit => unit.levelDefinition.id === levelDefinitionId)
            : allUnits
          setExistingUnits(filteredUnits)
        }
      }
    } catch (error) {
      console.error('Error loading existing units:', error)
    }
  }

  // Load available tenants for Super Admin
  useEffect(() => {
    const loadTenants = async () => {
      console.log('=== loadTenants called ===')
      console.log('isSuperAdmin:', isSuperAdmin, 'user:', user)
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token')
        
        if (isSuperAdmin) {
          console.log('Loading tenants for Super Admin')
          // Super Admin: Load all tenants
          const response = await fetch(`http://localhost:5000/api/admin/tenants`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('Super Admin tenants loaded:', result.data)
            setAvailableTenants(result.data || [])
            if ((result.data || []).length > 0 && !selectedTenantId) {
              setSelectedTenantId((result.data || [])[0].id)
            }
          }
        } else if (user?.tenantId) {
          console.log('Loading tenant info for Organization Admin, tenantId:', user.tenantId)
          // Organization Admin: Load their own tenant info for the name
          const response = await apiClient.get(`/tenants/${user.tenantId}/settings`)
          console.log('Organization Admin tenant response:', response)
          if (response.success && response.data) {
            const settings = response.data as any
            console.log('Settings data:', settings)
            if (settings.tenant) {
              const tenantInfo = {
                id: user.tenantId,
                name: settings.tenant.name,
                subdomain: settings.tenant.subdomain,
                isActive: true
              }
              console.log('Setting availableTenants for Organization Admin:', tenantInfo)
              setAvailableTenants([tenantInfo])
            } else {
              console.log('No tenant data found in settings for Organization Admin')
            }
          } else {
            console.log('Failed to load settings for Organization Admin')
          }
        } else {
          console.log('No conditions met for loading tenants')
        }
      } catch (error) {
        console.error('Error loading tenants:', error)
        setAvailableTenants([])
      }
    }

    loadTenants()
  }, [isSuperAdmin, user])

  // Load initial data when tenant or user changes
  useEffect(() => {
    const tenantIdToUse = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (tenantIdToUse) {
      loadInitialData(tenantIdToUse)
      // Load fiscal years for both Super Admin and regular users
      loadFiscalYearsOnly(tenantIdToUse)
    } else if (!isSuperAdmin && !user?.tenantId) {
      setLoading(false)
    }
  }, [user?.tenantId, selectedTenantId, isSuperAdmin])

  useEffect(() => {
    if (selectedFiscalYear) {
      loadOrgUnits()
    }
  }, [selectedFiscalYear])

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (championRef.current && !championRef.current.contains(event.target as Node)) {
        setShowChampionDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadFiscalYearsOnly = async (tenantId: string) => {
    try {
      // Reset states when switching tenant
      setSelectedFiscalYear('')
      setFiscalYears([])
      setFormData(prev => ({ ...prev, fiscalYearId: '' }))
      
      const fiscalYearsResponse = await apiClient.get(`/tenants/${tenantId}/fiscal-years?include=levelDefinitions`)
      if (fiscalYearsResponse.success && fiscalYearsResponse.data) {
        const years = fiscalYearsResponse.data as FiscalYear[]
        setFiscalYears(years)
        
        // Set current fiscal year as default
        const currentYear = years.find((fy: FiscalYear) => fy.isCurrent)
        if (currentYear) {
          setSelectedFiscalYear(currentYear.id)
          setFormData(prev => ({ ...prev, fiscalYearId: currentYear.id }))
        }
      }
    } catch (error) {
      console.error('Error loading fiscal years:', error)
    }
  }

  const loadInitialData = async (tenantId: string) => {
    try {
      setLoading(true)

      // Load current tenant information
      const tenantResponse = await apiClient.get(`/tenants/${tenantId}/settings`)
      if (tenantResponse.success && tenantResponse.data) {
        const settings = tenantResponse.data as any
        if (settings.tenant) {
          const tenantInfo = {
            id: tenantId,
            name: settings.tenant.name,
            subdomain: settings.tenant.subdomain,
            isActive: true
          }
          setCurrentTenant(tenantInfo)
        }
      }

      // Load users for KPI Champions
      const usersResponse = await apiClient.get(`/tenants/${tenantId}/users`)
      if (usersResponse.success && usersResponse.data) {
        const userData = (usersResponse.data as any)?.users || []
        setUsers(userData)
        setAvailableUsers(userData)
      }

    } catch (error) {
      console.error('Error loading initial data:', error)
      setError('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }

  const loadOrgUnits = async () => {
    if (!selectedFiscalYear) return

    const tenantIdToUse = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (!tenantIdToUse) return

    try {
      // Load level definitions for selected fiscal year
      const levelsResponse = await apiClient.get(`/tenants/${tenantIdToUse}/fiscal-years/${selectedFiscalYear}/level-definitions`)
      if (levelsResponse.success && levelsResponse.data) {
        // Filter out individual units and include all levels (both confirmed and unconfirmed for display purposes)
        const levels = (levelsResponse.data as any)?.levelDefinitions?.filter((level: LevelDefinition) => !level.isIndividualUnit) || []
        setLevelDefinitions(levels)
      }

      // Load existing org units
      const unitsResponse = await apiClient.get(`/tenants/${tenantIdToUse}/org-units?fiscalYearId=${selectedFiscalYear}`)
      if (unitsResponse.success && unitsResponse.data) {
        setOrgUnits((unitsResponse.data as any)?.orgUnits || [])
      }

    } catch (error) {
      console.error('Error loading organizational data:', error)
      setError('Failed to load organizational data')
    }
  }

  const generateCodeForName = async (name: string, levelDefinitionId: string) => {
    const tenantId = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (!tenantId || !name.trim()) return ''
    
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/org-units`)
      if (response.success && response.data) {
        const data = response.data as any
        if (data.orgUnits && Array.isArray(data.orgUnits)) {
          const allUnits = data.orgUnits as OrgUnit[]
          const existingCodes = allUnits.map(unit => unit.code)
          return generateUniqueCode(name, existingCodes)
        }
      }
    } catch (error) {
      console.error('Error generating code:', error)
    }
    return generateSmartCode(name)
  }

  const handleInputChange = (field: keyof OrgUnitFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Handle special cases
    if (field === 'levelDefinitionId') {
      const selectedLevel = levelDefinitions.find(level => level.id === value)
      
      // Load existing units for this level to check code uniqueness
      loadExistingUnits(value)
      
      if (selectedLevel?.code === 'ORGANIZATION') {
        // If organization level, set name to tenant name
        const orgName = getCurrentOrganizationName()
        
        setFormData(prev => ({ ...prev, [field]: value, name: orgName, code: '' }))
        
        // Generate code asynchronously
        generateCodeForName(orgName, value).then(generatedCode => {
          if (generatedCode) {
            setFormData(prev => ({ ...prev, code: generatedCode }))
          }
        })
        
        return
      } else {
        // For other levels, clear the name if it was previously set to organization name
        setFormData(prev => ({ ...prev, name: '', code: '' }))
      }
    }
    
    // Auto-generate code when name changes (for non-organization units)
    if (field === 'name' && value.trim()) {
      const selectedLevel = levelDefinitions.find(level => level.id === formData.levelDefinitionId)
      if (selectedLevel?.code !== 'ORGANIZATION') {
        setFormData(prev => ({ ...prev, [field]: value, code: '' }))
        
        // Generate code asynchronously
        generateCodeForName(value, formData.levelDefinitionId).then(generatedCode => {
          if (generatedCode) {
            setFormData(prev => ({ ...prev, code: generatedCode }))
          }
        })
        return
      }
    }
    
    // Validate code uniqueness when code changes
    if (field === 'code' && value.trim() && formData.levelDefinitionId) {
      setCodeValidation(prev => ({ ...prev, isChecking: true }))
      
      // Debounce the validation check
      setTimeout(async () => {
        const isUnique = await validateCodeUniqueness(value.toUpperCase(), formData.levelDefinitionId)
        const isValid = /^[A-Z0-9]{2,4}$/.test(value.toUpperCase()) && isUnique
        
        setCodeValidation({
          isValid,
          message: !isUnique ? 'Code already exists' : !isValid ? 'Code must be 2-4 uppercase letters/numbers' : '',
          isChecking: false
        })
      }, 500)
    }
  }

  const searchChampions = (query: string) => {
    setChampionSearch(query)
    if (query.length > 0) {
      const filtered = users.filter(u => {
        const alreadySelected = selectedChampions.some(selected => selected.id === u.id)
        const matchesQuery = u.name?.toLowerCase().includes(query.toLowerCase()) || 
                            u.email.toLowerCase().includes(query.toLowerCase())
        return matchesQuery && !alreadySelected
      })
      setChampionSuggestions(filtered.slice(0, 5))
      setShowChampionDropdown(true)
    } else {
      setShowChampionDropdown(false)
      setChampionSuggestions([])
    }
  }

  const addChampion = (champion: User) => {
    setSelectedChampions(prev => [...prev, champion])
    setFormData(prev => ({ 
      ...prev, 
      kpiChampionIds: [...prev.kpiChampionIds, champion.id] 
    }))
    setChampionSearch('')
    setShowChampionDropdown(false)
    setChampionSuggestions([])
  }

  const removeChampion = (championId: string) => {
    if (window.confirm('Are you sure you want to remove this KPI Champion?')) {
      setSelectedChampions(prev => prev.filter(c => c.id !== championId))
      setFormData(prev => ({ 
        ...prev, 
        kpiChampionIds: prev.kpiChampionIds.filter(id => id !== championId) 
      }))
    }
  }

  // Toggle KPI champion for edit form
  const toggleKpiChampion = (user: User) => {
    const isSelected = formData.kpiChampionIds.includes(user.id)
    
    if (isSelected) {
      // Remove champion
      setFormData(prev => ({
        ...prev,
        kpiChampionIds: prev.kpiChampionIds.filter(id => id !== user.id)
      }))
    } else {
      // Add champion
      setFormData(prev => ({
        ...prev,
        kpiChampionIds: [...prev.kpiChampionIds, user.id]
      }))
    }
  }

  // Edit functionality
  const handleEditUnit = (unit: OrgUnit) => {
    setEditingUnit(unit)
    setFormData({
      fiscalYearId: selectedFiscalYear || '',
      levelDefinitionId: unit.levelDefinition.id,
      name: unit.name,
      code: unit.code,
      description: unit.description || '',
      kpiChampionIds: unit.kpiChampions.map(champion => champion.user.id)
    })
    setSelectedChampions(unit.kpiChampions.map(champion => champion.user))
    setShowEditForm(true)
    setShowAddForm(false)
  }

  const handleCancelEdit = () => {
    setEditingUnit(null)
    setShowEditForm(false)
    resetForm()
  }

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingUnit) return

    if (!formData.fiscalYearId || !formData.levelDefinitionId || !formData.name) {
      setError('Fiscal Year, Unit Type, and Name are required')
      return
    }

    if (!formData.code || !formData.code.trim()) {
      setError('Unit Code is required')
      return
    }

    if (!/^[A-Z0-9]{2,4}$/.test(formData.code)) {
      setError('Code must be 2-4 uppercase letters or numbers')
      return
    }

    if (!codeValidation.isValid) {
      setError('Please fix the code validation error before submitting')
      return
    }

    const tenantIdToUse = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (!tenantIdToUse) {
      setError('Tenant not selected')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        fiscalYearId: formData.fiscalYearId,
        levelDefinitionId: formData.levelDefinitionId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        kpiChampionIds: formData.kpiChampionIds
      }

      const response = await apiClient.put(`/tenants/${tenantIdToUse}/org-units/${editingUnit.id}`, payload)

      if (response.success) {
        setSuccess('Organizational unit updated successfully!')
        handleCancelEdit()
        loadOrgUnits()
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(typeof response.error === 'string' ? response.error : 'Failed to update organizational unit')
      }
    } catch (error) {
      console.error('Error updating organizational unit:', error)
      setError('Failed to update organizational unit')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault()
      if (championSearch.trim() && championSuggestions.length > 0) {
        addChampion(championSuggestions[0])
      }
    }
  }

  const resetForm = () => {
    setFormData({
      fiscalYearId: selectedFiscalYear,
      levelDefinitionId: '',
      name: '',
      code: '',
      description: '',
      kpiChampionIds: []
    })
    setSelectedChampions([])
    setChampionSearch('')
    setShowChampionDropdown(false)
    setChampionSuggestions([])
    setShowAddForm(false)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fiscalYearId || !formData.levelDefinitionId || !formData.name) {
      setError('Fiscal Year, Unit Type, and Name are required')
      return
    }

    if (!formData.code || !formData.code.trim()) {
      setError('Unit Code is required')
      return
    }

    if (!/^[A-Z0-9]{2,4}$/.test(formData.code)) {
      setError('Code must be 2-4 uppercase letters or numbers')
      return
    }

    if (!codeValidation.isValid) {
      setError('Please fix the code validation error before submitting')
      return
    }

    const tenantIdToUse = isSuperAdmin ? selectedTenantId : user?.tenantId
    if (!tenantIdToUse) {
      setError('Tenant not selected')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        fiscalYearId: formData.fiscalYearId,
        levelDefinitionId: formData.levelDefinitionId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        kpiChampionIds: formData.kpiChampionIds
      }

      const response = await apiClient.post(`/tenants/${tenantIdToUse}/org-units`, payload)

      if (response.success) {
        setSuccess('Organizational unit created successfully!')
        resetForm()
        loadOrgUnits()
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(typeof response.error === 'string' ? response.error : 'Failed to create organizational unit')
      }
    } catch (error) {
      console.error('Error creating organizational unit:', error)
      setError('Failed to create organizational unit')
    } finally {
      setSaving(false)
    }
  }

  const getFilteredLevelDefinitions = () => {
    // Only show enabled levels (same logic as "Active Organizational Levels" in organizational structure)
    const enabledLevels = levelDefinitions.filter(level => 
      !level.isIndividualUnit && level.isEnabled === true
    )
    
    // Check if an organization unit already exists
    const organizationExists = orgUnits.some(unit => 
      unit.levelDefinition.code === 'ORGANIZATION'
    )
    
    // If organization exists, exclude the organization level from available options
    if (organizationExists) {
      return enabledLevels.filter(level => level.code !== 'ORGANIZATION')
    }
    
    return enabledLevels
  }

  const getFilteredLevelDefinitionsForEdit = () => {
    // For edit form, show all enabled levels
    const enabledLevels = levelDefinitions.filter(level => 
      !level.isIndividualUnit && level.isEnabled === true
    )
    
    // Check if an organization unit already exists (excluding the current unit being edited)
    const organizationExists = orgUnits.some(unit => 
      unit.levelDefinition.code === 'ORGANIZATION' && 
      unit.id !== editingUnit?.id // Exclude the current unit being edited
    )
    
    // If organization exists (and we're not editing it), exclude the organization level
    if (organizationExists) {
      return enabledLevels.filter(level => level.code !== 'ORGANIZATION')
    }
    
    return enabledLevels
  }

  const isOrganizationLevel = () => {
    const selectedLevel = levelDefinitions.find(level => level.id === formData.levelDefinitionId)
    return selectedLevel?.code === 'ORGANIZATION'
  }

  const getCurrentOrganizationName = () => {
    if (isSuperAdmin && selectedTenantId) {
      const tenant = availableTenants.find(t => t.id === selectedTenantId)
      return tenant?.name || 'Organization'
    }
    
    // For regular users, use the current tenant information
    if (currentTenant) {
      return currentTenant.name
    }
    
    // Fallback: try to find their tenant in availableTenants
    if (user?.tenantId && availableTenants.length > 0) {
      const tenant = availableTenants.find(t => t.id === user.tenantId)
      if (tenant) return tenant.name
    }
    
    return 'Organization'
  }

  if (loading) {
    return (
      <DashboardLayout title="Organizational Units" subtitle="Configure organizational structure and KPI champions">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Organizational Units" subtitle="Configure organizational structure and KPI champions">
      <div className="space-y-6">
        {/* Super Admin Organization Selector */}
        {isSuperAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">Super Admin - Organization Management</h3>
                <p className="text-sm text-blue-700 mt-1">Select an organization to manage its organizational units</p>
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
        {isSuperAdmin && !selectedTenantId && availableTenants.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
            <p className="text-gray-600">
              Please select an organization from the dropdown above to manage its organizational units.
            </p>
          </div>
        )}

        {/* Show message if no organizations available for Super Admin */}
        {isSuperAdmin && availableTenants.length === 0 && !loading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Available</h3>
            <p className="text-gray-600">
              No organizations are available for management. Please contact the system administrator.
            </p>
          </div>
        )}

        {/* Main Content - Only show if tenant is available */}
        {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && (
          <>
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Organizational Units</h2>
                  <p className="text-gray-600">Configure units and assign KPI champions</p>
                </div>
              </div>
              
              {!showAddForm && selectedFiscalYear && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Unit</span>
                </button>
              )}
            </div>

            {/* Fiscal Year Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Organizational Units</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure organizational units and assign KPI champions for your selected fiscal year.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Fiscal Year
                </label>
                <div className="max-w-md">
                  <select
                    value={selectedFiscalYear}
                    onChange={(e) => setSelectedFiscalYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a fiscal year...</option>
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.name} ({fy.status}) {fy.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedFiscalYear && fiscalYears.find(fy => fy.id === selectedFiscalYear) && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-blue-900">
                        {fiscalYears.find(fy => fy.id === selectedFiscalYear)?.name}
                      </h5>
                      <p className="text-sm text-blue-600 mt-1">
                        {new Date(fiscalYears.find(fy => fy.id === selectedFiscalYear)?.startDate || '').toLocaleDateString()} - {new Date(fiscalYears.find(fy => fy.id === selectedFiscalYear)?.endDate || '').toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-blue-600">
                        <span>Status: <strong className="capitalize">{fiscalYears.find(fy => fy.id === selectedFiscalYear)?.status}</strong></span>
                        <span>Org Levels: <strong>{fiscalYears.find(fy => fy.id === selectedFiscalYear)?._count.levelDefinitions || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Success/Error Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Add Unit Form */}
        {showAddForm && selectedFiscalYear && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Add New Organizational Unit</h3>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Unit Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Type *
                    </label>
                    <select
                      required
                      value={formData.levelDefinitionId}
                      onChange={(e) => handleInputChange('levelDefinitionId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={getFilteredLevelDefinitions().length === 0}
                    >
                      <option value="">
                        {getFilteredLevelDefinitions().length === 0 
                          ? "No additional organizational levels available" 
                          : "Select unit type..."
                        }
                      </option>
                      {getFilteredLevelDefinitions().map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                    {getFilteredLevelDefinitions().length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Please confirm the organizational structure for this fiscal year first.
                      </p>
                    )}
                    {/* Show info when organization type is filtered out */}
                    {levelDefinitions.some(l => l.code === 'ORGANIZATION' && l.isEnabled) && 
                     orgUnits.some(unit => unit.levelDefinition.code === 'ORGANIZATION') && (
                      <p className="text-sm text-blue-600 mt-1">
                        ℹ️ Organization level not shown - only one organization can be created per tenant.
                      </p>
                    )}
                  </div>

                  {/* Unit Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      readOnly={isOrganizationLevel()}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isOrganizationLevel() ? 'bg-gray-100 text-gray-500' : ''
                      }`}
                      placeholder="Enter unit name"
                    />
                    {isOrganizationLevel() && (
                      <p className="text-sm text-blue-600 mt-1">
                        Organization name is automatically set from your tenant configuration
                      </p>
                    )}
                  </div>

                  {/* Unit Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Code (2-4 characters) *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        codeValidation.isValid 
                          ? 'border-gray-300 focus:ring-blue-500' 
                          : 'border-red-300 focus:ring-red-500'
                      }`}
                      placeholder="Auto-generated from name"
                      maxLength={4}
                      pattern="[A-Z0-9]{2,4}"
                      required
                    />
                    {codeValidation.isChecking && (
                      <p className="text-xs text-blue-600 mt-1">
                        Checking availability...
                      </p>
                    )}
                    {!codeValidation.isChecking && !codeValidation.isValid && codeValidation.message && (
                      <p className="text-xs text-red-600 mt-1">
                        {codeValidation.message}
                      </p>
                    )}
                    {!codeValidation.isChecking && codeValidation.isValid && formData.code && (
                      <p className="text-xs text-green-600 mt-1">
                        Code is available
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically generated from name, or enter your own unique code
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>

                {/* KPI Champions */}
                <div ref={championRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    KPI Champions
                  </label>
                  
                  {/* Selected Champions Tags */}
                  {selectedChampions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedChampions.map((champion) => (
                        <div
                          key={champion.id}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <span>{champion.name || champion.email}</span>
                          <button
                            type="button"
                            onClick={() => removeChampion(champion.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={championSearch}
                      onChange={(e) => searchChampions(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type to search for KPI champions... (Press space, tab, or comma to add)"
                    />
                    <Search className="absolute right-2 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  
                  {/* Dropdown for suggestions */}
                  {showChampionDropdown && championSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {championSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          onClick={() => addChampion(suggestion)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {suggestion.name || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {suggestion.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Search and select users to assign as KPI Champions for this unit
                  </p>
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
                    {saving ? 'Creating...' : 'Create Unit'}
                  </button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Organizational Units List */}
        {selectedFiscalYear && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Existing Organizational Units ({orgUnits.length})
                </h3>
                <Network className="w-6 h-6 text-gray-400" />
              </div>

              {orgUnits.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Units Yet</h4>
                  <p className="text-gray-600 mb-4">
                    Start by creating organizational units for your selected fiscal year
                  </p>
                  {!showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create First Unit
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {levelDefinitions.map((level) => {
                    const unitsAtLevel = orgUnits.filter(unit => unit.levelDefinition.id === level.id)
                    
                    if (unitsAtLevel.length === 0) return null

                    return (
                      <div key={level.id} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h4 className="font-medium text-gray-900">
                            {level.name} (Level {level.hierarchyLevel})
                          </h4>
                        </div>
                        <div className="p-4 space-y-3">
                          {unitsAtLevel.map((unit) => (
                            <div key={unit.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h5 className="font-medium text-gray-900">{unit.name}</h5>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    {unit.code}
                                  </span>
                                </div>
                                {unit.description && (
                                  <p className="text-sm text-gray-600 mt-1">{unit.description}</p>
                                )}
                                {unit.parent && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Parent: {unit.parent.name}
                                  </p>
                                )}
                                {unit.kpiChampions.length > 0 && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <div className="flex flex-wrap gap-1">
                                      {unit.kpiChampions.map((champion) => (
                                        <span
                                          key={champion.id}
                                          className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                                        >
                                          {champion.user.name || champion.user.email}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <button
                                  onClick={() => handleEditUnit(unit)}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit unit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Edit Unit Modal */}
        {showEditForm && editingUnit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">
                    Edit {editingUnit.levelDefinition.name}
                  </h3>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUnit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Enter ${editingUnit.levelDefinition.name.toLowerCase()} name`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Short Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter unique code"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder={`Describe this ${editingUnit.levelDefinition.name.toLowerCase()}`}
                    />
                  </div>

                  {/* KPI Champions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KPI Champions
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={championSearchTerm}
                        onChange={(e) => setChampionSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search for users to assign as KPI Champions..."
                      />
                      
                      {championSearchTerm && filteredUsers.length > 0 && (
                        <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                          {filteredUsers.map(user => (
                            <div
                              key={user.id}
                              onClick={() => toggleKpiChampion(user)}
                              className={`p-2 cursor-pointer hover:bg-gray-50 ${
                                formData.kpiChampionIds.includes(user.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                              }`}
                            >
                              <div className="font-medium text-sm">{user.name || user.email}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                              {formData.kpiChampionIds.includes(user.id) && (
                                <div className="text-xs text-blue-600 font-medium">✓ Selected</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {formData.kpiChampionIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.kpiChampionIds.map(userId => {
                            const user = availableUsers.find(u => u.id === userId)
                            return user ? (
                              <span
                                key={userId}
                                className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                              >
                                {user.name || user.email}
                                <button
                                  type="button"
                                  onClick={() => toggleKpiChampion(user)}
                                  className="ml-1 text-green-600 hover:text-green-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      Search and select users to assign as KPI Champions for this unit
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Updating...' : 'Update Unit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </DashboardLayout>
  )
}
