import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ClockIcon, DocumentTextIcon, TagIcon } from '@heroicons/react/24/outline';
import apiClient, { Service } from '@/lib/api';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
}

interface ServiceFormData {
  name: string;
  code: string;
  description: string;
  duration_estimate_minutes: number;
  is_active: boolean;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, service }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    code: '',
    description: '',
    duration_estimate_minutes: 60,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!service;

  // Reset form when modal opens/closes or service changes
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        code: service.code,
        description: service.description,
        duration_estimate_minutes: service.duration_estimate_minutes,
        is_active: service.is_active,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        duration_estimate_minutes: 60,
        is_active: true,
      });
    }
    setErrors({});
  }, [service, isOpen]);

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (data: ServiceFormData) => apiClient.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-statistics'] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: (data: ServiceFormData) => apiClient.updateService(service!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-statistics'] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Service code is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.duration_estimate_minutes < 15) {
      newErrors.duration_estimate_minutes = 'Duration must be at least 15 minutes';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (isEditing) {
        await updateServiceMutation.mutateAsync(formData);
      } else {
        await createServiceMutation.mutateAsync(formData);
      }
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
  };

  const handleChange = (field: keyof ServiceFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const generateCodeFromName = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  };

  const isLoading = createServiceMutation.isPending || updateServiceMutation.isPending;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Service' : 'Create New Service'}
              </Dialog.Title>
              <p className="mt-1 text-base text-gray-600 font-medium">
                {isEditing ? 'Update service details' : 'Add a new automotive service to your catalog'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Service Name */}
            <div>
              <label htmlFor="name" className="block text-base font-semibold text-gray-800 mb-2">
                Service Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    handleChange('name', e.target.value);
                    // Auto-generate code if creating new service
                    if (!isEditing && !formData.code) {
                      handleChange('code', generateCodeFromName(e.target.value));
                    }
                  }}
                  className={`block w-full rounded-lg border-2 shadow-sm px-4 py-3 text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Oil Change Service"
                  required
                />
                <DocumentTextIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.name && <p className="mt-2 text-sm font-medium text-red-600">{errors.name}</p>}
            </div>

            {/* Service Code */}
            <div>
              <label htmlFor="code" className="block text-base font-semibold text-gray-800 mb-2">
                Service Code *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  className={`block w-full rounded-lg border-2 shadow-sm px-4 py-3 text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.code ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="e.g., OIL_CHANGE"
                  maxLength={50}
                  required
                />
                <TagIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.code && <p className="mt-2 text-sm font-medium text-red-600">{errors.code}</p>}
              <p className="mt-2 text-sm font-medium text-gray-600">
                Unique identifier for this service (will be auto-generated from name)
              </p>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-base font-semibold text-gray-800 mb-2">
                Estimated Duration *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="duration"
                  value={formData.duration_estimate_minutes}
                  onChange={(e) => handleChange('duration_estimate_minutes', parseInt(e.target.value) || 0)}
                  className={`block w-full rounded-lg border-2 shadow-sm px-4 py-3 text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.duration_estimate_minutes ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="60"
                  min="15"
                  max="1440"
                  required
                />
                <ClockIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.duration_estimate_minutes && (
                <p className="mt-2 text-sm font-medium text-red-600">{errors.duration_estimate_minutes}</p>
              )}
              <p className="mt-2 text-sm font-medium text-gray-600">
                {formData.duration_estimate_minutes > 0 ? (
                  <>Duration: {formatDuration(formData.duration_estimate_minutes)}</>
                ) : (
                  'Enter duration in minutes (minimum 15 minutes)'
                )}
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-base font-semibold text-gray-800 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={`block w-full rounded-lg border-2 shadow-sm px-4 py-3 text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none ${
                  errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                }`}
                placeholder="Detailed description of the service including what's included..."
                required
              />
              {errors.description && <p className="mt-2 text-sm font-medium text-red-600">{errors.description}</p>}
              <p className="mt-2 text-sm font-medium text-gray-600">
                Provide a detailed description of what this service includes
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-3 block text-base font-medium text-gray-800">
                Active service (available for booking)
              </label>
            </div>

            {/* Error Display */}
            {Object.keys(errors).length > 0 && !Object.keys(errors).some(key => ['name', 'code', 'description', 'duration_estimate_minutes'].includes(key)) && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="text-base font-medium text-red-700">
                  Please correct the following errors:
                  <ul className="mt-3 list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field} className="text-sm">{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4 rounded-b-xl">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 text-base font-semibold text-white bg-blue-600 border-2 border-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-all"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Service' : 'Create Service'
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ServiceModal;