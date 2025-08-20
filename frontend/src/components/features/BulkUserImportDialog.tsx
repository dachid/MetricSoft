import React, { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/apiClient'
import { extractErrorMessage } from '@/lib/errorUtils'
import { Upload, Download, Check, AlertTriangle, X, Users, FileText, ArrowRight, ArrowLeft } from 'lucide-react'

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
  
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<BulkImportUser[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: number
    errors: string[]
  } | null>(null)

  const resetDialog = () => {
    setCurrentStep(STEPS.UPLOAD)
    setCsvFile(null)
    setCsvData([])
    setValidationErrors([])
    setImportResults(null)
    setIsValidating(false)
    setIsImporting(false)
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
                rowNumber: i + 1
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
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const validateUsers = async () => {
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

      // Basic client-side validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const csvEmails = new Set<string>()
      
      // Build set of emails that will be imported
      csvData.forEach(user => csvEmails.add(user.email))

      csvData.forEach((userData) => {
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
          if (existingEmails.has(userData.email)) {
            errors.push({
              rowNumber,
              field: 'email',
              message: 'Email already exists in the system'
            })
          }

          // Check for duplicate emails within the CSV
          const duplicateCount = csvData.filter(u => u.email === userData.email).length
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
              if (!allowedDomains.includes(managerDomain)) {
                errors.push({
                  rowNumber,
                  field: 'lineManager',
                  message: `Line manager domain '${managerDomain}' not allowed`
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
      setCurrentStep(STEPS.CONFIRM)
    } catch (error: any) {
      alert('Failed to validate users: ' + extractErrorMessage(error, 'Validation failed'))
    } finally {
      setIsValidating(false)
    }
  }

  const performImport = async () => {
    if (!user?.tenantId || validationErrors.length > 0) return

    setIsImporting(true)

    try {
      const response = await apiClient.post(`/tenants/${user.tenantId}/users/bulk-import`, {
        users: csvData.map(userData => ({
          name: userData.name.trim(),
          email: userData.email,
          lineManager: userData.lineManager || undefined,
          rowNumber: userData.rowNumber
        }))
      })

      if (response.success && response.data) {
        const data = response.data as any
        setImportResults({
          successful: data.successful || 0,
          failed: data.failed || 0,
          errors: data.errors || []
        })
      } else {
        setImportResults({
          successful: 0,
          failed: csvData.length,
          errors: [extractErrorMessage(response, 'Import failed')]
        })
      }

      setCurrentStep(STEPS.COMPLETE)
    } catch (error: any) {
      setImportResults({
        successful: 0,
        failed: csvData.length,
        errors: [extractErrorMessage(error, 'Import failed')]
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
            <Check className="h-8 w-8 text-green-600" />
          )}
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {isValidating ? 'Validating Users...' : 'Validation Complete'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Found {csvData.length} users in the CSV file
        </p>
      </div>

      {!isValidating && (
        <div className="flex justify-center">
          <button
            onClick={validateUsers}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Start Validation
          </button>
        </div>
      )}
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center">
          {validationErrors.length === 0 ? (
            <Check className="h-8 w-8 text-green-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Validation Results
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {csvData.length - validationErrors.length}
          </div>
          <div className="text-sm text-green-800">Valid Users</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {validationErrors.length}
          </div>
          <div className="text-sm text-red-800">Errors Found</div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-3">Validation Errors:</h4>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-800">
                <span className="font-medium">Row {error.rowNumber}:</span> {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {validationErrors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-3">Ready to Import:</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {csvData.map((user, index) => (
              <div key={index} className="text-sm text-green-800">
                {user.name} ({user.email})
                {user.lineManager && <span className="text-gray-600"> → Manager: {user.lineManager}</span>}
              </div>
            ))}
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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {currentStep === STEPS.CONFIRM && validationErrors.length === 0 && (
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
