import fs from 'fs';
import path from 'path';

/**
 * Resolves the path to the ffmpeg executable.
 * In development, checks for bin/ffmpeg or bin/ffmpeg.exe, or falls back to system 'ffmpeg'.
 * In packaged Electron apps, checks process.resourcesPath/bin/ffmpeg.exe.
 */
export function getFfmpegPath(): string {
  // If explicitly specified by environment variable
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';

  // 1. Packaged Electron resources directory
  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    const candidatePaths = [
      path.join(resourcesPath, 'bin', binaryName),
      path.join(resourcesPath, binaryName),
      path.join(resourcesPath, 'app.asar.unpacked', 'bin', binaryName),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  // 2. Project local bin/ directory (e.g., ./bin/ffmpeg.exe or ./bin/ffmpeg)
  const localProjectBin = path.resolve(process.cwd(), 'bin', binaryName);
  if (fs.existsSync(localProjectBin)) {
    return localProjectBin;
  }

  // 3. Fallback dirname relative bin
  const relativeBin = path.resolve(__dirname, '..', 'bin', binaryName);
  if (fs.existsSync(relativeBin)) {
    return relativeBin;
  }

  // 4. Default to system ffmpeg command in PATH
  return isWindows ? 'ffmpeg.exe' : 'ffmpeg';
}
