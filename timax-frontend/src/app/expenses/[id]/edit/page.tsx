'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  BanknotesIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  TagIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Job {
  id: string;
  job_number: string;
  status: string;
}

interface ExpenseDetail {
  id: string;
  expense_number: string;
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  payment_method: string;
  reference_number: string;
  job: string | null;
  notes: string;
  receipt_url: string;
  can_be_edited: boolean;
  status: string;
}

interface ExpenseFormData {
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  payment_method: string;
  reference_number: string;
  job: string;
  notes: string;
  receipt_url: string;
}

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = params.id as string;

  // Fetch expense details
  const { data: expense, isLoading: expenseLoading } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      const response = await apiClient.get<ExpenseDetail>(`/expenses/${id}/`);
      return response;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<ExpenseFormData>();

  // Populate form when expense data loads
  useEffect(() => {
    if (expense) {
      // Check if user can edit
      if (!expense.can_be_edited) {
        toast.error('This expense cannot be edited');
        router.push(`/expenses/${id}`);
        return;
      }

      reset({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.expense_date,
        payment_method: expense.payment_method,
        reference_number: expense.reference_number || '',
        job: expense.job || '',
        notes: expense.notes || '',
        receipt_url: expense.receipt_url || '',
      });
    }
  }, [expense, reset, router, id]);

  // Fetch expense categories
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const response = await apiClient.get<{ results: ExpenseCategory[] }>('/expenses/categories/');
      return response.results || response;
    },
  });

  // Fetch active jobs (optional)
  const { data: jobsData } = useQuery({
    queryKey: ['active-jobs'],
    queryFn: async () => {
      const response = await apiClient.get<{ results: Job[] }>('/sales/jobs/', { status: 'IN_PROGRESS' });
      return response.results || [];
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: any) => apiClient.patch(`/expenses/${id}/`, data),
    onSuccess: (updatedExpense: any) => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Expense updated successfully!');
      router.push(`/expenses/${id}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update expense';
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const payload = {
      category: data.category,
      description: data.description,
      amount: parseFloat(data.amount),
      expense_date: data.expense_date,
      payment_method: data.payment_method,
      reference_number: data.reference_number || '',
      job: data.job || null,
      notes: data.notes || '',
      receipt_url: data.receipt_url || '',
    };

    updateExpenseMutation.mutate(payload);
  };

  const handleCancel = () => {
    router.push(`/expenses/${id}`);
  };

  if (expenseLoading) {
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

  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const jobs = Array.isArray(jobsData) ? jobsData : [];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Edit Expense</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Update expense details for {expense.expense_number}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Expense Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Expense Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Category */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        id="category"
                        {...register('category', { required: 'Category is required' })}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.category ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select category...</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        {...register('description', { required: 'Description is required' })}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.description ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Describe the expense..."
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Amount and Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (KES) *
                        </label>
                        <input
                          type="number"
                          id="amount"
                          min="0.01"
                          step="0.01"
                          {...register('amount', {
                            required: 'Amount is required',
                            min: { value: 0.01, message: 'Amount must be greater than 0' },
                          })}
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                            errors.amount ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                        {errors.amount && (
                          <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700 mb-2">
                          Expense Date *
                        </label>
                        <input
                          type="date"
                          id="expense_date"
                          {...register('expense_date', { required: 'Date is required' })}
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                            errors.expense_date ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors.expense_date && (
                          <p className="mt-1 text-sm text-red-600">{errors.expense_date.message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BanknotesIcon className="h-5 w-5 mr-2" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Payment Method */}
                    <div>
                      <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        id="payment_method"
                        {...register('payment_method')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      >
                        <option value="CASH">Cash</option>
                        <option value="MPESA">M-Pesa</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CARD">Card</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700 mb-2">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        id="reference_number"
                        {...register('reference_number')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        placeholder="Transaction ID, receipt number, etc."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TagIcon className="h-5 w-5 mr-2" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Related Job */}
                    <div>
                      <label htmlFor="job" className="block text-sm font-medium text-gray-700 mb-2">
                        Related Job (optional)
                      </label>
                      <select
                        id="job"
                        {...register('job')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                      >
                        <option value="">No related job</option>
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.job_number}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Link this expense to a specific job if applicable
                      </p>
                    </div>

                    {/* Receipt URL */}
                    <div>
                      <label htmlFor="receipt_url" className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt URL
                      </label>
                      <input
                        type="url"
                        id="receipt_url"
                        {...register('receipt_url')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        placeholder="https://..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Link to receipt image or document
                      </p>
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        {...register('notes')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        placeholder="Additional notes or comments..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-6">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Expense Number</span>
                      <span className="text-sm font-medium text-gray-900">
                        {expense.expense_number}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Category</span>
                      <span className="text-sm font-medium text-gray-900">
                        {watch('category') ? categories.find(c => c.id === watch('category'))?.name : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Payment Method</span>
                      <span className="text-sm font-medium text-gray-900">
                        {watch('payment_method') === 'CASH' && 'Cash'}
                        {watch('payment_method') === 'MPESA' && 'M-Pesa'}
                        {watch('payment_method') === 'BANK_TRANSFER' && 'Bank Transfer'}
                        {watch('payment_method') === 'CHEQUE' && 'Cheque'}
                        {watch('payment_method') === 'CARD' && 'Card'}
                        {watch('payment_method') === 'OTHER' && 'Other'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-lg font-medium text-gray-900">Total Amount</span>
                      <span className="text-2xl font-bold text-blue-600">
                        KES {watch('amount') ? parseFloat(watch('amount')).toLocaleString() : '0.00'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-yellow-900 mb-2">Edit Notice</h4>
                      <p className="text-xs text-yellow-700">
                        Expenses can only be edited while in PENDING or REJECTED status. After approval, expenses cannot be modified.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="px-6 py-2"
              >
                Update Expense
              </Button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
