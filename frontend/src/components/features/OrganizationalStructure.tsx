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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import { 
  Building2, 
  Building, 
  Users, 
  User, 
  Plus, 
  Settings,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Edit
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth-context';

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
}

interface OrgUnit {
  id: string;
  code: string;
  name: string;
  description?: string;
  levelDefinition: LevelDefinition;
  parent?: {
    id: string;
    name: string;
    code: string;
  };
  children: Array<{
    id: string;
    name: string;
    code: string;
    levelDefinition: {
      name: string;
      hierarchyLevel: number;
    };
  }>;
  userAssignments: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface OrgStructureData {
  tenantId: string;
  levelDefinitions: LevelDefinition[];
  orgStructureConfig: {
    enabledLevels: string[];
    customLevels: string[];
  };
  orgUnits: OrgUnit[];
  summary: {
    totalLevels: number;
    enabledLevels: number;
    totalOrgUnits: number;
    activeUsers: number;
  };
}

const iconMap = {
  'Building2': Building2,
  'Building': Building,
  'Users': Users,
  'User': User
};

export function OrganizationalStructure(): JSX.Element {
  const { user } = useAuth();
  const [data, setData] = useState<OrgStructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Temporary tenant ID
  const tenantId = user?.tenantId || 'temp-tenant-id';

  useEffect(() => {
    if (tenantId) {
      loadOrgStructure();
    }
  }, [tenantId]);

  const loadOrgStructure = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/tenants/${tenantId}/org-structure`);
      
      if ((response.data as any).success) {
        setData((response.data as any).data);
      } else {
        throw new Error((response.data as any).error?.message || 'Failed to load organizational structure');
      }
    } catch (err) {
      console.error('Error loading org structure:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizational structure');
    } finally {
      setLoading(false);
    }
  };

  const toggleLevelEnabled = async (levelCode: string, currentEnabled: boolean) => {
    if (!data || levelCode === 'ORGANIZATION') return;

    try {
      const levelUpdates = [{
        code: levelCode,
        name: data.levelDefinitions.find(l => l.code === levelCode)?.name,
        pluralName: data.levelDefinitions.find(l => l.code === levelCode)?.pluralName,
        isEnabled: !currentEnabled,
        icon: data.levelDefinitions.find(l => l.code === levelCode)?.icon,
        color: data.levelDefinitions.find(l => l.code === levelCode)?.color
      }];

      await apiClient.put(`/tenants/${tenantId}/org-structure`, {
        levelUpdates
      });

      await loadOrgStructure();
    } catch (err) {
      console.error('Error updating level:', err);
      setError(err instanceof Error ? err.message : 'Failed to update level');
    }
  };

  const renderLevelIcon = (iconName?: string) => {
    if (!iconName || !iconMap[iconName as keyof typeof iconMap]) {
      return <Building className="h-4 w-4" />;
    }
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading organizational structure</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadOrgStructure}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-600">
            No organizational structure data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organizational Structure</h2>
          <p className="text-gray-600">
            Configure your organization's hierarchy and manage teams
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Levels</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.totalLevels}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enabled Levels</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.enabledLevels}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Org Units</p>
                <p className="text-2xl font-bold text-purple-600">{data.summary.totalOrgUnits}</p>
              </div>
              <Building className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Users</p>
                <p className="text-2xl font-bold text-orange-600">{data.summary.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Statistics</CardTitle>
              <CardDescription>
                Overview of your organizational structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Enabled Organizational Levels</span>
                  <div className="flex items-center space-x-2">
                    {data.levelDefinitions
                      .filter(level => level.isEnabled)
                      .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
                      .map((level, index, array) => (
                      <React.Fragment key={level.id}>
                        <Badge 
                          variant="info" 
                          className="flex items-center space-x-1"
                        >
                          {renderLevelIcon(level.icon)}
                          <span>{level.name}</span>
                        </Badge>
                        {index < array.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Structure Health</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion</span>
                        <span className="font-medium">
                          {Math.round((data.summary.totalOrgUnits / Math.max(data.summary.enabledLevels, 1)) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>User Coverage</span>
                        <span className="font-medium">
                          {data.summary.activeUsers > 0 ? '✓ Active' : '⚠ No assignments'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      {data.summary.totalOrgUnits === 0 && (
                        <div>• Create organizational units</div>
                      )}
                      {data.summary.activeUsers === 0 && (
                        <div>• Assign users to units</div>
                      )}
                      {data.summary.totalOrgUnits > 0 && data.summary.activeUsers > 0 && (
                        <div>• Structure is ready for use!</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level Definitions</CardTitle>
              <CardDescription>
                Configure which organizational levels are available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.levelDefinitions
                  .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
                  .map(level => (
                  <div key={level.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${level.color}20` }}
                      >
                        {renderLevelIcon(level.icon)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{level.name}</h4>
                          <Badge variant={level.isStandard ? "default" : "info"}>
                            {level.isStandard ? 'Standard' : 'Custom'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Level {level.hierarchyLevel} • {level.pluralName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLevelEnabled(level.code, level.isEnabled)}
                        disabled={level.code === 'ORGANIZATION'}
                        className={level.isEnabled ? 'text-green-600' : 'text-gray-400'}
                      >
                        {level.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!level.isStandard && (
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Button variant="secondary" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Level
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Tree</CardTitle>
              <CardDescription>
                Visual representation of your organizational structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.orgUnits.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-gray-600">Organization structure visualization will be displayed here.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No organizational units yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first organizational unit to get started
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Unit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
