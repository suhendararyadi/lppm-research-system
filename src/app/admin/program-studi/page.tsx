'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  Upload,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const JENJANG_COLORS = {
  'D3': 'bg-blue-100 text-blue-800',
  'S1': 'bg-green-100 text-green-800',
  'S2': 'bg-yellow-100 text-yellow-800',
  'S3': 'bg-purple-100 text-purple-800'
};

const AKREDITASI_COLORS = {
  'A': 'bg-green-100 text-green-800',
  'B': 'bg-yellow-100 text-yellow-800',
  'C': 'bg-orange-100 text-orange-800',
  'Unggul': 'bg-purple-100 text-purple-800',
  'Baik Sekali': 'bg-blue-100 text-blue-800',
  'Baik': 'bg-gray-100 text-gray-800'
};

export default function ProgramStudiPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState<string>('');
  const [fakultasFilter, setFakultasFilter] = useState<string>('');
  const [akreditasiFilter, setAkreditasiFilter] = useState<string>('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);

  // Check authorization
  useEffect(() => {
    if (user && !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
      router.push('/dashboard');
      toast.error('Anda tidak memiliki akses ke halaman ini');
    }
  }, [user, router]);

  // Load program studi
  useEffect(() => {
    loadProgramStudi();
  }, []);

  const loadProgramStudi = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProgramStudi();
      if (response.success && response.data) {
        setProgramStudi(response.data);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus program studi ini?')) {
      return;
    }

    try {
      const response = await apiClient.deleteProgramStudi(id);
      if (response.success) {
        toast.success('Program studi berhasil dihapus');
        loadProgramStudi();
      } else {
        toast.error('Gagal menghapus program studi');
      }
    } catch (error) {
      console.error('Error deleting program studi:', error);
      toast.error('Gagal menghapus program studi');
    }
  };

  // Filter data
  const filteredData = programStudi.filter(program => {
    const matchesSearch = 
      program.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.fakultas.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJenjang = !jenjangFilter || jenjangFilter === 'all' || program.jenjang === jenjangFilter;
    const matchesFakultas = !fakultasFilter || fakultasFilter === 'all' || program.fakultas === fakultasFilter;
    const matchesAkreditasi = !akreditasiFilter || akreditasiFilter === 'all' || program.akreditasi === akreditasiFilter;
    
    return matchesSearch && matchesJenjang && matchesFakultas && matchesAkreditasi;
  });

  // Get unique values for filters
  const uniqueFakultas = [...new Set(programStudi.map(p => p.fakultas))];
  const uniqueJenjang = [...new Set(programStudi.map(p => p.jenjang))];
  const uniqueAkreditasi = [...new Set(programStudi.map(p => p.akreditasi).filter(Boolean))];

  if (!user || !['super_admin', 'lppm_admin', 'admin'].includes(user.role)) {
    return null;
  }

  return (
    <DashboardLayout title="Manajemen Program Studi">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen Program Studi</h1>
            <p className="text-muted-foreground">
              Kelola data program studi di institusi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Link href="/admin/program-studi/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Program Studi
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Program Studi</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programStudi.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Program D3</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {programStudi.filter(p => p.jenjang === 'D3').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Program S1</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {programStudi.filter(p => p.jenjang === 'S1').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Program S2/S3</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {programStudi.filter(p => ['S2', 'S3'].includes(p.jenjang)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari program studi, kode, atau fakultas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={jenjangFilter} onValueChange={setJenjangFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Semua Jenjang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenjang</SelectItem>
                    {uniqueJenjang.map((jenjang) => (
                      <SelectItem key={jenjang} value={jenjang}>
                        {jenjang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={fakultasFilter} onValueChange={setFakultasFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Semua Fakultas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Fakultas</SelectItem>
                    {uniqueFakultas.map((fakultas) => (
                      <SelectItem key={fakultas} value={fakultas}>
                        {fakultas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={akreditasiFilter} onValueChange={setAkreditasiFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Semua Akreditasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Akreditasi</SelectItem>
                    {uniqueAkreditasi.map((akreditasi) => (
                      <SelectItem key={akreditasi} value={akreditasi || ''}>
                        {akreditasi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Memuat data...</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Program Studi</TableHead>
                    <TableHead>Fakultas</TableHead>
                    <TableHead>Jenjang</TableHead>
                    <TableHead>Akreditasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm || jenjangFilter || fakultasFilter || akreditasiFilter
                            ? 'Tidak ada data yang sesuai dengan filter'
                            : 'Belum ada data program studi'
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.kode}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{program.nama}</div>
                          </div>
                        </TableCell>
                        <TableCell>{program.fakultas}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={JENJANG_COLORS[program.jenjang as keyof typeof JENJANG_COLORS] || 'bg-gray-100 text-gray-800'}
                          >
                            {program.jenjang}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {program.akreditasi ? (
                            <Badge 
                              variant="secondary" 
                              className={AKREDITASI_COLORS[program.akreditasi as keyof typeof AKREDITASI_COLORS] || 'bg-gray-100 text-gray-800'}
                            >
                              {program.akreditasi}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={program.is_active ? 'default' : 'secondary'}
                            className={program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          >
                            {program.is_active ? 'Aktif' : 'Tidak Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {program.id && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/program-studi/${program.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Lihat Detail
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/program-studi/${program.id}/edit`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(program.id!)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}