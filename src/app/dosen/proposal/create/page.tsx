'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/auth';

// Options untuk dropdown
const KELOMPOK_BIDANG_OPTIONS = [
  'Teknologi Informasi',
  'Teknik Elektro',
  'Teknik Mesin',
  'Teknik Sipil',
  'Ekonomi',
  'Manajemen',
  'Akuntansi',
  'Hukum',
  'Pendidikan',
  'Kesehatan',
  'Pertanian',
  'Sosial Humaniora',
];

const SUMBER_DANA_OPTIONS = [
  { value: 'mandiri', label: 'Mandiri' },
  { value: 'perguruan_tinggi', label: 'Perguruan Tinggi' },
  { value: 'kemenag', label: 'Kemenag' },
  { value: 'lainnya', label: 'Lainnya' },
];

const PERAN_OPTIONS = [
  { value: 'ketua', label: 'Ketua' },
  { value: 'anggota', label: 'Anggota' },
];

interface AnggotaKegiatan {
  id: string;
  nama: string;
  instansi: string;
  peran: string;
}

interface FormData {
  judulKegiatan: string;
  kelompokBidang: string;
  lokasiKegiatan: string;
  tahunKegiatan: string;
  lamaKegiatan: string;
  sumberDana: string;
  besaranDana: string;
  nomorSK: string;
  tanggalSK: string;
  dokumen: File | null;
  anggotaDosen: AnggotaKegiatan[];
  anggotaMahasiswa: AnggotaKegiatan[];
  anggotaEksternal: AnggotaKegiatan[];
  keterangan: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function CreateProposalPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<FormData>({
    judulKegiatan: '',
    kelompokBidang: '',
    lokasiKegiatan: '',
    tahunKegiatan: new Date().getFullYear().toString(),
    lamaKegiatan: '',
    sumberDana: '',
    besaranDana: '',
    nomorSK: '',
    tanggalSK: '',
    dokumen: null,
    anggotaDosen: [],
    anggotaMahasiswa: [],
    anggotaEksternal: [],
    keterangan: '',
  });

  const handleInputChange = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addAnggota = (type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal') => {
    const newAnggota: AnggotaKegiatan = {
      id: Date.now().toString(),
      nama: '',
      instansi: '',
      peran: 'anggota',
    };
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], newAnggota],
    }));
  };

  const removeAnggota = (type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal', id: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(anggota => anggota.id !== id),
    }));
  };

  const updateAnggota = (
    type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal',
    id: string,
    field: keyof AnggotaKegiatan,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(anggota =>
        anggota.id === id ? { ...anggota, [field]: value } : anggota
      ),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.judulKegiatan.trim()) {
      newErrors.judulKegiatan = 'Judul kegiatan wajib diisi';
    }

    if (!formData.kelompokBidang) {
      newErrors.kelompokBidang = 'Kelompok bidang wajib dipilih';
    }

    if (!formData.lokasiKegiatan.trim()) {
      newErrors.lokasiKegiatan = 'Lokasi kegiatan wajib diisi';
    }

    if (!formData.tahunKegiatan) {
      newErrors.tahunKegiatan = 'Tahun kegiatan wajib diisi';
    }

    if (!formData.lamaKegiatan.trim()) {
      newErrors.lamaKegiatan = 'Lama kegiatan wajib diisi';
    }

    if (!formData.sumberDana) {
      newErrors.sumberDana = 'Sumber dana wajib dipilih';
    }

    if (!formData.besaranDana.trim()) {
      newErrors.besaranDana = 'Besaran dana wajib diisi';
    }

    if (!formData.nomorSK.trim()) {
      newErrors.nomorSK = 'Nomor SK penugasan wajib diisi';
    }

    if (!formData.tanggalSK) {
      newErrors.tanggalSK = 'Tanggal SK penugasan wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Implement API call to create proposal
      console.log('Form data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Proposal penelitian berhasil dibuat!');
      router.push('/dosen/proposal');
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Gagal membuat proposal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnggotaSection = (
    title: string,
    type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal',
    anggotaList: AnggotaKegiatan[]
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addAnggota(type)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah {title.split(' ')[1]}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {anggotaList.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Belum ada {title.toLowerCase()} yang ditambahkan
          </p>
        ) : (
          anggotaList.map((anggota) => (
            <div key={anggota.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label htmlFor={`${type}-nama-${anggota.id}`}>Nama</Label>
                <Input
                  id={`${type}-nama-${anggota.id}`}
                  value={anggota.nama}
                  onChange={(e) => updateAnggota(type, anggota.id, 'nama', e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor={`${type}-instansi-${anggota.id}`}>Instansi</Label>
                <Input
                  id={`${type}-instansi-${anggota.id}`}
                  value={anggota.instansi}
                  onChange={(e) => updateAnggota(type, anggota.id, 'instansi', e.target.value)}
                  placeholder="Nama instansi"
                />
              </div>
              <div>
                <Label htmlFor={`${type}-peran-${anggota.id}`}>Peran</Label>
                <Select
                  value={anggota.peran}
                  onValueChange={(value) => updateAnggota(type, anggota.id, 'peran', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERAN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeAnggota(type, anggota.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  // Check authorization
  if (!user || !['lecturer', 'admin'].includes(user.role)) {
    return (
      <DashboardLayout>
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dosen">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Buat Proposal Penelitian</h1>
            <p className="text-muted-foreground">
              Lengkapi form di bawah untuk membuat proposal penelitian baru
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Dasar */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="judulKegiatan">Judul Kegiatan *</Label>
                  <Input
                    id="judulKegiatan"
                    value={formData.judulKegiatan}
                    onChange={(e) => handleInputChange('judulKegiatan', e.target.value)}
                    placeholder="Masukkan judul kegiatan penelitian"
                    className={errors.judulKegiatan ? 'border-red-500' : ''}
                  />
                  {errors.judulKegiatan && (
                    <p className="text-sm text-red-500 mt-1">{errors.judulKegiatan}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="kelompokBidang">Kelompok Bidang *</Label>
                  <Select
                    value={formData.kelompokBidang}
                    onValueChange={(value) => handleInputChange('kelompokBidang', value)}
                  >
                    <SelectTrigger className={errors.kelompokBidang ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih kelompok bidang" />
                    </SelectTrigger>
                    <SelectContent>
                      {KELOMPOK_BIDANG_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.kelompokBidang && (
                    <p className="text-sm text-red-500 mt-1">{errors.kelompokBidang}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="lokasiKegiatan">Lokasi Kegiatan *</Label>
                  <Input
                    id="lokasiKegiatan"
                    value={formData.lokasiKegiatan}
                    onChange={(e) => handleInputChange('lokasiKegiatan', e.target.value)}
                    placeholder="Masukkan lokasi kegiatan"
                    className={errors.lokasiKegiatan ? 'border-red-500' : ''}
                  />
                  {errors.lokasiKegiatan && (
                    <p className="text-sm text-red-500 mt-1">{errors.lokasiKegiatan}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="tahunKegiatan">Tahun Kegiatan *</Label>
                  <Input
                    id="tahunKegiatan"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.tahunKegiatan}
                    onChange={(e) => handleInputChange('tahunKegiatan', e.target.value)}
                    className={errors.tahunKegiatan ? 'border-red-500' : ''}
                  />
                  {errors.tahunKegiatan && (
                    <p className="text-sm text-red-500 mt-1">{errors.tahunKegiatan}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="lamaKegiatan">Lama Kegiatan *</Label>
                  <Input
                    id="lamaKegiatan"
                    value={formData.lamaKegiatan}
                    onChange={(e) => handleInputChange('lamaKegiatan', e.target.value)}
                    placeholder="Contoh: 12 bulan"
                    className={errors.lamaKegiatan ? 'border-red-500' : ''}
                  />
                  {errors.lamaKegiatan && (
                    <p className="text-sm text-red-500 mt-1">{errors.lamaKegiatan}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informasi Pendanaan */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pendanaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sumberDana">Sumber Dana *</Label>
                  <Select
                    value={formData.sumberDana}
                    onValueChange={(value) => handleInputChange('sumberDana', value)}
                  >
                    <SelectTrigger className={errors.sumberDana ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih sumber dana" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUMBER_DANA_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sumberDana && (
                    <p className="text-sm text-red-500 mt-1">{errors.sumberDana}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="besaranDana">Besaran Dana (Rp) *</Label>
                  <Input
                    id="besaranDana"
                    type="number"
                    min="0"
                    value={formData.besaranDana}
                    onChange={(e) => handleInputChange('besaranDana', e.target.value)}
                    placeholder="Masukkan besaran dana"
                    className={errors.besaranDana ? 'border-red-500' : ''}
                  />
                  {errors.besaranDana && (
                    <p className="text-sm text-red-500 mt-1">{errors.besaranDana}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informasi SK Penugasan */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi SK Penugasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomorSK">Nomor SK Penugasan *</Label>
                  <Input
                    id="nomorSK"
                    value={formData.nomorSK}
                    onChange={(e) => handleInputChange('nomorSK', e.target.value)}
                    placeholder="Masukkan nomor SK penugasan"
                    className={errors.nomorSK ? 'border-red-500' : ''}
                  />
                  {errors.nomorSK && (
                    <p className="text-sm text-red-500 mt-1">{errors.nomorSK}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="tanggalSK">Tanggal SK Penugasan *</Label>
                  <Input
                    id="tanggalSK"
                    type="date"
                    value={formData.tanggalSK}
                    onChange={(e) => handleInputChange('tanggalSK', e.target.value)}
                    className={errors.tanggalSK ? 'border-red-500' : ''}
                  />
                  {errors.tanggalSK && (
                    <p className="text-sm text-red-500 mt-1">{errors.tanggalSK}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Dokumen */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Dokumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="dokumen">Dokumen Pendukung</Label>
                <div className="mt-2">
                  <Input
                    id="dokumen"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleInputChange('dokumen', e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Format yang didukung: PDF, DOC, DOCX (Maksimal 10MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anggota Kegiatan */}
          <div className="space-y-6">
            {renderAnggotaSection('Anggota Dosen', 'anggotaDosen', formData.anggotaDosen)}
            {renderAnggotaSection('Anggota Mahasiswa', 'anggotaMahasiswa', formData.anggotaMahasiswa)}
            {renderAnggotaSection('Anggota Eksternal', 'anggotaEksternal', formData.anggotaEksternal)}
          </div>

          {/* Keterangan */}
          <Card>
            <CardHeader>
              <CardTitle>Keterangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="keterangan">Keterangan Tambahan</Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => handleInputChange('keterangan', e.target.value)}
                  placeholder="Masukkan keterangan tambahan jika diperlukan"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/dosen">
              <Button type="button" variant="outline">
                Batal
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Proposal
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}