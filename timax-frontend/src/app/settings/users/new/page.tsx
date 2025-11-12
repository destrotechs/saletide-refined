'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeftIcon, SparklesIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface UserFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'SALES_AGENT',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: Omit<UserFormData, 'confirm_password'>) => apiClient.createUser(data),
    onSuccess: () => {
      toast.success('User created successfully!');
      router.push('/settings/users');
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
        toast.error('Failed to create user. Please check the form for errors.');
      } else {
        toast.error('An unexpected error occurred');
      }
    },
  });

  const generatePassword = () => {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      confirm_password: newPassword
    }));
    // Clear any password errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.password;
      delete newErrors.confirm_password;
      return newErrors;
    });
    toast.success('Password generated! User can change it later.');
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { confirm_password, ...submitData } = formData;
    createMutation.mutate(submitData);
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <Link href="/settings/users">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add New Employee</h2>
              <p className="text-sm text-gray-500 mt-1">
                Create a new employee account
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                          errors.first_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="John"
                      />
                      {errors.first_name && (
                        <p className="text-xs text-red-600 mt-1">{errors.first_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                          errors.last_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Doe"
                      />
                      {errors.last_name && (
                        <p className="text-xs text-red-600 mt-1">{errors.last_name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                          errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="john.doe@example.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                          errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="+1 (555) 123-4567"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Account Settings</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                          errors.role ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="SALES_AGENT">Sales Agent</option>
                        <option value="TECHNICIAN">Technician</option>
                        <option value="INVENTORY_CLERK">Inventory Clerk</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                      {errors.role && (
                        <p className="text-xs text-red-600 mt-1">{errors.role}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Sales Agent: Handle customer interactions • Technician: Work on jobs • Inventory: Manage stock • Accountant: Financial records • Manager: Oversee operations • Admin: Full system access
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                        >
                          <SparklesIcon className="h-3 w-3 mr-1" />
                          Generate Password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                            errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-xs text-red-600 mt-1">{errors.password}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Must be at least 8 characters long. User can change it later.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={formData.confirm_password}
                          onChange={(e) => handleChange('confirm_password', e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                            errors.confirm_password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-xs text-red-600 mt-1">{errors.confirm_password}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* General Error */}
                {errors.non_field_errors && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">{errors.non_field_errors}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Link href="/settings/users">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    isLoading={createMutation.isPending}
                    disabled={createMutation.isPending}
                  >
                    Create Employee
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
