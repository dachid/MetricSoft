import { useState, useEffect } from 'react'
import { Card } from '../ui'

/**
 * Cascade Visualizer - Phase 2
 * Shows the cascade flow between organizational levels
 */

interface CascadeVisualizerProps {
  orgLevels: any[]
  componentsByLevel: Record<string, any>
  terminology: Record<string, string>
  onCascadeChange: (relationships: any[]) => void
  isReadOnly?: boolean
}

interface CascadeRelationship {
  fromLevelId: string
  toLevelId: string
  exitComponentId: string
  entryComponentId: string
}

export function CascadeVisualizer({ 
  orgLevels, 
  componentsByLevel, 
  terminology, 
  onCascadeChange,
  isReadOnly = false
}: CascadeVisualizerProps) {
  const [cascadeRelationships, setCascadeRelationships] = useState<CascadeRelationship[]>([])

  // Generate cascade relationships automatically
  useEffect(() => {
    const relationships: CascadeRelationship[] = []

    // Sort levels by hierarchy
    const sortedLevels = [...orgLevels].sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)

    console.log('CascadeVisualizer: Analyzing levels for cascade relationships...', {
      sortedLevels: sortedLevels.map(l => ({ id: l.id, name: l.name, hierarchy: l.hierarchyLevel })),
      componentsByLevel: Object.keys(componentsByLevel).map(levelId => ({
        levelId,
        components: componentsByLevel[levelId]?.components?.map((c: any) => ({
          type: c.componentType,
          name: c.componentName
        })) || []
      }))
    })

    for (let i = 0; i < sortedLevels.length - 1; i++) {
      const fromLevel = sortedLevels[i]
      const toLevel = sortedLevels[i + 1]
      
      const fromComponents = componentsByLevel[fromLevel.id]?.components || []
      const toComponents = componentsByLevel[toLevel.id]?.components || []

      console.log(`CascadeVisualizer: Checking cascade from ${fromLevel.name} to ${toLevel.name}`, {
        fromComponents: fromComponents.map((c: any) => ({ type: c.componentType, name: c.componentName })),
        toComponents: toComponents.map((c: any) => ({ type: c.componentType, name: c.componentName }))
      })

      // Find exit component from current level
      const exitComponent = fromComponents.find((comp: any) => 
        comp.componentType === 'exit'
      )

      // Find entry component in next level
      const entryComponent = toComponents.find((comp: any) => 
        comp.componentType === 'entry'
      )

      console.log(`CascadeVisualizer: Found components for ${fromLevel.name} → ${toLevel.name}`, {
        exitComponent: exitComponent ? { type: exitComponent.componentType, name: exitComponent.componentName } : null,
        entryComponent: entryComponent ? { type: entryComponent.componentType, name: entryComponent.componentName } : null
      })

      if (exitComponent && entryComponent) {
        relationships.push({
          fromLevelId: fromLevel.id,
          toLevelId: toLevel.id,
          exitComponentId: exitComponent.id || `exit-${fromLevel.id}-${toLevel.id}`,
          entryComponentId: entryComponent.id || `entry-${toLevel.id}-${fromLevel.id}`
        })
        console.log(`CascadeVisualizer: Added cascade relationship: ${fromLevel.name} → ${toLevel.name}`)
      }
    }

    console.log('CascadeVisualizer: Final cascade relationships:', relationships)
    setCascadeRelationships(relationships)
    onCascadeChange(relationships)
  }, [orgLevels, componentsByLevel, onCascadeChange])

  const renderLevelComponents = (level: any) => {
    const components = componentsByLevel[level.id]?.components || []
    
    return (
      <div className="space-y-2">
        {components.map((component: any, index: number) => (
          <div
            key={`${component.componentType}-${index}`}
            className={`
              px-3 py-2 rounded text-sm
              ${component.componentType === 'entry' 
                ? 'bg-green-100 text-green-800 border-l-4 border-green-500' 
                : component.componentType === 'exit'
                ? 'bg-blue-100 text-blue-800 border-r-4 border-blue-500'
                : component.isMandatory
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{component.componentName}</span>
              <span className="text-xs opacity-75 capitalize">
                {component.componentType}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderCascadeArrow = (fromLevel: any, toLevel: any) => {
    const relationship = cascadeRelationships.find(rel => 
      rel.fromLevelId === fromLevel.id && rel.toLevelId === toLevel.id
    )

    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center text-gray-500">
          <div className="flex-1 h-px bg-gray-300"></div>
          <div className="mx-4 text-center">
            <div className="bg-blue-500 text-white rounded-full p-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            {relationship && (
              <div className="text-xs mt-1 whitespace-nowrap">
                Cascades
              </div>
            )}
          </div>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>
      </div>
    )
  }

  if (orgLevels.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No organizational levels configured
      </div>
    )
  }

  const sortedLevels = [...orgLevels].sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Review the cascade flow of performance components between organizational levels.
          Exit components from upper levels feed into entry components of lower levels.
        </p>
      </div>

      {/* Cascade Flow Visualization */}
      <Card title="Performance Cascade Flow">
        <div className="space-y-0">
          {sortedLevels.map((level, index) => (
            <div key={level.id}>
              {/* Level Header */}
              <div className="flex items-center mb-4">
                <div 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: level.color }}
                />
                <div>
                  <h3 className="font-semibold text-lg">{level.name}</h3>
                  <p className="text-sm text-gray-600">
                    Level {level.hierarchyLevel} - {level.pluralName}
                  </p>
                </div>
              </div>

              {/* Level Components */}
              <div className="ml-7 mb-6">
                {renderLevelComponents(level)}
              </div>

              {/* Cascade Arrow to Next Level */}
              {index < sortedLevels.length - 1 && (
                renderCascadeArrow(level, sortedLevels[index + 1])
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Cascade Summary - Hide when read-only/locked */}
      {!isReadOnly && (
        <Card title="Cascade Summary" className="bg-green-50 border-green-200">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-900 mb-2">Cascade Relationships</h4>
                <div className="space-y-2">
                  {cascadeRelationships.map((rel, index) => {
                    const fromLevel = orgLevels.find(l => l.id === rel.fromLevelId)
                    const toLevel = orgLevels.find(l => l.id === rel.toLevelId)
                    return (
                      <div key={index} className="text-sm text-green-800">
                        <span className="font-medium">{fromLevel?.name}</span>
                        {' → '}
                        <span className="font-medium">{toLevel?.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-green-900 mb-2">Performance Flow</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <div>• {terminology.objectives} cascade down as targets</div>
                  <div>• {terminology.kpis} provide measurement consistency</div>
                  <div>• {terminology.initiatives} drive performance improvement</div>
                  <div>• Each level contributes to organizational success</div>
                </div>
              </div>
            </div>

            {cascadeRelationships.length === 0 && (
              <div className="text-center text-yellow-600 py-4">
                ⚠️ No cascade relationships detected. Ensure exit and entry components are properly configured.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Component Legend - Hide when read-only/locked */}
      {!isReadOnly && (
        <Card title="Component Legend" className="bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500 mr-2"></div>
              <span>Entry Component</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 mr-2"></div>
              <span>Standard Component</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 border-r-4 border-blue-500 mr-2"></div>
              <span>Exit Component</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 mr-2"></div>
              <span>Optional Component</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
