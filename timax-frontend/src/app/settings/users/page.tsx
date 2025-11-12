'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient, User } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    user: User | null;
    action: 'activate' | 'deactivate' | null;
  }>({
    isOpen: false,
    user: null,
    action: null,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', statusFilter, roleFilter],
    queryFn: () => apiClient.getUsers({
      is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      role: roleFilter || undefined,
    }),
  });

  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: (userId: string) => apiClient.activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User activated successfully');
    },
    onError: () => {
      toast.error('Failed to activate user');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => apiClient.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully');
    },
    onError: () => {
      toast.error('Failed to deactivate user');
    },
  });

  const filteredUsers = users?.results.filter(user =>
    searchTerm === '' ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleAddUser = () => {
    router.push('/settings/users/new');
  };

  const handleEditUser = (user: User) => {
    router.push(`/settings/users/${user.id}`);
  };

  const handleToggleStatus = (user: User) => {
    if (user.is_active) {
      setConfirmModal({
        isOpen: true,
        user,
        action: 'deactivate',
      });
    } else {
      setConfirmModal({
        isOpen: true,
        user,
        action: 'activate',
      });
    }
  };

  const handleConfirmAction = () => {
    if (!confirmModal.user) return;

    if (confirmModal.action === 'deactivate') {
      deactivateMutation.mutate(confirmModal.user.id);
    } else if (confirmModal.action === 'activate') {
      activateMutation.mutate(confirmModal.user.id);
    }

    setConfirmModal({
      isOpen: false,
      user: null,
      action: null,
    });
  };

  const handleCloseConfirm = () => {
    setConfirmModal({
      isOpen: false,
      user: null,
      action: null,
    });
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      SALES_AGENT: 'bg-green-100 text-green-800',
      TECHNICIAN: 'bg-orange-100 text-orange-800',
      INVENTORY_CLERK: 'bg-yellow-100 text-yellow-800',
      ACCOUNTANT: 'bg-indigo-100 text-indigo-800',
    };

    const labels = {
      ADMIN: 'Administrator',
      MANAGER: 'Manager',
      SALES_AGENT: 'Sales Agent',
      TECHNICIAN: 'Technician',
      INVENTORY_CLERK: 'Inventory Clerk',
      ACCOUNTANT: 'Accountant',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  return (
    <ProtectedRoute requiredRole={['ADMIN']}>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Employees"
            description="Manage employee accounts and permissions"
            breadcrumbs={[
              { label: 'Settings', href: '/settings' },
              { label: 'Employees' }
            ]}
            actions={
              <Button onClick={handleAddUser}>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </Button>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{users?.count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Employees</p>
                    <p className="text-2xl font-bold text-green-600">
                      {users?.results.filter(u => u.is_active).length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Inactive Employees</p>
                    <p className="text-2xl font-bold text-red-600">
                      {users?.results.filter(u => !u.is_active).length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Roles</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SALES_AGENT">Sales Agent</option>
                    <option value="TECHNICIAN">Technician</option>
                    <option value="INVENTORY_CLERK">Inventory Clerk</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employees Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          Loading employees...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/employees/${user.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {user.first_name} {user.last_name}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{user.email}</div>
                            {user.phone && (
                              <div className="text-sm text-gray-500">{user.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(user.role)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.is_active ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircleIcon className="h-3 w-3 mr-1" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.date_joined ? formatDate(user.date_joined) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit User"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                disabled={activateMutation.isPending || deactivateMutation.isPending}
                                className={`${
                                  user.is_active
                                    ? 'text-red-600 hover:text-red-800'
                                    : 'text-green-600 hover:text-green-800'
                                } disabled:opacity-50`}
                                title={user.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {user.is_active ? (
                                  <XCircleIcon className="h-4 w-4" />
                                ) : (
                                  <CheckCircleIcon className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Confirm Modal */}
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={handleCloseConfirm}
            onConfirm={handleConfirmAction}
            title={
              confirmModal.action === 'deactivate'
                ? 'Deactivate User'
                : 'Activate User'
            }
            message={
              confirmModal.action === 'deactivate'
                ? `Are you sure you want to deactivate ${confirmModal.user?.first_name} ${confirmModal.user?.last_name}? They will be logged out immediately and unable to access the system.`
                : `Are you sure you want to activate ${confirmModal.user?.first_name} ${confirmModal.user?.last_name}? They will be able to log in and access the system.`
            }
            confirmText={confirmModal.action === 'deactivate' ? 'Deactivate' : 'Activate'}
            cancelText="Cancel"
            type={confirmModal.action === 'deactivate' ? 'danger' : 'info'}
            isLoading={activateMutation.isPending || deactivateMutation.isPending}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
