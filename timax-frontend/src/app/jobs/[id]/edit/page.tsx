'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  WrenchScrewdriverIcon,
  UserGroupIcon,
  TruckIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  CalculatorIcon,
  ClockIcon,
  ArrowLeftIcon,
  CubeIcon,
  TagIcon,
  UserIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import InventorySelectionModal from '@/components/ui/InventorySelectionModal';
import EmployeeSelectionModal from '@/components/ui/EmployeeSelectionModal';
import { apiClient, Job, Customer, Vehicle, ServiceVariant, InventoryOption, JobLineInventoryItem, SKU, User } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface SelectedInventoryItem extends JobLineInventoryItem {
  inventory_option_id: string;
  selected_quantity: number;
}

interface CustomInventoryItem {
  id: string;
  sku_id: string;
  sku_name: string;
  sku_code: string;
  sku_unit: string;
  sku_cost: string;
  quantity_used: number;
  total_cost: number;
}

interface JobFormData {
  customer: string;
  vehicle: string;
  notes: string;
  internal_notes: string;
  lines: {
    id?: string;
    service_variant: string;
    quantity: number;
    unit_price: number;
    notes: string;
    inventory_items: CustomInventoryItem[];
    assigned_employees: string[];
  }[];
}

// Helper function to check if job is editable
const isJobEditable = (status: string): boolean => {
  return status === 'DRAFT';
};

// Employee Assignment Section Component
function EmployeeAssignmentSection({
  index,
  control,
  setValue,
  users,
  isReadOnly,
}: {
  index: number;
  control: any;
  setValue: any;
  users: User[];
  isReadOnly: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const watchedEmployees = useWatch({
    control,
    name: `lines.${index}.assigned_employees`,
    defaultValue: [],
  });

  const handleEmployeesSelect = (selectedEmployeeIds: string[]) => {
    setValue(`lines.${index}.assigned_employees`, selectedEmployeeIds);
  };

  const removeEmployee = (employeeId: string) => {
    if (isReadOnly) return;
    const currentEmployees = [...(watchedEmployees || [])];
    const updatedEmployees = currentEmployees.filter((id: string) => id !== employeeId);
    setValue(`lines.${index}.assigned_employees`, updatedEmployees);
  };

  // Get employee details for selected IDs
  const selectedEmployees = users.filter((user) => watchedEmployees.includes(user.id));

  return (
    <>
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <UserIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h4 className="text-base font-semibold text-gray-900">
              Assigned Employees
            </h4>
            {selectedEmployees.length > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {selectedEmployees.length} assigned
              </span>
            )}
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Assign Employees
            </button>
          )}
        </div>

        {/* Selected Employees List */}
        {selectedEmployees.length > 0 ? (
          <div className="space-y-2">
            {selectedEmployees.map((employee) => (
              <div key={employee.id} className={`bg-gray-50 rounded-lg p-3 border border-gray-200 ${isReadOnly ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {employee.first_name.charAt(0)}
                          {employee.last_name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{employee.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => removeEmployee(employee.id)}
                      className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove employee"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm text-gray-400">
              {isReadOnly ? 'No employees assigned' : 'Click "Assign Employees" to select employees for this service'}
            </p>
          </div>
        )}
      </div>

      {/* Employee Selection Modal */}
      {!isReadOnly && (
        <EmployeeSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelect={handleEmployeesSelect}
          selectedEmployees={watchedEmployees}
          employees={users}
          title="Assign Employees to Service"
        />
      )}
    </>
  );
}

// Materials & Items Selection Component (same as in new job page)
function MaterialsSelectionSection({
  index,
  control,
  setValue,
  isReadOnly,
}: {
  index: number;
  control: any;
  setValue: any;
  isReadOnly: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const watchedInventory = useWatch({
    control,
    name: `lines.${index}.inventory_items`,
    defaultValue: [],
  });

  const handleMaterialsSelect = (items: CustomInventoryItem[]) => {
    setValue(`lines.${index}.inventory_items`, items);
  };

  const removeMaterial = (itemId: string) => {
    if (isReadOnly) return;
    const currentItems = [...(watchedInventory || [])];
    const updatedItems = currentItems.filter((item: CustomInventoryItem) => item.id !== itemId);
    setValue(`lines.${index}.inventory_items`, updatedItems);
  };

  const updateMaterialQuantity = (itemId: string, quantity: number) => {
    if (isReadOnly) return;
    const currentItems = [...(watchedInventory || [])];
    const itemIndex = currentItems.findIndex((item: CustomInventoryItem) => item.id === itemId);
    if (itemIndex > -1) {
      currentItems[itemIndex].quantity_used = quantity;
      currentItems[itemIndex].total_cost = quantity * parseFloat(currentItems[itemIndex].sku_cost);
      setValue(`lines.${index}.inventory_items`, currentItems);
    }
  };

  return (
    <>
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CubeIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h4 className="text-base font-semibold text-gray-900">
              Materials & Items Used
            </h4>
            {watchedInventory.length > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {watchedInventory.length} item{watchedInventory.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Materials
            </button>
          )}
        </div>

        {/* Selected Materials List */}
        {watchedInventory.length > 0 ? (
          <div className="space-y-3">
            {watchedInventory.map((item: CustomInventoryItem) => (
              <div key={item.id} className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${isReadOnly ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 truncate">
                          {item.sku_name}
                        </h5>
                        <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <TagIcon className="h-3 w-3 mr-1" />
                            {item.sku_code}
                          </span>
                          <span>Unit: {item.sku_unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700">
                          Quantity:
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity_used}
                          onChange={(e) =>
                            updateMaterialQuantity(item.id, parseFloat(e.target.value) || 0)
                          }
                          disabled={isReadOnly}
                          className={`w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                        <span className="text-sm text-gray-600">{item.sku_unit}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeMaterial(item.id)}
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove material"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CubeIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No materials selected</p>
            {!isReadOnly && (
              <p className="text-xs text-gray-400 mt-1">
                Click "Add Materials" to select items for this service
              </p>
            )}
          </div>
        )}
      </div>

      {/* Inventory Selection Modal */}
      {!isReadOnly && (
        <InventorySelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelect={handleMaterialsSelect}
          selectedItems={watchedInventory}
          title="Select Materials & Items"
        />
      )}
    </>
  );
}

export default function EditJobPage() {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params?.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);

  // Redirect technicians - they cannot edit jobs
  useEffect(() => {
    if (currentUser?.role === 'TECHNICIAN') {
      toast.error('Technicians cannot edit jobs');
      router.push(`/jobs/${jobId}`);
    }
  }, [currentUser, router, jobId]);

  // Fetch the job data
  const { data: job, isLoading: jobLoading, error: jobError } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiClient.getJob(jobId),
    enabled: !!jobId,
  });

  // Check if job is editable
  const isEditable = job ? isJobEditable(job.status) : false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
    reset,
  } = useForm<JobFormData>({
    defaultValues: {
      customer: '',
      vehicle: '',
      notes: '',
      internal_notes: '',
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  // Populate form when job data is loaded
  useEffect(() => {
    if (job) {
      setSelectedCustomer(job.customer || '');

      // Transform job data to form format
      const formData: JobFormData = {
        customer: job.customer || '',
        vehicle: job.vehicle || '',
        notes: job.notes || '',
        internal_notes: job.internal_notes || '',
        lines: job.lines?.map(line => ({
          id: line.id,
          service_variant: line.service_variant || '',
          quantity: line.quantity || 1,
          unit_price: parseFloat(line.unit_price || '0'),
          notes: line.notes || '',
          inventory_items: line.inventory_items?.map(item => ({
            id: item.id || Math.random().toString(),
            sku_id: item.sku || '',
            sku_name: item.sku_name || '',
            sku_code: item.sku_code || '',
            sku_unit: item.sku_unit || '',
            sku_cost: item.unit_cost || '0',
            quantity_used: parseFloat(item.quantity_used || '0'),
            total_cost: parseFloat(item.total_cost || '0'),
          })) || [],
          assigned_employees: line.assigned_employees || [],
        })) || [
          {
            service_variant: '',
            quantity: 1,
            unit_price: 0,
            notes: '',
            inventory_items: [],
            assigned_employees: [],
          },
        ],
      };

      reset(formData);
    }
  }, [job, reset]);

  // Fetch customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiClient.getCustomers({}),
  });

  // Fetch vehicles when customer changes
  const watchedCustomer = watch('customer');
  useEffect(() => {
    if (watchedCustomer) {
      setSelectedCustomer(watchedCustomer);
      apiClient.getVehicles({ customer: watchedCustomer }).then((vehicles) => {
        setCustomerVehicles(vehicles);
      });
    } else {
      setCustomerVehicles([]);
    }
  }, [watchedCustomer, setValue]);

  // Fetch service variants from API
  const { data: serviceVariantsData, isLoading: serviceVariantsLoading } = useQuery({
    queryKey: ['service-variants'],
    queryFn: () => apiClient.getServiceVariants({}),
  });

  const serviceVariants = serviceVariantsData?.results || [];

  // Fetch users/employees for assignment
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers({ is_active: true }),
  });

  const users = usersData?.results || [];

  const updateJobMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateJob(jobId, data),
    onSuccess: (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Job "${updatedJob.job_number}" updated successfully!`);
      router.push(`/jobs/${jobId}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update job';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: JobFormData) => {
    if (!isEditable) {
      toast.error('This job cannot be edited in its current status');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Filter out empty lines
    const validLines = data.lines.filter(line =>
      line.service_variant && line.quantity > 0 && line.unit_price >= 0
    );

    if (validLines.length === 0) {
      setSubmitError('Please add at least one service item');
      setIsSubmitting(false);
      return;
    }

    // Transform inventory items to match backend expectations
    const transformedLines = validLines.map(line => ({
      ...line,
      inventory_items: line.inventory_items.map(item => ({
        sku: item.sku_id,
        sku_name: item.sku_name,
        sku_code: item.sku_code,
        quantity_used: item.quantity_used.toString(),
        unit_cost: item.sku_cost,
        total_cost: item.total_cost.toString(),
      }))
    }));

    updateJobMutation.mutate({
      ...data,
      lines: transformedLines,
    });
  };

  const handleCancel = () => {
    router.push(`/jobs/${jobId}`);
  };

  const addServiceLine = () => {
    if (!isEditable) return;
    append({
      service_variant: '',
      quantity: 1,
      unit_price: 0,
      notes: '',
      inventory_items: [],
      assigned_employees: [],
    });
  };

  const calculateLineTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const calculateJobTotal = () => {
    const lines = watch('lines');
    return lines.reduce((total, line) => {
      return total + calculateLineTotal(line.quantity, line.unit_price);
    }, 0);
  };

  if (jobLoading) {
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

  if (jobError || !job) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900">Job not found</h2>
            <p className="text-gray-500 mt-2">The job you're trying to edit doesn't exist.</p>
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
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/jobs/${jobId}`)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Edit Job #{job.job_number}
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Modify job details and service items
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Job Status Warning */}
          {!isEditable && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <LockClosedIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-amber-800">
                    Job Cannot Be Edited
                  </h3>
                  <p className="mt-2 text-sm text-amber-700">
                    This job is currently in "{job.status}" status and cannot be modified.
                    Jobs can only be edited when they are in "DRAFT" status.
                  </p>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/jobs/${jobId}`)}
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      View Job Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">{submitError}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Job Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer & Vehicle Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <UserGroupIcon className="h-5 w-5 mr-2" />
                      Customer & Vehicle
                      {!isEditable && <LockClosedIcon className="h-4 w-4 ml-2 text-gray-400" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Selection */}
                    <div>
                      <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-2">
                        Customer <span className="text-gray-500">(optional for walk-ins)</span>
                      </label>
                      <select
                        id="customer"
                        {...register('customer')}
                        disabled={!isEditable}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.customer ? 'border-red-300' : 'border-gray-300'
                        } ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Walk-in customer / Select existing...</option>
                        {customers?.results?.map((customer: Customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </option>
                        ))}
                      </select>
                      {errors.customer && (
                        <p className="mt-1 text-sm text-red-600">{errors.customer.message}</p>
                      )}
                    </div>

                    {/* Vehicle Selection */}
                    <div>
                      <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle <span className="text-gray-500">(optional for unregistered vehicles)</span>
                      </label>
                      <select
                        id="vehicle"
                        {...register('vehicle')}
                        disabled={!isEditable}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.vehicle ? 'border-red-300' : 'border-gray-300'
                        } ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <option value="">
                          Unregistered vehicle / Select existing...
                        </option>
                        {customerVehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.year})
                          </option>
                        ))}
                      </select>
                      {errors.vehicle && (
                        <p className="mt-1 text-sm text-red-600">{errors.vehicle.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Service Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                        Service Items
                        {!isEditable && <LockClosedIcon className="h-4 w-4 ml-2 text-gray-400" />}
                      </span>
                      {isEditable && (
                        <button
                          type="button"
                          onClick={addServiceLine}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Item
                        </button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${!isEditable ? 'opacity-75' : ''}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              Service Item {index + 1}
                            </h4>
                            {isEditable && fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Service */}
                            <div className="lg:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Service *
                              </label>
                              <select
                                {...register(`lines.${index}.service_variant`, {
                                  required: 'Please select a service',
                                  onChange: (e) => {
                                    if (isEditable) {
                                      setValue(`lines.${index}.inventory_items`, []);
                                    }
                                  }
                                })}
                                disabled={!isEditable}
                                className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              >
                                <option value="">
                                  {serviceVariantsLoading ? "Loading services..." : "Select service..."}
                                </option>
                                {serviceVariants.map((service) => (
                                  <option key={service.id} value={service.id}>
                                    {service.service_name} - {service.part_name} ({service.vehicle_class_name})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                {...register(`lines.${index}.quantity`, {
                                  required: 'Quantity is required',
                                  min: { value: 1, message: 'Quantity must be at least 1' },
                                  valueAsNumber: true,
                                })}
                                disabled={!isEditable}
                                className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                            </div>

                            {/* Sale Price */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sale Price (KES) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Enter sale price..."
                                {...register(`lines.${index}.unit_price`, {
                                  required: 'Sale price is required',
                                  min: { value: 0, message: 'Price cannot be negative' },
                                  valueAsNumber: true,
                                })}
                                disabled={!isEditable}
                                className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              />
                            </div>
                          </div>

                          {/* Employee Assignment */}
                          <EmployeeAssignmentSection
                            index={index}
                            control={control}
                            setValue={setValue}
                            users={users}
                            isReadOnly={!isEditable}
                          />

                          {/* Materials & Items Selection */}
                          <MaterialsSelectionSection
                            index={index}
                            control={control}
                            setValue={setValue}
                            isReadOnly={!isEditable}
                          />

                          {/* Line Total Display */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Line Total:</span>
                              <span className="text-lg font-semibold text-gray-900">
                                KES {calculateLineTotal(
                                  watch(`lines.${index}.quantity`) || 0,
                                  watch(`lines.${index}.unit_price`) || 0
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <input
                              type="text"
                              {...register(`lines.${index}.notes`)}
                              disabled={!isEditable}
                              className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              placeholder="Additional notes for this service..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Job Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Job Notes
                      {!isEditable && <LockClosedIcon className="h-4 w-4 ml-2 text-gray-400" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Notes
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        {...register('notes')}
                        disabled={!isEditable}
                        className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Notes visible to customer..."
                      />
                    </div>

                    <div>
                      <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Internal Notes
                      </label>
                      <textarea
                        id="internal_notes"
                        rows={3}
                        {...register('internal_notes')}
                        disabled={!isEditable}
                        className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Internal notes for staff only..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-6">
                {/* Job Summary */}
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CalculatorIcon className="h-5 w-5 mr-2" />
                      Job Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Number of Services:</span>
                        <span className="font-medium">{fields.length}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between">
                          <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            KES {calculateJobTotal().toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Status Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShieldExclamationIcon className="h-5 w-5 mr-2" />
                      Job Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Status:</span>
                        <span className={`font-medium px-2 py-1 rounded text-xs ${
                          job.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                          job.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-800' :
                          job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {isEditable ?
                          'This job can be edited in its current status.' :
                          'Jobs can only be edited when in DRAFT status.'
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                {isEditable && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <button
                        type="button"
                        onClick={addServiceLine}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Service Item
                      </button>
                    </CardContent>
                  </Card>
                )}
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
              {isEditable && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Updating Job...' : 'Update Job'}
                </button>
              )}
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}