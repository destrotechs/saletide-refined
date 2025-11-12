'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  LinkIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ExpenseDetail {
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
  submitted_by_email: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  job: string | null;
  job_number: string | null;
  notes: string;
  receipt_url: string;
  can_be_edited: boolean;
  can_be_approved: boolean;
  can_be_paid: boolean;
  created_at: string;
  updated_at: string;
}

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const isManager = user && ['ADMIN', 'MANAGER'].includes(user.role);

  // Fetch expense details
  const { data: expense, isLoading } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      const response = await apiClient.get<ExpenseDetail>(`/expenses/${id}/`);
      return response;
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => apiClient.post(`/expenses/${id}/approve/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense approved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve expense');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiClient.post(`/expenses/${id}/reject/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject expense');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => apiClient.post(`/expenses/${id}/mark_paid/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense marked as paid!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to mark expense as paid');
    },
  });

  const handleApprove = () => {
    if (confirm('Are you sure you want to approve this expense?')) {
      approveMutation.mutate();
    }
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this expense?')) {
      rejectMutation.mutate();
    }
  };

  const handleMarkPaid = () => {
    if (confirm('Are you sure you want to mark this expense as paid?')) {
      markPaidMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!expense) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Expense not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The expense you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <div className="mt-6">
              <Button onClick={() => router.push('/expenses')}>
                Back to Expenses
              </Button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{expense.expense_number}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Submitted on {formatDate(expense.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {expense.can_be_edited && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/expenses/${id}/edit`)}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Expense Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Expense Details
                    </span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status_display}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                      <p className="text-base text-gray-900">{expense.category_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(parseFloat(expense.amount))}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Expense Date</label>
                      <p className="text-base text-gray-900">{formatDate(expense.expense_date)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
                      <p className="text-base text-gray-900">{expense.payment_method_display}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-base text-gray-900">{expense.description}</p>
                  </div>

                  {expense.reference_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Reference Number</label>
                      <p className="text-base text-gray-900 font-mono">{expense.reference_number}</p>
                    </div>
                  )}

                  {expense.job_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Related Job</label>
                      <button
                        onClick={() => router.push(`/jobs/${expense.job}`)}
                        className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {expense.job_number}
                      </button>
                    </div>
                  )}

                  {expense.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                      <p className="text-base text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
                    </div>
                  )}

                  {expense.receipt_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Receipt</label>
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        View Receipt
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submission & Approval Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Submission & Approval
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Submitted By</label>
                    <p className="text-base text-gray-900">{expense.submitted_by_name}</p>
                    <p className="text-sm text-gray-500">{expense.submitted_by_email}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(expense.created_at)}</p>
                  </div>

                  {expense.approved_by_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        {expense.status === 'REJECTED' ? 'Rejected By' : 'Approved By'}
                      </label>
                      <p className="text-base text-gray-900">{expense.approved_by_name}</p>
                      <p className="text-sm text-gray-500">{expense.approved_by_email}</p>
                      {expense.approved_at && (
                        <p className="text-sm text-gray-500">{formatDateTime(expense.approved_at)}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Manager Actions */}
              {isManager && (
                <Card>
                  <CardHeader>
                    <CardTitle>Manager Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {expense.can_be_approved && (
                      <Button
                        onClick={handleApprove}
                        isLoading={approveMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Approve Expense
                      </Button>
                    )}
                    {expense.status === 'PENDING' && (
                      <Button
                        onClick={handleReject}
                        isLoading={rejectMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700"
                        variant="outline"
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        Reject Expense
                      </Button>
                    )}
                    {expense.can_be_paid && (
                      <Button
                        onClick={handleMarkPaid}
                        isLoading={markPaidMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <BanknotesIcon className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quick Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                      {expense.status_display}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Can be edited</span>
                    <span className="text-sm font-medium text-gray-900">
                      {expense.can_be_edited ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(expense.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Last updated</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(expense.updated_at)}
                    </span>
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
