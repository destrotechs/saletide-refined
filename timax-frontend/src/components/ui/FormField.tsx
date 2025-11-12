import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
}

const baseInputClasses = "block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors";
const baseSelectClasses = "block w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors";
const errorClasses = "border-red-300";
const normalClasses = "border-gray-300";

export function InputField({ label, error, icon, required, className = "", ...props }: InputFieldProps) {
  const inputClasses = `${baseInputClasses} ${error ? errorClasses : normalClasses} ${className}`;

  return (
    <div>
      <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={icon ? `pl-10 ${inputClasses}` : inputClasses}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export function SelectField({ label, error, required, className = "", children, ...props }: SelectFieldProps) {
  const selectClasses = `${baseSelectClasses} ${error ? errorClasses : normalClasses} ${className}`;

  return (
    <div>
      <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        {...props}
        className={selectClasses}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export function TextAreaField({ label, error, required, className = "", ...props }: TextAreaFieldProps) {
  const textareaClasses = `${baseInputClasses} ${error ? errorClasses : normalClasses} ${className}`;

  return (
    <div>
      <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        {...props}
        className={textareaClasses}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}