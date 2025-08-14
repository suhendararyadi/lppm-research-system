'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, FileText, Calendar, DollarSign, Users, MapPin, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';

import type { ResearchProposal, TeamMember } from '@/types';

function ProposalDetailPageContent() {
  const { user } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<ResearchProposal | null>(null);
  const [loading, setLoading] = useState(true);

  const proposalId = params.id as string;

  // Check authorization
  if (!user || !['dosen', 'lecturer', 'admin'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getResearchProposal(proposalId);
        if (response.success && response.data) {
          setProposal(response.data);
        } else {
          toast.error('Gagal memuat detail proposal');
          router.push('/dosen/proposal');
        }
      } catch (error) {
        console.error('Error fetching proposal:', error);
        toast.error('Terjadi kesalahan saat memuat proposal');
        router.push('/dosen/proposal');
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId, router]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      submitted: { label: 'Diajukan', variant: 'default' as const },
      under_review: { label: 'Sedang Ditinjau', variant: 'default' as const },
      approved: { label: 'Disetujui', variant: 'default' as const },
      rejected: { label: 'Ditolak', variant: 'destructive' as const },
      completed: { label: 'Selesai', variant: 'default' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleLabel = (role: string) => {
    return role === 'leader' ? 'Ketua' : 'Anggota';
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      lecturer: 'Dosen',
      student: 'Mahasiswa',
      external: 'Eksternal',
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!proposal) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Proposal Tidak Ditemukan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600 mb-4">
                Proposal yang Anda cari tidak ditemukan.
              </p>
              <div className="flex justify-center">
                <Link href="/dosen/proposal">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali ke Daftar Proposal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dosen/proposal">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Detail Proposal Penelitian</h1>
              <p className="text-muted-foreground">
                Informasi lengkap proposal penelitian
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(proposal.status)}
            {proposal.status === 'draft' && (
              <Link href={`/dosen/proposal/${proposal.id}/edit`}>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Proposal
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informasi Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <h4 className="font-medium mb-2">Judul Kegiatan</h4>
                <p className="text-sm text-muted-foreground">{proposal.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Kelompok Bidang</h4>
                <p className="text-sm text-muted-foreground">{proposal.type}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Lokasi Kegiatan</h4>
                <p className="text-sm text-muted-foreground">{proposal.location || 'Tidak disebutkan'}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tahun Kegiatan</h4>
                <p className="text-sm text-muted-foreground">
                  {proposal.start_date ? new Date(proposal.start_date).getFullYear() : 'Tidak disebutkan'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Lama Kegiatan</h4>
                <p className="text-sm text-muted-foreground">
                  {proposal.duration ? `${proposal.duration} bulan` : 'Tidak disebutkan'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informasi Pendanaan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informasi Pendanaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Sumber Dana</h4>
                <p className="text-sm text-muted-foreground">{proposal.funding_source || 'Tidak disebutkan'}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Besaran Dana</h4>
                <p className="text-sm text-muted-foreground">
                  {proposal.budget ? formatCurrency(proposal.budget) : 'Tidak disebutkan'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informasi SK Penugasan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informasi SK Penugasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Nomor SK Penugasan</h4>
                <p className="text-sm text-muted-foreground">{proposal.sk_number || 'Tidak disebutkan'}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tanggal SK Penugasan</h4>
                <p className="text-sm text-muted-foreground">
                  {proposal.sk_date ? formatDate(proposal.sk_date) : 'Tidak disebutkan'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Dokumen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <h4 className="font-medium mb-2">Dokumen Pendukung</h4>
              <p className="text-sm text-muted-foreground">
                {proposal.document_url ? (
                  <a href={proposal.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Lihat Dokumen
                  </a>
                ) : (
                  'Tidak ada dokumen yang diunggah'
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Anggota Kegiatan */}
        {proposal.team_members && proposal.team_members.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Anggota Kegiatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['lecturer', 'student', 'external'].map((type) => {
                  const members = proposal.team_members?.filter((member: TeamMember) => member.type === type) || [];
                  if (members.length === 0) return null;
                  
                  return (
                    <div key={type}>
                      <h4 className="font-medium mb-3">
                        {type === 'lecturer' ? 'Anggota Dosen' : 
                         type === 'student' ? 'Anggota Mahasiswa' : 
                         'Anggota Eksternal'}
                      </h4>
                      <div className="grid gap-3">
                        {members.map((member: TeamMember, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.institution}</p>
                            </div>
                            <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {type !== 'external' && <Separator className="mt-4" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keterangan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Keterangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {proposal.abstract || 'Tidak ada keterangan'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Informasi Tambahan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Dibuat pada:</span>
                <p className="text-muted-foreground">{formatDate(proposal.created_at)}</p>
              </div>
              <div>
                <span className="font-medium">Terakhir diperbarui:</span>
                <p className="text-muted-foreground">{formatDate(proposal.updated_at)}</p>
              </div>
              {proposal.creator_name && (
                <div>
                  <span className="font-medium">Dibuat oleh:</span>
                  <p className="text-muted-foreground">{proposal.creator_name}</p>
                </div>
              )}
              {proposal.creator_department && (
                <div>
                  <span className="font-medium">Departemen:</span>
                  <p className="text-muted-foreground">{proposal.creator_department}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function ProposalDetailPage() {
  return <ProposalDetailPageContent />;
}