import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function bundleElectron() {
  console.log('⚡ Building Electron Main & Preload scripts...');

  // 1. Build Electron Main process
  await build({
    entryPoints: [path.resolve(projectRoot, 'electron/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.resolve(projectRoot, 'dist-electron/main.cjs'),
    external: [
      'electron',
      'esbuild',
      'fsevents',
    ],
    sourcemap: true,
    minify: process.env.NODE_ENV === 'production',
  });

  // 2. Build Preload script
  await build({
    entryPoints: [path.resolve(projectRoot, 'electron/preload.cjs')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.resolve(projectRoot, 'dist-electron/preload.cjs'),
    external: ['electron'],
    sourcemap: false,
    minify: process.env.NODE_ENV === 'production',
  });

  console.log('✅ Electron scripts built successfully in dist-electron/');
}

bundleElectron().catch((err) => {
  console.error('❌ Failed to bundle Electron:', err);
  process.exit(1);
});
