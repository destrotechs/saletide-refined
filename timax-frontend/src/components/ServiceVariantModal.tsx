import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Combobox } from '@headlessui/react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  TagIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import apiClient, { Service, ServiceVariant, Part, VehicleClass, ServiceVariantInventory } from '@/lib/api';

interface ServiceVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
}

interface ServiceVariantFormData {
  part: string;
  vehicle_class: string;
  suggested_price: string;
  floor_price: string;
  is_active: boolean;
}

const ServiceVariantModal: React.FC<ServiceVariantModalProps> = ({ isOpen, onClose, service }) => {
  const queryClient = useQueryClient();
  const [selectedVariant, setSelectedVariant] = useState<ServiceVariant | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [formData, setFormData] = useState<ServiceVariantFormData>({
    part: '',
    vehicle_class: '',
    suggested_price: '',
    floor_price: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch service variants
  const { data: variantsData, isLoading: variantsLoading } = useQuery({
    queryKey: ['service-variants', service?.id],
    queryFn: () => service ? apiClient.getServiceVariants({ service: service.id }) : Promise.resolve({ results: [] }),
    enabled: !!service && isOpen,
  });

  // Fetch parts
  const { data: partsData } = useQuery({
    queryKey: ['parts'],
    queryFn: () => apiClient.getParts({ is_active: true }),
    enabled: isOpen,
  });

  // Fetch vehicle classes
  const { data: vehicleClassesData } = useQuery({
    queryKey: ['vehicle-classes'],
    queryFn: () => apiClient.getVehicleClasses({ is_active: true }),
    enabled: isOpen,
  });

  const variants = variantsData?.results || [];
  const parts = partsData?.results || [];
  const vehicleClasses = vehicleClassesData?.results || [];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVariant(null);
      setShowVariantForm(false);
      setFormData({
        part: '',
        vehicle_class: '',
        suggested_price: '',
        floor_price: '',
        is_active: true,
      });
      setErrors({});
      setSearchTerm('');
    }
  }, [isOpen]);

  // Create variant mutation
  const createVariantMutation = useMutation({
    mutationFn: (data: ServiceVariantFormData) => apiClient.createServiceVariant({
      ...data,
      service: service!.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-variants'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowVariantForm(false);
      setFormData({
        part: '',
        vehicle_class: '',
        suggested_price: '',
        floor_price: '',
        is_active: true,
      });
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: (data: ServiceVariantFormData) => apiClient.updateServiceVariant(selectedVariant!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-variants'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setSelectedVariant(null);
      setShowVariantForm(false);
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteServiceVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-variants'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!formData.part) newErrors.part = 'Part is required';
    if (!formData.vehicle_class) newErrors.vehicle_class = 'Vehicle class is required';
    if (!formData.suggested_price) newErrors.suggested_price = 'Suggested price is required';
    if (!formData.floor_price) newErrors.floor_price = 'Floor price is required';

    const suggestedPrice = parseFloat(formData.suggested_price);
    const floorPrice = parseFloat(formData.floor_price);

    if (isNaN(suggestedPrice) || suggestedPrice <= 0) {
      newErrors.suggested_price = 'Must be a valid positive number';
    }

    if (isNaN(floorPrice) || floorPrice <= 0) {
      newErrors.floor_price = 'Must be a valid positive number';
    }

    if (suggestedPrice > 0 && floorPrice > 0 && floorPrice > suggestedPrice) {
      newErrors.floor_price = 'Floor price cannot be higher than suggested price';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (selectedVariant) {
        await updateVariantMutation.mutateAsync(formData);
      } else {
        await createVariantMutation.mutateAsync(formData);
      }
    } catch (error) {
      // Error handling is done in mutation's onError
    }
  };

  const handleEditVariant = (variant: ServiceVariant) => {
    setSelectedVariant(variant);
    setFormData({
      part: variant.part,
      vehicle_class: variant.vehicle_class,
      suggested_price: variant.suggested_price,
      floor_price: variant.floor_price,
      is_active: variant.is_active,
    });
    setShowVariantForm(true);
  };

  const handleDeleteVariant = async (variant: ServiceVariant) => {
    if (window.confirm(`Are you sure you want to delete the variant for ${variant.part_name} (${variant.vehicle_class_name})?`)) {
      try {
        await deleteVariantMutation.mutateAsync(variant.id);
      } catch (error) {
        console.error('Error deleting variant:', error);
        alert('Failed to delete variant. Please try again.');
      }
    }
  };

  const filteredVariants = variants.filter(variant =>
    variant.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variant.vehicle_class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = createVariantMutation.isPending || updateVariantMutation.isPending;

  if (!service) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Service Variants: {service.name}
              </Dialog.Title>
              <p className="mt-1 text-base text-gray-600 font-medium">
                Manage pricing variants for different parts and vehicle classes
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Variants List */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Existing Variants ({variants.length})
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedVariant(null);
                      setShowVariantForm(true);
                      setFormData({
                        part: '',
                        vehicle_class: '',
                        suggested_price: '',
                        floor_price: '',
                        is_active: true,
                      });
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Variant
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
                    placeholder="Search variants..."
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {variantsLoading ? (
                  <div className="p-6 text-center">
                    <div className="inline-flex items-center text-sm text-gray-500">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading variants...
                    </div>
                  </div>
                ) : filteredVariants.length === 0 ? (
                  <div className="p-6 text-center">
                    <TagIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No variants found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search.' : 'Create your first variant.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredVariants.map((variant) => (
                      <div key={variant.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {variant.part_name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <TruckIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {variant.vehicle_class_name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <CurrencyDollarIcon className="h-4 w-4 text-green-400" />
                                <span className="text-sm text-gray-900">
                                  ${parseFloat(variant.suggested_price).toLocaleString()}
                                </span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                variant.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {variant.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditVariant(variant)}
                              className="p-1 text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                            >
                              <WrenchScrewdriverIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVariant(variant)}
                              className="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Variant Form */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-medium text-gray-900">
                  {showVariantForm ? (selectedVariant ? 'Edit Variant' : 'Create New Variant') : 'Select or Create Variant'}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {showVariantForm ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Part Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Part *
                      </label>
                      <Combobox
                        value={formData.part}
                        onChange={(value) => setFormData(prev => ({ ...prev, part: value }))}
                      >
                        <div className="relative">
                          <Combobox.Input
                            className={`block w-full rounded-lg border-2 shadow-sm px-4 py-3 text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                              errors.part ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                            }`}
                            displayValue={(partId: string) => {
                              const part = parts.find(p => p.id === partId);
                              return part ? part.name : '';
                            }}
                            placeholder="Select a part..."
                          />
                          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                          </Combobox.Button>
                        </div>
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {parts.map((part) => (
                            <Combobox.Option
                              key={part.id}
                              value={part.id}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {({ selected, active }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {part.name}
                                  </span>
                                  {selected && (
                                    <span
                                      className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                                        active ? 'text-white' : 'text-blue-600'
                                      }`}
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </span>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </Combobox.Options>
                      </Combobox>
                      {errors.part && <p className="mt-1 text-sm text-red-600">{errors.part}</p>}
                    </div>

                    {/* Vehicle Class Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Class *
                      </label>
                      <Combobox
                        value={formData.vehicle_class}
                        onChange={(value) => setFormData(prev => ({ ...prev, vehicle_class: value }))}
                      >
                        <div className="relative">
                          <Combobox.Input
                            className={`block w-full rounded-lg border-2 shadow-sm px-4 py-3 text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                              errors.vehicle_class ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                            }`}
                            displayValue={(classId: string) => {
                              const vehicleClass = vehicleClasses.find(vc => vc.id === classId);
                              return vehicleClass ? vehicleClass.name : '';
                            }}
                            placeholder="Select a vehicle class..."
                          />
                          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                          </Combobox.Button>
                        </div>
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {vehicleClasses.map((vehicleClass) => (
                            <Combobox.Option
                              key={vehicleClass.id}
                              value={vehicleClass.id}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {({ selected, active }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {vehicleClass.name} ({vehicleClass.code})
                                  </span>
                                  {selected && (
                                    <span
                                      className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                                        active ? 'text-white' : 'text-blue-600'
                                      }`}
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </span>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </Combobox.Options>
                      </Combobox>
                      {errors.vehicle_class && <p className="mt-1 text-sm text-red-600">{errors.vehicle_class}</p>}
                    </div>

                    {/* Suggested Price */}
                    <div>
                      <label htmlFor="suggested_price" className="block text-sm font-medium text-gray-700 mb-1">
                        Suggested Price *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id="suggested_price"
                          step="0.01"
                          min="0"
                          value={formData.suggested_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, suggested_price: e.target.value }))}
                          className={`block w-full pl-7 pr-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                            errors.suggested_price ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors.suggested_price && <p className="mt-1 text-sm text-red-600">{errors.suggested_price}</p>}
                    </div>

                    {/* Floor Price */}
                    <div>
                      <label htmlFor="floor_price" className="block text-sm font-medium text-gray-700 mb-1">
                        Floor Price *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id="floor_price"
                          step="0.01"
                          min="0"
                          value={formData.floor_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, floor_price: e.target.value }))}
                          className={`block w-full pl-7 pr-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
                            errors.floor_price ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      {errors.floor_price && <p className="mt-1 text-sm text-red-600">{errors.floor_price}</p>}
                      <p className="mt-1 text-xs text-gray-500">
                        Minimum price that can be charged for this service variant
                      </p>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        id="variant_is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="variant_is_active" className="ml-2 block text-sm text-gray-700">
                        Active variant (available for selection)
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowVariantForm(false)}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 inline-flex items-center"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {selectedVariant ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          selectedVariant ? 'Update Variant' : 'Create Variant'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-12">
                    <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Manage Service Variants</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select an existing variant to edit or create a new one.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setSelectedVariant(null);
                          setShowVariantForm(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create First Variant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ServiceVariantModal;