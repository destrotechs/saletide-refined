'use client';

import React, { Component, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's an authentication-related error
    const isAuthError = error.message.includes('401') ||
                       error.message.includes('403') ||
                       error.message.includes('Unauthorized') ||
                       error.message.includes('token') ||
                       error.message.includes('expired');

    if (isAuthError) {
      // Clear tokens and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Don't render anything if there's an auth error,
      // as we're redirecting to login
      return null;
    }

    return this.props.children;
  }
}

export default function AuthErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthErrorBoundary>
      {children}
    </AuthErrorBoundary>
  );
}