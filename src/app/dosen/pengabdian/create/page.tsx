'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

interface AnggotaKegiatan {
  nama: string;
  instansi: string;
  peran: 'Ketua' | 'Anggota';
}

interface FormData {
  judulKegiatan: string;
  kelompokBidang: string;
  lokasiKegiatan: string;
  tahunKegiatan: string;
  lamaKegiatan: string;
  sumberDana: 'Mandiri' | 'PT' | 'Kemenag' | 'Lainnya';
  besaranDana: string;
  nomorSK: string;
  tanggalSK: string;
  uploadDokumen: File | null;
  anggotaDosen: AnggotaKegiatan[];
  anggotaMahasiswa: AnggotaKegiatan[];
  anggotaEksternal: AnggotaKegiatan[];
  keterangan: string;
}

const initialFormData: FormData = {
  judulKegiatan: '',
  kelompokBidang: '',
  lokasiKegiatan: '',
  tahunKegiatan: new Date().getFullYear().toString(),
  lamaKegiatan: '',
  sumberDana: 'Mandiri',
  besaranDana: '',
  nomorSK: '',
  tanggalSK: '',
  uploadDokumen: null,
  anggotaDosen: [{ nama: '', instansi: '', peran: 'Ketua' }],
  anggotaMahasiswa: [{ nama: '', instansi: '', peran: 'Ketua' }],
  anggotaEksternal: [{ nama: '', instansi: '', peran: 'Ketua' }],
  keterangan: ''
};

export default function CreatePengabdianPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnggotaChange = (
    type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal',
    index: number,
    field: keyof AnggotaKegiatan,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((anggota, i) => 
        i === index ? { ...anggota, [field]: value } : anggota
      )
    }));
  };

  const addAnggota = (type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { nama: '', instansi: '', peran: 'Anggota' }]
    }));
  };

  const removeAnggota = (type: 'anggotaDosen' | 'anggotaMahasiswa' | 'anggotaEksternal', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, uploadDokumen: file }));
  };

  const getServiceType = (kelompokBidang: string): 'community_empowerment' | 'education_training' | 'health_service' | 'environmental' | 'technology_transfer' | 'social_service' | 'disaster_relief' | 'other' => {
    switch (kelompokBidang) {
      case 'Pendidikan':
        return 'education_training';
      case 'Kesehatan':
        return 'health_service';
      case 'Teknologi':
        return 'technology_transfer';
      case 'Lingkungan':
        return 'environmental';
      case 'Sosial':
        return 'social_service';
      case 'Ekonomi':
        return 'community_empowerment';
      default:
        return 'other';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.judulKegiatan || !formData.kelompokBidang || !formData.lokasiKegiatan) {
        toast.error('Mohon lengkapi semua field yang wajib diisi');
        return;
      }

      // Prepare team members data
      const teamMembers = [
        ...formData.anggotaDosen.filter(a => a.nama).map(anggota => ({
          name: anggota.nama,
          institution: anggota.instansi,
          role: anggota.peran.toLowerCase() === 'ketua' ? 'leader' : 'member',
          type: 'lecturer' as const
        })),
        ...formData.anggotaMahasiswa.filter(a => a.nama).map(anggota => ({
          name: anggota.nama,
          institution: anggota.instansi,
          role: anggota.peran.toLowerCase() === 'ketua' ? 'leader' : 'member',
          type: 'student' as const
        })),
        ...formData.anggotaEksternal.filter(a => a.nama).map(anggota => ({
          name: anggota.nama,
          institution: anggota.instansi,
          role: anggota.peran.toLowerCase() === 'ketua' ? 'leader' : 'member',
          type: 'external' as const
        }))
      ];

      // Prepare service data
      const serviceData = {
        title: formData.judulKegiatan,
        description: formData.keterangan || 'Tidak ada keterangan',
        type: getServiceType(formData.kelompokBidang),
        target_audience: 'Masyarakat umum',
        location: formData.lokasiKegiatan,
        budget: parseInt(formData.besaranDana) || 0,
        duration: parseInt(formData.lamaKegiatan.replace(/\D/g, '')) || 3,
        team_members: teamMembers,
        objectives: formData.judulKegiatan,
        methodology: 'Metode pengabdian masyarakat',
        expected_impact: 'Dampak positif bagi masyarakat',
        funding_source: formData.sumberDana,
        sk_number: formData.nomorSK,
        sk_date: formData.tanggalSK,
        document_url: formData.uploadDokumen ? 'uploaded_document.pdf' : null
      };
      
      const response = await apiClient.createCommunityService(serviceData);
      
      if (response.success) {
        toast.success('Proposal pengabdian berhasil dibuat!');
        router.push('/dosen/pengabdian');
      } else {
        console.error('API Error:', response);
        toast.error(`Gagal membuat proposal: ${response.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      console.error('Error creating service proposal:', error);
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
        <CardTitle className="flex items-center justify-between">
          {title}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addAnggota(type)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {anggotaList.map((anggota, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor={`${type}-nama-${index}`}>Nama</Label>
              <Input
                id={`${type}-nama-${index}`}
                value={anggota.nama}
                onChange={(e) => handleAnggotaChange(type, index, 'nama', e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <Label htmlFor={`${type}-instansi-${index}`}>Instansi</Label>
              <Input
                id={`${type}-instansi-${index}`}
                value={anggota.instansi}
                onChange={(e) => handleAnggotaChange(type, index, 'instansi', e.target.value)}
                placeholder="Nama instansi"
              />
            </div>
            <div>
              <Label htmlFor={`${type}-peran-${index}`}>Peran</Label>
              <Select
                value={anggota.peran}
                onValueChange={(value) => handleAnggotaChange(type, index, 'peran', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ketua">Ketua</SelectItem>
                  <SelectItem value="Anggota">Anggota</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {anggotaList.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeAnggota(type, index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Buat Proposal Pengabdian Masyarakat</h1>
          <p className="text-muted-foreground mt-2">
            Lengkapi formulir di bawah ini untuk mengajukan proposal pengabdian masyarakat
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Dasar */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="judulKegiatan">Judul Kegiatan *</Label>
                  <Input
                    id="judulKegiatan"
                    value={formData.judulKegiatan}
                    onChange={(e) => handleInputChange('judulKegiatan', e.target.value)}
                    placeholder="Masukkan judul kegiatan pengabdian"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="kelompokBidang">Kelompok Bidang *</Label>
                  <Select
                    value={formData.kelompokBidang}
                    onValueChange={(value) => handleInputChange('kelompokBidang', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelompok bidang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendidikan">Pendidikan</SelectItem>
                      <SelectItem value="Kesehatan">Kesehatan</SelectItem>
                      <SelectItem value="Teknologi">Teknologi</SelectItem>
                      <SelectItem value="Lingkungan">Lingkungan</SelectItem>
                      <SelectItem value="Sosial">Sosial</SelectItem>
                      <SelectItem value="Ekonomi">Ekonomi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lokasiKegiatan">Lokasi Kegiatan *</Label>
                  <Input
                    id="lokasiKegiatan"
                    value={formData.lokasiKegiatan}
                    onChange={(e) => handleInputChange('lokasiKegiatan', e.target.value)}
                    placeholder="Masukkan lokasi kegiatan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tahunKegiatan">Tahun Kegiatan</Label>
                  <Input
                    id="tahunKegiatan"
                    type="number"
                    value={formData.tahunKegiatan}
                    onChange={(e) => handleInputChange('tahunKegiatan', e.target.value)}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label htmlFor="lamaKegiatan">Lama Kegiatan</Label>
                  <Input
                    id="lamaKegiatan"
                    value={formData.lamaKegiatan}
                    onChange={(e) => handleInputChange('lamaKegiatan', e.target.value)}
                    placeholder="Contoh: 3 bulan"
                  />
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
                  <Label htmlFor="sumberDana">Sumber Dana</Label>
                  <Select
                    value={formData.sumberDana}
                    onValueChange={(value) => handleInputChange('sumberDana', value as FormData['sumberDana'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mandiri">Mandiri</SelectItem>
                      <SelectItem value="PT">Perguruan Tinggi</SelectItem>
                      <SelectItem value="Kemenag">Kemenag</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="besaranDana">Besaran Dana</Label>
                  <Input
                    id="besaranDana"
                    type="number"
                    value={formData.besaranDana}
                    onChange={(e) => handleInputChange('besaranDana', e.target.value)}
                    placeholder="Masukkan besaran dana"
                  />
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
                  <Label htmlFor="nomorSK">Nomor SK Penugasan</Label>
                  <Input
                    id="nomorSK"
                    value={formData.nomorSK}
                    onChange={(e) => handleInputChange('nomorSK', e.target.value)}
                    placeholder="Masukkan nomor SK"
                  />
                </div>
                <div>
                  <Label htmlFor="tanggalSK">Tanggal SK Penugasan</Label>
                  <Input
                    id="tanggalSK"
                    type="date"
                    value={formData.tanggalSK}
                    onChange={(e) => handleInputChange('tanggalSK', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="uploadDokumen">Upload Dokumen</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="uploadDokumen"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                  />
                  <Upload className="h-4 w-4" />
                </div>
                {formData.uploadDokumen && (
                  <p className="text-sm text-muted-foreground mt-1">
                    File terpilih: {formData.uploadDokumen.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Anggota Kegiatan */}
          {renderAnggotaSection('Anggota Kegiatan Dosen', 'anggotaDosen', formData.anggotaDosen)}
          {renderAnggotaSection('Anggota Kegiatan Mahasiswa', 'anggotaMahasiswa', formData.anggotaMahasiswa)}
          {renderAnggotaSection('Anggota Kegiatan Eksternal', 'anggotaEksternal', formData.anggotaEksternal)}

          {/* Keterangan */}
          <Card>
            <CardHeader>
              <CardTitle>Keterangan</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.keterangan}
                onChange={(e) => handleInputChange('keterangan', e.target.value)}
                placeholder="Masukkan keterangan tambahan (opsional)"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Proposal'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}