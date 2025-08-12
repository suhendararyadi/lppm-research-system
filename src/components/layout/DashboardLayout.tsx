'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Header } from './Header';
import { AppSidebar } from './AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function DashboardLayout({ children, title, className }: DashboardLayoutProps) {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header title={title} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <main className={cn('flex-1', className)}>
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
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