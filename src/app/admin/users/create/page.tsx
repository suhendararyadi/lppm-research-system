'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import type { CreateUserForm, ProgramStudi, UserRole } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
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
  'Honorer',
  'Tidak Tetap'
];

const JABATAN_FUNGSIONAL_OPTIONS = [
  'Asisten Ahli',
  'Lektor',
  'Lektor Kepala',
  'Profesor',
  'Tenaga Pengajar'
];

const PENDIDIKAN_OPTIONS = [
  'S1',
  'S2',
  'S3',
  'Profesi'
];

export default function CreateUserPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'mahasiswa',
    program_studi: '',
    nidn: '',
    nuptk: '',
    nim: '',
    department: '',
    institution: '',
    phone: '',
    address: '',
    expertise: [],
    status_kepegawaian: '',
    jabatan_fungsional: '',
    pendidikan_terakhir: '',
    tahun_masuk: new Date().getFullYear()
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check authorization
  useEffect(() => {
    if (user && !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
      router.push('/dashboard');
      toast.error('Anda tidak memiliki akses ke halaman ini');
    }
  }, [user, router]);

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
        toast.error('Gagal memuat data program studi');
      }
    };
    loadProgramStudi();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.email) newErrors.email = 'Email wajib diisi';
    if (!formData.password) newErrors.password = 'Password wajib diisi';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    if (!formData.name) newErrors.name = 'Nama wajib diisi';
    if (!formData.program_studi) newErrors.program_studi = 'Program studi wajib dipilih';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password tidak sesuai';
    }

    // Role-specific validations
    if (['dosen', 'lppm_admin'].includes(formData.role)) {
      if (!formData.nidn && !formData.nuptk) {
        newErrors.nidn = 'NIDN atau NUPTK wajib diisi untuk dosen/admin';
      }
    }

    if (formData.role === 'mahasiswa') {
      if (!formData.nim) {
        newErrors.nim = 'NIM wajib diisi untuk mahasiswa';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon perbaiki kesalahan pada form');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createUser(formData);
      if (response.success) {
        toast.success('Pengguna berhasil dibuat');
        router.push('/admin/users');
      } else {
        toast.error(response.message || 'Gagal membuat pengguna');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Terjadi kesalahan saat membuat pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleExpertiseChange = (value: string) => {
    const expertiseArray = value.split(',').map(item => item.trim()).filter(item => item);
    handleInputChange('expertise', expertiseArray);
  };

  if (!user || !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
    return null;
  }

  return (
    <DashboardLayout title="Tambah Pengguna Baru">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tambah Pengguna Baru</h1>
          <p className="text-muted-foreground">
            Buat akun pengguna baru untuk sistem LPPM
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="nama@email.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Ulangi password"
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => handleInputChange('role', value)}
                >
                  <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="program_studi">Program Studi *</Label>
                <Select
                  value={formData.program_studi}
                  onValueChange={(value) => handleInputChange('program_studi', value)}
                >
                  <SelectTrigger className={errors.program_studi ? 'border-red-500' : ''}>
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
                {errors.program_studi && <p className="text-sm text-red-500">{errors.program_studi}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role-specific Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Spesifik Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {['dosen', 'lppm_admin'].includes(formData.role) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nidn">NIDN</Label>
                    <Input
                      id="nidn"
                      value={formData.nidn || ''}
                      onChange={(e) => handleInputChange('nidn', e.target.value)}
                      placeholder="Nomor Induk Dosen Nasional"
                      className={errors.nidn ? 'border-red-500' : ''}
                    />
                    {errors.nidn && <p className="text-sm text-red-500">{errors.nidn}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nuptk">NUPTK</Label>
                    <Input
                      id="nuptk"
                      value={formData.nuptk || ''}
                      onChange={(e) => handleInputChange('nuptk', e.target.value)}
                      placeholder="Nomor Unik Pendidik dan Tenaga Kependidikan"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status_kepegawaian">Status Kepegawaian</Label>
                    <Select
                      value={formData.status_kepegawaian || ''}
                      onValueChange={(value) => handleInputChange('status_kepegawaian', value)}
                    >
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
                    <Select
                      value={formData.jabatan_fungsional || ''}
                      onValueChange={(value) => handleInputChange('jabatan_fungsional', value)}
                    >
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
                </>
              )}

              {formData.role === 'mahasiswa' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nim">NIM *</Label>
                    <Input
                      id="nim"
                      value={formData.nim || ''}
                      onChange={(e) => handleInputChange('nim', e.target.value)}
                      placeholder="Nomor Induk Mahasiswa"
                      className={errors.nim ? 'border-red-500' : ''}
                    />
                    {errors.nim && <p className="text-sm text-red-500">{errors.nim}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tahun_masuk">Tahun Masuk</Label>
                    <Input
                      id="tahun_masuk"
                      type="number"
                      value={formData.tahun_masuk || ''}
                      onChange={(e) => handleInputChange('tahun_masuk', parseInt(e.target.value))}
                      placeholder="2024"
                      min="2000"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="pendidikan_terakhir">Pendidikan Terakhir</Label>
                <Select
                  value={formData.pendidikan_terakhir || ''}
                  onValueChange={(value) => handleInputChange('pendidikan_terakhir', value)}
                >
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
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Departemen</Label>
                <Input
                  id="department"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Nama departemen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institusi</Label>
                <Input
                  id="institution"
                  value={formData.institution || ''}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  placeholder="Nama institusi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Alamat lengkap"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expertise">Bidang Keahlian</Label>
              <Textarea
                id="expertise"
                value={formData.expertise?.join(', ') || ''}
                onChange={(e) => handleExpertiseChange(e.target.value)}
                placeholder="Pisahkan dengan koma (contoh: Machine Learning, Data Science, Web Development)"
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Pisahkan setiap bidang keahlian dengan koma
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/users">
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menyimpan...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Pengguna
              </>
            )}
          </Button>
        </div>
      </form>
      </div>
    </DashboardLayout>
  );
}