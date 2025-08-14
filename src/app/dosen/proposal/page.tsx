'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Plus, Eye, Edit, Trash2, Calendar, User, DollarSign, Send } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import apiClient from '@/lib/api/client';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { toast } from 'sonner';

// Extended interface for proposal display with creator info
interface ProposalDisplay {
  id: number | string;
  title: string;
  type: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
  budget: number | null;
  created_at: string;
  creator_name?: string;
  creator_department?: string;
}



const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-purple-100 text-purple-800',
};

const statusLabels = {
  draft: 'Draft',
  submitted: 'Diajukan',
  under_review: 'Sedang Direview',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
};

function DosenProposalPageContent() {
  const { user, setUser } = useAuthStore();
  const [proposals, setProposals] = useState<ProposalDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, proposalId: '', proposalTitle: '' });
  const [submitModal, setSubmitModal] = useState({ isOpen: false, proposalId: '', proposalTitle: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Check authorization
  if (!user || !['dosen', 'lecturer', 'admin'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch proposals from API
  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getResearchProposals(1, 50);
        
        if (response.success && response.data) {
          // API mengembalikan data langsung dalam response.data, bukan response.data.data
          const proposalsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
          setProposals(proposalsData);
        } else {
          alert(`Gagal memuat data proposal: ${response.error || 'Terjadi kesalahan'}`);
        }
      } catch (error) {
        alert('Terjadi kesalahan saat memuat data proposal');
      } finally {
        setLoading(false);
      }
    };

    if (user && ['dosen', 'lecturer', 'admin'].includes(user.role)) {
      fetchProposals();
    }
  }, [user]);

  // Handle delete proposal
  const handleDelete = (id: string | number, title: string) => {
    setDeleteModal({ isOpen: true, proposalId: id.toString(), proposalTitle: title });
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await apiClient.deleteResearchProposal(deleteModal.proposalId);
      if (response.success) {
        setProposals(proposals.filter(p => p.id.toString() !== deleteModal.proposalId));
        toast.success('Proposal berhasil dihapus');
      } else {
        toast.error('Gagal menghapus proposal: ' + response.message);
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Terjadi kesalahan saat menghapus proposal');
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, proposalId: '', proposalTitle: '' });
    }
  };

  const handleSubmit = (proposalId: number | string, title: string) => {
    setSubmitModal({ isOpen: true, proposalId: proposalId.toString(), proposalTitle: title });
  };

  const confirmSubmit = async () => {
    try {
      setIsSubmitting(true);
      const response = await apiClient.submitResearchProposal(submitModal.proposalId);
      if (response.success) {
        // Refresh proposals after submission
        const refreshResponse = await apiClient.getResearchProposals(1, 50);
        if (refreshResponse.success && refreshResponse.data) {
          const proposalsData = Array.isArray(refreshResponse.data) ? refreshResponse.data : (refreshResponse.data.data || []);
          setProposals(proposalsData);
        }
        toast.success('Proposal berhasil diajukan!');
      } else {
        toast.error('Gagal mengajukan proposal: ' + (response.error || 'Terjadi kesalahan'));
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast.error('Gagal mengajukan proposal. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
      setSubmitModal({ isOpen: false, proposalId: '', proposalTitle: '' });
    }
  };

  // Filter and sort proposals
  console.log('Total proposals:', proposals.length);
  const filteredProposals = proposals
    .filter(proposal => {
      const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           proposal.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'budget':
          return (b.budget || 0) - (a.budget || 0);
        default:
          return 0;
      }
    });
  
  console.log('Filtered proposals:', filteredProposals.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat proposal penelitian...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proposal Penelitian Saya</h1>
            <p className="text-gray-600 mt-2">
              Kelola dan pantau semua proposal penelitian Anda
            </p>
          </div>
          <Link href="/dosen/proposal/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Buat Proposal Baru
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Proposal</p>
                  <p className="text-2xl font-bold text-gray-900">{proposals.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disetujui</p>
                  <p className="text-2xl font-bold text-green-600">
                    {proposals.filter(p => p.status === 'approved').length}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 h-8 w-8 rounded-full flex items-center justify-center">
                  ✓
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sedang Review</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {proposals.filter(p => p.status === 'under_review').length}
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 h-8 w-8 rounded-full flex items-center justify-center">
                  ⏳
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Dana</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(proposals.reduce((sum, p) => sum + (p.budget || 0), 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari berdasarkan judul atau bidang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Diajukan</SelectItem>
              <SelectItem value="under_review">Sedang Review</SelectItem>
              <SelectItem value="approved">Disetujui</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Urutkan berdasarkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Tanggal Dibuat</SelectItem>
                <SelectItem value="title">Judul</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="budget">Dana</SelectItem>
              </SelectContent>
            </Select>
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'Tidak ada proposal yang sesuai' : 'Belum ada proposal'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Mulai dengan membuat proposal penelitian pertama Anda'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link href="/dosen/proposal/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Proposal Baru
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                    <CardDescription className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {proposal.creator_name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(proposal.created_at).toLocaleDateString('id-ID')}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(proposal.budget || 0)}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[proposal.status as keyof typeof statusColors]}>
                    {statusLabels[proposal.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{proposal.type}</Badge>
                    <Badge variant="outline">{proposal.creator_department || 'Unknown'}</Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/dosen/proposal/${proposal.id.toString()}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Lihat
                      </Button>
                    </Link>
                    {proposal.status === 'draft' && (
                      <>
                        <Link href={`/dosen/proposal/${proposal.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleSubmit(proposal.id, proposal.title)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Ajukan
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(proposal.id, proposal.title)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Modals */}
       <ConfirmationModal
         isOpen={deleteModal.isOpen}
         onClose={() => setDeleteModal({ isOpen: false, proposalId: '', proposalTitle: '' })}
         onConfirm={confirmDelete}
         title="Hapus Proposal"
         description={`Apakah Anda yakin ingin menghapus proposal "${deleteModal.proposalTitle}"? Tindakan ini tidak dapat dibatalkan.`}
         confirmText="Hapus"
         cancelText="Batal"
         type="danger"
         isLoading={isDeleting}
       />

       <ConfirmationModal
         isOpen={submitModal.isOpen}
         onClose={() => setSubmitModal({ isOpen: false, proposalId: '', proposalTitle: '' })}
         onConfirm={confirmSubmit}
         title="Ajukan Proposal"
         description={`Apakah Anda yakin ingin mengajukan proposal "${submitModal.proposalTitle}"? Setelah diajukan, proposal tidak dapat diedit lagi.`}
         confirmText="Ajukan"
         cancelText="Batal"
         type="info"
         isLoading={isSubmitting}
       />
    </div>
  );
}

export default function DosenProposalPage() {
  return (
    <DashboardLayout>
      <DosenProposalPageContent />
    </DashboardLayout>
  );
}