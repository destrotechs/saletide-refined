'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CubeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';

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
const newSKUApi = {
  getSKUCategories: async () => {
    const response = await apiClient.get<{results: SKUCategory[]}>('/inventory/sku-categories/');
    return response.results || response;
  },

  getSuppliers: async () => {
    const response = await apiClient.get<{results: Supplier[]}>('/inventory/suppliers/');
    return response.results || response;
  },

  createSKU: (data: SKUFormData) =>
    apiClient.post('/inventory/skus/', data),

  checkSKUCodeAvailability: (code: string) =>
    apiClient.get(`/inventory/skus/?search=${code}`)
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

export default function NewSKUPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  // Fetch categories and suppliers
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['sku-categories'],
    queryFn: newSKUApi.getSKUCategories,
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: newSKUApi.getSuppliers,
  });

  // Create SKU mutation
  const createSKUMutation = useMutation({
    mutationFn: newSKUApi.createSKU,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      setNotification({
        type: 'success',
        title: 'SKU Created Successfully',
        message: `${data.name} (${data.code}) has been added to your inventory.`
      });

      // Navigate back to inventory page after a delay
      setTimeout(() => {
        router.push('/inventory');
      }, 2000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          'Failed to create SKU. Please try again.';

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
        title: 'Error Creating SKU',
        message: errorMessage
      });
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

    createSKUMutation.mutate(apiData);
  };

  const generateSKUCode = () => {
    console.log('Generate button clicked');
    console.log('Categories:', categories);
    console.log('Selected category ID:', formData.category);
    console.log('Product name:', formData.name);

    const category = categories?.find(c => c.id === formData.category);
    console.log('Found category:', category);

    if (category && formData.name) {
      const prefix = category.code.toUpperCase();
      const namePart = formData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      const timestamp = Date.now().toString().slice(-4);
      const generated = `${prefix}-${namePart}${timestamp}`;
      console.log('Generated SKU:', generated);
      handleInputChange('code', generated);
    } else {
      console.log('Cannot generate - missing category or name');
      // Provide fallback generation
      if (formData.name) {
        const namePart = formData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
        const timestamp = Date.now().toString().slice(-4);
        const generated = `SKU-${namePart}${timestamp}`;
        console.log('Fallback generated SKU:', generated);
        handleInputChange('code', generated);
      }
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
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
                  Add New SKU
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Create a new inventory item for your system
                </p>
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
                        <div className="flex">
                          <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            placeholder="e.g., 3M-FILM001"
                            required
                          />
                          <Button
                            type="button"
                            onClick={generateSKUCode}
                            variant="outline"
                            className="rounded-l-none border-l-0"
                            disabled={!formData.name}
                          >
                            Generate
                          </Button>
                        </div>
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

              {/* Stock Management */}
              <div>
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
                    isLoading={createSKUMutation.isPending}
                    disabled={createSKUMutation.isPending}
                  >
                    {createSKUMutation.isPending ? 'Creating...' : 'Create SKU'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

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