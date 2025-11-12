'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import PageHeader from '@/components/ui/PageHeader'
import { MaintenanceList } from '@/components/assets/MaintenanceList'
import { MaintenanceModal } from '@/components/assets/MaintenanceModal'
import { MaintenanceSchedule } from '@/components/assets/MaintenanceSchedule'
import { apiClient, Asset } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const assetId = params.id as string

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)

  // Fetch asset details
  const {
    data: asset,
    isLoading,
    error
  } = useQuery<Asset>({
    queryKey: ['asset', assetId],
    queryFn: () => apiClient.getAsset(assetId),
    enabled: !!assetId,
  })

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: () => apiClient.deleteAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetSummary'] })
      router.push('/assets')
    },
  })

  // Calculate depreciation mutation
  const calculateDepreciationMutation = useMutation({
    mutationFn: () => apiClient.post(`/assets/assets/${assetId}/calculate_depreciation/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    },
  })

  const handleDelete = () => {
    deleteAssetMutation.mutate()
    setShowDeleteConfirm(false)
  }

  const handleMaintenanceSave = (maintenanceData: any) => {
    // The MaintenanceModal handles saving internally
    setShowMaintenanceModal(false)
  }

  if (isLoading) {
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

  if (error || !asset) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Asset not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The asset you're looking for doesn't exist or has been deleted.
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'DISPOSED':
      case 'SOLD':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800'
      case 'GOOD':
        return 'bg-blue-100 text-blue-800'
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800'
      case 'POOR':
      case 'NEEDS_REPAIR':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const depreciationPercentage = asset.purchase_cost && parseFloat(asset.purchase_cost) > 0
    ? ((parseFloat(asset.purchase_cost) - parseFloat(asset.current_book_value || '0')) / parseFloat(asset.purchase_cost)) * 100
    : 0

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title={`${asset.asset_number} - ${asset.name}`}
            description={`${asset.category_name} • Created ${formatDate(asset.created_at)}`}
            breadcrumbs={[
              { label: 'Assets', href: '/assets' },
              { label: asset.asset_number }
            ]}
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => calculateDepreciationMutation.mutate()}
                  disabled={calculateDepreciationMutation.isPending}
                  size="sm"
                  className="flex items-center"
                >
                  <ArrowPathIcon className={`h-4 w-4 sm:mr-2 ${calculateDepreciationMutation.isPending ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Recalculate</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowMaintenanceModal(true)}
                  size="sm"
                  className="flex items-center"
                >
                  <WrenchScrewdriverIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Maintenance</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Link href={`/assets/${asset.id}/edit`}>
                  <Button size="sm" className="flex items-center">
                    <PencilIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status & Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-1 ${getStatusColor(asset.status)}`}>
                        {asset.status_display}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Condition</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getConditionColor(asset.condition)}`}>
                        {asset.condition_display}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Age</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {asset.age_in_years?.toFixed(1)} years
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Depreciated</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {depreciationPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {asset.description && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                      <p className="text-gray-900">{asset.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Asset Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <p className="text-gray-900">{asset.category_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Manufacturer</p>
                        <p className="text-gray-900">{asset.manufacturer || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Model</p>
                        <p className="text-gray-900">{asset.model || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Serial Number</p>
                        <p className="text-gray-900">{asset.serial_number || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="text-gray-900">{asset.location || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Department</p>
                        <p className="text-gray-900">{asset.department || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Assigned To</p>
                        <p className="text-gray-900">{asset.assigned_to_name || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Warranty Expires</p>
                        <p className="text-gray-900">
                          {asset.warranty_expiry ? formatDate(asset.warranty_expiry) : 'No warranty info'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {asset.tags && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {asset.tags.split(',').map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {asset.notes && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
                      <p className="text-gray-900 whitespace-pre-line">{asset.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance History */}
              <MaintenanceList assetId={assetId} assetName={asset.name} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Purchase Cost</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(parseFloat(asset.purchase_cost || '0'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Book Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(parseFloat(asset.current_book_value || '0'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Accumulated Depreciation</p>
                    <p className="text-xl font-semibold text-red-600">
                      {formatCurrency(parseFloat(asset.accumulated_depreciation || '0'))}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Monthly Depreciation</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(parseFloat(asset.monthly_depreciation || '0'))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Annual Depreciation</p>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(parseFloat(asset.annual_depreciation || '0'))}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Depreciation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Purchase Date</p>
                    <p className="text-gray-900">{formatDate(asset.purchase_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Useful Life</p>
                    <p className="text-gray-900">{asset.useful_life_years} years</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Depreciation Method</p>
                    <p className="text-gray-900">{asset.depreciation_method_display}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Salvage Value</p>
                    <p className="text-gray-900">
                      {formatCurrency(parseFloat(asset.salvage_value || '0'))}
                    </p>
                  </div>
                  {asset.last_depreciation_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Depreciation</p>
                      <p className="text-gray-900">{formatDate(asset.last_depreciation_date)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance Schedule */}
              <MaintenanceSchedule assetId={assetId} />
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete Asset</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this asset? This action cannot be undone and will
                remove all associated records including depreciation history.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteAssetMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteAssetMutation.isPending ? 'Deleting...' : 'Delete Asset'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Modal */}
        <MaintenanceModal
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          maintenance={null}
          assetId={assetId}
          onSave={handleMaintenanceSave}
          mode="create"
        />
      </Layout>
    </ProtectedRoute>
  )
}