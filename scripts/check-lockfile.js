#!/usr/bin/env node

/**
 * Lockfile Sync Checker
 * 
 * Validates that package-lock.json is synchronized with package.json.
 * This prevents Docker build failures where `npm ci` requires exact sync.
 * 
 * Usage: bun run check:lockfile
 * Exit codes:
 *   0 - Lockfile is synchronized
 *   1 - Lockfile is out of sync (needs `npm install --package-lock-only`)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const PACKAGE_LOCK = path.join(ROOT, 'package-lock.json');

function main() {
  console.log('🔍 Checking lockfile synchronization...\n');

  // Verify files exist
  if (!fs.existsSync(PACKAGE_JSON)) {
    console.error('❌ package.json not found');
    process.exit(1);
  }

  if (!fs.existsSync(PACKAGE_LOCK)) {
    console.error('❌ package-lock.json not found');
    console.error('   Run: npm install');
    process.exit(1);
  }

  // Capture current lockfile state
  const lockfileBefore = fs.readFileSync(PACKAGE_LOCK, 'utf8');

  try {
    // Run npm install --package-lock-only (dry run that updates lockfile if needed)
    // --package-lock-only: only update package-lock.json, don't touch node_modules
    // --ignore-scripts: skip postinstall scripts for speed
    console.log('Running: npm install --package-lock-only --ignore-scripts\n');
    
    execSync('npm install --package-lock-only --ignore-scripts', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, npm_config_loglevel: 'error' }
    });

    // Check if lockfile changed
    const lockfileAfter = fs.readFileSync(PACKAGE_LOCK, 'utf8');

    if (lockfileBefore !== lockfileAfter) {
      console.error('\n❌ Lockfile is OUT OF SYNC\n');
      console.error('package-lock.json was modified by npm install.');
      console.error('This means package.json has dependencies not reflected in package-lock.json.\n');
      console.error('📋 To fix:');
      console.error('   1. Run: npm install --package-lock-only');
      console.error('   2. Commit the updated package-lock.json');
      console.error('   3. Push the changes\n');
      console.error('⚠️  Docker builds will FAIL until package-lock.json is synchronized.\n');
      
      // Restore original lockfile (don't leave it modified)
      fs.writeFileSync(PACKAGE_LOCK, lockfileBefore);
      
      process.exit(1);
    }

    console.log('✅ Lockfile is synchronized\n');
    console.log('package-lock.json matches package.json dependencies.');
    console.log('Docker builds should succeed.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error checking lockfile:\n');
    console.error(error.message);
    
    if (error.stdout) {
      console.error('\nstdout:', error.stdout.toString());
    }
    if (error.stderr) {
      console.error('\nstderr:', error.stderr.toString());
    }
    
    // Restore original lockfile
    try {
      fs.writeFileSync(PACKAGE_LOCK, lockfileBefore);
    } catch (restoreError) {
      console.error('\n⚠️  Could not restore package-lock.json');
    }
    
    process.exit(1);
  }
}

main();
