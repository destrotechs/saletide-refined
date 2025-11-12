'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bars3Icon, BellIcon, MagnifyingGlassIcon, ChevronDownIcon, UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 shadow-sm">
      <div className="flex items-center min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 lg:hidden flex-shrink-0"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <h1 className="ml-2 sm:ml-4 text-base sm:text-xl md:text-2xl font-semibold text-gray-900 lg:ml-0 truncate">{title}</h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="block w-64 lg:w-80 rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-blue-500"
          />
        </div>

        {/* Mobile search button */}
        <button
          className="md:hidden rounded-md p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Notifications - Commented out for now */}
        {/* <button className="relative rounded-full p-2 text-gray-400 hover:text-gray-500">
          <BellIcon className="h-6 w-6" />
          <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
        </button> */}

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-1 sm:space-x-2 rounded-lg p-1 sm:p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-600 text-white flex-shrink-0">
              <span className="text-xs sm:text-sm font-medium">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <ChevronDownIcon className={`hidden sm:block h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Role: {user?.role}</p>
                </div>
                <a
                  href="/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <UserCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
                  My Profile
                </a>
                <a
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-400" />
                  Settings
                </a>
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-gray-400" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}