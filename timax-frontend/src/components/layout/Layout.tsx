'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/vehicles': 'Vehicles',
  '/jobs': 'Jobs',
  '/employees': 'Tips and Commissions',
  '/services': 'Services',
  '/inventory': 'Inventory',
  '/assets': 'Assets',
  '/expenses': 'Expenses',
  '/accounting': 'Accounting & Finance',
  '/reports': 'Reports',
  '/audit': 'Audit',
  '/settings': 'Settings',
  '/settings/users': 'Employees',
  '/employees/commissions': 'Tips & Commissions',
};

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Get page title based on current path
  const getPageTitle = () => {
    const title = pageTitles[pathname];
    if (title) return title;

    // Handle dynamic routes
    if (pathname.startsWith('/customers/')) return 'Customer Details';
    if (pathname.startsWith('/vehicles/')) return 'Vehicle Details';
    if (pathname.startsWith('/jobs/')) return 'Job Details';
    if (pathname.startsWith('/employees/commissions')) return 'Tips & Commissions';
    if (pathname.startsWith('/employees/')) return 'Commission Details';
    if (pathname.startsWith('/inventory/')) return 'Inventory Details';
    if (pathname.startsWith('/assets/')) return 'Asset Details';
    if (pathname.startsWith('/expenses/')) return 'Expense Details';
    if (pathname.startsWith('/settings/users')) return 'Employees';

    return 'SaleTide';
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={getPageTitle()}
        />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#22c55e',
              color: '#fff',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />
    </div>
  );
}