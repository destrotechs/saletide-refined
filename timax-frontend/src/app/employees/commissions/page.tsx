'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  FunnelIcon,
  XCircleIcon,
  CheckIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient, Commission, Tip, AdvancePayment, User } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'commissions' | 'tips' | 'advances' | 'reports';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  commissions: Commission[];
  advances: AdvancePayment[];
  onSuccess: () => void;
}

function BulkPaymentModal({ isOpen, onClose, commissions, advances, onSuccess }: BulkPaymentModalProps) {
  const [paymentReference, setPaymentReference] = useState('');
  const queryClient = useQueryClient();

  const markPaidMutation = useMutation({
    mutationFn: (data: { commissionIds: string[]; paymentReference: string }) =>
      apiClient.markCommissionsPaid(data.commissionIds, data.paymentReference),
    onSuccess: (response: any) => {
      const count = response?.updated_count || commissions.length;
      const advancesRecovered = response?.advances_recovered || 0;
      toast.success(
        `Successfully marked ${count} commission${count !== 1 ? 's' : ''} as paid${advancesRecovered > 0 ? ` and ${advancesRecovered} advance${advancesRecovered !== 1 ? 's' : ''} as recovered` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to mark commissions as paid');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markPaidMutation.mutate({
      commissionIds: commissions.map(c => c.id),
      paymentReference,
    });
  };

  const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

  // Calculate unrecovered advances for the employees in these commissions
  const employeeIds = Array.from(new Set(commissions.map(c => c.employee)));
  const unrecoveredAdvances = advances
    .filter(a => employeeIds.includes(a.employee) && (a.status === 'APPROVED' || a.status === 'PAID'))
    .reduce((sum, a) => sum + parseFloat(a.approved_amount || '0'), 0);

  const adjustedAmount = Math.max(totalAmount - unrecoveredAdvances, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Mark Commissions as Paid
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {commissions.length} commission{commissions.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-3 space-y-2 bg-blue-50 rounded-md p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Total Commissions:</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
              {unrecoveredAdvances > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-orange-700">Less: Unrecovered Advances:</span>
                    <span className="text-sm font-semibold text-orange-700">-{formatCurrency(unrecoveredAdvances)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="text-sm font-medium text-blue-900">Net Amount Payable:</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(adjustedAmount)}</span>
                  </div>
                </>
              )}
              {unrecoveredAdvances === 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-sm font-medium text-blue-900">Amount Payable:</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(adjustedAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bank Transfer #12345"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                This action will mark all selected commissions as PAID. This cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={markPaidMutation.isPending}>
                Confirm Payment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface TipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tip: Tip | null;
  onSuccess: () => void;
}

function TipPaymentModal({ isOpen, onClose, tip, onSuccess }: TipPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const queryClient = useQueryClient();

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method, reference }: { id: string; method: string; reference: string }) =>
      apiClient.markTipPaid(id, method, reference),
    onSuccess: () => {
      toast.success('Tip marked as paid successfully');
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to mark tip as paid');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tip) {
      markPaidMutation.mutate({
        id: tip.id,
        method: paymentMethod,
        reference: paymentReference,
      });
    }
  };

  if (!isOpen || !tip) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3 className="text-lg font-semibold text-gray-900">Mark Tip as Paid</h3>
            <div className="mt-2 flex items-center justify-between bg-white rounded-md px-3 py-2 border border-green-200">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">{tip.employee_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(parseFloat(tip.amount))}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Reference <span className="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. M-Pesa code or Transaction ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-4 py-3 text-base font-medium text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-green-800">
                <strong>Note:</strong> This action will mark this tip as paid and cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={markPaidMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={markPaidMutation.isPending} className="bg-green-600 hover:bg-green-700">
                Confirm Payment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface AdvanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: AdvancePayment | null;
  onSuccess: () => void;
}

function AdvanceReviewModal({ isOpen, onClose, advance, onSuccess }: AdvanceReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (advance) {
      setApprovedAmount(advance.requested_amount);
    }
  }, [advance]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, amount, notes }: { id: string; action: 'approve' | 'reject'; amount?: string; notes?: string }) =>
      apiClient.reviewAdvancePayment(id, action, amount, notes),
    onSuccess: (_, variables) => {
      toast.success(`Advance ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to review advance');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (advance) {
      reviewMutation.mutate({
        id: advance.id,
        action,
        amount: action === 'approve' ? approvedAmount : undefined,
        notes: reviewNotes,
      });
    }
  };

  if (!isOpen || !advance) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Review Advance Request</h3>
            <p className="text-sm text-gray-500 mt-1">
              {advance.employee_name} - {formatCurrency(parseFloat(advance.requested_amount))}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Available Commission:</strong> {formatCurrency(parseFloat(advance.available_commission))}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Reason:</strong> {advance.reason}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
              </select>
            </div>

            {action === 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approved Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Notes <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={reviewMutation.isPending}>
                {action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface AdvancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  advance: AdvancePayment | null;
  onSuccess: () => void;
}

function AdvancePaymentModal({ isOpen, onClose, advance, onSuccess }: AdvancePaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const queryClient = useQueryClient();

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method, reference }: { id: string; method: string; reference: string }) =>
      apiClient.markAdvancePaymentPaid(id, method, reference),
    onSuccess: () => {
      toast.success('Advance marked as paid successfully');
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to mark advance as paid');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (advance) {
      markPaidMutation.mutate({
        id: advance.id,
        method: paymentMethod,
        reference: paymentReference,
      });
    }
  };

  if (!isOpen || !advance) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Mark Advance as Paid</h3>
            <p className="text-sm text-gray-500 mt-1">
              {advance.employee_name} - {formatCurrency(parseFloat(advance.approved_amount))}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Transaction ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={markPaidMutation.isPending}>
                Confirm Payment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface RecordAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function RecordAdvanceModal({ isOpen, onClose, onSuccess }: RecordAdvanceModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers({ is_active: true }),
  });

  const recordMutation = useMutation({
    mutationFn: (data: { employee?: string; requested_amount: string; reason: string; payment_method: string; payment_reference?: string }) =>
      apiClient.createAdvancePayment(data),
    onSuccess: () => {
      toast.success('Advance recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      onSuccess();
      onClose();
      setSelectedEmployee('');
      setRequestedAmount('');
      setReason('');
      setPaymentMethod('CASH');
      setPaymentReference('');
      setFormErrors({});
    },
    onError: (error: any) => {
      const errors: Record<string, string> = {};
      if (error.response?.data?.requested_amount) {
        errors.amount = error.response.data.requested_amount[0];
      }
      if (error.response?.data?.detail) {
        errors.general = error.response.data.detail;
      }
      if (error.response?.data?.non_field_errors) {
        errors.general = error.response.data.non_field_errors[0];
      }
      if (Object.keys(errors).length > 0) {
        toast.error(errors.general || errors.amount || 'Failed to record advance');
      } else {
        toast.error('Failed to record advance');
      }
      setFormErrors(errors);
    },
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedEmployee) {
      errors.employee = 'Please select an employee';
    }

    if (!requestedAmount || isNaN(parseFloat(requestedAmount))) {
      errors.amount = 'Please enter a valid amount';
    } else if (parseFloat(requestedAmount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!reason.trim()) {
      errors.reason = 'Reason is required';
    }

    if (!paymentMethod) {
      errors.paymentMethod = 'Please select a payment method';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    recordMutation.mutate({
      employee: selectedEmployee,
      requested_amount: requestedAmount,
      reason,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
    });
  };

  const handleClose = () => {
    onClose();
    setSelectedEmployee('');
    setRequestedAmount('');
    setReason('');
    setPaymentMethod('CASH');
    setPaymentReference('');
    setFormErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />
        <div className="relative w-full max-w-md transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Record Advance Payment</h3>
            <p className="text-sm text-gray-500 mt-1">
              Record an advance payment given to an employee
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <Select
              label="Employee"
              required
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              error={formErrors.employee}
              options={[
                { value: '', label: 'Select an employee' },
                ...(users?.results.filter(u => u.role === 'TECHNICIAN' || u.role === 'SALES_AGENT').map((user) => ({
                  value: user.id,
                  label: `${user.first_name} ${user.last_name} - ${user.email}`
                })) || [])
              ]}
            />

            <Input
              label="Amount Given"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              error={formErrors.amount}
              placeholder="Enter amount"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason/Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                placeholder="e.g., Emergency advance, Salary advance, etc..."
                className={`
                  w-full px-3 py-2
                  text-gray-900 text-base
                  bg-white
                  border border-gray-300 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder:text-gray-400
                  ${formErrors.reason ? 'border-red-500 focus:ring-red-500' : ''}
                `}
              />
              {formErrors.reason && (
                <p className="mt-1 text-sm text-red-600">{formErrors.reason}</p>
              )}
            </div>

            <Select
              label="Payment Method"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              error={formErrors.paymentMethod}
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'MOBILE_MONEY', label: 'Mobile Money' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'CARD', label: 'Card' },
                { value: 'CHEQUE', label: 'Cheque' },
              ]}
            />

            <Input
              label="Payment Reference"
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              error={formErrors.paymentReference}
              placeholder="e.g., Transaction ID, Cheque number, etc. (optional)"
            />

            {formErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{formErrors.general}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={recordMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={recordMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                Record Advance
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'custom';

export default function CommissionsPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('commissions');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>(
    currentUser?.role === 'TECHNICIAN' ? currentUser.id : ''
  );
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [isTipPaymentModalOpen, setIsTipPaymentModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvancePayment | null>(null);
  const [isAdvanceReviewModalOpen, setIsAdvanceReviewModalOpen] = useState(false);
  const [isAdvancePaymentModalOpen, setIsAdvancePaymentModalOpen] = useState(false);
  const [isRecordAdvanceModalOpen, setIsRecordAdvanceModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate date range based on filter and set to today by default
  React.useEffect(() => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(formatDate(yesterday));
        setEndDate(formatDate(yesterday));
        break;
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        setStartDate(formatDate(sevenDaysAgo));
        setEndDate(formatDate(today));
        break;
      case 'custom':
        // Don't change dates - user will set them manually
        break;
    }
  }, [dateFilter]);

  React.useEffect(() => {
    if (currentUser?.role === 'TECHNICIAN') {
      setEmployeeFilter(currentUser.id);
    }
  }, [currentUser]);

  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ['commissions', statusFilter, employeeFilter],
    queryFn: () => apiClient.getCommissions({
      status: statusFilter || undefined,
      employee: employeeFilter || undefined,
    }),
  });

  const { data: tips, isLoading: loadingTips } = useQuery({
    queryKey: ['tips', statusFilter, employeeFilter],
    queryFn: () => apiClient.getTips({
      status: statusFilter || undefined,
      employee: employeeFilter || undefined,
    }),
    enabled: activeTab === 'tips' || (employeeFilter !== '' && activeTab !== 'reports'),
  });

  const { data: advances, isLoading: loadingAdvances } = useQuery({
    queryKey: ['advance-payments', statusFilter, employeeFilter],
    queryFn: () => apiClient.getAdvancePayments({
      status: statusFilter || undefined,
      employee: employeeFilter || undefined,
    }),
    enabled: activeTab === 'advances' || (employeeFilter !== '' && activeTab !== 'reports'),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers({ is_active: true }),
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['commission-summary', startDate, endDate],
    queryFn: () => apiClient.getCommissionSummary({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: activeTab === 'reports',
  });

  const { data: tipsStats } = useQuery({
    queryKey: ['tips-statistics', startDate, endDate],
    queryFn: () => apiClient.getTipsStatistics({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: activeTab === 'reports',
  });

  const { data: advancesStats } = useQuery({
    queryKey: ['advances-statistics', startDate, endDate],
    queryFn: () => apiClient.getAdvancePaymentsStatistics({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    enabled: activeTab === 'reports',
  });

  const queryClient = useQueryClient();

  const markPayableMutation = useMutation({
    mutationFn: (commissionIds: string[]) => apiClient.markCommissionsPayable(commissionIds),
    onSuccess: (response: any) => {
      const count = response?.updated_count || selectedCommissions.size;
      toast.success(`Successfully marked ${count} commission${count !== 1 ? 's' : ''} as payable`);
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setSelectedCommissions(new Set());
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to mark commissions as payable');
    },
  });

  const filteredCommissions = commissions?.results.filter(commission =>
    searchTerm === '' ||
    commission.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    commission.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    commission.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredTips = tips?.results.filter(tip =>
    searchTerm === '' ||
    tip.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tip.job_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAdvances = advances?.results.filter(advance =>
    searchTerm === '' ||
    advance.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    advance.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const payableIds = filteredCommissions
        .filter(c => c.status === 'PAYABLE')
        .map(c => c.id);
      setSelectedCommissions(new Set(payableIds));
    } else {
      setSelectedCommissions(new Set());
    }
  };

  const handleSelectCommission = (id: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommissions(newSelected);
  };

  const handleMarkPayable = () => {
    const availableIds = filteredCommissions
      .filter(c => selectedCommissions.has(c.id) && c.status === 'AVAILABLE')
      .map(c => c.id);

    if (availableIds.length > 0) {
      markPayableMutation.mutate(availableIds);
    }
  };

  const handleBulkPayment = () => {
    const payableCommissions = filteredCommissions.filter(c =>
      selectedCommissions.has(c.id) && c.status === 'PAYABLE'
    );

    if (payableCommissions.length > 0) {
      setIsPaymentModalOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      AVAILABLE: 'bg-yellow-100 text-yellow-800',
      PAYABLE: 'bg-green-100 text-green-800',
      PAID: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PENDING: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };

    const icons = {
      AVAILABLE: ClockIcon,
      PAYABLE: CurrencyDollarIcon,
      PAID: CheckCircleIcon,
      CANCELLED: XCircleIcon,
      PENDING: ClockIcon,
      APPROVED: CheckIcon,
      REJECTED: XCircleIcon,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status}
      </span>
    );
  };

  const selectedPayableCommissions = filteredCommissions.filter(c =>
    selectedCommissions.has(c.id) && c.status === 'PAYABLE'
  );

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateRangeText = startDate && endDate
      ? `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`
      : 'All Time';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Employee Compensation Report - ${dateRangeText}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            h1 {
              text-align: center;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .subtitle {
              text-align: center;
              color: #6b7280;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #1f2937;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }
            .summary-card {
              border: 1px solid #e5e7eb;
              padding: 15px;
              border-radius: 8px;
            }
            .summary-card h3 {
              font-size: 14px;
              color: #6b7280;
              margin: 0 0 10px 0;
            }
            .summary-item {
              margin-bottom: 10px;
            }
            .summary-item-label {
              font-size: 12px;
              color: #6b7280;
            }
            .summary-item-value {
              font-size: 16px;
              font-weight: bold;
            }
            .summary-item-count {
              font-size: 11px;
              color: #9ca3af;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              font-size: 12px;
              font-weight: bold;
              border: 1px solid #e5e7eb;
            }
            td {
              padding: 8px 10px;
              font-size: 12px;
              border: 1px solid #e5e7eb;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .text-right {
              text-align: right;
            }
            .text-green { color: #059669; }
            .text-yellow { color: #d97706; }
            .text-gray { color: #6b7280; }
            .text-blue { color: #2563eb; }
            .text-red { color: #dc2626; }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <h1>Employee Compensation Report</h1>
          <p class="subtitle">${dateRangeText}</p>
          <p class="subtitle">Generated on ${formatDate(new Date().toISOString())}</p>

          <!-- Commissions Summary -->
          <div class="section">
            <div class="section-title">Commissions Summary</div>
            ${commissionSummary && commissionSummary.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th class="text-right">Available</th>
                    <th class="text-right">Payable</th>
                    <th class="text-right">Paid</th>
                  </tr>
                </thead>
                <tbody>
                  ${commissionSummary.map((summary: any) => `
                    <tr>
                      <td>${summary.employee_name}</td>
                      <td class="text-right text-yellow">${formatCurrency(parseFloat(summary.total_available))} (${summary.count_available})</td>
                      <td class="text-right text-green">${formatCurrency(parseFloat(summary.total_payable))} (${summary.count_payable})</td>
                      <td class="text-right text-gray">${formatCurrency(parseFloat(summary.total_paid))} (${summary.count_paid})</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>No commission data available</p>'}
          </div>

          <!-- Tips Summary -->
          <div class="section">
            <div class="section-title">Tips Summary</div>
            ${tipsStats ? `
              <div class="summary-grid">
                <div class="summary-card">
                  <h3>Total Tips</h3>
                  <div class="summary-item-value text-blue">${formatCurrency(parseFloat(tipsStats.total_tips))}</div>
                </div>
                <div class="summary-card">
                  <h3>Pending</h3>
                  <div class="summary-item-value text-yellow">${formatCurrency(parseFloat(tipsStats.total_pending))}</div>
                  <div class="summary-item-count">${tipsStats.count_pending} tips</div>
                </div>
                <div class="summary-card">
                  <h3>Paid</h3>
                  <div class="summary-item-value text-green">${formatCurrency(parseFloat(tipsStats.total_paid))}</div>
                  <div class="summary-item-count">${tipsStats.count_paid} tips</div>
                </div>
              </div>
              ${tipsStats.by_employee && tipsStats.by_employee.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th class="text-right">Total Tips</th>
                      <th class="text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tipsStats.by_employee.map((emp: any) => `
                      <tr>
                        <td>${emp.employee_name}</td>
                        <td class="text-right text-green">${formatCurrency(parseFloat(emp.total_tips))}</td>
                        <td class="text-right">${emp.count_tips}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
            ` : '<p>No tips data available</p>'}
          </div>

          <!-- Advances Summary -->
          <div class="section">
            <div class="section-title">Advance Payments Summary</div>
            ${advancesStats ? `
              <div class="summary-grid">
                <div class="summary-card">
                  <h3>Total Requested</h3>
                  <div class="summary-item-value text-blue">${formatCurrency(parseFloat(advancesStats.total_requested))}</div>
                </div>
                <div class="summary-card">
                  <h3>Total Approved</h3>
                  <div class="summary-item-value text-green">${formatCurrency(parseFloat(advancesStats.total_approved))}</div>
                </div>
                <div class="summary-card">
                  <h3>Total Paid</h3>
                  <div class="summary-item-value text-green">${formatCurrency(parseFloat(advancesStats.total_paid))}</div>
                  <div class="summary-item-count">${advancesStats.count_paid} payments</div>
                </div>
              </div>
              ${advancesStats.by_employee && advancesStats.by_employee.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th class="text-right">Requested</th>
                      <th class="text-right">Approved</th>
                      <th class="text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${advancesStats.by_employee.map((emp: any) => `
                      <tr>
                        <td>${emp.employee_name}</td>
                        <td class="text-right">${formatCurrency(parseFloat(emp.total_requested))}</td>
                        <td class="text-right text-green">${formatCurrency(parseFloat(emp.total_approved))}</td>
                        <td class="text-right">${emp.count_requests}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
            ` : '<p>No advance payments data available</p>'}
          </div>

          <div class="footer">
            <p>This report was generated from the ${process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'} Employee Compensation Management System</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Tips & Commissions"
            description="Manage commissions, tips, and advance payments"
            breadcrumbs={[
              { label: 'Employees', href: '/settings/users' },
              { label: 'Tips & Commissions' }
            ]}
            actions={
              <>
                {isManager && selectedCommissions.size > 0 && activeTab === 'commissions' && (
                  <>
                    {filteredCommissions.some(c => selectedCommissions.has(c.id) && c.status === 'AVAILABLE') && (
                      <Button
                        onClick={handleMarkPayable}
                        isLoading={markPayableMutation.isPending}
                        variant="outline"
                        size="sm"
                      >
                        <span className="hidden sm:inline">Mark as Payable ({filteredCommissions.filter(c => selectedCommissions.has(c.id) && c.status === 'AVAILABLE').length})</span>
                        <span className="sm:hidden">Mark ({filteredCommissions.filter(c => selectedCommissions.has(c.id) && c.status === 'AVAILABLE').length})</span>
                      </Button>
                    )}
                    {selectedPayableCommissions.length > 0 && (
                      <Button onClick={handleBulkPayment} size="sm">
                        <BanknotesIcon className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Pay Selected ({selectedPayableCommissions.length})</span>
                        <span className="sm:hidden">Pay ({selectedPayableCommissions.length})</span>
                      </Button>
                    )}
                  </>
                )}
                {activeTab === 'advances' && (
                  <Button onClick={() => setIsRecordAdvanceModalOpen(true)} size="sm">
                    <BanknotesIcon className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Record Advance</span>
                    <span className="sm:hidden">Record</span>
                  </Button>
                )}
                {activeTab === 'reports' && (
                  <Button onClick={() => handleExportPDF()} size="sm">
                    <svg className="h-4 w-4 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">Export</span>
                  </Button>
                )}
              </>
            }
          />

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('commissions')}
                className={`${
                  activeTab === 'commissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                Commissions
              </button>
              <button
                onClick={() => setActiveTab('tips')}
                className={`${
                  activeTab === 'tips'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <GiftIcon className="h-5 w-5 mr-2" />
                Tips
              </button>
              <button
                onClick={() => setActiveTab('advances')}
                className={`${
                  activeTab === 'advances'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <BanknotesIcon className="h-5 w-5 mr-2" />
                Advances
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </button>
            </nav>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className={`grid grid-cols-1 ${activeTab === 'reports' ? 'md:grid-cols-4' : currentUser?.role === 'TECHNICIAN' ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
                {activeTab !== 'reports' && (
                  <>
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <div className="relative">
                        <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="pl-10 w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                    {activeTab === 'commissions' && (
                      <>
                        <option value="">All Statuses</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="PAYABLE">Payable</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                      </>
                    )}
                    {activeTab === 'tips' && (
                      <>
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                      </>
                    )}
                    {activeTab === 'advances' && (
                      <>
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                      </>
                    )}
                        </select>
                      </div>
                    </div>
                  </>
                )}
                {currentUser?.role !== 'TECHNICIAN' && activeTab !== 'reports' && (
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search and select employee..."
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        onFocus={() => setIsEmployeeDropdownOpen(true)}
                        className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />

                      {/* Dropdown List */}
                      {isEmployeeDropdownOpen && (
                        <>
                          {/* Backdrop to close dropdown */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsEmployeeDropdownOpen(false)}
                          />

                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {/* All Employees Option */}
                            <div
                              onClick={() => {
                                setEmployeeFilter('');
                                setEmployeeSearchQuery('');
                                setIsEmployeeDropdownOpen(false);
                              }}
                              className={`
                                px-4 py-3 cursor-pointer transition-colors
                                ${!employeeFilter ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">All Employees</p>
                                {!employeeFilter && (
                                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>

                            {/* Filtered Employees */}
                            {users?.results
                              .filter((user) => {
                                const searchLower = employeeSearchQuery.toLowerCase();
                                return (
                                  user.first_name.toLowerCase().includes(searchLower) ||
                                  user.last_name.toLowerCase().includes(searchLower) ||
                                  user.email.toLowerCase().includes(searchLower)
                                );
                              })
                              .map((user) => {
                                const isSelected = employeeFilter === user.id;
                                return (
                                  <div
                                    key={user.id}
                                    onClick={() => {
                                      setEmployeeFilter(user.id);
                                      setEmployeeSearchQuery(`${user.first_name} ${user.last_name}`);
                                      setIsEmployeeDropdownOpen(false);
                                    }}
                                    className={`
                                      px-4 py-3 cursor-pointer transition-colors
                                      ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
                                    `}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                          <div className={`
                                            h-8 w-8 rounded-full flex items-center justify-center
                                            ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                                          `}>
                                            <span className="text-xs font-medium">
                                              {user.first_name.charAt(0)}
                                              {user.last_name.charAt(0)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {user.first_name} {user.last_name}
                                          </p>
                                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'reports' && (
                  <>
                    <div className="relative md:col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Quick Date Filters</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setDateFilter('today')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            dateFilter === 'today'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Today
                        </button>
                        <button
                          onClick={() => setDateFilter('yesterday')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            dateFilter === 'yesterday'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Yesterday
                        </button>
                        <button
                          onClick={() => setDateFilter('last7days')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            dateFilter === 'last7days'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={() => setDateFilter('custom')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            dateFilter === 'custom'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Custom Range
                        </button>
                      </div>
                    </div>
                    {dateFilter === 'custom' && (
                      <>
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="relative">
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}
                    {dateFilter !== 'custom' && (
                      <div className="relative md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Selected Date Range</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                          {startDate && endDate ? (
                            startDate === endDate ? (
                              <span>{formatDate(startDate)}</span>
                            ) : (
                              <span>{formatDate(startDate)} to {formatDate(endDate)}</span>
                            )
                          ) : (
                            <span className="text-gray-400">Loading...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employee Summary Card */}
          {employeeFilter && activeTab !== 'reports' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {users?.results.find(u => u.id === employeeFilter)?.first_name} {users?.results.find(u => u.id === employeeFilter)?.last_name} - Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Commissions Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-blue-900">Commissions Owed</div>
                      <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-700">Available</span>
                        <span className="text-sm font-semibold text-blue-900">
                          {formatCurrency(
                            filteredCommissions
                              .filter(c => c.status === 'AVAILABLE')
                              .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-700">Payable</span>
                        <span className="text-sm font-semibold text-green-700">
                          {formatCurrency(
                            Math.max(
                              filteredCommissions
                                .filter(c => c.status === 'PAYABLE')
                                .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) -
                              filteredAdvances
                                .filter(a => a.status === 'APPROVED' || a.status === 'PAID')
                                .reduce((sum, a) => sum + parseFloat(a.approved_amount || '0'), 0),
                              0
                            )
                          )}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-800">Total Owed</span>
                          <span className="text-base font-bold text-blue-900">
                            {formatCurrency(
                              filteredCommissions
                                .filter(c => c.status === 'AVAILABLE' || c.status === 'PAYABLE')
                                .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0)
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 text-right">
                          {filteredCommissions.filter(c => c.status === 'AVAILABLE' || c.status === 'PAYABLE').length} unpaid
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tips Summary */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-amber-900">Tips Owed</div>
                      <GiftIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-700">Unpaid Tips</span>
                        <span className="text-sm font-semibold text-amber-900">
                          {formatCurrency(
                            filteredTips
                              .filter(t => t.status === 'PENDING')
                              .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                          )}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-amber-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-amber-800">Total Owed</span>
                          <span className="text-base font-bold text-amber-900">
                            {formatCurrency(
                              filteredTips
                                .filter(t => t.status === 'PENDING')
                                .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-amber-600 text-right">
                          {filteredTips.filter(t => t.status === 'PENDING').length} unpaid tip{filteredTips.filter(t => t.status === 'PENDING').length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Advances Summary */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-purple-900">Unrecovered Advances</div>
                      <BanknotesIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-700">Unrecovered Amount</span>
                        <span className="text-sm font-semibold text-orange-700">
                          {formatCurrency(
                            filteredAdvances
                              .filter(a => a.status === 'APPROVED' || a.status === 'PAID')
                              .reduce((sum, a) => sum + parseFloat(a.approved_amount || '0'), 0)
                          )}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-purple-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-800">Total Owed</span>
                          <span className="text-base font-bold text-orange-700">
                            {formatCurrency(
                              filteredAdvances
                                .filter(a => a.status === 'APPROVED' || a.status === 'PAID')
                                .reduce((sum, a) => sum + parseFloat(a.approved_amount || '0'), 0)
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-purple-600 text-right">
                          {filteredAdvances.filter(a => a.status === 'APPROVED' || a.status === 'PAID').length} unrecovered
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          {activeTab === 'commissions' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {isManager && (
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={selectedCommissions.size > 0 && selectedCommissions.size === filteredCommissions.filter(c => c.status === 'PAYABLE').length}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </th>
                        )}
                        {isManager && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job / Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingCommissions ? (
                        <tr>
                          <td colSpan={isManager ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                            Loading commissions...
                          </td>
                        </tr>
                      ) : filteredCommissions.length === 0 ? (
                        <tr>
                          <td colSpan={isManager ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                            No commissions found
                          </td>
                        </tr>
                      ) : (
                        filteredCommissions.map((commission) => (
                          <tr key={commission.id} className="hover:bg-gray-50">
                            {isManager && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                {commission.status === 'PAYABLE' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedCommissions.has(commission.id)}
                                    onChange={() => handleSelectCommission(commission.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                )}
                              </td>
                            )}
                            {isManager && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {commission.employee_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{commission.employee_email}</div>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {commission.job_number}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {commission.service_name}
                                </div>
                                <div className="text-xs text-gray-400">{commission.customer_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(parseFloat(commission.service_amount))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-green-600">
                                {formatCurrency(parseFloat(commission.commission_amount))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {commission.commission_rate}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(commission.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>{formatDate(commission.created_at)}</div>
                              {commission.paid_at && (
                                <div className="text-xs text-gray-400">
                                  Paid: {formatDate(commission.paid_at)}
                                </div>
                              )}
                              {commission.payment_reference && (
                                <div className="text-xs text-blue-600">
                                  Ref: {commission.payment_reference}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'tips' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {isManager && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        {isManager && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingTips ? (
                        <tr>
                          <td colSpan={isManager ? 6 : 4} className="px-6 py-12 text-center text-gray-500">
                            Loading tips...
                          </td>
                        </tr>
                      ) : filteredTips.length === 0 ? (
                        <tr>
                          <td colSpan={isManager ? 6 : 4} className="px-6 py-12 text-center text-gray-500">
                            No tips found
                          </td>
                        </tr>
                      ) : (
                        filteredTips.map((tip) => (
                          <tr key={tip.id} className="hover:bg-gray-50">
                            {isManager && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {tip.employee_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{tip.employee_email}</div>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{tip.job_number}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-green-600">
                                {formatCurrency(parseFloat(tip.amount))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(tip.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>{formatDate(tip.created_at)}</div>
                              {tip.paid_at && (
                                <div className="text-xs text-gray-400">
                                  Paid: {formatDate(tip.paid_at)}
                                </div>
                              )}
                            </td>
                            {isManager && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {tip.status === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTip(tip);
                                      setIsTipPaymentModalOpen(true);
                                    }}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'advances' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {isManager && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Approved
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        {isManager && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingAdvances ? (
                        <tr>
                          <td colSpan={isManager ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                            Loading advances...
                          </td>
                        </tr>
                      ) : filteredAdvances.length === 0 ? (
                        <tr>
                          <td colSpan={isManager ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                            No advance payments found
                          </td>
                        </tr>
                      ) : (
                        filteredAdvances.map((advance) => (
                          <tr key={advance.id} className="hover:bg-gray-50">
                            {isManager && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {advance.employee_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{advance.employee_email}</div>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(parseFloat(advance.requested_amount))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-green-600">
                                {advance.approved_amount ? formatCurrency(parseFloat(advance.approved_amount)) : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {advance.reason}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(advance.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>{formatDate(advance.created_at)}</div>
                              {advance.reviewed_at && (
                                <div className="text-xs text-gray-400">
                                  Reviewed: {formatDate(advance.reviewed_at)}
                                </div>
                              )}
                              {advance.paid_at && (
                                <div className="text-xs text-gray-400">
                                  Paid: {formatDate(advance.paid_at)}
                                </div>
                              )}
                            </td>
                            {isManager && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                {advance.status === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAdvance(advance);
                                      setIsAdvanceReviewModalOpen(true);
                                    }}
                                  >
                                    Review
                                  </Button>
                                )}
                                {advance.status === 'APPROVED' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAdvance(advance);
                                      setIsAdvancePaymentModalOpen(true);
                                    }}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Commissions Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Commissions Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {commissionSummary && commissionSummary.map((summary: any) => (
                      <div key={summary.employee} className="border-b last:border-0 pb-3 last:pb-0">
                        <div className="text-sm font-medium text-gray-900">{summary.employee_name}</div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div>
                            <div className="text-xs text-gray-500">Available</div>
                            <div className="text-sm font-semibold text-yellow-600">
                              {formatCurrency(parseFloat(summary.total_available))}
                            </div>
                            <div className="text-xs text-gray-400">({summary.count_available})</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Payable</div>
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(parseFloat(summary.total_payable))}
                            </div>
                            <div className="text-xs text-gray-400">({summary.count_payable})</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Paid</div>
                            <div className="text-sm font-semibold text-gray-600">
                              {formatCurrency(parseFloat(summary.total_paid))}
                            </div>
                            <div className="text-xs text-gray-400">({summary.count_paid})</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Tips Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Tips Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tipsStats && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500">Total Tips</div>
                            <div className="text-xl font-bold text-blue-600">
                              {formatCurrency(parseFloat(tipsStats.total_tips))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Pending</div>
                            <div className="text-xl font-bold text-yellow-600">
                              {formatCurrency(parseFloat(tipsStats.total_pending))}
                            </div>
                            <div className="text-xs text-gray-400">({tipsStats.count_pending})</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <div className="text-xs text-gray-500">Paid</div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatCurrency(parseFloat(tipsStats.total_paid))}
                            </div>
                            <div className="text-xs text-gray-400">({tipsStats.count_paid})</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Cancelled</div>
                            <div className="text-lg font-semibold text-red-600">
                              {formatCurrency(parseFloat(tipsStats.total_cancelled))}
                            </div>
                            <div className="text-xs text-gray-400">({tipsStats.count_cancelled})</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Advances Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Advances Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {advancesStats && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500">Total Requested</div>
                            <div className="text-xl font-bold text-blue-600">
                              {formatCurrency(parseFloat(advancesStats.total_requested))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Approved</div>
                            <div className="text-xl font-bold text-green-600">
                              {formatCurrency(parseFloat(advancesStats.total_approved))}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                          <div>
                            <div className="text-xs text-gray-500">Pending</div>
                            <div className="text-sm font-semibold text-yellow-600">
                              {advancesStats.count_pending}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Paid</div>
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(parseFloat(advancesStats.total_paid))}
                            </div>
                            <div className="text-xs text-gray-400">({advancesStats.count_paid})</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Rejected</div>
                            <div className="text-sm font-semibold text-red-600">
                              {advancesStats.count_rejected}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Employee Breakdown */}
              {isManager && tipsStats?.by_employee && tipsStats.by_employee.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Tips by Employee</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Tips</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {tipsStats.by_employee.map((emp: any, index: number) => (
                            <tr key={`tip-emp-${emp.employee_id}-${index}`}>
                              <td className="px-4 py-2 text-sm text-gray-900">{emp.employee_name}</td>
                              <td className="px-4 py-2 text-sm text-right font-semibold text-green-600">
                                {formatCurrency(parseFloat(emp.total_tips))}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600">{emp.count_tips}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Advance Breakdown */}
              {isManager && advancesStats?.by_employee && advancesStats.by_employee.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Advances by Employee</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {advancesStats.by_employee.map((emp: any, index: number) => (
                            <tr key={`advance-emp-${emp.employee_id}-${index}`}>
                              <td className="px-4 py-2 text-sm text-gray-900">{emp.employee_name}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600">
                                {formatCurrency(parseFloat(emp.total_requested))}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-semibold text-green-600">
                                {formatCurrency(parseFloat(emp.total_approved))}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-gray-600">{emp.count_requests}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Modals */}
          <BulkPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            commissions={selectedPayableCommissions}
            advances={advances?.results || []}
            onSuccess={() => setSelectedCommissions(new Set())}
          />

          <TipPaymentModal
            isOpen={isTipPaymentModalOpen}
            onClose={() => {
              setIsTipPaymentModalOpen(false);
              setSelectedTip(null);
            }}
            tip={selectedTip}
            onSuccess={() => setSelectedTip(null)}
          />

          <AdvanceReviewModal
            isOpen={isAdvanceReviewModalOpen}
            onClose={() => {
              setIsAdvanceReviewModalOpen(false);
              setSelectedAdvance(null);
            }}
            advance={selectedAdvance}
            onSuccess={() => setSelectedAdvance(null)}
          />

          <AdvancePaymentModal
            isOpen={isAdvancePaymentModalOpen}
            onClose={() => {
              setIsAdvancePaymentModalOpen(false);
              setSelectedAdvance(null);
            }}
            advance={selectedAdvance}
            onSuccess={() => setSelectedAdvance(null)}
          />

          <RecordAdvanceModal
            isOpen={isRecordAdvanceModalOpen}
            onClose={() => setIsRecordAdvanceModalOpen(false)}
            onSuccess={() => {}}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
