'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, FileText, Calendar, DollarSign, Users, MapPin, Clock, Target, Lightbulb, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import type { CommunityService, TeamMember } from '@/types';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-purple-100 text-purple-800'
};

const statusLabels = {
  draft: 'Draft',
  submitted: 'Diajukan',
  under_review: 'Sedang Direview',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai'
};

const typeLabels = {
  community_empowerment: 'Pemberdayaan Masyarakat',
  education_training: 'Pendidikan dan Pelatihan',
  health_service: 'Pelayanan Kesehatan',
  technology_transfer: 'Transfer Teknologi',
  social_service: 'Pelayanan Sosial',
  environmental: 'Lingkungan',
  economic_development: 'Pengembangan Ekonomi',
  disaster_relief: 'Bantuan Bencana',
  other: 'Lainnya'
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'leader':
      return 'Ketua';
    case 'member':
      return 'Anggota';
    default:
      return role;
  }
};

export default function PengabdianDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [service, setService] = useState<CommunityService | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchService();
    }
  }, [params.id]);

  const fetchService = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getCommunityService(params.id as string);
      
      if (response.success && response.data) {
        setService(response.data);
      } else {
        console.error('Failed to fetch service:', response.error);
        toast.error('Gagal memuat data pengabdian');
        router.push('/dosen/pengabdian');
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Gagal memuat data pengabdian');
      router.push('/dosen/pengabdian');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data pengabdian...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!service) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Pengabdian tidak ditemukan</h2>
            <p className="text-muted-foreground mb-4">Pengabdian yang Anda cari tidak dapat ditemukan.</p>
            <Link href="/dosen/pengabdian">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Daftar Pengabdian
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dosen/pengabdian">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{service.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="secondary" 
                  className={statusColors[service.status as keyof typeof statusColors]}
                >
                  {statusLabels[service.status as keyof typeof statusLabels]}
                </Badge>
                <Badge variant="outline">
                  {typeLabels[service.type as keyof typeof typeLabels]}
                </Badge>
              </div>
            </div>
          </div>
          {(service.status === 'draft' || service.status === 'rejected') && (
            <Link href={`/dosen/pengabdian/${service.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Proposal
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informasi Dasar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Deskripsi</h4>
                  <p className="text-muted-foreground">{service.description}</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lokasi</p>
                      <p className="font-medium">{service.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Target Audience</p>
                      <p className="font-medium">{service.target_audience}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                      <p className="font-medium">{formatDate(service.start_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tanggal Selesai</p>
                      <p className="font-medium">{formatDate(service.end_date)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Peserta yang Diharapkan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {service.expected_participants.toLocaleString('id-ID')} orang
                  </p>
                  {service.actual_participants && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Peserta aktual: {service.actual_participants.toLocaleString('id-ID')} orang
                    </p>
                  )}
                </CardContent>
              </Card>

              {service.impact_report && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4" />
                      Laporan Dampak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {service.impact_report}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tim Pengabdian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {['lecturer', 'student', 'external'].map((type) => {
                    const members = service.team_members?.filter((member: TeamMember) => member.type === type) || [];
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Informasi Keuangan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Anggaran</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(service.budget)}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Sumber Dana</p>
                  <p className="font-medium">{service.funding_source}</p>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat</p>
                  <p className="font-medium">{formatDate(service.created_at)}</p>
                </div>
                {service.submitted_at && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Diajukan</p>
                      <p className="font-medium">{formatDate(service.submitted_at)}</p>
                    </div>
                  </>
                )}
                {service.reviewed_at && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Direview</p>
                      <p className="font-medium">{formatDate(service.reviewed_at)}</p>
                    </div>
                  </>
                )}
                {service.approved_at && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Disetujui</p>
                      <p className="font-medium">{formatDate(service.approved_at)}</p>
                    </div>
                  </>
                )}
                {service.completed_at && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Selesai</p>
                      <p className="font-medium">{formatDate(service.completed_at)}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Review Notes */}
            {service.review_notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Catatan Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{service.review_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}