'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  CubeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface SKUCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
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

interface SKUFormData {
  code: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  cost: string;
  selling_price_per_unit: string;
  min_stock_level: string;
  max_stock_level: string;
  reorder_point: string;
  lead_time_days: string;
  supplier: string;
  batch_tracked: boolean;
  is_active: boolean;
}

// Unit choices from the backend model
const UNIT_CHOICES = [
  { value: 'ML', label: 'Milliliters' },
  { value: 'L', label: 'Liters' },
  { value: 'G', label: 'Grams' },
  { value: 'KG', label: 'Kilograms' },
  { value: 'PCS', label: 'Pieces' },
  { value: 'M', label: 'Meters' },
  { value: 'M2', label: 'Square Meters' },
  { value: 'ROLL', label: 'Roll' },
  { value: 'BOX', label: 'Box' },
  { value: 'PACK', label: 'Pack' },
];

// API methods
const editSKUApi = {
  getSKU: (id: string) => apiClient.get<SKU>(`/inventory/skus/${id}/`),
  getSKUCategories: async () => {
    const response = await apiClient.get<{results: SKUCategory[]}>('/inventory/sku-categories/');
    return response.results || response;
  },
  getSuppliers: async () => {
    const response = await apiClient.get<{results: Supplier[]}>('/inventory/suppliers/');
    return response.results || response;
  },
  updateSKU: (id: string, data: Partial<SKUFormData>) =>
    apiClient.patch(`/inventory/skus/${id}/`, data),
  adjustStock: (skuId: string, data: {
    adjustment_type: 'IN' | 'OUT';
    quantity: number;
    reason: string;
    notes?: string;
  }) => apiClient.post(`/inventory/skus/${skuId}/adjust-stock/`, data),
};

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  helpText?: string;
}

function FormField({ label, required = false, children, error, helpText }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {helpText && (
        <div className="flex items-start space-x-1">
          <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500">{helpText}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center space-x-1">
          <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

function Notification({ type, title, message, onClose }: NotificationProps) {
  const bgColor = type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-blue-50';
  const borderColor = type === 'success' ? 'border-green-200' : type === 'error' ? 'border-red-200' : 'border-blue-200';
  const iconColor = type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-blue-500';
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';

  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 border rounded-lg shadow-lg z-50 ${bgColor} ${borderColor}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {type === 'success' && <CheckCircleIcon className={`h-5 w-5 ${iconColor}`} />}
          {type === 'error' && <ExclamationCircleIcon className={`h-5 w-5 ${iconColor}`} />}
          {type === 'info' && <InformationCircleIcon className={`h-5 w-5 ${iconColor}`} />}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${textColor}`}>{title}</h3>
          <p className={`mt-1 text-sm ${textColor}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`ml-4 text-sm ${textColor} hover:opacity-75`}
        >
          ×
        </button>
      </div>
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

export default function EditSKUPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  // Check if user can manage inventory (not a sales agent)
  const canManageInventory = user && ['ADMIN', 'MANAGER', 'INVENTORY_CLERK'].includes(user.role);

  // Redirect sales agents
  useEffect(() => {
    if (user && !canManageInventory) {
      router.push(`/inventory/${id}`);
    }
  }, [user, canManageInventory, router, id]);

  const [formData, setFormData] = useState<SKUFormData>({
    code: '',
    name: '',
    description: '',
    category: '',
    unit: 'PCS',
    cost: '',
    selling_price_per_unit: '',
    min_stock_level: '0',
    max_stock_level: '',
    reorder_point: '10',
    lead_time_days: '1',
    supplier: '',
    batch_tracked: false,
    is_active: true,
  });

  const [errors, setErrors] = useState<Partial<SKUFormData>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Stock adjustment state
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({
    adjustment_type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    reason: '',
    notes: ''
  });

  // Fetch current SKU data
  const { data: sku, isLoading: skuLoading, error } = useQuery({
    queryKey: ['sku', id],
    queryFn: () => editSKUApi.getSKU(id),
    enabled: !!id,
  });

  // Fetch categories and suppliers
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['sku-categories'],
    queryFn: editSKUApi.getSKUCategories,
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: editSKUApi.getSuppliers,
  });

  // Update form data when SKU data loads
  useEffect(() => {
    if (sku) {
      setFormData({
        code: sku.code || '',
        name: sku.name || '',
        description: sku.description || '',
        category: sku.category || '',
        unit: sku.unit || 'PCS',
        cost: sku.cost || '0',
        selling_price_per_unit: sku.selling_price_per_unit || '',
        min_stock_level: sku.min_stock_level || '0',
        max_stock_level: sku.max_stock_level || '',
        reorder_point: sku.reorder_point || '10',
        lead_time_days: sku.lead_time_days?.toString() || '1',
        supplier: sku.supplier || '',
        batch_tracked: sku.batch_tracked || false,
        is_active: sku.is_active !== undefined ? sku.is_active : true,
      });
    }
  }, [sku]);

  // Update SKU mutation
  const updateSKUMutation = useMutation({
    mutationFn: (data: Partial<SKUFormData>) => editSKUApi.updateSKU(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['sku', id] });
      setNotification({
        type: 'success',
        title: 'SKU Updated Successfully',
        message: `${data.name} has been updated successfully.`
      });

      // Navigate back to view page after a delay
      setTimeout(() => {
        router.push(`/inventory/${id}`);
      }, 2000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          'Failed to update SKU. Please try again.';

      // Handle field-specific errors
      if (error.response?.data && typeof error.response.data === 'object') {
        const fieldErrors: Partial<SKUFormData> = {};
        Object.keys(error.response.data).forEach(key => {
          if (key in formData) {
            fieldErrors[key as keyof SKUFormData] = error.response.data[key][0] || error.response.data[key];
          }
        });
        setErrors(fieldErrors);
      }

      setNotification({
        type: 'error',
        title: 'Error Updating SKU',
        message: errorMessage
      });
    },
  });

  // Stock adjustment mutation
  const adjustStockMutation = useMutation({
    mutationFn: () => editSKUApi.adjustStock(id, {
      adjustment_type: stockAdjustment.adjustment_type,
      quantity: parseInt(stockAdjustment.quantity),
      reason: stockAdjustment.reason,
      notes: stockAdjustment.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sku', id] });
      setShowStockAdjustment(false);
      setStockAdjustment({
        adjustment_type: 'IN',
        quantity: '',
        reason: '',
        notes: ''
      });
      setNotification({
        type: 'success',
        title: 'Stock Adjustment Successful',
        message: `Stock ${stockAdjustment.adjustment_type === 'IN' ? 'increased' : 'decreased'} successfully!`
      });
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        title: 'Stock Adjustment Failed',
        message: error?.response?.data?.message || 'Failed to adjust stock. Please try again.'
      });
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const handleInputChange = (field: keyof SKUFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SKUFormData> = {};

    if (!formData.code.trim()) newErrors.code = 'SKU code is required';
    if (!formData.name.trim()) newErrors.name = 'SKU name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.cost || parseFloat(formData.cost) < 0) newErrors.cost = 'Valid cost is required';
    if (parseFloat(formData.min_stock_level) < 0) newErrors.min_stock_level = 'Min stock level cannot be negative';
    if (formData.max_stock_level && parseFloat(formData.max_stock_level) < parseFloat(formData.min_stock_level)) {
      newErrors.max_stock_level = 'Max stock level must be greater than min stock level';
    }
    if (parseFloat(formData.reorder_point) < 0) newErrors.reorder_point = 'Reorder point cannot be negative';
    if (parseInt(formData.lead_time_days) < 0) newErrors.lead_time_days = 'Lead time cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors in the form before submitting.'
      });
      return;
    }

    // Transform data for API
    const apiData = {
      ...formData,
      cost: parseFloat(formData.cost),
      min_stock_level: parseFloat(formData.min_stock_level),
      max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : null,
      reorder_point: parseFloat(formData.reorder_point),
      lead_time_days: parseInt(formData.lead_time_days),
      supplier: formData.supplier || null,
    };

    updateSKUMutation.mutate(apiData);
  };

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-12 text-center">
                <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
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

  if (skuLoading || !sku) {
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

  const breadcrumbItems = [
    { label: 'Inventory', href: '/inventory' },
    { label: sku.name, href: `/inventory/${id}` },
    { label: 'Edit' }
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
                    Edit {sku.name}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Update inventory item information
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="SKU Code"
                        required
                        error={errors.code}
                        helpText="Unique identifier for this item"
                      >
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          placeholder="e.g., 3M-FILM001"
                          required
                        />
                      </FormField>

                      <FormField
                        label="Category"
                        required
                        error={errors.category}
                      >
                        <select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          required
                          disabled={categoriesLoading}
                        >
                          <option value="">Select a category</option>
                          {Array.isArray(categories) && categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    <FormField
                      label="Product Name"
                      required
                      error={errors.name}
                    >
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="e.g., 3M Crystalline 35% VLT Film"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Description"
                      error={errors.description}
                    >
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="Detailed description of the product..."
                      />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="Unit of Measurement"
                        required
                        error={errors.unit}
                      >
                        <select
                          value={formData.unit}
                          onChange={(e) => handleInputChange('unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          required
                        >
                          {UNIT_CHOICES.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {unit.label} ({unit.value})
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        label="Cost per Unit ($)"
                        required
                        error={errors.cost}
                        helpText="Cost price for purchasing this item"
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.cost}
                          onChange={(e) => handleInputChange('cost', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          placeholder="0.00"
                          required
                        />
                      </FormField>

                      <FormField
                        label="Selling Price per Unit ($)"
                        error={errors.selling_price_per_unit}
                        helpText="Optional selling price per unit for inventory items"
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.selling_price_per_unit}
                          onChange={(e) => handleInputChange('selling_price_per_unit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                          placeholder="0.00"
                        />
                      </FormField>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stock Management & Quick Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900">Stock Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      label="Minimum Stock Level"
                      error={errors.min_stock_level}
                      helpText="Alert when stock falls below this level"
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_stock_level}
                        onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </FormField>

                    <FormField
                      label="Maximum Stock Level"
                      error={errors.max_stock_level}
                      helpText="Optional maximum stock limit"
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.max_stock_level}
                        onChange={(e) => handleInputChange('max_stock_level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="Optional"
                      />
                    </FormField>

                    <FormField
                      label="Reorder Point"
                      required
                      error={errors.reorder_point}
                      helpText="Trigger reordering at this stock level"
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.reorder_point}
                        onChange={(e) => handleInputChange('reorder_point', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        required
                      />
                    </FormField>

                    <FormField
                      label="Lead Time (Days)"
                      required
                      error={errors.lead_time_days}
                      helpText="Time to receive new stock"
                    >
                      <input
                        type="number"
                        min="0"
                        value={formData.lead_time_days}
                        onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        required
                      />
                    </FormField>
                  </CardContent>
                </Card>

                {/* Supplier Information */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Supplier & Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      label="Supplier"
                      error={errors.supplier}
                      helpText="Primary supplier for this item"
                    >
                      <select
                        value={formData.supplier}
                        onChange={(e) => handleInputChange('supplier', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        disabled={suppliersLoading}
                      >
                        <option value="">Select a supplier</option>
                        {Array.isArray(suppliers) && suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.batch_tracked}
                          onChange={(e) => handleInputChange('batch_tracked', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Batch Tracked</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => handleInputChange('is_active', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                {sku && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-gray-900">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        type="button"
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => setShowStockAdjustment(true)}
                      >
                        <ArrowUpIcon className="h-4 w-4 mr-2" />
                        Adjust Stock
                      </Button>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Current Stock: <span className="font-medium text-gray-900">{sku.current_stock} {sku.unit}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <Card className="mt-6">
              <CardContent className="py-4">
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={updateSKUMutation.isPending}
                    disabled={updateSKUMutation.isPending}
                  >
                    {updateSKUMutation.isPending ? 'Updating...' : 'Update SKU'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Stock Adjustment Modal */}
          {showStockAdjustment && sku && (
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
                          Current Stock: <span className="font-medium text-gray-900">{sku.current_stock} {sku.unit}</span>
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
                                ? sku.current_stock + parseInt(stockAdjustment.quantity || '0')
                                : sku.current_stock - parseInt(stockAdjustment.quantity || '0')
                              } {sku.unit}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowStockAdjustment(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
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

          {/* Notification */}
          {notification && (
            <Notification
              type={notification.type}
              title={notification.title}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}