'use client'

import React, { useState, useEffect } from 'react'
import { Asset, AssetCategory } from '@/lib/api'
import { format } from 'date-fns'

interface AssetModalProps {
  isOpen: boolean
  onClose: () => void
  asset: Asset | null
  categories: AssetCategory[]
  onSave: (asset: Partial<Asset>) => void
  mode: 'view' | 'edit' | 'create'
}

export function AssetModal({ isOpen, onClose, asset, categories, onSave, mode }: AssetModalProps) {
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    asset_number: '',
    description: '',
    category: '',
    purchase_date: '',
    purchase_cost: '0',
    current_book_value: '0',
    depreciation_method: 'straight_line',
    useful_life_years: 5,
    location: '',
    status: 'ACTIVE',
    serial_number: '',
    warranty_expiry: '',
  })

  useEffect(() => {
    if (asset && mode !== 'create') {
      setFormData({
        ...asset,
        purchase_date: asset.purchase_date ? format(new Date(asset.purchase_date), 'yyyy-MM-dd') : '',
        warranty_expiry: asset.warranty_expiry ? format(new Date(asset.warranty_expiry), 'yyyy-MM-dd') : '',
      })
    } else {
      setFormData({
        name: '',
        asset_number: '',
        description: '',
        category: '',
        purchase_date: '',
        purchase_cost: '0',
        current_book_value: '0',
        depreciation_method: 'straight_line',
        useful_life_years: 5,
        location: '',
        status: 'ACTIVE',
        serial_number: '',
        warranty_expiry: '',
      })
    }
  }, [asset, mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  if (!isOpen) return null

  const isReadOnly = mode === 'view'
  const title = mode === 'create' ? 'Add New Asset' : mode === 'edit' ? 'Edit Asset' : 'Asset Details'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Number *</label>
                <input
                  type="text"
                  name="asset_number"
                  value={formData.asset_number || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  disabled={isReadOnly}
                >
                  <option value="">Select category</option>
                  {Array.isArray(categories) && categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status || 'ACTIVE'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isReadOnly}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">In Maintenance</option>
                  <option value="DISPOSED">Disposed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Financial Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost *</label>
                <input
                  type="number"
                  name="purchase_cost"
                  value={formData.purchase_cost || ''}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                <input
                  type="number"
                  name="current_book_value"
                  value={formData.current_book_value || ''}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated based on depreciation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label>
                <select
                  name="depreciation_method"
                  value={formData.depreciation_method || 'straight_line'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isReadOnly}
                >
                  <option value="straight_line">Straight Line</option>
                  <option value="declining_balance">Declining Balance</option>
                  <option value="double_declining">Double Declining Balance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Rate (%)</label>
                <input
                  type="number"
                  name="depreciation_rate"
                  value={formData.depreciation_rate || ''}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (Years)</label>
                <input
                  type="number"
                  name="useful_life_years"
                  value={formData.useful_life_years || ''}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expires</label>
                <input
                  type="date"
                  name="warranty_expiry"
                  value={formData.warranty_expiry || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              readOnly={isReadOnly}
            />
          </div>

          {/* Depreciation Summary */}
          {mode === 'view' && asset && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Depreciation Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Original Cost</p>
                  <p className="font-medium text-gray-900">KSh {parseFloat(asset.purchase_cost || '0')?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Current Value</p>
                  <p className="font-medium text-gray-900">KSh {parseFloat(asset.current_book_value || '0')?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Depreciated Amount</p>
                  <p className="font-medium text-red-600">
                    KSh {(parseFloat(asset.purchase_cost || '0') - parseFloat(asset.current_book_value || '0')).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Age</p>
                  <p className="font-medium text-gray-900">
                    {asset.purchase_date ?
                      Math.floor((new Date().getTime() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                      : 0} years
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {mode === 'create' ? 'Create Asset' : 'Update Asset'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}