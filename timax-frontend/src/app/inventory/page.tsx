'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  TagIcon,
  BuildingStorefrontIcon,
  MinusIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Define inventory interfaces
interface SKUCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface SKU {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  category_name: string;
  unit: string;
  cost: string;
  selling_price_per_unit?: string | null;
  min_stock_level: string;
  max_stock_level: string | null;
  reorder_point: string;
  lead_time_days: number;
  supplier: string;
  supplier_name: string;
  batch_tracked: boolean;
  current_stock: number;
  stock_value: number;
  reorder_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StockLocation {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

// Add inventory API methods
const inventoryApi = {
  getSKUs: async (params?: { search?: string; category?: string }) => {
    const response = await apiClient.get<{results: SKU[], count: number}>('/inventory/skus/', params);
    return response.results || [];
  },

  getSKUCategories: async () => {
    const response = await apiClient.get<{results: SKUCategory[]}>('/inventory/sku-categories/');
    return response.results || response;
  },

  createSKU: (data: Partial<SKU>) =>
    apiClient.post<SKU>('/inventory/skus/', data),

  updateSKU: (id: string, data: Partial<SKU>) =>
    apiClient.patch<SKU>(`/inventory/skus/${id}/`, data),

  getStockLocations: () =>
    apiClient.get<StockLocation[]>('/inventory/stock-locations/'),

  adjustStock: (skuId: string, data: {
    adjustment_type: 'IN' | 'OUT';
    quantity: number;
    reason: string;
    notes?: string;
  }) => apiClient.post(`/inventory/skus/${skuId}/adjust-stock/`, data),
};

interface SKUModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: SKU | null;
  onSuccess: () => void;
}

function SKUModal({ isOpen, onClose, sku, onSuccess }: SKUModalProps) {
  const [formData, setFormData] = useState({
    sku_code: sku?.sku_code || '',
    name: sku?.name || '',
    description: sku?.description || '',
    category: sku?.category || '',
    unit_price: sku?.unit_price || 0,
    reorder_level: sku?.reorder_level || 10,
  });

  const queryClient = useQueryClient();

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['sku-categories'],
    queryFn: () => inventoryApi.getSKUCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SKU>) => inventoryApi.createSKU(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      onSuccess();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SKU>) => inventoryApi.updateSKU(sku!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sku) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-lg transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {sku ? 'Edit SKU' : 'Add New SKU'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU Code *
              </label>
              <input
                type="text"
                required
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="SKU001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                {Array.isArray(categories) && categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Product description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {sku ? 'Update' : 'Add'} SKU
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function getStockStatus(currentStock: number, reorderLevel: number) {
  if (currentStock === 0) {
    return { status: 'out-of-stock', color: 'bg-red-100 text-red-800', text: 'Out of Stock' };
  } else if (currentStock <= reorderLevel) {
    return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
  }
  return { status: 'in-stock', color: 'bg-green-100 text-green-800', text: 'In Stock' };
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: SKU | null;
  onSuccess: () => void;
}

function StockAdjustmentModal({ isOpen, onClose, sku, onSuccess }: StockAdjustmentModalProps) {
  const [formData, setFormData] = useState({
    adjustment_type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    reason: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const adjustStockMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.adjustStock(sku!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      onSuccess();
      onClose();
      setFormData({ adjustment_type: 'IN', quantity: '', reason: '', notes: '' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !formData.quantity || !formData.reason) return;

    adjustStockMutation.mutate({
      ...formData,
      quantity: parseInt(formData.quantity)
    });
  };

  if (!isOpen || !sku) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Adjust Stock - {sku.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Current Stock: {sku.current_stock} {sku.unit}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="IN"
                    checked={formData.adjustment_type === 'IN'}
                    onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value as 'IN' | 'OUT' })}
                    className="mr-2"
                  />
                  <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
                  Stock In
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="OUT"
                    checked={formData.adjustment_type === 'OUT'}
                    onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value as 'IN' | 'OUT' })}
                    className="mr-2"
                  />
                  <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
                  Stock Out
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <select
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a reason</option>
                {formData.adjustment_type === 'IN' ? (
                  <>
                    <option value="purchase">Purchase/Received</option>
                    <option value="return">Customer Return</option>
                    <option value="transfer_in">Transfer In</option>
                    <option value="adjustment">Inventory Adjustment</option>
                    <option value="other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="sale">Sale/Used</option>
                    <option value="damage">Damaged</option>
                    <option value="expired">Expired</option>
                    <option value="transfer_out">Transfer Out</option>
                    <option value="adjustment">Inventory Adjustment</option>
                    <option value="other">Other</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes (optional)"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={adjustStockMutation.isPending}
                className={formData.adjustment_type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {formData.adjustment_type === 'IN' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockSKU, setStockSKU] = useState<SKU | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    adjustment_type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    reason: '',
    notes: ''
  });

  // Check if user can manage inventory (not a sales agent)
  const canManageInventory = user && ['ADMIN', 'MANAGER', 'INVENTORY_CLERK'].includes(user.role);

  // Fetch data
  const { data: skus, isLoading, refetch } = useQuery({
    queryKey: ['skus', searchTerm, categoryFilter],
    queryFn: () => inventoryApi.getSKUs({
      search: searchTerm || undefined,
      category: categoryFilter || undefined,
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['sku-categories'],
    queryFn: () => inventoryApi.getSKUCategories(),
  });

  const handleEdit = (sku: SKU) => {
    setSelectedSKU(sku);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    // Navigate to the new SKU creation page
    window.location.href = '/inventory/new';
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSKU(null);
  };

  const handleStockAdjustment = (sku: SKU) => {
    setStockSKU(sku);
    setIsStockModalOpen(true);
  };

  const handleCloseStockModal = () => {
    setIsStockModalOpen(false);
    setStockSKU(null);
    setStockAdjustment({ adjustment_type: 'IN', quantity: '', reason: '', notes: '' });
  };

  const lowStockCount = Array.isArray(skus) ? skus.filter(sku =>
    sku.current_stock <= parseFloat(sku.reorder_point) && sku.current_stock > 0
  ).length : 0;

  const outOfStockCount = Array.isArray(skus) ? skus.filter(sku =>
    sku.current_stock === 0
  ).length : 0;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Inventory"
            description="Manage your product inventory and stock levels"
            breadcrumbs={[
              { label: 'Inventory' }
            ]}
            actions={
              canManageInventory && (
                <Button onClick={handleAdd}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add SKU</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )
            }
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CubeIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total SKUs</p>
                    <p className="text-2xl font-bold text-gray-900">{Array.isArray(skus) ? skus.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TagIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{Array.isArray(categories) ? categories.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by SKU code, name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex gap-2">
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SKUs Data Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reorder Point
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(skus) && skus.map((sku) => {
                        const stockStatus = getStockStatus(sku.current_stock, parseFloat(sku.reorder_point));
                        return (
                          <tr key={sku.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <CubeIcon className="h-4 w-4 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {sku.code}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                <button
                                  onClick={() => window.location.href = `/inventory/${sku.id}`}
                                  className="hover:text-blue-600 hover:underline text-left"
                                >
                                  {sku.name}
                                </button>
                              </div>
                              {sku.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs" title={sku.description}>
                                  {sku.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sku.category_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {sku.current_stock} {sku.unit}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(parseFloat(sku.cost))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(sku.stock_value)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {sku.reorder_point} {sku.unit}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                                {stockStatus.text}
                              </span>
                              {sku.reorder_status && sku.reorder_status !== 'OK' && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {sku.reorder_status}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{sku.supplier_name}</div>
                              <div className="text-sm text-gray-500">Lead: {sku.lead_time_days} days</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                {canManageInventory && (
                                  <>
                                    <button
                                      onClick={() => handleStockAdjustment(sku)}
                                      className="text-green-600 hover:text-green-900"
                                      title="Adjust Stock"
                                    >
                                      <ArrowUpIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => window.location.href = `/inventory/${sku.id}/edit`}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Edit SKU"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => window.location.href = `/inventory/${sku.id}`}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="View Details"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empty State */}
          {!isLoading && Array.isArray(skus) && skus.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No SKUs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || categoryFilter
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by adding your first SKU.'}
                </p>
                {!searchTerm && !categoryFilter && canManageInventory && (
                  <div className="mt-6">
                    <Button onClick={handleAdd}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add SKU
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modals */}
          {selectedSKU && (
            <SKUModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              sku={selectedSKU}
              onSuccess={() => refetch()}
            />
          )}

          <StockAdjustmentModal
            isOpen={isStockModalOpen}
            onClose={handleCloseStockModal}
            sku={stockSKU}
            onSuccess={() => refetch()}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}