'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
  ClockIcon,
  TagIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import apiClient, { Service, ServiceVariant } from '@/lib/api';
import ServiceModal from '@/components/ServiceModal';
import ServiceVariantModal from '@/components/ServiceVariantModal';

const ServicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['services', searchTerm, showInactive, currentPage],
    queryFn: () => apiClient.getServices({
      search: searchTerm || undefined,
      is_active: showInactive ? undefined : true,
      page: currentPage,
    }),
  });

  // Fetch service statistics
  const { data: statsData } = useQuery({
    queryKey: ['service-statistics'],
    queryFn: () => apiClient.getServiceStatistics(),
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-statistics'] });
    },
  });

  const services = servicesData?.results || [];

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!searchTerm) return services;
    return services.filter(service =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  const handleDeleteService = async (service: Service) => {
    if (window.confirm(`Are you sure you want to delete "${service.name}"?`)) {
      try {
        await deleteServiceMutation.mutateAsync(service.id);
      } catch (error) {
        console.error('Error deleting service:', error);
        alert('Failed to delete service. Please try again.');
      }
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getServiceStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Services"
            description="Manage your automotive services and pricing"
            breadcrumbs={[
              { label: 'Services' }
            ]}
            actions={
              <Button onClick={() => setShowServiceModal(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Service</span>
                <span className="sm:hidden">New</span>
              </Button>
            }
          />
          {/* Statistics Cards */}
          {statsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CogIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Services</dt>
                        <dd className="text-lg font-medium text-gray-900">{statsData.total_services}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BuildingStorefrontIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Services</dt>
                        <dd className="text-lg font-medium text-gray-900">{statsData.active_services}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Avg Duration</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatDuration(Math.round(statsData.avg_duration))}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TagIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Variants</dt>
                        <dd className="text-lg font-medium text-gray-900">{statsData.total_variants}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search services by name, code, or description..."
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show inactive</span>
                  </label>

                  <Button
                    onClick={() => refetchServices()}
                    variant="secondary"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Table */}
          <Card>
            <CardHeader>
              <CardTitle>Services ({filteredServices.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">

          {servicesLoading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-gray-500 bg-white">
                <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" />
                Loading services...
              </div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-6 text-center">
              <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new service.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Service
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{service.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {service.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {formatDuration(service.duration_estimate_minutes)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getServiceStatusColor(service.is_active)}`}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {service.variants?.length || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </Menu.Button>
                          <Transition
                            as={React.Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                              <div className="py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => {
                                        setSelectedService(service);
                                        setShowServiceModal(true);
                                      }}
                                      className={`${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      } group flex items-center px-4 py-2 text-sm w-full text-left`}
                                    >
                                      <PencilIcon className="mr-3 h-4 w-4" />
                                      Edit Service
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => {
                                        setSelectedService(service);
                                        setShowVariantModal(true);
                                      }}
                                      className={`${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      } group flex items-center px-4 py-2 text-sm w-full text-left`}
                                    >
                                      <TagIcon className="mr-3 h-4 w-4" />
                                      Manage Variants
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleDeleteService(service)}
                                      className={`${
                                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                      } group flex items-center px-4 py-2 text-sm w-full text-left text-red-600`}
                                    >
                                      <TrashIcon className="mr-3 h-4 w-4" />
                                      Delete Service
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {servicesData && servicesData.count > 0 && (
            <Card>
              <CardContent className="px-4 py-3 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!servicesData.previous}
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!servicesData.next}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 20, servicesData.count)}
                      </span>{' '}
                      of <span className="font-medium">{servicesData.count}</span> results
                    </p>
                  </div>
                  <div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={!servicesData.previous}
                        variant="secondary"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!servicesData.next}
                        variant="secondary"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modal Components */}
          <ServiceModal
            isOpen={showServiceModal}
            onClose={() => {
              setShowServiceModal(false);
              setSelectedService(null);
            }}
            service={selectedService}
          />

          <ServiceVariantModal
            isOpen={showVariantModal}
            onClose={() => {
              setShowVariantModal(false);
              setSelectedService(null);
            }}
            service={selectedService}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ServicesPage;