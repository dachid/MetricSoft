import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { Input, Button, Card } from '../ui'

interface Perspective {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sequenceOrder: number;
  isActive: boolean;
}

interface PerspectiveManagerProps {
  fiscalYearId: string;
  onPerspectivesChange?: (perspectives: Perspective[]) => void;
}

export function PerspectiveManager({ fiscalYearId, onPerspectivesChange }: PerspectiveManagerProps) {
  const { user } = useAuth();
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPerspective, setNewPerspective] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const predefinedColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#EC4899', '#6B7280', '#14B8A6', '#F43F5E'
  ];

  // Load perspectives for fiscal year
  useEffect(() => {
    if (fiscalYearId && user?.tenantId) {
      loadPerspectives();
    }
  }, [fiscalYearId, user?.tenantId]);

  const loadPerspectives = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/perspectives`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPerspectives(data.perspectives || []);
        onPerspectivesChange?.(data.perspectives || []);
      }
    } catch (error) {
      console.error('Error loading perspectives:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPerspective = async (perspectiveData: any) => {
    try {
      setIsCreating(true);
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/perspectives`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(perspectiveData)
      });

      if (response.ok) {
        const data = await response.json();
        const updatedPerspectives = [...perspectives, data.perspective];
        setPerspectives(updatedPerspectives);
        onPerspectivesChange?.(updatedPerspectives);
        return data.perspective;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create perspective');
      }
    } catch (error) {
      console.error('Error creating perspective:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updatePerspective = async (perspectiveId: string, updates: any) => {
    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/perspectives/${perspectiveId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        const updatedPerspectives = perspectives.map(p => 
          p.id === perspectiveId ? data.perspective : p
        );
        setPerspectives(updatedPerspectives);
        onPerspectivesChange?.(updatedPerspectives);
      }
    } catch (error) {
      console.error('Error updating perspective:', error);
    }
  };

  const deletePerspective = async (perspectiveId: string) => {
    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/fiscal-years/${fiscalYearId}/perspectives/${perspectiveId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPerspectives = perspectives.filter(p => p.id !== perspectiveId);
        setPerspectives(updatedPerspectives);
        onPerspectivesChange?.(updatedPerspectives);
      }
    } catch (error) {
      console.error('Error deleting perspective:', error);
    }
  };

  const handleCreatePerspective = async () => {
    if (!newPerspective.name.trim()) return;

    try {
      await createPerspective({
        name: newPerspective.name.trim(),
        description: newPerspective.description.trim() || undefined,
        color: newPerspective.color,
        icon: undefined
      });
      
      // Reset form
      setNewPerspective({
        name: '',
        description: '',
        color: '#3B82F6'
      });
      setIsAddingNew(false);
    } catch (error) {
      console.error('Failed to create perspective:', error);
      // Show error to user (could add toast notification here)
    }
  };

  const handleColorChange = (perspectiveId: string, color: string) => {
    updatePerspective(perspectiveId, { color });
  };

  const handleNameChange = (perspectiveId: string, name: string) => {
    // Debounced update would be implemented here
    updatePerspective(perspectiveId, { name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Define your strategic areas or perspectives. These will group your objectives and KPIs.
        </p>
      </div>

      {/* Existing Perspectives */}
      <div className="space-y-4">
        {perspectives.map((perspective) => (
          <Card key={perspective.id} className="!p-4">
            <div className="flex items-center space-x-4">
              {/* Color Picker */}
              <div className="flex space-x-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={`
                      w-6 h-6 rounded-full border-2 transition-all
                      ${perspective.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'}
                    `}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(perspective.id, color)}
                  />
                ))}
              </div>

              {/* Name */}
              <div className="flex-1">
                <Input
                  value={perspective.name}
                  onChange={(value) => handleNameChange(perspective.id, value)}
                  placeholder="Perspective name"
                  className="!mb-0"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deletePerspective(perspective.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Perspective */}
      {!isAddingNew ? (
        <div className="text-center">
          <Button
            variant="secondary"
            onClick={() => setIsAddingNew(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-blue-300"
          >
            + Add New Perspective
          </Button>
        </div>
      ) : (
        <Card title="New Perspective" className="border-blue-200">
          <div className="space-y-4">
            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex space-x-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={`
                      w-8 h-8 rounded-full border-2 transition-all
                      ${newPerspective.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'}
                    `}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewPerspective(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <Input
              label="Name"
              value={newPerspective.name}
              onChange={(value) => setNewPerspective(prev => ({ ...prev, name: value }))}
              placeholder="e.g., Financial, Customer, Internal"
              required
              autoFocus
            />

            <Input
              label="Description (Optional)"
              value={newPerspective.description}
              onChange={(value) => setNewPerspective(prev => ({ ...prev, description: value }))}
              placeholder="Brief description of this perspective"
            />

            <div className="flex space-x-3">
              <Button
                variant="primary"
                onClick={handleCreatePerspective}
                loading={isCreating}
                disabled={!newPerspective.name.trim()}
              >
                Create Perspective
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAddingNew(false)
                  setNewPerspective({
                    name: '',
                    description: '',
                    color: '#3B82F6'
                  })
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Helpful Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="text-sm">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips for defining perspectives:</h4>
          <ul className="space-y-1 text-blue-800">
            <li>• Keep names short and memorable (1-2 words)</li>
            <li>• Use colors to make them visually distinct</li>
            <li>• Start with 3-5 perspectives - you can add more later</li>
            <li>• Think about your key stakeholders and value drivers</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
