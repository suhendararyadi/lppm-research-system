'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="hidden w-64 flex-col border-r bg-background md:flex">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title={title} />
          
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

// HOC for pages that need authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    title?: string;
    requiredRoles?: string[];
  }
) {
  return function AuthenticatedComponent(props: P) {
    const { user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
      if (options?.requiredRoles && user) {
        const hasRequiredRole = options.requiredRoles.includes(user.role);
        if (!hasRequiredRole) {
          router.push('/dashboard'); // Redirect to dashboard if no permission
        }
      }
    }, [user, router]);

    // Check role permission
    if (options?.requiredRoles && user) {
      const hasRequiredRole = options.requiredRoles.includes(user.role);
      if (!hasRequiredRole) {
        return (
          <DashboardLayout title="Akses Ditolak">
            <div className="flex h-96 flex-col items-center justify-center space-y-4">
              <div className="text-6xl">🚫</div>
              <h1 className="text-2xl font-bold">Akses Ditolak</h1>
              <p className="text-muted-foreground">
                Anda tidak memiliki izin untuk mengakses halaman ini.
              </p>
            </div>
          </DashboardLayout>
        );
      }
    }

    return (
      <DashboardLayout title={options?.title}>
        <Component {...props} />
      </DashboardLayout>
    );
  };
}