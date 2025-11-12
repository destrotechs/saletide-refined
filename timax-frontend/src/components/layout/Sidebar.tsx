'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UserGroupIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  DocumentChartBarIcon,
  RectangleStackIcon,
  CogIcon,
  BuildingStorefrontIcon,
  CalculatorIcon,
  UserIcon,
  UsersIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  TruckIcon as TruckIconSolid,
  WrenchScrewdriverIcon as WrenchIconSolid,
  CubeIcon as CubeIconSolid,
  DocumentChartBarIcon as ChartIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
  CogIcon as CogIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid,
  CalculatorIcon as CalculatorIconSolid,
  UserIcon as UserIconSolid,
  UsersIcon as UsersIconSolid,
  BanknotesIcon as BanknotesIconSolid,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Define allowed roles for each menu item
// ADMIN, MANAGER, SALES_AGENT, TECHNICIAN, INVENTORY_CLERK, ACCOUNTANT
const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconActive: HomeIconSolid,
    roles: ['ADMIN', 'MANAGER', 'SALES_AGENT', 'INVENTORY_CLERK', 'ACCOUNTANT']
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: UserGroupIcon,
    iconActive: UserGroupIconSolid,
    roles: ['ADMIN', 'MANAGER', 'SALES_AGENT']
  },
  {
    name: 'Vehicles',
    href: '/vehicles',
    icon: TruckIcon,
    iconActive: TruckIconSolid,
    roles: ['ADMIN', 'MANAGER', 'SALES_AGENT', 'TECHNICIAN']
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: WrenchScrewdriverIcon,
    iconActive: WrenchIconSolid,
    roles: ['ADMIN', 'MANAGER', 'SALES_AGENT', 'TECHNICIAN']
  },
  {
    name: 'Employees',
    href: '/settings/users',
    icon: UsersIcon,
    iconActive: UsersIconSolid,
    roles: ['ADMIN']
  },
  {
    name: 'Tips and Commissions',
    href: '/employees/commissions',
    icon: UserIcon,
    iconActive: UserIconSolid,
    roles: ['ADMIN', 'MANAGER', 'TECHNICIAN']
  },
  {
    name: 'Services',
    href: '/services',
    icon: BuildingStorefrontIcon,
    iconActive: BuildingStorefrontIconSolid,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: CubeIcon,
    iconActive: CubeIconSolid,
    roles: ['ADMIN', 'MANAGER', 'INVENTORY_CLERK', 'SALES_AGENT']
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: RectangleStackIcon,
    iconActive: RectangleStackIconSolid,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Expenses',
    href: '/expenses',
    icon: BanknotesIcon,
    iconActive: BanknotesIconSolid,
    roles: ['ADMIN', 'MANAGER', 'SALES_AGENT']
  },
  {
    name: 'Accounting',
    href: '/accounting',
    icon: CalculatorIcon,
    iconActive: CalculatorIconSolid,
    roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT']
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: DocumentChartBarIcon,
    iconActive: ChartIconSolid,
    roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT']
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    iconActive: CogIconSolid,
    roles: ['ADMIN', 'MANAGER']
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter navigation items based on user role
  const allowedNavigation = navigation.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 sm:w-80 md:w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 px-4 sm:px-6">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/saletidelogo.png"
                alt="SaleTide"
                width={180}
                height={48}
                priority
                className="h-auto w-auto max-w-[160px] sm:max-w-[180px]"
              />
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Close sidebar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
            {allowedNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = isActive ? item.iconActive : item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2.5 sm:py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer info for mobile */}
          <div className="border-t border-gray-200 px-3 sm:px-4 py-3 lg:hidden">
            <p className="text-xs text-gray-500 text-center">
              {process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}