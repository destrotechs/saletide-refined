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
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  TruckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PhoneIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
import { apiClient, Job, Customer, Vehicle } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSuccess: () => void;
}

function JobModal({ isOpen, onClose, job, onSuccess }: JobModalProps) {
  const [formData, setFormData] = useState({
    customer: job?.customer || '',
    vehicle: job?.vehicle || '',
    service_type: job?.service_type || 'maintenance',
    description: job?.description || '',
    priority: job?.priority || 'medium',
    estimated_hours: job?.estimated_hours || 1,
    hourly_rate: job?.hourly_rate || 50,
    notes: job?.notes || '',
  });

  const [selectedCustomer, setSelectedCustomer] = useState(job?.customer || '');

  const queryClient = useQueryClient();

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => apiClient.getCustomers(),
  });

  // Fetch vehicles for selected customer
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-by-customer', selectedCustomer],
    queryFn: () => apiClient.getVehicles({ customer: selectedCustomer }),
    enabled: !!selectedCustomer,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Job>) => apiClient.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onSuccess();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Job>) => apiClient.updateJob(job!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (job) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    setFormData({ ...formData, customer: customerId, vehicle: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-2xl transform bg-white rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {job ? 'Edit Job' : 'Create New Job'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  required
                  value={formData.customer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a customer</option>
                  {customers?.results.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle *
                </label>
                <select
                  required
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedCustomer}
                >
                  <option value="">Select a vehicle</option>
                  {vehicles?.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type *
                </label>
                <select
                  required
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                  <option value="bodywork">Bodywork</option>
                  <option value="diagnostic">Diagnostic</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the service or issue..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or instructions..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {job ? 'Update' : 'Create'} Job
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return <DocumentTextIcon className="h-4 w-4 text-gray-500" />;
    case 'SCHEDULED':
      return <ClockIconSolid className="h-4 w-4 text-amber-500" />;
    case 'IN_PROGRESS':
      return <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500" />;
    case 'QC':
      return <CheckCircleIcon className="h-4 w-4 text-purple-500" />;
    case 'INVOICED':
      return <CurrencyDollarIcon className="h-4 w-4 text-indigo-500" />;
    case 'PAID':
      return <CheckCircleIconSolid className="h-4 w-4 text-green-500" />;
    case 'CLOSED':
      return <CheckCircleIconSolid className="h-4 w-4 text-gray-600" />;
    default:
      return <ClockIcon className="h-4 w-4 text-gray-500" />;
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

export default function JobsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['jobs', searchTerm, statusFilter, priorityFilter],
    queryFn: () => apiClient.getJobs({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }),
  });

  const handleEdit = (job: Job) => {
    if (job.status === 'DRAFT') {
      router.push(`/jobs/${job.id}/edit`);
    } else {
      // Could show a toast or alert here
      alert('Jobs can only be edited when in DRAFT status');
    }
  };

  const handleAdd = () => {
    setSelectedJob(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
  };

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  // Group jobs by date
  const groupJobsByDate = (jobs: Job[]) => {
    const grouped = jobs.reduce((acc, job) => {
      const jobDate = new Date(job.created_at);
      const dateKey = jobDate.toDateString();

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(job);
      return acc;
    }, {} as Record<string, Job[]>);

    // Sort dates in descending order (most recent first)
    const sortedEntries = Object.entries(grouped).sort(([dateA], [dateB]) => {
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return sortedEntries;
  };

  // Format date for display
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title="Jobs"
            description="Manage service jobs and work orders"
            breadcrumbs={[
              { label: 'Jobs' }
            ]}
            actions={
              currentUser?.role !== 'TECHNICIAN' && (
                <Link href="/jobs/new">
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Create Job</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                </Link>
              )
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
                    placeholder="Search jobs by description, customer, or vehicle..."
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
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="QC">Quality Check</option>
                    <option value="INVOICED">Invoiced</option>
                    <option value="PAID">Paid</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">All Customers</option>
                    {/* This would be populated with actual customers from API */}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Grid */}
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
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-8">
              {groupJobsByDate(jobs).map(([dateKey, dateJobs]) => (
                <div key={dateKey} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatDateHeader(dateKey)}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {dateJobs.length} job{dateJobs.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  {/* Jobs for this date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {dateJobs.map((job) => {
                      const isExpanded = expandedJobs.has(job.id);
                      return (
                        <Card key={job.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 cursor-pointer group">
                          <CardContent className="p-4">
                            {/* Compact Header - Always Visible */}
                            <div className="flex items-start justify-between gap-3">
                              <Link
                                href={`/jobs/${job.id}`}
                                className="flex items-center space-x-3 flex-1 min-w-0 group-hover:opacity-80 transition-opacity"
                              >
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200">
                                    {getStatusIcon(job.status)}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">
                                      Job #{job.job_number}
                                    </h3>
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(job.status)} flex-shrink-0`}>
                                      {getStatusLabel(job.status)}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <WrenchScrewdriverIcon className="h-3 w-3 flex-shrink-0" />
                                      <span>{job.lines?.length || 0} service{(job.lines?.length || 0) !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <ClockIcon className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{new Date(job.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <CurrencyDollarIcon className="h-3 w-3 flex-shrink-0" />
                                      <span className="font-medium">{formatCurrency(parseFloat(job.estimate_total || '0'))}</span>
                                    </div>
                                  </div>
                                </div>
                              </Link>

                              <div className="flex items-center space-x-1 flex-shrink-0 relative z-10">
                                <Link
                                  href={`/jobs/${job.id}`}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="View Details"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                                {currentUser?.role !== 'TECHNICIAN' && (
                                  <button
                                    onClick={() => handleEdit(job)}
                                    disabled={job.status !== 'DRAFT'}
                                    className={`p-1.5 rounded-md transition-colors ${
                                      job.status === 'DRAFT'
                                        ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                        : 'text-gray-300 cursor-not-allowed'
                                    }`}
                                    title={job.status === 'DRAFT' ? 'Edit Job' : 'Jobs can only be edited in DRAFT status'}
                                  >
                                    {job.status === 'DRAFT' ? (
                                      <PencilIcon className="h-4 w-4" />
                                    ) : (
                                      <LockClosedIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleJobExpansion(job.id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                                >
                                  {isExpanded ? (
                                    <ChevronUpIcon className="h-4 w-4" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Content - Only shown when expanded */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                {/* Customer & Contact Info */}
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <UserIcon className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {job.customer_name || 'Walk-in Customer'}
                                  </p>
                                  {job.customer_phone && (
                                    <div className="flex items-center space-x-1 mt-1">
                                      <PhoneIcon className="h-3 w-3 text-gray-400" />
                                      <span className="text-xs text-gray-600">{job.customer_phone}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Vehicle Info */}
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <TruckIcon className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle</span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {job.vehicle_display || 'Unregistered Vehicle'}
                                  </p>
                                </div>

                                {/* Services Summary */}
                                {job.lines && job.lines.length > 0 && (
                                  <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <WrenchScrewdriverIcon className="h-4 w-4 text-blue-600" />
                                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Services</span>
                                    </div>
                                    <div className="space-y-1">
                                      {job.lines.map((line: any, index: number) => (
                                        <div key={index} className="text-xs text-blue-700">
                                          • {line.service_variant_name}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Financial Summary */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-green-50 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                                      <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Estimate</span>
                                    </div>
                                    <p className="text-lg font-bold text-green-900">
                                      {formatCurrency(parseFloat(job.estimate_total || '0'))}
                                    </p>
                                  </div>

                                  {parseFloat(job.final_total || '0') !== parseFloat(job.estimate_total || '0') && (
                                    <div className="bg-indigo-50 rounded-lg p-3">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <CreditCardIcon className="h-4 w-4 text-indigo-600" />
                                        <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Final</span>
                                      </div>
                                      <p className="text-lg font-bold text-indigo-900">
                                        {formatCurrency(parseFloat(job.final_total || '0'))}
                                      </p>
                                    </div>
                                  )}

                                  {job.balance_due > 0 && (
                                    <div className="bg-red-50 rounded-lg p-3">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                                        <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Balance Due</span>
                                      </div>
                                      <p className="text-lg font-bold text-red-900">
                                        {formatCurrency(job.balance_due)}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Technician & Timing */}
                                {(job.technician_name || job.estimated_duration) && (
                                  <div className="border-t border-gray-200 pt-3 space-y-2">
                                    {job.technician_name && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Assigned Technician</span>
                                        <span className="text-xs font-medium text-gray-900">{job.technician_name}</span>
                                      </div>
                                    )}
                                    {job.estimated_duration && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Est. Duration</span>
                                        <span className="text-xs font-medium text-gray-900">{job.estimated_duration} minutes</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Footer with attribution */}
                                {job.created_by_name && (
                                  <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                                    Created by {job.created_by_name}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Empty State */}
          {!isLoading && jobs?.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter || priorityFilter
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by creating your first job.'}
                </p>
                {!searchTerm && !statusFilter && !priorityFilter && (
                  <div className="mt-6">
                    <Link href="/jobs/new">
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Job
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modal */}
          <JobModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            job={selectedJob}
            onSuccess={() => refetch()}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}