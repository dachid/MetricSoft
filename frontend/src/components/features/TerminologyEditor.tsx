import { useState, useEffect } from 'react'
import { Input, Button, Card } from '../ui'

// Phase 2 - Updated for performance components terminology
interface TerminologyEditorProps {
  terminology?: Record<string, string>
  onChange: (changes: any) => void
}

interface TerminologyPreset {
  name: string
  description: string
  config: Record<string, string>
}

export function TerminologyEditor({ terminology: initialTerminology, onChange }: TerminologyEditorProps) {
  // Default Balanced Scorecard terminology with both singular and plural forms
  const defaultTerminology = {
    perspectives: 'Perspective',
    perspectivesPlural: 'Perspectives',
    objectives: 'Objective',
    objectivesPlural: 'Objectives',
    kpis: 'KPI',
    kpisPlural: 'KPIs',
    targets: 'Target',
    targetsPlural: 'Targets'
  }

  const [terminology, setTerminology] = useState(
    initialTerminology ? { ...defaultTerminology, ...initialTerminology } : defaultTerminology
  )

  const [showPresets, setShowPresets] = useState(false)

  // Update terminology when props change
  useEffect(() => {
    if (initialTerminology) {
      setTerminology({ ...defaultTerminology, ...initialTerminology })
    }
  }, [initialTerminology])

  // Predefined terminology presets for Phase 2
  const presets: TerminologyPreset[] = [
    {
      name: 'Balanced Scorecard',
      description: 'Traditional performance management terminology',
      config: {
        perspectives: 'Perspective',
        perspectivesPlural: 'Perspectives',
        objectives: 'Objective',
        objectivesPlural: 'Objectives',
        kpis: 'KPI',
        kpisPlural: 'KPIs',
        targets: 'Target',
        targetsPlural: 'Targets'
      }
    },
    {
      name: 'OKR Framework',
      description: 'Objectives and Key Results terminology',
      config: {
        perspectives: 'Focus Area',
        perspectivesPlural: 'Focus Areas',
        objectives: 'Objective',
        objectivesPlural: 'Objectives',
        kpis: 'Key Result',
        kpisPlural: 'Key Results',
        targets: 'Target',
        targetsPlural: 'Targets'
      }
    },
    {
      name: 'Strategic Planning',
      description: 'Corporate strategy terminology',
      config: {
        perspectives: 'Strategic Pillar',
        perspectivesPlural: 'Strategic Pillars',
        objectives: 'Goal',
        objectivesPlural: 'Goals',
        kpis: 'Success Metric',
        kpisPlural: 'Success Metrics',
        targets: 'Performance Benchmark',
        targetsPlural: 'Performance Benchmarks'
      }
    },
    {
      name: 'Operational Excellence',
      description: 'Operations-focused terminology',
      config: {
        perspectives: 'Business Area',
        perspectivesPlural: 'Business Areas',
        objectives: 'Outcome',
        objectivesPlural: 'Outcomes',
        kpis: 'Performance Indicator',
        kpisPlural: 'Performance Indicators',
        targets: 'Standard',
        targetsPlural: 'Standards'
      }
    }
  ]

  const handleTermChange = (field: string, value: string) => {
    const newTerminology = { ...terminology, [field]: value }
    setTerminology(newTerminology)
    onChange({ terminology: newTerminology })
  }

  const applyPreset = (preset: TerminologyPreset) => {
    setTerminology({ ...defaultTerminology, ...preset.config })
    onChange({ terminology: { ...defaultTerminology, ...preset.config } })
    setShowPresets(false)
  }

  const resetToDefault = () => {
    const defaultTerms = {
      perspectives: 'Perspective',
      perspectivesPlural: 'Perspectives',
      objectives: 'Objective',
      objectivesPlural: 'Objectives',
      kpis: 'KPI',
      kpisPlural: 'KPIs',
      targets: 'Target',
      targetsPlural: 'Targets'
    }
    setTerminology(defaultTerms)
    onChange({ terminology: defaultTerms })
  }

  const terms = [
    { 
      key: 'perspectives', 
      keyPlural: 'perspectivesPlural',
      label: 'Strategic Areas', 
      placeholder: 'e.g., Perspective, Pillar, Theme',
      placeholderPlural: 'e.g., Perspectives, Pillars, Themes'
    },
    { 
      key: 'objectives', 
      keyPlural: 'objectivesPlural',
      label: 'Goals', 
      placeholder: 'e.g., Objective, Goal, Outcome',
      placeholderPlural: 'e.g., Objectives, Goals, Outcomes'
    },
    { 
      key: 'kpis', 
      keyPlural: 'kpisPlural',
      label: 'Metrics', 
      placeholder: 'e.g., KPI, Metric, Measure',
      placeholderPlural: 'e.g., KPIs, Metrics, Measures'
    },
    { 
      key: 'targets', 
      keyPlural: 'targetsPlural',
      label: 'Benchmarks', 
      placeholder: 'e.g., Target, Benchmark, Standard',
      placeholderPlural: 'e.g., Targets, Benchmarks, Standards'
    }
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

      <div className="space-y-6">
        {terms.map((term) => (
          <div key={term.key} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${term.label} (Singular)`}
              value={terminology[term.key as keyof typeof terminology]}
              onChange={(value) => handleTermChange(term.key, value)}
              placeholder={term.placeholder}
            />
            <Input
              label={`${term.label} (Plural)`}
              value={terminology[term.keyPlural as keyof typeof terminology]}
              onChange={(value) => handleTermChange(term.keyPlural, value)}
              placeholder={term.placeholderPlural}
            />
          </div>
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
              <span className="font-medium w-40">{terminology.perspectives}/{terminology.perspectivesPlural}:</span>
              <span className="text-gray-600">Your strategic focus areas</span>
            </div>
            <div className="flex">
              <span className="font-medium w-40">{terminology.objectives}/{terminology.objectivesPlural}:</span>
              <span className="text-gray-600">What you want to achieve</span>
            </div>
            <div className="flex">
              <span className="font-medium w-40">{terminology.kpis}/{terminology.kpisPlural}:</span>
              <span className="text-gray-600">How you measure success</span>
            </div>
            <div className="flex">
              <span className="font-medium w-40">{terminology.targets}/{terminology.targetsPlural}:</span>
              <span className="text-gray-600">Your performance goals</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
