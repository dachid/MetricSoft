import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { Button, Card, ConfirmationDialog } from '../ui'
import { TerminologyEditor } from './TerminologyEditor'
import { ComponentBuilder } from './ComponentBuilder'
import { CascadeVisualizer } from './CascadeVisualizer'
import { ReadOnlyPerformanceComponents } from './ReadOnlyPerformanceComponents'

/**
 * Performance Components Manager - Phase 2
 * Main container for configuring performance components per organizational level
 */

interface PerformanceComponentsManagerProps {
  fiscalYearId: string
  onComplete?: () => void
}

interface OrgLevel {
  id: string
  code: string
  name: string
  pluralName: string
  hierarchyLevel: number
  isStandard: boolean
  isEnabled: boolean
  icon?: string
  color: string
}

interface Perspective {
  id: string
  code: string
  name: string
  description?: string
  color: string
  icon?: string
  sequenceOrder: number
  isActive: boolean
}

export function PerformanceComponentsManager({ fiscalYearId, onComplete }: PerformanceComponentsManagerProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [orgLevels, setOrgLevels] = useState<OrgLevel[]>([])
  const [perspectives, setPerspectives] = useState<Perspective[]>([])
  const [terminology, setTerminology] = useState({
    perspectives: 'Perspectives',
    objectives: 'Objectives',
    kpis: 'KPIs',
    targets: 'Targets',
    initiatives: 'Initiatives'
  })
  const [componentsByLevel, setComponentsByLevel] = useState<Record<string, any>>({})
  const [cascadeRelationships, setCascadeRelationships] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [confirmationInfo, setConfirmationInfo] = useState<any>(null)
  
  // Confirmation dialog states
  const [showOrgConfirmDialog, setShowOrgConfirmDialog] = useState(false)
  const [showPerfConfirmDialog, setShowPerfConfirmDialog] = useState(false)
  const [isOrgConfirmed, setIsOrgConfirmed] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const steps = [
    { id: 1, title: 'Terminology', subtitle: 'Customize your language' },
    { id: 2, title: 'Level Components', subtitle: 'Configure components per organizational level' },
    { id: 3, title: 'Cascade Review', subtitle: 'Review component flows' }
  ]

  // Load organizational levels for this fiscal year
  useEffect(() => {
    if (fiscalYearId && user?.tenantId) {
      loadOrgLevels()
      loadPerformanceComponents()
      loadTenantSettings()
    }
  }, [fiscalYearId, user?.tenantId])

  const loadOrgLevels = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('metricsoft_auth_token')
      const response = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/level-definitions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // The API returns { levelDefinitions: [...] }
        console.log('Raw API response:', data)
        console.log('levelDefinitions array:', data.levelDefinitions)
        
        // Filter to only enabled levels and sort by hierarchy
        const enabledLevels = (data.levelDefinitions || [])
          .filter((level: any) => level.isEnabled)
          .sort((a: any, b: any) => a.hierarchyLevel - b.hierarchyLevel)
        
        console.log('Filtered enabled levels:', enabledLevels)
        setOrgLevels(enabledLevels)
        console.log('Loaded enabled organizational levels:', enabledLevels)
      }
    } catch (error) {
      console.error('Error loading org levels:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPerformanceComponents = async () => {
    try {
      const token = localStorage.getItem('metricsoft_auth_token')
      const response = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/performance-components`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Loaded performance components:', data)
        
        // Check if components are confirmed/locked
        if (data.isConfirmed) {
          setIsConfirmed(true)
          setConfirmationInfo(data.confirmation)
        }
        
        if (data.componentsByLevel) {
          // Transform the data structure to match what ComponentBuilder expects
          const transformedComponents: Record<string, any> = {}
          Object.entries(data.componentsByLevel).forEach(([levelId, levelData]: [string, any]) => {
            transformedComponents[levelId] = levelData.components || []
          })
          setComponentsByLevel(transformedComponents)
        }
        if (data.cascadeRelationships) {
          setCascadeRelationships(data.cascadeRelationships)
        }
      } else if (response.status === 404) {
        console.log('No existing performance components found - will initialize defaults')
      }
    } catch (error) {
      console.error('Error loading performance components:', error)
    }
  }

  const loadTenantSettings = async () => {
    try {
      const token = localStorage.getItem('metricsoft_auth_token')
      const response = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Loaded tenant settings:', data)
        
        if (data.data?.terminology) {
          setTerminology(data.data.terminology)
        }
      }
    } catch (error) {
      console.error('Error loading tenant settings:', error)
    }
  }

  const handleTerminologyChange = (changes: any) => {
    setTerminology(prev => ({ ...prev, ...changes.terminology }))
  }

  const handlePerspectivesChange = (newPerspectives: Perspective[]) => {
    setPerspectives(newPerspectives)
  }

  const handleComponentsChange = useCallback((levelId: string, components: any[]) => {
    console.log('=== COMPONENTS CHANGE DEBUG ===')
    console.log('Components changed for level', levelId, components)
    console.log('Number of components:', components.length)
    setComponentsByLevel(prev => {
      const updated = {
        ...prev,
        [levelId]: { components }
      }
      console.log('Updated componentsByLevel:', updated)
      return updated
    })
  }, [])

  const handleSaveComponents = async () => {
    // First check if organization structure is confirmed
    if (!isOrgConfirmed) {
      setShowOrgConfirmDialog(true)
      return
    }
    
    // If org is confirmed, show performance components confirmation
    setShowPerfConfirmDialog(true)
  }
  
  const handleConfirmOrganization = async () => {
    try {
      setIsConfirming(true)
      const token = localStorage.getItem('metricsoft_auth_token')
      const response = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/organization/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setIsOrgConfirmed(true)
        setShowOrgConfirmDialog(false)
        // Now show performance components confirmation
        setShowPerfConfirmDialog(true)
      } else {
        const errorData = await response.json()
        alert(`Failed to confirm organization: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error confirming organization:', error)
      alert(`Error confirming organization: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsConfirming(false)
    }
  }
  
  const handleSaveAndConfirmComponents = async () => {
    try {
      setIsSaving(true)
      const token = localStorage.getItem('metricsoft_auth_token')
      
      console.log('=== SAVE COMPONENTS DEBUG ===')
      console.log('Raw componentsByLevel state:', componentsByLevel)
      console.log('Raw cascadeRelationships state:', cascadeRelationships)
      
      // Transform componentsByLevel to the expected format for the API
      const transformedComponentsByLevel: Record<string, any> = {}
      
      Object.entries(componentsByLevel).forEach(([levelId, levelData]) => {
        console.log(`Processing level ${levelId}:`, levelData)
        transformedComponentsByLevel[levelId] = {
          components: Array.isArray(levelData) ? levelData : levelData.components || []
        }
        console.log(`Transformed level ${levelId}:`, transformedComponentsByLevel[levelId])
      })
      
      const savePayload = {
        componentsByLevel: transformedComponentsByLevel,
        cascadeRelationships
      }
      
      console.log('Final save payload:', JSON.stringify(savePayload, null, 2))
      
      // Save terminology to tenant settings first
      try {
        const settingsResponse = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/settings`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            terminology: terminology
          })
        })
        
        if (settingsResponse.ok) {
          console.log('Terminology saved successfully')
        } else {
          const errorText = await settingsResponse.text()
          console.warn('Failed to save terminology:', errorText)
        }
      } catch (error) {
        console.warn('Error saving terminology:', error)
      }
      
      // Save performance components
      console.log('Sending PUT request to:', `http://localhost:5000/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/performance-components`)
      const response = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/performance-components`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(savePayload)
      })

      console.log('Save response status:', response.status)
      const responseText = await response.text()
      console.log('Save response body:', responseText)

      if (response.ok) {
        const result = JSON.parse(responseText)
        console.log('Components save successful:', result)
        
        // Close the dialog and show confirmation success
        setShowPerfConfirmDialog(false)
        
        // Auto-confirm the configuration after successful save
        await handleConfirmConfiguration()
        
      } else {
        console.error('Components save failed:', responseText)
        alert(`Failed to save components: ${responseText}`)
        throw new Error(responseText || 'Failed to save components')
      }
    } catch (error) {
      console.error('Error saving components:', error)
      alert(`Error saving components: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmConfiguration = async () => {
    try {
      const token = localStorage.getItem('metricsoft_auth_token')
      const response = await fetch(`http://localhost:5000/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/performance-components`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('Configuration confirmed successfully')
        alert('Performance components configuration completed and locked!')
        
        // Reload to show the read-only view
        await loadPerformanceComponents()
        onComplete?.()
      } else {
        const errorText = await response.text()
        console.error('Failed to confirm configuration:', errorText)
        alert('Components saved but failed to lock configuration. Please contact support.')
      }
    } catch (error) {
      console.error('Error confirming configuration:', error)
      alert('Components saved but failed to lock configuration. Please contact support.')
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep - 1]

  // If performance components are confirmed/locked, show read-only view
  if (isConfirmed) {
    return (
      <ReadOnlyPerformanceComponents 
        fiscalYearId={fiscalYearId}
        confirmationInfo={confirmationInfo}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Performance Components Configuration
        </h2>
        <p className="text-gray-600 mb-6">
          Configure performance components for each organizational level
        </p>
        
        {/* Step indicators */}
        <div className="flex justify-center mb-8">
          <nav className="flex space-x-4">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'mr-4' : ''
                }`}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer
                  ${step.id === currentStep ? 'bg-blue-600 text-white' : 
                    step.id < currentStep ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}
                onClick={() => setCurrentStep(step.id)}
                >
                  {step.id < currentStep ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${step.id < currentStep ? 'bg-green-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Step Content */}
      <Card title={currentStepData.title} subtitle={currentStepData.subtitle}>
        {currentStep === 1 && (
          <TerminologyEditor 
            terminology={terminology}
            onChange={handleTerminologyChange}
          />
        )}
        
        {currentStep === 2 && (
          <ComponentBuilder 
            orgLevels={orgLevels}
            perspectives={[]} // No perspectives needed - use root level components
            terminology={terminology}
            componentsByLevel={componentsByLevel}
            onComponentsChange={handleComponentsChange}
          />
        )}
        
        {currentStep === 3 && (
          <CascadeVisualizer 
            orgLevels={orgLevels}
            componentsByLevel={componentsByLevel}
            terminology={terminology}
            onCascadeChange={setCascadeRelationships}
          />
        )}
      </Card>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep === steps.length ? (
          <Button
            variant="success"
            onClick={handleSaveComponents}
            loading={isSaving}
          >
            Finalize & Lock Configuration
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextStep}
          >
            Next Step
          </Button>
        )}
      </div>
      
      {/* Organization Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showOrgConfirmDialog}
        onClose={() => setShowOrgConfirmDialog(false)}
        onConfirm={handleConfirmOrganization}
        title="Confirm Organization Structure"
        message={`Before configuring performance components, you need to confirm that your organizational structure is finalized.

Once confirmed, you cannot modify the organizational levels for this fiscal year.

Do you want to proceed with confirming the organization structure?`}
        confirmText="Confirm Organization"
        isLoading={isConfirming}
      />
      
      {/* Performance Components Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPerfConfirmDialog}
        onClose={() => setShowPerfConfirmDialog(false)}
        onConfirm={handleSaveAndConfirmComponents}
        title="Finalize Performance Components"
        message={`This will save and lock your performance components configuration for this fiscal year.

Once confirmed:
• Components cannot be modified
• Terminology will be locked
• Cascade relationships will be finalized
• KPI creation and management will be enabled

If you need to make changes later, contact MetricSoft support.

Do you want to proceed?`}
        confirmText="Finalize Configuration"
        isLoading={isSaving}
      />
    </div>
  )
}
