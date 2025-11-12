'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  ChartPieIcon,
  ClockIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  UserGroupIcon,
  HandRaisedIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import FinancialReport from '@/components/reports/FinancialReport';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  unit?: string;
}

function KPICard({ title, value, previousValue, change, trend, icon, color, unit }: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowTrendingUpIcon className="h-4 w-4" />;
    if (trend === 'down') return <ArrowTrendingDownIcon className="h-4 w-4" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' && unit === 'currency' ? formatCurrency(value) : value}
                {unit && unit !== 'currency' && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
              </p>
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        {previousValue && (
          <div className="mt-3 text-xs text-gray-500">
            vs. {typeof previousValue === 'number' && unit === 'currency' ? formatCurrency(previousValue) : previousValue} previous period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedChartPeriod, setSelectedChartPeriod] = useState('30d');
  const [selectedInterval, setSelectedInterval] = useState('day');
  const [showFinancialReport, setShowFinancialReport] = useState(false);

  // Fetch dashboard data for today's revenue
  const { data: dashboardStats, isLoading: dashboardStatsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
  });

  // Fetch analytics dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['analytics-dashboard', selectedPeriod],
    queryFn: () => apiClient.getAnalyticsDashboard({ period: selectedPeriod }),
  });

  // Fetch sales chart data
  const { data: salesChartData, isLoading: salesChartLoading } = useQuery({
    queryKey: ['sales-chart', selectedChartPeriod, selectedInterval],
    queryFn: () => apiClient.getSalesChart({ period: selectedChartPeriod, interval: selectedInterval }),
  });

  // Fetch insights data
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: () => apiClient.getAnalyticsInsights(),
  });

  // Fetch commissions, tips, advances for financial report
  const { data: commissions } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => apiClient.getCommissions(),
  });

  const { data: tips } = useQuery({
    queryKey: ['tips'],
    queryFn: () => apiClient.getTips(),
  });

  const { data: advances } = useQuery({
    queryKey: ['advances'],
    queryFn: () => apiClient.getAdvances(),
  });

  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  const intervalOptions = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Process status distribution for pie chart
  const statusDistribution = useMemo(() => {
    if (!insightsData?.status_distribution) return [];
    return insightsData.status_distribution.map((item: any, index: number) => ({
      name: item.status.replace('_', ' '),
      value: item.count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [insightsData]);

  // Process top services for bar chart
  const topServicesData = useMemo(() => {
    if (!insightsData?.top_services) return [];
    return insightsData.top_services.slice(0, 5).map((service: any) => {
      const serviceName = service.lines__service_variant__service__name || 'Unknown Service';
      const partName = service.lines__service_variant__part__name || 'Unknown Part';
      const fullName = `${serviceName} - ${partName}`;
      return {
        name: fullName.length > 20 ? fullName.slice(0, 20) + '...' : fullName,
        revenue: parseFloat(service.revenue || 0),
        count: service.count
      };
    });
  }, [insightsData]);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <PageHeader
            title="Reports & Analytics"
            description="Comprehensive business insights and performance metrics"
            breadcrumbs={[
              { label: 'Reports' }
            ]}
            actions={
              <>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {periodOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Button
                  onClick={() => refetchDashboard()}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <ArrowPathIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button
                  onClick={() => setShowFinancialReport(true)}
                  size="sm"
                  className="flex items-center"
                >
                  <PrinterIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Financial Report</span>
                  <span className="sm:hidden">Report</span>
                </Button>
              </>
            }
          />

          {/* KPI Cards */}
          {dashboardLoading || dashboardStatsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today's Revenue - Highlighted Card */}
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Today's Revenue</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(dashboardStats?.revenue_today || 0)}
                      </p>
                      <p className="text-green-100 text-sm mt-2">
                        From {dashboardStats?.jobs_today || 0} jobs completed today
                      </p>
                    </div>
                    <div className="p-4 bg-white bg-opacity-20 rounded-full">
                      <CurrencyDollarIcon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Standard KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Revenue"
                  value={dashboardData?.kpis?.revenue?.current || 0}
                  previousValue={dashboardData?.kpis?.revenue?.previous}
                  change={dashboardData?.kpis?.revenue?.change}
                  trend={dashboardData?.kpis?.revenue?.trend}
                  icon={<CurrencyDollarIcon className="h-6 w-6 text-white" />}
                  color="bg-green-500"
                  unit="currency"
                />
                <KPICard
                  title="Total Jobs"
                  value={dashboardData?.kpis?.jobs?.current || 0}
                  previousValue={dashboardData?.kpis?.jobs?.previous}
                  change={dashboardData?.kpis?.jobs?.change}
                  trend={dashboardData?.kpis?.jobs?.trend}
                  icon={<WrenchScrewdriverIcon className="h-6 w-6 text-white" />}
                  color="bg-blue-500"
                  unit="jobs"
                />
                <KPICard
                  title="Avg Job Value"
                  value={dashboardData?.kpis?.average_job_value?.current || 0}
                  previousValue={dashboardData?.kpis?.average_job_value?.previous}
                  change={dashboardData?.kpis?.average_job_value?.change}
                  trend={dashboardData?.kpis?.average_job_value?.trend}
                  icon={<ChartBarIcon className="h-6 w-6 text-white" />}
                  color="bg-purple-500"
                  unit="currency"
                />
                <KPICard
                  title="Completion Rate"
                  value={`${dashboardData?.kpis?.completion_rate?.current || 0}%`}
                  previousValue={`${dashboardData?.kpis?.completion_rate?.previous || 0}%`}
                  change={dashboardData?.kpis?.completion_rate?.change}
                  trend={dashboardData?.kpis?.completion_rate?.trend}
                  icon={<ClockIcon className="h-6 w-6 text-white" />}
                  color="bg-orange-500"
                />
                <KPICard
                  title="Total Expenses"
                  value={dashboardStats?.expenses?.total_expenses || 0}
                  icon={<BanknotesIcon className="h-6 w-6 text-white" />}
                  color="bg-red-500"
                  unit="currency"
                />
                <KPICard
                  title="Unpaid Commissions"
                  value={commissions?.results.filter((c: any) => c.payment_status === 'PENDING').reduce((sum: number, c: any) => sum + parseFloat(c.commission_amount), 0) || 0}
                  icon={<UserGroupIcon className="h-6 w-6 text-white" />}
                  color="bg-yellow-500"
                  unit="currency"
                />
                <KPICard
                  title="Unpaid Tips"
                  value={tips?.results.filter((t: any) => t.payment_status === 'PENDING').reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0}
                  icon={<HandRaisedIcon className="h-6 w-6 text-white" />}
                  color="bg-teal-500"
                  unit="currency"
                />
                <KPICard
                  title="Pending Advances"
                  value={advances?.results.filter((a: any) => a.approval_status === 'PENDING').reduce((sum: number, a: any) => sum + parseFloat(a.requested_amount), 0) || 0}
                  icon={<CurrencyDollarIcon className="h-6 w-6 text-white" />}
                  color="bg-indigo-500"
                  unit="currency"
                />
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <CardTitle className="text-xl font-semibold">Sales Performance</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Shows job counts by creation date and revenue by payment date</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={selectedChartPeriod}
                      onChange={(e) => setSelectedChartPeriod(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {periodOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={selectedInterval}
                      onChange={(e) => setSelectedInterval(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {intervalOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesChartLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-gray-500">Loading chart data...</div>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData?.data || []}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="label"
                          className="text-sm"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          yAxisId="revenue"
                          orientation="left"
                          className="text-sm"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          yAxisId="jobs"
                          orientation="right"
                          className="text-sm"
                          tick={{ fontSize: 12 }}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          yAxisId="revenue"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3B82F6"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                          name="Revenue"
                        />
                        <Area
                          yAxisId="jobs"
                          type="monotone"
                          dataKey="jobs"
                          stroke="#10B981"
                          fillOpacity={1}
                          fill="url(#colorJobs)"
                          name="Jobs"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Job Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-gray-500">Loading...</div>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Top Services by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-gray-500">Loading...</div>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topServicesData} layout="horizontal">
                        <XAxis type="number" className="text-sm" tick={{ fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          className="text-sm"
                          tick={{ fontSize: 10 }}
                          width={100}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {insightsData?.top_customers?.slice(0, 5).map((customer: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <UsersIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{customer.customer__name}</p>
                            <p className="text-sm text-gray-500">{customer.jobs_count} jobs</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(parseFloat(customer.total_spent || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-gray-500">Loading...</div>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={insightsData?.monthly_trends || []}>
                        <XAxis
                          dataKey="month"
                          className="text-sm"
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis className="text-sm" tick={{ fontSize: 12 }} />
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          name="Revenue"
                        />
                        <Line
                          type="monotone"
                          dataKey="jobs"
                          stroke="#10B981"
                          strokeWidth={2}
                          name="Jobs"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      Data from {dashboardData?.period?.start ? new Date(dashboardData.period.start).toLocaleDateString() : 'N/A'}
                      {' '} to {' '}
                      {dashboardData?.period?.end ? new Date(dashboardData.period.end).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="h-4 w-4" />
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p>Business Intelligence Dashboard</p>
                  <p className="text-xs text-gray-500">TIMAX Automotive Services</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Report Modal */}
        {showFinancialReport && (
          <FinancialReport onClose={() => setShowFinancialReport(false)} />
        )}
      </Layout>
    </ProtectedRoute>
  );
}