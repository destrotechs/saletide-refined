'use client'

import React, { useState, useEffect } from 'react'
import { AssetMaintenance } from '@/lib/api'
import { format } from 'date-fns'

interface MaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
  maintenance: AssetMaintenance | null
  assetId: string
  onSave: (maintenance: Partial<AssetMaintenance>) => void
  mode: 'view' | 'edit' | 'create'
}

export function MaintenanceModal({
  isOpen,
  onClose,
  maintenance,
  assetId,
  onSave,
  mode
}: MaintenanceModalProps) {
  const [formData, setFormData] = useState<Partial<AssetMaintenance>>({
    asset: assetId,
    maintenance_date: '',
    description: '',
    cost: 0,
    performed_by: '',
    next_maintenance: '',
    type: 'preventive',
    status: 'completed',
  })

  useEffect(() => {
    if (maintenance && mode !== 'create') {
      setFormData({
        ...maintenance,
        maintenance_date: maintenance.maintenance_date ?
          format(new Date(maintenance.maintenance_date), 'yyyy-MM-dd') : '',
        next_maintenance: maintenance.next_maintenance ?
          format(new Date(maintenance.next_maintenance), 'yyyy-MM-dd') : '',
      })
    } else {
      setFormData({
        asset: assetId,
        maintenance_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        cost: 0,
        performed_by: '',
        next_maintenance: '',
        type: 'preventive',
        status: 'completed',
      })
    }
  }, [maintenance, mode, assetId])

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
  const title = mode === 'create' ? 'Add Maintenance Record' :
                mode === 'edit' ? 'Edit Maintenance Record' : 'Maintenance Details'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Date *</label>
                <input
                  type="date"
                  name="maintenance_date"
                  value={formData.maintenance_date || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type || 'preventive'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isReadOnly}
                >
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="emergency">Emergency</option>
                  <option value="routine">Routine</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status || 'completed'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={isReadOnly}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost || ''}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Performed By</label>
              <input
                type="text"
                name="performed_by"
                value={formData.performed_by || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                readOnly={isReadOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Maintenance Date</label>
              <input
                type="date"
                name="next_maintenance"
                value={formData.next_maintenance || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                readOnly={isReadOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
                readOnly={isReadOnly}
                placeholder="Describe the maintenance work performed..."
              />
            </div>
          </div>

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
                {mode === 'create' ? 'Add Record' : 'Update Record'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}