import { useState } from 'react'
import { tenantApiService } from '../../services/api/tenants'
import { Input, Button, Card } from '../ui'
import { TenantSettings, TerminologyPreset } from '../../types/tenant'

interface TerminologyEditorProps {
  settings?: TenantSettings
  onChange: (changes: any) => void
}

export function TerminologyEditor({ settings, onChange }: TerminologyEditorProps) {
  const [terminology, setTerminology] = useState(
    settings?.terminology || {
      perspectives: 'Perspectives',
      objectives: 'Objectives',
      kpis: 'KPIs',
      targets: 'Targets',
      initiatives: 'Initiatives'
    }
  )

  const [showPresets, setShowPresets] = useState(false)
  const presets = tenantApiService.getTerminologyPresets()

  const handleTermChange = (field: string, value: string) => {
    const newTerminology = { ...terminology, [field]: value }
    setTerminology(newTerminology)
    onChange({ terminology: newTerminology })
  }

  const applyPreset = (preset: TerminologyPreset) => {
    setTerminology(preset.config)
    onChange({ terminology: preset.config })
    setShowPresets(false)
  }

  const resetToDefault = () => {
    const defaultTerms = {
      perspectives: 'Perspectives',
      objectives: 'Objectives',
      kpis: 'KPIs',
      targets: 'Targets',
      initiatives: 'Initiatives'
    }
    setTerminology(defaultTerms)
    onChange({ terminology: defaultTerms })
  }

  const terms = [
    { key: 'perspectives', label: 'Strategic Areas', placeholder: 'e.g., Perspectives, Pillars, Themes' },
    { key: 'objectives', label: 'Goals', placeholder: 'e.g., Objectives, Goals, Outcomes' },
    { key: 'kpis', label: 'Metrics', placeholder: 'e.g., KPIs, Metrics, Measures' },
    { key: 'targets', label: 'Benchmarks', placeholder: 'e.g., Targets, Benchmarks, Standards' },
    { key: 'initiatives', label: 'Actions', placeholder: 'e.g., Initiatives, Projects, Actions' }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Customize the terminology to match your organization's language and culture.
        </p>
        <div className="flex justify-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
          >
            {showPresets ? 'Hide' : 'Show'} Presets
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
          >
            Reset to Default
          </Button>
        </div>
      </div>

      {showPresets && (
        <Card title="Quick Presets" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map((preset) => (
              <div
                key={preset.name}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => applyPreset(preset)}
              >
                <h4 className="font-medium text-gray-900">{preset.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.values(preset.config).map((term, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {terms.map((term) => (
          <Input
            key={term.key}
            label={term.label}
            value={terminology[term.key as keyof typeof terminology]}
            onChange={(value) => handleTermChange(term.key, value)}
            placeholder={term.placeholder}
            helpText={`This will replace "${term.key}" throughout the system`}
          />
        ))}
      </div>

      {/* Live Preview */}
      <Card title="Preview" className="bg-blue-50 border-blue-200">
        <div className="text-sm">
          <p className="text-gray-700 mb-3">
            Here's how your terminology will appear:
          </p>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-medium w-32">{terminology.perspectives}:</span>
              <span className="text-gray-600">Your strategic focus areas</span>
            </div>
            <div className="flex">
              <span className="font-medium w-32">{terminology.objectives}:</span>
              <span className="text-gray-600">What you want to achieve</span>
            </div>
            <div className="flex">
              <span className="font-medium w-32">{terminology.kpis}:</span>
              <span className="text-gray-600">How you measure success</span>
            </div>
            <div className="flex">
              <span className="font-medium w-32">{terminology.targets}:</span>
              <span className="text-gray-600">Your performance goals</span>
            </div>
            <div className="flex">
              <span className="font-medium w-32">{terminology.initiatives}:</span>
              <span className="text-gray-600">Actions to improve performance</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
