'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserGroupIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/Card';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItem {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: string;
}

const settingItems: SettingItem[] = [
  {
    name: 'User Management',
    description: 'Manage system users, roles, and permissions',
    href: '/settings/users',
    icon: UserGroupIcon,
    requiredRole: 'ADMIN',
  },
  {
    name: 'System Configuration',
    description: 'Configure general system settings and preferences',
    href: '/settings/system',
    icon: CogIcon,
    requiredRole: 'ADMIN',
  },
  {
    name: 'Security',
    description: 'Security settings, password policies, and authentication',
    href: '/settings/security',
    icon: ShieldCheckIcon,
    requiredRole: 'ADMIN',
  },
  {
    name: 'Notifications',
    description: 'Configure email and system notifications',
    href: '/settings/notifications',
    icon: BellIcon,
    requiredRole: 'MANAGER',
  },
  {
    name: 'Reports Configuration',
    description: 'Customize report templates and formats',
    href: '/settings/reports',
    icon: ChartBarIcon,
    requiredRole: 'MANAGER',
  },
  {
    name: 'Terms & Conditions',
    description: 'Manage terms, conditions, and legal documents',
    href: '/settings/terms',
    icon: DocumentTextIcon,
    requiredRole: 'MANAGER',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const hasAccess = (requiredRole?: string) => {
    if (!requiredRole) return true;
    if (!user) return false;

    const roleHierarchy: Record<string, number> = {
      EMPLOYEE: 1,
      MANAGER: 2,
      ADMIN: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const accessibleItems = settingItems.filter(item => hasAccess(item.requiredRole));

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Settings"
            description="Manage your system configuration and preferences"
            breadcrumbs={[
              { label: 'Settings' }
            ]}
          />

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accessibleItems.map((item) => {
              const Icon = item.icon;
              const isImplemented = item.href === '/settings/users';

              return (
                <Card
                  key={item.name}
                  className={`hover:shadow-lg transition-shadow ${
                    !isImplemented ? 'opacity-60' : 'cursor-pointer'
                  }`}
                  onClick={() => isImplemented && router.push(item.href)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item.description}
                        </p>
                        {!isImplemented && (
                          <span className="inline-block mt-2 text-xs text-gray-400 italic">
                            Coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Access Notice */}
          {accessibleItems.length < settingItems.length && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Some settings are restricted based on your role. Contact an administrator if you need access to additional settings.
              </p>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
