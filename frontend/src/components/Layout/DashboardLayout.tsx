'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { ChevronDown, User, LogOut } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  current?: boolean;
  permission?: string;
  roles?: string[];
}

export default function DashboardLayout({ children, title = "Dashboard", subtitle }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { terminology, isLoading: terminologyLoading } = useTerminology();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    }

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [profileDropdownOpen]);

  const navigation: NavItem[] = [
    {
      name: terminology.dashboard,
      href: '/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      ),
    },
    {
      name: terminology.performance,
      href: '/performance',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z" />
        </svg>
      ),
    },
    {
      name: terminology.reports,
      href: '/reports',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    // KPI Management Section (for all employees)
    {
      name: `My ${terminology?.kpisPlural || 'KPIs'}`,
      href: '/my-kpis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      roles: ['EMPLOYEE', 'LINE_MANAGER', 'ORGANIZATION_ADMIN'], // All users can have individual KPIs
    },
    {
      name: `Manage ${terminology?.kpisPlural || 'KPIs'}`,
      href: '/assigned-kpis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      roles: ['EMPLOYEE', 'LINE_MANAGER', 'ORGANIZATION_ADMIN'], // All employees can see this
    },
    {
      name: `Shared ${terminology?.kpisPlural || 'KPIs'}`,
      href: '/shared-kpis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
      roles: ['EMPLOYEE', 'LINE_MANAGER', 'ORGANIZATION_ADMIN'], // All employees can see shared KPIs
    },
    // Configuration Section
    {
      name: 'Fiscal Year',
      href: '/fiscal-year',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: 'Organizational Structure',
      href: '/organizational-structure',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: terminology.orgUnits,
      href: '/organizational-units',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: 'Performance Components',
      href: '/performance-components',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: terminology.perspectives,
      href: '/perspectives',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    },
    {
      name: 'Users',
      href: '/users',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN'], // Only Organization Admins
    },
    {
      name: 'Branding',
      href: '/branding',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      ),
      roles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    },
    // Admin Section
    {
      name: 'Tenant Management',
      href: '/admin/tenants',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      roles: ['SUPER_ADMIN'], // Only Super Admins can create/manage tenants
    }
  ];

  const hasPermission = (item: NavItem): boolean => {
    // Check if user has required roles
    return Boolean(!item.roles || item.roles.length === 0 || user?.roles?.some(userRole => item.roles?.includes(userRole.code)));
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:pt-5 lg:pb-4 lg:bg-white lg:overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MetricSoft
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1 px-6">
          <div className="space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigation
                .filter((item) => hasPermission(item))
                .filter((item) => [terminology.dashboard, terminology.performance, terminology.reports].includes(item.name))
                .map((item) => {
                  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
                  const isActive = currentPath === item.href;

                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
                        ${isActive 
                          ? 'bg-blue-100 text-blue-900' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <div className={`mr-3 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                        {item.icon}
                      </div>
                      {item.name}
                    </a>
                  );
                })}
            </div>

            {/* KPI Management Section */}
            {user?.roles?.some(userRole => ['EMPLOYEE', 'LINE_MANAGER', 'ORGANIZATION_ADMIN'].includes(userRole.code)) && (
              <div>
                <div className="px-2 py-1 mb-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{terminology?.kpisPlural || 'KPIs'} Management</h4>
                </div>
                <div className="space-y-1">
                  {navigation
                    .filter((item) => [`My ${terminology?.kpisPlural || 'KPIs'}`, `Manage ${terminology?.kpisPlural || 'KPIs'}`, `Shared ${terminology?.kpisPlural || 'KPIs'}`].includes(item.name))
                    .filter((item) => hasPermission(item))
                    .map((item) => {
                      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
                      const isActive = currentPath === item.href;

                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          className={`
                            group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
                            ${isActive 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <div className={`mr-3 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                            {item.icon}
                          </div>
                          {item.name}
                        </a>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Configuration Section */}
            {user?.roles?.some(userRole => ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(userRole.code)) && (
              <div>
                <div className="px-2 py-1 mb-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Configuration</h4>
                </div>
                <div className="space-y-1">
                  {navigation
                    .filter((item) => item.roles && item.roles.some(role => ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(role)))
                    .filter((item) => !['Tenant Management', `My ${terminology?.kpisPlural || 'KPIs'}`, `Manage ${terminology?.kpisPlural || 'KPIs'}`, `Shared ${terminology?.kpisPlural || 'KPIs'}`].includes(item.name))
                    .filter((item) => hasPermission(item))
                    .map((item) => {
                      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
                      const isActive = currentPath === item.href;

                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          className={`
                            group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
                            ${isActive 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <div className={`mr-3 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                            {item.icon}
                          </div>
                          {item.name}
                        </a>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Admin Section */}
            {user?.roles?.some(userRole => userRole.code === 'SUPER_ADMIN') && (
              <div>
                <div className="px-2 py-1 mb-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</h4>
                </div>
                <div className="space-y-1">
                  {navigation
                    .filter((item) => item.name === 'Tenant Management')
                    .filter((item) => hasPermission(item))
                    .map((item) => {
                      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
                      const isActive = currentPath === item.href;

                      return (
                        <a
                          key={item.name}
                          href={item.href}
                          className={`
                            group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
                            ${isActive 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <div className={`mr-3 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                            {item.icon}
                          </div>
                          {item.name}
                        </a>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Mobile navigation content - same as desktop */}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page title - visible on larger screens */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>

            {/* Spacer for mobile */}
            <div className="lg:hidden"></div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {/* Profile picture or avatar */}
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-blue-600">
                      {user?.name?.[0] || user?.email?.[0] || 'U'}
                    </span>
                  )}
                </div>
                
                {/* User name - hidden on mobile */}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-32">
                    {user?.roles?.[0]?.name || 'User'}
                  </p>
                </div>
                
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* User info section */}
                  <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {user?.roles?.map(role => role.name).join(', ')}
                    </p>
                  </div>

                  {/* Profile settings */}
                  <a
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    Profile Settings
                  </a>

                  {/* Sign out */}
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3 text-gray-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1">
          {/* Page header for mobile */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Page content */}
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
