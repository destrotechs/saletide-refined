'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  TagIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import { apiClient, Asset, AssetCategory } from '@/lib/api'
import { format } from 'date-fns'
import Link from 'next/link'

export default function EditAssetPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const assetId = params.id as string

  // Form state
  const [formData, setFormData] = useState<Partial<Asset>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch asset details
  const {
    data: asset,
    isLoading: assetLoading,
    error: assetError
  } = useQuery<Asset>({
    queryKey: ['asset', assetId],
    queryFn: () => apiClient.getAsset(assetId),
    enabled: !!assetId,
  })

  // Fetch categories
  const { data: categories = [] } = useQuery<AssetCategory[]>({
    queryKey: ['assetCategories'],
    queryFn: () => apiClient.getAssetCategories(),
  })

  // Initialize form data when asset loads
  useEffect(() => {
    if (asset) {
      setFormData({
        ...asset,
        purchase_date: asset.purchase_date ? format(new Date(asset.purchase_date), 'yyyy-MM-dd') : '',
        warranty_expiry: asset.warranty_expiry ? format(new Date(asset.warranty_expiry), 'yyyy-MM-dd') : '',
      })
    }
  }, [asset])

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: (data: Partial<Asset>) => apiClient.updateAsset(assetId, data),
    onSuccess: (updatedAsset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetSummary'] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      router.push(`/assets/${assetId}`)
    },
    onError: (error: any) => {
      console.error('Asset update error:', error)
      setFormErrors(error.response?.data || { general: 'Failed to update asset' })
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

    updateAssetMutation.mutate(formData)
  }

  if (assetLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (assetError || !asset) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Asset not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The asset you're trying to edit doesn't exist or has been deleted.
            </p>
            <div className="mt-6">
              <Link href="/assets">
                <Button>
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Assets
                </Button>
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
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
            <Link href={`/assets/${assetId}`} className="hover:text-blue-600 transition-colors">
              {asset.asset_number}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Edit</span>
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
                  Edit Asset
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {asset.asset_number} - {asset.name}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-gray-50"
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Asset number cannot be changed</p>
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
                              <strong>Category settings:</strong> {selectedCategory.useful_life_years} years useful life,
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
                          <option value="DISPOSED">Disposed</option>
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
                          placeholder="Comma-separated tags"
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
                        disabled={updateAssetMutation.isPending}
                      >
                        {updateAssetMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
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