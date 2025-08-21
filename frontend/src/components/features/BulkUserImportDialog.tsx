import React, { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/apiClient'
import { extractErrorMessage } from '@/lib/errorUtils'
import { Upload, Download, Check, AlertTriangle, X, Users, FileText, ArrowRight, ArrowLeft, Edit, Trash2, Eye, Save, XCircle } from 'lucide-react'

interface BulkImportUser {
  name: string
  email: string
  lineManager?: string
  rowNumber: number
}

interface ValidationError {
  rowNumber: number
  field: string
  message: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

const STEPS = {
  UPLOAD: 1,
  VALIDATE: 2,
  CONFIRM: 3,
  IMPORT: 4,
  COMPLETE: 5
}

export default function BulkUserImportDialog({ isOpen, onClose, onImportComplete }: Props) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch allowed domains when dialog opens
  React.useEffect(() => {
    if (isOpen && user?.tenantId) {
      const fetchAllowedDomains = async () => {
        try {
          const response = await apiClient.get(`/tenants/${user.tenantId}/settings`)
          const settings = (response as any).data?.data || (response as any).data
          if (settings?.tenant?.allowedDomains) {
            setAllowedDomains(settings.tenant.allowedDomains)
          }
        } catch (error) {
          console.error('Failed to fetch allowed domains:', error)
          setAllowedDomains([]) // Fallback to empty array (no domain restriction)
        }
      }
      fetchAllowedDomains()
    }
  }, [isOpen, user?.tenantId])
  
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<BulkImportUser[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: number
    errors: string[]
  } | null>(null)

  // Enhanced table interface state
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<BulkImportUser | null>(null)
  const [rowErrors, setRowErrors] = useState<Map<number, string[]>>(new Map())
  const [showErrorsForRow, setShowErrorsForRow] = useState<number | null>(null)

  const resetDialog = () => {
    setCurrentStep(STEPS.UPLOAD)
    setCsvFile(null)
    setCsvData([])
    setValidationErrors([])
    setImportResults(null)
    setIsValidating(false)
    setIsImporting(false)
    setEditingRowIndex(null)
    setEditFormData(null)
    setRowErrors(new Map())
    setShowErrorsForRow(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetDialog()
    onClose()
  }

  const downloadTemplate = () => {
    const csvContent = 'Name,Email,Line Manager\nJohn Doe,john.doe@company.com,manager@company.com\nJane Smith,jane.smith@company.com,'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_import_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const parseCsvFile = (file: File): Promise<BulkImportUser[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length < 2) {
            reject(new Error('CSV file must contain at least a header and one data row'))
            return
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
          const nameIndex = headers.findIndex(h => h === 'name')
          const emailIndex = headers.findIndex(h => h === 'email')
          const lineManagerIndex = headers.findIndex(h => h.includes('line') && h.includes('manager'))

          if (nameIndex === -1 || emailIndex === -1) {
            reject(new Error('CSV file must contain "Name" and "Email" columns'))
            return
          }

          const users: BulkImportUser[] = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
            
            if (values[nameIndex] && values[emailIndex]) {
              users.push({
                name: values[nameIndex],
                email: values[emailIndex].toLowerCase(),
                lineManager: lineManagerIndex !== -1 && values[lineManagerIndex] 
                  ? values[lineManagerIndex].toLowerCase() 
                  : undefined,
                rowNumber: users.length + 1 // Use the actual position in the users array, not CSV line
              })
            }
          }

          resolve(users)
        } catch (error) {
          reject(new Error('Failed to parse CSV file. Please ensure it is properly formatted.'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    try {
      setCsvFile(file)
      const users = await parseCsvFile(file)
      setCsvData(users)
      setCurrentStep(STEPS.VALIDATE)
      
      // Automatically validate the uploaded data
      setTimeout(() => {
        validateUsers(users)
      }, 100)
    } catch (error) {
      alert((error as Error).message)
    }
  }

  // Enhanced table interface functions
  const startEditingRow = (index: number) => {
    setEditingRowIndex(index)
    setEditFormData({ ...csvData[index] })
  }

  const cancelEditingRow = () => {
    setEditingRowIndex(null)
    setEditFormData(null)
  }

  const saveEditedRow = () => {
    if (editingRowIndex !== null && editFormData) {
      const updatedData = [...csvData]
      updatedData[editingRowIndex] = editFormData
      setCsvData(updatedData)
      
      // Clear any existing errors for this row since it's been modified
      const newRowErrors = new Map(rowErrors)
      newRowErrors.delete(editingRowIndex)
      setRowErrors(newRowErrors)
      
      setEditingRowIndex(null)
      setEditFormData(null)
      
      // Revalidate all data after editing
      setTimeout(() => {
        validateUsers(updatedData)
      }, 100)
    }
  }

  const deleteRow = (index: number) => {
    const updatedData = csvData.filter((_, i) => i !== index)
    setCsvData(updatedData)
    
    // Remove any errors for this row and adjust indices for remaining rows
    const newRowErrors = new Map()
    rowErrors.forEach((errors, rowIndex) => {
      if (rowIndex < index) {
        newRowErrors.set(rowIndex, errors)
      } else if (rowIndex > index) {
        newRowErrors.set(rowIndex - 1, errors)
      }
    })
    setRowErrors(newRowErrors)
    
    // Close error view if it was for the deleted row
    if (showErrorsForRow === index) {
      setShowErrorsForRow(null)
    } else if (showErrorsForRow !== null && showErrorsForRow > index) {
      setShowErrorsForRow(showErrorsForRow - 1)
    }
  }

  const toggleErrorView = (index: number) => {
    setShowErrorsForRow(showErrorsForRow === index ? null : index)
  }

  const removeAllInvalidRows = () => {
    const validRows = csvData.filter((_, index) => !rowErrors.has(index))
    setCsvData(validRows)
    setRowErrors(new Map())
    setShowErrorsForRow(null)
  }

  const validateUsers = async (dataToValidate: BulkImportUser[] = csvData) => {
    if (!user?.tenantId) return

    setIsValidating(true)
    const errors: ValidationError[] = []

    try {
      // Get tenant allowed domains for client-side validation
      const tenantResponse = await apiClient.get(`/tenants/${user.tenantId}/settings`)
      let allowedDomains: string[] = []
      
      if (tenantResponse.success && tenantResponse.data) {
        const data = tenantResponse.data as any
        if (data.tenant?.allowedDomains) {
          allowedDomains = data.tenant.allowedDomains
        }
      }

      // Get existing users to validate line managers
      const usersResponse = await apiClient.get(`/tenants/${user.tenantId}/users`)
      const existingUsers = usersResponse.success ? (usersResponse.data as any)?.users || [] : []
      const existingEmails = new Set(existingUsers.map((u: any) => u.email.toLowerCase()))
      
      console.log('Existing users in tenant:', existingUsers.length)
      console.log('Existing emails:', Array.from(existingEmails))

      // Basic client-side validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const csvEmails = new Set<string>()
      
      // Build set of emails that will be imported
      dataToValidate.forEach(user => csvEmails.add(user.email))

      dataToValidate.forEach((userData) => {
        const rowNumber = userData.rowNumber

        // Validate required fields
        if (!userData.name.trim()) {
          errors.push({
            rowNumber,
            field: 'name',
            message: 'Name is required'
          })
        }

        // Validate email format
        if (!emailRegex.test(userData.email)) {
          errors.push({
            rowNumber,
            field: 'email',
            message: 'Invalid email format'
          })
        } else {
          // Validate domain restrictions (if configured)
          if (allowedDomains.length > 0) {
            const emailDomain = userData.email.split('@')[1]
            if (!allowedDomains.includes(emailDomain)) {
              errors.push({
                rowNumber,
                field: 'email',
                message: `Domain '${emailDomain}' not allowed. Allowed domains: ${allowedDomains.join(', ')}`
              })
            }
          }

          // Check if email already exists in the system
          console.log(`Checking email ${userData.email} against existing emails:`, existingEmails.has(userData.email))
          if (existingEmails.has(userData.email)) {
            console.log('Adding duplicate email error')
            errors.push({
              rowNumber,
              field: 'email',
              message: 'Email already exists in the system'
            })
          }

          // Check for duplicate emails within the CSV
          const duplicateCount = dataToValidate.filter(u => u.email === userData.email).length
          if (duplicateCount > 1) {
            errors.push({
              rowNumber,
              field: 'email',
              message: 'Duplicate email found in CSV'
            })
          }
        }

        // Validate line manager if provided
        if (userData.lineManager) {
          console.log(`Validating line manager: ${userData.lineManager}, allowedDomains:`, allowedDomains)
          
          // Check email format for line manager
          if (!emailRegex.test(userData.lineManager)) {
            errors.push({
              rowNumber,
              field: 'lineManager',
              message: 'Line manager email has invalid format'
            })
          } else {
            // Check domain restrictions for line manager
            if (allowedDomains.length > 0) {
              const managerDomain = userData.lineManager.split('@')[1]
              console.log(`Manager domain: ${managerDomain}, allowed domains:`, allowedDomains, `includes: ${allowedDomains.includes(managerDomain)}`)
              if (!allowedDomains.includes(managerDomain)) {
                console.log('Adding line manager domain error')
                errors.push({
                  rowNumber,
                  field: 'lineManager',
                  message: `Line manager domain '${managerDomain}' not allowed. Allowed domains: ${allowedDomains.join(', ')}`
                })
              }
            }

            // User cannot be their own line manager
            if (userData.lineManager === userData.email) {
              errors.push({
                rowNumber,
                field: 'lineManager',
                message: 'User cannot be their own line manager'
              })
            }

            // Check if line manager exists in system or current CSV batch
            const managerExistsInDb = existingEmails.has(userData.lineManager)
            const managerExistsInCsv = csvEmails.has(userData.lineManager)
            
            if (!managerExistsInDb && !managerExistsInCsv) {
              errors.push({
                rowNumber,
                field: 'lineManager',
                message: 'Line manager email not found in system or current import batch'
              })
            }
          }
        }
      })

      setValidationErrors(errors)
      
      // Also populate rowErrors Map for table interface
      const newRowErrors = new Map<number, string[]>()
      console.log('Setting up rowErrors - total errors found:', errors.length)
      errors.forEach(error => {
        const rowIndex = error.rowNumber - 1 // Convert to 0-based index
        if (!newRowErrors.has(rowIndex)) {
          newRowErrors.set(rowIndex, [])
        }
        newRowErrors.get(rowIndex)?.push(`${error.field}: ${error.message}`)
      })
      console.log('Final rowErrors map size:', newRowErrors.size, 'contents:', Array.from(newRowErrors.entries()))
      setRowErrors(newRowErrors)
      
      // Don't auto-advance to confirm step - let user review in table interface
      // setCurrentStep(STEPS.CONFIRM)
    } catch (error: any) {
      alert('Failed to validate users: ' + extractErrorMessage(error, 'Validation failed'))
    } finally {
      setIsValidating(false)
    }
  }

  const performImport = async () => {
    console.log('performImport called - tenantId:', user?.tenantId, 'rowErrors.size:', rowErrors.size)
    console.log('rowErrors contents:', Array.from(rowErrors.entries()))
    
    if (!user?.tenantId || rowErrors.size > 0) {
      console.log('Import blocked - missing tenantId or errors exist')
      return
    }

    setIsImporting(true)

    try {
      const requestData = {
        users: csvData.map(userData => ({
          name: userData.name.trim(),
          email: userData.email,
          lineManager: userData.lineManager || undefined,
          rowNumber: userData.rowNumber
        }))
      }
      
      console.log('Sending import request with data:', requestData)
      console.log('Users being imported:', requestData.users.map(u => `${u.name} (${u.email}) manager: ${u.lineManager || 'none'}`))
      console.log('=== REQUEST BODY ===')
      console.log(JSON.stringify(requestData, null, 2))
      
      const response = await apiClient.post(`/tenants/${user.tenantId}/users/bulk-import`, requestData)
      
      console.log('=== RESPONSE ===')
      console.log('Response success:', response.success)
      console.log('Response data:', response.data)
      console.log('Response error:', response.error)
      console.log('Response object:', response)
      console.log('Response error details:', JSON.stringify(response.error, null, 2))

      if (response.success && response.data) {
        const data = response.data as any
        setImportResults({
          successful: data.successful || 0,
          failed: data.failed || 0,
          errors: data.errors || []
        })
      } else {
        // Handle response.success === false
        console.log('=== HANDLING FAILED RESPONSE ===')
        console.log('Response error object:', response.error)
        console.log('Full response:', JSON.stringify(response, null, 2))
        
        let errorMessages = ['Import failed']
        
        // Try to extract the actual validation errors from the backend
        // The backend sends errors in data.data.errors, but apiClient doesn't capture this
        const errorObj = response.error as any
        
        // For debugging, let's try to get the raw response
        console.log('Attempting to extract detailed errors...')
        
        if (errorObj?.details?.errors && Array.isArray(errorObj.details.errors)) {
          errorMessages = errorObj.details.errors
        } else if (errorObj?.details?.data?.errors && Array.isArray(errorObj.details.data.errors)) {
          errorMessages = errorObj.details.data.errors
        } else if (errorObj?.message) {
          errorMessages = [errorObj.message]
        } else {
          errorMessages = [extractErrorMessage(response, 'Import failed')]
        }
        
        // If we still only have the generic message, we need to make a direct fetch to get the real errors
        if (errorMessages.length === 1 && errorMessages[0] === "Validation errors found. Please fix them before importing.") {
          console.log('Generic error detected, trying direct fetch for detailed errors...')
          
          try {
            const directResponse = await fetch(`http://localhost:5000/api/tenants/${user.tenantId}/users/bulk-import`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(requestData)
            })
            
            const rawResponseData = await directResponse.json()
            console.log('Direct fetch response status:', directResponse.status)
            console.log('Direct fetch response data:', rawResponseData)
            
            if (!directResponse.ok && rawResponseData.errors && Array.isArray(rawResponseData.errors)) {
              console.log('Found detailed validation errors:', rawResponseData.errors)
              errorMessages = rawResponseData.errors.map((err: any) => 
                `Row ${err.rowNumber}: ${err.message}`
              )
            } else if (rawResponseData.data?.errors && Array.isArray(rawResponseData.data.errors)) {
              errorMessages = rawResponseData.data.errors
            }
          } catch (directError) {
            console.error('Direct fetch failed:', directError)
          }
        }
        
        console.log('Extracted error messages from failed response:', errorMessages)
        
        setImportResults({
          successful: 0,
          failed: csvData.length,
          errors: errorMessages
        })
      }

      setCurrentStep(STEPS.COMPLETE)
    } catch (error: any) {
      console.log('=== IMPORT ERROR CAUGHT ===')
      console.error('Import error:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      console.log('=== FULL ERROR OBJECT ===')
      console.log(JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      
      // Also check if there's a different way to access the response
      if (error.data) {
        console.log('=== ERROR.DATA ===')
        console.log(JSON.stringify(error.data, null, 2))
      }
      
      if (error.apiError) {
        console.log('=== ERROR.APIERROR ===')
        console.log(JSON.stringify(error.apiError, null, 2))
      }
      
      // Try to extract specific validation errors from backend response
      let errorMessages = [extractErrorMessage(error, 'Import failed')]
      
      if (error.response?.data?.data?.errors && Array.isArray(error.response.data.data.errors)) {
        errorMessages = error.response.data.data.errors
      } else if (error.response?.data?.message) {
        errorMessages = [error.response.data.message]
      } else if (error.data?.errors && Array.isArray(error.data.errors)) {
        errorMessages = error.data.errors
      } else if (error.data?.message) {
        errorMessages = [error.data.message]
      } else if (error.message) {
        errorMessages = [error.message]
      }
      
      console.error('Extracted error messages:', errorMessages)
      
      setImportResults({
        successful: 0,
        failed: csvData.length,
        errors: errorMessages
      })
      setCurrentStep(STEPS.COMPLETE)
    } finally {
      setIsImporting(false)
    }
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Upload CSV File</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select a CSV file containing user information to import
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={downloadTemplate}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="mr-2 h-4 w-4" />
          Download CSV Template
        </button>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center"
          >
            <FileText className="h-8 w-8 text-gray-400" />
            <span className="mt-2 text-sm font-medium text-gray-700">
              Click to select CSV file
            </span>
            <span className="mt-1 text-xs text-gray-500">
              CSV files only
            </span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Must include columns: Name, Email</li>
          <li>• Optional column: Line Manager</li>
          <li>• Email addresses will be validated against allowed domains</li>
          <li>• Line managers must exist in the system or be included in the same import</li>
        </ul>
      </div>
    </div>
  )

  const renderValidateStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center">
          {isValidating ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : (
            <Users className="h-8 w-8 text-blue-600" />
          )}
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {isValidating ? 'Validating Users...' : 'Review and Validate Users'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Found {csvData.length} users in the CSV file
        </p>
      </div>

      {!isValidating && csvData.length > 0 && (
        <div className="space-y-4">
          {/* Action Buttons */}
          {rowErrors.size > 0 && (
            <div className="flex justify-end">
              <button
                onClick={removeAllInvalidRows}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                Remove Invalid Rows ({rowErrors.size})
              </button>
            </div>
          )}

          {/* Users Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Line Manager
                    </th>
                    <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.map((user, index) => {
                    const hasErrors = rowErrors.has(index)
                    const isEditing = editingRowIndex === index
                    const isShowingErrors = showErrorsForRow === index

                    return (
                      <React.Fragment key={index}>
                        <tr className={hasErrors ? 'bg-red-50' : 'bg-white'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasErrors ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData?.name || ''}
                                onChange={(e) => setEditFormData(prev => prev ? {...prev, name: e.target.value} : null)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="email"
                                value={editFormData?.email || ''}
                                onChange={(e) => setEditFormData(prev => prev ? {...prev, email: e.target.value} : null)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">{user.email}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="email"
                                value={editFormData?.lineManager || ''}
                                onChange={(e) => setEditFormData(prev => prev ? {...prev, lineManager: e.target.value} : null)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Optional"
                              />
                            ) : (
                              <div className="text-sm text-gray-500">{user.lineManager || '—'}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isEditing ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={saveEditedRow}
                                  className="text-green-600 hover:text-green-900"
                                  title="Save changes"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditingRow}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Cancel editing"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => startEditingRow(index)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit row"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteRow(index)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                {hasErrors && (
                                  <button
                                    onClick={() => toggleErrorView(index)}
                                    className="text-orange-600 hover:text-orange-900"
                                    title="View errors"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                        
                        {/* Error Row */}
                        {isShowingErrors && hasErrors && (
                          <tr className="bg-red-100">
                            <td colSpan={5} className="px-6 py-3">
                              <div className="text-sm text-red-800">
                                <div className="font-medium mb-1">Validation Errors:</div>
                                <ul className="list-disc list-inside space-y-1">
                                  {rowErrors.get(index)?.map((error, errorIndex) => (
                                    <li key={errorIndex}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {rowErrors.size > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Validation Issues Found
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {rowErrors.size} row(s) have validation errors. Please fix the errors or remove the invalid rows before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center">
          {rowErrors.size === 0 ? (
            <Check className="h-8 w-8 text-green-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Final Review
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Please review the users below before importing
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {csvData.length - rowErrors.size}
          </div>
          <div className="text-sm text-green-800">Valid Users</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {rowErrors.size}
          </div>
          <div className="text-sm text-red-800">Errors Found</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Line Manager
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {csvData.map((user, index) => {
                const hasErrors = rowErrors.has(index)
                
                return (
                  <tr key={index} className={hasErrors ? 'bg-red-50' : 'bg-white'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasErrors ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.lineManager || '—'}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rowErrors.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Cannot Proceed with Import
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {rowErrors.size} row(s) still have validation errors. Please go back to the validation step to fix or remove the invalid rows.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderImportStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Importing Users...</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please wait while we import the users
        </p>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Check className="mx-auto h-12 w-12 text-green-600" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Import Complete</h3>
      </div>

      {importResults && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {importResults.successful}
            </div>
            <div className="text-sm text-green-800">Successful</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {importResults.failed}
            </div>
            <div className="text-sm text-red-800">Failed</div>
          </div>
        </div>
      )}

      {importResults?.errors && importResults.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-3">Import Errors:</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {importResults.errors.map((error, index) => (
              <div key={index} className="text-sm text-red-800">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Bulk Import Users</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {Object.values(STEPS).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  ${currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {step}
                </div>
                {index < Object.values(STEPS).length - 1 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Upload</span>
            <span>Validate</span>
            <span>Confirm</span>
            <span>Import</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {currentStep === STEPS.UPLOAD && renderUploadStep()}
          {currentStep === STEPS.VALIDATE && renderValidateStep()}
          {currentStep === STEPS.CONFIRM && renderConfirmStep()}
          {currentStep === STEPS.IMPORT && renderImportStep()}
          {currentStep === STEPS.COMPLETE && renderCompleteStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > STEPS.UPLOAD && currentStep < STEPS.IMPORT && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>
            )}
          </div>
          
          <div>
            {currentStep === STEPS.VALIDATE && rowErrors.size === 0 && csvData.length > 0 && (
              <button
                onClick={() => setCurrentStep(STEPS.CONFIRM)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            )}
            
            {currentStep === STEPS.CONFIRM && rowErrors.size === 0 && (
              <button
                onClick={() => {
                  setCurrentStep(STEPS.IMPORT)
                  performImport()
                }}
                disabled={isImporting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Import Users
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            )}
            
            {currentStep === STEPS.COMPLETE && (
              <button
                onClick={() => {
                  onImportComplete()
                  handleClose()
                }}
                className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
