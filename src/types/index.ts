// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  institution?: string;
  phone?: string;
  address?: string;
  expertise?: string; // JSON array of expertise areas
  nidn?: string; // For lecturers and admins
  nuptk?: string; // For lecturers and admins
  nim?: string; // For students
  program_studi?: string;
  status_kepegawaian?: string;
  jabatan_fungsional?: string;
  pendidikan_terakhir?: string;
  tahun_masuk?: number;
  foto_profil?: string;
  signature_digital?: string;
  is_active?: boolean;
  email_verified?: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'super_admin' | 'lppm_admin' | 'admin' | 'dosen' | 'mahasiswa' | 'reviewer' | 'guest';

// Program Studi Types
export interface ProgramStudi {
  id: string;
  kode: string;
  nama: string;
  fakultas: string;
  jenjang: 'D3' | 'S1' | 'S2' | 'S3';
  akreditasi?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User Form Types
export interface CreateUserForm {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: UserRole;
  program_studi: string;
  nidn?: string;
  nuptk?: string;
  nim?: string;
  department?: string;
  institution?: string;
  phone?: string;
  address?: string;
  expertise?: string[];
  status_kepegawaian?: string;
  jabatan_fungsional?: string;
  pendidikan_terakhir?: string;
  tahun_masuk?: number;
}

export interface UpdateUserForm {
  name?: string;
  email?: string;
  role?: UserRole;
  program_studi?: string;
  nidn?: string;
  nuptk?: string;
  nim?: string;
  department?: string;
  institution?: string;
  phone?: string;
  address?: string;
  expertise?: string[];
  status_kepegawaian?: string;
  jabatan_fungsional?: string;
  pendidikan_terakhir?: string;
  tahun_masuk?: string;
  is_active?: boolean;
}

export interface UserFilter {
  role?: string;
  program_studi?: string;
  is_active?: boolean;
  search?: string;
  fakultas?: string;
}

export interface Department {
  id: string;
  name: string;
  faculty: string;
  head_id?: string;
  created_at: string;
}

// Research Types
export interface TeamMember {
  id?: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  institution: string;
  expertise?: string[];
  type?: 'lecturer' | 'student' | 'external';
}

export interface ResearchProposal {
  id: string;
  title: string;
  type: ResearchType;
  status: ProposalStatus;
  budget: number;
  duration?: number;
  start_date: string;
  end_date: string;
  location?: string;
  funding_source?: string;
  sk_number?: string;
  sk_date?: string;
  document_url?: string;
  abstract: string;
  keywords: string[];
  submitted_by: string;
  created_at: string;
  updated_at: string;
  team_members?: TeamMember[];
  creator_name?: string;
  creator_department?: string;
  creator_email?: string;
  reviews?: any[];
}

export type ResearchType = 'basic' | 'applied' | 'development' | 'collaborative';
export type ProposalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';

export interface ResearchMember {
  id: string;
  research_id: string;
  user_id: string;
  role: MemberRole;
  contribution_percentage: number;
  joined_at: string;
}

export type MemberRole = 'principal_investigator' | 'co_investigator' | 'research_assistant' | 'student';

export interface ResearchMilestone {
  id: string;
  research_id: string;
  title: string;
  description: string;
  deadline: string;
  status: MilestoneStatus;
  completed_at?: string;
  created_at: string;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface ResearchReport {
  id: string;
  research_id: string;
  type: ReportType;
  title: string;
  file_url: string;
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
}

export type ReportType = 'progress' | 'final' | 'financial' | 'publication';

// Community Service Types
export interface ServiceProposal {
  id: string;
  title: string;
  location: string;
  target_audience: string;
  budget: number;
  status: ProposalStatus;
  start_date: string;
  end_date: string;
  description: string;
  objectives: string[];
  submitted_by: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceActivity {
  id: string;
  service_id: string;
  activity_date: string;
  title: string;
  description: string;
  participants_count: number;
  photos: string[];
  created_at: string;
}

// Review & Evaluation Types
export interface Review {
  id: string;
  proposal_id: string;
  reviewer_id: string;
  score: number;
  comments: string;
  status: ReviewStatus;
  criteria_scores: CriteriaScore[];
  submitted_at: string;
}

export type ReviewStatus = 'pending' | 'in_progress' | 'completed';

export interface CriteriaScore {
  criteria_id: string;
  score: number;
  comment?: string;
}

export interface ReviewCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
  category: string;
}

// Document Types
export interface Document {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  type: DocumentType;
  uploaded_by: string;
  research_id?: string;
  service_id?: string;
  created_at: string;
}

export type DocumentType = 'proposal' | 'report' | 'attachment' | 'template' | 'publication';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface ResearchProposalForm {
  title: string;
  type: ResearchType;
  abstract: string;
  keywords: string;
  budget: number;
  start_date: string;
  end_date: string;
  members: {
    user_id: string;
    role: MemberRole;
    contribution_percentage: number;
  }[];
  milestones: {
    title: string;
    description: string;
    deadline: string;
  }[];
}

// Dashboard Types
export interface DashboardStats {
  total_research: number;
  active_research: number;
  completed_research: number;
  total_budget: number;
  total_publications: number;
  total_users: number;
}

export interface RecentActivity {
  id: string;
  type: 'proposal_submitted' | 'review_completed' | 'milestone_completed' | 'report_submitted';
  title: string;
  description: string;
  user: string;
  timestamp: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Filter & Search Types
export interface ResearchFilter {
  status?: ProposalStatus[];
  type?: ResearchType[];
  year?: number;
  department?: string;
  search?: string;
}

export interface ServiceFilter {
  status?: ProposalStatus[];
  type?: ServiceType[];
  year?: number;
  department?: string;
  search?: string;
}

export interface CommunityService {
  id: string;
  title: string;
  description: string;
  type: ServiceType;
  status: ProposalStatus;
  start_date: string;
  end_date: string;
  location: string;
  target_audience: string;
  expected_participants: number;
  actual_participants?: number;
  budget: number;
  funding_source: string;
  team_members: TeamMember[];
  documents: Document[];
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  completed_at?: string;
  reviewer_id?: string;
  review_notes?: string;
  impact_report?: string;
  photos?: string[];
}

export type ServiceType = 
  | 'education'
  | 'health'
  | 'technology'
  | 'environment'
  | 'social'
  | 'economic';

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}