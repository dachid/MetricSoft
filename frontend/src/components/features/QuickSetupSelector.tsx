import { tenantApiService } from '../../services/api/tenants'
import { useTenantSettings } from '../../hooks/useTenant'
import { Button } from '../ui'

interface QuickSetupSelectorProps {
  onNext: () => void
}

export function QuickSetupSelector({ onNext }: QuickSetupSelectorProps) {
  const { quickSetup, isQuickSetting } = useTenantSettings()
  const quickSetupOptions = tenantApiService.getQuickSetupOptions()

  const handleQuickSetup = async (option: any) => {
    try {
      await quickSetup(option)
      onNext()
    } catch (error) {
      console.error('Quick setup failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600">
          Choose a pre-configured framework to get started quickly, or create your own custom setup.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickSetupOptions.map((option) => (
          <div
            key={option.id}
            className="relative bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer group"
          >
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{option.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">{option.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{option.description}</p>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Terminology
                </h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(option.terminology).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                    >
                      {value as string}
                    </span>
                  ))}
                </div>
              </div>

              {option.defaultPerspectives.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Default Perspectives
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {option.defaultPerspectives.map((perspective) => (
                      <span
                        key={perspective.code}
                        className="px-2 py-0.5 text-xs rounded text-white"
                        style={{ backgroundColor: perspective.color }}
                      >
                        {perspective.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Setup time: {option.estimatedTime}
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => handleQuickSetup(option)}
                loading={isQuickSetting}
                className="w-full"
              >
                {option.id === 'custom' ? 'Start Custom Setup' : 'Use This Framework'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Don't worry, you can always customize these settings later.
        </p>
      </div>
    </div>
  )
}
