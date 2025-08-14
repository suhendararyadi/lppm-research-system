'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  GraduationCap,
  Briefcase,
  Award,
  User,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import type { User as UserType, ProgramStudi } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  lppm_admin: 'Admin LPPM',
  admin: 'Admin',
  dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
  reviewer: 'Reviewer',
  guest: 'Tamu'
};

const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-800',
  lppm_admin: 'bg-blue-100 text-blue-800',
  admin: 'bg-orange-100 text-orange-800',
  dosen: 'bg-green-100 text-green-800',
  mahasiswa: 'bg-yellow-100 text-yellow-800',
  reviewer: 'bg-purple-100 text-purple-800',
  guest: 'bg-gray-100 text-gray-800'
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<UserType | null>(null);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const userId = params.id as string;

  // Check authorization
  useEffect(() => {
    if (currentUser && !['super_admin', 'lppm_admin'].includes(currentUser.role)) {
      router.push('/dashboard');
      toast.error('Anda tidak memiliki akses ke halaman ini');
    }
  }, [currentUser, router]);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getUser(userId);
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          toast.error(response.message || 'Gagal memuat data pengguna');
          router.push('/admin/users');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        toast.error('Terjadi kesalahan saat memuat data pengguna');
        router.push('/admin/users');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId, router]);

  // Load program studi
  useEffect(() => {
    const loadProgramStudi = async () => {
      try {
        const response = await apiClient.getProgramStudi();
        if (response.success && response.data) {
          setProgramStudi(response.data);
        }
      } catch (error) {
        console.error('Error loading program studi:', error);
      }
    };
    loadProgramStudi();
  }, []);

  const handleDelete = async () => {
    if (!user) return;
    
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${user.name}"?`)) {
      return;
    }

    try {
      setDeleting(true);
      const response = await apiClient.deleteUser(user.id);
      if (response.success) {
        toast.success('Pengguna berhasil dihapus');
        router.push('/admin/users');
      } else {
        toast.error(response.message || 'Gagal menghapus pengguna');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Terjadi kesalahan saat menghapus pengguna');
    } finally {
      setDeleting(false);
    }
  };

  const getProgramStudiName = (programStudiId?: string) => {
    if (!programStudiId) return '-';
    const program = programStudi.find(p => p.id === programStudiId);
    return program ? `${program.nama} (${program.jenjang})` : '-';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!currentUser || !['super_admin', 'lppm_admin', 'admin'].includes(currentUser.role)) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Memuat data pengguna...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Pengguna tidak ditemukan</h2>
          <p className="text-gray-600 mt-2">Pengguna yang Anda cari tidak ada atau telah dihapus.</p>
          <Link href="/admin/users">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Daftar Pengguna
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Detail Pengguna">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detail Pengguna</h1>
            <p className="text-muted-foreground">
              Informasi lengkap pengguna {user.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/users/${user.id}/edit`}>
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
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menghapus...
              </div>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.foto_profil} alt={user.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <Badge className={ROLE_COLORS[user.role]}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              <Separator />

              <div className="w-full space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="break-all">{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                
                {user.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-left">{user.address}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Bergabung {new Date(user.created_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                
                {user.last_login && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Login terakhir {new Date(user.last_login).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Informasi Akademik
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Program Studi</label>
                  <p className="text-sm">{getProgramStudiName(user.program_studi)}</p>
                </div>
                
                {user.role === 'mahasiswa' && user.nim && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">NIM</label>
                    <p className="text-sm">{user.nim}</p>
                  </div>
                )}
                
                {['dosen', 'lppm_admin'].includes(user.role) && (
                  <>
                    {user.nidn && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">NIDN</label>
                        <p className="text-sm">{user.nidn}</p>
                      </div>
                    )}
                    
                    {user.nuptk && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">NUPTK</label>
                        <p className="text-sm">{user.nuptk}</p>
                      </div>
                    )}
                  </>
                )}
                
                {user.pendidikan_terakhir && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Pendidikan Terakhir</label>
                    <p className="text-sm">{user.pendidikan_terakhir}</p>
                  </div>
                )}
                
                {user.tahun_masuk && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tahun Masuk</label>
                    <p className="text-sm">{user.tahun_masuk}</p>
                  </div>
                )}
                
                {user.department && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Departemen</label>
                    <p className="text-sm">{user.department}</p>
                  </div>
                )}
                
                {user.institution && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Institusi</label>
                    <p className="text-sm">{user.institution}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          {['dosen', 'lppm_admin'].includes(user.role) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informasi Kepegawaian
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {user.status_kepegawaian && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status Kepegawaian</label>
                      <p className="text-sm">{user.status_kepegawaian}</p>
                    </div>
                  )}
                  
                  {user.jabatan_fungsional && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Jabatan Fungsional</label>
                      <p className="text-sm">{user.jabatan_fungsional}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expertise */}
          {user.expertise && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Bidang Keahlian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(user.expertise).map((skill: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informasi Akun
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status Email</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.email_verified ? 'default' : 'destructive'}>
                      {user.email_verified ? 'Terverifikasi' : 'Belum Terverifikasi'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status Akun</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dibuat</label>
                  <p className="text-sm">
                    {new Date(user.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Terakhir Diperbarui</label>
                  <p className="text-sm">
                    {new Date(user.updated_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}