'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  RectangleStackIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  TagIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import { apiClient, Asset, AssetCategory } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default function CreateAssetPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Form state
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    asset_number: '',
    description: '',
    category: '',
    purchase_date: '',
    purchase_cost: '0',
    salvage_value: '0',
    useful_life_years: 5,
    depreciation_method: 'STRAIGHT_LINE',
    location: '',
    status: 'ACTIVE',
    serial_number: '',
    model: '',
    manufacturer: '',
    department: '',
    warranty_expiry: '',
    notes: '',
    tags: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch categories
  const { data: categories = [] } = useQuery<AssetCategory[]>({
    queryKey: ['assetCategories'],
    queryFn: () => apiClient.getAssetCategories(),
  })

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: (data: Partial<Asset>) => apiClient.createAsset(data),
    onSuccess: (newAsset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetSummary'] })
      router.push(`/assets/${newAsset.id}`)
    },
    onError: (error: any) => {
      console.error('Asset creation error:', error)
      setFormErrors(error.response?.data || { general: 'Failed to create asset' })
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    // Basic validation
    const errors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      errors.name = 'Asset name is required'
    }

    if (!formData.category) {
      errors.category = 'Category is required'
    }

    if (!formData.purchase_date) {
      errors.purchase_date = 'Purchase date is required'
    }

    if (!formData.purchase_cost || parseFloat(formData.purchase_cost) <= 0) {
      errors.purchase_cost = 'Purchase cost must be greater than 0'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    createAssetMutation.mutate(formData)
  }

  const selectedCategory = categories.find(cat => cat.id === formData.category)

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/assets" className="hover:text-blue-600 transition-colors">
              Assets
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Create New Asset</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <RectangleStackIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Create New Asset
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Add a new fixed asset to your inventory with depreciation tracking
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asset Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                            formErrors.name ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="e.g., Hydraulic Lift Model X200"
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asset Number
                        </label>
                        <input
                          type="text"
                          name="asset_number"
                          value={formData.asset_number || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Auto-generated if left blank"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate</p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description || ''}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Detailed description of the asset..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Classification */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TagIcon className="h-5 w-5 mr-2" />
                      Classification & Identification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          name="category"
                          value={formData.category || ''}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                            formErrors.category ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select category</option>
                          {Array.isArray(categories) && categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.category && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                        )}
                        {selectedCategory && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <p className="text-blue-800">
                              <strong>Default settings:</strong> {selectedCategory.useful_life_years} years useful life,
                              {' '}{selectedCategory.depreciation_method.replace('_', ' ').toLowerCase()} depreciation
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status || 'ACTIVE'}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="MAINTENANCE">In Maintenance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Manufacturer
                        </label>
                        <input
                          type="text"
                          name="manufacturer"
                          value={formData.manufacturer || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., John Deere"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Model
                        </label>
                        <input
                          type="text"
                          name="model"
                          value={formData.model || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., X200-HD"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Serial Number
                        </label>
                        <input
                          type="text"
                          name="serial_number"
                          value={formData.serial_number || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., SN123456789"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tags
                        </label>
                        <input
                          type="text"
                          name="tags"
                          value={formData.tags || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Comma-separated tags (e.g., heavy-duty, hydraulic)"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location & Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                      Location & Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., Main Shop - Bay 3"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g., Service Department"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Additional notes, maintenance history, or special instructions..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Date *
                      </label>
                      <input
                        type="date"
                        name="purchase_date"
                        value={formData.purchase_date || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                          formErrors.purchase_date ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.purchase_date && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.purchase_date}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Cost *
                      </label>
                      <input
                        type="number"
                        name="purchase_cost"
                        value={formData.purchase_cost || ''}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                          formErrors.purchase_cost ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                      {formErrors.purchase_cost && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.purchase_cost}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salvage Value
                      </label>
                      <input
                        type="number"
                        name="salvage_value"
                        value={formData.salvage_value || ''}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Estimated value at end of useful life</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Depreciation Method
                      </label>
                      <select
                        name="depreciation_method"
                        value={formData.depreciation_method || 'STRAIGHT_LINE'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="STRAIGHT_LINE">Straight Line</option>
                        <option value="DECLINING_BALANCE">Declining Balance</option>
                        <option value="DOUBLE_DECLINING">Double Declining Balance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Useful Life (Years)
                      </label>
                      <input
                        type="number"
                        name="useful_life_years"
                        value={formData.useful_life_years || ''}
                        onChange={handleChange}
                        min="1"
                        max="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Warranty Expires
                      </label>
                      <input
                        type="date"
                        name="warranty_expiry"
                        value={formData.warranty_expiry || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createAssetMutation.isPending}
                      >
                        {createAssetMutation.isPending ? 'Creating Asset...' : 'Create Asset'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => router.back()}
                      >
                        Cancel
                      </Button>
                    </div>

                    {formErrors.general && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{formErrors.general}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}