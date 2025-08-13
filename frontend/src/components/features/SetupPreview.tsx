// import { usePerspectives } from '../../hooks/useTenant' // Temporarily disabled - will be implemented in Phase 2
import { Button, Card, Badge } from '../ui'
// import { TenantSettings } from '../../types/tenant' // Temporarily disabled - will be implemented in Phase 2

// Temporary type definition for Phase 1
interface TenantSettings {
  terminology?: any;
  branding?: any;
  setupCompleted?: boolean;
}

interface SetupPreviewProps {
  settings?: Partial<TenantSettings>
  compact?: boolean
  onComplete?: () => void
}

export function SetupPreview({ settings, compact = false, onComplete }: SetupPreviewProps) {
  // Temporary mock data for Phase 1
  const perspectives: any[] = [];

  if (!settings) {
    return (
      <div className="text-center text-gray-500">
        No settings to preview
      </div>
    )
  }

  const terminology = settings?.terminology || {
    perspectives: 'Perspectives',
    objectives: 'Objectives', 
    kpis: 'KPIs',
    targets: 'Targets',
    initiatives: 'Initiatives'
  }

  return (
    <div className={`space-y-${compact ? '4' : '6'}`}>
      {!compact && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 Your Setup is Ready!
          </h2>
          <p className="text-gray-600">
            Review your configuration before completing the setup.
          </p>
        </div>
      )}

      {/* Terminology Preview */}
      <Card 
        title={compact ? "Terms" : "Terminology"} 
        padding={compact ? 'sm' : 'md'}
      >
        <div className={`grid grid-cols-${compact ? '1' : '2'} gap-3`}>
          {Object.entries(terminology).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 capitalize">{key}:</span>
              <Badge variant="info" size={compact ? 'sm' : 'md'}>
                {value as string}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Perspectives Preview */}
      {perspectives.length > 0 && (
        <Card 
          title={compact ? "Areas" : `${terminology.perspectives || 'Perspectives'}`}
          subtitle={compact ? undefined : `${perspectives.length} defined`}
          padding={compact ? 'sm' : 'md'}
        >
          <div className={`space-y-${compact ? '2' : '3'}`}>
            {perspectives.map((perspective) => (
              <div 
                key={perspective.id} 
                className="flex items-center space-x-3"
              >
                <div
                  className={`w-${compact ? '3' : '4'} h-${compact ? '3' : '4'} rounded-full`}
                  style={{ backgroundColor: perspective.color }}
                />
                <div className="flex-1">
                  <div className={`font-medium ${compact ? 'text-sm' : ''} text-gray-900`}>
                    {perspective.name}
                  </div>
                  {!compact && perspective.description && (
                    <div className="text-sm text-gray-500">
                      {perspective.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Setup Summary */}
      {!compact && (
        <Card title="What's Next?" className="bg-green-50 border-green-200">
          <div className="space-y-4">
            <div className="text-sm text-green-800">
              <h4 className="font-medium mb-2">After completing setup, you'll be able to:</h4>
              <ul className="space-y-1">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Create {terminology.objectives || 'objectives'} within each {terminology.perspectives?.toLowerCase() || 'perspective'}
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Define {terminology.kpis || 'KPIs'} to measure progress
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Set {terminology.targets || 'targets'} and track performance
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Plan {terminology.initiatives || 'initiatives'} to drive improvement
                </li>
              </ul>
            </div>

            {onComplete && (
              <div className="pt-4">
                <Button
                  variant="success"
                  onClick={onComplete}
                  className="w-full py-3 text-base"
                >
                  🚀 Start Using MetricSoft
                </Button>
                <p className="text-center text-sm text-gray-500 mt-2">
                  You can always modify these settings later in your preferences.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Compact Summary */}
      {compact && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>• {Object.keys(terminology).length} terms customized</div>
          <div>• {perspectives.length} {terminology.perspectives?.toLowerCase() || 'perspectives'}</div>
          <div>• Ready to start building</div>
        </div>
      )}
    </div>
  )
}
