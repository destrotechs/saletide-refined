'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient, Customer } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: () => void;
}

function CustomerModal({ isOpen, onClose, customer, onSuccess }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    date_of_birth: customer?.date_of_birth || '',
    national_id: customer?.national_id || '',
    notes: customer?.notes || '',
    consent_for_communications: customer?.consent_for_communications || false,
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => apiClient.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => apiClient.updateCustomer(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {customer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National ID
              </label>
              <input
                type="text"
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.consent_for_communications}
                  onChange={(e) => setFormData({ ...formData, consent_for_communications: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Consent for communications
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {customer ? 'Update' : 'Create'} Customer
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => apiClient.getCustomers({ search: searchTerm || undefined }),
  });

  const handleCardClick = (customerId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('a')) {
      return;
    }
    router.push(`/customers/${customerId}`);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Customers"
            description="Manage your customer database and track customer relationships"
            breadcrumbs={[
              { label: 'Customers' }
            ]}
            actions={
              <Link href="/customers/new">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Customer</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            }
          />

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers Grid */}
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
              {customers?.results.map((customer) => (
                <Card
                  key={customer.id}
                  className="hover:shadow-lg hover:border-blue-400 hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
                  onClick={(e) => handleCardClick(customer.id, e)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 transition-colors">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {customer.name}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/customers/${customer.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-flex"
                          title="Edit Customer"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    {customer.email && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-gray-100">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Vehicles</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {customer.vehicles_count}
                        </p>
                      </div>
                      <div className="text-center border-x border-gray-100">
                        <p className="text-xs text-gray-500">Jobs</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {customer.total_jobs}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Spent</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(customer.total_spent)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Joined {formatDate(customer.created_at)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && customers?.results.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first customer.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <Link href="/customers/new">
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Customer
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modal */}
          <CustomerModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            customer={selectedCustomer}
            onSuccess={() => refetch()}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}