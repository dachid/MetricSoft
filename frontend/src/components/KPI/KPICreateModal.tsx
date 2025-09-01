'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

interface KPITarget {
  type: 'NUMERIC' | 'STATUS' | 'PERCENTAGE';
  direction: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
  numericValue?: number;
  unit?: string;
  statusValue?: string;
  percentageValue?: number;
}

interface KPIObjective {
  title: string;
  description: string;
}

interface CreateKPIRequest {
  name: string;
  description?: string;
  code?: string;
  perspective: string;
  fiscalYearId: string;
  exitComponentId?: string;
  isRecurring: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  dueDate?: string;
  targets: KPITarget[];
  objectives: KPIObjective[];
}

interface ExitComponent {
  id: string;
  name: string;
  description?: string;
  weight: number;
  organizationalLevel: string;
}

interface KPICreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (kpi: any) => void;
  fiscalYears: any[];
  currentFiscalYear: any;
  currentOrgUnit?: any; // Added to get organizational context
}


interface Perspective {
  id: string;
  name: string;
  description?: string;
  fiscalYearId: string;
}

interface ExitComponent {
  id: string;
  componentName: string;
  componentType: string;
  orgLevelId: string;
  fiscalYearId: string;
}

export default function KPICreateModal({
  isOpen,
  onClose,
  onSuccess,
  fiscalYears,
  currentFiscalYear,
  currentOrgUnit
}: KPICreateModalProps) {
  const { user } = useAuth();
  const { terminology } = useTerminology();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [previousLevelExitComponents, setPreviousLevelExitComponents] = useState<ExitComponent[]>([]);
  const [filteredExitComponents, setFilteredExitComponents] = useState<ExitComponent[]>([]);
  const [exitComponentSearchTerm, setExitComponentSearchTerm] = useState('');
  const [showExitComponentDropdown, setShowExitComponentDropdown] = useState(false);
  
  // Objective auto-complete states
  const [availableObjectives, setAvailableObjectives] = useState<string[]>([]);
  const [filteredObjectives, setFilteredObjectives] = useState<string[]>([]);
  const [objectiveSearchTerm, setObjectiveSearchTerm] = useState('');
  const [showObjectiveDropdown, setShowObjectiveDropdown] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState('');
  
  const [form, setForm] = useState<CreateKPIRequest>({
    name: '',
    description: '',
    code: '',
    perspective: '',
    fiscalYearId: currentFiscalYear?.id || '',
    exitComponentId: '',
    isRecurring: false,
    frequency: undefined,
    dueDate: '',
    targets: [],
    objectives: []
  });

  useEffect(() => {
    if (isOpen) {
      fetchPerspectives();
      fetchPreviousLevelExitComponents();
      fetchObjectivesFromOrgUnit();
      resetForm();
    }
  }, [isOpen, currentFiscalYear]);

  // Handle auto-complete filtering
  useEffect(() => {
    if (exitComponentSearchTerm.trim() === '') {
      setFilteredExitComponents(previousLevelExitComponents);
    } else {
      const filtered = previousLevelExitComponents.filter(component =>
        component.componentName.toLowerCase().includes(exitComponentSearchTerm.toLowerCase())
      );
      setFilteredExitComponents(filtered);
    }
  }, [exitComponentSearchTerm, previousLevelExitComponents]);

  // Handle objective auto-complete filtering
  useEffect(() => {
    if (objectiveSearchTerm.trim() === '') {
      setFilteredObjectives(availableObjectives);
    } else {
      const filtered = availableObjectives.filter(objective =>
        objective.toLowerCase().includes(objectiveSearchTerm.toLowerCase())
      );
      setFilteredObjectives(filtered);
    }
  }, [objectiveSearchTerm, availableObjectives]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.exit-component-autocomplete')) {
        setShowExitComponentDropdown(false);
      }
    };

    if (showExitComponentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExitComponentDropdown]);

  // Close objective dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.objective-autocomplete')) {
        setShowObjectiveDropdown(false);
      }
    };

    if (showObjectiveDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showObjectiveDropdown]);

  // Check if current org unit is not at Organization level
  const shouldShowExitComponentAutoComplete = () => {
    if (!currentOrgUnit) return false;
    
    const levelName = currentOrgUnit.levelDefinition?.name;
    const parentId = currentOrgUnit.parentId;
    
    // Show the field if it's not at the Organization level and has a parent
    return levelName !== 'Organization' && parentId !== null;
  };

  // Progressive field visibility helpers
  const shouldShowKPIName = () => {
    // Show KPI name after objective is selected
    return selectedObjective && form.objectives.length > 0;
  };

  const shouldShowKPIDescription = () => {
    // Show description after KPI name is entered
    return shouldShowKPIName() && form.name.trim().length > 0;
  };

  const shouldShowKPICode = () => {
    // Show code after description is entered
    return shouldShowKPIDescription() && form.description && form.description.trim().length > 0;
  };

  const shouldShowRemainingFields = () => {
    // Show remaining fields after all progressive fields are completed
    return shouldShowKPICode() && form.code && form.code.trim().length > 0;
  };

  // Objective field should always be shown (required for all KPIs)
  const shouldShowObjectiveField = () => {
    return currentFiscalYear !== null; // Only show if fiscal year is available
  };

  const handleExitComponentSelect = (component: ExitComponent) => {
    setExitComponentSearchTerm(component.componentName);
    setForm({ ...form, exitComponentId: component.id });
    setShowExitComponentDropdown(false);
  };

  const handleExitComponentInputChange = (value: string) => {
    setExitComponentSearchTerm(value);
    setShowExitComponentDropdown(true);
    // Clear the selected component if the input doesn't match exactly
    const exactMatch = previousLevelExitComponents.find(c => c.componentName === value);
    if (!exactMatch) {
      setForm({ ...form, exitComponentId: '' });
    }
  };

  // Objective handling functions
  const handleObjectiveSelect = (objective: string) => {
    setSelectedObjective(objective);
    setObjectiveSearchTerm(objective);
    setShowObjectiveDropdown(false);
    
    // Update form with the selected objective
    setForm(prevForm => {
      const newCode = generateKPICode(prevForm.name, objective);
      return {
        ...prevForm,
        objectives: [{ title: objective, description: '' }],
        code: newCode
      };
    });
  };

  const handleObjectiveInputChange = (value: string) => {
    setObjectiveSearchTerm(value);
    setShowObjectiveDropdown(true);
    
    // Allow creating new objectives or selecting existing ones
    if (value.trim()) {
      setSelectedObjective(value.trim());
      setForm(prevForm => {
        const newCode = generateKPICode(prevForm.name, value.trim());
        return {
          ...prevForm,
          objectives: [{ title: value.trim(), description: '' }],
          code: newCode
        };
      });
    } else {
      setSelectedObjective('');
      setForm(prevForm => ({
        ...prevForm,
        objectives: [],
        code: ''
      }));
    }
  };

  // Auto-generate KPI code based on name and objective
  const generateKPICode = (name: string, objective: string) => {
    if (!name.trim()) return '';
    
    const nameWords = name.trim().split(' ').filter(word => word.length > 0);
    const objectiveWords = objective.trim().split(' ').filter(word => word.length > 0);
    
    // Take first 2-3 letters from first few words of name
    const nameAbbr = nameWords.slice(0, 2).map(word => 
      word.substring(0, Math.min(3, word.length)).toUpperCase()
    ).join('');
    
    // Take first 1-2 letters from first word of objective if available
    const objAbbr = objectiveWords.length > 0 ? 
      objectiveWords[0].substring(0, 2).toUpperCase() : '';
    
    // Add a random number for uniqueness
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    return `${nameAbbr}${objAbbr}${randomSuffix}`;
  };

  // Handle KPI name change and auto-generate code
  const handleKPINameChange = (name: string) => {
    setForm(prevForm => {
      const newCode = generateKPICode(name, selectedObjective);
      return {
        ...prevForm,
        name: name,
        code: newCode
      };
    });
  };

  const fetchPerspectives = async () => {
    try {
      if (!currentFiscalYear?.id || !user?.tenantId) {
        setPerspectives([]);
        return;
      }
      
      const url = `/tenants/${user.tenantId}/fiscal-years/${currentFiscalYear.id}/perspectives`;
      const response = await apiClient.get(url);
      
      if (response.data) {
        const perspectivesData = (response.data as any).perspectives;
        if (Array.isArray(perspectivesData)) {
          setPerspectives(perspectivesData);
        } else {
          setPerspectives([]);
        }
      } else {
        setPerspectives([]);
      }
    } catch (error) {
      console.error('Error fetching perspectives:', error);
      setPerspectives([]);
    }
  };

  const fetchPreviousLevelExitComponents = async () => {
    try {
      if (!currentFiscalYear?.id || !user?.tenantId || !currentOrgUnit?.level?.parentId) {
        setPreviousLevelExitComponents([]);
        return;
      }
      
      const url = `/tenants/${user.tenantId}/fiscal-years/${currentFiscalYear.id}/performance-components?levelId=${currentOrgUnit.level.parentId}&componentType=EXIT`;
      const response = await apiClient.get(url);
      
      if (response.data && Array.isArray(response.data)) {
        setPreviousLevelExitComponents(response.data);
        setFilteredExitComponents(response.data);
      } else {
        setPreviousLevelExitComponents([]);
        setFilteredExitComponents([]);
      }
    } catch (error) {
      console.error('Error fetching previous level exit components:', error);
      setPreviousLevelExitComponents([]);
      setFilteredExitComponents([]);
    }
  };

  // Fetch existing objectives from KPIs in the same organizational unit
  const fetchObjectivesFromOrgUnit = async () => {
    try {
      if (!user?.tenantId || !currentOrgUnit?.id || !currentFiscalYear?.id) {
        setAvailableObjectives([]);
        return;
      }
      
      // Fetch KPIs for this organizational unit using assigned-kpis endpoint
      const url = `/kpis/assigned-kpis?unitId=${currentOrgUnit.id}`;
      const response = await apiClient.get(url);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        // Extract unique objective titles from existing KPIs
        const objectives = new Set<string>();
        response.data.forEach((kpi: any) => {
          if (kpi.objectives && Array.isArray(kpi.objectives)) {
            kpi.objectives.forEach((objective: any) => {
              if (objective.title && objective.title.trim()) {
                objectives.add(objective.title.trim());
              }
            });
          }
        });
        
        const objectiveArray = Array.from(objectives).sort();
        setAvailableObjectives(objectiveArray);
        setFilteredObjectives(objectiveArray);
      } else {
        setAvailableObjectives([]);
        setFilteredObjectives([]);
      }
    } catch (error) {
      console.error('Error fetching objectives from organizational unit:', error);
      setAvailableObjectives([]);
      setFilteredObjectives([]);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      code: '',
      perspective: '',
      fiscalYearId: currentFiscalYear?.id || '',
      exitComponentId: '',
      isRecurring: false,
      frequency: undefined,
      dueDate: '',
      targets: [],
      objectives: []
    });
    
    // Reset objective-related states
    setSelectedObjective('');
    setObjectiveSearchTerm('');
    setShowObjectiveDropdown(false);
    setFilteredObjectives(availableObjectives);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentFiscalYear) {
      setError('No current fiscal year is set. Please contact your administrator to set up a fiscal year before creating KPIs.');
      return;
    }
    
    if (!form.fiscalYearId) {
      setError('Fiscal year is required');
      return;
    }

    if (!form.perspective) {
      setError('Perspective is required');
      return;
    }

    // Validate exit component if required
    if (shouldShowExitComponentAutoComplete() && !form.exitComponentId) {
      setError(`${terminology.exitComponent || 'Exit component'} is required`);
      return;
    }

    // Validate objective - always required
    if (!selectedObjective || !form.objectives.length) {
      setError(`${terminology.objective || 'Objective'} is required`);
      return;
    }

    // Validate KPI name
    if (!form.name.trim()) {
      setError('KPI name is required');
      return;
    }

    // Validate KPI description
    if (!form.description?.trim()) {
      setError('KPI description is required');
      return;
    }

    // Validate KPI code
    if (!form.code?.trim()) {
      setError('KPI code is required');
      return;
    }

    if (form.targets.length === 0) {
      setError('Please add at least one target');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/kpis', form);
      if (response.success && response.data) {
        onSuccess(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating KPI:', error);
      setError(error?.response?.data?.message || 'Failed to create KPI');
    } finally {
      setLoading(false);
    }
  };

  const addTarget = () => {
    setForm({
      ...form,
      targets: [
        ...form.targets,
        {
          type: 'NUMERIC',
          direction: 'INCREASE',
          numericValue: 0,
          unit: ''
        }
      ]
    });
  };

  const updateTarget = (index: number, updates: Partial<KPITarget>) => {
    const newTargets = [...form.targets];
    newTargets[index] = { ...newTargets[index], ...updates };
    setForm({ ...form, targets: newTargets });
  };

  const removeTarget = (index: number) => {
    setForm({
      ...form,
      targets: form.targets.filter((_, i) => i !== index)
    });
  };

  const addObjective = () => {
    setForm({
      ...form,
      objectives: [
        ...form.objectives,
        { title: '', description: '' }
      ]
    });
  };

  const updateObjective = (index: number, updates: Partial<KPIObjective>) => {
    const newObjectives = [...form.objectives];
    newObjectives[index] = { ...newObjectives[index], ...updates };
    setForm({ ...form, objectives: newObjectives });
  };

  const removeObjective = (index: number) => {
    setForm({
      ...form,
      objectives: form.objectives.filter((_, i) => i !== index)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Create New {terminology.kpis}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fiscal Year - First field, read-only */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiscal Year *
                </label>
                {currentFiscalYear ? (
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {currentFiscalYear.year || currentFiscalYear.name || 'Unknown Year'}
                        </span>
                        <span className="text-sm text-gray-500">Fiscal Year</span>
                      </div>
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">Current</span>
                    </div>
                    {currentFiscalYear.description && (
                      <p className="text-sm text-gray-600 mt-1">{currentFiscalYear.description}</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full px-3 py-2 bg-red-50 border border-red-300 rounded-md">
                    <div className="flex items-center text-red-700">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="font-medium">No current fiscal year set</p>
                        <p className="text-sm">Please contact your administrator to set up a fiscal year before creating KPIs.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Perspective - Second field */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perspective *
                </label>
                <select
                  value={form.perspective}
                  onChange={(e) => setForm({ ...form, perspective: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!currentFiscalYear || perspectives.length === 0}
                  required
                >
                  <option value="">Select a perspective</option>
                  {perspectives.map((perspective) => (
                    <option key={perspective.id} value={perspective.id}>
                      {perspective.name}
                    </option>
                  ))}
                </select>
                {perspectives.length === 0 && currentFiscalYear && (
                  <p className="text-sm text-amber-600 mt-1">
                    No perspectives available for the current fiscal year.
                  </p>
                )}
                {!currentFiscalYear && (
                  <p className="text-sm text-gray-500 mt-1">
                    Set up a fiscal year first to view available perspectives.
                  </p>
                )}
              </div>

              {/* Exit Component Auto-complete - Third field (only for non-Organization levels) */}
              {shouldShowExitComponentAutoComplete() && (
                <div className="md:col-span-2 relative exit-component-autocomplete">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {terminology.exitComponent || 'Exit Component'} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={exitComponentSearchTerm}
                      onChange={(e) => handleExitComponentInputChange(e.target.value)}
                      onFocus={() => setShowExitComponentDropdown(true)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Search ${terminology.exitComponent?.toLowerCase() || 'exit component'}...`}
                      required
                      disabled={!currentFiscalYear || previousLevelExitComponents.length === 0}
                    />
                    
                    {/* Dropdown */}
                    {showExitComponentDropdown && filteredExitComponents.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredExitComponents.map((component) => (
                          <div
                            key={component.id}
                            onClick={() => handleExitComponentSelect(component)}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{component.componentName}</div>
                            <div className="text-sm text-gray-600">{component.componentType}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {previousLevelExitComponents.length === 0 && currentFiscalYear && (
                    <p className="text-sm text-amber-600 mt-1">
                      No {terminology.exitComponent?.toLowerCase() || 'exit components'} available from the previous level.
                    </p>
                  )}
                  
                  {!currentFiscalYear && (
                    <p className="text-sm text-gray-500 mt-1">
                      Set up a fiscal year first to view available {terminology.exitComponent?.toLowerCase() || 'exit components'}.
                    </p>
                  )}
                </div>
              )}

              {/* Objective Auto-complete - Fourth field (always required) */}
              {shouldShowObjectiveField() && (
                <div className="md:col-span-2 relative objective-autocomplete">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  {terminology.objective || 'Objective'} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={objectiveSearchTerm}
                    onChange={(e) => handleObjectiveInputChange(e.target.value)}
                    onFocus={() => setShowObjectiveDropdown(true)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Search or enter ${terminology.objective?.toLowerCase() || 'objective'}...`}
                    required
                    disabled={!currentFiscalYear}
                  />
                  
                  {/* Dropdown */}
                  {showObjectiveDropdown && filteredObjectives.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredObjectives.map((objective, index) => (
                        <div
                          key={index}
                          onClick={() => handleObjectiveSelect(objective)}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{objective}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {availableObjectives.length === 0 && currentFiscalYear && (
                  <p className="text-sm text-blue-600 mt-1">
                    No existing {terminology.objective?.toLowerCase() || 'objectives'} found in this unit. You can create a new one by typing.
                  </p>
                )}
                
                {!currentFiscalYear && (
                  <p className="text-sm text-gray-500 mt-1">
                    Set up a fiscal year first to view available {terminology.objective?.toLowerCase() || 'objectives'}.
                  </p>
                )}
              </div>
              )}

              {/* 5th Field: KPI Name - Progressive */}
              {shouldShowKPIName() && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {terminology.kpis} Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleKPINameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter KPI name..."
                  required
                  disabled={!currentFiscalYear}
                />
              </div>
              )}

              {/* 6th Field: KPI Description - Progressive */}
              {shouldShowKPIDescription() && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe what this KPI measures..."
                  required
                  disabled={!currentFiscalYear}
                />
              </div>
              )}

              {/* 7th Field: KPI Code - Progressive with auto-generation */}
              {shouldShowKPICode() && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Code *
                  <span className="text-xs text-gray-500 ml-2">(Auto-generated, can be edited)</span>
                </label>
                <input
                  type="text"
                  value={form.code || ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="KPI code (auto-generated)..."
                  required
                  disabled={!currentFiscalYear}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This code is auto-generated from the KPI name and objective but can be customized.
                </p>
              </div>
              )}
            </div>
          </div>

          {/* Remaining fields show only after all progressive fields are completed */}
          {shouldShowRemainingFields() && (
          <>
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={!currentFiscalYear}
                />
              </div>
            </div>
          </div>

          {/* Recurring Options */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Frequency Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ 
                    ...form, 
                    isRecurring: e.target.checked,
                    frequency: e.target.checked ? 'MONTHLY' : undefined
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={!currentFiscalYear}
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                  This is a recurring KPI
                </label>
              </div>

              {form.isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={form.frequency || ''}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!currentFiscalYear}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Targets */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Targets *</h3>
              <button
                type="button"
                onClick={addTarget}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!currentFiscalYear}
              >
                Add Target
              </button>
            </div>

            {form.targets.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No targets defined</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first target.</p>
              </div>
            )}

            <div className="space-y-4">
              {form.targets.map((target, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-md font-medium text-gray-900">Target {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeTarget(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={target.type}
                        onChange={(e) => updateTarget(index, { type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="NUMERIC">Numeric</option>
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="STATUS">Status</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                      <select
                        value={target.direction}
                        onChange={(e) => updateTarget(index, { direction: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="INCREASE">Increase</option>
                        <option value="DECREASE">Decrease</option>
                        <option value="MAINTAIN">Maintain</option>
                      </select>
                    </div>

                    {target.type === 'NUMERIC' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                          <input
                            type="number"
                            value={target.numericValue || ''}
                            onChange={(e) => updateTarget(index, { numericValue: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                          <input
                            type="text"
                            value={target.unit || ''}
                            onChange={(e) => updateTarget(index, { unit: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., units, hours, $"
                          />
                        </div>
                      </>
                    )}

                    {target.type === 'PERCENTAGE' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label>
                        <input
                          type="number"
                          value={target.percentageValue || ''}
                          onChange={(e) => updateTarget(index, { percentageValue: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    )}

                    {target.type === 'STATUS' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status Value</label>
                        <input
                          type="text"
                          value={target.statusValue || ''}
                          onChange={(e) => updateTarget(index, { statusValue: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Completed, Active"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Objectives */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Objectives</h3>
              <button
                type="button"
                onClick={addObjective}
                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!currentFiscalYear}
              >
                Add Objective
              </button>
            </div>

            {form.objectives.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-500">No objectives defined. Objectives help break down your KPI into actionable steps.</p>
              </div>
            )}

            <div className="space-y-4">
              {form.objectives.map((objective, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-md font-medium text-gray-900">Objective {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeObjective(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={objective.title}
                        onChange={(e) => updateObjective(index, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter objective title..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={objective.description}
                        onChange={(e) => updateObjective(index, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Describe what needs to be accomplished..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || form.targets.length === 0 || !currentFiscalYear || !form.perspective || (shouldShowExitComponentAutoComplete() && !form.exitComponentId) || !selectedObjective || !form.name.trim() || !form.description?.trim() || !form.code?.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${terminology.kpis}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
