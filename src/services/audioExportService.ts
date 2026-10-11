import JSZip from 'jszip';
import { Chapter, DictionaryRule } from '../types';
import { createChunksFromParagraphs } from './chunker';

export interface ChapterExportOptions {
  providerId?: string;
  voice?: string;
  rate?: number;
  bookTitle?: string;
  signal?: AbortSignal;
}

export interface ChapterProgressInfo {
  chapterId: string;
  chapterTitle: string;
  currentChunk: number;
  totalChunks: number;
  percent: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  error?: string;
}

export interface BatchExportProgressInfo {
  completedChapters: number;
  totalChapters: number;
  currentChapterTitle: string;
  overallPercent: number;
  currentChapterPercent: number;
  status: 'idle' | 'running' | 'completed' | 'paused' | 'failed' | 'canceled';
}

export interface ChapterAudioResult {
  blob: Blob;
  filename: string;
  sizeBytes: number;
  rate: number;
  voice: string;
  downloadUrl?: string;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

export class AudioExportService {
  // In-memory chunk cache differentiated by provider, voice, rate, and text
  private static audioCache = new Map<string, ArrayBuffer>();

  // In-memory full chapter audio cache differentiated by chapterId, provider, voice, and rate
  private static chapterCache = new Map<string, ChapterAudioResult>();

  // Track active blob object URLs so they are kept alive and never revoked too early
  private static activeBlobUrls: Set<string> = new Set();

  /**
   * Clears the chapter and chunk caches
   */
  static clearCache(): void {
    AudioExportService.audioCache.clear();
    AudioExportService.chapterCache.clear();
    AudioExportService.activeBlobUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    AudioExportService.activeBlobUrls.clear();
  }

  /**
   * Synthesizes an entire chapter into a single continuous MP3 file (audio/mpeg)
   * at the exact requested export rate with pitch preservation.
   */
  static async synthesizeChapterToMp3(
    chapter: Chapter,
    options: ChapterExportOptions = {},
    rules: DictionaryRule[] = [],
    onProgress?: (info: ChapterProgressInfo) => void
  ): Promise<{ blob: Blob; filename: string; sizeBytes: number; downloadUrl?: string }> {
    const {
      providerId = 'google',
      voice = 'vi-VN-default',
      rate = 1.0,
      bookTitle = 'Lbook',
      signal,
    } = options;

    if (signal?.aborted) {
      throw new Error('Đã hủy quá trình tạo audio');
    }

    const speed = typeof rate === 'number' && rate > 0 ? rate : 1.0;
    const speedStr = speed.toFixed(2);
    const chapterCacheKey = `${chapter.id}_${providerId}_${voice}_rate${speedStr}`;

    const cleanBook = sanitizeFilename(bookTitle);
    const cleanChapter = sanitizeFilename(chapter.title);
    const rateSuffix = Math.abs(speed - 1.0) >= 0.01 ? ` (${speedStr}x)` : '';
    const filename = `${cleanBook} - ${cleanChapter}${rateSuffix}.mp3`;

    // 0. Check if entire chapter was already synthesized at this exact speed and voice
    const cachedChapter = AudioExportService.chapterCache.get(chapterCacheKey);
    if (cachedChapter) {
      onProgress?.({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        currentChunk: 1,
        totalChunks: 1,
        percent: 100,
        status: 'completed',
      });
      return {
        blob: cachedChapter.blob,
        filename: cachedChapter.filename,
        sizeBytes: cachedChapter.sizeBytes,
        downloadUrl: cachedChapter.downloadUrl,
      };
    }

    // 1. Chunk chapter into TTS digestible units (max ~180 chars for optimal natural pacing)
    const chunks = createChunksFromParagraphs(chapter.id, chapter.paragraphs, rules, {
      maxCharacters: 180,
      providerId,
      voice,
    });

    if (chunks.length === 0) {
      // Fallback chunk from plain text if paragraphs were empty
      const rawText = (chapter.content || chapter.title || '').trim();
      if (!rawText) {
        throw new Error('Chương không có nội dung chữ để tạo audio');
      }
      chunks.push({
        id: `${chapter.id}_c0`,
        chapterId: chapter.id,
        paragraphIndex: 0,
        sentenceIndex: 0,
        sequence: 0,
        rawText,
        processedText: rawText,
        characterCount: rawText.length,
        status: 'Pending',
        providerId,
        voice,
      });
    }

    const totalChunks = chunks.length;
    const chunkTexts = chunks
      .map((c) => (c.processedText || c.rawText || '').trim())
      .filter((t) => t.length > 0);

    onProgress?.({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      currentChunk: 0,
      totalChunks,
      percent: 0,
      status: 'processing',
    });

    // Strategy A: High-quality server-side unified chapter export (FFmpeg concat + exact atempo filter)
    try {
      const serverExportRes = await fetch('/api/audio/export-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunks: chunkTexts,
          speed,
          filename,
          lang: 'vi',
        }),
        signal,
      });

      if (serverExportRes.ok) {
        const data = await serverExportRes.json();
        if (data.success && data.downloadUrl) {
          // Fetch the final blob for local storage and preview
          const blobRes = await fetch(data.downloadUrl, { signal });
          const finalBlob = await blobRes.blob();

          const result: ChapterAudioResult = {
            blob: finalBlob,
            filename,
            sizeBytes: finalBlob.size,
            rate: speed,
            voice,
            downloadUrl: data.downloadUrl,
          };
          AudioExportService.chapterCache.set(chapterCacheKey, result);

          onProgress?.({
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            currentChunk: totalChunks,
            totalChunks,
            percent: 100,
            status: 'completed',
          });

          return {
            blob: finalBlob,
            filename,
            sizeBytes: finalBlob.size,
            downloadUrl: data.downloadUrl,
          };
        }
      }
    } catch (serverErr: any) {
      if (signal?.aborted) throw serverErr;
      console.warn('Server-side export-chapter fallback to chunk synthesis:', serverErr);
    }

    // Strategy B: Fallback chunk-by-chunk synthesis with exact rate parameter
    const audioBuffers: ArrayBuffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) {
        onProgress?.({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          currentChunk: i,
          totalChunks,
          percent: Math.round((i / totalChunks) * 100),
          status: 'canceled',
        });
        throw new Error('Đã hủy quá trình tạo audio');
      }

      const chunk = chunks[i];
      const textToSpeak = (chunk.processedText || chunk.rawText || '').trim();
      if (!textToSpeak) continue;

      const cacheKey = `tts_${providerId}_${voice}_rate${speedStr}_${encodeURIComponent(textToSpeak)}`;
      let chunkBuffer = AudioExportService.audioCache.get(cacheKey) || null;

      if (!chunkBuffer) {
        const encodedText = encodeURIComponent(textToSpeak);
        const url = `/api/tts/google?text=${encodedText}&lang=vi&speed=${speedStr}`;

        let retries = 2;
        let lastError: Error | null = null;

        while (retries >= 0) {
          try {
            const resp = await fetch(url, { signal });
            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status}: Không thể nạp âm thanh ở tốc độ ${speedStr}x`);
            }
            chunkBuffer = await resp.arrayBuffer();
            AudioExportService.audioCache.set(cacheKey, chunkBuffer);
            break;
          } catch (err: any) {
            if (signal?.aborted) throw err;
            lastError = err;
            retries--;
            if (retries >= 0) {
              await new Promise((r) => setTimeout(r, 300));
            }
          }
        }

        if (!chunkBuffer) {
          throw (
            lastError ||
            new Error(`Không thể tạo audio ở tốc độ ${speedStr}x cho đoạn ${i + 1}`)
          );
        }
      }

      audioBuffers.push(chunkBuffer);

      const percent = Math.round(((i + 1) / totalChunks) * 100);
      onProgress?.({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        currentChunk: i + 1,
        totalChunks,
        percent,
        status: 'processing',
      });

      if (i < totalChunks - 1) {
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    const finalMp3Blob = new Blob(audioBuffers, { type: 'audio/mpeg' });

    const result: ChapterAudioResult = {
      blob: finalMp3Blob,
      filename,
      sizeBytes: finalMp3Blob.size,
      rate: speed,
      voice,
    };
    AudioExportService.chapterCache.set(chapterCacheKey, result);

    onProgress?.({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      currentChunk: totalChunks,
      totalChunks,
      percent: 100,
      status: 'completed',
    });

    return {
      blob: finalMp3Blob,
      filename,
      sizeBytes: finalMp3Blob.size,
    };
  }

  /**
   * Bundles an array of chapter MP3 blobs into a single compressed ZIP file
   */
  static async bundleChaptersToZip(
    bookTitle: string,
    items: Array<{ filename: string; blob: Blob }>,
    rate: number = 1.0,
    onZipProgress?: (percent: number) => void
  ): Promise<{ blob: Blob; filename: string }> {
    const zip = new JSZip();
    const folderName = sanitizeFilename(bookTitle);
    const folder = zip.folder(folderName) || zip;

    items.forEach((item) => {
      folder.file(item.filename, item.blob);
    });

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        mimeType: 'application/zip',
        compression: 'STORE',
      },
      (metadata) => {
        onZipProgress?.(Math.round(metadata.percent));
      }
    );

    const safeTitle = sanitizeFilename(bookTitle);
    const rateSuffix = Math.abs(rate - 1.0) >= 0.01 ? ` (${rate.toFixed(2)}x)` : '';
    const filename = `${safeTitle} - Audio MP3${rateSuffix}.zip`;

    return {
      blob: zipBlob,
      filename,
    };
  }

  /**
   * Triggers a real, guaranteed file download to the Windows PC.
   * Multi-tiered strategy:
   * 1. If server downloadUrl is already provided, opens native download directly.
   * 2. Registers Blob with server `/api/download/prepare` to receive Content-Disposition attachment headers.
   * 3. Fallback to long-lived Blob URL (5 min minimum lifetime, NEVER 1-second revoked) with synthetic click.
   */
  static async triggerDownload(
    blob: Blob,
    filename: string,
    existingUrl?: string
  ): Promise<string> {
    // 1. Direct Server URL if available
    if (existingUrl && existingUrl.startsWith('/api/download/file/')) {
      const anchor = document.createElement('a');
      anchor.href = existingUrl;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        try {
          document.body.removeChild(anchor);
        } catch {}
      }, 3000);
      return existingUrl;
    }

    // 2. Prepare file on server for Content-Disposition attachment download
    try {
      const resp = await fetch(`/api/download/prepare?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob,
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.downloadUrl) {
          const anchor = document.createElement('a');
          anchor.href = data.downloadUrl;
          anchor.download = filename;
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          setTimeout(() => {
            try {
              document.body.removeChild(anchor);
            } catch {}
          }, 3000);
          return data.downloadUrl;
        }
      }
    } catch (prepErr) {
      console.warn('Could not register file on server download endpoint, falling back to Blob URL:', prepErr);
    }

    // 3. Fallback: Long-lived Blob URL (Kept alive for 5 minutes so Windows file saving never fails)
    const blobUrl = URL.createObjectURL(blob);
    AudioExportService.activeBlobUrls.add(blobUrl);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    // Clean up DOM element, but keep URL alive for 5 minutes (300,000 ms) so Windows can finish saving
    setTimeout(() => {
      try {
        document.body.removeChild(anchor);
      } catch {}
    }, 3000);

    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
        AudioExportService.activeBlobUrls.delete(blobUrl);
      } catch {}
    }, 300000);

    return blobUrl;
  }
}
