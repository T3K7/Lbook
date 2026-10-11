import express from 'express';
type Express = express.Express;
import http from 'http';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { getFfmpegPath } from './ffmpegResolver.ts';

// In-memory cache for audio chunks to avoid repetitive Google TTS calls and repetitive ffmpeg processing
const ttsBufferCache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 2000;

function setTtsCache(key: string, buffer: Buffer) {
  if (ttsBufferCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsBufferCache.keys().next().value;
    if (oldestKey) ttsBufferCache.delete(oldestKey);
  }
  ttsBufferCache.set(key, buffer);
}

function buildAtempoFilter(speed: number): string {
  let s = speed;
  const filters: number[] = [];
  while (s > 2.0) {
    filters.push(2.0);
    s /= 2.0;
  }
  while (s < 0.5) {
    filters.push(0.5);
    s /= 0.5;
  }
  filters.push(s);
  return filters.map((f) => `atempo=${f.toFixed(4)}`).join(',');
}

function applyTempoToMp3Buffer(inputBuffer: Buffer, speed: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const atempoFilter = buildAtempoFilter(speed);
    const ffmpegCmd = getFfmpegPath();
    const ffmpeg = spawn(ffmpegCmd, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-filter:a',
      atempoFilter,
      '-f',
      'mp3',
      'pipe:1',
    ]);

    const outputChunks: Buffer[] = [];
    let errOutput = '';

    ffmpeg.stdout.on('data', (chunk) => outputChunks.push(chunk));
    ffmpeg.stderr.on('data', (err) => {
      errOutput += err.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(outputChunks));
      } else {
        reject(new Error(`FFmpeg error (code ${code}): ${errOutput}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error (${ffmpegCmd}): ${err.message}`));
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

function fetchGoogleTtsBaseBuffer(text: string, lang: string): Promise<Buffer> {
  const baseKey = `base_${lang}_${text}`;
  const cached = ttsBufferCache.get(baseKey);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      lang
    )}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;

    https
      .get(
        googleTtsUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://translate.google.com/',
          },
        },
        (proxyRes) => {
          if (proxyRes.statusCode !== 200) {
            reject(new Error(`Google TTS fetch failed with status ${proxyRes.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          proxyRes.on('data', (chunk) => chunks.push(chunk));
          proxyRes.on('end', () => {
            const buf = Buffer.concat(chunks);
            setTtsCache(baseKey, buf);
            resolve(buf);
          });
          proxyRes.on('error', reject);
        }
      )
      .on('error', reject);
  });
}

// Download Store to guarantee physical file downloads to Windows
interface DownloadItem {
  id: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
}

const downloadStore = new Map<string, DownloadItem>();

// Clean up files older than 2 hours periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, item] of downloadStore.entries()) {
    if (now - item.createdAt > 7200_000) {
      downloadStore.delete(id);
    }
  }
}, 300_000);

function stitchAndExportChapterMp3(inputBuffer: Buffer, speed: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const isNormalSpeed = Math.abs(speed - 1.0) < 0.01;
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
    ];

    if (!isNormalSpeed) {
      const atempoFilter = buildAtempoFilter(speed);
      args.push('-filter:a', atempoFilter);
    }

    // Always re-encode to clean, standardized 128k 44.1kHz CBR MP3 with unified duration headers
    args.push('-b:a', '128k', '-ar', '44100', '-f', 'mp3', 'pipe:1');

    const ffmpegCmd = getFfmpegPath();
    const ffmpeg = spawn(ffmpegCmd, args);
    const outputChunks: Buffer[] = [];
    let errOutput = '';

    ffmpeg.stdout.on('data', (chunk) => outputChunks.push(chunk));
    ffmpeg.stderr.on('data', (err) => {
      errOutput += err.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(outputChunks));
      } else {
        reject(new Error(`FFmpeg stitching error (code ${code}): ${errOutput}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error (${ffmpegCmd}): ${err.message}`));
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

export function createExpressApp(): Express {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // CORS and Loopback security header: ensure desktop renderer can access API smoothly
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      ffmpegPath: getFfmpegPath(),
      timestamp: Date.now(),
    });
  });

  // Google TTS streaming proxy with real FFmpeg atempo speed processing
  app.get('/api/tts/google', async (req, res) => {
    const text = ((req.query.text as string) || (req.query.q as string) || '').trim();
    const lang = (req.query.lang as string) || (req.query.tl as string) || 'vi';
    const rawSpeed = parseFloat((req.query.speed as string) || (req.query.rate as string) || '1.0');
    const speed = isNaN(rawSpeed) || rawSpeed <= 0 ? 1.0 : rawSpeed;

    if (!text) {
      res.status(400).send('Text parameter is required');
      return;
    }

    const speedStr = speed.toFixed(2);
    const cacheKey = `tts_${lang}_rate${speedStr}_${text}`;

    // 1. Check if processed audio for this speed is already in cache
    const cached = ttsBufferCache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Audio-Speed', speedStr);
      res.setHeader('X-Cache', 'HIT');
      res.send(cached);
      return;
    }

    try {
      // 2. Fetch or retrieve 1.0x base audio
      const baseBuffer = await fetchGoogleTtsBaseBuffer(text, lang);

      // 3. If speed is 1.0x, return directly
      if (Math.abs(speed - 1.0) < 0.01) {
        setTtsCache(cacheKey, baseBuffer);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Audio-Speed', speedStr);
        res.setHeader('X-Cache', 'MISS');
        res.send(baseBuffer);
        return;
      }

      // 4. Time-stretch / tempo processing via FFmpeg WSOLA atempo filter
      const speedBuffer = await applyTempoToMp3Buffer(baseBuffer, speed);
      setTtsCache(cacheKey, speedBuffer);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Audio-Speed', speedStr);
      res.setHeader('X-Cache', 'MISS');
      res.send(speedBuffer);
    } catch (err: any) {
      console.error('Error generating TTS with speed:', err);
      res.status(500).send(`TTS error: ${err.message}`);
    }
  });

  // Endpoint to prepare any client-side generated Blob/Buffer for direct file download
  app.post(
    '/api/download/prepare',
    express.raw({ type: ['*/*'], limit: '200mb' }),
    (req, res) => {
      const filename = (req.query.filename as string) || 'audio.mp3';
      const mimeType =
        (req.query.mimeType as string) ||
        (filename.endsWith('.zip') ? 'application/zip' : 'audio/mpeg');

      const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const buf = req.body as Buffer;

      if (!buf || buf.length === 0) {
        res.status(400).json({ error: 'Dữ liệu file không được để trống' });
        return;
      }

      downloadStore.set(id, {
        id,
        filename,
        buffer: buf,
        mimeType,
        createdAt: Date.now(),
      });

      res.json({
        success: true,
        downloadId: id,
        downloadUrl: `/api/download/file/${id}`,
        filename,
        sizeBytes: buf.length,
      });
    }
  );

  // Native File Download Endpoint with Content-Disposition attachment headers
  app.get('/api/download/file/:id', (req, res) => {
    const id = req.params.id;
    const item = downloadStore.get(id);

    if (!item) {
      res.status(404).send('Tệp tải xuống đã hết hạn hoặc không tồn tại. Vui lòng thử tải lại.');
      return;
    }

    const rawFilename = (item.filename || 'audio.mp3').replace(/[\r\n"]/g, '_');
    const asciiFilename = rawFilename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\;]/g, '_');

    const encodedFilename = encodeURIComponent(rawFilename);

    res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Length', item.buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(item.buffer);
  });

  // High-speed Chapter Audio Synthesis & Export Endpoint
  app.post('/api/audio/export-chapter', async (req, res) => {
    try {
      const {
        chunks = [],
        speed = 1.0,
        filename = 'chapter.mp3',
        lang = 'vi',
      } = req.body;

      if (!Array.isArray(chunks) || chunks.length === 0) {
        res.status(400).json({ error: 'Danh sách đoạn văn bản (chunks) không được để trống' });
        return;
      }

      const exportSpeed = typeof speed === 'number' && speed > 0 ? speed : 1.0;
      const speedStr = exportSpeed.toFixed(2);

      // 1. Fetch all base audio chunks sequentially/batched
      const rawBuffers: Buffer[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const text = String(chunks[i] || '').trim();
        if (!text) continue;
        const buf = await fetchGoogleTtsBaseBuffer(text, lang);
        rawBuffers.push(buf);
      }

      if (rawBuffers.length === 0) {
        res.status(400).json({ error: 'Không thể tạo âm thanh cho các đoạn văn bản' });
        return;
      }

      // 2. Stitch and apply exact atempo speed via FFmpeg in one single unified pass
      const combinedBase = Buffer.concat(rawBuffers);
      const finalMp3Buffer = await stitchAndExportChapterMp3(combinedBase, exportSpeed);

      // 3. Register in downloadStore so user can download directly
      const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      downloadStore.set(id, {
        id,
        filename,
        buffer: finalMp3Buffer,
        mimeType: 'audio/mpeg',
        createdAt: Date.now(),
      });

      res.json({
        success: true,
        downloadId: id,
        downloadUrl: `/api/download/file/${id}`,
        filename,
        sizeBytes: finalMp3Buffer.length,
        speed: exportSpeed,
        speedLabel: `${speedStr}x`,
      });
    } catch (err: any) {
      console.error('Lỗi xuất chapter MP3:', err);
      res.status(500).json({ error: `Lỗi xuất chapter MP3: ${err.message}` });
    }
  });

  // Endpoint to check available built releases
  app.get('/api/release/info', (_req, res) => {
    try {
      const releaseDir = path.resolve(process.cwd(), 'release');
      if (!fs.existsSync(releaseDir)) {
        res.json({ available: false, files: [] });
        return;
      }
      const files = fs.readdirSync(releaseDir).map((filename) => {
        const filePath = path.join(releaseDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          sizeBytes: stats.size,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(1),
          modifiedTime: stats.mtime,
          isDir: stats.isDirectory(),
        };
      }).filter((f) => !f.isDir && !f.filename.endsWith('.yml') && !f.filename.endsWith('.7z'));

      res.json({
        available: files.length > 0,
        files,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Endpoint to stream and download release artifacts directly
  app.get('/api/release/download/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      // Sanitize filename to prevent directory traversal
      const safeFilename = path.basename(filename);
      const filePath = path.resolve(process.cwd(), 'release', safeFilename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: `File không tồn tại: ${safeFilename}` });
        return;
      }

      res.download(filePath, safeFilename);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}
