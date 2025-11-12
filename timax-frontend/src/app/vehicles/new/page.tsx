'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  TruckIcon,
  HashtagIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  SwatchIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { apiClient, Vehicle, Customer } from '@/lib/api';

interface VehicleFormData {
  customer: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  vehicle_class?: string;
  notes: string;
}

export default function NewVehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // Pre-select customer if provided in URL
  const preSelectedCustomer = searchParams.get('customer');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<VehicleFormData>({
    defaultValues: {
      customer: preSelectedCustomer || '',
      year: new Date().getFullYear(),
    },
  });

  // Fetch customers for selection
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => apiClient.getCustomers({ search: customerSearch }),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => apiClient.createVehicle(data),
    onSuccess: (newVehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Vehicle "${newVehicle.plate_number}" added successfully!`);
      router.push(`/vehicles/${newVehicle.id}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create vehicle';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    createVehicleMutation.mutate({
      ...data,
      vin: data.vin || '',
      notes: data.notes || '',
    });
  };

  const handleCancel = () => {
    router.push('/vehicles');
  };

  // Common vehicle makes for quick selection
  const commonMakes = [
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Subaru', 'BMW', 'Mercedes-Benz',
    'Audi', 'Volkswagen', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Peugeot', 'Isuzu'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

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
                  <h1 className="text-3xl font-bold text-gray-900">New Vehicle</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Add a new vehicle to your automotive service system
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

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select
                    id="customer"
                    {...register('customer', { required: 'Please select a customer' })}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                      errors.customer ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a customer...</option>
                    {customers?.results?.map((customer: Customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                  {errors.customer && (
                    <p className="mt-1 text-sm text-red-600">{errors.customer.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Don't see the customer? <a href="/customers/new" className="text-blue-600 hover:text-blue-500">Add a new customer</a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plate Number */}
                  <div>
                    <label htmlFor="plate_number" className="block text-sm font-medium text-gray-700 mb-2">
                      License Plate Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <HashtagIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="plate_number"
                        {...register('plate_number', {
                          required: 'License plate number is required',
                          pattern: {
                            value: /^[A-Z0-9\s\-]+$/i,
                            message: 'Please enter a valid license plate number',
                          },
                        })}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors uppercase ${
                          errors.plate_number ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="KCA 123A"
                        onChange={(e) => {
                          e.target.value = e.target.value.toUpperCase();
                        }}
                      />
                    </div>
                    {errors.plate_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.plate_number.message}</p>
                    )}
                  </div>

                  {/* VIN */}
                  <div>
                    <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-2">
                      VIN (Vehicle Identification Number)
                    </label>
                    <input
                      type="text"
                      id="vin"
                      {...register('vin', {
                        pattern: {
                          value: /^[A-HJ-NPR-Z0-9]{17}$/i,
                          message: 'VIN must be 17 characters (excluding I, O, Q)',
                        },
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors uppercase ${
                        errors.vin ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1HGBH41JXMN109186"
                      maxLength={17}
                    />
                    {errors.vin && (
                      <p className="mt-1 text-sm text-red-600">{errors.vin.message}</p>
                    )}
                  </div>

                  {/* Make */}
                  <div>
                    <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-2">
                      Make *
                    </label>
                    <div className="relative">
                      <select
                        id="make"
                        {...register('make', { required: 'Vehicle make is required' })}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.make ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select make...</option>
                        {commonMakes.map((make) => (
                          <option key={make} value={make}>
                            {make}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {watch('make') === 'Other' && (
                        <input
                          type="text"
                          {...register('make', { required: 'Vehicle make is required' })}
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                          placeholder="Enter vehicle make"
                        />
                      )}
                    </div>
                    {errors.make && (
                      <p className="mt-1 text-sm text-red-600">{errors.make.message}</p>
                    )}
                  </div>

                  {/* Model */}
                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <input
                      type="text"
                      id="model"
                      {...register('model', {
                        required: 'Vehicle model is required',
                        minLength: { value: 1, message: 'Model must not be empty' },
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                        errors.model ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Corolla, Civic, X5, etc."
                    />
                    {errors.model && (
                      <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>
                    )}
                  </div>

                  {/* Year */}
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                      Year *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <select
                        id="year"
                        {...register('year', {
                          required: 'Vehicle year is required',
                          min: { value: 1900, message: 'Please enter a valid year' },
                          max: { value: currentYear + 1, message: 'Year cannot be in the future' }
                        })}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.year ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select year...</option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.year && (
                      <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                    )}
                  </div>

                  {/* Color */}
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                      Color *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SwatchIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <select
                        id="color"
                        {...register('color', { required: 'Vehicle color is required' })}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                          errors.color ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select color...</option>
                        <option value="White">White</option>
                        <option value="Black">Black</option>
                        <option value="Silver">Silver</option>
                        <option value="Gray">Gray</option>
                        <option value="Blue">Blue</option>
                        <option value="Red">Red</option>
                        <option value="Green">Green</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Brown">Brown</option>
                        <option value="Orange">Orange</option>
                        <option value="Purple">Purple</option>
                        <option value="Gold">Gold</option>
                        <option value="Other">Other</option>
                      </select>
                      {watch('color') === 'Other' && (
                        <input
                          type="text"
                          {...register('color', { required: 'Vehicle color is required' })}
                          className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                          placeholder="Enter color"
                        />
                      )}
                    </div>
                    {errors.color && (
                      <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    {...register('notes')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="Any additional notes about the vehicle (modifications, special requirements, etc.)..."
                  />
                </div>
              </CardContent>
            </Card>

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
                {isSubmitting ? 'Adding Vehicle...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}