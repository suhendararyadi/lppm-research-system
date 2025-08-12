import { create } from 'zustand';
import type { CommunityService, ServiceFilter, SortOption, PaginatedResponse } from '@/types';
import apiClient from '@/lib/api/client';

interface ServiceState {
  services: CommunityService[];
  currentService: CommunityService | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ServiceFilter;
  sort: SortOption;
  
  // Actions
  fetchServices: () => Promise<void>;
  fetchService: (id: string) => Promise<void>;
  createService: (data: any) => Promise<void>;
  updateService: (id: string, data: any) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  setFilters: (filters: Partial<ServiceFilter>) => void;
  setSort: (sort: SortOption) => void;
  setPagination: (page: number, limit?: number) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  services: [],
  currentService: null,
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

export const useServiceStore = create<ServiceState>((set, get) => ({
  ...initialState,

  fetchServices: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { pagination, filters, sort } = get();
      
      const response = await apiClient.getCommunityServices(
        pagination.page,
        pagination.limit,
        filters,
        sort.field,
        sort.direction
      );
      
      if (response.success && response.data) {
        const { data, pagination: paginationData } = response.data as PaginatedResponse<CommunityService>;
        
        set({
          services: data,
          pagination: paginationData,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch services');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
    }
  },

  fetchService: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.getCommunityService(id);
      
      if (response.success && response.data) {
        set({
          currentService: response.data,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch service');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
    }
  },

  createService: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.createCommunityService(data);
      
      if (response.success && response.data) {
        // Refresh the services list
        await get().fetchServices();
        
        set({ isLoading: false });
      } else {
        throw new Error(response.message || 'Failed to create service');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  updateService: async (id: string, data: any) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.updateCommunityService(id, data);
      
      if (response.success && response.data) {
        // Update the service in the list
        const { services } = get();
        const updatedServices = services.map(service => 
          service.id === id ? { ...service, ...response.data } : service
        );
        
        set({
          services: updatedServices,
          currentService: response.data,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to update service');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteService: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.deleteCommunityService(id);
      
      if (response.success) {
        // Remove the service from the list
        const { services } = get();
        const updatedServices = services.filter(service => service.id !== id);
        
        set({
          services: updatedServices,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Failed to delete service');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
      throw error;
    }
  },

  setFilters: (newFilters: Partial<ServiceFilter>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page
    }));
    
    // Automatically fetch with new filters
    get().fetchServices();
  },

  setSort: (sort: SortOption) => {
    set({ sort });
    
    // Automatically fetch with new sort
    get().fetchServices();
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
    get().fetchServices();
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));