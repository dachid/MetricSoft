import React, { useState } from 'react'
import { useTenantSettings, useSetupWizard, useFiscalYears } from '../../hooks/useTenant'
import { Button, Card, ProgressBar } from '../ui'
import { QuickSetupSelector } from './QuickSetupSelector'
import { TerminologyEditor } from './TerminologyEditor'
import { SetupPreview } from './SetupPreview'

export function TenantSetupWizard() {
  const { settings, updateSettings, isUpdating } = useTenantSettings()
  const { currentFiscalYear, isLoading: isFiscalYearLoading } = useFiscalYears()
  const {
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    progressPercentage,
    showPreview,
    togglePreview
  } = useSetupWizard(3)

  const [localChanges, setLocalChanges] = useState<Record<string, any>>({})

  // Auto-save changes with debouncing
  React.useEffect(() => {
    if (Object.keys(localChanges).length > 0) {
      const timeoutId = setTimeout(() => {
        updateSettings(localChanges)
        setLocalChanges({})
      }, 1000) // 1 second delay for auto-save

      return () => clearTimeout(timeoutId)
    }
  }, [localChanges, updateSettings])

  const handleLocalChange = (changes: Record<string, any>) => {
    setLocalChanges(prev => ({ ...prev, ...changes }))
  }

  const handleCompleteSetup = async () => {
    await updateSettings({ 
      setupCompleted: true, 
      setupStep: totalSteps + 1 
    })
    // Redirect or show success message
    window.location.href = '/dashboard'
  }

  const steps = [
    {
      id: 1,
      title: 'Quick Start',
      subtitle: 'Choose your performance framework',
      component: <QuickSetupSelector onNext={nextStep} />
    },
    {
      id: 2,
      title: 'Terminology',
      subtitle: 'Customize your language',
      component: (
        <TerminologyEditor 
          terminology={settings?.terminology}
          onChange={handleLocalChange}
        />
      )
    },
    {
      id: 3,
      title: 'Review',
      subtitle: 'Confirm your setup',
      component: (
        <SetupPreview 
          settings={{ ...(settings || {}), ...localChanges }}
          onComplete={handleCompleteSetup}
        />
      )
    }
  ]

  const currentStepData = steps[currentStep - 1]

  if (!settings || isFiscalYearLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with progress */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to MetricSoft
          </h1>
          <p className="text-gray-600 mb-6">
            Let's set up your performance management system in just a few minutes
          </p>
          
          <div className="max-w-md mx-auto">
            <ProgressBar 
              progress={progressPercentage} 
              color="blue"
              showLabel={false}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
          </div>
        </div>

        {/* Step Navigation */}
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
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step.id === currentStep ? 'bg-blue-600 text-white' : 
                    step.id < currentStep ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
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

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Step Content */}
          <div className="flex-1">
            <Card title={currentStepData.title} subtitle={currentStepData.subtitle}>
              {currentStepData.component}
            </Card>
          </div>

          {/* Preview Sidebar (optional) */}
          {showPreview && (
            <div className="w-80">
              <Card title="Preview" className="sticky top-8">
                <SetupPreview 
                  settings={{ ...(settings || {}), ...localChanges }}
                  compact={true}
                />
              </Card>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center mt-8 p-6 bg-white rounded-lg border">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={togglePreview}
              size="sm"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            
            {/* Auto-save indicator */}
            <div className="text-sm text-gray-500">
              {isUpdating ? (
                <span className="flex items-center">
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Changes saved automatically'
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={isFirstStep}
            >
              Previous
            </Button>
            
            {isLastStep ? (
              <Button
                variant="success"
                onClick={handleCompleteSetup}
                loading={isUpdating}
              >
                Complete Setup
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
        </div>
      </div>
    </div>
  )
}
