'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface OrganizationalUnit {
  id: string;
  name: string;
  levelDefinition: {
    id: string;
    name: string;
  };
  parentId?: string;
}

interface Perspective {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Target {
  targetType: 'NUMERIC' | 'PERCENTAGE' | 'STATUS';
  currentValue: string;
  targetValue: string;
  targetLabel: string;
  targetDirection: 'INCREASING' | 'DECREASING' | 'N/A';
}

interface KPIFormData {
  fiscalYearId: string;
  orgUnitId: string;
  perspectiveId: string;
  objectiveId: string;
  performanceComponentId: string;
  name: string;
  description: string;
  code: string;
  evaluatorId: string;
  isRecurring: boolean;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null;
  dueDate: string | null;
  targets: Target[];
}

interface ExitComponent {
  id: string;
  componentName: string;
  componentType: string;
  organizationalLevel: string;
}

interface Objective {
  id: string;
  name?: string;
  title?: string;
  description?: string;
}

interface IndividualKPICreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKPICreated: () => void;
}

export default function IndividualKPICreateModal({ 
  isOpen, 
  onClose, 
  onKPICreated 
}: IndividualKPICreateModalProps) {
  const { user } = useAuth();
  const { terminology } = useTerminology();

  // Current fiscal year state
  const [currentFiscalYear, setCurrentFiscalYear] = useState<FiscalYear | null>(null);
  const [userIndividualOrgUnit, setUserIndividualOrgUnit] = useState<OrganizationalUnit | null>(null);

  // Form state
  const [form, setForm] = useState<KPIFormData>({
    fiscalYearId: '',
    orgUnitId: '',
    perspectiveId: '',
    objectiveId: '',
    performanceComponentId: '',
    name: '',
    description: '',
    code: '',
    evaluatorId: '',
    isRecurring: false,
    frequency: null,
    dueDate: null,
    targets: [{
      targetType: 'NUMERIC',
      currentValue: '0',
      targetValue: '',
      targetLabel: 'Target',
      targetDirection: 'INCREASING',
    }]
  });

  // Data state
  const [departments, setDepartments] = useState<OrganizationalUnit[]>([]);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [evaluators, setEvaluators] = useState<User[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [exitComponents, setExitComponents] = useState<ExitComponent[]>([]);
  const [filteredObjectives, setFilteredObjectives] = useState<Objective[]>([]);
  const [filteredExitComponents, setFilteredExitComponents] = useState<ExitComponent[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showObjectiveDropdown, setShowObjectiveDropdown] = useState(false);
  const [showEvaluatorDropdown, setShowEvaluatorDropdown] = useState(false);
  const [showExitComponentDropdown, setShowExitComponentDropdown] = useState(false);
  const [showCreateObjectiveForm, setShowCreateObjectiveForm] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [selectedExitComponent, setSelectedExitComponent] = useState('');
  const [objectiveSearch, setObjectiveSearch] = useState('');
  const [exitComponentSearch, setExitComponentSearch] = useState('');
  const [evaluatorSearch, setEvaluatorSearch] = useState('');
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [newObjectiveDescription, setNewObjectiveDescription] = useState('');

  // Refs for dropdown management
  const objectiveDropdownRef = useRef<HTMLDivElement>(null);
  const evaluatorDropdownRef = useRef<HTMLDivElement>(null);
  const exitComponentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentFiscalYear();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentFiscalYear) {
      setForm(prev => ({ ...prev, fiscalYearId: currentFiscalYear.id }));
      fetchDepartments();
      fetchPerspectives();
      fetchEvaluators();
    }
  }, [isOpen, currentFiscalYear]);

  useEffect(() => {
    if (form.orgUnitId) {
      fetchDepartmentExitComponents();
    }
  }, [form.orgUnitId]);

  useEffect(() => {
    // Fetch user's individual objectives when modal opens
    if (currentFiscalYear) {
      fetchUserIndividualObjectives();
    }
  }, [currentFiscalYear]);

  // Department selection is the starting point for individual KPIs
  const fetchCurrentFiscalYear = async () => {
    try {
      if (!user?.tenantId) return;
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/fiscal-years`);
      if (response.data && Array.isArray(response.data)) {
        const activeFY = response.data.find((fy: FiscalYear) => fy.status === 'active' || fy.status === 'locked');
        if (activeFY) {
          setCurrentFiscalYear(activeFY);
        }
      }
    } catch (error) {
      console.error('Error fetching fiscal year:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      if (!user?.tenantId || !currentFiscalYear?.id) return;
      
      console.log('🔍 [Individual KPI Modal] Fetching departments...');
      const response = await apiClient.get(`/tenants/${user.tenantId}/org-units?fiscalYearId=${currentFiscalYear.id}`);
      console.log('🔍 [Individual KPI Modal] Departments response:', response);
      
      if (response.data && (response.data as any).orgUnits && Array.isArray((response.data as any).orgUnits)) {
        // Filter to only show Department level units
        // We'll get all units and filter them properly
        const allUnits = (response.data as any).orgUnits;
        console.log('🔍 [Individual KPI Modal] All org units:', allUnits);
        
        // For now, let's get all units and let the user see them to debug
        // Later we can filter by Department level specifically
        const departmentUnits = allUnits.filter((unit: any) => {
          console.log('🔍 [Individual KPI Modal] Unit:', unit.name, 'Level:', unit.levelDefinition?.name);
          return unit.levelDefinition?.name === 'Department';
        });
        
        console.log('🔍 [Individual KPI Modal] Department units:', departmentUnits);
        setDepartments(departmentUnits);
      }
    } catch (error) {
      console.error('🔍 [Individual KPI Modal] Error fetching departments:', error);
    }
  };

  const fetchPerspectives = async () => {
    try {
      if (!user?.tenantId || !currentFiscalYear?.id) return;
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/fiscal-years/${currentFiscalYear.id}/perspectives`);
      if (response.data && Array.isArray(response.data)) {
        setPerspectives(response.data);
      }
    } catch (error) {
      console.error('Error fetching perspectives:', error);
    }
  };

  const fetchEvaluators = async () => {
    try {
      if (!user?.tenantId) return;
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/users/evaluators`);
      console.log('🔍 [Individual KPI Modal] Evaluators API response:', response);
      
      if (response.data) {
        const data = response.data as any;
        // The response structure is { users: Array } not a direct array
        if (data.users && Array.isArray(data.users)) {
          console.log('🔍 [Individual KPI Modal] Users found:', data.users);
          setEvaluators(data.users);
        } else if (Array.isArray(data)) {
          // Fallback: if it's a direct array
          console.log('🔍 [Individual KPI Modal] Direct array found:', data);
          setEvaluators(data);
        }
      }
    } catch (error) {
      console.error('Error fetching evaluators:', error);
    }
  };

  // Fetch objectives from user's individual org unit
  const fetchUserIndividualObjectives = async () => {
    try {
      console.log('🔍 [Individual KPI Modal] Fetching user individual objectives...');
      console.log('🔍 [Individual KPI Modal] User tenant:', user?.tenantId);
      console.log('🔍 [Individual KPI Modal] User ID:', user?.id);
      console.log('🔍 [Individual KPI Modal] Current fiscal year:', currentFiscalYear?.id);
      
      if (!user?.tenantId || !user?.id || !currentFiscalYear?.id) {
        console.log('❌ [Individual KPI Modal] Missing required data for objective fetch');
        return;
      }

      // For individual KPIs, fetch objectives where orgUnitId is null and createdById is the user
      const url = `/objectives/individual?fiscalYearId=${currentFiscalYear.id}`;
      console.log('🔍 [Individual KPI Modal] Fetching from URL:', url);
      
      const response = await apiClient.get(url);
      console.log('🔍 [Individual KPI Modal] Objectives response:', response);
      
      // apiClient returns { success: boolean, data?: T, error?: ApiError }
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('🔍 [Individual KPI Modal] Found individual objectives:', response.data);
        setObjectives(response.data);
        setFilteredObjectives(response.data);
      } else {
        console.log('🔍 [Individual KPI Modal] No individual objectives found or API error');
        console.log('🔍 [Individual KPI Modal] Response:', response);
        if (response.error) {
          console.error('🔍 [Individual KPI Modal] API Error:', response.error);
        }
        setObjectives([]);
        setFilteredObjectives([]);
      }
    } catch (error) {
      console.error('🔍 [Individual KPI Modal] Error fetching individual objectives:', error);
      setObjectives([]);
      setFilteredObjectives([]);
    }
  };

  // Fetch objectives from user (individual objectives have null orgUnitId)
  const fetchObjectivesFromOrgUnit = async () => {
    try {
      console.log('🔍 [Individual KPI Modal] Fetching individual objectives...');
      console.log('🔍 [Individual KPI Modal] User tenant:', user?.tenantId);
      console.log('🔍 [Individual KPI Modal] User ID:', user?.id);
      console.log('🔍 [Individual KPI Modal] Current fiscal year:', currentFiscalYear?.id);
      
      if (!user?.tenantId || !user?.id || !currentFiscalYear?.id) {
        console.log('❌ [Individual KPI Modal] Missing required data for objective fetch');
        return;
      }

      // For individual KPIs, fetch objectives where orgUnitId is null and createdById is the user
      const url = `/objectives/individual?fiscalYearId=${currentFiscalYear.id}`;
      console.log('🔍 [Individual KPI Modal] Fetching from URL:', url);
      
      const response = await apiClient.get(url);
      console.log('🔍 [Individual KPI Modal] Objectives response:', response);
      
      // apiClient returns { success: boolean, data?: T, error?: ApiError }
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('🔍 [Individual KPI Modal] Found individual objectives:', response.data);
        setObjectives(response.data);
        setFilteredObjectives(response.data);
      } else {
        console.log('🔍 [Individual KPI Modal] No individual objectives found or API error');
        console.log('🔍 [Individual KPI Modal] Response:', response);
        if (response.error) {
          console.error('🔍 [Individual KPI Modal] API Error:', response.error);
        }
        setObjectives([]);
        setFilteredObjectives([]);
      }
    } catch (error) {
      console.error('🔍 [Individual KPI Modal] Error fetching individual objectives:', error);
      setObjectives([]);
      setFilteredObjectives([]);
    }
  };

  // Fetch exit components from selected department (these become entry components for individual level)
  const fetchDepartmentExitComponents = async () => {
    console.log('🔍 [Individual KPI Modal] Starting fetchDepartmentExitComponents...');
    console.log('🔍 [Individual KPI Modal] Current fiscal year:', currentFiscalYear?.id);
    console.log('🔍 [Individual KPI Modal] User tenant:', user?.tenantId);
    console.log('🔍 [Individual KPI Modal] Selected org unit:', form.orgUnitId);
    
    try {
      if (!currentFiscalYear?.id || !user?.tenantId || !form.orgUnitId) {
        console.log('🔍 [Individual KPI Modal] Missing required data, setting empty components');
        setExitComponents([]);
        return;
      }
      
      // Get the selected department org unit to find its level ID
      const selectedDept = departments.find(dept => dept.id === form.orgUnitId);
      if (!selectedDept?.levelDefinition?.id) {
        console.log('🔍 [Individual KPI Modal] No department level definition ID found');
        setExitComponents([]);
        return;
      }
      
      const deptLevelId = selectedDept.levelDefinition.id;
      console.log('🔍 [Individual KPI Modal] Department level ID:', deptLevelId);
      
      const url = `/tenants/${user.tenantId}/fiscal-years/${currentFiscalYear.id}/performance-components?levelId=${deptLevelId}&componentType=EXIT&orgUnitId=${form.orgUnitId}`;
      console.log('🔍 [Individual KPI Modal] Fetching from URL:', url);
      
      const response = await apiClient.get(url);
      console.log('🔍 [Individual KPI Modal] API Response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('🔍 [Individual KPI Modal] Found exit components:', response.data);
        setExitComponents(response.data);
        setFilteredExitComponents(response.data);
      } else {
        console.log('🔍 [Individual KPI Modal] No valid response data, setting empty');
        setExitComponents([]);
        setFilteredExitComponents([]);
      }
    } catch (error) {
      console.error('🔍 [Individual KPI Modal] Error fetching department exit components:', error);
      setExitComponents([]);
      setFilteredExitComponents([]);
    }
  };

  // Progressive field visibility helpers
  const shouldShowExitComponentField = () => {
    // Show department activity after department is selected
    return form.orgUnitId.trim().length > 0;
  };

  const shouldShowPerspective = () => {
    // Only show perspective for top-level org units (no parent)
    const selectedDept = departments.find(dept => dept.id === form.orgUnitId);
    const isTopLevel = selectedDept && !selectedDept.parentId;
    
    if (!isTopLevel) {
      return false; // Skip perspective for child units
    }
    
    // Show perspective after department activity is selected (for top-level units only)
    return shouldShowExitComponentField() && selectedExitComponent.trim().length > 0;
  };

  const shouldShowObjectiveField = () => {
    // For child units: show objectives directly after department activity selection
    // For top-level units: show objectives after perspective selection
    const selectedDept = departments.find(dept => dept.id === form.orgUnitId);
    const isTopLevel = selectedDept && !selectedDept.parentId;
    
    if (isTopLevel) {
      // Top-level units need perspective selection first
      return shouldShowPerspective() && form.perspectiveId.trim().length > 0;
    } else {
      // Child units skip perspective, go directly from department activity to objectives
      return shouldShowExitComponentField() && selectedExitComponent.trim().length > 0;
    }
  };

  const shouldShowKPIName = () => {
    return selectedObjective !== null;
  };

  const shouldShowKPIDescription = () => {
    return shouldShowKPIName() && form.name.trim().length > 0;
  };

  const shouldShowKPICode = () => {
    return shouldShowKPIDescription() && form.description && form.description.trim().length > 0;
  };

  const shouldShowEvaluator = () => {
    return shouldShowKPICode() && form.code && form.code.trim().length > 0;
  };

  const shouldShowTargets = () => {
    return shouldShowEvaluator() && form.evaluatorId.trim().length > 0;
  };

  const shouldShowFrequency = () => {
    return shouldShowTargets() && form.targets && form.targets.length > 0;
  };

  const shouldShowSubmitButton = () => {
    const hasBasicInfo = shouldShowFrequency();
    const hasFrequencyInfo = form.isRecurring ? !!form.frequency : !!form.dueDate;
    return hasBasicInfo && hasFrequencyInfo;
  };

  // Handle form submission
  const handleSubmit = async () => {
    console.log('🚀 [KPI Submit] Starting handleSubmit...');
    console.log('🚀 [KPI Submit] Current form state:', form);
    console.log('🚀 [KPI Submit] Current selectedObjective:', selectedObjective);
    console.log('🚀 [KPI Submit] Current form.objectiveId:', form.objectiveId);
    
    if (isSubmitting) {
      console.log('🚀 [KPI Submit] Already submitting, returning early');
      return;
    }

    // Validate that objectiveId is provided
    if (!form.objectiveId) {
      console.error('❌ [Individual KPI Modal] objectiveId is required');
      console.error('❌ [Individual KPI Modal] form.objectiveId:', form.objectiveId);
      console.error('❌ [Individual KPI Modal] selectedObjective:', selectedObjective);
      alert('Please select an objective before creating the KPI');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔍 [Individual KPI Modal] Submitting KPI data...');
      console.log('🔍 [Individual KPI Modal] User individual org unit:', userIndividualOrgUnit);
      console.log('🔍 [Individual KPI Modal] Selected department for activity linking:', form.orgUnitId);
      
      // Use individual org unit if available, otherwise use selected department as fallback
      const targetOrgUnitId = userIndividualOrgUnit?.id || form.orgUnitId;
      
      // Check if selected department is top-level to determine if perspective should be sent
      const selectedDept = departments.find(dept => dept.id === form.orgUnitId);
      const isTopLevel = selectedDept && !selectedDept.parentId;
      
      const kpiData = {
        fiscalYearId: currentFiscalYear?.id || '',
        orgUnitId: null, // For individual KPIs, orgUnitId is null
        perspectiveId: form.perspectiveId,
        objectiveId: form.objectiveId,
        performanceComponentId: form.performanceComponentId,
        name: form.name,
        description: form.description,
        code: form.code,
        evaluatorId: form.evaluatorId,
        isRecurring: form.isRecurring,
        frequency: form.isRecurring ? form.frequency : null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        target: form.targets[0] ? {
          targetValue: form.targets[0].targetValue,
          currentValue: form.targets[0].currentValue || '0',
          targetType: form.targets[0].targetType || 'NUMERIC',
          targetLabel: form.targets[0].targetLabel || '',
          targetDirection: form.targets[0].targetDirection || 'INCREASING'
        } : null,
      };

      console.log('🔍 [Individual KPI Modal] Final KPI data being sent:', kpiData);
      
      const response = await apiClient.post('/kpis', kpiData);
      console.log('🔍 [Individual KPI Modal] KPI creation response:', response);
      
      if (response.success) {
        console.log('✅ [Individual KPI Modal] KPI created successfully');
        onKPICreated();
        onClose();
        resetForm();
      } else {
        console.error('❌ [Individual KPI Modal] KPI creation failed:', response.error);
      }
    } catch (error) {
      console.error('❌ [Individual KPI Modal] Error creating KPI:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    console.log('🔄 [Form Reset] Resetting form state...');
    console.log('🔄 [Form Reset] Current form before reset:', form);
    console.log('🔄 [Form Reset] Current selectedObjective before reset:', selectedObjective);
    
    setForm({
      fiscalYearId: currentFiscalYear?.id || '',
      orgUnitId: '',
      perspectiveId: '',
      objectiveId: '',
      performanceComponentId: '',
      name: '',
      description: '',
      code: '',
      evaluatorId: '',
      isRecurring: false,
      frequency: null,
      dueDate: null,
      targets: [{
        targetType: 'NUMERIC',
        currentValue: '0',
        targetValue: '',
        targetLabel: 'Target',
        targetDirection: 'INCREASING',
      }]
    });
    setSelectedObjective(null);
    setSelectedExitComponent('');
    setObjectiveSearch('');
    setExitComponentSearch('');
    setEvaluatorSearch('');
    setUserIndividualOrgUnit(null);
    
    console.log('✅ [Form Reset] Form reset completed');
  };

  // Objective selection and creation handlers
  const handleObjectiveSelect = (objective: Objective) => {
    const objectiveName = objective.name || (objective as any).title;
    console.log('🔍 [Individual KPI Modal] Objective selected:', objectiveName, 'objective:', objective);
    console.log('🔍 [Individual KPI Modal] Setting selectedObjective to:', objective);
    console.log('🔍 [Individual KPI Modal] Setting form.objectiveId to:', objective.id);
    
    setSelectedObjective(objective); // Set the full objective object
    setForm(prev => {
      const updatedForm = { ...prev, objectiveId: objective.id };
      console.log('🔍 [Individual KPI Modal] Form updated with objectiveId:', updatedForm.objectiveId);
      console.log('🔍 [Individual KPI Modal] Complete updated form:', updatedForm);
      return updatedForm;
    });
    setShowObjectiveDropdown(false);
    
    console.log('🔍 [Individual KPI Modal] handleObjectiveSelect completed');
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
      const objectiveName = selectedObjective?.name || selectedObjective?.title || '';
      const newCode = generateKPICode(name, objectiveName);
      return {
        ...prevForm,
        name: name,
        code: newCode
      };
    });
  };

  const handleCreateNewObjective = async () => {
    console.log('🚀 [Objective Creation] Starting handleCreateNewObjective...');
    console.log('🚀 [Objective Creation] newObjectiveTitle:', newObjectiveTitle);
    console.log('🚀 [Objective Creation] newObjectiveDescription:', newObjectiveDescription);
    
    if (!newObjectiveTitle.trim()) {
      console.log('❌ [Objective Creation] Empty title, returning early');
      return;
    }

    // For individual KPIs, use null as orgUnitId to indicate it's an individual objective
    console.log('🚀 [Objective Creation] Using null orgUnitId for individual objective');
    console.log('🚀 [Objective Creation] User:', user);
    
    if (!user?.id) {
      console.error('❌ [Objective Creation] No user ID available for individual objective creation');
      return;
    }

    const objectivePayload = {
      name: newObjectiveTitle.trim(),
      description: newObjectiveDescription.trim() || '',
      orgUnitId: null, // null indicates individual objective
      fiscalYearId: currentFiscalYear?.id
    };
    
    console.log('🚀 [Objective Creation] Payload being sent:', objectivePayload);
    console.log('🚀 [Objective Creation] Current fiscal year:', currentFiscalYear);

    try {
      console.log('🚀 [Objective Creation] Making API call to /objectives...');
      const response = await apiClient.post(`/objectives`, objectivePayload);
      console.log('🚀 [Objective Creation] API Response:', response);
      console.log('🚀 [Objective Creation] Response.success:', response.success);
      console.log('🚀 [Objective Creation] Response.data:', response.data);

      if (response.success && response.data) {
        const newObj = response.data as Objective;
        console.log('✅ [Objective Creation] New objective created:', newObj);
        
        console.log('🚀 [Objective Creation] Current objectives before update:', objectives);
        setObjectives(prev => {
          const updated = [...prev, newObj];
          console.log('🚀 [Objective Creation] Updated objectives array:', updated);
          return updated;
        });
        
        console.log('🚀 [Objective Creation] Current filtered objectives before update:', filteredObjectives);
        setFilteredObjectives(prev => {
          const updated = [...prev, newObj];
          console.log('🚀 [Objective Creation] Updated filtered objectives array:', updated);
          return updated;
        });
        
        console.log('🚀 [Objective Creation] Calling handleObjectiveSelect with new objective...');
        handleObjectiveSelect(newObj);
        
        console.log('🚀 [Objective Creation] Resetting form state...');
        setShowCreateObjectiveForm(false);
        setNewObjectiveTitle('');
        setNewObjectiveDescription('');
        
        console.log('✅ [Objective Creation] Objective creation completed successfully');
      } else {
        console.error('❌ [Objective Creation] API call failed or no data returned');
        console.error('❌ [Objective Creation] Response:', response);
      }
    } catch (error) {
      console.error('❌ [Objective Creation] Error creating objective:', error);
      if (error instanceof Error) {
        console.error('❌ [Objective Creation] Error details:', {
          message: error.message,
          stack: error.stack,
          response: (error as any).response
        });
      }
    }
  };

  // Exit component selection handlers
  const handleExitComponentSelect = (component: ExitComponent) => {
    setSelectedExitComponent(component.componentName);
    setForm(prev => ({ ...prev, performanceComponentId: component.id }));
    setShowExitComponentDropdown(false);
  };

  // Evaluator selection handlers
  const handleEvaluatorSelect = (evaluator: User) => {
    setForm(prev => ({ ...prev, evaluatorId: evaluator.id }));
    setEvaluatorSearch(evaluator.name);
    setShowEvaluatorDropdown(false);
  };

  // Target update handler
  const updateTarget = (updates: Partial<Target>) => {
    setForm(prev => ({
      ...prev,
      targets: prev.targets.map((target, index) => 
        index === 0 ? { ...target, ...updates } : target
      )
    }));
  };

  // Search filter handlers
  useEffect(() => {
    console.log('🔍 [Objective Search] Effect triggered');
    console.log('🔍 [Objective Search] objectiveSearch:', objectiveSearch);
    console.log('🔍 [Objective Search] objectives array:', objectives);
    
    if (objectiveSearch) {
      const filtered = objectives.filter(obj => 
        obj.name?.toLowerCase()?.includes(objectiveSearch.toLowerCase()) ||
        (obj as any).title?.toLowerCase()?.includes(objectiveSearch.toLowerCase())
      );
      console.log('🔍 [Objective Search] Filtered objectives:', filtered);
      setFilteredObjectives(filtered);
    } else {
      console.log('🔍 [Objective Search] No search term, using all objectives');
      setFilteredObjectives(objectives);
    }
  }, [objectiveSearch, objectives]);

  useEffect(() => {
    if (exitComponentSearch) {
      const filtered = exitComponents.filter(comp => 
        comp.componentName.toLowerCase().includes(exitComponentSearch.toLowerCase())
      );
      setFilteredExitComponents(filtered);
    } else {
      setFilteredExitComponents(exitComponents);
    }
  }, [exitComponentSearch, exitComponents]);

  // Debug: Track form.objectiveId changes
  useEffect(() => {
    console.log('🔍 [Form Debug] form.objectiveId changed to:', form.objectiveId);
    console.log('🔍 [Form Debug] Current selectedObjective:', selectedObjective);
  }, [form.objectiveId]);

  // Debug: Track selectedObjective changes
  useEffect(() => {
    console.log('🔍 [Form Debug] selectedObjective changed to:', selectedObjective);
    console.log('🔍 [Form Debug] Current form.objectiveId:', form.objectiveId);
  }, [selectedObjective]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create Individual {terminology.kpis}</h2>
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

        <div className="px-6 py-6 space-y-6">
          {/* Department Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Department <span className="text-red-500">*</span>
            </label>
            <select
              value={form.orgUnitId}
              onChange={(e) => setForm(prev => ({ ...prev, orgUnitId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Choose the department you work in...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the department whose activities you want to link this individual KPI to.
            </p>
          </div>

          {/* Department Activity */}
          {shouldShowExitComponentField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department Activity <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedExitComponent || exitComponentSearch}
                  onChange={(e) => {
                    setExitComponentSearch(e.target.value);
                    setSelectedExitComponent('');
                    setShowExitComponentDropdown(true);
                  }}
                  onFocus={() => setShowExitComponentDropdown(true)}
                  placeholder="Search department activities..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {showExitComponentDropdown && filteredExitComponents.length > 0 && (
                  <div ref={exitComponentDropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredExitComponents.map((component) => (
                      <div
                        key={component.id}
                        onClick={() => handleExitComponentSelect(component)}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{component.componentName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {component.componentType} • {component.organizationalLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select the department activity that this individual KPI contributes to.
              </p>
            </div>
          )}

          {/* Perspectives */}
          {shouldShowPerspective() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perspective <span className="text-red-500">*</span>
              </label>
              <select
                value={form.perspectiveId}
                onChange={(e) => setForm(prev => ({ ...prev, perspectiveId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select perspective...</option>
                {perspectives.map((perspective) => (
                  <option key={perspective.id} value={perspective.id}>
                    {perspective.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Objective Selection */}
          {shouldShowObjectiveField() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select or Create {terminology.objective || 'Objective'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedObjective?.name || selectedObjective?.title || objectiveSearch}
                  onChange={(e) => {
                    setObjectiveSearch(e.target.value);
                    setSelectedObjective(null);
                    setShowObjectiveDropdown(true);
                  }}
                  onFocus={() => setShowObjectiveDropdown(true)}
                  placeholder={`Search for ${terminology.objectives?.toLowerCase() || 'objectives'} or type to create new...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {showObjectiveDropdown && (
                  <div ref={objectiveDropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredObjectives.length > 0 ? (
                      filteredObjectives.map((objective) => (
                        <div
                          key={objective.id}
                          onClick={() => handleObjectiveSelect(objective)}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{objective.name || (objective as any).title}</div>
                          {objective.description && (
                            <div className="text-sm text-gray-500 mt-1">{objective.description}</div>
                          )}
                        </div>
                      ))
                    ) : objectiveSearch.trim() ? (
                      <div className="px-3 py-4 text-center">
                        <div className="text-sm text-gray-500 mb-2">No {terminology.objectives?.toLowerCase() || 'objectives'} found</div>
                        <button
                          onClick={() => {
                            setNewObjectiveTitle(objectiveSearch);
                            setShowCreateObjectiveForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Create "{objectiveSearch}" as new {terminology.objective?.toLowerCase() || 'objective'}
                        </button>
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        Start typing to search or create {terminology.objectives?.toLowerCase() || 'objectives'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Create New Objective Form */}
              {showCreateObjectiveForm && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Create New {terminology.objective || 'Objective'}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {terminology.objective || 'Objective'} Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newObjectiveTitle}
                        onChange={(e) => setNewObjectiveTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Enter ${terminology.objective?.toLowerCase() || 'objective'} title...`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        value={newObjectiveDescription}
                        onChange={(e) => setNewObjectiveDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Describe this ${terminology.objective?.toLowerCase() || 'objective'}...`}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setShowCreateObjectiveForm(false);
                          setNewObjectiveTitle('');
                          setNewObjectiveDescription('');
                        }}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateNewObjective}
                        disabled={!newObjectiveTitle.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Create {terminology.objective || 'Objective'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* KPI Name */}
          {shouldShowKPIName() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {terminology.kpis} Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleKPINameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${terminology.kpis?.toLowerCase() || 'kpi'} name...`}
                required
              />
            </div>
          )}

          {/* KPI Description */}
          {shouldShowKPIDescription() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {terminology.kpis || 'KPI'} Description
              </label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Describe this ${terminology.kpis?.toLowerCase() || 'kpi'}...`}
              />
            </div>
          )}

          {/* KPI Code */}
          {shouldShowKPICode() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {terminology.kpi || terminology.kpis || 'KPI'} Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter unique ${terminology.kpis?.toLowerCase() || 'kpi'} code...`}
                required
              />
            </div>
          )}

          {/* Evaluator Selection */}
          {shouldShowEvaluator() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluator <span className="text-red-500">*</span>
              </label>
              <div className="relative evaluator-autocomplete">
                <input
                  type="text"
                  value={evaluatorSearch}
                  onChange={(e) => {
                    setEvaluatorSearch(e.target.value);
                    setForm(prev => ({ ...prev, evaluatorId: '' }));
                    setShowEvaluatorDropdown(true);
                  }}
                  onFocus={() => setShowEvaluatorDropdown(true)}
                  placeholder="Search for evaluator..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {showEvaluatorDropdown && (
                  <div ref={evaluatorDropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {evaluators
                      .filter(evaluator => 
                        evaluator.name.toLowerCase().includes(evaluatorSearch.toLowerCase()) ||
                        evaluator.email.toLowerCase().includes(evaluatorSearch.toLowerCase())
                      )
                      .map((evaluator) => (
                        <div
                          key={evaluator.id}
                          onClick={() => handleEvaluatorSelect(evaluator)}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{evaluator.name}</div>
                          <div className="text-sm text-gray-500">{evaluator.email}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target Configuration */}
          {shouldShowTargets() && (
            <div className="mb-8">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">{terminology.targets || 'Target'} *</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Define a single measurable target for this KPI.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Value
                    </label>
                    {form.targets[0].targetType === 'NUMERIC' || form.targets[0].targetType === 'PERCENTAGE' ? (
                      <input
                        type="number"
                        value={form.targets[0].currentValue}
                        onChange={(e) => updateTarget({ currentValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter current value..."
                      />
                    ) : (
                      <select
                        value={form.targets[0].currentValue}
                        onChange={(e) => updateTarget({ currentValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select status...</option>
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    )}
                  </div>

                  {/* Target Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Value
                    </label>
                    {form.targets[0].targetType === 'NUMERIC' || form.targets[0].targetType === 'PERCENTAGE' ? (
                      <input
                        type="number"
                        value={form.targets[0].targetValue}
                        onChange={(e) => updateTarget({ targetValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter target value..."
                      />
                    ) : (
                      <select
                        value={form.targets[0].targetValue}
                        onChange={(e) => updateTarget({ targetValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select target status...</option>
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    )}
                  </div>

                  {/* Target Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Type
                    </label>
                    <select
                      value={form.targets[0].targetType}
                      onChange={(e) => updateTarget({ 
                        targetType: e.target.value as any,
                        // Reset values when type changes
                        currentValue: e.target.value === 'NUMERIC' ? '0' : e.target.value === 'STATUS' ? 'Not Started' : '0',
                        targetValue: e.target.value === 'NUMERIC' ? '0' : e.target.value === 'STATUS' ? 'Completed' : '100',
                        targetLabel: e.target.value === 'STATUS' ? 'N/A' : '',
                        targetDirection: e.target.value === 'STATUS' ? 'N/A' : 'INCREASING'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="NUMERIC">Numeric</option>
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="STATUS">Status</option>
                    </select>
                  </div>

                  {/* Target Label (Unit) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Label (Unit)
                    </label>
                    <input
                      type="text"
                      value={form.targets[0].targetLabel}
                      onChange={(e) => updateTarget({ targetLabel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={form.targets[0].targetType === 'STATUS' ? 'N/A' : 'e.g., Naira, Persons, Dollars, Percent'}
                      disabled={form.targets[0].targetType === 'STATUS'}
                    />
                    {form.targets[0].targetType !== 'STATUS' && (
                      <p className="text-xs text-gray-500 mt-1">Unit of measurement (e.g., Naira, Persons, Dollars, Percent)</p>
                    )}
                  </div>

                  {/* Target Direction */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Direction
                    </label>
                    <select
                      value={form.targets[0].targetDirection}
                      onChange={(e) => updateTarget({ targetDirection: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={form.targets[0].targetType === 'STATUS'}
                    >
                      <option value="INCREASING">Increasing (Higher is better)</option>
                      <option value="DECREASING">Decreasing (Lower is better)</option>
                      <option value="N/A">N/A (Direction doesn't apply)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {form.targets[0].targetDirection === 'INCREASING' && 'Higher actual values are better'}
                      {form.targets[0].targetDirection === 'DECREASING' && 'Lower actual values are better'}
                      {form.targets[0].targetDirection === 'N/A' && 'Direction does not apply to this target'}
                    </p>
                  </div>
                </div>

                {/* Example Help Text */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Examples:</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <div><strong>Numeric:</strong> Current: 1000, Target: 5000, Label: "Naira", Direction: Increasing</div>
                    <div><strong>Status:</strong> Current: "Not Started", Target: "Completed", Label: "N/A", Direction: N/A</div>
                    <div><strong>Percentage:</strong> Current: 75, Target: 90, Label: "Percent", Direction: Increasing</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Frequency and Due Date */}
          {shouldShowFrequency() && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Schedule Configuration</h3>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) => setForm(prev => ({ 
                      ...prev, 
                      isRecurring: e.target.checked,
                      frequency: e.target.checked ? 'MONTHLY' : null,
                      dueDate: e.target.checked ? null : ''
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">This is a recurring {terminology.kpis?.toLowerCase() || 'kpi'}</span>
                </label>
              </div>

              {form.isRecurring ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.frequency || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select frequency...</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dueDate || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {shouldShowSubmitButton() && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{isSubmitting ? 'Creating...' : `Create ${terminology.kpi || terminology.kpis || 'KPI'}`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
