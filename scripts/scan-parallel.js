#!/usr/bin/env node
// Small helper to run cli-scanner.js in parallel for a list of files.
// Usage: node scripts/scan-parallel.js <parallel> <artifactDir> <file1> <file2> ...
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

if (process.argv.length < 4) {
  console.error('Usage: node scan-parallel.js <parallel> <artifactDir> <file1> <file2> ...');
  process.exit(2);
}

const parallel = Math.max(1, parseInt(process.argv[2], 10) || 1);
const artifactDir = process.argv[3];
const files = process.argv.slice(4);

if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
const hrDir = path.join(artifactDir, 'hr');
if (!fs.existsSync(hrDir)) fs.mkdirSync(hrDir, { recursive: true });

let idx = 0;
let running = 0;
let failures = 0;

function runNext() {
  if (idx >= files.length) return;
  const file = files[idx++];
  running++;
  const base = path.basename(file);
  const jsonOut = path.join(artifactDir, base + '.json');
  const hrOut = path.join(hrDir, base + '.txt');

  // Run JSON output
  const p1 = spawn(process.execPath, [path.join(__dirname, '..', 'cli-scanner.js'), file, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const ws = fs.createWriteStream(jsonOut);
  p1.stdout.pipe(ws);
  let stderr = '';
  p1.stderr.on('data', d => { stderr += d.toString(); });
  p1.on('close', (code) => {
    // Run human-readable output
    const p2 = spawn(process.execPath, [path.join(__dirname, '..', 'cli-scanner.js'), file], { stdio: ['ignore', 'pipe', 'pipe'] });
    const hrWs = fs.createWriteStream(hrOut);
    p2.stdout.pipe(hrWs);
    let stderr2 = '';
    p2.stderr.on('data', d => { stderr2 += d.toString(); });
    p2.on('close', (code2) => {
      if (code !== 0 || code2 !== 0) failures++;
      running--;
      if (idx < files.length) runNext();
      else if (running === 0) {
        // done
        process.exit(failures ? 3 : 0);
      }
    });
  });
}

// Start initial workers
const start = Math.min(parallel, files.length);
for (let i = 0; i < start; i++) runNext();
