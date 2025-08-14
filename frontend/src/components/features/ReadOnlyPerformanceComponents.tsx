import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { Card } from '../ui'
import { CascadeVisualizer } from './CascadeVisualizer'

/**
 * Read-Only Performance Components Display
 * Shows the final configuration when performance components are locked/confirmed
 */

interface ReadOnlyPerformanceComponentsProps {
  fiscalYearId: string
  tenantId: string
  confirmationInfo?: {
    confirmedAt: string
    canModify: boolean
    fiscalYearName: string
  }
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

export function ReadOnlyPerformanceComponents({ 
  fiscalYearId, 
  tenantId,
  confirmationInfo 
}: ReadOnlyPerformanceComponentsProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [orgLevels, setOrgLevels] = useState<OrgLevel[]>([])
  const [terminology, setTerminology] = useState({
    perspectives: 'Perspectives',
    objectives: 'Objectives',
    kpis: 'KPIs',
    targets: 'Targets',
    initiatives: 'Initiatives'
  })
  const [componentsByLevel, setComponentsByLevel] = useState<Record<string, any>>({})
  const [cascadeRelationships, setCascadeRelationships] = useState<any[]>([])

  useEffect(() => {
    if (fiscalYearId && tenantId) {
      loadData()
    }
  }, [fiscalYearId, tenantId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('metricsoft_auth_token')
      
      // Load organizational levels
      const orgLevelsResponse = await fetch(
        `http://localhost:5000/api/tenants/${tenantId}/fiscal-years/${fiscalYearId}/level-definitions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (orgLevelsResponse.ok) {
        const orgLevelsData = await orgLevelsResponse.json()
        const enabledLevels = (orgLevelsData.levelDefinitions || [])
          .filter((level: any) => level.isEnabled)
          .sort((a: any, b: any) => a.hierarchyLevel - b.hierarchyLevel)
        setOrgLevels(enabledLevels)
      }

      // Load performance components
      const componentsResponse = await fetch(
        `http://localhost:5000/api/tenants/${tenantId}/fiscal-years/${fiscalYearId}/performance-components`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (componentsResponse.ok) {
        const componentsData = await componentsResponse.json()
        if (componentsData.componentsByLevel) {
          const transformedComponents: Record<string, any> = {}
          Object.entries(componentsData.componentsByLevel).forEach(([levelId, levelData]: [string, any]) => {
            transformedComponents[levelId] = levelData.components || []
          })
          setComponentsByLevel(transformedComponents)
        }
        if (componentsData.cascadeRelationships) {
          setCascadeRelationships(componentsData.cascadeRelationships)
        }
      }

      // Load tenant settings for terminology
      const settingsResponse = await fetch(
        `http://localhost:5000/api/tenants/${tenantId}/settings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        if (settingsData.data?.terminology) {
          setTerminology(settingsData.data.terminology)
        }
      }

    } catch (error) {
      console.error('Error loading performance components:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with lock indicator */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm font-medium text-amber-800">
              Configuration Locked
            </span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Performance Components Configuration
        </h2>
        <p className="text-gray-600 mb-4">
          View the current configuration for {confirmationInfo?.fiscalYearName}
        </p>
        
        {confirmationInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Confirmed on:</strong> {formatDate(confirmationInfo.confirmedAt)}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              This configuration is locked and cannot be modified. 
              Contact <a href="mailto:support@metricsoft.com" className="underline hover:text-blue-800">MetricSoft Support</a> if changes are needed.
            </p>
          </div>
        )}
      </div>

      {/* Terminology Display */}
      <Card title="Performance Terminology" subtitle="Custom terminology for this organization">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(terminology).map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-3 border">
              <div className="text-sm font-medium text-gray-600 capitalize">
                {key}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Components by Level Display */}
      <Card title="Performance Components by Level" subtitle="Components configured for each organizational level">
        <div className="space-y-6">
          {orgLevels.map((level) => {
            const levelComponents = componentsByLevel[level.id] || []
            return (
              <div key={level.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center space-x-3 mb-4">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {level.name}
                  </h3>
                  <span className="text-sm text-gray-500">
                    Level {level.hierarchyLevel}
                  </span>
                </div>
                
                {levelComponents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {levelComponents.map((component: any, index: number) => (
                      <div key={component.id || index} className="bg-white rounded-lg p-3 border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600 capitalize">
                            {component.componentType.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            #{component.sequenceOrder}
                          </span>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {component.componentName}
                        </div>
                        {component.isMandatory && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Mandatory
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No components configured for this level
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Performance Flow - Hide when locked (since we're in read-only, always hide this) */}
      {/* This section is hidden for locked configurations per user request
      <Card title="Performance Flow" subtitle="How performance cascades between organizational levels">
        <CascadeVisualizer 
          orgLevels={orgLevels}
          componentsByLevel={componentsByLevel}
          terminology={terminology}
          onCascadeChange={() => {}} // Read-only, no changes allowed
          isReadOnly={true}
        />
      </Card>
      */}

      {/* Support Contact */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          Need to modify this configuration? 
          <a 
            href="mailto:support@metricsoft.com?subject=Performance Components Modification Request"
            className="text-blue-600 hover:text-blue-800 font-medium ml-1"
          >
            Contact MetricSoft Support
          </a>
        </p>
      </div>
    </div>
  )
}
