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
import { useTextStyles } from '@/hooks/useTextStyles';

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

export function HierarchyConfiguration({ tenantId, onSuccess, onError }: HierarchyConfigurationProps) {
  const textStyles = useTextStyles();
  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customLevelData, setCustomLevelData] = useState({
    name: '',
    pluralName: '',
    icon: '📋',
    color: DEFAULT_COLORS[0]
  });

  // Load existing level definitions
  useEffect(() => {
    if (tenantId) {
      // Ensure authentication token is set in apiClient
      const token = localStorage.getItem('metricsoft_auth_token');
      if (token) {
        apiClient.setAuthToken(token);
      }
      loadLevelDefinitions();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const loadLevelDefinitions = async () => {
    try {
      const response = await apiClient.get<LevelDefinition[]>(`/tenants/${tenantId}/level-definitions`);

      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        const sortedLevels = response.data.sort((a: LevelDefinition, b: LevelDefinition) => a.hierarchyLevel - b.hierarchyLevel);
        setLevels(sortedLevels);
      } else {
        // No levels exist, initialize defaults
        await initializeDefaultLevels();
      }
    } catch (error) {
      console.error('Error loading level definitions:', error);
      // Fallback to default levels on any error
      await initializeDefaultLevels();
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
      isEnabled: index === 0 || index <= 2, // Enable Organization, Division, Department by default
      icon: level.icon,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      metadata: { isRequired: level.isRequired || false }
    }));

    setLevels(defaultLevels);
  };

  const handleToggleLevel = async (levelId: string, enabled: boolean) => {
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

    setLevels(prevLevels =>
      prevLevels.map(l =>
        (l.id === levelId || l.code === levelId) ? { ...l, isEnabled: enabled } : l
      )
    );

    if (enabled) {
      const message = level.isStandard 
        ? `${level.name} level enabled successfully!`
        : `"${level.name}" custom level added to Active Organizational Levels`;
      onSuccess?.(message);
    } else {
      const message = level.isStandard
        ? `${level.name} level disabled successfully`
        : `"${level.name}" moved back to Custom Levels section`;
      onSuccess?.(message);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
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

    // Save the reordered hierarchy to the backend
    try {
      setSaving(true);
      
      const payload = {
        levels: allUpdatedItems.map((level: LevelDefinition) => ({
          id: level.id,
          code: level.code,
          name: level.name,
          pluralName: level.pluralName,
          hierarchyLevel: level.hierarchyLevel,
          isStandard: level.isStandard,
          isEnabled: level.isEnabled,
          icon: level.icon,
          color: level.color
        }))
      };
      
      const response = await apiClient.put(`/tenants/${tenantId}/level-definitions`, payload);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save hierarchy order');
      }

      onSuccess?.('Hierarchy order updated successfully!');
      // Reload the data to ensure UI matches the database state
      await loadLevelDefinitions();
    } catch (error) {
      console.error('Error saving hierarchy order:', error);
      onError?.('Failed to save hierarchy order. Please try again.');
      // Revert the local state on error
      await loadLevelDefinitions();
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomLevel = () => {
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

    setLevels(prev => [...prev, newLevel as LevelDefinition]);
    setShowAddCustomModal(false);
    setCustomLevelData({
      name: '',
      pluralName: '',
      icon: '📋',
      color: DEFAULT_COLORS[0]
    });
    
    onSuccess?.(`Custom level "${customLevelData.name}" created successfully! You can now enable it from the Custom Levels section.`);
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
    const level = levels.find(l => l.id === levelId);
    if (!level || level.isStandard) return;

    if (window.confirm(`Are you sure you want to permanently delete the "${level.name}" level? This action cannot be undone.`)) {
      setLevels(prev => prev.filter(l => l.id !== levelId));
      onSuccess?.(`Custom level "${level.name}" deleted successfully`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiClient.put(`/tenants/${tenantId}/level-definitions`, { levels });

      if (response.success) {
        onSuccess?.('Hierarchy configuration saved successfully!');
        await loadLevelDefinitions(); // Reload to get any server-generated IDs
      } else {
        onError?.(response.error?.message || 'Failed to save hierarchy configuration');
      }
    } catch (error) {
      console.error('Error saving hierarchy configuration:', error);
      onError?.('Failed to save hierarchy configuration');
    } finally {
      setSaving(false);
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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🏢</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
        <p className="text-gray-600">
          Please select an organization to configure its hierarchy levels.
        </p>
      </div>
    );
  }

  const enabledLevels = levels.filter(l => l.isEnabled);
  const disabledLevels = levels.filter(l => !l.isEnabled);

  return (
    <div className="space-y-6">
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          <strong>Debug Info:</strong> TenantId: {tenantId} | Levels count: {levels.length} | 
          Enabled: {levels.filter(l => l.isEnabled).length} | 
          Disabled: {levels.filter(l => !l.isEnabled).length}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={textStyles.combine('heading', 'text-lg font-medium')}>
            Organizational Level Configuration
          </h3>
          {saving && (
            <div className={textStyles.combine('info', 'flex items-center text-sm')}>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Saving changes...
            </div>
          )}
        </div>
        <p className={textStyles.combine('muted', 'text-sm mb-6')}>
          Configure which organizational levels are active and create custom levels as needed. 
          Drag and drop to reorder levels in your hierarchy.
        </p>
      </div>

      {/* Active Levels */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">
            Active Organizational Levels
          </h4>
          <span className="text-sm text-gray-500">
            {enabledLevels.length} level{enabledLevels.length !== 1 ? 's' : ''} active
          </span>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="active-levels">
            {(provided: DroppableProvided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {enabledLevels.map((level, index) => (
                  <Draggable 
                    key={level.id || level.code} 
                    draggableId={level.id || level.code} 
                    index={index}
                    isDragDisabled={level.code === 'ORGANIZATION'}
                  >
                    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center justify-between p-4 border rounded-lg bg-white transition-all duration-200 ${
                          snapshot.isDragging 
                            ? 'shadow-xl border-blue-300 bg-blue-50 transform rotate-1 scale-105' 
                            : 'hover:shadow-md hover:border-gray-300'
                        } ${level.code === 'ORGANIZATION' ? 'bg-blue-50 border-blue-200' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            {...provided.dragHandleProps}
                            className={`cursor-move text-gray-400 hover:text-gray-600 ${
                              level.code === 'ORGANIZATION' ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                          >
                            ⋮⋮
                          </div>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: level.color }}
                          >
                            {level.icon || level.hierarchyLevel + 1}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{level.name}</span>
                              {level.code === 'ORGANIZATION' && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Required</span>
                              )}
                              {!level.isStandard && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Custom</span>
                              )}
                            </div>
                            <span className="text-sm text-gray-600">{level.pluralName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Level {level.hierarchyLevel + 1}
                          </span>
                          <button
                            onClick={() => handleToggleLevel(level.id || level.code, false)}
                            disabled={level.code === 'ORGANIZATION'}
                            className={`text-red-600 hover:text-red-800 text-sm ${
                              level.code === 'ORGANIZATION' ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                            title={level.code === 'ORGANIZATION' ? 'Organization level is required' : 'Disable this level'}
                          >
                            Disable
                          </button>
                          {!level.isStandard && (
                            <button
                              onClick={() => handleRemoveCustomLevel(level.id)}
                              className="text-red-600 hover:text-red-800 text-sm ml-2"
                              title="Remove custom level"
                            >
                              Remove
                            </button>
                          )}
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
            <p>No active levels configured</p>
          </div>
        )}
      </div>

      {/* Disabled Standard Levels */}
      {disabledLevels.filter(l => l.isStandard).length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Available Standard Levels
          </h4>
          <div className="space-y-3">
            {disabledLevels.filter(l => l.isStandard).map((level) => (
              <div key={level.id || level.code} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: level.color }}
                  >
                    {level.icon || '•'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{level.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({level.pluralName})</span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleLevel(level.id || level.code, true)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Enable
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Custom Levels */}
      {disabledLevels.filter(l => !l.isStandard).length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Custom Levels
          </h4>
          <div className="space-y-3">
            {disabledLevels.filter(l => !l.isStandard).map((level) => (
              <div key={level.id || level.code} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: level.color }}
                  >
                    {level.icon || '•'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{level.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({level.pluralName})</span>
                    <span className="inline-block ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                      Custom
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleLevel(level.id || level.code, true)}
                    className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => handleDeleteCustomLevel(level.id || level.code)}
                    className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-200 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Level */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900">Create Custom Level</h4>
            <p className="text-sm text-gray-600 mt-1">
              Create new organizational levels. They'll appear in Custom Levels section below where you can enable them.
            </p>
          </div>
          <button
            onClick={() => setShowAddCustomModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Custom Level</span>
          </button>
        </div>

        {levels.filter(l => !l.isStandard).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No custom levels created yet</p>
            <p className="text-xs mt-1">Add custom levels like "Region", "Business Unit", etc.</p>
          </div>
        )}
      </div>

      {/* Hierarchy Preview */}
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

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => loadLevelDefinitions()}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          disabled={saving}
        >
          Reset Changes
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>

      {/* Add Custom Level Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Custom Level</h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Singular Name *
                </label>
                <input
                  type="text"
                  value={customLevelData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCustomLevelData(prev => ({ 
                      ...prev, 
                      name,
                      // Auto-suggest plural name if it's empty or was auto-generated
                      pluralName: prev.pluralName === '' || prev.pluralName === `${prev.name}s` 
                        ? `${name}s` 
                        : prev.pluralName
                    }));
                  }}
                  placeholder="e.g., Region, Business Unit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plural Name *
                </label>
                <input
                  type="text"
                  value={customLevelData.pluralName}
                  onChange={(e) => setCustomLevelData(prev => ({ ...prev, pluralName: e.target.value }))}
                  placeholder="e.g., Regions, Business Units"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-suggested based on singular name</p>
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
    </div>
  );
}
