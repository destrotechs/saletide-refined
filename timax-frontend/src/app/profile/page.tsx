'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  PencilIcon,
  CameraIcon,
  ShieldCheckIcon,
  ClockIcon,
  KeyIcon,
  BellIcon,
  GlobeAmericasIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface SecurityFormData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  });

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, profileForm]);

  const securityForm = useForm<SecurityFormData>();

  const handleProfileSave = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.updateProfile(data);
      toast.success(response.message);
      setIsEditing(false);
      await refreshUser();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (data: SecurityFormData) => {
    setIsLoading(true);
    try {
      const response = await apiClient.changePassword(data);
      toast.success(response.message);
      securityForm.reset();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      toast.error(errorMessage);
      console.error('Failed to change password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ProfileSection = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <button className="absolute -bottom-1 -right-1 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <CameraIcon className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </h1>
                  <p className="text-lg text-blue-600 font-medium">{user?.role}</p>
                  <p className="text-gray-500 mt-1">{user?.email}</p>
                </div>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {isEditing ? (
                    <>
                      <XMarkIcon className="h-4 w-4" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <PencilIcon className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Joined {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Recently'}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{user?.branch?.name || 'No branch assigned'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5" />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  {...profileForm.register('first_name', { required: 'First name is required' })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {profileForm.formState.errors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{profileForm.formState.errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  {...profileForm.register('last_name', { required: 'Last name is required' })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {profileForm.formState.errors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{profileForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...profileForm.register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              {profileForm.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{profileForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...profileForm.register('phone')}
                  disabled={!isEditing}
                  placeholder="+254 700 000 000"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>


            {isEditing && (
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex items-center space-x-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const SecuritySection = () => (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <KeyIcon className="h-5 w-5" />
            <span>Change Password</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={securityForm.handleSubmit(handlePasswordChange)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                {...securityForm.register('old_password', { required: 'Current password is required' })}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {securityForm.formState.errors.old_password && (
                <p className="text-red-500 text-sm mt-1">{securityForm.formState.errors.old_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                {...securityForm.register('new_password', {
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {securityForm.formState.errors.new_password && (
                <p className="text-red-500 text-sm mt-1">{securityForm.formState.errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                {...securityForm.register('confirm_password', {
                  required: 'Please confirm your password',
                  validate: value => value === securityForm.watch('new_password') || 'Passwords do not match'
                })}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {securityForm.formState.errors.confirm_password && (
                <p className="text-red-500 text-sm mt-1">{securityForm.formState.errors.confirm_password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5" />
            <span>Security Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-900">Two-Factor Authentication</h4>
                <p className="text-sm text-green-700">Enabled with authenticator app</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <ClockIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Session Timeout</h4>
                <p className="text-sm text-gray-600">Automatically sign out after 30 minutes</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PreferencesSection = () => (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellIcon className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { title: 'Email Notifications', description: 'Receive updates via email', enabled: true },
            { title: 'Push Notifications', description: 'Browser push notifications', enabled: false },
            { title: 'Job Updates', description: 'Notifications about job status changes', enabled: true },
            { title: 'System Alerts', description: 'Important system notifications', enabled: true },
          ].map((setting, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{setting.title}</h4>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked={setting.enabled}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GlobeAmericasIcon className="h-5 w-5" />
            <span>Language & Region</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>English (US)</option>
              <option>English (UK)</option>
              <option>Swahili</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Africa/Nairobi (GMT+3)</option>
              <option>UTC (GMT+0)</option>
              <option>America/New_York (GMT-5)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button>Save Preferences</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'preferences', label: 'Preferences', icon: GlobeAmericasIcon },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-screen">
            {activeTab === 'profile' && <ProfileSection />}
            {activeTab === 'security' && <SecuritySection />}
            {activeTab === 'preferences' && <PreferencesSection />}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}