'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  TruckIcon,
  UserIcon,
  PencilIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  CalendarIcon,
  HashtagIcon,
  SwatchIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageHeader from '@/components/ui/PageHeader';
import ServiceHistory from '@/components/vehicle/ServiceHistory';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export default function VehicleViewPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  // Fetch vehicle data
  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => apiClient.getVehicle(vehicleId),
    enabled: !!vehicleId,
  });

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-12 text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Vehicle Not Found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The requested vehicle could not be found.
                </p>
                <div className="mt-6">
                  <Button onClick={() => router.push('/vehicles')}>
                    Back to Vehicles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!vehicle) return null;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title={vehicle.plate_number}
            description={`${vehicle.year} ${vehicle.make} ${vehicle.model} • ${vehicle.color}`}
            breadcrumbs={[
              { label: 'Vehicles', href: '/vehicles' },
              { label: vehicle.plate_number }
            ]}
            actions={
              <>
                <Link href={`/jobs/new?vehicle=${vehicle.id}`}>
                  <Button>
                    <PlusIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Create Job</span>
                  </Button>
                </Link>
                <Link href={`/vehicles/${vehicle.id}/edit`}>
                  <Button variant="outline">
                    <PencilIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
              </>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TruckIcon className="h-5 w-5 mr-2" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <HashtagIcon className="h-4 w-4 mr-2" />
                        License Plate
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                        {vehicle.plate_number}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                        Make & Model
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {vehicle.make} {vehicle.model}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Year
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">{vehicle.year}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 flex items-center">
                        <SwatchIcon className="h-4 w-4 mr-2" />
                        Color
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">{vehicle.color}</dd>
                    </div>
                    {vehicle.vin && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <IdentificationIcon className="h-4 w-4 mr-2" />
                          VIN
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                          {vehicle.vin}
                        </dd>
                      </div>
                    )}
                    {vehicle.notes && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-2" />
                          Notes
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {vehicle.notes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Owner Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {vehicle.customer_name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          {vehicle.customer_phone && (
                            <div className="flex items-center">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {vehicle.customer_phone}
                            </div>
                          )}
                          {vehicle.customer_email && (
                            <div className="flex items-center">
                              <EnvelopeIcon className="h-4 w-4 mr-1" />
                              {vehicle.customer_email}
                            </div>
                          )}
                        </div>
                        {vehicle.customer_address && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {vehicle.customer_address}
                          </div>
                        )}
                      </div>
                    </div>
                    <Link href={`/customers/${vehicle.customer}`}>
                      <Button variant="outline" size="sm">
                        View Customer
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                      Recent Jobs
                    </div>
                    <Link href={`/jobs?vehicle=${vehicle.id}`}>
                      <Button variant="outline" size="sm">
                        View All Jobs
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicle.recent_jobs && vehicle.recent_jobs.length > 0 ? (
                    <div className="space-y-4">
                      {vehicle.recent_jobs.slice(0, 5).map((job: any) => (
                        <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              Job #{job.job_number}
                            </h4>
                            <p className="text-sm text-gray-500">{job.description}</p>
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {formatDate(job.created_at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(job.total_cost)}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              job.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : job.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : job.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This vehicle hasn't had any service jobs yet.
                      </p>
                      <div className="mt-6">
                        <Link href={`/jobs/new?vehicle=${vehicle.id}`}>
                          <Button>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create First Job
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service History Component */}
              <ServiceHistory vehicleId={vehicle.id} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Vehicle Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Jobs</dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {vehicle.total_jobs || 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Spent</dt>
                      <dd className="text-2xl font-bold text-green-600">
                        {formatCurrency(vehicle.total_spent || 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Average Job Cost</dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {vehicle.total_jobs > 0
                          ? formatCurrency((vehicle.total_spent || 0) / vehicle.total_jobs)
                          : formatCurrency(0)
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Service</dt>
                      <dd className="text-sm text-gray-900">
                        {vehicle.last_service_date
                          ? formatDate(vehicle.last_service_date)
                          : 'Never'
                        }
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href={`/jobs/new?vehicle=${vehicle.id}`} className="block">
                    <Button className="w-full">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Job
                    </Button>
                  </Link>
                  <Link href={`/vehicles/${vehicle.id}/edit`} className="block">
                    <Button variant="outline" className="w-full">
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit Vehicle
                    </Button>
                  </Link>
                  <Link href={`/customers/${vehicle.customer}`} className="block">
                    <Button variant="outline" className="w-full">
                      <UserIcon className="h-4 w-4 mr-2" />
                      View Owner
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Vehicle Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Active Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Added</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(vehicle.created_at)}
                      </span>
                    </div>
                    {vehicle.updated_at !== vehicle.created_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Last Updated</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(vehicle.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}