'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';


export default function VehiclesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles', searchTerm],
    queryFn: () => apiClient.getVehicles({ search: searchTerm || undefined }),
  });

  const handleCardClick = (vehicleId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('a')) {
      return;
    }
    router.push(`/vehicles/${vehicleId}`);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Vehicles"
            description="Manage customer vehicles and service history"
            breadcrumbs={[
              { label: 'Vehicles' }
            ]}
            actions={
              <Link href="/vehicles/new">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Vehicle</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            }
          />

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by plate number, make, model, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vehicles Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehicles?.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className="hover:shadow-lg hover:border-blue-400 hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
                  onClick={(e) => handleCardClick(vehicle.id, e)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 transition-colors">
                            <TruckIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {vehicle.plate_number}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/vehicles/${vehicle.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-flex"
                          title="Edit Vehicle"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Color:</span>
                        <span className="text-gray-900 font-medium">{vehicle.color}</span>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Owner</p>
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {vehicle.customer_name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          vehicle.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {vehicle.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {vehicle.vehicle_class_name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {vehicle.vehicle_class_name}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && vehicles?.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first vehicle.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <Link href="/vehicles/new">
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Vehicle
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </Layout>
    </ProtectedRoute>
  );
}