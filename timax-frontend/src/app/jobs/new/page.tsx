'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
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
  MinusIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
    service_variant: string;
    quantity: number;
    unit_price: number;
    notes: string;
    inventory_items: CustomInventoryItem[];
    assigned_employees: string[];
  }[];
}


// Employee Assignment Section Component
function EmployeeAssignmentSection({
  index,
  control,
  setValue,
  users,
}: {
  index: number;
  control: any;
  setValue: any;
  users: User[];
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
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Assign Employees
          </button>
        </div>

        {/* Selected Employees List */}
        {selectedEmployees.length > 0 ? (
          <div className="space-y-2">
            {selectedEmployees.map((employee) => (
              <div key={employee.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
                  <button
                    type="button"
                    onClick={() => removeEmployee(employee.id)}
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove employee"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm text-gray-400">
              Click "Assign Employees" to select employees for this service
            </p>
          </div>
        )}
      </div>

      {/* Employee Selection Modal */}
      <EmployeeSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleEmployeesSelect}
        selectedEmployees={watchedEmployees}
        employees={users}
        title="Assign Employees to Service"
      />
    </>
  );
}

// Materials & Items Selection Component
function MaterialsSelectionSection({
  index,
  control,
  setValue,
}: {
  index: number;
  control: any;
  setValue: any;
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
    const currentItems = [...(watchedInventory || [])];
    const updatedItems = currentItems.filter((item: CustomInventoryItem) => item.id !== itemId);
    setValue(`lines.${index}.inventory_items`, updatedItems);
  };

  const updateMaterialQuantity = (itemId: string, quantity: number) => {
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
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Materials
          </button>
        </div>

        {/* Selected Materials List */}
        {watchedInventory.length > 0 ? (
          <div className="space-y-3">
            {watchedInventory.map((item: CustomInventoryItem) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
                          className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-sm text-gray-600">{item.sku_unit}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => removeMaterial(item.id)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove material"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm text-gray-400">
              Click "Add Materials" to select items for this service
            </p>
          </div>
        )}
      </div>

      {/* Inventory Selection Modal */}
      <InventorySelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleMaterialsSelect}
        selectedItems={watchedInventory}
        title="Select Materials & Items"
      />
    </>
  );
}

function NewJobPageContent() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);

  // Pre-select customer or vehicle if provided in URL
  const preSelectedCustomer = searchParams.get('customer');
  const preSelectedVehicle = searchParams.get('vehicle');

  // Redirect technicians - they cannot create jobs
  useEffect(() => {
    if (currentUser?.role === 'TECHNICIAN') {
      toast.error('Technicians cannot create jobs');
      router.push('/jobs');
    }
  }, [currentUser, router]);

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
      customer: preSelectedCustomer || '',
      vehicle: preSelectedVehicle || '',
      lines: [
        {
          service_variant: '',
          quantity: 1,
          unit_price: 0,
          notes: '',
          inventory_items: [],
          assigned_employees: [],
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

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
        // If only one vehicle, auto-select it
        if (vehicles.length === 1) {
          setValue('vehicle', vehicles[0].id);
        }
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


  const createJobMutation = useMutation({
    mutationFn: (data: any) => apiClient.createJob(data),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Job "${newJob.job_number}" created successfully!`);

      // Debug log to see what we get back from the API
      console.log('Job creation response:', newJob);

      // Check if we have a valid job ID
      if (newJob.id) {
        router.push(`/jobs/${newJob.id}`);
      } else {
        // Fallback to jobs list if no ID
        console.warn('No job ID in response, redirecting to jobs list');
        router.push('/jobs');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create job';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: JobFormData) => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submission');
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

    // Transform inventory items and ensure employee IDs are properly formatted
    const transformedLines = validLines.map(line => ({
      service_variant: line.service_variant,
      quantity: line.quantity,
      unit_price: line.unit_price,
      notes: line.notes || '',
      // Ensure assigned_employees is an array of UUID strings only
      assigned_employees: Array.isArray(line.assigned_employees)
        ? line.assigned_employees.filter(id => typeof id === 'string' && id.length > 0)
        : [],
      inventory_items: line.inventory_items.map(item => ({
        sku: item.sku_id,
        sku_name: item.sku_name,
        sku_code: item.sku_code,
        quantity_used: item.quantity_used.toString(),
        unit_cost: item.sku_cost,
        total_cost: item.total_cost.toString(),
      }))
    }));

    // Debug: Log the data being sent
    console.log('Submitting job data:', {
      ...data,
      lines: transformedLines,
    });

    // Debug: Log employee data specifically
    console.log('Employee assignments per line:');
    transformedLines.forEach((line, index) => {
      console.log(`Line ${index + 1}:`, {
        service_variant: line.service_variant,
        assigned_employees: line.assigned_employees,
        assigned_employees_type: typeof line.assigned_employees,
        assigned_employees_array: Array.isArray(line.assigned_employees),
        assigned_employees_content: line.assigned_employees?.map((emp: any) => ({
          value: emp,
          type: typeof emp
        }))
      });
    });

    createJobMutation.mutate({
      ...data,
      lines: transformedLines,
    });
  };

  const handleCancel = () => {
    router.push('/jobs');
  };

  const addServiceLine = () => {
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
                  <h1 className="text-3xl font-bold text-gray-900">New Job</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Create a new service job for your automotive services
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
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.customer ? 'border-red-300' : 'border-gray-300'
                        }`}
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
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.vehicle ? 'border-red-300' : 'border-gray-300'
                        }`}
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
                      {selectedCustomer && customerVehicles.length === 0 && (
                        <p className="mt-1 text-sm text-blue-600">
                          No vehicles found. <a href={`/vehicles/new?customer=${selectedCustomer}`} className="underline">Add a vehicle for this customer</a>
                        </p>
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
                      </span>
                      <button
                        type="button"
                        onClick={addServiceLine}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Item
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              Service Item {index + 1}
                            </h4>
                            {fields.length > 1 && (
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
                                    const selectedServiceId = e.target.value;
                                    const selectedService = serviceVariants.find(s => s.id === selectedServiceId);

                                    // Clear existing inventory items when service changes
                                    setValue(`lines.${index}.inventory_items`, []);

                                    // Auto-fill sale price with floor price if available
                                    if (selectedService && selectedService.floor_price) {
                                      setValue(`lines.${index}.unit_price`, parseFloat(selectedService.floor_price));
                                    }
                                  }
                                })}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                              >
                                <option value="">
                                  {serviceVariantsLoading ? "Loading services..." : "Select service..."}
                                </option>
                                {serviceVariants.map((service) => (
                                  <option key={service.id} value={service.id}>
                                    {service.service_name} - {service.part_name} ({service.vehicle_class_name})
                                    {service.floor_price && ` - KES ${parseFloat(service.floor_price).toLocaleString()}`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity with Increment/Decrement */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                              </label>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentQty = watch(`lines.${index}.quantity`) || 1;
                                    if (currentQty > 1) {
                                      setValue(`lines.${index}.quantity`, currentQty - 1);
                                    }
                                  }}
                                  className="flex items-center justify-center h-10 w-10 rounded-l-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  {...register(`lines.${index}.quantity`, {
                                    required: 'Quantity is required',
                                    min: { value: 1, message: 'Quantity must be at least 1' },
                                    valueAsNumber: true,
                                  })}
                                  className="block w-full h-10 px-3 py-2 border-t border-b border-gray-300 text-center text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentQty = watch(`lines.${index}.quantity`) || 1;
                                    setValue(`lines.${index}.quantity`, currentQty + 1);
                                  }}
                                  className="flex items-center justify-center h-10 w-10 rounded-r-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
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
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                              />
                            </div>
                          </div>

                          {/* Employee Assignment */}
                          <EmployeeAssignmentSection
                            index={index}
                            control={control}
                            setValue={setValue}
                            users={users}
                          />

                          {/* Materials & Items Selection */}
                          <MaterialsSelectionSection
                            index={index}
                            control={control}
                            setValue={setValue}
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
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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

                {/* Quick Actions */}
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating Job...' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="text-gray-600">Loading...</div></div>}>
      <NewJobPageContent />
    </Suspense>
  );
}
