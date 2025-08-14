# Perencanaan CRUD User - Sistem LPPM

## 📋 Analisis Situasi Saat Ini

### Database Schema (Tabel Users)
```sql
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
```

### API Endpoints yang Sudah Ada
- `getUsers()` - Pagination, filter, sort
- `getUser(id)` - Detail user
- `updateUser(id, data)` - Update user
- `deleteUser(id)` - Hapus user
- `register()` - Registrasi user baru

### Role Access Control
- **super_admin** & **lppm_admin**: Akses penuh ke `/admin/users`
- Menu sudah dikonfigurasi di `AppSidebar.tsx`

## 🎯 Kebutuhan Tambahan Berdasarkan Permintaan

### 1. Field Tambahan yang Diperlukan

#### Untuk Dosen & Admin LPPM:
- **NIDN** (Nomor Induk Dosen Nasional)
- **NUPTK** (Nomor Unik Pendidik dan Tenaga Kependidikan)
- **Program Studi** (wajib untuk semua user)

#### Untuk Mahasiswa:
- **NIM** (Nomor Induk Mahasiswa)
- **Program Studi** (wajib untuk semua user)

#### Field Tambahan Best Practice:
- **Status Kepegawaian** (PNS, Non-PNS, Kontrak, dll)
- **Jabatan Fungsional** (Asisten Ahli, Lektor, dll)
- **Pendidikan Terakhir** (S1, S2, S3)
- **Tahun Masuk**
- **Status Aktif/Non-Aktif**
- **Foto Profil**
- **Signature Digital**

## 🗄️ Modifikasi Database Schema

### Alternatif 1: Menambah Kolom ke Tabel Users (Recommended)
```sql
ALTER TABLE users ADD COLUMN nidn TEXT;
ALTER TABLE users ADD COLUMN nuptk TEXT;
ALTER TABLE users ADD COLUMN nim TEXT;
ALTER TABLE users ADD COLUMN program_studi TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN status_kepegawaian TEXT;
ALTER TABLE users ADD COLUMN jabatan_fungsional TEXT;
ALTER TABLE users ADD COLUMN pendidikan_terakhir TEXT;
ALTER TABLE users ADD COLUMN tahun_masuk INTEGER;
ALTER TABLE users ADD COLUMN foto_profil TEXT;
ALTER TABLE users ADD COLUMN signature_digital TEXT;
```

### Alternatif 2: Tabel Terpisah untuk Profile Extended
```sql
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    nidn TEXT,
    nuptk TEXT,
    nim TEXT,
    program_studi TEXT NOT NULL,
    status_kepegawaian TEXT,
    jabatan_fungsional TEXT,
    pendidikan_terakhir TEXT,
    tahun_masuk INTEGER,
    foto_profil TEXT,
    signature_digital TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Tabel Program Studi (Master Data)
```sql
CREATE TABLE program_studi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    fakultas TEXT NOT NULL,
    jenjang TEXT NOT NULL CHECK (jenjang IN ('D3', 'S1', 'S2', 'S3')),
    akreditasi TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Struktur Halaman CRUD

### 1. Halaman List Users (`/admin/users/page.tsx`)

#### Features:
- **Data Table** dengan pagination
- **Search & Filter**:
  - Berdasarkan nama, email, NIDN/NIM
  - Filter role (Dosen, Mahasiswa, Admin, Reviewer)
  - Filter program studi
  - Filter status aktif/non-aktif
- **Bulk Actions**:
  - Aktivasi/Deaktivasi multiple users
  - Export data ke Excel/CSV
- **Quick Actions**:
  - View detail
  - Edit user
  - Reset password
  - Delete user

#### Columns:
| Column | Dosen/Admin | Mahasiswa | All |
|--------|-------------|-----------|-----|
| Foto | ✅ | ✅ | ✅ |
| Nama | ✅ | ✅ | ✅ |
| Email | ✅ | ✅ | ✅ |
| Role | ✅ | ✅ | ✅ |
| NIDN/NUPTK | ✅ | ❌ | Conditional |
| NIM | ❌ | ✅ | Conditional |
| Program Studi | ✅ | ✅ | ✅ |
| Status | ✅ | ✅ | ✅ |
| Last Login | ✅ | ✅ | ✅ |
| Actions | ✅ | ✅ | ✅ |

### 2. Halaman Create User (`/admin/users/create/page.tsx`)

#### Form Sections:

##### Section 1: Informasi Dasar
- Email (required, unique validation)
- Password (required, strength validation)
- Confirm Password
- Nama Lengkap (required)
- Role (required, dropdown)

##### Section 2: Informasi Akademik
- Program Studi (required, searchable dropdown)
- NIDN (conditional: jika role = dosen/admin)
- NUPTK (conditional: jika role = dosen/admin)
- NIM (conditional: jika role = mahasiswa)
- Tahun Masuk

##### Section 3: Informasi Kepegawaian (Optional)
- Status Kepegawaian
- Jabatan Fungsional
- Pendidikan Terakhir

##### Section 4: Kontak & Alamat
- No. Telepon
- Alamat
- Expertise/Bidang Keahlian (tags input)

##### Section 5: Media
- Upload Foto Profil
- Upload Signature Digital

#### Validasi:
- **Email**: Format valid, unique
- **NIDN**: 10 digit, unique untuk dosen
- **NIM**: Format sesuai institusi, unique untuk mahasiswa
- **Password**: Min 8 karakter, kombinasi huruf & angka
- **Program Studi**: Harus dipilih dari master data

### 3. Halaman Edit User (`/admin/users/[id]/edit/page.tsx`)

#### Features:
- Form yang sama dengan create, tapi pre-filled
- **Tidak bisa edit**:
  - Email (readonly, atau dengan konfirmasi khusus)
  - Role (dengan konfirmasi admin)
- **Password Section**:
  - Checkbox "Change Password"
  - Jika dicentang, tampilkan field password baru
- **Audit Trail**:
  - Tampilkan history perubahan
  - Last modified by & when

### 4. Halaman Detail User (`/admin/users/[id]/page.tsx`)

#### Tabs:

##### Tab 1: Profile Information
- Semua informasi user dalam format read-only
- Foto profil besar
- Status badges (Active/Inactive, Email Verified, dll)

##### Tab 2: Activity Log
- Login history
- Research proposals yang dibuat
- Reviews yang dilakukan
- Community services

##### Tab 3: Documents
- CV/Resume
- Sertifikat
- Dokumen pendukung lainnya

##### Tab 4: Settings
- Reset password
- Send verification email
- Activate/Deactivate account
- Delete account (dengan konfirmasi)

## 🔧 Backend API Enhancements

### Endpoint Baru yang Diperlukan:

```javascript
// Di auth.js worker

// GET /auth/users - List users dengan filter & pagination
// POST /auth/users - Create user baru
// GET /auth/users/:id - Get user detail
// PUT /auth/users/:id - Update user
// DELETE /auth/users/:id - Delete user
// POST /auth/users/:id/reset-password - Reset password
// POST /auth/users/:id/toggle-status - Activate/Deactivate
// GET /auth/users/export - Export users data

// Master data endpoints
// GET /auth/program-studi - List program studi
// POST /auth/program-studi - Create program studi (super admin only)
```

### Validasi Backend:

```javascript
// Validasi NIDN (10 digit)
function validateNIDN(nidn) {
  return /^\d{10}$/.test(nidn);
}

// Validasi NIM (sesuai format institusi)
function validateNIM(nim, programStudi) {
  // Format: YYYYPPSSSS (Tahun + Program + Sequence)
  return /^\d{10}$/.test(nim);
}

// Validasi email institusi
function validateInstitutionEmail(email) {
  return email.endsWith('@lppm.ac.id') || email.endsWith('@university.ac.id');
}
```

## 🎨 UI/UX Design Guidelines

### 1. Design System
- Menggunakan **shadcn/ui** components yang sudah ada
- **Consistent spacing**: 4px grid system
- **Color scheme**: Primary blue, secondary gray
- **Typography**: Inter font family

### 2. Form Design
- **Progressive disclosure**: Tampilkan field sesuai role
- **Real-time validation**: Feedback langsung saat user mengetik
- **Auto-save draft**: Simpan progress form otomatis
- **Responsive design**: Mobile-first approach

### 3. Data Table
- **Sticky header**: Header tetap saat scroll
- **Row selection**: Checkbox untuk bulk actions
- **Sortable columns**: Click to sort
- **Resizable columns**: Drag to resize
- **Infinite scroll** atau pagination

### 4. Search & Filter
- **Global search**: Search across multiple fields
- **Advanced filter**: Collapsible filter panel
- **Filter chips**: Visual representation of active filters
- **Save filter presets**: Untuk filter yang sering digunakan

## 🔐 Security & Permissions

### Role-Based Access Control:

```typescript
const permissions = {
  super_admin: {
    users: ['create', 'read', 'update', 'delete', 'export'],
    program_studi: ['create', 'read', 'update', 'delete']
  },
  lppm_admin: {
    users: ['create', 'read', 'update', 'export'],
    program_studi: ['read']
  },
  dosen: {
    users: ['read_own'],
    program_studi: ['read']
  },
  mahasiswa: {
    users: ['read_own'],
    program_studi: ['read']
  }
};
```

### Data Protection:
- **Password hashing**: SHA-256 (sudah ada)
- **Input sanitization**: Prevent XSS
- **SQL injection prevention**: Parameterized queries
- **File upload security**: Type & size validation
- **Audit logging**: Track all CRUD operations

## 📱 Responsive Design

### Mobile Layout:
- **Card-based list**: Ganti table dengan cards di mobile
- **Swipe actions**: Swipe untuk quick actions
- **Bottom sheet**: Untuk filter & actions
- **Floating action button**: Untuk create user

### Tablet Layout:
- **Sidebar navigation**: Collapsible sidebar
- **Split view**: List + detail view
- **Touch-friendly**: Larger touch targets

## 🚀 Implementation Phases

### Phase 1: Database & Backend (Week 1)
1. Modify database schema
2. Create migration scripts
3. Implement backend API endpoints
4. Add validation logic
5. Test API endpoints

### Phase 2: Basic CRUD UI (Week 2)
1. Create list users page
2. Implement create user form
3. Add edit user functionality
4. Basic search & filter
5. User detail page

### Phase 3: Advanced Features (Week 3)
1. Advanced search & filter
2. Bulk actions
3. Export functionality
4. File upload (photo, signature)
5. Activity logging

### Phase 4: Polish & Testing (Week 4)
1. Mobile responsive design
2. Performance optimization
3. Security testing
4. User acceptance testing
5. Documentation

## 📊 Performance Considerations

### Database Optimization:
- **Indexes**: Pada email, nidn, nim, program_studi
- **Pagination**: Limit query results
- **Caching**: Cache master data (program studi)

### Frontend Optimization:
- **Virtual scrolling**: Untuk large datasets
- **Lazy loading**: Load data on demand
- **Image optimization**: Compress & resize photos
- **Bundle splitting**: Code splitting per route

## 🧪 Testing Strategy

### Unit Tests:
- Validation functions
- API endpoints
- React components

### Integration Tests:
- Database operations
- API workflows
- Form submissions

### E2E Tests:
- Complete user workflows
- Cross-browser testing
- Mobile testing

## 📈 Monitoring & Analytics

### Metrics to Track:
- User creation/update frequency
- Search query patterns
- Page load times
- Error rates
- User engagement

### Logging:
- All CRUD operations
- Failed login attempts
- Data export activities
- System errors

---

## 🎯 Next Steps

1. **Review & Approval**: Review perencanaan ini dengan stakeholder
2. **Database Design**: Finalisasi schema database
3. **API Specification**: Detail specification untuk setiap endpoint
4. **UI Mockups**: Buat wireframe/mockup untuk setiap halaman
5. **Implementation**: Mulai development sesuai phase yang sudah ditentukan

**Estimasi Total Development Time**: 3-4 minggu untuk tim 1-2 developer

**Priority Features**:
1. ✅ Basic CRUD (High)
2. ✅ Role-based access (High)
3. ✅ Search & filter (High)
4. ⚠️ File upload (Medium)
5. ⚠️ Export functionality (Medium)
6. ⚠️ Advanced analytics (Low)