-- Migration: Add additional fields to users table for CRUD User implementation
-- Date: 2024
-- Description: Add NIDN, NUPTK, NIM, Program Studi and other required fields

-- Add new columns to users table
ALTER TABLE users ADD COLUMN nidn TEXT;
ALTER TABLE users ADD COLUMN nuptk TEXT;
ALTER TABLE users ADD COLUMN nim TEXT;
ALTER TABLE users ADD COLUMN program_studi TEXT;
ALTER TABLE users ADD COLUMN status_kepegawaian TEXT;
ALTER TABLE users ADD COLUMN jabatan_fungsional TEXT;
ALTER TABLE users ADD COLUMN pendidikan_terakhir TEXT;
ALTER TABLE users ADD COLUMN tahun_masuk INTEGER;
ALTER TABLE users ADD COLUMN foto_profil TEXT;
ALTER TABLE users ADD COLUMN signature_digital TEXT;

-- Create program_studi master table
CREATE TABLE IF NOT EXISTS program_studi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    fakultas TEXT NOT NULL,
    jenjang TEXT NOT NULL CHECK (jenjang IN ('D3', 'S1', 'S2', 'S3')),
    akreditasi TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample program studi data
INSERT OR IGNORE INTO program_studi (kode, nama, fakultas, jenjang, akreditasi) VALUES
('TI', 'Teknik Informatika', 'Fakultas Teknik', 'S1', 'A'),
('SI', 'Sistem Informasi', 'Fakultas Teknik', 'S1', 'B'),
('MI', 'Manajemen Informatika', 'Fakultas Teknik', 'D3', 'B'),
('TK', 'Teknik Komputer', 'Fakultas Teknik', 'S1', 'B'),
('RPL', 'Rekayasa Perangkat Lunak', 'Fakultas Teknik', 'S1', 'A'),
('MN', 'Manajemen', 'Fakultas Ekonomi', 'S1', 'A'),
('AK', 'Akuntansi', 'Fakultas Ekonomi', 'S1', 'A'),
('HK', 'Hukum', 'Fakultas Hukum', 'S1', 'B'),
('PS', 'Psikologi', 'Fakultas Psikologi', 'S1', 'A'),
('KM', 'Komunikasi', 'Fakultas Ilmu Komunikasi', 'S1', 'B');

-- Update existing users with sample data
UPDATE users SET 
    program_studi = 'Teknik Informatika',
    nidn = CASE 
        WHEN role IN ('lecturer', 'admin', 'reviewer') THEN '0123456789'
        ELSE NULL 
    END,
    nim = CASE 
        WHEN role = 'student' THEN '2024010001'
        ELSE NULL 
    END,
    tahun_masuk = 2024
WHERE email IN ('admin@lppm.ac.id', 'reviewer@lppm.ac.id', 'lecturer@lppm.ac.id', 'student@lppm.ac.id');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_nidn ON users(nidn);
CREATE INDEX IF NOT EXISTS idx_users_nim ON users(nim);
CREATE INDEX IF NOT EXISTS idx_users_program_studi ON users(program_studi);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_program_studi_kode ON program_studi(kode);
CREATE INDEX IF NOT EXISTS idx_program_studi_nama ON program_studi(nama);