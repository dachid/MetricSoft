/**
 * Tenant API Service
 * Handles all tenant-related API calls
 */

interface SetupTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  terminology: Record<string, string>;
  perspectives: Array<{
    name: string;
    description: string;
    color: string;
    icon: string;
  }>;
  orgStructure: string[];
}

class TenantApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('metricsoft_auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getSetupTemplates(): Promise<SetupTemplate[]> {
    try {
      // For now, return predefined templates since this is Phase 1
      // In Phase 2, this would be a real API call
      return [
        {
          id: 'balanced-scorecard',
          name: 'Balanced Scorecard',
          description: 'Traditional four-perspective strategic framework',
          icon: '⚖️',
          category: 'Strategic Management',
          terminology: {
            perspectives: 'Perspectives',
            objectives: 'Objectives',
            kpis: 'KPIs',
            targets: 'Targets',
            initiatives: 'Initiatives'
          },
          perspectives: [
            { name: 'Financial', description: 'Financial performance and value creation', color: '#059669', icon: '💰' },
            { name: 'Customer', description: 'Customer satisfaction and market position', color: '#DC2626', icon: '👥' },
            { name: 'Internal Process', description: 'Operational excellence and efficiency', color: '#2563EB', icon: '⚙️' },
            { name: 'Learning & Growth', description: 'Organizational capacity and capabilities', color: '#7C3AED', icon: '🎓' }
          ],
          orgStructure: ['Organization', 'Department', 'Team', 'Individual']
        },
        {
          id: 'okr-framework',
          name: 'OKR Framework',
          description: 'Objectives and Key Results methodology',
          icon: '🎯',
          category: 'Goal Management',
          terminology: {
            perspectives: 'Focus Areas',
            objectives: 'Objectives',
            kpis: 'Key Results',
            targets: 'Targets',
            initiatives: 'Initiatives'
          },
          perspectives: [
            { name: 'Company', description: 'Company-wide strategic focus', color: '#059669', icon: '🏢' },
            { name: 'Product', description: 'Product development and innovation', color: '#DC2626', icon: '📱' },
            { name: 'Customer', description: 'Customer experience and growth', color: '#2563EB', icon: '😊' }
          ],
          orgStructure: ['Company', 'Team', 'Individual']
        }
      ];
    } catch (error) {
      console.error('Error fetching setup templates:', error);
      return [];
    }
  }

  async applyTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // For Phase 1, this is a placeholder
      console.log('Applying template:', templateId);
      return { success: true };
    } catch (error) {
      console.error('Error applying template:', error);
      return { success: false, error: 'Failed to apply template' };
    }
  }

  getTerminologyPresets() {
    return [
      {
        name: 'Balanced Scorecard',
        description: 'Traditional performance management terminology',
        config: {
          perspectives: 'Perspectives',
          objectives: 'Objectives',
          kpis: 'KPIs',
          targets: 'Targets',
          initiatives: 'Initiatives'
        }
      },
      {
        name: 'OKR Framework',
        description: 'Objectives and Key Results terminology',
        config: {
          perspectives: 'Focus Areas',
          objectives: 'Objectives',
          kpis: 'Key Results',
          targets: 'Targets',
          initiatives: 'Key Initiatives'
        }
      },
      {
        name: 'Strategic Planning',
        description: 'Corporate strategy terminology',
        config: {
          perspectives: 'Strategic Pillars',
          objectives: 'Goals',
          kpis: 'Success Metrics',
          targets: 'Performance Benchmarks',
          initiatives: 'Strategic Projects'
        }
      },
      {
        name: 'Operational Excellence',
        description: 'Operations-focused terminology',
        config: {
          perspectives: 'Business Areas',
          objectives: 'Outcomes',
          kpis: 'Performance Indicators',
          targets: 'Standards',
          initiatives: 'Improvement Actions'
        }
      }
    ];
  }

  async getTenantSettings(tenantId: string) {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/settings`, {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch tenant settings');
    } catch (error) {
      console.error('Error fetching tenant settings:', error);
      throw error;
    }
  }

  async updateTenantSettings(tenantId: string, updates: Record<string, any>) {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to update tenant settings');
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      throw error;
    }
  }
}

export const tenantApiService = new TenantApiService();
