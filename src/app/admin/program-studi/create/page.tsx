'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { ProgramStudi } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const JENJANG_OPTIONS = [
  { value: 'D3', label: 'Diploma 3 (D3)' },
  { value: 'S1', label: 'Sarjana (S1)' },
  { value: 'S2', label: 'Magister (S2)' },
  { value: 'S3', label: 'Doktor (S3)' }
];

const AKREDITASI_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'Unggul', label: 'Unggul' },
  { value: 'Baik Sekali', label: 'Baik Sekali' },
  { value: 'Baik', label: 'Baik' }
];

interface CreateProgramStudiForm {
  kode: string;
  nama: string;
  fakultas: string;
  jenjang: string;
  akreditasi: string;
}

export default function CreateProgramStudiPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProgramStudiForm>({
    kode: '',
    nama: '',
    fakultas: '',
    jenjang: '',
    akreditasi: ''
  });
  const [errors, setErrors] = useState<Partial<CreateProgramStudiForm>>({});

  // Check authorization
  useEffect(() => {
    if (user && !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
      router.push('/dashboard');
      toast.error('Anda tidak memiliki akses ke halaman ini');
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateProgramStudiForm> = {};

    if (!formData.kode.trim()) {
      newErrors.kode = 'Kode program studi wajib diisi';
    } else if (formData.kode.length < 2) {
      newErrors.kode = 'Kode program studi minimal 2 karakter';
    }

    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama program studi wajib diisi';
    }

    if (!formData.fakultas.trim()) {
      newErrors.fakultas = 'Fakultas wajib diisi';
    }

    if (!formData.jenjang) {
      newErrors.jenjang = 'Jenjang wajib dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon periksa kembali form yang Anda isi');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.createProgramStudi({
        kode: formData.kode.trim().toUpperCase(),
        nama: formData.nama.trim(),
        fakultas: formData.fakultas.trim(),
        jenjang: formData.jenjang as 'D3' | 'S1' | 'S2' | 'S3',
        akreditasi: formData.akreditasi || undefined,
        is_active: true
      });

      if (response.success) {
        toast.success('Program studi berhasil dibuat');
        router.push('/admin/program-studi');
      } else {
        toast.error(response.message || 'Gagal membuat program studi');
      }
    } catch (error) {
      console.error('Error creating program studi:', error);
      toast.error('Gagal membuat program studi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProgramStudiForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!user || !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
    return null;
  }

  return (
    <DashboardLayout title="Tambah Program Studi">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/program-studi">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tambah Program Studi</h1>
            <p className="text-muted-foreground">
              Buat program studi baru di institusi
            </p>
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
                    value={formData.kode}
                    onChange={(e) => handleInputChange('kode', e.target.value)}
                    placeholder="Contoh: TI, SI, MI"
                    className={errors.kode ? 'border-red-500' : ''}
                  />
                  {errors.kode && (
                    <p className="text-sm text-red-500">{errors.kode}</p>
                  )}
                </div>

                {/* Jenjang */}
                <div className="space-y-2">
                  <Label htmlFor="jenjang">Jenjang *</Label>
                  <Select value={formData.jenjang} onValueChange={(value) => handleInputChange('jenjang', value)}>
                    <SelectTrigger className={errors.jenjang ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENJANG_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.jenjang && (
                    <p className="text-sm text-red-500">{errors.jenjang}</p>
                  )}
                </div>
              </div>

              {/* Nama Program Studi */}
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Program Studi *</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => handleInputChange('nama', e.target.value)}
                  placeholder="Contoh: Teknik Informatika"
                  className={errors.nama ? 'border-red-500' : ''}
                />
                {errors.nama && (
                  <p className="text-sm text-red-500">{errors.nama}</p>
                )}
              </div>

              {/* Fakultas */}
              <div className="space-y-2">
                <Label htmlFor="fakultas">Fakultas *</Label>
                <Input
                  id="fakultas"
                  value={formData.fakultas}
                  onChange={(e) => handleInputChange('fakultas', e.target.value)}
                  placeholder="Contoh: Fakultas Teknik"
                  className={errors.fakultas ? 'border-red-500' : ''}
                />
                {errors.fakultas && (
                  <p className="text-sm text-red-500">{errors.fakultas}</p>
                )}
              </div>

              {/* Akreditasi */}
              <div className="space-y-2">
                <Label htmlFor="akreditasi">Akreditasi</Label>
                <Select value={formData.akreditasi} onValueChange={(value) => handleInputChange('akreditasi', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akreditasi (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak ada</SelectItem>
                    {AKREDITASI_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Link href="/admin/program-studi">
                  <Button type="button" variant="outline">
                    Batal
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}