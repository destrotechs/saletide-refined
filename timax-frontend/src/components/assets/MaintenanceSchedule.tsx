'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { apiClient, AssetMaintenance } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface MaintenanceScheduleProps {
  assetId: string
}

export function MaintenanceSchedule({ assetId }: MaintenanceScheduleProps) {
  const {
    data: maintenanceRecords,
    isLoading,
  } = useQuery<AssetMaintenance[]>({
    queryKey: ['assetMaintenance', assetId],
    queryFn: () => apiClient.getAssetMaintenance({ asset: assetId }),
    enabled: !!assetId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Maintenance Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  // Get the next scheduled maintenance
  const today = new Date()
  const upcomingMaintenance = maintenanceRecords
    ?.filter(record => record.next_maintenance && new Date(record.next_maintenance) > today)
    .sort((a, b) => new Date(a.next_maintenance!).getTime() - new Date(b.next_maintenance!).getTime())
    .slice(0, 3)

  // Get overdue maintenance
  const overdueMaintenance = maintenanceRecords
    ?.filter(record => record.next_maintenance && new Date(record.next_maintenance) < today)
    .length || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Maintenance Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueMaintenance > 0 && (
          <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-sm text-red-800">
              {overdueMaintenance} overdue maintenance{overdueMaintenance > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {upcomingMaintenance && upcomingMaintenance.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Upcoming Maintenance
            </p>
            {upcomingMaintenance.map((maintenance) => (
              <div
                key={maintenance.id}
                className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center">
                  <WrenchScrewdriverIcon className="h-3 w-3 text-blue-600 mr-2" />
                  <span className="text-xs text-blue-800 capitalize">
                    {maintenance.type}
                  </span>
                </div>
                <span className="text-xs text-blue-600 font-medium">
                  {formatDate(maintenance.next_maintenance!)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <WrenchScrewdriverIcon className="mx-auto h-8 w-8 text-gray-300" />
            <p className="text-xs text-gray-500 mt-2">
              No scheduled maintenance
            </p>
          </div>
        )}

        {maintenanceRecords && maintenanceRecords.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Total Records:</span>
              <span className="font-medium">{maintenanceRecords.length}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}