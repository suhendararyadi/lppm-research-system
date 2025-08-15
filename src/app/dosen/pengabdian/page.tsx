'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin, Calendar, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import type { CommunityService } from '@/types';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-purple-100 text-purple-800'
};

const statusLabels = {
  draft: 'Draft',
  submitted: 'Diajukan',
  under_review: 'Sedang Direview',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai'
};

const typeLabels = {
  community_empowerment: 'Pemberdayaan Masyarakat',
  education_training: 'Pendidikan dan Pelatihan',
  health_service: 'Pelayanan Kesehatan',
  technology_transfer: 'Transfer Teknologi',
  social_service: 'Pelayanan Sosial',
  environmental: 'Lingkungan',
  economic_development: 'Pengembangan Ekonomi'
};

export default function PengabdianPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [services, setServices] = useState<CommunityService[]>([]);
  const [filteredServices, setFilteredServices] = useState<CommunityService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, statusFilter, typeFilter]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getCommunityServices();
      
      if (response.success && response.data) {
        // Extract data from paginated response
        const servicesData = response.data.data || response.data;
        // Filter services by current user
        const userServices = Array.isArray(servicesData) 
          ? servicesData.filter((service: CommunityService) => service.created_by === user?.id)
          : [];
        setServices(userServices);
      } else {
        console.error('Failed to fetch services:', response.error);
        toast.error('Gagal memuat data pengabdian');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Gagal memuat data pengabdian');
    } finally {
      setIsLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(service => service.type === typeFilter);
    }

    setFilteredServices(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengabdian ini?')) {
      return;
    }

    try {
      const response = await apiClient.deleteCommunityService(id);
      
      if (response.success) {
        toast.success('Pengabdian berhasil dihapus');
        fetchServices();
      } else {
        toast.error('Gagal menghapus pengabdian');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Gagal menghapus pengabdian');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pengabdian Masyarakat</h1>
            <p className="text-muted-foreground">Kelola proposal pengabdian masyarakat Anda</p>
          </div>
          <Link href="/dosen/pengabdian/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Buat Proposal Baru
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan judul, deskripsi, atau lokasi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Belum ada pengabdian</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Tidak ada pengabdian yang sesuai dengan filter'
                    : 'Anda belum membuat proposal pengabdian masyarakat'}
                </p>
                {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                  <Link href="/dosen/pengabdian/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Buat Proposal Pertama
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredServices.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{service.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge 
                          variant="secondary" 
                          className={statusColors[service.status as keyof typeof statusColors]}
                        >
                          {statusLabels[service.status as keyof typeof statusLabels]}
                        </Badge>
                        <Badge variant="outline">
                          {typeLabels[service.type as keyof typeof typeLabels]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dosen/pengabdian/${service.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {(service.status === 'draft' || service.status === 'rejected') && (
                        <Link href={`/dosen/pengabdian/${service.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {service.status === 'draft' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {service.description}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{service.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(service.budget)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(service.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}