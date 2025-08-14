'use client';

import { useState, useEffect } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { apiClient } from '@/lib/apiClient';
import { defaultComponentClasses } from '@/hooks/useTextStyles';
import SaveConfirmationDialog from '@/components/ui/SaveConfirmationDialog';

interface LevelDefinition {
  id: string;
  code: string;
  name: string;
  pluralName: string;
  hierarchyLevel: number;
  isStandard: boolean;
  isEnabled: boolean;
  icon?: string;
  color: string;
  metadata: Record<string, any>;
}

interface HierarchyConfigurationProps {
  tenantId: string;
  fiscalYearId: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const EMOJI_SUGGESTIONS = [
  '📋', '🏗️', '🏢', '🏬', '🏛️', '👥', '👤', '🌐', '🔧', '⚙️',
  '📊', '📈', '🎯', '🔍', '💼', '🌟', '⭐', '🚀', '💡', '🎪'
];

const STANDARD_LEVELS = [
  { code: 'ORGANIZATION', name: 'Organization', pluralName: 'Organizations', icon: '🏢', isRequired: true },
  { code: 'DEPARTMENT', name: 'Department', pluralName: 'Departments', icon: '🏛️' },
  { code: 'TEAM', name: 'Team', pluralName: 'Teams', icon: '👥' },
  { code: 'INDIVIDUAL', name: 'Individual', pluralName: 'Individuals', icon: '👤' }
];

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

export function HierarchyConfiguration({ tenantId, fiscalYearId, onSuccess, onError }: HierarchyConfigurationProps) {
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [customLevelData, setCustomLevelData] = useState({
    name: '',
    pluralName: '',
    icon: '📋',
    color: DEFAULT_COLORS[0]
  });

  // Load existing level definitions
  useEffect(() => {
    if (tenantId && fiscalYearId) {
      const token = localStorage.getItem('metricsoft_auth_token');
      if (token) {
        apiClient.setAuthToken(token);
      }
      loadLevelDefinitions();
    } else {
      setLoading(false);
    }
  }, [tenantId, fiscalYearId]);

  const loadLevelDefinitions = async () => {
    try {
      // Check if org structure is confirmed for this fiscal year
      const confirmationResponse = await apiClient.get<{ confirmations: any[] }>(`/tenants/${tenantId}/fiscal-years/${fiscalYearId}/confirmations`);
      
      const orgConfirmation = confirmationResponse.success && confirmationResponse.data?.confirmations?.find(
        (c: any) => c.confirmationType === 'org_structure'
      );
      
      setIsConfirmed(!!orgConfirmation);

      const response = await apiClient.get<{ levelDefinitions: LevelDefinition[] }>(`/tenants/${tenantId}/fiscal-years/${fiscalYearId}/level-definitions`);

      if (response.success && response.data && response.data.levelDefinitions && Array.isArray(response.data.levelDefinitions) && response.data.levelDefinitions.length > 0) {
        const sortedLevels = response.data.levelDefinitions.sort((a: LevelDefinition, b: LevelDefinition) => a.hierarchyLevel - b.hierarchyLevel);
        setLevels(sortedLevels);
      } else {
        // No levels exist, initialize defaults only if not confirmed
        if (!orgConfirmation) {
          await initializeDefaultLevels();
        }
      }
    } catch (error) {
      console.error('Error loading level definitions:', error);
      // Fallback to default levels on any error, only if not confirmed
      if (!isConfirmed) {
        await initializeDefaultLevels();
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultLevels = async () => {
    const defaultLevels: LevelDefinition[] = STANDARD_LEVELS.map((level, index) => ({
      id: level.code.toLowerCase(),
      code: level.code,
      name: level.name,
      pluralName: level.pluralName,
      hierarchyLevel: index,
      isStandard: true,
      isEnabled: level.isRequired || false,
      icon: level.icon,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      metadata: {}
    }));

    setLevels(defaultLevels);
  };

  const handleToggleLevel = async (levelId: string, enabled: boolean) => {
    if (isConfirmed) {
      onError?.('Organizational structure is confirmed and cannot be modified for this fiscal year. Select a different fiscal year to make changes.');
      return;
    }

    const level = levels.find(l => l.id === levelId || l.code === levelId);
    if (!level) return;

    // Prevent disabling Organization level
    if (level.code === 'ORGANIZATION' && !enabled) {
      onError?.('Organization level is required and cannot be disabled');
      return;
    }

    // Show confirmation when disabling a level
    if (!enabled) {
      const confirmMessage = `Are you sure you want to disable the "${level.name}" level? This will affect your organizational hierarchy and any existing data at this level.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    // Update local state
    const updatedLevels = levels.map(l =>
      (l.id === levelId || l.code === levelId) ? { ...l, isEnabled: enabled } : l
    );
    setLevels(updatedLevels);
    setHasUnsavedChanges(true);

    const message = enabled 
      ? (level.isStandard 
         ? `${level.name} level enabled - changes pending save`
         : `"${level.name}" custom level added to Active Organizational Levels - changes pending save`)
      : (level.isStandard
         ? `${level.name} level disabled - changes pending save`
         : `"${level.name}" moved back to Custom Levels section - changes pending save`);
    onSuccess?.(message);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (isConfirmed) {
      onError?.('Organizational structure is confirmed and cannot be modified for this fiscal year. Select a different fiscal year to make changes.');
      return;
    }

    if (!result.destination) return;

    // Only work with enabled levels for drag-and-drop
    const enabledLevelsArray = levels.filter(l => l.isEnabled);
    const disabledLevels = levels.filter(l => !l.isEnabled);

    const items = Array.from(enabledLevelsArray);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update hierarchy levels for enabled items only
    const updatedEnabledItems = items.map((item, index) => ({
      ...item,
      hierarchyLevel: index
    }));

    // Ensure Organization stays at top
    const orgIndex = updatedEnabledItems.findIndex(l => l.code === 'ORGANIZATION');
    if (orgIndex > 0) {
      const orgLevel = updatedEnabledItems.splice(orgIndex, 1)[0];
      updatedEnabledItems.unshift({ ...orgLevel, hierarchyLevel: 0 });
      // Update hierarchy levels again
      updatedEnabledItems.forEach((item, index) => {
        item.hierarchyLevel = index;
      });
    }

    // Now merge back with disabled levels, placing disabled levels at the end
    const maxEnabledHierarchy = Math.max(...updatedEnabledItems.map(l => l.hierarchyLevel));
    const updatedDisabledItems = disabledLevels.map((item, index) => ({
      ...item,
      hierarchyLevel: maxEnabledHierarchy + 1 + index
    }));

    const allUpdatedItems = [...updatedEnabledItems, ...updatedDisabledItems]
      .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel);

    // Update local state immediately for responsive UI
    setLevels(allUpdatedItems);
    setHasUnsavedChanges(true);
    
    onSuccess?.('Hierarchy order updated - changes pending save');
  };

  const handleAddCustomLevel = async () => {
    if (isConfirmed) {
      onError?.('Organizational structure is confirmed and cannot be modified for this fiscal year. Select a different fiscal year to make changes.');
      return;
    }

    if (!customLevelData.name.trim() || !customLevelData.pluralName.trim()) {
      onError?.('Please fill in both singular and plural names');
      return;
    }

    // Check for duplicate names
    const nameExists = levels.some(level => 
      level.name.toLowerCase() === customLevelData.name.trim().toLowerCase()
    );
    
    if (nameExists) {
      onError?.('A level with this name already exists');
      return;
    }

    const newLevel: Partial<LevelDefinition> = {
      id: `custom_${Date.now()}`,
      code: `CUSTOM_${customLevelData.name.toUpperCase().replace(/\s+/g, '_')}`,
      name: customLevelData.name.trim(),
      pluralName: customLevelData.pluralName.trim(),
      hierarchyLevel: levels.length,
      isStandard: false,
      isEnabled: false, // Create custom levels as disabled by default
      icon: customLevelData.icon,
      color: customLevelData.color,
      metadata: {}
    };

    // Add to local state
    const updatedLevels = [...levels, newLevel as LevelDefinition];
    setLevels(updatedLevels);
    setHasUnsavedChanges(true);
    
    setShowAddCustomModal(false);
    setCustomLevelData({
      name: '',
      pluralName: '',
      icon: '📋',
      color: DEFAULT_COLORS[0]
    });
    
    onSuccess?.(`Custom level "${customLevelData.name}" created - changes pending save. You can now enable it from the Custom Levels section.`);
  };

  const handleRemoveCustomLevel = (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (!level || level.isStandard) return;

    // For active custom levels, disable them (move back to custom levels section)
    if (level.isEnabled) {
      handleToggleLevel(levelId, false);
      onSuccess?.(`"${level.name}" moved back to Custom Levels section`);
    }
  };

  const handleDeleteCustomLevel = (levelId: string) => {
    if (isConfirmed) {
      onError?.('Organizational structure is confirmed and cannot be modified for this fiscal year. Select a different fiscal year to make changes.');
      return;
    }

    const level = levels.find(l => l.id === levelId);
    if (!level || level.isStandard) return;

    if (window.confirm(`Are you sure you want to permanently delete the "${level.name}" level? This action cannot be undone.`)) {
      setLevels(prev => prev.filter(l => l.id !== levelId));
      setHasUnsavedChanges(true);
      onSuccess?.(`Custom level "${level.name}" deleted - changes pending save`);
    }
  };

  const handleSave = () => {
    if (!hasUnsavedChanges) {
      return;
    }
    setShowSaveDialog(true);
  };

  const handleConfirmedSave = async () => {
    setSaving(true);
    try {
      const payload = {
        levelDefinitions: levels.map((level: LevelDefinition) => ({
          id: level.id,
          code: level.code,
          name: level.name,
          pluralName: level.pluralName,
          hierarchyLevel: level.hierarchyLevel,
          isStandard: level.isStandard,
          isEnabled: level.isEnabled,
          icon: level.icon,
          color: level.color,
          metadata: level.metadata || {}
        }))
      };
      
      const response = await apiClient.put(`/tenants/${tenantId}/fiscal-years/${fiscalYearId}/level-definitions`, payload);

      if (response.success) {
        // Create confirmation to lock the organizational structure
        const confirmationResponse = await apiClient.post(`/tenants/${tenantId}/fiscal-years/${fiscalYearId}/confirmations`, {
          confirmationType: 'org_structure',
          metadata: {
            confirmedLevels: levels.length,
            enabledLevels: levels.filter(l => l.isEnabled).length
          }
        });

        if (confirmationResponse.success) {
          setHasUnsavedChanges(false);
          setIsConfirmed(true);
          onSuccess?.('Organizational structure saved and confirmed successfully! This structure is now locked for this fiscal year.');
          await loadLevelDefinitions(); // Reload to get any server-generated IDs
        } else {
          // Structure saved but confirmation failed
          onSuccess?.('Hierarchy configuration saved successfully, but confirmation failed. Please try again to lock the structure.');
        }
      } else {
        onError?.(response.error?.message || 'Failed to save hierarchy configuration');
      }
    } catch (error) {
      console.error('Error saving hierarchy configuration:', error);
      onError?.('Failed to save hierarchy configuration');
    } finally {
      setSaving(false);
      setShowSaveDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hierarchy configuration...</p>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🏢</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenant Selected</h3>
        <p className="text-gray-600">Please select a tenant to configure organizational hierarchy.</p>
      </div>
    );
  }

  if (!fiscalYearId) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Fiscal Year Selected</h3>
        <p className="text-gray-600">Please select a fiscal year to configure organizational hierarchy.</p>
      </div>
    );
  }

  const enabledLevels = levels.filter(l => l.isEnabled);
  const standardLevels = levels.filter(l => l.isStandard);
  const customLevels = levels.filter(l => !l.isStandard);

  return (
    <div className="space-y-8">

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="inline-block w-3 h-3 bg-orange-400 rounded-full mr-3 animate-pulse"></span>
            </div>
            <div>
              <p className="text-orange-800 font-medium">Unsaved Changes</p>
              <p className="text-orange-700 text-sm">
                You have made changes to the organizational structure. Click "Save Pending Changes" to confirm and save your modifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Structure Indicator */}
      {isConfirmed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="inline-block w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm">🔒</span>
              </span>
            </div>
            <div>
              <p className="text-blue-800 font-medium">Organizational Structure Confirmed</p>
              <p className="text-blue-700 text-sm">
                This organizational structure has been confirmed and locked for this fiscal year. To make changes, please select a different fiscal year that hasn't been confirmed yet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Organizational Levels */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Active Organizational Levels</h3>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="enabled-levels" isDropDisabled={isConfirmed}>
            {(provided: DroppableProvided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {enabledLevels.map((level, index) => (
                  <Draggable 
                    key={level.id || level.code} 
                    draggableId={level.id || level.code} 
                    index={index}
                    isDragDisabled={isConfirmed || level.code === 'ORGANIZATION'}
                  >
                    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-green-50 border border-green-200 rounded-lg p-4 ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        } ${isConfirmed ? 'opacity-75' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div 
                              {...provided.dragHandleProps} 
                              className={`cursor-move ${isConfirmed ? 'cursor-not-allowed' : ''}`}
                            >
                              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{level.icon}</span>
                              <div>
                                <div className="font-medium text-gray-900">
                                  Level {index + 1}: {level.name}
                                  {level.code === 'ORGANIZATION' && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Required</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {level.pluralName} • {level.isStandard ? 'Standard' : 'Custom'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: level.color }}
                            ></div>
                            {level.code !== 'ORGANIZATION' && (
                              <button
                                onClick={() => handleToggleLevel(level.id || level.code, false)}
                                className={`text-red-600 hover:text-red-800 transition-colors ${
                                  isConfirmed ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Remove from active levels"
                                disabled={isConfirmed}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {enabledLevels.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏢</div>
            <p className="text-sm">No organizational levels are currently active</p>
            <p className="text-xs mt-1">Enable levels below to build your hierarchy</p>
          </div>
        )}
      </div>

      {/* Available Standard Levels - Only show when not confirmed */}
      {!isConfirmed && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Standard Levels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standardLevels.filter(l => !l.isEnabled).map((level) => (
              <div key={level.id || level.code} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{level.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{level.name}</div>
                      <div className="text-sm text-gray-500">{level.pluralName}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleLevel(level.id || level.code, true)}
                    className={`px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${
                      isConfirmed ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isConfirmed}
                  >
                    Enable
                  </button>
                </div>
              </div>
            ))}
          </div>

          {standardLevels.filter(l => !l.isEnabled).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm">All standard levels are currently enabled</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Levels - Only show when not confirmed */}
      {!isConfirmed && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Custom Levels</h3>
            <button
              onClick={() => setShowAddCustomModal(true)}
              className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
                isConfirmed ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isConfirmed}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Custom Level</span>
            </button>
          </div>

          <div className="space-y-3">
            {customLevels.map((level) => (
              <div key={level.id} className={`border rounded-lg p-4 ${
                level.isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{level.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{level.name}</div>
                      <div className="text-sm text-gray-500">{level.pluralName}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: level.color }}
                    ></div>
                    {level.isEnabled ? (
                      <button
                        onClick={() => handleToggleLevel(level.id, false)}
                        className={`px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors ${
                          isConfirmed ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isConfirmed}
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleLevel(level.id, true)}
                        className={`px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${
                          isConfirmed ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isConfirmed}
                      >
                        Enable
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCustomLevel(level.id)}
                      className={`text-red-600 hover:text-red-800 transition-colors ${
                        isConfirmed ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Delete custom level"
                      disabled={isConfirmed}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {customLevels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No custom levels created yet</p>
              <p className="text-xs mt-1">Add custom levels like "Region", "Business Unit", etc.</p>
            </div>
          )}
        </div>
      )}

      {/* Hierarchy Preview - Only show when not confirmed */}
      {!isConfirmed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-900 mb-4">Hierarchy Preview</h4>
          <div className="space-y-2">
            {enabledLevels.map((level, index) => (
              <div key={level.id || level.code} className="flex items-center space-x-3">
                <div className="flex items-center space-x-2" style={{ paddingLeft: `${index * 24}px` }}>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: level.color }}
                  ></div>
                  <span className="text-sm font-medium text-blue-900">
                    Level {index + 1}: {level.name}
                  </span>
                </div>
              </div>
            ))}
            {enabledLevels.length === 0 && (
              <p className="text-blue-700 text-sm">Configure levels above to see hierarchy preview</p>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      {!isConfirmed && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              loadLevelDefinitions();
              setHasUnsavedChanges(false);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={saving}
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`px-6 py-2 text-white rounded-md transition-colors ${
              hasUnsavedChanges 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                Save Pending Changes
              </>
            ) : (
              'Configuration Saved'
            )}
          </button>
        </div>
      )}

      {/* Add Custom Level Modal */}
      {showAddCustomModal && !isConfirmed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Custom Level</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Singular Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customLevelData.name}
                  onChange={(e) => setCustomLevelData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Region"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plural Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customLevelData.pluralName}
                  onChange={(e) => setCustomLevelData(prev => ({ ...prev, pluralName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Regions"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customLevelData.icon}
                    onChange={(e) => setCustomLevelData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={2}
                    placeholder="📋"
                  />
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_SUGGESTIONS.slice(0, 10).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCustomLevelData(prev => ({ ...prev, icon: emoji }))}
                        className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-lg"
                        title={`Use ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Click an emoji above or type your own</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={customLevelData.color}
                    onChange={(e) => setCustomLevelData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_COLORS.slice(0, 6).map((color) => (
                      <button
                        key={color}
                        onClick={() => setCustomLevelData(prev => ({ ...prev, color }))}
                        className="w-6 h-6 rounded border-2 border-white hover:border-gray-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomLevel}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomLevel();
                  }
                }}
              >
                Add Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Status */}
      {isConfirmed && (
        <div className="text-center py-6">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
            <span className="mr-2">🔒</span>
            <span className="font-medium">Structure Confirmed & Locked</span>
          </div>
          <p className="text-blue-600 text-sm mt-2">
            Select a different fiscal year to make changes to organizational structure.
          </p>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      <SaveConfirmationDialog
        isOpen={showSaveDialog}
        onConfirm={handleConfirmedSave}
        onClose={() => setShowSaveDialog(false)}
        title="Save Organizational Structure"
        message="You are about to save changes to the organizational hierarchy. This will affect how data is organized and may impact existing organizational units. Please confirm by solving the math problem below."
        isLoading={saving}
      />
    </div>
  );
}
