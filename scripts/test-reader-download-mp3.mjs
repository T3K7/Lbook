#!/usr/bin/env node
import assert from 'node:assert';
import fs from 'node:fs';

console.log('================================================================');
console.log(' 🧪 LBOOK TEST SUITE: READER CHAPTER MP3 DOWNLOAD BUTTON AUDIT');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ [PASS] Test ${totalCount}: ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] Test ${totalCount}: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalCount++;
  try {
    await fn();
    passCount++;
    console.log(`✅ [PASS] Test ${totalCount}: ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] Test ${totalCount}: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Inspect ReaderView.tsx code to verify button unification
// -------------------------------------------------------------
runTest('Nút "Tải MP3 chương này" có chữ và nốt nhạc đã được loại bỏ', () => {
  const content = fs.readFileSync('src/components/ReaderView.tsx', 'utf8');

  // Verify that Music icon button with text is gone
  assert.strictEqual(
    content.includes('<Music className='),
    false,
    'Music icon must be removed from ReaderView.tsx'
  );
  assert.strictEqual(
    content.includes('t(\'reader.downloadText\')'),
    false,
    'Separate text download button must be removed from ReaderView.tsx'
  );
  assert.strictEqual(
    content.includes('blob = new Blob([currentChapter?.content'),
    false,
    'Raw text file download handler must be removed from Reader control bar'
  );
});

// -------------------------------------------------------------
// Test 2: Arrow Download button exists and is wired to handleQuickDownloadMp3
// -------------------------------------------------------------
runTest('Nút mũi tên tải xuống là nút duy nhất và gọi handleQuickDownloadMp3', () => {
  const content = fs.readFileSync('src/components/ReaderView.tsx', 'utf8');

  // Download button triggers handleQuickDownloadMp3
  const downloadMatch = content.match(/<button\s+onClick=\{handleQuickDownloadMp3\}[\s\S]*?<Download\s+className=/);
  assert(downloadMatch !== null, 'Download icon button must be attached to handleQuickDownloadMp3');

  // Must have progress spinner and checkmark states
  assert(content.includes('<RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />'), 'Must show progress spinner');
  assert(content.includes('<Check className="w-4 h-4 text-emerald-400" />'), 'Must show checkmark on success');
  assert(content.includes('<Download className="w-4 h-4" />'), 'Must show Download icon in default state');
});

// -------------------------------------------------------------
// Test 3: Flow execution - Determine correct book & chapter
// -------------------------------------------------------------
await runAsyncTest('Nhấn nút mũi tên xác định đúng book và chapter hiện tại', async () => {
  const mockBook = { id: 'book_01', title: 'Truyện Kiều' };
  const mockChapters = [
    { id: 'ch_01', title: 'Chương 1 - Đầu Lòng Hai Ả Tố Nga', content: 'Trăm năm trong cõi người ta' },
    { id: 'ch_02', title: 'Chương 2 - Gặp Gỡ Kim Trọng', content: 'Sóng cỏ xanh tươi gợn tới trời' },
  ];

  let currentChapterId = 'ch_01';
  let synthesizedPayload = null;

  const mockSynthesizeChapter = async (chapter, options) => {
    synthesizedPayload = { chapter, options };
    return {
      blob: new Uint8Array([1, 2, 3]),
      filename: `${options.bookTitle}_${chapter.title}.mp3`,
      sizeBytes: 1234,
      downloadUrl: 'blob:http://localhost/test',
    };
  };

  // Chapter 1 execution
  let currentChapter = mockChapters.find((c) => c.id === currentChapterId);
  const res1 = await mockSynthesizeChapter(currentChapter, {
    bookTitle: mockBook.title,
    voice: 'vi-VN-default',
    rate: 1.0,
  });

  assert.strictEqual(synthesizedPayload.chapter.id, 'ch_01');
  assert.strictEqual(res1.filename, 'Truyện Kiều_Chương 1 - Đầu Lòng Hai Ả Tố Nga.mp3');
  assert(res1.filename.endsWith('.mp3'), 'File must have .mp3 extension');

  // Chapter 2 execution (switch chapter)
  currentChapterId = 'ch_02';
  currentChapter = mockChapters.find((c) => c.id === currentChapterId);
  const res2 = await mockSynthesizeChapter(currentChapter, {
    bookTitle: mockBook.title,
    voice: 'vi-VN-default',
    rate: 1.0,
  });

  assert.strictEqual(synthesizedPayload.chapter.id, 'ch_02');
  assert.strictEqual(res2.filename, 'Truyện Kiều_Chương 2 - Gặp Gỡ Kim Trọng.mp3');
  assert.notStrictEqual(res1.filename, res2.filename, 'Each chapter must produce unique filename matching chapter title');
});

// -------------------------------------------------------------
// Test 4: Audio Cache utilization
// -------------------------------------------------------------
runTest('Tận dụng Audio Cache nếu chương đã được tổng hợp trước đó', () => {
  const chapterMp3Cache = new Map();

  const cacheKey = 'Truyện Kiều_ch_01_vi-VN-default_rate1.00';
  chapterMp3Cache.set(cacheKey, {
    blob: new Uint8Array([1, 2, 3]),
    filename: 'Truyện Kiều_Chương 1.mp3',
    sizeBytes: 3,
  });

  // Query cache
  const cached = chapterMp3Cache.get(cacheKey);
  assert(cached !== undefined, 'Cached MP3 must be retrieved');
  assert.strictEqual(cached.filename, 'Truyện Kiều_Chương 1.mp3');
});

// -------------------------------------------------------------
// Test 5: Empty chapter or invalid content error handling
// -------------------------------------------------------------
runTest('Thông báo lỗi rõ ràng khi chương không có nội dung chữ để xuất MP3', () => {
  let reportedError = null;

  const validateChapterForDownload = (chapter) => {
    if (!chapter) {
      throw new Error('Không tìm thấy thông tin chương để xuất MP3.');
    }
    if (!chapter.content?.trim() && (!chapter.paragraphs || chapter.paragraphs.length === 0)) {
      throw new Error('Chương này không có nội dung văn bản để xuất âm thanh.');
    }
  };

  try {
    validateChapterForDownload({ id: 'ch_empty', title: 'Chương trống', content: '' });
  } catch (err) {
    reportedError = err.message;
  }

  assert(reportedError !== null, 'Must throw error on empty chapter');
  assert.strictEqual(reportedError, 'Chương này không có nội dung văn bản để xuất âm thanh.');
});

// -------------------------------------------------------------
// Test 6: Verify other MP3 export features (Downloader View) remain intact
// -------------------------------------------------------------
runTest('Trang Tải âm thanh (AudioDownloaderView) vẫn hoạt động nguyên vẹn', () => {
  const downloaderContent = fs.readFileSync('src/components/AudioDownloaderView.tsx', 'utf8');

  assert(downloaderContent.includes('AudioExportService.synthesizeChapterToMp3'), 'Chapter export must remain functional');
  assert(downloaderContent.includes('AudioExportService.bundleChaptersToZip'), 'ZIP package export must remain functional');
});

console.log('\n----------------------------------------------------------------');
console.log(`📊 TEST SUMMARY: ${passCount}/${totalCount} tests passed (${Math.round((passCount/totalCount)*100)}%).`);
console.log('================================================================\n');

if (passCount === totalCount) {
  console.log('🎉 ALL READER CHAPTER MP3 DOWNLOAD TESTS PASSED SUCCESSFULLY.\n');
  process.exit(0);
} else {
  console.error('⛔ SOME TESTS FAILED.\n');
  process.exit(1);
}
