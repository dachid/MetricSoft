'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

interface KPITarget {
  currentValue: string | number;
  targetValue: string | number;
  targetType: 'NUMERIC' | 'STATUS' | 'PERCENTAGE';
  targetLabel: string; // Unit like "Naira", "Persons", "Dollars", "Percent", or "N/A"
  targetDirection: 'INCREASING' | 'DECREASING' | 'N/A';
}

interface CreateKPIRequest {
  name: string;
  description?: string;
  code?: string;
  evaluatorId?: string;
  perspective: string;
  fiscalYearId: string;
  exitComponentId?: string;
  isRecurring: boolean;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUALLY';
  dueDate?: string;
  targets: KPITarget[];
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
  
  // Track objective descriptions for inline-created objectives
  const [objectiveDescriptions, setObjectiveDescriptions] = useState<Record<string, string>>({});
  
  // Inline objective creation states
  const [showCreateObjectiveForm, setShowCreateObjectiveForm] = useState(false);
  const [creatingObjective, setCreatingObjective] = useState(false);
  const [newObjectiveForm, setNewObjectiveForm] = useState({
    title: '',
    description: ''
  });

  // Evaluator auto-complete states
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [evaluatorSearchTerm, setEvaluatorSearchTerm] = useState('');
  const [showEvaluatorDropdown, setShowEvaluatorDropdown] = useState(false);
  const [selectedEvaluator, setSelectedEvaluator] = useState<any>(null);
  
  const [form, setForm] = useState<CreateKPIRequest>({
    name: '',
    description: '',
    code: '',
    evaluatorId: '',
    perspective: '',
    fiscalYearId: currentFiscalYear?.id || '',
    exitComponentId: '',
    isRecurring: false,
    frequency: undefined,
    dueDate: '',
    targets: [{
      targetType: 'NUMERIC',
      targetDirection: 'INCREASING',
      currentValue: '',
      targetValue: '',
      targetLabel: ''
    }]
  });

  const fetchUsers = async () => {
    console.log('🔍 [DEBUG] fetchUsers called with user:', user);
    
    if (!user?.tenantId) {
      console.error('🔍 [DEBUG] No tenant ID available, user:', user);
      return;
    }

    console.log('🔍 [DEBUG] Fetching users for tenant:', user.tenantId);

    try {
      const response = await apiClient.get(`/tenants/${user.tenantId}/users/evaluators`);
      
      console.log('🔍 [DEBUG] Users API response:', response);
      
      if (response.data) {
        const data = response.data as any;
        console.log('🔍 [DEBUG] Response data:', data);
        
        // The response structure is { users: Array } not { success: true, data: { users: Array } }
        if (data.users && Array.isArray(data.users)) {
          console.log('🔍 [DEBUG] Users found:', data.users);
          setAvailableUsers(data.users);
          setFilteredUsers(data.users);
        } else {
          console.log('🔍 [DEBUG] No users in response, data structure:', {
            hasUsers: !!data.users,
            isArray: Array.isArray(data.users),
            dataKeys: Object.keys(data),
            data: data
          });
        }
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Error fetching users:', error);
    }
  };

  useEffect(() => {
    console.log('🔍 [DEBUG] Modal opened, isOpen:', isOpen, 'currentFiscalYear:', currentFiscalYear, 'user:', user);
    if (isOpen) {
      fetchPerspectives();
      fetchPreviousLevelExitComponents();
      fetchObjectivesFromOrgUnit();
      fetchUsers();
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

  // Handle evaluator auto-complete filtering
  useEffect(() => {
    if (evaluatorSearchTerm.trim() === '') {
      setFilteredUsers(availableUsers);
    } else {
      const filtered = availableUsers.filter(user =>
        user.name.toLowerCase().includes(evaluatorSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(evaluatorSearchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [evaluatorSearchTerm, availableUsers]);

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
        setShowCreateObjectiveForm(false);
      }
    };

    if (showObjectiveDropdown || showCreateObjectiveForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showObjectiveDropdown, showCreateObjectiveForm]);

  // Close evaluator dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.evaluator-autocomplete')) {
        setShowEvaluatorDropdown(false);
      }
    };

    if (showEvaluatorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEvaluatorDropdown]);

  // Check if current org unit should show entry component field (for non-top levels)
  const shouldShowEntryComponentAutoComplete = () => {
    if (!currentOrgUnit) return false;
    
    const levelName = currentOrgUnit.levelDefinition?.name;
    const parentId = currentOrgUnit.parentId;
    
    // Show entry component field for levels that have a parent (receive initiatives from above)
    return levelName !== 'Organization' && parentId !== null;
  };

  // Progressive field visibility helpers
  const shouldShowKPIName = () => {
    // Show KPI name after objective is selected
    return selectedObjective && selectedObjective.trim().length > 0;
  };

  const shouldShowKPIDescription = () => {
    // Show description after KPI name is entered
    return shouldShowKPIName() && form.name.trim().length > 0;
  };

  const shouldShowKPICode = () => {
    // Show code after description is entered
    return shouldShowKPIDescription() && form.description && form.description.trim().length > 0;
  };

  const shouldShowEvaluator = () => {
    // Show evaluator after KPI code is entered
    const result = shouldShowKPICode() && form.code && form.code.trim().length > 0;
    console.log('🔍 [DEBUG] shouldShowEvaluator:', {
      shouldShowKPICode: shouldShowKPICode(),
      formCode: form.code,
      result: result,
      availableUsersCount: availableUsers.length,
      filteredUsersCount: filteredUsers.length
    });
    return result;
  };

  const shouldShowRemainingFields = () => {
    // Show remaining fields after all progressive fields are completed, including evaluator
    return shouldShowEvaluator() && form.evaluatorId && form.evaluatorId.trim().length > 0;
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
          code: newCode
        };
      });
    } else {
      setSelectedObjective('');
      setForm(prevForm => ({
        ...prevForm,
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
    console.log('🔍 [Initiative Modal] Starting fetchPreviousLevelExitComponents...');
    console.log('🔍 [Initiative Modal] Current fiscal year:', currentFiscalYear?.id);
    console.log('🔍 [Initiative Modal] User tenant:', user?.tenantId);
    console.log('🔍 [Initiative Modal] Current org unit:', currentOrgUnit);
    console.log('🔍 [Initiative Modal] Current org unit parent ID:', currentOrgUnit?.parentId);
    
    try {
      if (!currentFiscalYear?.id || !user?.tenantId || !currentOrgUnit?.parentId) {
        console.log('🔍 [Initiative Modal] Missing required data, setting empty components');
        setPreviousLevelExitComponents([]);
        return;
      }
      
      // First, get the parent org unit to find its level ID
      console.log('🔍 [Initiative Modal] Fetching parent org unit to get level ID...');
      const parentOrgResponse = await apiClient.get(`/tenants/${user.tenantId}/org-units/${currentOrgUnit.parentId}`);
      console.log('🔍 [Initiative Modal] Parent org unit response:', parentOrgResponse);
      
      const parentOrgData = parentOrgResponse.data as any;
      if (!parentOrgData?.levelDefinitionId) {
        console.log('🔍 [Initiative Modal] No parent level definition ID found');
        setPreviousLevelExitComponents([]);
        return;
      }
      
      const parentLevelId = parentOrgData.levelDefinitionId;
      console.log('🔍 [Initiative Modal] Parent level ID:', parentLevelId);
      
      const url = `/tenants/${user.tenantId}/fiscal-years/${currentFiscalYear.id}/performance-components?levelId=${parentLevelId}&componentType=EXIT`;
      console.log('🔍 [Initiative Modal] Fetching from URL:', url);
      
      const response = await apiClient.get(url);
      console.log('🔍 [Initiative Modal] API Response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('🔍 [Initiative Modal] Found exit components:', response.data);
        setPreviousLevelExitComponents(response.data);
        setFilteredExitComponents(response.data);
      } else {
        console.log('🔍 [Initiative Modal] No valid response data, setting empty');
        setPreviousLevelExitComponents([]);
        setFilteredExitComponents([]);
      }
    } catch (error) {
      console.error('🔍 [Initiative Modal] Error fetching previous level exit components:', error);
      setPreviousLevelExitComponents([]);
      setFilteredExitComponents([]);
    }
  };

  // Fetch existing objectives from the kpi_objectives table for this organizational unit
  const fetchObjectivesFromOrgUnit = async () => {
    try {
      console.log('🔍 [KPI Modal] Fetching objectives...');
      console.log('🔍 [KPI Modal] User tenant:', user?.tenantId);
      console.log('🔍 [KPI Modal] Current org unit:', currentOrgUnit?.id, currentOrgUnit?.name);
      console.log('🔍 [KPI Modal] Current fiscal year:', currentFiscalYear?.id, currentFiscalYear?.name);
      
      if (!user?.tenantId || !currentOrgUnit?.id || !currentFiscalYear?.id) {
        console.log('❌ [KPI Modal] Missing required data for objective fetch');
        setAvailableObjectives([]);
        return;
      }
      
      // Fetch objectives for this organizational unit and fiscal year
      const url = `/objectives?orgUnitId=${currentOrgUnit.id}&fiscalYearId=${currentFiscalYear.id}`;
      console.log('🔍 [KPI Modal] Fetching from URL:', url);
      
      const response = await apiClient.get(url);
      console.log('🔍 [KPI Modal] API Response:', response);
      console.log('🔍 [KPI Modal] Response success:', response.success);
      console.log('🔍 [KPI Modal] Response data:', response.data);
      console.log('🔍 [KPI Modal] Response data type:', typeof response.data);
      console.log('🔍 [KPI Modal] Is response.data an array?', Array.isArray(response.data));
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('🔍 [KPI Modal] Raw objectives data:', response.data);
        
        // Extract objective names
        const objectiveNames = response.data
          .map((objective: any) => objective.name)
          .filter((name: string) => name && name.trim())
          .sort();
        
        console.log('🔍 [KPI Modal] Processed objective names:', objectiveNames);
        
        setAvailableObjectives(objectiveNames);
        setFilteredObjectives(objectiveNames);
      } else {
        console.log('❌ [KPI Modal] Invalid response format or no data');
        setAvailableObjectives([]);
        setFilteredObjectives([]);
      }
    } catch (error) {
      console.error('❌ [KPI Modal] Error fetching objectives from organizational unit:', error);
      setAvailableObjectives([]);
      setFilteredObjectives([]);
    }
  };

  // Inline objective creation functions
  const handleCreateNewObjective = () => {
    setNewObjectiveForm({
      title: objectiveSearchTerm.trim(),
      description: ''
    });
    setShowCreateObjectiveForm(true);
    setShowObjectiveDropdown(false);
  };

  const handleSaveNewObjective = async () => {
    if (!newObjectiveForm.title.trim()) return;
    
    setCreatingObjective(true);
    
    try {
      // Create the objective in the organization
      const response = await apiClient.post(`/tenants/${user?.tenantId}/objectives`, {
        name: newObjectiveForm.title.trim(),
        description: newObjectiveForm.description.trim(),
        orgUnitId: currentOrgUnit?.id,
        fiscalYearId: currentFiscalYear?.id
      });

      // Handle the API response - check for objective data in the expected structure
      let newObjectiveData = null;
      
      // Check if response.data has success and data properties (tenant endpoint structure)
      if ((response.data as any).success && (response.data as any).data) {
        newObjectiveData = (response.data as any).data;
      }
      // Check if response.data has objective directly (fallback structure)
      else if ((response.data as any).objective) {
        newObjectiveData = (response.data as any).objective;
      }
      // Check if response.data is the objective directly (direct structure)
      else if ((response.data as any).id && (response.data as any).name) {
        newObjectiveData = response.data as any;
      }
      
      if (newObjectiveData && newObjectiveData.name) {
        // Add the new objective to available objectives
        setAvailableObjectives(prev => [...prev, newObjectiveData.name]);
        setFilteredObjectives(prev => [...prev, newObjectiveData.name]);
        
        // Store the description for this objective
        setObjectiveDescriptions(prev => ({
          ...prev,
          [newObjectiveData.name]: newObjectiveForm.description.trim()
        }));
        
        // Select the new objective
        handleObjectiveSelect(newObjectiveData.name);
        
        // Reset create form
        setShowCreateObjectiveForm(false);
        setNewObjectiveForm({ title: '', description: '' });
      } else {
        console.error('Failed to extract objective data from response:', response.data);
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Error creating objective:', error);
      // You might want to show an error message to the user here
    } finally {
      setCreatingObjective(false);
    }
  };

  const handleCancelCreateObjective = () => {
    setShowCreateObjectiveForm(false);
    setNewObjectiveForm({ title: '', description: '' });
    setShowObjectiveDropdown(true);
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      code: '',
      perspective: '',
      fiscalYearId: currentFiscalYear?.id || '',
      exitComponentId: '',
      evaluatorId: '',
      isRecurring: false,
      frequency: undefined,
      dueDate: '',
      targets: [{
        targetType: 'NUMERIC',
        targetDirection: 'INCREASING',
        currentValue: '',
        targetValue: '',
        targetLabel: ''
      }]
    });
    
    // Reset objective-related states
    setSelectedObjective('');
    setObjectiveSearchTerm('');
    setShowObjectiveDropdown(false);
    setFilteredObjectives(availableObjectives);
    
    // Reset inline objective creation states
    setShowCreateObjectiveForm(false);
    setNewObjectiveForm({ title: '', description: '' });
    setCreatingObjective(false);
    
    // Reset evaluator-related states
    setSelectedEvaluator(null);
    setEvaluatorSearchTerm('');
    setShowEvaluatorDropdown(false);
    setFilteredUsers(availableUsers);
    
    setError(null);
  };

  const handleEvaluatorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEvaluatorSearchTerm(value);
    setShowEvaluatorDropdown(true);
    
    // If user clears the input, clear the selected evaluator
    if (value === '' && selectedEvaluator) {
      setSelectedEvaluator(null);
      setForm({ ...form, evaluatorId: '' });
    }
  };

  const handleEvaluatorSelect = (user: any) => {
    setSelectedEvaluator(user);
    setForm({ ...form, evaluatorId: user.id });
    setEvaluatorSearchTerm(user.name);
    setShowEvaluatorDropdown(false);
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

    // Only require perspective for top-level org units (no parent)
    if (!currentOrgUnit?.parentId && !form.perspective) {
      setError('Perspective is required');
      return;
    }

    // Validate component selection based on organizational level
    if (shouldShowEntryComponentAutoComplete() && !form.exitComponentId) {
      setError(`${terminology.entryComponent || 'Entry component'} is required`);
      return;
    }

    // Validate objective - always required
    if (!selectedObjective || !selectedObjective.trim()) {
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

    // Validate evaluator
    if (!form.evaluatorId?.trim()) {
      setError('Evaluator assignment is required');
      return;
    }

    // Validate target
    const target = form.targets[0];
    if (!target.targetValue || (!target.currentValue && target.currentValue !== 0)) {
      setError('Target current value and target value are required');
      return;
    }

    if (!target.targetLabel && target.targetType !== 'STATUS') {
      setError('Target label is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, create the objective if we have a selectedObjective
      let createdObjectiveId = null;
      if (selectedObjective && selectedObjective.trim()) {
        console.log('🔍 [KPI Modal] Creating objective first:', selectedObjective);
        
        const objectiveResponse = await apiClient.post(`/tenants/${user?.tenantId}/objectives`, {
          fiscalYearId: form.fiscalYearId,
          orgUnitId: currentOrgUnit?.id,
          name: selectedObjective.trim(),  // Backend expects 'name', not 'title'
          description: objectiveDescriptions[selectedObjective] || ''
        });
        
        if (objectiveResponse.success && objectiveResponse.data) {
          createdObjectiveId = (objectiveResponse.data as any).id;
          console.log('✅ [KPI Modal] Objective created with ID:', createdObjectiveId);
        } else {
          throw new Error('Failed to create objective');
        }
      }

      if (!createdObjectiveId) {
        setError('An objective is required. Please create or select an objective first.');
        setLoading(false);
        return;
      }

      // Prepare the KPI data for the backend API
      const kpiData = {
        fiscalYearId: form.fiscalYearId,
        // Always use the current org unit ID where the KPI is being created
        orgUnitId: currentOrgUnit?.id || '', 
        // Only send perspective for top-level units, let backend auto-resolve for child units
        ...((!currentOrgUnit?.parentId) && { perspectiveId: form.perspective }),
        objectiveId: createdObjectiveId, // Use the created objective ID
        performanceComponentId: form.exitComponentId || null, // Link to performance component (initiative)
        name: form.name,
        description: form.description,
        code: form.code,
        evaluatorId: form.evaluatorId,
        isRecurring: form.isRecurring,
        frequency: form.isRecurring ? form.frequency : null,
        dueDate: !form.isRecurring ? form.dueDate : null,
        target: {
          ...form.targets[0],
          // Ensure values are strings as expected by the backend
          currentValue: String(form.targets[0].currentValue),
          targetValue: String(form.targets[0].targetValue)
        }
      };

      console.log('🔍 [KPI Creation] Sending KPI data:', kpiData);
      console.log('🔍 [KPI Creation] Current org unit:', currentOrgUnit);
      console.log('🔍 [KPI Creation] Selected exit component ID:', form.exitComponentId);

      const response = await apiClient.post('/kpis', kpiData);
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

  const updateTarget = (updates: Partial<KPITarget>) => {
    const updatedTarget = { ...form.targets[0], ...updates };
    setForm({ ...form, targets: [updatedTarget] });
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

              {/* Perspective - Second field (only for top-level org units) */}
              {(!currentOrgUnit?.parentId) && (
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
              )}

              {/* Entry Component Auto-complete - For departments/units with parents (link to initiatives from parent level) */}
              {shouldShowEntryComponentAutoComplete() && (
                <div className="md:col-span-2 relative exit-component-autocomplete">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {terminology.entryComponent || 'Entry Component'} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={exitComponentSearchTerm}
                      onChange={(e) => handleExitComponentInputChange(e.target.value)}
                      onFocus={() => setShowExitComponentDropdown(true)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Search ${terminology.entryComponent?.toLowerCase() || 'entry component'}...`}
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
                      No {terminology.entryComponent?.toLowerCase() || 'entry components'} available from the parent level.
                    </p>
                  )}
                  
                  {!currentFiscalYear && (
                    <p className="text-sm text-gray-500 mt-1">
                      Set up a fiscal year first to view available {terminology.entryComponent?.toLowerCase() || 'entry components'}.
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
                  
                  {/* Enhanced Dropdown with Create New Option */}
                  {showObjectiveDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {/* Existing objectives */}
                      {filteredObjectives.map((objective, index) => (
                        <div
                          key={index}
                          onClick={() => handleObjectiveSelect(objective)}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100"
                        >
                          <div className="font-medium text-gray-900">{objective}</div>
                        </div>
                      ))}
                      
                      {/* Create New Option */}
                      {objectiveSearchTerm.trim() && 
                       !filteredObjectives.some(obj => obj.toLowerCase() === objectiveSearchTerm.toLowerCase()) && (
                        <div
                          onClick={handleCreateNewObjective}
                          className="px-3 py-2 cursor-pointer hover:bg-green-50 border-b border-gray-100 bg-green-25"
                        >
                          <div className="font-medium text-green-700 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Create new: "{objectiveSearchTerm.trim()}"
                          </div>
                          <div className="text-sm text-green-600">
                            Add this {terminology.objective?.toLowerCase() || 'objective'} to your organization
                          </div>
                        </div>
                      )}
                      
                      {/* No results message */}
                      {filteredObjectives.length === 0 && !objectiveSearchTerm.trim() && (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No {terminology.objective?.toLowerCase() || 'objectives'} available
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Create Objective Form */}
                  {showCreateObjectiveForm && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Create New {terminology.objective || 'Objective'}
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={newObjectiveForm.title}
                            onChange={(e) => setNewObjectiveForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Enter ${terminology.objective?.toLowerCase() || 'objective'} title...`}
                            autoFocus
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={newObjectiveForm.description}
                            onChange={(e) => setNewObjectiveForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder={`Enter ${terminology.objective?.toLowerCase() || 'objective'} description...`}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelCreateObjective}
                            className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={creatingObjective}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewObjective}
                            className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            disabled={!newObjectiveForm.title.trim() || creatingObjective}
                          >
                            {creatingObjective ? 'Creating...' : 'Create & Use'}
                          </button>
                        </div>
                      </div>
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

              {/* 8th Field: Assign Evaluator - Progressive */}
              {shouldShowEvaluator() && (
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Evaluator *
                </label>
                <div className="relative evaluator-autocomplete">
                  <input
                    type="text"
                    value={evaluatorSearchTerm}
                    onChange={handleEvaluatorInputChange}
                    onFocus={() => setShowEvaluatorDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search for an evaluator..."
                    required
                    disabled={!currentFiscalYear}
                  />
                  
                  {showEvaluatorDropdown && filteredUsers.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleEvaluatorSelect(user)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        >
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select who will evaluate this KPI.
                </p>
              </div>
              )}
            </div>
          </div>

          {/* Remaining fields show only after all progressive fields are completed */}
          {shouldShowRemainingFields() && (
          <>
          {/* Single Target */}
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
                      onChange={(e) => updateTarget({ currentValue: Number(e.target.value) || 0 })}
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
                      onChange={(e) => updateTarget({ targetValue: Number(e.target.value) || 0 })}
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
                      currentValue: e.target.value === 'NUMERIC' ? 0 : e.target.value === 'STATUS' ? 'Not Started' : 0,
                      targetValue: e.target.value === 'NUMERIC' ? 0 : e.target.value === 'STATUS' ? 'Completed' : 100,
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

          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              {/* Recurring Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ 
                    ...form, 
                    isRecurring: e.target.checked,
                    frequency: e.target.checked ? 'MONTHLY' : undefined,
                    dueDate: e.target.checked ? '' : form.dueDate // Clear due date if recurring
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={!currentFiscalYear}
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                  Recurring
                </label>
              </div>

              {/* Frequency Dropdown - Only show if recurring */}
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
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="BIANNUAL">Biannual</option>
                    <option value="ANNUALLY">Annual</option>
                  </select>
                </div>
              )}

              {/* Due Date - Only show if NOT recurring */}
              {!form.isRecurring && (
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
              )}
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
              disabled={
                loading || 
                !form.targets[0]?.targetValue || 
                !currentFiscalYear || 
                (!currentOrgUnit?.parentId && !form.perspective) || // Only require perspective for top-level units
                (shouldShowEntryComponentAutoComplete() && !form.exitComponentId) || 
                !selectedObjective || 
                !form.name.trim() || 
                !form.description?.trim() || 
                !form.code?.trim()
              }
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
