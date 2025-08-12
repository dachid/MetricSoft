'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Label,
  Checkbox,
  Separator
} from '@/components/ui';
import { 
  Building2, 
  Building, 
  Users, 
  User, 
  Plus, 
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth-context';

interface SetupStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface SetupStatus {
  isInitialized: boolean;
  totalSteps: number;
  completedSteps: number;
  currentStep?: string;
}

interface LevelDefinition {
  code: string;
  name: string;
  pluralName: string;
  hierarchyLevel: number;
  isStandard: boolean;
  isEnabled: boolean;
  icon?: string;
  color: string;
}

interface CustomLevel {
  name: string;
  pluralName: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 1,
    title: 'Organization Details',
    description: 'Set up your organization name and basic information',
    icon: Building2
  },
  {
    id: 2,
    title: 'Hierarchy Configuration',
    description: 'Define your organizational levels and structure',
    icon: Building
  },
  {
    id: 3,
    title: 'Custom Levels',
    description: 'Add any custom organizational levels you need',
    icon: Users
  },
  {
    id: 4,
    title: 'Review & Complete',
    description: 'Review your setup and initialize the structure',
    icon: CheckCircle
  }
];

export function OrganizationSetupWizard({ 
  onComplete, 
  onCancel 
}: { 
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 'temp-tenant-id';
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [enabledLevels, setEnabledLevels] = useState<string[]>(['ORGANIZATION', 'DEPARTMENT', 'INDIVIDUAL']);
  const [customLevels, setCustomLevels] = useState<CustomLevel[]>([]);
  const [newCustomLevel, setNewCustomLevel] = useState<CustomLevel>({ name: '', pluralName: '' });

  useEffect(() => {
    if (tenantId) {
      checkSetupStatus();
    }
  }, [tenantId]);

  const checkSetupStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tenants/${tenantId}/org-structure/setup-status`);
      
      if ((response.data as any).success) {
        setSetupStatus((response.data as any).data);
        
        // If already initialized, skip ahead
        if ((response.data as any).data.isInitialized) {
          setCurrentStep(4);
        }
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      // If API doesn't exist, assume not initialized
      setSetupStatus({
        isInitialized: false,
        totalSteps: 4,
        completedSteps: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleLevelToggle = (levelCode: string, enabled: boolean) => {
    if (levelCode === 'ORGANIZATION') return; // Organization level always required
    
    if (enabled) {
      setEnabledLevels([...enabledLevels, levelCode]);
    } else {
      setEnabledLevels(enabledLevels.filter(code => code !== levelCode));
    }
  };

  const addCustomLevel = () => {
    if (newCustomLevel.name && newCustomLevel.pluralName) {
      setCustomLevels([...customLevels, newCustomLevel]);
      setNewCustomLevel({ name: '', pluralName: '' });
    }
  };

  const removeCustomLevel = (index: number) => {
    setCustomLevels(customLevels.filter((_, i) => i !== index));
  };

  const completeSetup = async () => {
    try {
      setLoading(true);
      setError(null);

      await apiClient.post(`/tenants/${tenantId}/org-structure/initialize`, {
        organizationName,
        enabledLevels,
        customLevels
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error completing setup:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const standardLevels = [
    { code: 'ORGANIZATION', name: 'Organization', pluralName: 'Organizations', required: true },
    { code: 'DIVISION', name: 'Division', pluralName: 'Divisions', required: false },
    { code: 'DEPARTMENT', name: 'Department', pluralName: 'Departments', required: false },
    { code: 'TEAM', name: 'Team', pluralName: 'Teams', required: false },
    { code: 'INDIVIDUAL', name: 'Individual', pluralName: 'Individuals', required: false }
  ];

  if (loading && !setupStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {SETUP_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= step.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {currentStep > step.id ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                React.createElement(step.icon, { className: "h-4 w-4" })
              )}
            </div>
            <div className="ml-3 hidden md:block">
              <p className={`text-sm font-medium ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {step.title}
              </p>
            </div>
            {index < SETUP_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {React.createElement(SETUP_STEPS[currentStep - 1].icon, { className: "h-5 w-5" })}
            <span>{SETUP_STEPS[currentStep - 1].title}</span>
          </CardTitle>
          <CardDescription>
            {SETUP_STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <div className="mt-2">
                  <input
                    type="text"
                    id="orgName"
                    placeholder="Enter your organization name"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={nextStep} 
                  disabled={!organizationName.trim()}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Hierarchy Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Select Organizational Levels
                </h3>
                <p className="text-gray-600 mb-6">
                  Choose which levels you want to use in your organizational structure.
                </p>
                
                <div className="space-y-3">
                  {standardLevels.map(level => (
                    <div key={level.code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={enabledLevels.includes(level.code)}
                          onCheckedChange={(checked) => handleLevelToggle(level.code, checked as boolean)}
                          disabled={level.required}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{level.name}</span>
                            {level.required && (
                              <Badge variant="secondary" size="sm">Required</Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{level.pluralName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Custom Levels */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Custom Levels (Optional)
                </h3>
                <p className="text-gray-600 mb-6">
                  Add any custom organizational levels that are specific to your organization.
                </p>
                
                {customLevels.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {customLevels.map((level, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{level.name}</span>
                          <span className="text-sm text-gray-600 ml-2">({level.pluralName})</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomLevel(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Add Custom Level</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="customName">Level Name (Singular)</Label>
                      <input
                        type="text"
                        id="customName"
                        placeholder="e.g., Region"
                        value={newCustomLevel.name}
                        onChange={(e) => setNewCustomLevel({
                          ...newCustomLevel,
                          name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customPlural">Level Name (Plural)</Label>
                      <input
                        type="text"
                        id="customPlural"
                        placeholder="e.g., Regions"
                        value={newCustomLevel.pluralName}
                        onChange={(e) => setNewCustomLevel({
                          ...newCustomLevel,
                          pluralName: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={addCustomLevel}
                    disabled={!newCustomLevel.name || !newCustomLevel.pluralName}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Level
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Complete */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Review Your Setup
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Organization Name</h4>
                    <p className="text-gray-700">{organizationName}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Enabled Levels</h4>
                    <div className="flex flex-wrap gap-2">
                      {enabledLevels.map(levelCode => {
                        const level = standardLevels.find(l => l.code === levelCode);
                        return level ? (
                          <Badge key={levelCode} variant="info">
                            {level.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  
                  {customLevels.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Custom Levels</h4>
                      <div className="flex flex-wrap gap-2">
                        {customLevels.map((level, index) => (
                          <Badge key={index} variant="secondary">
                            {level.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={completeSetup} 
                  disabled={loading}
                  loading={loading}
                >
                  Complete Setup
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Option */}
      {onCancel && (
        <div className="text-center">
          <Button variant="ghost" onClick={onCancel}>
            Cancel Setup
          </Button>
        </div>
      )}
    </div>
  );
}
