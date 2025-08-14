'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  GraduationCap,
  Building,
  Award,
  Calendar,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import type { ProgramStudi } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const JENJANG_COLORS = {
  'D3': 'bg-blue-100 text-blue-800',
  'S1': 'bg-green-100 text-green-800',
  'S2': 'bg-yellow-100 text-yellow-800',
  'S3': 'bg-purple-100 text-purple-800'
};

const AKREDITASI_COLORS = {
  'A': 'bg-green-100 text-green-800',
  'B': 'bg-yellow-100 text-yellow-800',
  'C': 'bg-orange-100 text-orange-800',
  'Unggul': 'bg-purple-100 text-purple-800',
  'Baik Sekali': 'bg-blue-100 text-blue-800',
  'Baik': 'bg-gray-100 text-gray-800'
};

export default function ProgramStudiDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [programStudi, setProgramStudi] = useState<ProgramStudi | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const programId = params?.id as string;

  // Check authorization
  useEffect(() => {
    if (user && !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
      router.push('/dashboard');
      toast.error('Anda tidak memiliki akses ke halaman ini');
    }
  }, [user, router]);

  // Load program studi detail
  useEffect(() => {
    if (programId) {
      loadProgramStudi();
    }
  }, [programId]);

  const loadProgramStudi = async () => {
    try {
      setLoading(true);
      // Since there's no specific getProgramStudiById endpoint, we'll get all and filter
      const response = await apiClient.getProgramStudi();
      if (response.success && response.data) {
        const program = response.data.find(p => p.id === programId);
        if (program) {
          setProgramStudi(program);
        } else {
          toast.error('Program studi tidak ditemukan');
          router.push('/admin/program-studi');
        }
      } else {
        toast.error('Gagal memuat data program studi');
      }
    } catch (error) {
      console.error('Error loading program studi:', error);
      toast.error('Gagal memuat data program studi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!programStudi) return;
    
    if (!confirm('Apakah Anda yakin ingin menghapus program studi ini?')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await apiClient.deleteProgramStudi(programStudi.id);
      if (response.success) {
        toast.success('Program studi berhasil dihapus');
        router.push('/admin/program-studi');
      } else {
        toast.error('Gagal menghapus program studi');
      }
    } catch (error) {
      console.error('Error deleting program studi:', error);
      toast.error('Gagal menghapus program studi');
    } finally {
      setDeleting(false);
    }
  };

  if (!user || !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout title="Detail Program Studi">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!programStudi) {
    return (
      <DashboardLayout title="Program Studi Tidak Ditemukan">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Program Studi Tidak Ditemukan</h2>
          <p className="text-muted-foreground mb-6">Program studi yang Anda cari tidak dapat ditemukan.</p>
          <Link href="/admin/program-studi">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Daftar Program Studi
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Detail Program Studi - ${programStudi.nama}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/program-studi">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{programStudi.nama}</h1>
              <p className="text-muted-foreground">
                Detail informasi program studi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/admin/program-studi/${programStudi.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Program Studi Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Kode Program Studi</label>
                  <p className="text-lg font-semibold">{programStudi.kode}</p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nama Program Studi</label>
                  <p className="text-lg">{programStudi.nama}</p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Jenjang</label>
                  <div className="mt-1">
                    <Badge 
                      variant="secondary" 
                      className={JENJANG_COLORS[programStudi.jenjang as keyof typeof JENJANG_COLORS] || 'bg-gray-100 text-gray-800'}
                    >
                      {programStudi.jenjang}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={programStudi.is_active ? 'default' : 'secondary'}
                      className={programStudi.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                    >
                      {programStudi.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informasi Akademik
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fakultas</label>
                  <p className="text-lg">{programStudi.fakultas}</p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Akreditasi</label>
                  <div className="mt-1">
                    {programStudi.akreditasi ? (
                      <Badge 
                        variant="secondary" 
                        className={AKREDITASI_COLORS[programStudi.akreditasi as keyof typeof AKREDITASI_COLORS] || 'bg-gray-100 text-gray-800'}
                      >
                        {programStudi.akreditasi}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Belum terakreditasi</span>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tanggal Dibuat</label>
                  <p className="text-sm">
                    {programStudi.created_at 
                      ? new Date(programStudi.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'
                    }
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Terakhir Diperbarui</label>
                  <p className="text-sm">
                    {programStudi.updated_at 
                      ? new Date(programStudi.updated_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Statistik Program Studi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-muted-foreground">Total Mahasiswa</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-muted-foreground">Total Dosen</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-muted-foreground">Penelitian Aktif</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-muted-foreground">Pengabdian Aktif</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              * Statistik akan diperbarui setelah integrasi dengan data pengguna dan kegiatan
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}