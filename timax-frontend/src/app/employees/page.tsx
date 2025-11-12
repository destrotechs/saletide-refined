'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  UserIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient, User, EmployeeCommissionRate, ServiceVariant, CommissionSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface CommissionRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User;
  rate: EmployeeCommissionRate | null;
  onSuccess: () => void;
}

function CommissionRateModal({ isOpen, onClose, employee, rate, onSuccess }: CommissionRateModalProps) {
  const [formData, setFormData] = useState({
    service_variant: rate?.service_variant || '',
    commission_percentage: rate?.commission_percentage || '',
  });

  const queryClient = useQueryClient();

  const { data: serviceVariants } = useQuery({
    queryKey: ['service-variants'],
    queryFn: () => apiClient.getServiceVariants(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<EmployeeCommissionRate>) =>
      apiClient.createCommissionRate({ ...data, employee: employee.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      onSuccess();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EmployeeCommissionRate>) =>
      apiClient.updateCommissionRate(rate!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      service_variant: formData.service_variant || null,
      commission_percentage: formData.commission_percentage,
    };

    if (rate) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
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
              {rate ? 'Edit Commission Rate' : 'Add Commission Rate'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{employee.first_name} {employee.last_name}</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service (Leave empty for default rate)
              </label>
              <select
                value={formData.service_variant}
                onChange={(e) => setFormData({ ...formData, service_variant: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Default Rate (All Services)</option>
                {serviceVariants?.results.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.service_name} - {variant.part_name} ({variant.vehicle_class_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission Percentage *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {rate ? 'Update' : 'Create'} Rate
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedRate, setSelectedRate] = useState<EmployeeCommissionRate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    rate: EmployeeCommissionRate | null;
  }>({
    isOpen: false,
    rate: null,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => apiClient.getUsers({ is_active: true }),
  });

  const { data: commissionRates } = useQuery({
    queryKey: ['commission-rates'],
    queryFn: () => apiClient.getCommissionRates({ is_active: true }),
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['commission-summary'],
    queryFn: () => apiClient.getCommissionSummary(),
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteCommissionRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
    },
  });

  const handleAddRate = (user: User) => {
    setSelectedEmployee(user);
    setSelectedRate(null);
    setIsModalOpen(true);
  };

  const handleEditRate = (user: User, rate: EmployeeCommissionRate) => {
    setSelectedEmployee(user);
    setSelectedRate(rate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setSelectedRate(null);
  };

  const handleDeleteRate = (rate: EmployeeCommissionRate) => {
    setConfirmDelete({
      isOpen: true,
      rate,
    });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete.rate) {
      deleteMutation.mutate(confirmDelete.rate.id);
    }
    setConfirmDelete({
      isOpen: false,
      rate: null,
    });
  };

  const handleCloseConfirmDelete = () => {
    setConfirmDelete({
      isOpen: false,
      rate: null,
    });
  };

  const getEmployeeRates = (userId: string) => {
    return commissionRates?.results.filter(rate => rate.employee === userId) || [];
  };

  const getEmployeeSummary = (userId: string) => {
    return commissionSummary?.find(summary => summary.employee === userId);
  };

  // If user is a technician, filter to show only their own data
  const filteredUsers = users?.results.filter(user => {
    // First check if technician should only see their own data
    if (currentUser?.role === 'TECHNICIAN' && user.id !== currentUser.id) {
      return false;
    }

    // Then apply search filter
    return (
      searchTerm === '' ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Commission Management</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage employee commission rates and track earnings
              </p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              {currentUser?.role !== 'TECHNICIAN' && (
                <Link href="/settings/users">
                  <Button variant="outline">
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </Link>
              )}
              <Link href="/employees/commissions">
                <Button>
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Tips & Commissions
                </Button>
              </Link>
            </div>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </CardContent>
          </Card>

          {/* Employees List */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredUsers.map((user) => {
                const rates = getEmployeeRates(user.id);
                const summary = getEmployeeSummary(user.id);

                return (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Link href={`/employees/${user.id}`} className="flex items-center flex-1 cursor-pointer">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              {user.first_name} {user.last_name}
                            </h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                              {user.role}
                            </span>
                          </div>
                        </Link>
                        {currentUser?.role !== 'TECHNICIAN' && (
                          <Button
                            size="sm"
                            onClick={() => handleAddRate(user)}
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Rate
                          </Button>
                        )}
                      </div>

                      {/* Commission Summary */}
                      {summary && (
                        <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500">Available</p>
                            <p className="text-sm font-medium text-yellow-600">
                              {formatCurrency(parseFloat(summary.total_available))}
                            </p>
                            <p className="text-xs text-gray-400">({summary.count_available} jobs)</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Payable</p>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(parseFloat(summary.total_payable))}
                            </p>
                            <p className="text-xs text-gray-400">({summary.count_payable} jobs)</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Paid</p>
                            <p className="text-sm font-medium text-gray-600">
                              {formatCurrency(parseFloat(summary.total_paid))}
                            </p>
                            <p className="text-xs text-gray-400">({summary.count_paid} jobs)</p>
                          </div>
                        </div>
                      )}

                      {/* Commission Rates */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Commission Rates:</h4>
                        {rates.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No commission rates set</p>
                        ) : (
                          <div className="space-y-2">
                            {rates.map((rate) => (
                              <div
                                key={rate.id}
                                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {rate.service_variant ? (
                                      <>
                                        {rate.service_name} - {rate.part_name}
                                      </>
                                    ) : (
                                      <span className="text-blue-600">Default Rate (All Services)</span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {rate.commission_percentage}% commission
                                  </p>
                                </div>
                                {currentUser?.role !== 'TECHNICIAN' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleEditRate(user, rate)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                      title="Edit Rate"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRate(rate)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      title="Delete Rate"
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredUsers.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'No active employees in the system.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Modal */}
          {selectedEmployee && (
            <CommissionRateModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              employee={selectedEmployee}
              rate={selectedRate}
              onSuccess={() => {}}
            />
          )}

          {/* Confirm Delete Modal */}
          <ConfirmModal
            isOpen={confirmDelete.isOpen}
            onClose={handleCloseConfirmDelete}
            onConfirm={handleConfirmDelete}
            title="Delete Commission Rate"
            message={`Are you sure you want to delete this commission rate? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
            isLoading={deleteMutation.isPending}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
