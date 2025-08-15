'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Save, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import type { CommunityService, TeamMember, ServiceType } from '@/types';

interface FormData {
  title: string;
  description: string;
  type: string;
  location: string;
  target_audience: string;
  expected_participants: number;
  budget: number;
  funding_source: string;
  start_date: string;
  end_date: string;
  lecturerMembers: TeamMember[];
  studentMembers: TeamMember[];
  externalMembers: TeamMember[];
}

const serviceTypes = [
  { value: 'community_empowerment', label: 'Pemberdayaan Masyarakat' },
  { value: 'education_training', label: 'Pendidikan dan Pelatihan' },
  { value: 'health_service', label: 'Pelayanan Kesehatan' },
  { value: 'technology_transfer', label: 'Transfer Teknologi' },
  { value: 'social_service', label: 'Pelayanan Sosial' },
  { value: 'environmental', label: 'Lingkungan' },
  { value: 'disaster_relief', label: 'Bantuan Bencana' },
  { value: 'other', label: 'Lainnya' }
];

const fundingSources = [
  'Mandiri',
  'PT',
  'Kemendikbud',
  'Lainnya'
];

export default function EditPengabdianPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [service, setService] = useState<CommunityService | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: '',
    location: '',
    target_audience: '',
    expected_participants: 0,
    budget: 0,
    funding_source: '',
    start_date: '',
    end_date: '',
    lecturerMembers: [],
    studentMembers: [],
    externalMembers: []
  });

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
        const serviceData = response.data;
        setService(serviceData);
        
        // Populate form data
        setFormData({
          title: serviceData.title,
          description: serviceData.description,
          type: serviceData.type,
          location: serviceData.location,
          target_audience: serviceData.target_audience,
          expected_participants: serviceData.expected_participants,
          budget: serviceData.budget,
          funding_source: serviceData.funding_source,
          start_date: serviceData.start_date.split('T')[0],
          end_date: serviceData.end_date.split('T')[0],
          lecturerMembers: serviceData.team_members?.filter(m => m.type === 'lecturer') || [],
          studentMembers: serviceData.team_members?.filter(m => m.type === 'student') || [],
          externalMembers: serviceData.team_members?.filter(m => m.type === 'external') || []
        });
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

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addMember = (type: 'lecturerMembers' | 'studentMembers' | 'externalMembers') => {
    const newMember: TeamMember = {
      name: '',
      institution: '',
      role: 'member',
      type: type === 'lecturerMembers' ? 'lecturer' : type === 'studentMembers' ? 'student' : 'external'
    };
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], newMember]
    }));
  };

  const removeMember = (type: 'lecturerMembers' | 'studentMembers' | 'externalMembers', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateMember = (type: 'lecturerMembers' | 'studentMembers' | 'externalMembers', index: number, field: keyof TeamMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const getServiceType = (typeValue: string): ServiceType => {
    const validTypes: ServiceType[] = [
      'community_empowerment',
      'education_training', 
      'health_service',
      'technology_transfer',
      'social_service',
      'environmental',
      'disaster_relief',
      'other'
    ];
    
    return validTypes.includes(typeValue as ServiceType) ? typeValue as ServiceType : 'other';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Anda harus login terlebih dahulu');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Judul kegiatan harus diisi');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Deskripsi kegiatan harus diisi');
      return;
    }

    if (!formData.type) {
      toast.error('Jenis kegiatan harus dipilih');
      return;
    }

    if (!formData.location.trim()) {
      toast.error('Lokasi kegiatan harus diisi');
      return;
    }

    if (!formData.target_audience.trim()) {
      toast.error('Target audience harus diisi');
      return;
    }

    if (formData.expected_participants <= 0) {
      toast.error('Jumlah peserta yang diharapkan harus lebih dari 0');
      return;
    }

    if (formData.budget <= 0) {
      toast.error('Anggaran harus lebih dari 0');
      return;
    }

    if (!formData.funding_source.trim()) {
      toast.error('Sumber dana harus diisi');
      return;
    }

    if (!formData.start_date) {
      toast.error('Tanggal mulai harus diisi');
      return;
    }

    if (!formData.end_date) {
      toast.error('Tanggal selesai harus diisi');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error('Tanggal selesai harus setelah tanggal mulai');
      return;
    }

    try {
      setIsSaving(true);
      
      // Combine all team members
      const teamMembers: TeamMember[] = [
        ...formData.lecturerMembers.map(member => ({
          ...member,
          role: member.role === 'ketua' ? 'leader' : 'member'
        })),
        ...formData.studentMembers.map(member => ({
          ...member,
          role: member.role === 'ketua' ? 'leader' : 'member'
        })),
        ...formData.externalMembers.map(member => ({
          ...member,
          role: member.role === 'ketua' ? 'leader' : 'member'
        }))
      ];

      const updateData = {
        title: formData.title,
        description: formData.description,
        type: getServiceType(formData.type),
        location: formData.location,
        target_audience: formData.target_audience,
        expected_participants: formData.expected_participants,
        budget: formData.budget,
        funding_source: formData.funding_source,
        start_date: formData.start_date,
        end_date: formData.end_date,
        team_members: teamMembers
      };

      const response = await apiClient.updateCommunityService(params.id as string, updateData);
      
      if (response.success) {
        toast.success('Proposal pengabdian berhasil diperbarui');
        router.push(`/dosen/pengabdian/${params.id}`);
      } else {
        console.error('Failed to update service:', response.error);
        toast.error(response.error || 'Gagal memperbarui proposal pengabdian');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Gagal memperbarui proposal pengabdian');
    } finally {
      setIsSaving(false);
    }
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

  // Check if user can edit this service
  if (service.created_by !== user?.id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
            <p className="text-muted-foreground mb-4">Anda tidak memiliki izin untuk mengedit pengabdian ini.</p>
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

  // Check if service can be edited
  if (service.status !== 'draft' && service.status !== 'rejected') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Tidak Dapat Diedit</h2>
            <p className="text-muted-foreground mb-4">
              Pengabdian dengan status {service.status} tidak dapat diedit.
            </p>
            <Link href={`/dosen/pengabdian/${service.id}`}>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Detail Pengabdian
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/dosen/pengabdian/${service.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Edit Proposal Pengabdian</h1>
              <p className="text-muted-foreground">Perbarui informasi proposal pengabdian masyarakat</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Judul Kegiatan *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Masukkan judul kegiatan pengabdian"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Deskripsi Kegiatan *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Jelaskan deskripsi kegiatan pengabdian"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Jenis Kegiatan *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kegiatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Lokasi Kegiatan *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Masukkan lokasi kegiatan"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="target_audience">Target Audience *</Label>
                  <Input
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => handleInputChange('target_audience', e.target.value)}
                    placeholder="Masukkan target audience"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="expected_participants">Jumlah Peserta yang Diharapkan *</Label>
                  <Input
                    id="expected_participants"
                    type="number"
                    min="1"
                    value={formData.expected_participants}
                    onChange={(e) => handleInputChange('expected_participants', parseInt(e.target.value) || 0)}
                    placeholder="Masukkan jumlah peserta"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="start_date">Tanggal Mulai *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">Tanggal Selesai *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Keuangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Anggaran (Rp) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', parseInt(e.target.value) || 0)}
                    placeholder="Masukkan total anggaran"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="funding_source">Sumber Dana *</Label>
                  <Select value={formData.funding_source} onValueChange={(value) => handleInputChange('funding_source', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sumber dana" />
                    </SelectTrigger>
                    <SelectContent>
                      {fundingSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          {['lecturerMembers', 'studentMembers', 'externalMembers'].map((memberType) => {
            const members = formData[memberType as keyof typeof formData] as TeamMember[];
            const title = memberType === 'lecturerMembers' ? 'Anggota Dosen' : 
                         memberType === 'studentMembers' ? 'Anggota Mahasiswa' : 
                         'Anggota Eksternal';
            
            return (
              <Card key={memberType}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{title}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addMember(memberType as any)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah {title.split(' ')[1]}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Belum ada {title.toLowerCase()} yang ditambahkan
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {members.map((member, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                          <div>
                            <Label>Nama</Label>
                            <Input
                              value={member.name}
                              onChange={(e) => updateMember(memberType as any, index, 'name', e.target.value)}
                              placeholder="Nama lengkap"
                            />
                          </div>
                          <div>
                            <Label>Institusi</Label>
                            <Input
                              value={member.institution}
                              onChange={(e) => updateMember(memberType as any, index, 'institution', e.target.value)}
                              placeholder="Nama institusi"
                            />
                          </div>
                          <div>
                            <Label>Peran</Label>
                            <Select
                              value={member.role}
                              onValueChange={(value) => updateMember(memberType as any, index, 'role', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ketua">Ketua</SelectItem>
                                <SelectItem value="anggota">Anggota</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeMember(memberType as any, index)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href={`/dosen/pengabdian/${service.id}`}>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
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
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}