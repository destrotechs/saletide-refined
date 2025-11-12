'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  RectangleStackIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PencilIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { AssetsTable } from '@/components/assets/AssetsTable';
import { apiClient, Asset, AssetCategory, AssetMaintenance } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';


interface AssetSummary {
  total_assets: number;
  total_purchase_cost: string;
  total_book_value: string;
  total_accumulated_depreciation: string;
  monthly_depreciation: string;
  depreciation_percentage: number;
  recent_assets_count: number;
  maintenance_due_count: number;
  fully_depreciated_count: number;
  categories: Array<{
    id: string;
    name: string;
    asset_count: number;
    total_value: string;
  }>;
}

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const queryClient = useQueryClient();

  // Fetch assets summary
  const { data: summary, isLoading: summaryLoading } = useQuery<AssetSummary>({
    queryKey: ['assetSummary'],
    queryFn: () => apiClient.getAssetSummary(),
  });

  // Fetch assets
  const { data: assets, isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ['assets', searchTerm, statusFilter, categoryFilter],
    queryFn: () => apiClient.getAssets({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    }),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<AssetCategory[]>({
    queryKey: ['assetCategories'],
    queryFn: () => apiClient.getAssetCategories(),
  });

  // Fetch maintenance data for card view
  const { data: allMaintenance = [] } = useQuery<AssetMaintenance[]>({
    queryKey: ['allAssetMaintenance'],
    queryFn: () => apiClient.getAssetMaintenance(),
    enabled: assets && assets.length > 0 && viewMode === 'cards',
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DISPOSED':
      case 'SOLD':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'LOST':
      case 'STOLEN':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800';
      case 'GOOD':
        return 'bg-blue-100 text-blue-800';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800';
      case 'POOR':
      case 'NEEDS_REPAIR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepreciationTrendIcon = (percentage: number) => {
    if (percentage > 70) {
      return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />;
    } else if (percentage > 40) {
      return <ArrowTrendingUpIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return <ChartBarIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getMaintenanceStatus = (assetId: string) => {
    const assetMaintenance = allMaintenance.filter(m => m.asset === assetId);
    const today = new Date();

    const activeMaintenance = assetMaintenance.find(m => m.status === 'in_progress');
    const scheduledMaintenance = assetMaintenance.filter(m =>
      m.status === 'scheduled' || (m.next_maintenance && new Date(m.next_maintenance) > today)
    );
    const overdueMaintenance = assetMaintenance.filter(m =>
      m.next_maintenance && new Date(m.next_maintenance) < today && m.status !== 'completed'
    );

    if (activeMaintenance) {
      return {
        status: 'under_maintenance',
        icon: <WrenchScrewdriverIcon className="h-4 w-4" />,
        color: 'text-orange-600 bg-orange-50',
        text: 'Under Maintenance'
      };
    }

    if (overdueMaintenance.length > 0) {
      return {
        status: 'overdue',
        icon: <WrenchScrewdriverIcon className="h-4 w-4" />,
        color: 'text-red-600 bg-red-50',
        text: 'Maintenance Overdue'
      };
    }

    if (scheduledMaintenance.length > 0) {
      return {
        status: 'scheduled',
        icon: <ClockIcon className="h-4 w-4" />,
        color: 'text-blue-600 bg-blue-50',
        text: 'Maintenance Scheduled'
      };
    }

    return null;
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Asset Management"
            description="Track, manage, and monitor your business assets with automated depreciation"
            breadcrumbs={[
              { label: 'Assets' }
            ]}
            actions={
              <>
                <Button variant="outline" className="flex items-center">
                  <DocumentArrowDownIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Link href="/assets/create">
                  <Button className="flex items-center">
                    <PlusIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Asset</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </Link>
              </>
            }
          />

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total Assets</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">{summary.total_assets}</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {summary.recent_assets_count} added this month
                      </p>
                    </div>
                    <RectangleStackIcon className="h-12 w-12 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Book Value</p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {formatCurrency(parseFloat(summary.total_book_value))}
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Current market value
                      </p>
                    </div>
                    <CurrencyDollarIcon className="h-12 w-12 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Monthly Depreciation</p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {formatCurrency(parseFloat(summary.monthly_depreciation))}
                      </p>
                      <p className="text-sm text-purple-700 mt-1 flex items-center">
                        {getDepreciationTrendIcon(summary.depreciation_percentage)}
                        <span className="ml-1">{summary.depreciation_percentage.toFixed(1)}% depreciated</span>
                      </p>
                    </div>
                    <ChartBarIcon className="h-12 w-12 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Maintenance Due</p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">{summary.maintenance_due_count}</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Next 30 days
                      </p>
                    </div>
                    <WrenchScrewdriverIcon className="h-12 w-12 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Categories Overview */}
          {summary && Array.isArray(summary.categories) && summary.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TagIcon className="h-5 w-5 mr-2" />
                  Asset Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.categories.map((category) => (
                    <div
                      key={category.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setCategoryFilter(category.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.asset_count} assets</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(parseFloat(category.total_value))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assets by number, name, serial number, or manufacturer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DISPOSED">Disposed</option>
                    <option value="SOLD">Sold</option>
                    <option value="LOST">Lost</option>
                    <option value="STOLEN">Stolen</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">All Categories</option>
                    {Array.isArray(categories) && categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {/* View Mode Toggle */}
                  <div className="flex border border-gray-300 rounded-md overflow-hidden">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        viewMode === 'cards'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      title="Card View"
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                        viewMode === 'table'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      title="Table View"
                    >
                      <TableCellsIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assets Display */}
          {viewMode === 'table' ? (
            <AssetsTable assets={assets || []} isLoading={assetsLoading} />
          ) : (
            <>
              {/* Cards View */}
              {assetsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.isArray(assets) && assets.map((asset) => {
                    const maintenanceStatus = getMaintenanceStatus(asset.id);

                    return (
                      <Card key={asset.id} className="hover:shadow-lg transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {asset.asset_number}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.status)}`}>
                                  {asset.status_display}
                                </span>
                                {maintenanceStatus && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${maintenanceStatus.color}`}>
                                    {maintenanceStatus.icon}
                                    <span className="ml-1">{maintenanceStatus.text}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{asset.name}</h3>
                              <p className="text-sm text-gray-600 mb-2">{asset.category_name}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Book Value</p>
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(parseFloat(asset.current_book_value))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase Cost</p>
                                <p className="text-lg font-bold text-gray-900">
                                  {formatCurrency(parseFloat(asset.purchase_cost))}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600">
                                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                <span>Age: {asset.age_in_years.toFixed(1)} years</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                <span>Monthly: {formatCurrency(parseFloat(asset.monthly_depreciation))}</span>
                              </div>
                            </div>

                            {asset.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                                <span>{asset.location}</span>
                              </div>
                            )}

                            {asset.assigned_to_name && (
                              <div className="flex items-center text-sm text-gray-600">
                                <UserIcon className="h-4 w-4 mr-1" />
                                <span>Assigned to {asset.assigned_to_name}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(asset.condition)}`}>
                                {asset.condition_display}
                              </span>
                              <div className="flex space-x-2">
                                <Link href={`/assets/${asset.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center"
                                  >
                                    <EyeIcon className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Link href={`/assets/${asset.id}/edit`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center"
                                  >
                                    <PencilIcon className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {Array.isArray(assets) && assets.length === 0 && !assetsLoading && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || statusFilter || categoryFilter
                        ? "Try adjusting your search criteria."
                        : "Get started by adding your first asset."}
                    </p>
                    {!searchTerm && !statusFilter && !categoryFilter && (
                      <div className="mt-6">
                        <Link href="/assets/create">
                          <Button>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add First Asset
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}