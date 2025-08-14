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
// import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import type { ProgramStudi } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const JENJANG_OPTIONS = [
  { value: 'D3', label: 'D3 (Diploma 3)' },
  { value: 'S1', label: 'S1 (Sarjana)' },
  { value: 'S2', label: 'S2 (Magister)' },
  { value: 'S3', label: 'S3 (Doktor)' }
];

const FAKULTAS_OPTIONS = [
  'Fakultas Teknik',
  'Fakultas Ekonomi dan Bisnis',
  'Fakultas Ilmu Sosial dan Politik',
  'Fakultas Hukum',
  'Fakultas Pertanian',
  'Fakultas Kedokteran',
  'Fakultas Keguruan dan Ilmu Pendidikan',
  'Fakultas Matematika dan Ilmu Pengetahuan Alam',
  'Fakultas Ilmu Budaya',
  'Fakultas Psikologi'
];

const AKREDITASI_OPTIONS = [
  { value: 'Belum terakreditasi', label: 'Belum terakreditasi' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'Unggul', label: 'Unggul' },
  { value: 'Baik Sekali', label: 'Baik Sekali' },
  { value: 'Baik', label: 'Baik' }
];

interface FormData {
  kode: string;
  nama: string;
  fakultas: string;
  jenjang: 'D3' | 'S1' | 'S2' | 'S3';
  akreditasi: string;
  is_active: boolean;
}

interface FormErrors {
  kode?: string;
  nama?: string;
  fakultas?: string;
  jenjang?: string;
  akreditasi?: string;
  is_active?: string;
}

export default function EditProgramStudiPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [programStudi, setProgramStudi] = useState<ProgramStudi | null>(null);
  const [formData, setFormData] = useState<FormData>({
    kode: '',
    nama: '',
    fakultas: '',
    jenjang: 'S1',
    akreditasi: '',
    is_active: true
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const programId = params?.id as string;

  // Check authorization
  useEffect(() => {
    if (user && !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
      router.push('/dashboard');
      toast.error('Anda tidak memiliki akses ke halaman ini');
    }
  }, [user, router]);

  // Load program studi data
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
          setFormData({
            kode: program.kode,
            nama: program.nama,
            fakultas: program.fakultas,
            jenjang: program.jenjang as 'D3' | 'S1' | 'S2' | 'S3',
            akreditasi: program.akreditasi || '',
            is_active: program.is_active
          });
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.kode.trim()) {
      newErrors.kode = 'Kode program studi harus diisi';
    } else if (formData.kode.length < 2) {
      newErrors.kode = 'Kode program studi minimal 2 karakter';
    }

    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama program studi harus diisi';
    } else if (formData.nama.length < 3) {
      newErrors.nama = 'Nama program studi minimal 3 karakter';
    }

    if (!formData.fakultas) {
      newErrors.fakultas = 'Fakultas harus dipilih';
    }

    if (!formData.jenjang) {
      newErrors.jenjang = 'Jenjang harus dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !programStudi) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.updateProgramStudi(programStudi.id, {
        kode: formData.kode.trim(),
        nama: formData.nama.trim(),
        fakultas: formData.fakultas,
        jenjang: formData.jenjang,
        akreditasi: formData.akreditasi || undefined,
        is_active: formData.is_active
      });

      if (response.success) {
        toast.success('Program studi berhasil diperbarui');
        router.push(`/admin/program-studi/${programStudi.id}`);
      } else {
        toast.error(response.error || 'Gagal memperbarui program studi');
      }
    } catch (error) {
      console.error('Error updating program studi:', error);
      toast.error('Gagal memperbarui program studi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!user || !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout title="Edit Program Studi">
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
    <DashboardLayout title={`Edit Program Studi - ${programStudi.nama}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/program-studi/${programStudi.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Program Studi</h1>
              <p className="text-muted-foreground">
                Perbarui informasi program studi
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Program Studi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Kode Program Studi */}
                <div className="space-y-2">
                  <Label htmlFor="kode">Kode Program Studi *</Label>
                  <Input
                    id="kode"
                    type="text"
                    value={formData.kode}
                    onChange={(e) => handleInputChange('kode', e.target.value)}
                    placeholder="Masukkan kode program studi"
                    className={errors.kode ? 'border-red-500' : ''}
                  />
                  {errors.kode && (
                    <p className="text-sm text-red-500">{errors.kode}</p>
                  )}
                </div>

                {/* Nama Program Studi */}
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Program Studi *</Label>
                  <Input
                    id="nama"
                    type="text"
                    value={formData.nama}
                    onChange={(e) => handleInputChange('nama', e.target.value)}
                    placeholder="Masukkan nama program studi"
                    className={errors.nama ? 'border-red-500' : ''}
                  />
                  {errors.nama && (
                    <p className="text-sm text-red-500">{errors.nama}</p>
                  )}
                </div>

                {/* Fakultas */}
                <div className="space-y-2">
                  <Label htmlFor="fakultas">Fakultas *</Label>
                  <Select
                    value={formData.fakultas}
                    onValueChange={(value) => handleInputChange('fakultas', value)}
                  >
                    <SelectTrigger className={errors.fakultas ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih fakultas" />
                    </SelectTrigger>
                    <SelectContent>
                      {FAKULTAS_OPTIONS.map((fakultas) => (
                        <SelectItem key={fakultas} value={fakultas}>
                          {fakultas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fakultas && (
                    <p className="text-sm text-red-500">{errors.fakultas}</p>
                  )}
                </div>

                {/* Jenjang */}
                <div className="space-y-2">
                  <Label htmlFor="jenjang">Jenjang *</Label>
                  <Select
                    value={formData.jenjang}
                    onValueChange={(value) => handleInputChange('jenjang', value as 'D3' | 'S1' | 'S2' | 'S3')}
                  >
                    <SelectTrigger className={errors.jenjang ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENJANG_OPTIONS.map((jenjang) => (
                        <SelectItem key={jenjang.value} value={jenjang.value}>
                          {jenjang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.jenjang && (
                    <p className="text-sm text-red-500">{errors.jenjang}</p>
                  )}
                </div>

                {/* Akreditasi */}
                <div className="space-y-2">
                  <Label htmlFor="akreditasi">Akreditasi</Label>
                  <Select
                    value={formData.akreditasi}
                    onValueChange={(value) => handleInputChange('akreditasi', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akreditasi (opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {AKREDITASI_OPTIONS.map((akreditasi) => (
                        <SelectItem key={akreditasi.value} value={akreditasi.value}>
                          {akreditasi.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Aktif */}
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status Program Studi</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="is_active" className="text-sm">
                      {formData.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-4 pt-6">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
                <Link href={`/admin/program-studi/${programStudi.id}`}>
                  <Button type="button" variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Batal
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}