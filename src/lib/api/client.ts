// API Client for LPPM Research System
// This file contains all API calls to the Cloudflare Workers backend

import type { 
  User, 
  ResearchProposal, 
  CommunityService, 
  ResearchFilter, 
  ServiceFilter,
  ProgramStudi,
  CreateUserForm,
  UpdateUserForm,
  UserFilter
} from '@/types';

// Environment configuration
const CONFIG = {
  AUTH_WORKER_URL: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ? '/api/auth' : (process.env.NEXT_PUBLIC_AUTH_WORKER_URL || 'http://localhost:8787'),
  RESEARCH_WORKER_URL: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ? '/api' : (process.env.NEXT_PUBLIC_RESEARCH_WORKER_URL || 'http://localhost:8788'),
  SERVICE_WORKER_URL: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ? '/api/auth' : (process.env.NEXT_PUBLIC_SERVICE_WORKER_URL || 'http://localhost:8787'), // Use auth worker for service endpoints
  DOCUMENTS_WORKER_URL: process.env.NEXT_PUBLIC_DOCUMENTS_WORKER_URL || 'http://localhost:8790',
  NOTIFICATIONS_WORKER_URL: process.env.NEXT_PUBLIC_NOTIFICATIONS_WORKER_URL || 'http://localhost:8791',
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  MOCK_DATA: process.env.NEXT_PUBLIC_MOCK_DATA === 'true',
};

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CloudflareError {
  code: string;
  message: string;
  details?: any;
}

// Generic API client class for Cloudflare Workers
class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Get tokens from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(token: string, refreshTokenValue?: string) {
    this.token = token;
    if (refreshTokenValue) {
      this.refreshToken = refreshTokenValue;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      if (refreshTokenValue) {
        localStorage.setItem('refresh_token', refreshTokenValue);
      }
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${CONFIG.AUTH_WORKER_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.token) {
          this.setTokens(data.data.token, data.data.refreshToken);
          return true;
        }
      }
    } catch (error) {
      if (CONFIG.DEBUG_MODE) {
        console.error('Token refresh failed:', error);
      }
    }

    return false;
  }

  private async request<T>(
    workerUrl: string,
    endpoint: string,
    options: RequestInit = {},
    retryOnAuth = true
  ): Promise<ApiResponse<T>> {
    const url = `${workerUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Environment': CONFIG.ENVIRONMENT,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Merge with provided headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOnAuth && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          return this.request<T>(workerUrl, endpoint, options, false);
        } else {
          // Refresh failed, clear tokens and redirect to login
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return {
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_FAILED',
          };
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const errorMessage = `Failed to parse response: ${response.status} ${response.statusText}`;
        
        if (CONFIG.DEBUG_MODE) {
          console.error('JSON Parse Error:', parseError);
          console.error('Response status:', response.status);
          console.error('Response statusText:', response.statusText);
        }

        return {
          success: false,
          error: errorMessage,
          code: 'PARSE_ERROR',
        };
      }

      if (!response.ok) {
        const error: CloudflareError = {
          code: data.code || 'UNKNOWN_ERROR',
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          details: data.details,
        };

        // Debug logging disabled to prevent console errors in production
        // if (CONFIG.DEBUG_MODE) {
        //   console.error('API Error:', error);
        //   console.error('Response data:', data);
        // }

        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      // Debug logging disabled to prevent console errors in production
      // if (CONFIG.DEBUG_MODE) {
      //   console.error('Network Error:', error);
      // }

      return {
        success: false,
        error: errorMessage,
        code: 'NETWORK_ERROR',
      };
    }
  }

  // GET request
  async get<T>(workerUrl: string, endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(workerUrl, endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(workerUrl: string, endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(workerUrl, endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(workerUrl: string, endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(workerUrl, endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(workerUrl: string, endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(workerUrl, endpoint, { method: 'DELETE' });
  }

  // ==============================================
  // AUTH METHODS
  // ==============================================

  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/auth/login', { email, password });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    department?: string;
    institution?: string;
  }): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/auth/register', userData);
  }

  async createUser(data: CreateUserForm): Promise<ApiResponse<User>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/users/', data);
  }

  async logout(): Promise<ApiResponse<void>> {
    const result = await this.post<void>(CONFIG.AUTH_WORKER_URL, '/auth/logout');
    this.clearTokens();
    return result;
  }

  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    return this.get(CONFIG.AUTH_WORKER_URL, '/auth/verify');
  }

  async refreshAuthToken(): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/auth/refresh', {
      refreshToken: this.refreshToken,
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/auth/reset-password', { token, password });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // ==============================================
  // RESEARCH METHODS
  // ==============================================

  async getResearchProposals(
    page = 1,
    limit = 10,
    filters?: ResearchFilter,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ApiResponse<PaginatedResponse<ResearchProposal>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return this.get(CONFIG.RESEARCH_WORKER_URL, `/research?${params.toString()}`);
  }

  async getResearchProposal(id: string): Promise<ApiResponse<ResearchProposal>> {
    return this.get(CONFIG.RESEARCH_WORKER_URL, `/research/${id}`);
  }

  async createResearchProposal(data: Partial<ResearchProposal>): Promise<ApiResponse<ResearchProposal>> {
    return this.post(CONFIG.RESEARCH_WORKER_URL, '/research', data);
  }

  async updateResearchProposal(id: string, data: Partial<ResearchProposal>): Promise<ApiResponse<ResearchProposal>> {
    return this.put(CONFIG.RESEARCH_WORKER_URL, `/research/${id}`, data);
  }

  async deleteResearchProposal(id: string): Promise<ApiResponse<void>> {
    return this.delete(CONFIG.RESEARCH_WORKER_URL, `/research/${id}`);
  }

  async submitResearchProposal(id: string): Promise<ApiResponse<ResearchProposal>> {
    return this.post(CONFIG.RESEARCH_WORKER_URL, `/research/${id}/submit`);
  }

  async reviewResearchProposal(
    id: string,
    review: {
      status: 'approved' | 'rejected' | 'revision_required';
      comments: string;
      score?: number;
    }
  ): Promise<ApiResponse<ResearchProposal>> {
    return this.post(CONFIG.RESEARCH_WORKER_URL, `/research/${id}/review`, review);
  }

  async getResearchStatistics(): Promise<ApiResponse<{
    total: number;
    draft: number;
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
    total_budget: number;
  }>> {
    return this.get(CONFIG.RESEARCH_WORKER_URL, '/research/statistics');
  }

  // Dashboard statistics - combines data from multiple sources
  async getDashboardStatistics(): Promise<ApiResponse<{
    research: {
      total: number;
      active: number;
      completed: number;
      pending: number;
    };
    service: {
      total: number;
      active: number;
      completed: number;
      pending: number;
    };
    users: {
      total: number;
      lecturers: number;
      students: number;
    };
    budget: {
      allocated: number;
      used: number;
      remaining: number;
    };
  }>> {
    // For now, we'll aggregate data from existing endpoints
    // In the future, this could be a dedicated dashboard endpoint
    try {
      const [researchStats, userStats] = await Promise.all([
        this.getResearchStatistics(),
        this.getUserStatistics()
      ]);

      const dashboardData = {
         research: {
           total: researchStats.data?.total || 0,
           active: (researchStats.data?.submitted || 0) + (researchStats.data?.under_review || 0),
           completed: researchStats.data?.approved || 0,
           pending: researchStats.data?.under_review || 0,
         },
         service: {
           total: 0, // Will be implemented when service statistics are available
           active: 0,
           completed: 0,
           pending: 0,
         },
         users: {
           total: userStats.data?.total || 0,
           lecturers: userStats.data?.lecturers || 0,
           students: userStats.data?.students || 0,
         },
         budget: {
           allocated: 2500000000, // This should come from a budget management system
           used: researchStats.data?.total_budget || 0,
           remaining: 2500000000 - (researchStats.data?.total_budget || 0),
         },
       };

      return {
        success: true,
        data: dashboardData
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch dashboard statistics'
      };
    }
  }

  async getUserStatistics(): Promise<ApiResponse<{
    total: number;
    lecturers: number;
    students: number;
    admins: number;
    active_users: number;
    inactive_users: number;
  }>> {
    return this.get(CONFIG.AUTH_WORKER_URL, '/users/statistics');
  }

  // ==============================================
  // COMMUNITY SERVICE METHODS
  // ==============================================

  async getCommunityServices(
    page = 1,
    limit = 10,
    filters?: ServiceFilter,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ApiResponse<PaginatedResponse<CommunityService>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return this.get(CONFIG.SERVICE_WORKER_URL, `/service?${params.toString()}`);
  }

  async getCommunityService(id: string): Promise<ApiResponse<CommunityService>> {
    return this.get(CONFIG.SERVICE_WORKER_URL, `/service/${id}`);
  }

  async createCommunityService(data: Partial<CommunityService>): Promise<ApiResponse<CommunityService>> {
    return this.post(CONFIG.SERVICE_WORKER_URL, '/service', data);
  }

  async updateCommunityService(id: string, data: Partial<CommunityService>): Promise<ApiResponse<CommunityService>> {
    return this.put(CONFIG.SERVICE_WORKER_URL, `/service/${id}`, data);
  }

  async deleteCommunityService(id: string): Promise<ApiResponse<void>> {
    return this.delete(CONFIG.SERVICE_WORKER_URL, `/service/${id}`);
  }

  // ==============================================
  // USER MANAGEMENT METHODS
  // ==============================================

  async getUsers(
    page = 1,
    limit = 10,
    filters?: UserFilter,
    sortBy = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    return this.get(CONFIG.AUTH_WORKER_URL, `/users/?${params.toString()}`);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.get(CONFIG.AUTH_WORKER_URL, `/users/${id}`);
  }

  async updateUser(id: string, data: UpdateUserForm): Promise<ApiResponse<User>> {
    return this.put(CONFIG.AUTH_WORKER_URL, `/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.delete(CONFIG.AUTH_WORKER_URL, `/users/${id}`);
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put(CONFIG.AUTH_WORKER_URL, '/profile', data);
  }

  // ==============================================
  // PROGRAM STUDI METHODS
  // ==============================================

  async getProgramStudi(): Promise<ApiResponse<ProgramStudi[]>> {
    return this.get(CONFIG.AUTH_WORKER_URL, '/program-studi/');
  }

  async createProgramStudi(data: Omit<ProgramStudi, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ProgramStudi>> {
    return this.post(CONFIG.AUTH_WORKER_URL, '/program-studi/', data);
  }

  async updateProgramStudi(id: string, data: Partial<ProgramStudi>): Promise<ApiResponse<ProgramStudi>> {
    return this.put(CONFIG.AUTH_WORKER_URL, `/program-studi/${id}`, data);
  }

  async deleteProgramStudi(id: string): Promise<ApiResponse<void>> {
    return this.delete(CONFIG.AUTH_WORKER_URL, `/program-studi/${id}`);
  }

  // ==============================================
  // FILE UPLOAD METHODS
  // ==============================================

  async uploadFile(file: File, category: string): Promise<ApiResponse<{ url: string; key: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.request(CONFIG.DOCUMENTS_WORKER_URL, '/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async deleteFile(key: string): Promise<ApiResponse<void>> {
    return this.delete(CONFIG.DOCUMENTS_WORKER_URL, `/files/${key}`);
  }

  // ==============================================
  // NOTIFICATION METHODS
  // ==============================================

  async getNotifications(
    page = 1,
    limit = 10,
    unreadOnly = false
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString(),
    });

    return this.get(CONFIG.NOTIFICATIONS_WORKER_URL, `/notifications?${params.toString()}`);
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.put(CONFIG.NOTIFICATIONS_WORKER_URL, `/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.put(CONFIG.NOTIFICATIONS_WORKER_URL, '/notifications/read-all');
  }

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return this.delete(CONFIG.NOTIFICATIONS_WORKER_URL, `/notifications/${id}`);
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;

// Export types for use in other files
export type { ApiResponse, PaginatedResponse, CloudflareError };
export { CONFIG };