#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Vercel build process...');

try {
  // Step 1: Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('pnpm install', { stdio: 'inherit' });

  // Step 2: Build types package first
  console.log('🔧 Building types package...');
  execSync('pnpm -C packages/types build', { stdio: 'inherit' });

  // Step 3: Build SDK package
  console.log('🔧 Building SDK package...');
  execSync('pnpm -C packages/sdk build', { stdio: 'inherit' });

  // Step 4: Build web application
  console.log('🌐 Building web application...');
  execSync('pnpm -C apps/web build', { stdio: 'inherit' });

  console.log('✅ Vercel build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
