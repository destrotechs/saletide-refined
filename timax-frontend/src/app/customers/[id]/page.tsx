'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  PencilIcon,
  TrashIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationIcon,
  CalendarIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient, Customer } from '@/lib/api';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';

interface CustomerStats {
  total_jobs: number;
  total_spent: number;
  vehicles_count: number;
  last_service_date?: string;
  average_job_value: number;
}

interface CustomerActivity {
  type: 'job' | 'vehicle' | 'payment';
  title: string;
  description: string;
  date: string;
  amount?: number;
  status?: string;
}

function InfoField({ label, value, icon: Icon, className = "" }: {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <dt className="text-sm font-medium text-gray-500 flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-1" />}
        {label}
      </dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}


export default function CustomerViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch customer data
  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiClient.getCustomer(id),
    enabled: !!id,
  });

  // Fetch customer vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['customer-vehicles', id],
    queryFn: () => apiClient.getVehicles({ customer: id }),
    enabled: !!id,
  });

  // Fetch customer jobs
  const { data: jobs } = useQuery({
    queryKey: ['customer-jobs', id],
    queryFn: () => apiClient.getJobs({ customer: id }),
    enabled: !!id,
  });

  // Delete mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: () => apiClient.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers');
    },
  });

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-12 text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Customer Not Found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The requested customer could not be found.
                </p>
                <div className="mt-6">
                  <Button onClick={() => router.push('/customers')}>
                    Back to Customers
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

  if (!customer) return null;

  const customerStats: CustomerStats = {
    total_jobs: customer.total_jobs || 0,
    total_spent: customer.total_spent || 0,
    vehicles_count: customer.vehicles_count || 0,
    last_service_date: customer.last_service_date,
    average_job_value: customer.total_jobs > 0 ? customer.total_spent / customer.total_jobs : 0,
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title={customer.name}
            description={`Customer since ${formatDate(customer.created_at)} • ${customer.is_active ? 'Active' : 'Inactive'} Account`}
            breadcrumbs={[
              { label: 'Customers', href: '/customers' },
              { label: customer.name }
            ]}
            actions={
              <>
                <Link href={`/customers/${id}/edit`}>
                  <Button variant="outline">
                    <PencilIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <TrashIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </>
            }
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField
                      label="Phone Number"
                      value={customer.phone || 'Not provided'}
                      icon={PhoneIcon}
                    />
                    <InfoField
                      label="Email Address"
                      value={customer.email || 'Not provided'}
                      icon={EnvelopeIcon}
                    />
                    <InfoField
                      label="National ID"
                      value={customer.national_id || 'Not provided'}
                      icon={IdentificationIcon}
                    />
                    <InfoField
                      label="Date of Birth"
                      value={customer.date_of_birth ? formatDate(customer.date_of_birth) : 'Not provided'}
                      icon={CalendarIcon}
                    />
                    {customer.address && (
                      <InfoField
                        label="Address"
                        value={customer.address}
                        icon={MapPinIcon}
                        className="md:col-span-2"
                      />
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Customer Vehicles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <TruckIcon className="h-5 w-5 mr-2" />
                      Vehicles ({vehicles?.length || 0})
                    </span>
                    <Link href={`/vehicles/new?customer=${id}`}>
                      <Button variant="outline" size="sm">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Vehicle
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicles && vehicles.length > 0 ? (
                    <div className="space-y-3">
                      {vehicles.map((vehicle: any) => (
                        <div key={vehicle.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <TruckIcon className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {vehicle.make} {vehicle.model} ({vehicle.year})
                              </p>
                              <p className="text-xs text-gray-500">
                                Plate: {vehicle.plate_number}
                              </p>
                            </div>
                          </div>
                          <Link href={`/vehicles/${vehicle.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TruckIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No vehicles registered</p>
                      <Link href={`/vehicles/new?customer=${id}`}>
                        <Button className="mt-4" size="sm">
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add First Vehicle
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                      Recent Jobs ({jobs?.length || 0})
                    </span>
                    <Link href={`/jobs/new?customer=${id}`}>
                      <Button variant="outline" size="sm">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        New Job
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobs && jobs.length > 0 ? (
                    <div className="space-y-3">
                      {jobs.slice(0, 5).map((job: any) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Job #{job.job_number}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(job.created_at)} • {formatCurrency(parseFloat(job.estimate_total || '0'))}
                              </p>
                            </div>
                          </div>
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <WrenchScrewdriverIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No jobs found</p>
                      <Link href={`/jobs/new?customer=${id}`}>
                        <Button className="mt-4" size="sm">
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Create First Job
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Stats & Summary */}
            <div className="space-y-6">
              {/* Customer Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{customerStats.vehicles_count}</div>
                      <div className="text-xs text-blue-600">Vehicles</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{customerStats.total_jobs}</div>
                      <div className="text-xs text-green-600">Total Jobs</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Spent:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(customerStats.total_spent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Average Job Value:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(customerStats.average_job_value)}
                      </span>
                    </div>
                    {customerStats.last_service_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Last Service:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(customerStats.last_service_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status & Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoField
                    label="Account Status"
                    value={
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <InfoField
                    label="Communications"
                    value={
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.consent_for_communications ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.consent_for_communications ? 'Enabled' : 'Disabled'}
                      </span>
                    }
                  />
                  <InfoField
                    label="Created"
                    value={formatDate(customer.created_at)}
                    icon={CalendarIcon}
                  />
                  {customer.updated_at && (
                    <InfoField
                      label="Last Updated"
                      value={formatDate(customer.updated_at)}
                      icon={ClockIcon}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {customer.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(false)} />
                <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
                  <div className="px-6 py-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Delete Customer
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Are you sure you want to delete "{customer.name}"? This action cannot be undone and will also affect related vehicles and jobs.
                    </p>
                    <div className="mt-6 flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => deleteCustomerMutation.mutate()}
                        isLoading={deleteCustomerMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}