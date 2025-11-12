import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 -mx-3 -mt-4 px-3 py-3 sm:-mx-4 sm:-mt-6 sm:px-4 sm:py-4 md:-mx-6 md:-mt-8 md:px-6 md:py-4 lg:-mx-8 lg:px-8 mb-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs and Mobile Actions */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                <li>
                  <Link
                    href="/dashboard"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HomeIcon className="h-4 w-4 flex-shrink-0" />
                  </Link>
                </li>
                {breadcrumbs.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mx-1" />
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Mobile Actions */}
          {actions && (
            <div className="flex-shrink-0 flex items-center gap-2 sm:hidden">
              {actions}
            </div>
          )}
        </div>

        {/* Title and Desktop Actions */}
        <div className="hidden sm:flex sm:items-end sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-600 max-w-3xl">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
