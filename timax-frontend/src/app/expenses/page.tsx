'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Define expense interfaces
interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Expense {
  id: string;
  expense_number: string;
  category: string;
  category_name: string;
  description: string;
  amount: string;
  expense_date: string;
  payment_method: string;
  payment_method_display: string;
  reference_number: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  status_display: string;
  submitted_by: string;
  submitted_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  job: string | null;
  job_number: string | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseStats {
  total_expenses: number;
  pending_expenses: number;
  approved_expenses: number;
  paid_expenses: number;
  rejected_expenses: number;
  total_amount: string;
  pending_amount: string;
  approved_amount: string;
  paid_amount: string;
  this_month: {
    count: number;
    amount: string;
  };
}

// Expense API methods
const expenseApi = {
  getExpenses: async (params?: { search?: string; status?: string; category?: string }) => {
    const response = await apiClient.get<{ results: Expense[], count: number }>('/expenses/', params);
    return response.results || [];
  },

  getExpenseCategories: async () => {
    const response = await apiClient.get<{ results: ExpenseCategory[] }>('/expenses/categories/');
    return response.results || response;
  },

  getExpenseStats: async () => {
    const response = await apiClient.get<ExpenseStats>('/expenses/statistics/');
    return response;
  },

  approveExpense: (id: string) =>
    apiClient.post(`/expenses/${id}/approve/`),

  rejectExpense: (id: string) =>
    apiClient.post(`/expenses/${id}/reject/`),

  markPaidExpense: (id: string) =>
    apiClient.post(`/expenses/${id}/mark_paid/`),
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Pending' };
    case 'APPROVED':
      return { color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon, text: 'Approved' };
    case 'PAID':
      return { color: 'bg-green-100 text-green-800', icon: BanknotesIcon, text: 'Paid' };
    case 'REJECTED':
      return { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Rejected' };
    default:
      return { color: 'bg-gray-100 text-gray-800', icon: DocumentTextIcon, text: status };
  }
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Check if user is manager or admin
  const isManager = user && ['ADMIN', 'MANAGER'].includes(user.role);

  // Fetch data
  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['expenses', searchTerm, statusFilter, categoryFilter],
    queryFn: () => expenseApi.getExpenses({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseApi.getExpenseCategories(),
  });

  const { data: stats } = useQuery({
    queryKey: ['expense-stats'],
    queryFn: () => expenseApi.getExpenseStats(),
  });

  const handleAdd = () => {
    window.location.href = '/expenses/new';
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Expenses"
            description="Track and manage business expenses"
            breadcrumbs={[
              { label: 'Expenses' }
            ]}
            actions={
              <Button onClick={handleAdd}>
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Submit Expense</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            }
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats?.pending_expenses || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(parseFloat(stats?.pending_amount || '0'))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-blue-600">{stats?.approved_expenses || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(parseFloat(stats?.approved_amount || '0'))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BanknotesIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Paid</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.paid_expenses || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(parseFloat(stats?.paid_amount || '0'))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-gray-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.this_month?.count || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(parseFloat(stats?.this_month?.amount || '0'))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by expense number or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PAID">Paid</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">All Categories</option>
                    {Array.isArray(categories) && categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expense #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(expenses) && expenses.map((expense) => {
                        const statusBadge = getStatusBadge(expense.status);
                        const StatusIcon = statusBadge.icon;
                        return (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <DocumentTextIcon className="h-4 w-4 text-purple-600" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {expense.expense_number}
                                  </div>
                                  {expense.reference_number && (
                                    <div className="text-xs text-gray-500">
                                      Ref: {expense.reference_number}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                <button
                                  onClick={() => window.location.href = `/expenses/${expense.id}`}
                                  className="hover:text-blue-600 hover:underline text-left"
                                >
                                  {expense.description}
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {expense.payment_method_display}
                                {expense.job_number && ` • Job: ${expense.job_number}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{expense.category_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {formatCurrency(parseFloat(expense.amount))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(expense.expense_date)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{expense.submitted_by_name}</div>
                              {expense.approved_by_name && (
                                <div className="text-xs text-gray-500">
                                  Approved by: {expense.approved_by_name}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => window.location.href = `/expenses/${expense.id}`}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="View Details"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                {expense.status === 'PENDING' && (
                                  <button
                                    onClick={() => window.location.href = `/expenses/${expense.id}/edit`}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit Expense"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empty State */}
          {!isLoading && Array.isArray(expenses) && expenses.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter || categoryFilter
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by submitting your first expense.'}
                </p>
                {!searchTerm && !statusFilter && !categoryFilter && (
                  <div className="mt-6">
                    <Button onClick={handleAdd}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Submit Expense
                    </Button>
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
