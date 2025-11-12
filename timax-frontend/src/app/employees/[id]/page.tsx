'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient, User, Job, Commission, Tip, AdvancePayment } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface EmployeeDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'custom';

export default function EmployeeDetailsPage({ params }: EmployeeDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'commissions' | 'tips' | 'advances'>('overview');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    reason: '',
    paymentMethod: 'CASH',
    paymentReference: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        return { start_date: formatDate(today), end_date: formatDate(today) };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start_date: formatDate(yesterday), end_date: formatDate(yesterday) };
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start_date: formatDate(sevenDaysAgo), end_date: formatDate(today) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start_date: customStartDate, end_date: customEndDate };
        }
        return {};
      default:
        return {};
    }
  };

  const dateRange = getDateRange();

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers({ is_active: true }),
  });

  const employee = users?.results.find(u => u.id === id);

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', id],
    queryFn: () => apiClient.getJobs({ employee: id }),
    enabled: !!id,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['employee-commissions', id],
    queryFn: () => apiClient.getCommissions({ employee: id }),
    enabled: !!id,
  });

  const { data: tips, isLoading: tipsLoading } = useQuery({
    queryKey: ['employee-tips', id],
    queryFn: () => apiClient.getTips({ employee: id }),
    enabled: !!id,
  });

  const { data: advances, isLoading: advancesLoading } = useQuery({
    queryKey: ['employee-advances', id],
    queryFn: () => apiClient.getAdvancePayments({ employee: id }),
    enabled: !!id,
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['commission-summary'],
    queryFn: () => apiClient.getCommissionSummary(),
  });

  const summary = commissionSummary?.find(s => s.employee === id);

  // Calculate tip summaries
  const tipsPaid = tips?.results.filter(t => t.status === 'PAID').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  const tipsUnpaid = tips?.results.filter(t => t.status === 'PENDING').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  // Calculate unrecovered advances (PAID advances that haven't been deducted from commissions yet)
  // For now, we'll consider all PAID advances as unrecovered
  const unrecoveredAdvances = advances?.results
    .filter(a => a.status === 'PAID')
    .reduce((sum, a) => sum + parseFloat(a.approved_amount), 0) || 0;

  // Adjust payable commissions by subtracting unrecovered advances
  const adjustedPayable = summary ? Math.max(0, parseFloat(summary.total_payable) - unrecoveredAdvances) : 0;

  // Mutation for marking tips as paid
  const markTipPaidMutation = useMutation({
    mutationFn: ({ tipId, data }: { tipId: string; data: { payment_method: string; payment_reference?: string; payment_notes?: string } }) =>
      apiClient.markTipAsPaid(tipId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tips', id] });
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      toast.success('Tip marked as paid successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark tip as paid');
    },
  });

  // Mutation for giving advance directly
  const giveAdvanceMutation = useMutation({
    mutationFn: (data: { employee: string; requested_amount: string; reason: string; payment_method: string; payment_reference?: string }) =>
      apiClient.giveAdvanceDirectly(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-advances', id] });
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] });
      toast.success('Advance given successfully!');
      setShowAdvanceModal(false);
      setAdvanceForm({ amount: '', reason: '', paymentMethod: 'CASH', paymentReference: '' });
      setFormErrors({});
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to give advance';
      toast.error(errorMsg);
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      QC: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      INVOICED: 'bg-teal-100 text-teal-800',
      PAID: 'bg-emerald-100 text-emerald-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getCommissionStatusBadge = (status: string) => {
    const styles = {
      AVAILABLE: 'bg-yellow-100 text-yellow-800',
      PAYABLE: 'bg-green-100 text-green-800',
      PAID: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    const icons = {
      AVAILABLE: ClockIcon,
      PAYABLE: CurrencyDollarIcon,
      PAID: CheckCircleIcon,
      CANCELLED: null,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status}
      </span>
    );
  };

  const getTipStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    const icons = {
      PENDING: ClockIcon,
      PAID: CheckCircleIcon,
      CANCELLED: XMarkIcon,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status}
      </span>
    );
  };

  const getAdvanceStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    const icons = {
      PENDING: ClockIcon,
      APPROVED: CheckCircleIcon,
      REJECTED: XMarkIcon,
      PAID: CheckCircleIcon,
      CANCELLED: XMarkIcon,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status}
      </span>
    );
  };

  const handleMarkTipPaid = (tipId: string) => {
    const paymentMethod = prompt('Enter payment method (CASH, CARD, MOBILE_MONEY, BANK_TRANSFER):');
    if (!paymentMethod) return;

    const paymentReference = prompt('Enter payment reference (optional):');
    const paymentNotes = prompt('Enter payment notes (optional):');

    markTipPaidMutation.mutate({
      tipId,
      data: {
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        payment_notes: paymentNotes || undefined,
      },
    });
  };

  const validateAdvanceForm = () => {
    const errors: Record<string, string> = {};

    if (!advanceForm.amount || isNaN(parseFloat(advanceForm.amount))) {
      errors.amount = 'Please enter a valid amount';
    } else if (parseFloat(advanceForm.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else if (summary && parseFloat(advanceForm.amount) > adjustedPayable) {
      errors.amount = `Amount exceeds available payable commissions (${formatCurrency(adjustedPayable)})`;
    }

    if (!advanceForm.reason.trim()) {
      errors.reason = 'Reason is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGiveAdvance = () => {
    if (!validateAdvanceForm()) {
      return;
    }

    giveAdvanceMutation.mutate({
      employee: id,
      requested_amount: advanceForm.amount,
      reason: advanceForm.reason,
      payment_method: advanceForm.paymentMethod,
      payment_reference: advanceForm.paymentReference || undefined,
    });
  };

  const handleOpenAdvanceModal = () => {
    setShowAdvanceModal(true);
    setFormErrors({});
  };

  const handleCloseAdvanceModal = () => {
    setShowAdvanceModal(false);
    setAdvanceForm({ amount: '', reason: '', paymentMethod: 'CASH', paymentReference: '' });
    setFormErrors({});
  };

  if (!employee) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Employee not found</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.back()}>
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <p className="text-sm text-gray-500">{employee.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{employee.email}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{employee.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Member Since</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.date_joined ? formatDate(employee.date_joined) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Summary */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Available</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(parseFloat(summary.total_available))}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{summary.count_available} jobs</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <ClockIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Payable</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(adjustedPayable)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{summary.count_payable} jobs</p>
                      {unrecoveredAdvances > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Less advances: {formatCurrency(unrecoveredAdvances)}
                        </p>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Paid Commissions</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {formatCurrency(parseFloat(summary.total_paid))}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{summary.count_paid} jobs</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <CheckCircleIcon className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tips Summary */}
          {tips && tips.results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Unpaid Tips</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(tipsUnpaid)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {tips.results.filter(t => t.status === 'PENDING').length} pending
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <BanknotesIcon className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Paid Tips</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(tipsPaid)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {tips.results.filter(t => t.status === 'PAID').length} paid
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'jobs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <WrenchScrewdriverIcon className="h-4 w-4 inline mr-1" />
                Jobs ({jobs?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'commissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                Commissions ({commissions?.results.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('tips')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'tips'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BanknotesIcon className="h-4 w-4 inline mr-1" />
                Tips ({tips?.results.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('advances')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'advances'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                Advances ({advances?.results.length || 0})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <p className="text-gray-500 text-sm">Loading jobs...</p>
                  ) : jobs && jobs.length > 0 ? (
                    <div className="space-y-3">
                      {jobs.slice(0, 5).map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{job.job_number}</p>
                              <p className="text-xs text-gray-500">{job.customer_name}</p>
                            </div>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(job.created_at)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No jobs assigned yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Commissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {commissionsLoading ? (
                    <p className="text-gray-500 text-sm">Loading commissions...</p>
                  ) : commissions && commissions.results.length > 0 ? (
                    <div className="space-y-3">
                      {commissions.results.slice(0, 5).map((commission) => (
                        <div
                          key={commission.id}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900">{commission.job_number}</p>
                            {getCommissionStatusBadge(commission.status)}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">{commission.service_name}</p>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(parseFloat(commission.commission_amount))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No commissions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'jobs' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {jobsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            Loading jobs...
                          </td>
                        </tr>
                      ) : jobs && jobs.length > 0 ? (
                        jobs.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                href={`/jobs/${job.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {job.job_number}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{job.customer_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{job.vehicle_display}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(job.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(parseFloat(job.final_total))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(job.created_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                            No jobs assigned yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'commissions' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Amount
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
                      {commissionsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            Loading commissions...
                          </td>
                        </tr>
                      ) : commissions && commissions.results.length > 0 ? (
                        commissions.results.map((commission) => (
                          <tr key={commission.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                href={`/jobs/${commission.job}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {commission.job_number}
                              </Link>
                              <div className="text-xs text-gray-500">{commission.customer_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{commission.service_name}</div>
                              <div className="text-xs text-gray-500">{commission.commission_rate}% rate</div>
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
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getCommissionStatusBadge(commission.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(commission.created_at)}</div>
                              {commission.paid_at && (
                                <div className="text-xs text-gray-400">
                                  Paid: {formatDate(commission.paid_at)}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                            No commissions yet
                          </td>
                        </tr>
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
                          Payment Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tipsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            Loading tips...
                          </td>
                        </tr>
                      ) : tips && tips.results.length > 0 ? (
                        tips.results.map((tip) => (
                          <tr key={tip.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                href={`/jobs/${tip.job}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {tip.job_number}
                              </Link>
                              <div className="text-xs text-gray-500">{tip.customer_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-amber-600">
                                {formatCurrency(parseFloat(tip.amount))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getTipStatusBadge(tip.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {tip.payment_method_display || '-'}
                              </div>
                              {tip.payment_reference && (
                                <div className="text-xs text-gray-500">
                                  Ref: {tip.payment_reference}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{formatDate(tip.created_at)}</div>
                              {tip.paid_at && (
                                <div className="text-xs text-gray-400">
                                  Paid: {formatDate(tip.paid_at)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {tip.status === 'PENDING' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkTipPaid(tip.id)}
                                  isLoading={markTipPaidMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
                              {tip.status === 'PAID' && (
                                <span className="text-gray-400">Paid</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                            No tips yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'advances' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Advance Payments</CardTitle>
                  <Button
                    onClick={handleOpenAdvanceModal}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                    Give Advance
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Given Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Given By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Method
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {advancesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            Loading advances...
                          </td>
                        </tr>
                      ) : advances && advances.results.length > 0 ? (
                        advances.results.map((advance) => (
                          <tr key={advance.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-blue-600">
                                {formatCurrency(parseFloat(advance.approved_amount || advance.requested_amount))}
                              </div>
                              {advance.reason && (
                                <div className="text-xs text-gray-500 max-w-xs truncate">
                                  {advance.reason}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getAdvanceStatusBadge(advance.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {advance.paid_at ? formatDate(advance.paid_at) : formatDate(advance.requested_at)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {advance.paid_by_name || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {advance.payment_method_display || '-'}
                              </div>
                              {advance.payment_reference && (
                                <div className="text-xs text-gray-500">
                                  Ref: {advance.payment_reference}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                            No advances yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Give Advance Modal */}
          <Dialog open={showAdvanceModal} onOpenChange={setShowAdvanceModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Give Advance Payment</DialogTitle>
              </DialogHeader>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Available Commission Info */}
                {summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Available Payable Commissions</p>
                        <p className="text-xs text-blue-600 mt-1">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(adjustedPayable)}
                      </p>
                    </div>
                  </div>
                )}

                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  required
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  error={formErrors.amount}
                  placeholder="Enter advance amount"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={advanceForm.reason}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                    placeholder="Enter reason for advance"
                    rows={3}
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
                  value={advanceForm.paymentMethod}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMethod: e.target.value })}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'MPESA', label: 'M-Pesa' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'CARD', label: 'Card' },
                  ]}
                />

                <Input
                  label="Payment Reference"
                  type="text"
                  value={advanceForm.paymentReference}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, paymentReference: e.target.value })}
                  placeholder="Optional payment reference"
                />
              </div>

              <DialogFooter className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCloseAdvanceModal}
                  disabled={giveAdvanceMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGiveAdvance}
                  isLoading={giveAdvanceMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Give Advance
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
