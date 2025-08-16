'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Users, ChevronDown, ChevronRight, User } from 'lucide-react';

interface OrgUnit {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  levelDefinition: {
    id: string;
    name: string;
    level: number;
  };
  kpiChampions: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
  children?: OrgUnit[];
}

interface OrganogramVisualizationProps {
  orgUnits: OrgUnit[];
  fiscalYearName: string;
  className?: string;
}

interface TreeNodeProps {
  unit: OrgUnit;
  level: number;
  isExpanded: boolean;
  onToggle: (unitId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ unit, level, isExpanded, onToggle }) => {
  const hasChildren = unit.children && unit.children.length > 0;
  const indentWidth = level * 24; // 24px per level

  return (
    <div className="select-none">
      {/* Node Header */}
      <div 
        className="flex items-center py-2 px-3 hover:bg-gray-50 rounded-md cursor-pointer group transition-colors"
        style={{ marginLeft: `${indentWidth}px` }}
        onClick={() => hasChildren && onToggle(unit.id)}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-6 h-6 flex items-center justify-center mr-2">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Unit Icon */}
        <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mr-3">
          <Building2 className="w-4 h-4 text-blue-600" />
        </div>

        {/* Unit Information */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900">{unit.name}</h4>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-mono">
              {unit.code}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              {unit.levelDefinition.name}
            </span>
          </div>
          
          {/* Unit Description */}
          {unit.description && (
            <p className="text-sm text-gray-600 mt-1">{unit.description}</p>
          )}
          
          {/* KPI Champions */}
          {unit.kpiChampions.length > 0 && (
            <div className="flex items-center mt-2 space-x-2">
              <Users className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 font-medium">
                KPI Champions ({unit.kpiChampions.length}):
              </span>
              <div className="flex items-center space-x-1">
                {unit.kpiChampions.slice(0, 3).map((champion, index) => (
                  <div
                    key={champion.id}
                    className="flex items-center space-x-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full"
                    title={champion.user.email}
                  >
                    <User className="w-3 h-3" />
                    <span>
                      {champion.user.firstName && champion.user.lastName 
                        ? `${champion.user.firstName} ${champion.user.lastName}`
                        : champion.user.email
                      }
                    </span>
                  </div>
                ))}
                {unit.kpiChampions.length > 3 && (
                  <span className="text-xs text-green-600 font-medium">
                    +{unit.kpiChampions.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Children Count */}
        {hasChildren && (
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {unit.children!.length} {unit.children!.length === 1 ? 'unit' : 'units'}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {unit.children!.map((child) => (
            <TreeNode
              key={child.id}
              unit={child}
              level={level + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OrganogramVisualization: React.FC<OrganogramVisualizationProps> = ({
  orgUnits,
  fiscalYearName,
  className = ""
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [treeData, setTreeData] = useState<OrgUnit[]>([]);

  // Build tree structure from flat org units
  useEffect(() => {
    const buildTree = (units: OrgUnit[]): OrgUnit[] => {
      const unitMap = new Map<string, OrgUnit>();
      const rootUnits: OrgUnit[] = [];

      // Create a map of all units
      units.forEach(unit => {
        unitMap.set(unit.id, { ...unit, children: [] });
      });

      // Build the tree
      units.forEach(unit => {
        const unitWithChildren = unitMap.get(unit.id)!;
        
        if (unit.parentId && unitMap.has(unit.parentId)) {
          const parent = unitMap.get(unit.parentId)!;
          if (!parent.children) parent.children = [];
          parent.children.push(unitWithChildren);
        } else {
          rootUnits.push(unitWithChildren);
        }
      });

      // Sort children by level and name
      const sortUnits = (units: OrgUnit[]) => {
        units.sort((a, b) => {
          if (a.levelDefinition.level !== b.levelDefinition.level) {
            return a.levelDefinition.level - b.levelDefinition.level;
          }
          return a.name.localeCompare(b.name);
        });
        
        units.forEach(unit => {
          if (unit.children && unit.children.length > 0) {
            sortUnits(unit.children);
          }
        });
      };

      sortUnits(rootUnits);
      return rootUnits;
    };

    setTreeData(buildTree(orgUnits));
    
    // Auto-expand root nodes and first level
    const newExpanded = new Set<string>();
    orgUnits.forEach(unit => {
      if (!unit.parentId || unit.levelDefinition.level <= 1) {
        newExpanded.add(unit.id);
      }
    });
    setExpandedNodes(newExpanded);
  }, [orgUnits]);

  const handleToggle = (unitId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(orgUnits.map(unit => unit.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const totalChampions = orgUnits.reduce((total, unit) => total + unit.kpiChampions.length, 0);

  if (orgUnits.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizational Units</h3>
        <p className="text-gray-600">
          No organizational units have been created for {fiscalYearName} yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Organizational Structure
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {fiscalYearName} • {orgUnits.length} units • {totalChampions} KPI champions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Tree View */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {treeData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No organizational structure found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {treeData.map((unit) => (
              <TreeNode
                key={unit.id}
                unit={unit}
                level={0}
                isExpanded={expandedNodes.has(unit.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <Building2 className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-gray-600">Total Units:</span>
            <span className="font-medium text-gray-900 ml-1">{orgUnits.length}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-gray-600">KPI Champions:</span>
            <span className="font-medium text-gray-900 ml-1">{totalChampions}</span>
          </div>
          <div className="flex items-center">
            <ChevronRight className="w-4 h-4 text-purple-600 mr-2" />
            <span className="text-gray-600">Levels:</span>
            <span className="font-medium text-gray-900 ml-1">
              {new Set(orgUnits.map(unit => unit.levelDefinition.level)).size}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganogramVisualization;
