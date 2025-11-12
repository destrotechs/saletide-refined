'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MaintenanceModal } from './MaintenanceModal'
import { apiClient, AssetMaintenance } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MaintenanceListProps {
  assetId: string
  assetName: string
}

export function MaintenanceList({ assetId, assetName }: MaintenanceListProps) {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<AssetMaintenance | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('create')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Fetch maintenance records
  const {
    data: maintenanceRecords,
    isLoading,
    error
  } = useQuery<AssetMaintenance[]>({
    queryKey: ['assetMaintenance', assetId],
    queryFn: () => apiClient.getAssetMaintenance({ asset: assetId }),
    enabled: !!assetId,
  })

  // Create maintenance mutation
  const createMaintenanceMutation = useMutation({
    mutationFn: (data: Partial<AssetMaintenance>) => apiClient.createAssetMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetMaintenance', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setIsModalOpen(false)
    },
  })

  // Update maintenance mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssetMaintenance> }) =>
      apiClient.patch(`/assets/maintenance/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetMaintenance', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setIsModalOpen(false)
    },
  })

  // Delete maintenance mutation
  const deleteMaintenanceMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/assets/maintenance/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetMaintenance', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setShowDeleteConfirm(null)
    },
  })

  const handleCreateNew = () => {
    setSelectedMaintenance(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleView = (maintenance: AssetMaintenance) => {
    setSelectedMaintenance(maintenance)
    setModalMode('view')
    setIsModalOpen(true)
  }

  const handleEdit = (maintenance: AssetMaintenance) => {
    setSelectedMaintenance(maintenance)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteMaintenanceMutation.mutate(id)
  }

  const handleSave = (data: Partial<AssetMaintenance>) => {
    if (modalMode === 'create') {
      createMaintenanceMutation.mutate({ ...data, asset: assetId })
    } else if (modalMode === 'edit' && selectedMaintenance) {
      updateMaintenanceMutation.mutate({ id: selectedMaintenance.id, data })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preventive':
        return 'bg-blue-100 text-blue-800'
      case 'corrective':
        return 'bg-orange-100 text-orange-800'
      case 'emergency':
        return 'bg-red-100 text-red-800'
      case 'routine':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive':
        return '🔧'
      case 'corrective':
        return '⚠️'
      case 'emergency':
        return '🚨'
      case 'routine':
        return '🔍'
      default:
        return '🛠️'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading maintenance records</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
              Maintenance History ({maintenanceRecords?.length || 0})
            </CardTitle>
            <Button
              onClick={handleCreateNew}
              className="flex items-center"
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Maintenance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!maintenanceRecords || maintenanceRecords.length === 0 ? (
            <div className="text-center py-8">
              <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance records</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first maintenance record.
              </p>
              <div className="mt-6">
                <Button onClick={handleCreateNew} className="flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add First Maintenance
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {maintenanceRecords.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getTypeIcon(maintenance.type)}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(maintenance.type)}`}>
                          {maintenance.type.charAt(0).toUpperCase() + maintenance.type.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(maintenance.status)}`}>
                          {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        {maintenance.description}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(maintenance.maintenance_date)}
                        </div>
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                          {formatCurrency(maintenance.cost)}
                        </div>
                        {maintenance.performed_by && (
                          <div className="flex items-center">
                            <span className="font-medium">By:</span>
                            <span className="ml-1">{maintenance.performed_by}</span>
                          </div>
                        )}
                      </div>

                      {maintenance.next_maintenance && (
                        <div className="mt-2 text-xs text-blue-600">
                          Next maintenance: {formatDate(maintenance.next_maintenance)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleView(maintenance)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(maintenance)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit maintenance"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(maintenance.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete maintenance"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Modal */}
      <MaintenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maintenance={selectedMaintenance}
        assetId={assetId}
        onSave={handleSave}
        mode={modalMode}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Maintenance Record</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this maintenance record? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deleteMaintenanceMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMaintenanceMutation.isPending ? 'Deleting...' : 'Delete Record'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}