'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  TruckIcon,
  CubeIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PhoneIcon,
  PrinterIcon,
  ShareIcon,
  MapPinIcon,
  DocumentIcon,
  ReceiptPercentIcon,
  XMarkIcon,
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import JobCard from '@/components/job/JobCard';
import ReceiptPDF from '@/components/receipt/ReceiptPDF';
import InvoicePDF from '@/components/invoice/InvoicePDF';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

function getStatusIcon(status: string) {
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    case 'SCHEDULED':
      return <ClockIconSolid className="h-5 w-5 text-amber-500" />;
    case 'IN_PROGRESS':
      return <WrenchScrewdriverIcon className="h-5 w-5 text-blue-500" />;
    case 'QC':
      return <CheckCircleIcon className="h-5 w-5 text-purple-500" />;
    case 'COMPLETED':
      return <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
    case 'INVOICED':
      return <CurrencyDollarIcon className="h-5 w-5 text-indigo-500" />;
    case 'PAID':
      return <CheckCircleIconSolid className="h-5 w-5 text-green-500" />;
    case 'CLOSED':
      return <CheckCircleIconSolid className="h-5 w-5 text-gray-600" />;
    default:
      return <ClockIcon className="h-5 w-5 text-gray-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'SCHEDULED':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'QC':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'INVOICED':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'PAID':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'CLOSED':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusLabel(status: string) {
  switch (status.toUpperCase()) {
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'QC':
      return 'Quality Check';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params?.id as string;
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showJobCard, setShowJobCard] = useState(false);
  const [showReceiptPDF, setShowReceiptPDF] = useState(false);
  const [showInvoicePDF, setShowInvoicePDF] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'CASH' as const,
    reference: '',
    notes: ''
  });
  const [paymentErrors, setPaymentErrors] = useState<{[key: string]: string}>({});
  const [tipAllocations, setTipAllocations] = useState<{[employeeId: string]: string}>({});

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiClient.getJob(jobId),
    enabled: !!jobId,
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices', jobId],
    queryFn: () => apiClient.getInvoices({ job: jobId } as any),
    enabled: !!jobId && (job?.status === 'COMPLETED' || job?.status === 'INVOICED' || job?.status === 'PAID' || job?.status === 'CLOSED'),
  });

  const { data: receipts } = useQuery({
    queryKey: ['receipts', jobId],
    queryFn: () => apiClient.getReceipts({ job: jobId }),
    enabled: !!jobId && (job?.status === 'PAID' || job?.status === 'CLOSED'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => apiClient.updateJob(jobId, { status: newStatus as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: () => apiClient.generateInvoiceFromJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Invoice generated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to generate invoice';
      toast.error(errorMessage);
    },
  });

  const completeJobMutation = useMutation({
    mutationFn: () => apiClient.completeJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job completed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete job');
    },
  });

  const generateReceiptMutation = useMutation({
    mutationFn: (paymentId: string) => apiClient.generateReceiptFromPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const createPaymentAndReceiptMutation = useMutation({
    mutationFn: async (paymentInfo: typeof paymentData & { tips: {[employeeId: string]: string} }) => {
      // Create payment with the actual amount paid (including tips)
      const payment = await apiClient.createPayment({
        job: jobId,
        amount: paymentInfo.amount,
        payment_method: paymentInfo.method,
        reference_number: paymentInfo.reference,
        notes: paymentInfo.notes,
        status: 'COMPLETED'
      });

      // Generate receipt from payment
      const receipt = await apiClient.generateReceiptFromPayment(payment.id);

      // Create tips for employees with allocated amounts
      const tipPromises = Object.entries(paymentInfo.tips)
        .filter(([_, amount]) => amount && parseFloat(amount) > 0)
        .map(([employeeId, amount]) =>
          apiClient.createTip({
            employee: employeeId,
            job: jobId,
            amount: amount,
            notes: `Tip for Job #${job?.job_number}`,
            status: 'PENDING'
          })
        );

      await Promise.all(tipPromises);

      return { payment, receipt };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['receipts', jobId] });
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      setShowPaymentModal(false);
      setPaymentData({ amount: '', method: 'CASH', reference: '', notes: '' });
      setTipAllocations({});
      toast.success('Payment processed and tips allocated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.job?.[0] ||
                          error.response?.data?.error ||
                          error.response?.data?.message ||
                          'Failed to process payment';
      toast.error(errorMessage);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleViewInvoice = () => {
    const jobInvoice = invoices?.results?.find(invoice => invoice.job === jobId);
    if (jobInvoice) {
      setSelectedInvoice(jobInvoice);
      setShowInvoicePDF(true);
    } else {
      toast.error('Invoice not found for this job');
    }
  };

  const handleViewReceipt = () => {
    const jobReceipts = receipts?.results?.filter(receipt => receipt.job === jobId);
    if (jobReceipts && jobReceipts.length > 0) {
      setSelectedReceipt(jobReceipts[0]); // Show the first/latest receipt
      setShowReceiptPDF(true);
    } else {
      alert('No receipts found for this job');
    }
  };

  const handleMarkAsPaid = () => {
    // Pre-fill the payment amount with the job's final total
    setPaymentData(prev => ({
      ...prev,
      amount: job?.final_total || ''
    }));
    setShowPaymentModal(true);
  };

  const validatePayment = () => {
    const errors: {[key: string]: string} = {};

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      errors.amount = 'Please enter a valid payment amount';
    }

    // Note: We now allow amounts greater than total due (excess becomes tips)

    if (paymentData.method === 'CARD' || paymentData.method === 'BANK_TRANSFER' || paymentData.method === 'CHEQUE') {
      if (!paymentData.reference) {
        errors.reference = 'Reference number is required for this payment method';
      }
    }

    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPayment = () => {
    if (!validatePayment()) {
      return;
    }
    createPaymentAndReceiptMutation.mutate({ ...paymentData, tips: tipAllocations });
  };

  // Calculate excess amount for tips
  const calculateExcessAmount = () => {
    if (!paymentData.amount || !job?.final_total) return 0;
    const paidAmount = parseFloat(paymentData.amount);
    const totalDue = parseFloat(job.final_total);
    return paidAmount > totalDue ? paidAmount - totalDue : 0;
  };

  // Handle payment amount change and auto-distribute tips
  const handlePaymentAmountChange = (value: string) => {
    setPaymentData(prev => ({ ...prev, amount: value }));
    if (paymentErrors.amount) {
      setPaymentErrors(prev => ({ ...prev, amount: '' }));
    }

    // Calculate excess and distribute among employees
    if (value && job?.final_total) {
      const paidAmount = parseFloat(value);
      const totalDue = parseFloat(job.final_total);
      const excess = paidAmount > totalDue ? paidAmount - totalDue : 0;

      if (excess > 0 && uniqueEmployees.length > 0) {
        // Distribute excess equally among all employees
        const tipPerEmployee = (excess / uniqueEmployees.length).toFixed(2);
        const newTipAllocations: {[key: string]: string} = {};
        uniqueEmployees.forEach(emp => {
          newTipAllocations[emp.id] = tipPerEmployee;
        });
        setTipAllocations(newTipAllocations);
      } else if (excess === 0) {
        // Clear tips if no excess
        setTipAllocations({});
      }
    }
  };

  // Extract unique employees from job lines
  const getUniqueEmployees = () => {
    if (!job || !job.lines) return [];

    const employeeMap = new Map<string, { id: string; name: string }>();

    job.lines.forEach((line: any) => {
      // assigned_employees is an array of employee IDs
      // assigned_employee_names is an array of employee names
      if (line.assigned_employees && line.assigned_employee_names &&
          Array.isArray(line.assigned_employees) && Array.isArray(line.assigned_employee_names)) {
        line.assigned_employees.forEach((empId: string, index: number) => {
          const empName = line.assigned_employee_names[index];
          if (empId && empName) {
            employeeMap.set(empId, { id: empId, name: empName });
          }
        });
      }
    });

    return Array.from(employeeMap.values());
  };

  const uniqueEmployees = getUniqueEmployees();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !job) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900">Job not found</h2>
            <p className="text-gray-500 mt-2">The job you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/jobs')} className="mt-4">
              Back to Jobs
            </Button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-4 md:space-y-6 bg-gray-50 min-h-screen pb-4 sm:pb-6 md:pb-8">
          {/* Header */}
          <PageHeader
            title={`Job #${job.job_number}`}
            description={`Created ${formatDate(job.created_at)}${job.created_by_name ? ` by ${job.created_by_name}` : ''}`}
            breadcrumbs={[
              { label: 'Jobs', href: '/jobs' },
              { label: `Job #${job.job_number}` }
            ]}
            actions={
              <>
                {job.status.toUpperCase() === 'INVOICED' && (
                  <Button variant="outline" size="sm" className="flex items-center hover:bg-gray-50" onClick={handleViewInvoice}>
                    <DocumentIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Invoice</span>
                  </Button>
                )}
                {(job.status.toUpperCase() === 'PAID' || job.status.toUpperCase() === 'CLOSED') && (
                  <Button variant="outline" size="sm" className="flex items-center hover:bg-gray-50" onClick={handleViewReceipt}>
                    <ReceiptPercentIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Receipt</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center hover:bg-gray-50"
                  onClick={() => setShowJobCard(true)}
                >
                  <PrinterIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Job Card</span>
                </Button>
                <Button variant="outline" size="sm" className="hidden lg:flex items-center hover:bg-gray-50">
                  <ShareIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center hover:bg-gray-50"
                  onClick={() => router.push(`/jobs/${jobId}/edit`)}
                  disabled={job.status !== 'DRAFT'}
                  title={job.status !== 'DRAFT' ? 'Jobs can only be edited when in DRAFT status' : 'Edit this job'}
                >
                  <PencilIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                  {job.status !== 'DRAFT' && <LockClosedIcon className="h-3.5 w-3.5 ml-1 text-gray-400" />}
                </Button>
              </>
            }
          />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 mb-4 md:mb-6">
            {/* Status and Key Metrics */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Status Badge */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  <span className="ml-1.5 sm:ml-2">{getStatusLabel(job.status)}</span>
                </div>
                {job.status.toUpperCase() === 'IN_PROGRESS' && (
                  <div className="flex items-center text-xs sm:text-sm text-amber-600">
                    <ClockIconSolid className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    <span className="font-medium">In Progress</span>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3">
                <div>
                  <p className="text-gray-500 text-[10px] sm:text-xs">Estimate Total</p>
                  <p className="font-semibold text-base sm:text-lg text-gray-900">{formatCurrency(parseFloat(job.estimate_total))}</p>
                </div>
                {parseFloat(job.final_total) !== parseFloat(job.estimate_total) && (
                  <div>
                    <p className="text-gray-500 text-[10px] sm:text-xs">Final Total</p>
                    <p className="font-semibold text-base sm:text-lg text-gray-900">{formatCurrency(parseFloat(job.final_total))}</p>
                  </div>
                )}
                {job.balance_due > 0 && (
                  <div>
                    <p className="text-red-600 text-[10px] sm:text-xs">Balance Due</p>
                    <p className="font-semibold text-base sm:text-lg text-red-600">{formatCurrency(job.balance_due)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Service Lines */}
              <Card className="shadow-sm">
                <CardHeader className="bg-gray-50 border-b px-3 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <WrenchScrewdriverIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-600" />
                      <span className="hidden sm:inline">Services & Materials</span>
                      <span className="sm:hidden">Services</span>
                    </CardTitle>
                    <span className="text-xs sm:text-sm text-gray-500">
                      {job.lines?.length || 0} service{(job.lines?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {job.lines && job.lines.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {job.lines.map((line: any, index: number) => (
                        <div key={line.id || index} className="p-3 sm:p-4 md:p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-3 sm:mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm sm:text-base break-words">{line.service_variant_name}</h4>
                                {line.is_completed && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircleIconSolid className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    Done
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                <span className="font-medium">{line.service_name}</span> • {line.part_name}
                              </p>
                              <div className="flex items-center text-[10px] sm:text-xs text-gray-500">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                {line.duration_minutes} min
                              </div>
                            </div>
                            <div className="text-right sm:ml-4 sm:min-w-[120px]">
                              <p className="font-bold text-lg sm:text-xl text-gray-900 mb-0.5 sm:mb-1">{formatCurrency(parseFloat(line.total_amount))}</p>
                              <p className="text-xs sm:text-sm text-gray-500">
                                {line.quantity}x @ {formatCurrency(parseFloat(line.unit_price))}
                              </p>
                              {parseFloat(line.discount_amount) > 0 && (
                                <p className="text-[10px] sm:text-xs text-green-600">
                                  -{formatCurrency(parseFloat(line.discount_amount))} off
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Inventory Items */}
                          {line.inventory_items && line.inventory_items.length > 0 && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                              <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                                <CubeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-gray-500" />
                                <span className="hidden sm:inline">Materials & Parts Used</span>
                                <span className="sm:hidden">Materials</span>
                              </h5>
                              <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                <div className="space-y-1.5 sm:space-y-2">
                                  {line.inventory_items.map((item: any, itemIndex: number) => (
                                    <div key={item.id || itemIndex} className="text-xs sm:text-sm">
                                      <span className="font-medium text-gray-900">{item.sku}</span>
                                      <span className="text-gray-600 ml-1 sm:ml-2">({item.quantity_used} units)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Assigned Employees */}
                          {line.assigned_employee_names && line.assigned_employee_names.length > 0 && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                              <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                                <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-gray-500" />
                                <span className="hidden sm:inline">Assigned Employees</span>
                                <span className="sm:hidden">Staff</span>
                              </h5>
                              <div className="bg-green-50 rounded-lg p-2 sm:p-3">
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                  {line.assigned_employee_names.map((employeeName: string, empIndex: number) => (
                                    <span
                                      key={empIndex}
                                      className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800 border border-green-200"
                                    >
                                      <UserIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                      {employeeName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {line.notes && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                                <h6 className="text-[10px] sm:text-xs font-semibold text-blue-800 mb-1 flex items-center">
                                  <InformationCircleIcon className="h-3 w-3 mr-1" />
                                  Notes
                                </h6>
                                <p className="text-xs sm:text-sm text-blue-700 break-words">{line.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <WrenchScrewdriverIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No services added to this job</p>
                      <p className="text-sm text-gray-400">Services will appear here once added</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job Notes */}
              {(job.notes || job.internal_notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {job.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Customer Notes</label>
                        <p className="text-gray-900 mt-1">{job.notes}</p>
                      </div>
                    )}
                    {job.internal_notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Internal Notes</label>
                        <p className="text-gray-900 mt-1">{job.internal_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              {job.status.toUpperCase() !== 'CLOSED' && job.status.toUpperCase() !== 'PAID' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {job.status.toUpperCase() === 'DRAFT' && (
                        <Button
                          onClick={() => handleStatusChange('SCHEDULED')}
                          isLoading={updateStatusMutation.isPending}
                        >
                          <ClockIcon className="h-4 w-4 mr-2" />
                          Schedule Job
                        </Button>
                      )}
                      {job.status.toUpperCase() === 'SCHEDULED' && (
                        <Button
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                          isLoading={updateStatusMutation.isPending}
                        >
                          <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                          Start Job
                        </Button>
                      )}
                      {job.status.toUpperCase() === 'IN_PROGRESS' && (
                        <Button
                          onClick={() => completeJobMutation.mutate()}
                          isLoading={completeJobMutation.isPending}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Complete Job
                        </Button>
                      )}
                      {job.status.toUpperCase() === 'QC' && (
                        <>
                          <Button
                            onClick={() => generateInvoiceMutation.mutate()}
                            isLoading={generateInvoiceMutation.isPending}
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            Create Invoice
                          </Button>
                          <Button
                            onClick={() => setShowPaymentModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleStatusChange('IN_PROGRESS')}
                            isLoading={updateStatusMutation.isPending}
                          >
                            Return to Work
                          </Button>
                        </>
                      )}
                      {job.status.toUpperCase() === 'COMPLETED' && (
                        <>
                          <Button
                            onClick={() => generateInvoiceMutation.mutate()}
                            isLoading={generateInvoiceMutation.isPending}
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            Create Invoice
                          </Button>
                          <Button
                            onClick={() => setShowPaymentModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </Button>
                        </>
                      )}
                      {job.status.toUpperCase() === 'INVOICED' && (
                        <>
                          <Button
                            variant="outline"
                            className="flex items-center hover:bg-gray-50"
                            onClick={handleViewInvoice}
                          >
                            <DocumentIcon className="h-4 w-4 mr-2" />
                            View Invoice
                          </Button>
                          <Button
                            onClick={handleMarkAsPaid}
                            isLoading={createPaymentAndReceiptMutation.isPending}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </Button>
                        </>
                      )}
                      {job.status.toUpperCase() === 'PAID' && (
                        <Button
                          variant="outline"
                          className="flex items-center hover:bg-gray-50"
                          onClick={handleViewReceipt}
                        >
                          <ReceiptPercentIcon className="h-4 w-4 mr-2" />
                          View Receipt
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.customer_name ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="text-gray-900">{job.customer_name}</p>
                        </div>
                        {job.customer_phone && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Phone</label>
                            <p className="text-gray-900">{job.customer_phone}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 italic">Walk-in customer</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TruckIcon className="h-5 w-5 mr-2" />
                    Vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.vehicle_display ? (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Vehicle</label>
                        <p className="text-gray-900">{job.vehicle_display}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Unregistered vehicle</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Invoice & Receipt Information */}
              {(job.status.toUpperCase() === 'COMPLETED' || job.status.toUpperCase() === 'INVOICED' || job.status.toUpperCase() === 'PAID' || job.status.toUpperCase() === 'CLOSED') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentIcon className="h-5 w-5 mr-2" />
                      Billing & Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {job.status.toUpperCase() !== 'QC' && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center">
                            <DocumentIcon className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-800">Invoice Generated</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-100"
                            onClick={handleViewInvoice}
                          >
                            View
                          </Button>
                        </div>
                      )}
                      {(job.status.toUpperCase() === 'PAID' || job.status.toUpperCase() === 'CLOSED') && (
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center">
                            <ReceiptPercentIcon className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-800">Receipt Available</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-300 hover:bg-green-100 flex items-center"
                            onClick={handleViewReceipt}
                          >
                            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                            PDF Receipt
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Job Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estimate Total</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(parseFloat(job.estimate_total))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Final Total</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(parseFloat(job.final_total))}
                      </span>
                    </div>
                    {job.assigned_technician_name && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Technician</span>
                        <span className="text-sm text-gray-900">{job.assigned_technician_name}</span>
                      </div>
                    )}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Created</span>
                        <span className="text-sm text-gray-900">{formatDate(job.created_at)}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm font-medium text-gray-500">Last Updated</span>
                        <span className="text-sm text-gray-900">{formatDate(job.updated_at)}</span>
                      </div>
                      {job.created_by_name && (
                        <div className="flex justify-between mt-2">
                          <span className="text-sm font-medium text-gray-500">Created by</span>
                          <span className="text-sm text-gray-900">{job.created_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Printable Job Card Modal */}
          <JobCard
            job={job}
            isOpen={showJobCard}
            onClose={() => setShowJobCard(false)}
          />

          {/* PDF Receipt Modal */}
          {selectedReceipt && (
            <ReceiptPDF
              receipt={selectedReceipt}
              job={job}
              isOpen={showReceiptPDF}
              onClose={() => {
                setShowReceiptPDF(false);
                setSelectedReceipt(null);
              }}
            />
          )}

          {/* PDF Invoice Modal */}
          {selectedInvoice && (
            <InvoicePDF
              invoice={selectedInvoice}
              job={job}
              isOpen={showInvoicePDF}
              onClose={() => {
                setShowInvoicePDF(false);
                setSelectedInvoice(null);
              }}
            />
          )}

          {/* Enhanced Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg lg:max-w-2xl mx-auto my-4 sm:my-8 transform transition-all max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <CreditCardIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">Process Payment</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Record payment and generate receipt</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Payment Summary */}
                <div className="p-3 sm:p-4 md:p-6 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                    <span className="text-xs sm:text-sm text-gray-600">Total Amount Due</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(parseFloat(job?.final_total || '0'))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Balance Remaining</span>
                    <span className="text-xs sm:text-sm font-medium text-green-600">{formatCurrency(job?.balance_due || 0)}</span>
                  </div>
                </div>

                {/* Form */}
                <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                  {/* Amount and Payment Method Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Amount Field */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Payment Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={paymentData.amount}
                          onChange={(e) => handlePaymentAmountChange(e.target.value)}
                          className={`w-full pl-8 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 bg-white text-base ${
                            paymentErrors.amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          aria-invalid={!!paymentErrors.amount}
                          aria-describedby={paymentErrors.amount ? "amount-error" : undefined}
                        />
                      </div>
                      {paymentErrors.amount && (
                        <p id="amount-error" className="mt-1 text-xs sm:text-sm text-red-600">{paymentErrors.amount}</p>
                      )}
                      {calculateExcessAmount() > 0 && uniqueEmployees.length > 0 && (
                        <p className="mt-1 text-xs sm:text-sm text-amber-600 flex items-center">
                          <InformationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          Excess {formatCurrency(calculateExcessAmount())} will be distributed as tips
                        </p>
                      )}
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Reference Number
                        {(paymentData.method === 'CARD' || paymentData.method === 'BANK_TRANSFER' || paymentData.method === 'CHEQUE') &&
                          <span className="text-red-500"> *</span>
                        }
                      </label>
                      <input
                        type="text"
                        value={paymentData.reference}
                        onChange={(e) => {
                          setPaymentData(prev => ({ ...prev, reference: e.target.value }));
                          if (paymentErrors.reference) {
                            setPaymentErrors(prev => ({ ...prev, reference: '' }));
                          }
                        }}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 bg-white text-base ${
                          paymentErrors.reference ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder={
                          paymentData.method === 'CARD' ? 'Last 4 digits' :
                          paymentData.method === 'BANK_TRANSFER' ? 'Transfer ref' :
                          paymentData.method === 'CHEQUE' ? 'Cheque #' :
                          paymentData.method === 'MOBILE_MONEY' ? 'Transaction ID' :
                          'Optional'
                        }
                        aria-invalid={!!paymentErrors.reference}
                        aria-describedby={paymentErrors.reference ? "reference-error" : undefined}
                      />
                      {paymentErrors.reference && (
                        <p id="reference-error" className="mt-1 text-xs sm:text-sm text-red-600">{paymentErrors.reference}</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
                      {[
                        { value: 'CASH', label: 'Cash', icon: BanknotesIcon },
                        { value: 'CARD', label: 'Card', icon: CreditCardIcon },
                        { value: 'MOBILE_MONEY', label: 'Mobile', icon: DevicePhoneMobileIcon },
                        { value: 'BANK_TRANSFER', label: 'Bank', icon: BuildingLibraryIcon },
                        { value: 'CHEQUE', label: 'Cheque', icon: DocumentDuplicateIcon },
                        { value: 'CREDIT', label: 'Credit', icon: ShieldCheckIcon },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setPaymentData(prev => ({ ...prev, method: value as any }));
                            if (paymentErrors.reference) {
                              setPaymentErrors(prev => ({ ...prev, reference: '' }));
                            }
                          }}
                          className={`p-1.5 sm:p-2 border-2 rounded-lg flex flex-col items-center space-y-0.5 sm:space-y-1 transition-all hover:border-green-300 ${
                            paymentData.method === value
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-[10px] sm:text-xs font-medium leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes and Tips Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Notes */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Payment Notes
                      </label>
                      <textarea
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none text-gray-900 bg-white text-base"
                        rows={3}
                        placeholder="Additional notes..."
                      />
                    </div>

                    {/* Tip Allocation */}
                    {uniqueEmployees.length > 0 && (
                      <div>
                        <div className="mb-2 sm:mb-3">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center">
                            <CurrencyDollarIcon className="h-4 w-4 mr-1.5 text-amber-600" />
                            Allocate Tips (Optional)
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                            Distribute tips among employees
                          </p>
                        </div>
                        <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-50">
                        {uniqueEmployees.map((employee) => (
                          <div key={employee.id} className="flex items-center gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <UserIcon className="h-3.5 w-3.5 text-gray-400 mr-1.5 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-gray-700 truncate">
                                  {employee.name}
                                </span>
                              </div>
                            </div>
                            <div className="relative w-24 sm:w-28 flex-shrink-0">
                              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <span className="text-gray-400 text-xs">$</span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tipAllocations[employee.id] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTipAllocations(prev => {
                                    if (value === '' || parseFloat(value) === 0) {
                                      const newState = { ...prev };
                                      delete newState[employee.id];
                                      return newState;
                                    }
                                    return { ...prev, [employee.id]: value };
                                  });
                                }}
                                className="w-full pl-6 pr-2 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors text-gray-900 bg-white text-xs sm:text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ))}
                        </div>
                        {Object.keys(tipAllocations).length > 0 && (
                          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                              <span className="font-medium text-gray-700">Total Tips:</span>
                              <span className="font-bold text-amber-600">
                                {formatCurrency(
                                  Object.values(tipAllocations)
                                    .filter(v => v && parseFloat(v) > 0)
                                    .reduce((sum, v) => sum + parseFloat(v), 0)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex gap-2 sm:gap-3 sticky bottom-0">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentErrors({});
                      setPaymentData({ amount: '', method: 'CASH', reference: '', notes: '' });
                      setTipAllocations({});
                    }}
                    className="flex-1"
                    disabled={createPaymentAndReceiptMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="default"
                    onClick={handleSubmitPayment}
                    isLoading={createPaymentAndReceiptMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!paymentData.amount || createPaymentAndReceiptMutation.isPending}
                  >
                    {createPaymentAndReceiptMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Processing...</span>
                        <span className="sm:hidden">Wait...</span>
                      </span>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Process Payment & Receipt</span>
                        <span className="sm:hidden">Process Payment</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Modal */}
          {showReceiptModal && selectedReceipt && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Payment Receipt</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Print
                    </button>
                    <button
                      onClick={() => {
                        setShowReceiptModal(false);
                        setSelectedReceipt(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Receipt Content */}
                <div id="receipt-content" className="p-8 bg-white font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {/* Business Header */}
                  <div className="text-center border-b border-gray-300 pb-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">TIMAX AUTO SERVICES</h1>
                    <p className="text-gray-600">Professional Automotive Services</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Phone: (555) 123-4567 | Email: contact@timax.com
                    </p>
                  </div>

                  {/* Receipt Info */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Receipt Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Receipt #:</span>
                          <span className="font-medium text-gray-900">{selectedReceipt.receipt_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium text-gray-900">{formatDate(selectedReceipt.issued_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Job #:</span>
                          <span className="font-medium text-gray-900">{selectedReceipt.job_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Issued by:</span>
                          <span className="font-medium text-gray-900">{selectedReceipt.issued_by_name}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-900">{job?.customer_name || 'Walk-in Customer'}</span>
                        </div>
                        {job?.customer_phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium text-gray-900">{job.customer_phone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium text-gray-900">{job?.vehicle_display || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Services Performed</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {job?.lines?.map((line: any, index: number) => (
                            <tr key={line.id || index} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <div className="font-medium text-gray-900">{line.service_variant_name}</div>
                                  <div className="text-sm text-gray-500">{line.service_name} • {line.part_name}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">{line.quantity}</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(parseFloat(line.unit_price))}</td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(parseFloat(line.total_amount))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="border-t border-gray-300 pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Payment Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Method:</span>
                            <span className="font-medium text-gray-900">{selectedReceipt.payment_method.replace('_', ' ')}</span>
                          </div>
                          {selectedReceipt.payment_reference && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Reference:</span>
                              <span className="font-medium text-gray-900">{selectedReceipt.payment_reference}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount Paid:</span>
                            <span className="font-bold text-lg text-green-600">{formatCurrency(parseFloat(selectedReceipt.amount_paid))}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Job Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>{formatCurrency(parseFloat(job?.estimate_total || '0'))}</span>
                          </div>
                          {parseFloat(job?.tax_amount || '0') > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tax:</span>
                              <span>{formatCurrency(parseFloat(job?.tax_amount || '0'))}</span>
                            </div>
                          )}
                          {parseFloat(job?.discount_amount || '0') > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Discount:</span>
                              <span className="text-red-600 font-medium">-{formatCurrency(parseFloat(job?.discount_amount || '0'))}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 text-gray-900">
                            <span>Total:</span>
                            <span>{formatCurrency(parseFloat(job?.final_total || '0'))}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span className="font-medium">Amount Paid:</span>
                            <span className="font-bold text-green-600">{formatCurrency(parseFloat(selectedReceipt.amount_paid))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance Due:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(job?.balance_due || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedReceipt.notes && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Payment Notes</h4>
                      <p className="text-sm text-gray-600">{selectedReceipt.notes}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
                    <p>Thank you for choosing TIMAX Auto Services!</p>
                    <p className="mt-2">This is a computer-generated receipt and does not require a signature.</p>
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