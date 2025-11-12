'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SparklesIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface UserFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => apiClient.getUser(id),
    enabled: !!id,
  });

  // Initialize form data when user data is loaded
  React.useEffect(() => {
    if (user && !isFormInitialized) {
      setFormData({
        email: user.email || '',
        password: '',
        confirm_password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        role: user.role || 'EMPLOYEE',
      });
      setIsFormInitialized(true);
    }
  }, [user, isFormInitialized]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully!');
      router.push('/settings/users');
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
        toast.error('Failed to update user. Please check the form for errors.');
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

    // Password is optional for updates
    if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { confirm_password, password, ...baseData } = formData;

    // Only include password if it was changed
    const submitData: any = baseData;
    if (password) {
      submitData.password = password;
    }

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <Layout>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
        <Layout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900">User not found</h2>
            <p className="text-gray-500 mt-2">The user you're looking for doesn't exist.</p>
            <Link href="/settings/users">
              <Button className="mt-4">
                Back to Users
              </Button>
            </Link>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            title={user ? `${user.first_name} ${user.last_name}` : 'Edit Employee'}
            description="Update employee account information"
            breadcrumbs={[
              { label: 'Settings', href: '/settings' },
              { label: 'Employees', href: '/settings/users' },
              { label: user ? `${user.first_name} ${user.last_name}` : 'Edit' }
            ]}
          />

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
                  </div>
                </div>

                {/* Change Password Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      Generate New Password
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      Leave password fields blank to keep the current password
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
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
                        Must be at least 8 characters if changing. User can change it later.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
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
                    isLoading={updateMutation.isPending}
                    disabled={updateMutation.isPending}
                  >
                    Save Changes
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
