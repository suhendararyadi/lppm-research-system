'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';

// Mock data - akan diganti dengan API call
const proposalStats = {
  total: 12,
  draft: 3,
  submitted: 4,
  approved: 3,
  rejected: 1,
  completed: 1,
};

const recentProposals = [
  {
    id: 1,
    title: 'Pengembangan Sistem Informasi Berbasis AI',
    status: 'approved',
    submittedAt: '2024-01-15',
    budget: 50000000,
  },
  {
    id: 2,
    title: 'Analisis Big Data untuk Smart City',
    status: 'submitted',
    submittedAt: '2024-01-20',
    budget: 75000000,
  },
  {
    id: 3,
    title: 'IoT untuk Monitoring Lingkungan',
    status: 'draft',
    submittedAt: null,
    budget: 60000000,
  },
];

const getStatusBadge = (status: string) => {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary' as const, icon: FileText },
    submitted: { label: 'Diajukan', variant: 'default' as const, icon: Clock },
    approved: { label: 'Disetujui', variant: 'default' as const, icon: CheckCircle },
    rejected: { label: 'Ditolak', variant: 'destructive' as const, icon: AlertCircle },
    completed: { label: 'Selesai', variant: 'default' as const, icon: CheckCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function DosenPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Dosen</h1>
            <p className="text-muted-foreground">
              Kelola proposal penelitian dan pengabdian masyarakat Anda
            </p>
          </div>
          <Link href="/dosen/proposal/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Buat Proposal Baru
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proposal</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposalStats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposalStats.draft}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Diajukan</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposalStats.submitted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposalStats.approved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposalStats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Proposal Terbaru</CardTitle>
                <CardDescription>
                  Daftar proposal penelitian yang baru dibuat atau diperbarui
                </CardDescription>
              </div>
              <Link href="/dosen/proposal">
                <Button variant="outline">Lihat Semua</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{proposal.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Budget: {formatCurrency(proposal.budget)}</span>
                      {proposal.submittedAt && (
                        <span>Diajukan: {new Date(proposal.submittedAt).toLocaleDateString('id-ID')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(proposal.status)}
                    <Link href={`/dosen/proposal/${proposal.id}`}>
                      <Button variant="ghost" size="sm">
                        Lihat
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Penelitian</CardTitle>
              <CardDescription>
                Buat dan kelola proposal penelitian Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dosen/proposal/create">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Proposal Penelitian
                </Button>
              </Link>
              <Link href="/dosen/proposal">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Kelola Proposal
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Pengabdian Masyarakat</CardTitle>
              <CardDescription>
                Buat dan kelola proposal pengabdian masyarakat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dosen/pengabdian/create">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Proposal Pengabdian
                </Button>
              </Link>
              <Link href="/dosen/pengabdian">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Kelola Pengabdian
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}