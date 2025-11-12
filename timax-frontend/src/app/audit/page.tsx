'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import apiClient, { AuditLog, PriceOverrideLog, StockMovementLog, UserSessionLog } from '@/lib/api';

type AuditTab = 'audit-logs' | 'price-overrides' | 'stock-movements' | 'user-sessions';

const actionTypeColors = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  APPROVE: 'bg-emerald-100 text-emerald-800',
  REJECT: 'bg-orange-100 text-orange-800',
  OVERRIDE: 'bg-yellow-100 text-yellow-800',
  STOCK_ADJUSTMENT: 'bg-indigo-100 text-indigo-800',
  PAYMENT: 'bg-pink-100 text-pink-800',
  EXPORT: 'bg-cyan-100 text-cyan-800',
};

const movementTypeColors = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
  CONSUMPTION: 'bg-orange-100 text-orange-800',
  WASTAGE: 'bg-gray-100 text-gray-800',
};

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<AuditTab>('audit-logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    action_type: '',
    model_name: '',
    user: '',
    start_date: '',
    end_date: '',
    movement_type: '',
    is_approved: '',
    is_active: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['audit-logs', activeTab, searchTerm, filters],
    queryFn: async () => {
      const params = {
        search: searchTerm || undefined,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== '')),
      };

      switch (activeTab) {
        case 'audit-logs':
          return await apiClient.getAuditLogs(params);
        case 'price-overrides':
          return await apiClient.getPriceOverrideLogs(params);
        case 'stock-movements':
          return await apiClient.getStockMovementLogs(params);
        case 'user-sessions':
          return await apiClient.getUserSessionLogs(params);
        default:
          return await apiClient.getAuditLogs(params);
      }
    },
    enabled: true,
  }) as any;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChanges = (changes: Record<string, any>) => {
    return Object.entries(changes).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const { from, to } = value;
        return `${key}: ${from} → ${to}`;
      }
      return `${key}: ${value}`;
    }).join(', ');
  };

  const renderAuditLogRow = (log: AuditLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            actionTypeColors[log.action_type] || 'bg-gray-100 text-gray-800'
          }`}>
            {log.action_type}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{log.model_name}</div>
        <div className="text-sm text-gray-500">{log.object_repr}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
        </div>
        <div className="text-sm text-gray-500">{log.user?.email}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {Object.keys(log.changes).length > 0 ? formatChanges(log.changes) : 'No changes'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateTime(log.created_at)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {log.ip_address}
      </td>
    </tr>
  );

  const renderPriceOverrideRow = (log: PriceOverrideLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {log.is_approved === true && (
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          )}
          {log.is_approved === false && (
            <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
          )}
          {log.is_approved === null && (
            <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
          )}
          <span className={`text-sm font-medium ${
            log.is_approved === true ? 'text-green-800' :
            log.is_approved === false ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {log.is_approved === true ? 'Approved' :
             log.is_approved === false ? 'Rejected' : 'Pending'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">Job Line: {log.job_line}</div>
        <div className="text-sm text-gray-500">Reason: {log.reason}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          Original: ${parseFloat(log.original_price).toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          Requested: ${parseFloat(log.requested_price).toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          Floor: ${parseFloat(log.floor_price).toLocaleString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {log.requested_by ? `${log.requested_by.first_name} ${log.requested_by.last_name}` : 'Unknown'}
        </div>
        <div className="text-sm text-gray-500">{log.requested_by?.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {log.approved_by ? `${log.approved_by.first_name} ${log.approved_by.last_name}` : 'N/A'}
        </div>
        <div className="text-sm text-gray-500">{log.approved_by?.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateTime(log.requested_at)}
      </td>
    </tr>
  );

  const renderStockMovementRow = (log: StockMovementLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          movementTypeColors[log.movement_type] || 'bg-gray-100 text-gray-800'
        }`}>
          {log.movement_type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{log.sku.name}</div>
        <div className="text-sm text-gray-500">{log.sku.code}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{log.location.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {parseFloat(log.quantity_before).toLocaleString()} → {parseFloat(log.quantity_after).toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          Change: {parseFloat(log.quantity_change) > 0 ? '+' : ''}{parseFloat(log.quantity_change).toLocaleString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          ${parseFloat(log.total_value).toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          @ ${parseFloat(log.cost_per_unit).toLocaleString()}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate">{log.reason}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateTime(log.created_at)}
      </td>
    </tr>
  );

  const renderUserSessionRow = (log: UserSessionLog) => (
    <tr key={log.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {log.is_active ? (
            <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
          ) : (
            <div className="h-2 w-2 bg-gray-400 rounded-full mr-2"></div>
          )}
          <span className={`text-sm font-medium ${log.is_active ? 'text-green-800' : 'text-gray-800'}`}>
            {log.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {log.user.first_name} {log.user.last_name}
        </div>
        <div className="text-sm text-gray-500">{log.user.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {log.ip_address}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {log.device_type}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateTime(log.login_time)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {log.logout_time ? formatDateTime(log.logout_time) : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateTime(log.last_activity)}
      </td>
    </tr>
  );

  const tabs = [
    { id: 'audit-logs', name: 'Audit Logs', icon: DocumentTextIcon, count: auditLogs?.count || 0 },
    { id: 'price-overrides', name: 'Price Overrides', icon: CurrencyDollarIcon, count: auditLogs?.count || 0 },
    { id: 'stock-movements', name: 'Stock Movements', icon: ArchiveBoxIcon, count: auditLogs?.count || 0 },
    { id: 'user-sessions', name: 'User Sessions', icon: UserIcon, count: auditLogs?.count || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and track all system activities, changes, and user actions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              if (activeTab === 'audit-logs') refetchAudit();
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AuditTab)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search audit logs..."
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              {activeTab === 'audit-logs' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                    <select
                      value={filters.action_type}
                      onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="LOGIN">Login</option>
                      <option value="LOGOUT">Logout</option>
                      <option value="APPROVE">Approve</option>
                      <option value="REJECT">Reject</option>
                      <option value="OVERRIDE">Override</option>
                      <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
                      <option value="PAYMENT">Payment</option>
                      <option value="EXPORT">Export</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={filters.model_name}
                      onChange={(e) => setFilters(prev => ({ ...prev, model_name: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Customer, Job, Invoice"
                    />
                  </div>
                </>
              )}
              {activeTab === 'price-overrides' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.is_approved}
                    onChange={(e) => setFilters(prev => ({ ...prev, is_approved: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="true">Approved</option>
                    <option value="false">Rejected</option>
                    <option value="null">Pending</option>
                  </select>
                </div>
              )}
              {activeTab === 'stock-movements' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
                  <select
                    value={filters.movement_type}
                    onChange={(e) => setFilters(prev => ({ ...prev, movement_type: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Movements</option>
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="CONSUMPTION">Consumption</option>
                    <option value="WASTAGE">Wastage</option>
                  </select>
                </div>
              )}
              {activeTab === 'user-sessions' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.is_active}
                    onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Sessions</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {auditLoading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center text-sm text-gray-500">
              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Loading audit logs...
            </div>
          </div>
        ) : auditLogs?.results?.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some(v => v !== '')
                ? 'Try adjusting your search or filters.'
                : 'No audit logs have been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === 'audit-logs' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Object
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                    </>
                  )}
                  {activeTab === 'price-overrides' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pricing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </>
                  )}
                  {activeTab === 'stock-movements' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </>
                  )}
                  {activeTab === 'user-sessions' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Logout Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs?.results?.map((log: any) => {
                  switch (activeTab) {
                    case 'audit-logs':
                      return renderAuditLogRow(log);
                    case 'price-overrides':
                      return renderPriceOverrideRow(log);
                    case 'stock-movements':
                      return renderStockMovementRow(log);
                    case 'user-sessions':
                      return renderUserSessionRow(log);
                    default:
                      return null;
                  }
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {auditLogs?.results?.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to{' '}
                  <span className="font-medium">{auditLogs.results.length}</span> of{' '}
                  <span className="font-medium">{auditLogs.count}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}