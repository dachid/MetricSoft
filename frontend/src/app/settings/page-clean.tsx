'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { OrganizationalStructure } from '@/components/features/OrganizationalStructure';
import { HierarchyConfiguration } from '@/components/features/HierarchyConfiguration';
import { PerformanceComponentsManager } from '@/components/features/PerformanceComponentsManager';
import FiscalYearSelector from '@/components/FiscalYear/FiscalYearSelector';
import FiscalYearCreator from '@/components/FiscalYear/FiscalYearCreator';
import { Calendar, Building2, Target, Users } from 'lucide-react';

// Test that the tabs array has no terminology tab
const tabs = [
  { id: 'fiscal-year', label: 'Fiscal Year', icon: '📅', description: 'Manage fiscal years and timeline' },
  { id: 'org-structure', label: 'Organizational Structure', icon: '🏢', description: 'Configure organizational levels' },
  { id: 'performance-components', label: 'Performance Components', icon: '🎯', description: 'Setup performance management system' },
  { id: 'branding', label: 'Branding', icon: '🎨', description: 'Customize your brand appearance' }
];
