'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import type { User as UserType, ProgramStudi, UpdateUserForm } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'lppm_admin', label: 'Admin LPPM' },
  { value: 'admin', label: 'Admin' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'guest', label: 'Tamu' }
];

const STATUS_KEPEGAWAIAN_OPTIONS = [
  'PNS',
  'PPPK',
  'Kontrak',
  'Honorer'
];

const JABATAN_FUNGSIONAL_OPTIONS = [
  'Asisten Ahli',
  'Lektor',
  'Lektor Kepala',
  'Profesor'
];

const PENDIDIKAN_OPTIONS = [
  'S1',
  'S2',
  'S3'
];

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<UserType | null>(null);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [expertiseList, setExpertiseList] = useState<string[]>([]);

  const [formData, setFormData] = useState<UpdateUserForm>({
    name: '',
    email: '',
    role: 'mahasiswa',
    phone: '',
    address: '',
    department: '',
    institution: '',
    is_active: true,
    nidn: '',
    nuptk: '',
    nim: '',
    program_studi: '',
    status_kepegawaian: '',
    jabatan_fungsional: '',
    pendidikan_terakhir: '',
    tahun_masuk: '',
    expertise: []
  });

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
          const userData = response.data;
          setUser(userData);
          
          // Parse expertise
          let expertise: string[] = [];
          if (userData.expertise) {
            try {
              expertise = JSON.parse(userData.expertise);
            } catch {
              expertise = [];
            }
          }
          setExpertiseList(expertise);
          
          // Set form data
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || 'mahasiswa',
            phone: userData.phone || '',
            address: userData.address || '',
            department: userData.department || '',
            institution: userData.institution || '',
            is_active: userData.is_active ?? true,
            nidn: userData.nidn || '',
            nuptk: userData.nuptk || '',
            nim: userData.nim || '',
            program_studi: userData.program_studi || '',
            status_kepegawaian: userData.status_kepegawaian || '',
            jabatan_fungsional: userData.jabatan_fungsional || '',
            pendidikan_terakhir: userData.pendidikan_terakhir || '',
            tahun_masuk: userData.tahun_masuk?.toString() || '',
            expertise
          });
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

  const handleInputChange = (field: keyof UpdateUserForm, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addExpertise = () => {
    if (expertiseInput.trim() && !expertiseList.includes(expertiseInput.trim())) {
      const newList = [...expertiseList, expertiseInput.trim()];
      setExpertiseList(newList);
      setFormData(prev => ({ ...prev, expertise: newList }));
      setExpertiseInput('');
    }
  };

  const removeExpertise = (index: number) => {
    const newList = expertiseList.filter((_, i) => i !== index);
    setExpertiseList(newList);
    setFormData(prev => ({ ...prev, expertise: newList }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim() || !formData.email?.trim()) {
      toast.error('Nama dan email wajib diisi');
      return;
    }

    // Role-specific validation
    if (formData.role === 'mahasiswa' && !formData.nim?.trim()) {
      toast.error('NIM wajib diisi untuk mahasiswa');
      return;
    }

    if (formData.role && ['dosen', 'lppm_admin'].includes(formData.role) && !formData.nidn?.trim() && !formData.nuptk?.trim()) {
      toast.error('NIDN atau NUPTK wajib diisi untuk dosen/admin');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.updateUser(userId, {
        ...formData,
        // Ensure required fields are not undefined
        name: formData.name || '',
        email: formData.email || ''
      });
      if (response.success) {
        toast.success('Data pengguna berhasil diperbarui');
        router.push(`/admin/users/${userId}`);
      } else {
        toast.error(response.message || 'Gagal memperbarui data pengguna');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Terjadi kesalahan saat memperbarui data pengguna');
    } finally {
      setSaving(false);
    }
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
    <DashboardLayout title="Edit Pengguna">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/users/${userId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Pengguna</h1>
            <p className="text-muted-foreground">
              Ubah informasi pengguna {user.name}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Masukkan email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Masukkan nomor telepon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Masukkan alamat"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">Akun Aktif</Label>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Akademik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program_studi">Program Studi</Label>
                <Select value={formData.program_studi || ''} onValueChange={(value) => handleInputChange('program_studi', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih program studi" />
                  </SelectTrigger>
                  <SelectContent>
                    {programStudi.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.nama} ({program.jenjang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role === 'mahasiswa' && (
                <div className="space-y-2">
                  <Label htmlFor="nim">NIM *</Label>
                  <Input
                    id="nim"
                    value={formData.nim || ''}
                    onChange={(e) => handleInputChange('nim', e.target.value)}
                    placeholder="Masukkan NIM"
                  />
                </div>
              )}

              {formData.role && ['dosen', 'lppm_admin'].includes(formData.role) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nidn">NIDN</Label>
                    <Input
                      id="nidn"
                      value={formData.nidn || ''}
                      onChange={(e) => handleInputChange('nidn', e.target.value)}
                      placeholder="Masukkan NIDN"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nuptk">NUPTK</Label>
                    <Input
                      id="nuptk"
                      value={formData.nuptk || ''}
                      onChange={(e) => handleInputChange('nuptk', e.target.value)}
                      placeholder="Masukkan NUPTK"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="pendidikan_terakhir">Pendidikan Terakhir</Label>
                <Select value={formData.pendidikan_terakhir || ''} onValueChange={(value) => handleInputChange('pendidikan_terakhir', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pendidikan terakhir" />
                  </SelectTrigger>
                  <SelectContent>
                    {PENDIDIKAN_OPTIONS.map((pendidikan) => (
                      <SelectItem key={pendidikan} value={pendidikan}>
                        {pendidikan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tahun_masuk">Tahun Masuk</Label>
                <Input
                  id="tahun_masuk"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.tahun_masuk || ''}
                  onChange={(e) => handleInputChange('tahun_masuk', e.target.value)}
                  placeholder="Masukkan tahun masuk"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departemen</Label>
                <Input
                  id="department"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Masukkan departemen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institusi</Label>
                <Input
                  id="institution"
                  value={formData.institution || ''}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  placeholder="Masukkan institusi"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professional Information */}
        {formData.role && ['dosen', 'lppm_admin'].includes(formData.role) && (
          <Card>
            <CardHeader>
              <CardTitle>Informasi Kepegawaian</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status_kepegawaian">Status Kepegawaian</Label>
                <Select value={formData.status_kepegawaian || ''} onValueChange={(value) => handleInputChange('status_kepegawaian', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status kepegawaian" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_KEPEGAWAIAN_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jabatan_fungsional">Jabatan Fungsional</Label>
                <Select value={formData.jabatan_fungsional || ''} onValueChange={(value) => handleInputChange('jabatan_fungsional', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jabatan fungsional" />
                  </SelectTrigger>
                  <SelectContent>
                    {JABATAN_FUNGSIONAL_OPTIONS.map((jabatan) => (
                      <SelectItem key={jabatan} value={jabatan}>
                        {jabatan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expertise */}
        <Card>
          <CardHeader>
            <CardTitle>Bidang Keahlian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                placeholder="Tambah bidang keahlian"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addExpertise();
                  }
                }}
              />
              <Button type="button" onClick={addExpertise}>
                Tambah
              </Button>
            </div>
            
            {expertiseList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {expertiseList.map((skill, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {skill}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeExpertise(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link href={`/admin/users/${userId}`}>
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menyimpan...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
      </div>
    </DashboardLayout>
  );
}