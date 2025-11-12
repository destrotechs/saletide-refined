'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  EyeIcon,
  PlusIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
}

function KPICard({ title, value, change, icon: Icon, color }: KPICardProps) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <div className="flex items-center mt-1.5 sm:mt-2">
              {isPositive ? (
                <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
              )}
              <span
                className={`text-xs sm:text-sm font-medium ml-1 ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(change)}%
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2 hidden sm:inline">vs last month</span>
            </div>
          </div>
          <div className={`p-2 sm:p-3 rounded-full ${color} flex-shrink-0 ml-3`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentJobsCard() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['recent-jobs'],
    queryFn: () => apiClient.getJobs({ page: 1 }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Recent Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jobs?.slice(0, 5).map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{job.job_number}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{job.customer_name || 'Walk-in Customer'}</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                    {formatCurrency(parseFloat(job.final_total))}
                  </p>
                  <span
                    className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                      job.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : job.status === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
                <Link
                  href={`/jobs/${job.id}`}
                  className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  title="View job details"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* View All Jobs Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href="/jobs"
            className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors group"
          >
            <span>View All Jobs</span>
            <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const allActions = [
    {
      name: 'New Job',
      href: '/jobs/new',
      color: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      icon: WrenchScrewdriverIcon,
      roles: ['ADMIN', 'MANAGER', 'SALES_AGENT']
    },
    {
      name: 'Add Customer',
      href: '/customers/new',
      color: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      icon: UserGroupIcon,
      roles: ['ADMIN', 'MANAGER', 'SALES_AGENT']
    },
    {
      name: 'Add Vehicle',
      href: '/vehicles/new',
      color: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
      icon: TruckIcon,
      roles: ['ADMIN', 'MANAGER', 'SALES_AGENT']
    },
    {
      name: 'View Reports',
      href: '/reports',
      color: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
      icon: ChartBarIcon,
      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT']
    },
  ];

  // Filter actions based on user role
  const actions = allActions.filter(action => user && action.roles.includes(user.role));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                href={action.href}
                className={`${action.color} text-white text-xs sm:text-sm font-medium py-3 sm:py-4 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 flex flex-col items-center justify-center gap-1.5 sm:gap-2 group`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
                <span className="leading-tight">{action.name}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
  });

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  if (statsLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // For non-admin/manager users, show simplified dashboard
  if (!isAdminOrManager) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-4 sm:space-y-6">
            {/* Simplified KPI Cards for Sales Agents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Today's Revenue</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mt-1 break-words">
                        {formatCurrency(stats?.revenue_today || 0)}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full bg-green-500 flex-shrink-0">
                      <CurrencyDollarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Today's Jobs</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 mt-1">
                        {stats?.jobs_today || 0}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full bg-blue-500 flex-shrink-0">
                      <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Active Customers</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 mt-1">
                        {stats?.active_customers || 0}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full bg-purple-500 flex-shrink-0">
                      <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pending Jobs</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 mt-1">
                        {stats?.pending_jobs || 0}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full bg-orange-500 flex-shrink-0">
                      <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <RecentJobsCard />
              </div>
              <div>
                <QuickActionsCard />
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // For admin/manager users, show full dashboard
  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-4 sm:space-y-6">
          {/* Today's Summary Cards - Always visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Today's Revenue</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 mt-1 break-words">
                      {formatCurrency(stats?.revenue_today || 0)}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-green-500 flex-shrink-0">
                    <CurrencyDollarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Today's Jobs</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 mt-1">
                      {stats?.jobs_today || 0}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-blue-500 flex-shrink-0">
                    <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Active Customers</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 mt-1">
                      {stats?.active_customers || 0}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-purple-500 flex-shrink-0">
                    <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pending Jobs</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 mt-1">
                      {stats?.pending_jobs || 0}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-orange-500 flex-shrink-0">
                    <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards with trends */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <KPICard
              title="Total Revenue"
              value={formatCurrency(stats?.total_revenue || 0)}
              change={12.5}
              icon={CurrencyDollarIcon}
              color="bg-green-500"
            />
            <KPICard
              title="Total Jobs"
              value={(stats?.total_jobs || 0).toString()}
              change={8.2}
              icon={WrenchScrewdriverIcon}
              color="bg-blue-500"
            />
            <KPICard
              title="Active Customers"
              value={(stats?.active_customers || 0).toString()}
              change={5.4}
              icon={UserGroupIcon}
              color="bg-purple-500"
            />
            <KPICard
              title="Pending Jobs"
              value={(stats?.pending_jobs || 0).toString()}
              change={-2.1}
              icon={TruckIcon}
              color="bg-orange-500"
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <RecentJobsCard />
            </div>
            <div>
              <QuickActionsCard />
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Completed Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {stats?.completed_jobs || 0}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {Math.round(((stats?.completed_jobs || 0) / (stats?.total_jobs || 1)) * 100)}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  {stats?.total_customers || 0}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {stats?.active_customers || 0} active customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Average Job Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency((stats?.total_revenue || 0) / (stats?.total_jobs || 1))}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Per completed job
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}