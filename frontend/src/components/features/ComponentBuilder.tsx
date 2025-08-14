import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Card } from '../ui'

/**
 * Component Builder - Phase 2 Simplified
 * Configure performance component flow for each organizational level
 * Focus: Each level defines its performance components without needing perspectives
 */

interface ComponentBuilderProps {
  orgLevels: any[]
  perspectives: any[] // Not used but kept for compatibility
  terminology: Record<string, string>
  componentsByLevel?: Record<string, any> // Add this prop for loaded data
  onComponentsChange: (levelId: string, components: any[]) => void
}

interface PerformanceComponent {
  id?: string
  componentType: 'perspective' | 'entry' | 'objective' | 'kpi' | 'target' | 'exit'
  componentName: string
  componentNamePlural?: string // For Entry/Exit components
  isStandard: boolean
  isMandatory: boolean
  sequenceOrder: number
  description?: string
  isInherited?: boolean // For components inherited from higher levels
}

export function ComponentBuilder({ 
  orgLevels, 
  perspectives, 
  terminology, 
  componentsByLevel: propsComponentsByLevel = {},
  onComponentsChange 
}: ComponentBuilderProps) {
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null)
  const [componentsByLevel, setComponentsByLevel] = useState<Record<string, PerformanceComponent[]>>({})
  const [initialized, setInitialized] = useState(false)

  // Initialize default components for each level
  useEffect(() => {
    if (orgLevels.length > 0 && !initialized) {
      const initialComponents: Record<string, PerformanceComponent[]> = {}
      
      // Find the top level (organization) - it has the lowest hierarchyLevel number
      const topLevelNumber = Math.min(...orgLevels.map(level => level.hierarchyLevel))
      const bottomLevelNumber = Math.max(...orgLevels.map(level => level.hierarchyLevel))
      
      orgLevels.forEach((level) => {
        // Check if we already have components for this level from props (loaded from API)
        const existingComponents = Object.keys(propsComponentsByLevel).length > 0 
          ? propsComponentsByLevel[level.id] 
          : null
        
        if (existingComponents && existingComponents.length > 0) {
          // Use existing components if they exist
          initialComponents[level.id] = existingComponents
        } else {
          // Create default components for new levels
          const components: PerformanceComponent[] = [
            {
              componentType: 'perspective',
              componentName: terminology.perspectives || 'Perspective',
              componentNamePlural: terminology.perspectivesPlural || 'Perspectives',
              isStandard: true,
              isMandatory: true,
              sequenceOrder: 0,
              description: 'Strategic perspective inherited from organization level',
              isInherited: true // Mark as inherited/read-only
            }
          ]

          // Add Entry Component for all levels except the top level (organization)
          const isTopLevel = level.hierarchyLevel === topLevelNumber
          if (!isTopLevel) {
            components.push({
              componentType: 'entry',
              componentName: 'Entry Component',
              componentNamePlural: 'Entry Components',
              isStandard: true,
              isMandatory: true,
              sequenceOrder: 1,
              description: 'Cascaded from previous level exit component',
              isInherited: true // Mark as inherited/read-only since it comes from previous level
            })
          }

          // Add standard components with adjusted sequence orders
          const baseSequence = isTopLevel ? 1 : 2
          const isBottomLevel = level.hierarchyLevel === bottomLevelNumber
          
          components.push(
            {
              componentType: 'objective',
              componentName: terminology.objectives || 'Objective',
              componentNamePlural: terminology.objectivesPlural || 'Objectives',
              isStandard: true,
              isMandatory: true,
              sequenceOrder: baseSequence,
              description: 'Define what you want to achieve at this level'
            },
            {
              componentType: 'kpi',
              componentName: terminology.kpis || 'KPI',
              componentNamePlural: terminology.kpisPlural || 'KPIs',
              isStandard: true,
              isMandatory: true,
              sequenceOrder: baseSequence + 1,
              description: 'Key Performance Indicators to measure progress'
            },
            {
              componentType: 'target',
              componentName: terminology.targets || 'Target',
              componentNamePlural: terminology.targetsPlural || 'Targets',
              isStandard: true,
              isMandatory: true,
              sequenceOrder: baseSequence + 2,
              description: 'Specific targets for each KPI'
            },
            {
              componentType: 'exit',
              componentName: terminology.exits || 'Exit Component',
              componentNamePlural: terminology.exitsPlural || 'Exit Components',
              isStandard: true,
              isMandatory: !isBottomLevel, // Mandatory for all levels except the last one
              sequenceOrder: baseSequence + 3,
              description: 'Cascades performance results to next level'
            }
          )
          
          initialComponents[level.id] = components
        }
      })
      
      setComponentsByLevel(initialComponents)
      
      // Set first level as selected
      if (orgLevels[0]) {
        setSelectedLevelId(orgLevels[0].id)
      }
      
      setInitialized(true)
    }
  }, [orgLevels, terminology, initialized, propsComponentsByLevel])

  // Notify parent of changes for all levels, not just selected - but only when actually changed
  const prevComponentsByLevelRef = useRef<Record<string, any[]>>({})
  useEffect(() => {
    if (Object.keys(componentsByLevel).length > 0) {
      // Check if components actually changed before notifying parent
      let hasChanges = false
      Object.entries(componentsByLevel).forEach(([levelId, components]) => {
        const prevComponents = prevComponentsByLevelRef.current[levelId]
        if (!prevComponents || JSON.stringify(prevComponents) !== JSON.stringify(components)) {
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        console.log('=== COMPONENT BUILDER NOTIFY ALL LEVELS ===')
        Object.entries(componentsByLevel).forEach(([levelId, components]) => {
          console.log(`Notifying parent of changes for level: ${levelId}`)
          console.log(`Components count: ${components.length}`)
          onComponentsChange(levelId, components)
        })
        
        // Update the ref to current state
        prevComponentsByLevelRef.current = { ...componentsByLevel }
      }
    }
  }, [componentsByLevel, onComponentsChange])

  const updateComponentName = (levelId: string, componentIndex: number, newName: string) => {
    console.log('=== UPDATE COMPONENT NAME ===')
    console.log('Level:', levelId, 'Index:', componentIndex, 'New name:', newName)
    
    setComponentsByLevel(prev => {
      const updatedComponents = {
        ...prev,
        [levelId]: prev[levelId].map((comp, index) => 
          index === componentIndex ? { ...comp, componentName: newName } : comp
        )
      }

      console.log('Updated components for level:', updatedComponents[levelId])

      // If this is an exit component, propagate to child level's entry component
      const currentComponent = prev[levelId][componentIndex]
      if (currentComponent && currentComponent.componentType === 'exit') {
        const currentLevel = orgLevels.find(level => level.id === levelId)
        if (currentLevel) {
          // Find child level (next level down in hierarchy)
          // Sort levels and find the next one after current level
          const sortedLevels = [...orgLevels].sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
          const currentLevelIndex = sortedLevels.findIndex(level => level.id === levelId)
          const childLevel = sortedLevels[currentLevelIndex + 1] // Next level in sorted order
          
          if (childLevel && updatedComponents[childLevel.id]) {
            // Update the entry component name in the child level
            updatedComponents[childLevel.id] = updatedComponents[childLevel.id].map(comp => 
              comp.componentType === 'entry' ? { ...comp, componentName: newName } : comp
            )
            console.log('Also updated child level entry component:', childLevel.id)
          }
        }
      }

      return updatedComponents
    })
  }

  const updateComponentNamePlural = (levelId: string, componentIndex: number, newNamePlural: string) => {
    setComponentsByLevel(prev => {
      const updatedComponents = {
        ...prev,
        [levelId]: prev[levelId].map((comp, index) => 
          index === componentIndex ? { ...comp, componentNamePlural: newNamePlural } : comp
        )
      }

      // If this is an exit component, propagate to child level's entry component
      const currentComponent = prev[levelId][componentIndex]
      if (currentComponent && currentComponent.componentType === 'exit') {
        const currentLevel = orgLevels.find(level => level.id === levelId)
        if (currentLevel) {
          // Find child level (next level down in hierarchy)
          // Sort levels and find the next one after current level
          const sortedLevels = [...orgLevels].sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
          const currentLevelIndex = sortedLevels.findIndex(level => level.id === levelId)
          const childLevel = sortedLevels[currentLevelIndex + 1] // Next level in sorted order
          
          if (childLevel && updatedComponents[childLevel.id]) {
            // Update the entry component plural name in the child level
            updatedComponents[childLevel.id] = updatedComponents[childLevel.id].map(comp => 
              comp.componentType === 'entry' ? { ...comp, componentNamePlural: newNamePlural } : comp
            )
          }
        }
      }

      return updatedComponents
    })
  }

  const toggleComponentMandatory = (levelId: string, componentIndex: number) => {
    setComponentsByLevel(prev => ({
      ...prev,
      [levelId]: prev[levelId].map((comp, index) => 
        index === componentIndex ? { ...comp, isMandatory: !comp.isMandatory } : comp
      )
    }))
  }

  const removeExitComponent = (levelId: string, componentIndex: number) => {
    setComponentsByLevel(prev => ({
      ...prev,
      [levelId]: prev[levelId].filter((comp, index) => index !== componentIndex)
    }))
  }

  const addExitComponent = (levelId: string) => {
    setComponentsByLevel(prev => {
      const currentComponents = prev[levelId] || []
      const newExitComponent: PerformanceComponent = {
        componentType: 'exit',
        componentName: terminology.exits || 'Exit Component',
        componentNamePlural: terminology.exitsPlural || 'Exit Components',
        isStandard: true,
        isMandatory: false, // Optional for last level
        sequenceOrder: currentComponents.length, // Add at the end
        description: 'Cascades performance results to next level'
      }
      
      return {
        ...prev,
        [levelId]: [...currentComponents, newExitComponent]
      }
    })
  }

  const selectedLevel = orgLevels.find(level => level.id === selectedLevelId)
  const selectedComponents = selectedLevelId ? componentsByLevel[selectedLevelId] || [] : []

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Configure the performance components for each organizational level. 
          Standard components (Objective → KPI → Target → Exit) are always mandatory.
        </p>
      </div>

      {/* Level Selector */}
      <Card title="Select Organizational Level">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgLevels.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No organizational levels found. Please configure your organizational structure first.
            </div>
          ) : (
            orgLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedLevelId(level.id)}
              className={`
                p-4 border-2 rounded-lg text-left transition-colors
                ${selectedLevelId === level.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center mb-2">
                <div 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: level.color }}
                />
                <span className="font-medium">{level.name}</span>
              </div>
            </button>
          )))}
        </div>
      </Card>

      {/* Component Configuration */}
      {selectedLevel && (
        <Card 
          title={`Configure ${selectedLevel.name} Components`}
          subtitle={`Level ${selectedLevel.hierarchyLevel} - ${selectedLevel.pluralName}`}
        >
          <div className="space-y-4">
            {selectedComponents.map((component, index) => (
              <div 
                key={`${component.componentType}-${index}`}
                className={`
                  p-4 border rounded-lg
                  ${component.isInherited 
                    ? 'border-gray-300 bg-gray-50 opacity-75' 
                    : component.isMandatory 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded
                      ${component.isInherited
                        ? 'bg-gray-200 text-gray-600'
                        : component.isStandard 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }
                    `}>
                      {component.isInherited ? 'Inherited' : component.isStandard ? 'Standard' : 'Custom'}
                    </span>
                    <span className={`text-sm font-medium capitalize ${component.isInherited ? 'text-gray-600' : ''}`}>
                      {['entry', 'perspective', 'objective', 'kpi', 'target'].includes(component.componentType)
                        ? component.componentName 
                        : component.componentType}
                    </span>
                    {component.isInherited && (
                      <span className="text-xs text-gray-500 italic">
                        {component.componentType === 'perspective' 
                          ? '(from organization level)' 
                          : '(from parent level)'
                        }
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!component.isStandard && !component.isInherited && (
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={component.isMandatory}
                          onChange={() => toggleComponentMandatory(selectedLevelId!, index)}
                          className="mr-2"
                        />
                        Mandatory
                      </label>
                    )}
                    
                    {/* Remove button for Exit components on last level only */}
                    {component.componentType === 'exit' && 
                     selectedLevel && 
                     selectedLevel.hierarchyLevel === Math.max(...orgLevels.map(l => l.hierarchyLevel)) && (
                      <button
                        onClick={() => removeExitComponent(selectedLevelId!, index)}
                        className="ml-2 w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center text-sm font-bold"
                        title="Remove Exit Component"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <Input
                  value={
                    ['entry', 'perspective', 'objective', 'kpi', 'target'].includes(component.componentType)
                      ? (component.componentNamePlural || '') 
                      : component.componentName
                  }
                  onChange={(value) => updateComponentName(selectedLevelId!, index, value)}
                  placeholder={
                    ['entry', 'perspective', 'objective', 'kpi', 'target'].includes(component.componentType)
                      ? (component.componentNamePlural || "Component name (plural)") 
                      : (component.componentName || "Component name (singular)")
                  }
                  disabled={component.isInherited || (component.isStandard && component.isMandatory && !['objective', 'kpi', 'target', 'exit'].includes(component.componentType))}
                />

                {/* Plural form input for Exit components only */}
                {component.componentType === 'exit' && (
                  <div className="mt-2">
                    <Input
                      value={component.componentNamePlural || ''}
                      onChange={(value) => updateComponentNamePlural(selectedLevelId!, index, value)}
                      placeholder="Component name (plural)"
                      disabled={component.isInherited}
                    />
                  </div>
                )}

                {component.description && (
                  <div className={`mt-2 text-sm ${component.isInherited ? 'text-gray-500' : 'text-gray-600'}`}>
                    {component.description}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Exit Component button for last level when missing */}
          {selectedLevel && 
           selectedLevel.hierarchyLevel === Math.max(...orgLevels.map(l => l.hierarchyLevel)) &&
           !selectedComponents.some(c => c.componentType === 'exit') && (
            <div className="mt-4">
              <button
                onClick={() => addExitComponent(selectedLevelId!)}
                className="px-4 py-2 text-sm border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-300 hover:text-blue-600 flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Exit Component</span>
              </button>
            </div>
          )}

          {/* Level Navigation Button */}
          {selectedLevel && (
            (() => {
              // Sort levels by hierarchy to find next and previous levels
              const sortedLevels = [...orgLevels].sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
              const currentIndex = sortedLevels.findIndex(level => level.id === selectedLevel.id)
              const nextLevel = sortedLevels[currentIndex + 1]
              const previousLevel = sortedLevels[currentIndex - 1]
              const isFirstLevel = currentIndex === 0
              const isLastLevel = currentIndex === sortedLevels.length - 1
              
              // Check if current level has components configured
              const hasComponents = selectedComponents.length > 0
              
              if (!hasComponents) {
                return (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700">
                        Configure components for <strong>{selectedLevel.name}</strong> before proceeding.
                      </p>
                    </div>
                    
                    {/* Back button even when current level not configured */}
                    {!isFirstLevel && previousLevel && (
                      <button
                        onClick={() => setSelectedLevelId(previousLevel.id)}
                        className="w-full px-4 py-3 text-sm font-medium bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 hover:border-gray-400 flex items-center justify-center space-x-2 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>← Back to <strong>{previousLevel.name}</strong></span>
                      </button>
                    )}
                  </div>
                )
              }
              
              if (isLastLevel) {
                return (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-green-700">
                          All organizational levels configured! Use "Review Configuration" to proceed.
                        </p>
                      </div>
                    </div>
                    
                    {/* Back button for last level */}
                    {!isFirstLevel && previousLevel && (
                      <button
                        onClick={() => setSelectedLevelId(previousLevel.id)}
                        className="w-full px-4 py-3 text-sm font-medium bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 hover:border-gray-400 flex items-center justify-center space-x-2 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>← Back to <strong>{previousLevel.name}</strong></span>
                      </button>
                    )}
                  </div>
                )
              }
              
              if (nextLevel) {
                // Check if next level has components
                const nextLevelComponents = componentsByLevel[nextLevel.id]
                const nextLevelComponentsArray = Array.isArray(nextLevelComponents) 
                  ? nextLevelComponents 
                  : (nextLevelComponents as any)?.components || []
                const nextLevelConfigured = nextLevelComponentsArray.length > 0
                
                return (
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={() => setSelectedLevelId(nextLevel.id)}
                      className={`w-full px-4 py-3 text-sm font-medium rounded-lg border-2 flex items-center justify-between transition-all ${
                        nextLevelConfigured 
                          ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' 
                          : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">→</span>
                          <span>Configure Next Level: <strong>{nextLevel.name}</strong></span>
                        </div>
                        {nextLevelConfigured && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Back button for middle levels */}
                    {!isFirstLevel && previousLevel && (
                      <button
                        onClick={() => setSelectedLevelId(previousLevel.id)}
                        className="w-full px-4 py-3 text-sm font-medium bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 hover:border-gray-400 flex items-center justify-center space-x-2 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>← Back to <strong>{previousLevel.name}</strong></span>
                      </button>
                    )}
                  </div>
                )
              }
              
              return null
            })()
          )}

          {/* Component Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Component Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Components:</span> {selectedComponents.length}
              </div>
              <div>
                <span className="font-medium">Mandatory:</span> {selectedComponents.filter(c => c.isMandatory).length}
              </div>
              <div>
                <span className="font-medium">Standard:</span> {selectedComponents.filter(c => c.isStandard).length}
              </div>
              <div>
                <span className="font-medium">Custom:</span> {selectedComponents.filter(c => !c.isStandard).length}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm">
          <h4 className="font-medium text-blue-900 mb-2">💡 Configuration Tips:</h4>
          <ul className="space-y-1 text-blue-800">
            <li>• Standard components (Objective → KPI → Target) are always mandatory</li>
            <li>• Entry components receive cascaded results from the previous level's exit component</li>
            <li>• Exit components cascade performance results to the next level's entry component</li>
            <li>• Editing an exit component automatically updates the child level's entry component</li>
            <li>• Organization level has no entry component (top of hierarchy)</li>
            <li>• Perspectives are inherited from organization level strategic areas</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
