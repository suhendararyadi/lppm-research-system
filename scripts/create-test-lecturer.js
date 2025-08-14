// Script to create a test lecturer user
// Run this with: node scripts/create-test-lecturer.js

const crypto = require('crypto');

// Simple password hashing function (matches the one in auth.js)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Test user data
const testUser = {
  email: 'dosen@test.com',
  password: 'password123',
  name: 'Dr. Test Lecturer',
  role: 'lecturer',
  department: 'Teknik Informatika',
  institution: 'Universitas Test',
  nidn: '1234567890'
};

console.log('Test Lecturer User Data:');
console.log('Email:', testUser.email);
console.log('Password:', testUser.password);
console.log('Role:', testUser.role);
console.log('\nYou can use this data to create a user via the admin panel or API.');
console.log('\nOr use this SQL to insert directly:');

// Generate SQL insert statement
const sql = `
INSERT INTO users (
  email, password_hash, name, role, department, institution, nidn,
  is_active, email_verified, created_at, updated_at
) VALUES (
  '${testUser.email}',
  'HASH_PLACEHOLDER', -- Replace with actual hash
  '${testUser.name}',
  '${testUser.role}',
  '${testUser.department}',
  '${testUser.institution}',
  '${testUser.nidn}',
  1,
  1,
  datetime('now'),
  datetime('now')
);
`;

console.log(sql);