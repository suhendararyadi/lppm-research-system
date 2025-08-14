'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/lib/api/client';
import { ResearchProposal } from '@/types';

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

export default function EditProposalPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [proposal, setProposal] = useState<ResearchProposal | null>(null);
  
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

  // Fetch proposal data
  useEffect(() => {
    const fetchProposal = async () => {
      if (!params.id) return;
      
      setIsLoadingData(true);
      try {
        const response = await apiClient.getResearchProposal(params.id as string);
        if (response.success && response.data) {
          const proposalData = response.data;
          setProposal(proposalData);
          
          // Map proposal data to form data
          setFormData({
            judulKegiatan: proposalData.title,
            kelompokBidang: getKelompokBidangFromType(proposalData.type),
            lokasiKegiatan: '', // Not available in API
            tahunKegiatan: new Date(proposalData.start_date).getFullYear().toString(),
            lamaKegiatan: calculateDuration(proposalData.start_date, proposalData.end_date),
            sumberDana: 'perguruan_tinggi', // Default value
            besaranDana: proposalData.budget.toString(),
            nomorSK: '', // Not available in API
            tanggalSK: proposalData.start_date,
            dokumen: null,
            anggotaDosen: [],
            anggotaMahasiswa: [],
            anggotaEksternal: [],
            keterangan: proposalData.abstract,
          });
        }
      } catch (error) {
        console.error('Error fetching proposal:', error);
        toast.error('Gagal memuat data proposal');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchProposal();
  }, [params.id]);

  const getKelompokBidangFromType = (type: string): string => {
    switch (type) {
      case 'applied':
        return 'Teknologi Informasi';
      case 'basic':
        return 'Ekonomi';
      case 'development':
        return 'Pertanian';
      case 'collaborative':
        return 'Sosial Humaniora';
      default:
        return 'Teknologi Informasi';
    }
  };

  const calculateDuration = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return `${diffMonths} bulan`;
  };

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

    if (!formData.besaranDana.trim()) {
      newErrors.besaranDana = 'Besaran dana wajib diisi';
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

    if (!proposal) {
      toast.error('Data proposal tidak ditemukan');
      return;
    }

    setIsLoading(true);
    
    try {
      // Map kelompok bidang to research type
      const getResearchType = (kelompokBidang: string): 'basic' | 'applied' | 'development' | 'collaborative' => {
        const techFields = ['Teknologi Informasi', 'Teknik Elektro', 'Teknik Mesin', 'Teknik Sipil'];
        const socialFields = ['Ekonomi', 'Manajemen', 'Akuntansi', 'Hukum', 'Pendidikan', 'Sosial Humaniora'];
        
        if (techFields.includes(kelompokBidang)) {
          return 'applied';
        } else if (socialFields.includes(kelompokBidang)) {
          return 'basic';
        } else {
          return 'development';
        }
      };

      // Prepare team members data
      const teamMembers = [
        ...formData.anggotaDosen.map(anggota => ({
          name: anggota.nama,
          institution: anggota.instansi,
          role: anggota.peran as 'leader' | 'member',
          type: 'lecturer' as const
        })),
        ...formData.anggotaMahasiswa.map(anggota => ({
          name: anggota.nama,
          institution: anggota.instansi,
          role: anggota.peran as 'leader' | 'member',
          type: 'student' as const
        })),
        ...formData.anggotaEksternal.map(anggota => ({
          name: anggota.nama,
          institution: anggota.instansi,
          role: anggota.peran as 'leader' | 'member',
          type: 'external' as const
        }))
      ];

      // Prepare proposal data
      const proposalData = {
        title: formData.judulKegiatan,
        type: getResearchType(formData.kelompokBidang),
        abstract: formData.keterangan || 'Tidak ada keterangan',
        keywords: [formData.kelompokBidang],
        budget: parseInt(formData.besaranDana) || 0,
        start_date: formData.tanggalSK,
        end_date: new Date(new Date(formData.tanggalSK).getTime() + (parseInt(formData.lamaKegiatan.replace(/\D/g, '')) || 12) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        team_members: teamMembers
      };
      
      const response = await apiClient.updateResearchProposal(proposal.id, proposalData);
      
      toast.success('Proposal penelitian berhasil diperbarui!');
      router.push('/dosen/proposal');
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Gagal memperbarui proposal. Silakan coba lagi.');
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

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data proposal...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!proposal) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center space-y-4">
          <div className="text-6xl">❌</div>
          <h1 className="text-2xl font-bold">Proposal Tidak Ditemukan</h1>
          <p className="text-muted-foreground">
            Proposal yang Anda cari tidak ditemukan atau telah dihapus.
          </p>
          <Link href="/dosen/proposal">
            <Button>Kembali ke Daftar Proposal</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dosen/proposal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Proposal Penelitian</h1>
            <p className="text-muted-foreground">
              Perbarui informasi proposal penelitian Anda
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

          {/* Keterangan */}
          <Card>
            <CardHeader>
              <CardTitle>Abstrak/Keterangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="keterangan">Abstrak Penelitian</Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => handleInputChange('keterangan', e.target.value)}
                  placeholder="Masukkan abstrak atau keterangan penelitian"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Anggota Kegiatan */}
          <div className="space-y-6">
            {renderAnggotaSection('Anggota Dosen', 'anggotaDosen', formData.anggotaDosen)}
            {renderAnggotaSection('Anggota Mahasiswa', 'anggotaMahasiswa', formData.anggotaMahasiswa)}
            {renderAnggotaSection('Anggota Eksternal', 'anggotaEksternal', formData.anggotaEksternal)}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/dosen/proposal">
              <Button type="button" variant="outline">
                Batal
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Memperbarui...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Perbarui Proposal
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}