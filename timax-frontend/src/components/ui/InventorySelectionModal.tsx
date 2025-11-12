'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  CheckIcon,
  CubeIcon,
  TagIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { apiClient, SKU } from '@/lib/api';

interface InventorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: SelectedInventoryItem[]) => void;
  selectedItems: SelectedInventoryItem[];
  title?: string;
}

interface SelectedInventoryItem {
  id: string;
  sku_id: string;
  sku_name: string;
  sku_code: string;
  sku_unit: string;
  sku_cost: string;
  quantity_used: number;
  total_cost: number;
}

export default function InventorySelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedItems,
  title = "Select Materials & Items"
}: InventorySelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tempSelectedItems, setTempSelectedItems] = useState<SelectedInventoryItem[]>(selectedItems);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  // Fetch SKUs with search and category filters
  const { data: skuData, isLoading: skuLoading } = useQuery({
    queryKey: ['skus', searchTerm, selectedCategory],
    queryFn: () => apiClient.getSKUs({
      search: searchTerm || undefined,
      category: selectedCategory || undefined
    }),
    enabled: isOpen,
  });

  const skus = skuData?.results || [];

  // Get unique categories for filter
  const categories = [...new Set(skus.map(sku => sku.category_name))].filter(Boolean);

  useEffect(() => {
    // Initialize quantities for selected items
    const initialQuantities: { [key: string]: number } = {};
    selectedItems.forEach(item => {
      initialQuantities[item.sku_id] = item.quantity_used;
    });
    setQuantities(initialQuantities);
    setTempSelectedItems(selectedItems);
  }, [selectedItems, isOpen]);

  const handleItemToggle = (sku: SKU) => {
    // Prevent selection of out-of-stock items
    if (sku.current_stock <= 0) {
      return;
    }

    const isSelected = tempSelectedItems.some(item => item.sku_id === sku.id);

    if (isSelected) {
      // Remove item
      setTempSelectedItems(prev => prev.filter(item => item.sku_id !== sku.id));
      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[sku.id];
        return newQuantities;
      });
    } else {
      // Add item with no default quantity - user must enter it
      const newItem: SelectedInventoryItem = {
        id: `item-${Date.now()}-${sku.id}`,
        sku_id: sku.id,
        sku_name: sku.name,
        sku_code: sku.code,
        sku_unit: sku.unit,
        sku_cost: sku.cost,
        quantity_used: 0,
        total_cost: 0,
      };
      setTempSelectedItems(prev => [...prev, newItem]);
      setQuantities(prev => ({ ...prev, [sku.id]: 0 }));
    }
  };

  const handleQuantityChange = (skuId: string, value: string | number) => {
    // Convert to number, but allow empty string for editing
    const quantity = value === '' || value === null ? 0 : Number(value);

    // Allow any positive number including decimals (e.g., 0.1, 0.5, etc.)
    // Also allow 0 so user can clear the field, but validation will catch it on confirm
    if (quantity < 0 || isNaN(quantity)) return;

    // Find the SKU to check available stock
    const sku = skus.find(s => s.id === skuId);
    if (sku && quantity > sku.current_stock) {
      // Don't allow quantity to exceed available stock
      return;
    }

    setQuantities(prev => ({ ...prev, [skuId]: quantity }));
    setTempSelectedItems(prev =>
      prev.map(item =>
        item.sku_id === skuId
          ? {
              ...item,
              quantity_used: quantity,
              total_cost: quantity * parseFloat(item.sku_cost)
            }
          : item
      )
    );
  };

  const handleConfirm = () => {
    onSelect(tempSelectedItems);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedItems(selectedItems);
    setQuantities({});
    onClose();
  };

  const isItemSelected = (skuId: string) => {
    return tempSelectedItems.some(item => item.sku_id === skuId);
  };

  const getTotalCost = () => {
    return tempSelectedItems.reduce((total, item) => total + item.total_cost, 0);
  };

  const getTotalItems = () => {
    return tempSelectedItems.length;
  };

  const hasInvalidQuantities = () => {
    return tempSelectedItems.some(item => item.quantity_used <= 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleCancel} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <CubeIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search materials, items, or codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div className="w-full lg:w-64 relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4">
            {skuLoading ? (
              <div className="text-center py-8">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Loading materials...</p>
              </div>
            ) : skus.length > 0 ? (
              <div className="space-y-4">
                {skus.map((sku) => {
                  const isSelected = isItemSelected(sku.id);
                  const quantity = quantities[sku.id] !== undefined ? quantities[sku.id] : 0;
                  const isOutOfStock = sku.current_stock <= 0;
                  const isLowStock = sku.current_stock > 0 && sku.current_stock <= 5;

                  return (
                    <div
                      key={sku.id}
                      onClick={() => handleItemToggle(sku)}
                      className={`
                        flex items-center justify-between p-4 rounded-lg border-2 transition-all
                        ${isOutOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        ${
                          isSelected && !isOutOfStock
                            ? 'border-blue-500 bg-blue-50'
                            : isOutOfStock
                            ? 'border-red-200 bg-gray-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                      title={isOutOfStock ? 'Out of stock - cannot be selected' : ''}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div
                            className={`
                              h-10 w-10 rounded-full flex items-center justify-center
                              ${isOutOfStock ? 'bg-gray-200 text-gray-600' : isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                            `}
                          >
                            {isSelected ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <CubeIcon className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {sku.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500 truncate flex items-center">
                              <TagIcon className="h-3 w-3 mr-1" />
                              {sku.code}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-500">{sku.category_name}</p>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {isOutOfStock ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Low: {sku.current_stock} {sku.unit}
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {sku.current_stock} {sku.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Input for Selected Items */}
                      {isSelected && (
                        <div className="ml-4 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-sm font-medium text-gray-700">Qty:</label>
                          <input
                            type="number"
                            min="0.01"
                            max={sku.current_stock}
                            step="0.01"
                            value={quantity === 0 ? '' : quantity}
                            onChange={(e) => handleQuantityChange(sku.id, e.target.value)}
                            placeholder="0"
                            className="w-20 px-2 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-sm text-gray-600">{sku.unit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? `No results for "${searchTerm}"` : 'No materials available'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {getTotalItems() > 0 ? (
                <span>
                  {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} will be added to this service
                </span>
              ) : (
                <span>No items selected (optional)</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={getTotalItems() > 0 && hasInvalidQuantities()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={getTotalItems() > 0 && hasInvalidQuantities() ? 'Please enter quantities greater than 0 for all items' : ''}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}