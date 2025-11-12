'use client';

import React, { useState, useMemo } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
import { User } from '@/lib/api';

interface EmployeeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedEmployees: string[]) => void;
  selectedEmployees: string[];
  employees: User[];
  title?: string;
}

export default function EmployeeSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedEmployees,
  employees,
  title = 'Assign Employees',
}: EmployeeSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedEmployees, setTempSelectedEmployees] = useState<string[]>(selectedEmployees);

  // Reset temp selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedEmployees(selectedEmployees);
      setSearchQuery('');
    }
  }, [isOpen, selectedEmployees]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;

    const query = searchQuery.toLowerCase();
    return employees.filter(
      (employee) =>
        employee.first_name.toLowerCase().includes(query) ||
        employee.last_name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const handleToggleEmployee = (employeeId: string) => {
    setTempSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleConfirm = () => {
    onSelect(tempSelectedEmployees);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedEmployees(selectedEmployees);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleCancel} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {tempSelectedEmployees.length} employee{tempSelectedEmployees.length !== 1 ? 's' : ''} selected
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

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchQuery ? 'No employees found matching your search' : 'No employees available'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployees.map((employee) => {
                  const isSelected = tempSelectedEmployees.includes(employee.id);
                  return (
                    <div
                      key={employee.id}
                      onClick={() => handleToggleEmployee(employee.id)}
                      className={`
                        flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div
                            className={`
                              h-10 w-10 rounded-full flex items-center justify-center
                              ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                            `}
                          >
                            {isSelected ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <span className="text-sm font-medium">
                                {employee.first_name.charAt(0)}
                                {employee.last_name.charAt(0)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span
                            className={`
                              inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${
                                employee.role === 'TECHNICIAN'
                                  ? 'bg-green-100 text-green-800'
                                  : employee.role === 'MANAGER'
                                  ? 'bg-purple-100 text-purple-800'
                                  : employee.role === 'ADMIN'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            `}
                          >
                            {employee.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {tempSelectedEmployees.length > 0 ? (
                <span>
                  {tempSelectedEmployees.length} employee{tempSelectedEmployees.length !== 1 ? 's' : ''} will be
                  assigned to this service
                </span>
              ) : (
                <span>No employees selected (optional)</span>
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
