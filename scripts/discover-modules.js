#!/usr/bin/env node

/**
 * Single source of truth for "which local native modules have tests we can
 * run via `npm run test:modules`". Scans `modules/<name>/src/__tests__/`
 * and emits the names of those that exist.
 *
 * Replaces the hardcoded `MODULES=()` array previously in
 * `scripts/test-modules.sh`, which drifted from reality as new modules
 * gained tests (notably `expo-move-to-back` and `subsonic-api`, which were
 * silently invisible to the runner before Phase 9 of
 * `plans/2026-05-22-audit-remediation-roadmap.md`).
 *
 * Usage:
 *   - CLI:  `node scripts/discover-modules.js`  → one module name per line
 *   - JS:   `const { list } = require('./scripts/discover-modules.js')`
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

function list() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) =>
      fs.existsSync(path.join(MODULES_DIR, name, 'src', '__tests__')),
    )
    .sort();
}

if (require.main === module) {
  for (const m of list()) console.log(m);
}

module.exports = { list };
