'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  EyeIcon,
  PencilIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { apiClient, Asset, AssetMaintenance } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface AssetsTableProps {
  assets: Asset[]
  isLoading: boolean
}

interface MaintenanceStatus {
  hasActiveMaintenance: boolean
  hasScheduledMaintenance: boolean
  hasOverdueMaintenance: boolean
  nextMaintenanceDate?: string
  lastMaintenanceDate?: string
  maintenanceType?: string
}

export function AssetsTable({ assets, isLoading }: AssetsTableProps) {
  // Fetch maintenance data for all assets
  const { data: allMaintenance = [] } = useQuery<AssetMaintenance[]>({
    queryKey: ['allAssetMaintenance'],
    queryFn: () => apiClient.getAssetMaintenance(),
    enabled: assets && assets.length > 0,
  })

  const getMaintenanceStatus = (assetId: string): MaintenanceStatus => {
    const assetMaintenance = allMaintenance.filter(m => m.asset === assetId)
    const today = new Date()

    const activeMaintenance = assetMaintenance.find(m => m.status === 'in_progress')
    const scheduledMaintenance = assetMaintenance.filter(m =>
      m.status === 'scheduled' || (m.next_maintenance && new Date(m.next_maintenance) > today)
    )
    const overdueMaintenance = assetMaintenance.filter(m =>
      m.next_maintenance && new Date(m.next_maintenance) < today && m.status !== 'completed'
    )

    // Get the most recent maintenance
    const lastMaintenance = assetMaintenance
      .filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.maintenance_date).getTime() - new Date(a.maintenance_date).getTime())[0]

    // Get the next scheduled maintenance
    const nextMaintenance = scheduledMaintenance
      .sort((a, b) => {
        const aDate = a.next_maintenance ? new Date(a.next_maintenance) : new Date(a.maintenance_date)
        const bDate = b.next_maintenance ? new Date(b.next_maintenance) : new Date(b.maintenance_date)
        return aDate.getTime() - bDate.getTime()
      })[0]

    return {
      hasActiveMaintenance: !!activeMaintenance,
      hasScheduledMaintenance: scheduledMaintenance.length > 0,
      hasOverdueMaintenance: overdueMaintenance.length > 0,
      nextMaintenanceDate: nextMaintenance?.next_maintenance || nextMaintenance?.maintenance_date,
      lastMaintenanceDate: lastMaintenance?.maintenance_date,
      maintenanceType: nextMaintenance?.type || lastMaintenance?.type,
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800'
      case 'DISPOSED':
      case 'SOLD':
        return 'bg-gray-100 text-gray-800'
      case 'LOST':
      case 'STOLEN':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  const getMaintenanceStatusDisplay = (status: MaintenanceStatus) => {
    if (status.hasActiveMaintenance) {
      return (
        <div className="flex items-center text-orange-600">
          <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Under Maintenance</span>
        </div>
      )
    }

    if (status.hasOverdueMaintenance) {
      return (
        <div className="flex items-center text-red-600">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Maintenance Overdue</span>
        </div>
      )
    }

    if (status.hasScheduledMaintenance) {
      return (
        <div className="flex items-center text-blue-600">
          <ClockIcon className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Maintenance Scheduled</span>
        </div>
      )
    }

    if (status.lastMaintenanceDate) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Up to Date</span>
        </div>
      )
    }

    return (
      <div className="flex items-center text-gray-500">
        <span className="text-xs">No maintenance records</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category & Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Financial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location & Assignment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Maintenance Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condition
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assets.map((asset) => {
              const maintenanceStatus = getMaintenanceStatus(asset.id)
              const depreciationPercentage = asset.purchase_cost && parseFloat(asset.purchase_cost) > 0
                ? ((parseFloat(asset.purchase_cost) - parseFloat(asset.current_book_value)) / parseFloat(asset.purchase_cost)) * 100
                : 0

              return (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {asset.asset_number}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                        {asset.manufacturer && (
                          <div className="text-xs text-gray-500">{asset.manufacturer} {asset.model}</div>
                        )}
                        {asset.serial_number && (
                          <div className="text-xs text-gray-500">S/N: {asset.serial_number}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900 mb-1">{asset.category_name}</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                        {asset.status_display}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Book Value: {formatCurrency(parseFloat(asset.current_book_value))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Purchase: {formatCurrency(parseFloat(asset.purchase_cost))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Depreciated: {depreciationPercentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Age: {asset.age_in_years.toFixed(1)} years
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {asset.location && (
                        <div className="flex items-center text-sm text-gray-900 mb-1">
                          <BuildingOfficeIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {asset.location}
                        </div>
                      )}
                      {asset.assigned_to_name && (
                        <div className="flex items-center text-xs text-gray-500">
                          <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {asset.assigned_to_name}
                        </div>
                      )}
                      {asset.department && (
                        <div className="text-xs text-gray-500">
                          Dept: {asset.department}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {getMaintenanceStatusDisplay(maintenanceStatus)}
                      {maintenanceStatus.nextMaintenanceDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Next: {formatDate(maintenanceStatus.nextMaintenanceDate)}
                        </div>
                      )}
                      {maintenanceStatus.lastMaintenanceDate && !maintenanceStatus.nextMaintenanceDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last: {formatDate(maintenanceStatus.lastMaintenanceDate)}
                        </div>
                      )}
                      {maintenanceStatus.maintenanceType && (
                        <div className="text-xs text-gray-500 capitalize mt-1">
                          Type: {maintenanceStatus.maintenanceType}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(asset.condition)}`}>
                      {asset.condition_display}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Purchased {formatDate(asset.purchase_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {(!assets || assets.length === 0) && (
        <div className="text-center py-12">
          <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or add a new asset.
          </p>
        </div>
      )}
    </div>
  )
}