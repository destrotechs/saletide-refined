'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  PencilIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  TagIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  TrashIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface StockByLocation {
  location_id: string;
  location_name: string;
  quantity: number;
  value: number;
}

interface RecentMovement {
  date: string;
  type: string;
  quantity_change: number;
  location: string;
  reason: string;
}

interface SKU {
  id: string;
  code: string;
  name: string;
  description: string;
  category_name: string;
  unit: string;
  cost: string;
  selling_price_per_unit?: string | null;
  stock_by_location: StockByLocation[];
  recent_movements: RecentMovement[];
  min_stock_level: string;
  max_stock_level?: string | null;
  reorder_point: string;
  lead_time_days?: number;
  supplier_name?: string;
  batch_tracked?: boolean;
  reorder_status?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface StockMovement {
  id: string;
  transaction_type: string;
  quantity_change: number;
  reason: string;
  created_by_name: string;
  created_at: string;
}

// API methods
const skuApi = {
  getSKU: (id: string) => apiClient.get<SKU>(`/inventory/skus/${id}/`),
  getStockMovements: (skuId: string) =>
    apiClient.get<{results: StockMovement[]}>(`/inventory/stock-ledger/?sku=${skuId}`),
  deleteSKU: (id: string) => apiClient.delete(`/inventory/skus/${id}/`),
  adjustStock: (skuId: string, data: {
    adjustment_type: 'IN' | 'OUT';
    quantity: number;
    reason: string;
    notes?: string;
  }) => apiClient.post(`/inventory/skus/${skuId}/adjust-stock/`, data),
};

// Helper functions
function getTotalStock(stockByLocation: StockByLocation[]): number {
  return stockByLocation.reduce((total, location) => total + location.quantity, 0);
}

function getTotalStockValue(stockByLocation: StockByLocation[]): number {
  return stockByLocation.reduce((total, location) => total + location.value, 0);
}

function getStockStatus(currentStock: number, reorderPoint: number) {
  if (currentStock === 0) {
    return { status: 'out-of-stock', color: 'bg-red-100 text-red-800 border-red-200', text: 'Out of Stock', icon: ExclamationTriangleIcon };
  } else if (currentStock <= reorderPoint) {
    return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Low Stock', icon: ExclamationTriangleIcon };
  }
  return { status: 'in-stock', color: 'bg-green-100 text-green-800 border-green-200', text: 'In Stock', icon: CheckCircleIcon };
}

function InfoField({ label, value, icon: Icon, className = "" }: {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <dt className="text-sm font-medium text-gray-500 flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-1" />}
        {label}
      </dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-1" />
            )}
            {item.href ? (
              <a
                href={item.href}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-sm text-gray-500">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function SKUViewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  // Check if user can manage inventory (not a sales agent)
  const canManageInventory = user && ['ADMIN', 'MANAGER', 'INVENTORY_CLERK'].includes(user.role);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({
    adjustment_type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    reason: '',
    notes: ''
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch SKU data
  const { data: sku, isLoading, error } = useQuery({
    queryKey: ['sku', id],
    queryFn: () => skuApi.getSKU(id),
    enabled: !!id,
  });

  // Fetch stock movements
  const { data: stockMovements } = useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => skuApi.getStockMovements(id),
    enabled: !!id,
  });

  // Delete mutation
  const deleteSKUMutation = useMutation({
    mutationFn: () => skuApi.deleteSKU(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      router.push('/inventory');
    },
  });

  // Stock adjustment mutation
  const adjustStockMutation = useMutation({
    mutationFn: () => skuApi.adjustStock(id, {
      adjustment_type: stockAdjustment.adjustment_type,
      quantity: parseInt(stockAdjustment.quantity),
      reason: stockAdjustment.reason,
      notes: stockAdjustment.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sku', id] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', id] });
      setShowStockAdjustment(false);
      setStockAdjustment({
        adjustment_type: 'IN',
        quantity: '',
        reason: '',
        notes: ''
      });
      setNotification({
        type: 'success',
        message: `Stock ${stockAdjustment.adjustment_type === 'IN' ? 'increased' : 'decreased'} successfully!`
      });
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to adjust stock. Please try again.'
      });
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    },
  });

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-12 text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">SKU Not Found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The requested inventory item could not be found.
                </p>
                <div className="mt-6">
                  <Button onClick={() => router.push('/inventory')}>
                    Back to Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-64 bg-gray-200 rounded"></div>
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-6">
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!sku) return null;

  // Calculate derived values
  const totalStock = getTotalStock(sku.stock_by_location);
  const totalStockValue = getTotalStockValue(sku.stock_by_location);
  const stockStatus = getStockStatus(totalStock, parseFloat(sku.reorder_point || '0'));
  const StatusIcon = stockStatus.icon;

  const breadcrumbItems = [
    { label: 'Inventory', href: '/inventory' },
    { label: sku.name }
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Notification */}
          {notification && (
            <div className={`rounded-md p-4 ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {notification.type === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button
                      type="button"
                      onClick={() => setNotification(null)}
                      className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        notification.type === 'success'
                          ? 'text-green-500 hover:bg-green-100 focus:ring-green-600'
                          : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                      }`}
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="space-y-4">
            <Breadcrumbs items={breadcrumbItems} />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
                    {sku.name}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    SKU: {sku.code} • {sku.category_name}
                  </p>
                </div>
              </div>

              {canManageInventory && (
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/inventory/${id}/edit`)}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField
                      label="SKU Code"
                      value={sku.code}
                      icon={TagIcon}
                    />
                    <InfoField
                      label="Product Name"
                      value={sku.name}
                      icon={CubeIcon}
                    />
                    <InfoField
                      label="Category"
                      value={sku.category_name}
                    />
                    <InfoField
                      label="Unit of Measurement"
                      value={sku.unit}
                    />
                    <InfoField
                      label="Cost per Unit"
                      value={formatCurrency(parseFloat(sku.cost))}
                    />
                    {sku.selling_price_per_unit && (
                      <InfoField
                        label="Selling Price per Unit"
                        value={formatCurrency(parseFloat(sku.selling_price_per_unit))}
                      />
                    )}
                    <InfoField
                      label="Supplier"
                      value={sku.supplier_name || 'Not assigned'}
                      icon={BuildingStorefrontIcon}
                    />
                    {sku.description && (
                      <InfoField
                        label="Description"
                        value={sku.description}
                        className="md:col-span-2"
                      />
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Stock Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Stock Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField
                      label="Current Stock"
                      value={`${totalStock} ${sku.unit}`}
                    />
                    <InfoField
                      label="Stock Value"
                      value={formatCurrency(totalStockValue)}
                    />
                    <InfoField
                      label="Minimum Stock Level"
                      value={`${sku.min_stock_level} ${sku.unit}`}
                    />
                    <InfoField
                      label="Maximum Stock Level"
                      value={sku.max_stock_level ? `${sku.max_stock_level} ${sku.unit}` : 'Not set'}
                    />
                    <InfoField
                      label="Reorder Point"
                      value={`${sku.reorder_point} ${sku.unit}`}
                    />
                    <InfoField
                      label="Lead Time"
                      value={sku.lead_time_days ? `${sku.lead_time_days} days` : 'Not set'}
                      icon={ClockIcon}
                    />
                  </dl>
                </CardContent>
              </Card>

              {/* Recent Stock Movements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Recent Stock Movements</CardTitle>
                </CardHeader>
                <CardContent>
                  {sku.recent_movements && sku.recent_movements.length > 0 ? (
                    <div className="space-y-3">
                      {sku.recent_movements.slice(0, 5).map((movement, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {movement.quantity_change > 0 ? (
                              <ArrowUpIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <ArrowDownIcon className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {movement.type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {movement.reason} • {formatDate(movement.date)} • {movement.location}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change} {sku.unit}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No stock movements recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Status & Actions */}
            <div className="space-y-6">
              {/* Stock Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Stock Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-center justify-between p-3 border rounded-lg ${stockStatus.color}`}>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="h-5 w-5" />
                      <span className="font-medium">{stockStatus.text}</span>
                    </div>
                  </div>

                  {sku.reorder_status && sku.reorder_status !== 'OK' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800 font-medium">
                        Reorder Status: {sku.reorder_status}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Current Stock:</span>
                      <span className="font-medium text-gray-900">{totalStock} {sku.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Reorder Point:</span>
                      <span className="font-medium text-gray-900">{sku.reorder_point} {sku.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Min Level:</span>
                      <span className="font-medium text-gray-900">{sku.min_stock_level} {sku.unit}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              {canManageInventory && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setShowStockAdjustment(true)}
                    >
                      <ArrowUpIcon className="h-4 w-4 mr-2" />
                      Adjust Stock
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => router.push(`/inventory/${id}/edit`)}
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Item Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoField
                    label="Status"
                    value={
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sku.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sku.is_active ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <InfoField
                    label="Batch Tracked"
                    value={sku.batch_tracked ? 'Yes' : 'No'}
                  />
                  {sku.created_at && (
                    <InfoField
                      label="Created"
                      value={formatDate(sku.created_at)}
                      icon={CalendarDaysIcon}
                    />
                  )}
                  {sku.updated_at && (
                    <InfoField
                      label="Last Updated"
                      value={formatDate(sku.updated_at)}
                      icon={CalendarDaysIcon}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(false)} />
                <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
                  <div className="px-6 py-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Delete SKU
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Are you sure you want to delete "{sku.name}"? This action cannot be undone.
                    </p>
                    <div className="mt-6 flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => deleteSKUMutation.mutate()}
                        isLoading={deleteSKUMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stock Adjustment Modal */}
          {showStockAdjustment && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowStockAdjustment(false)} />
                <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
                  <div className="px-6 py-6">
                    <div className="flex items-center mb-4">
                      <ArrowUpIcon className="h-6 w-6 text-blue-600 mr-3" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Adjust Stock for {sku.name}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Current Stock Info */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Current Stock: <span className="font-medium text-gray-900">{totalStock} {sku.unit}</span>
                        </p>
                      </div>

                      {/* Adjustment Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adjustment Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setStockAdjustment({ ...stockAdjustment, adjustment_type: 'IN' })}
                            className={`px-4 py-2 text-sm font-medium rounded-md border ${
                              stockAdjustment.adjustment_type === 'IN'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            Stock In (+)
                          </button>
                          <button
                            type="button"
                            onClick={() => setStockAdjustment({ ...stockAdjustment, adjustment_type: 'OUT' })}
                            className={`px-4 py-2 text-sm font-medium rounded-md border ${
                              stockAdjustment.adjustment_type === 'OUT'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            Stock Out (-)
                          </button>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity ({sku.unit})
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={stockAdjustment.quantity}
                          onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter quantity"
                        />
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason
                        </label>
                        <select
                          value={stockAdjustment.reason}
                          onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select reason</option>
                          <option value="Purchase">Purchase</option>
                          <option value="Sale">Sale</option>
                          <option value="Return">Return</option>
                          <option value="Damage">Damage</option>
                          <option value="Loss">Loss</option>
                          <option value="Adjustment">Adjustment</option>
                          <option value="Transfer">Transfer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={stockAdjustment.notes}
                          onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Additional notes..."
                        />
                      </div>

                      {/* New Stock Calculation */}
                      {stockAdjustment.quantity && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800">
                            New Stock: <span className="font-medium">
                              {stockAdjustment.adjustment_type === 'IN'
                                ? totalStock + parseInt(stockAdjustment.quantity || '0')
                                : totalStock - parseInt(stockAdjustment.quantity || '0')
                              } {sku.unit}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowStockAdjustment(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => adjustStockMutation.mutate()}
                        isLoading={adjustStockMutation.isPending}
                        disabled={!stockAdjustment.quantity || !stockAdjustment.reason}
                        className="flex-1"
                      >
                        {stockAdjustment.adjustment_type === 'IN' ? 'Add Stock' : 'Remove Stock'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}