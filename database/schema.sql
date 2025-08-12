-- Cloudflare D1 Database Schema for LPPM Research System
-- This schema supports the complete LPPM system functionality

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'lecturer', 'student')),
    department TEXT,
    institution TEXT,
    phone TEXT,
    address TEXT,
    expertise TEXT, -- JSON array of expertise areas
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Research proposals table
CREATE TABLE IF NOT EXISTS research_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('basic', 'applied', 'development', 'collaborative')),
    budget DECIMAL(15,2),
    duration INTEGER, -- in months
    keywords TEXT, -- JSON array
    objectives TEXT,
    methodology TEXT,
    expected_outcomes TEXT,
    team_members TEXT, -- JSON array of team member objects
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'completed')),
    created_by INTEGER NOT NULL,
    submitted_at DATETIME,
    approved_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Proposal reviews table
CREATE TABLE IF NOT EXISTS proposal_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    score INTEGER CHECK (score >= 1 AND score <= 100),
    comments TEXT NOT NULL,
    recommendation TEXT CHECK (recommendation IN ('approve', 'reject', 'revise')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES research_proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(proposal_id, reviewer_id)
);

-- Community service programs table
CREATE TABLE IF NOT EXISTS community_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('education', 'health', 'technology', 'environment', 'social', 'economic')),
    target_audience TEXT NOT NULL,
    location TEXT NOT NULL,
    budget DECIMAL(15,2),
    duration INTEGER, -- in days
    participants_count INTEGER DEFAULT 0,
    team_members TEXT, -- JSON array
    objectives TEXT,
    methodology TEXT,
    expected_impact TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'ongoing', 'completed', 'cancelled')),
    created_by INTEGER NOT NULL,
    submitted_at DATETIME,
    approved_at DATETIME,
    start_date DATE,
    end_date DATE,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Service reviews table
CREATE TABLE IF NOT EXISTS service_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    score INTEGER CHECK (score >= 1 AND score <= 100),
    comments TEXT NOT NULL,
    recommendation TEXT CHECK (recommendation IN ('approve', 'reject', 'revise')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES community_services(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(service_id, reviewer_id)
);

-- Documents table for file management
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    document_type TEXT CHECK (document_type IN ('proposal', 'report', 'attachment', 'review', 'certificate')),
    related_id INTEGER, -- ID of related proposal/service
    related_type TEXT CHECK (related_type IN ('research', 'service')),
    uploaded_by INTEGER NOT NULL,
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT CHECK (category IN ('system', 'research', 'service', 'review', 'deadline')),
    related_id INTEGER,
    related_type TEXT CHECK (related_type IN ('research', 'service', 'review')),
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Research progress tracking
CREATE TABLE IF NOT EXISTS research_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    milestone TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completion_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES research_proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Service progress tracking
CREATE TABLE IF NOT EXISTS service_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    activity TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completion_date DATE,
    participants_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES community_services(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Budget tracking table
CREATE TABLE IF NOT EXISTS budget_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    related_id INTEGER NOT NULL,
    related_type TEXT CHECK (related_type IN ('research', 'service')),
    category TEXT NOT NULL,
    description TEXT,
    planned_amount DECIMAL(15,2) NOT NULL,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    transaction_date DATE,
    receipt_number TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON research_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON research_proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_type ON research_proposals(type);
CREATE INDEX IF NOT EXISTS idx_services_status ON community_services(status);
CREATE INDEX IF NOT EXISTS idx_services_created_by ON community_services(created_by);
CREATE INDEX IF NOT EXISTS idx_services_type ON community_services(type);
CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, is_active);

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT OR IGNORE INTO users (
    email, password_hash, name, role, department, institution, is_active, email_verified
) VALUES (
    'admin@lppm.ac.id',
    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', -- SHA-256 of 'admin123'
    'System Administrator',
    'admin',
    'LPPM',
    'Universitas',
    1,
    1
);

-- Insert sample reviewer
INSERT OR IGNORE INTO users (
    email, password_hash, name, role, department, institution, is_active, email_verified
) VALUES (
    'reviewer@lppm.ac.id',
    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    'Dr. Reviewer',
    'reviewer',
    'Teknik Informatika',
    'Universitas',
    1,
    1
);

-- Insert sample lecturer
INSERT OR IGNORE INTO users (
    email, password_hash, name, role, department, institution, is_active, email_verified
) VALUES (
    'lecturer@lppm.ac.id',
    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    'Dr. Lecturer',
    'lecturer',
    'Teknik Informatika',
    'Universitas',
    1,
    1
);

-- Insert sample student
INSERT OR IGNORE INTO users (
    email, password_hash, name, role, department, institution, is_active, email_verified
) VALUES (
    'student@lppm.ac.id',
    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    'Student User',
    'student',
    'Teknik Informatika',
    'Universitas',
    1,
    1
);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', '["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png"]', 'Allowed file types for upload'),
('review_deadline_days', '14', 'Default deadline for proposal reviews in days'),
('notification_email', 'noreply@lppm.ac.id', 'Email address for system notifications'),
('system_name', 'LPPM Research System', 'Name of the system'),
('institution_name', 'Universitas', 'Name of the institution'),
('academic_year', '2024/2025', 'Current academic year');

-- Insert sample research proposal
INSERT OR IGNORE INTO research_proposals (
    title, abstract, type, budget, duration, keywords, objectives, methodology, expected_outcomes, team_members, status, created_by
) VALUES (
    'Pengembangan Sistem Informasi Berbasis AI',
    'Penelitian ini bertujuan untuk mengembangkan sistem informasi yang memanfaatkan teknologi artificial intelligence untuk meningkatkan efisiensi proses bisnis.',
    'applied',
    50000000,
    12,
    '["AI", "Machine Learning", "Information System", "Business Process"]',
    'Mengembangkan prototype sistem informasi berbasis AI yang dapat meningkatkan efisiensi proses bisnis hingga 30%',
    'Penelitian ini menggunakan metode Design Science Research dengan pendekatan agile development',
    'Prototype sistem informasi, publikasi ilmiah, dan pelatihan untuk pengguna',
    '[{"name": "Dr. Lecturer", "role": "Ketua", "institution": "Universitas"}, {"name": "Student User", "role": "Anggota", "institution": "Universitas"}]',
    'submitted',
    3
);

-- Insert sample community service
INSERT OR IGNORE INTO community_services (
    title, description, type, target_audience, location, budget, duration, team_members, objectives, methodology, expected_impact, status, created_by
) VALUES (
    'Pelatihan Digital Literacy untuk UMKM',
    'Program pelatihan untuk meningkatkan kemampuan digital UMKM dalam memasarkan produk secara online',
    'education',
    'Pelaku UMKM di wilayah Kota',
    'Balai Desa Sukamaju',
    15000000,
    3,
    '[{"name": "Dr. Lecturer", "role": "Ketua", "institution": "Universitas"}, {"name": "Student User", "role": "Anggota", "institution": "Universitas"}]',
    'Meningkatkan kemampuan digital 50 pelaku UMKM dalam pemasaran online',
    'Pelatihan interaktif, workshop, dan pendampingan langsung',
    'Peningkatan omzet UMKM sebesar 25% dalam 6 bulan',
    'approved',
    3
);