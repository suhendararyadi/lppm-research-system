import { create } from 'zustand';
import type { ResearchProposal, ResearchFilter, SortOption, PaginatedResponse } from '@/types';
import { apiClient } from '@/lib/api/client';

interface ResearchState {
  proposals: ResearchProposal[];
  currentProposal: ResearchProposal | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ResearchFilter;
  sort: SortOption;
  
  // Actions
  fetchProposals: () => Promise<void>;
  fetchProposal: (id: string) => Promise<void>;
  createProposal: (data: any) => Promise<void>;
  updateProposal: (id: string, data: any) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  setFilters: (filters: Partial<ResearchFilter>) => void;
  setSort: (sort: SortOption) => void;
  setPagination: (page: number, limit?: number) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  proposals: [],
  currentProposal: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: {},
  sort: {
    field: 'created_at',
    direction: 'desc' as const,
  },
};

export const useResearchStore = create<ResearchState>((set, get) => ({
  ...initialState,

  fetchProposals: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { pagination, filters, sort } = get();
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status?.join(','),
        type: filters.type?.join(','),
        department: filters.department,
        year: filters.year,
        sort_field: sort.field,
        sort_direction: sort.direction,
      };
      
      const response = await apiClient.getResearchProposals(params);
      
      if (response.success && response.data) {
        const { data, pagination: paginationData } = response.data as PaginatedResponse<ResearchProposal>;
        
        set({
          proposals: data,
          pagination: paginationData,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch proposals');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
    }
  },

  fetchProposal: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.getResearchProposal(id);
      
      if (response.success && response.data) {
        set({
          currentProposal: response.data,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch proposal');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
    }
  },

  createProposal: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.createResearchProposal(data);
      
      if (response.success && response.data) {
        // Refresh the proposals list
        await get().fetchProposals();
        
        set({ isLoading: false });
      } else {
        throw new Error(response.message || 'Failed to create proposal');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  updateProposal: async (id: string, data: any) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.updateResearchProposal(id, data);
      
      if (response.success && response.data) {
        // Update the proposal in the list
        const { proposals } = get();
        const updatedProposals = proposals.map(proposal => 
          proposal.id === id ? { ...proposal, ...response.data } : proposal
        );
        
        set({
          proposals: updatedProposals,
          currentProposal: response.data,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to update proposal');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteProposal: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.deleteResearchProposal(id);
      
      if (response.success) {
        // Remove the proposal from the list
        const { proposals } = get();
        const updatedProposals = proposals.filter(proposal => proposal.id !== id);
        
        set({
          proposals: updatedProposals,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to delete proposal');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  setFilters: (newFilters: Partial<ResearchFilter>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page
    }));
    
    // Automatically fetch with new filters
    get().fetchProposals();
  },

  setSort: (sort: SortOption) => {
    set({ sort });
    
    // Automatically fetch with new sort
    get().fetchProposals();
  },

  setPagination: (page: number, limit?: number) => {
    set(state => ({
      pagination: {
        ...state.pagination,
        page,
        ...(limit && { limit }),
      },
    }));
    
    // Automatically fetch with new pagination
    get().fetchProposals();
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));