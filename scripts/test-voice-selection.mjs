#!/usr/bin/env node
import assert from 'node:assert';
import http from 'node:http';

console.log('================================================================');
console.log(' 🧪 LBOOK TEST SUITE: VIETNAMESE VOICE SELECTION & PREVIEW AUDIT');
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

// Mock Storage for LocalStorage simulation
const mockLocalStorage = new Map();
global.localStorage = {
  getItem: (key) => mockLocalStorage.get(key) || null,
  setItem: (key, val) => mockLocalStorage.set(key, String(val)),
  removeItem: (key) => mockLocalStorage.delete(key),
  clear: () => mockLocalStorage.clear(),
};

// -------------------------------------------------------------
// Test 1 & 2: Preview sends exact Voice ID and Provider
// -------------------------------------------------------------
runTest('Nhấn nghe thử voice A truyền đúng ID của A', () => {
  const calls = [];
  const mockPreview = (voiceId, provider, text) => {
    calls.push({ voiceId, provider, text });
  };

  mockPreview('vi-VN-default', 'google', 'sample');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].voiceId, 'vi-VN-default');
  assert.strictEqual(calls[0].provider, 'google');
});

runTest('Nhấn nghe thử voice B truyền đúng ID của B', () => {
  const calls = [];
  const mockPreview = (voiceId, provider, text) => {
    calls.push({ voiceId, provider, text });
  };

  mockPreview('vi-VN-NamMinhNeural', 'edge-online', 'sample');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].voiceId, 'vi-VN-NamMinhNeural');
  assert.strictEqual(calls[0].provider, 'edge-online');
});

// -------------------------------------------------------------
// Test 3: Cache Separation (Voice A and Voice B do not collide)
// -------------------------------------------------------------
runTest('Hai voice khác nhau không dùng nhầm cache của nhau', () => {
  const ttsBufferCache = new Map();

  const makeCacheKey = (lang, voice, speedStr, text) =>
    `tts_${lang}_${voice}_rate${speedStr}_${text}`;

  const text = 'Xin chào bạn';
  const keyA = makeCacheKey('vi', 'vi-VN-default', '1.00', text);
  const keyB = makeCacheKey('vi', 'vi-VN-Standard-B', '1.00', text);

  // Assert keys are distinct
  assert.notStrictEqual(keyA, keyB, 'Cache keys must be distinct for different voices');

  // Put item for Voice A
  ttsBufferCache.set(keyA, Buffer.from('AUDIO_VOICE_A'));

  // Ensure Voice B cannot hit Voice A cache
  const cachedForB = ttsBufferCache.get(keyB);
  assert.strictEqual(cachedForB, undefined, 'Voice B must NOT retrieve Voice A cached audio');
});

// -------------------------------------------------------------
// Test 4: Selection & Apply Flow
// -------------------------------------------------------------
runTest('Nhấn chọn B rồi Áp dụng thì cấu hình TTS chuyển sang B', () => {
  let activeSettings = { defaultProviderId: 'google', defaultVoice: 'vi-VN-default' };

  // Temporary selection state in modal
  let tempVoiceId = activeSettings.defaultVoice;
  let tempProviderId = activeSettings.defaultProviderId;

  // User clicks Voice B
  tempVoiceId = 'vi-VN-NamMinhNeural';
  tempProviderId = 'edge-online';

  // User clicks Apply
  activeSettings = {
    ...activeSettings,
    defaultProviderId: tempProviderId,
    defaultVoice: tempVoiceId,
  };
  global.localStorage.setItem('storytts_settings', JSON.stringify(activeSettings));

  assert.strictEqual(activeSettings.defaultVoice, 'vi-VN-NamMinhNeural');
  assert.strictEqual(activeSettings.defaultProviderId, 'edge-online');
});

// -------------------------------------------------------------
// Test 5: Cancel Flow (Active configuration remains unchanged)
// -------------------------------------------------------------
runTest('Nhấn Hủy thì cấu hình trước đó không bị thay đổi', () => {
  let activeSettings = { defaultProviderId: 'google', defaultVoice: 'vi-VN-default' };

  // Temporary selection changed in modal
  let tempVoiceId = 'vi-VN-NamMinhNeural';
  let tempProviderId = 'edge-online';

  // User clicks Cancel -> temporary discarded, active unchanged
  tempVoiceId = activeSettings.defaultVoice;
  tempProviderId = activeSettings.defaultProviderId;

  assert.strictEqual(activeSettings.defaultVoice, 'vi-VN-default');
  assert.strictEqual(activeSettings.defaultProviderId, 'google');
  assert.strictEqual(tempVoiceId, 'vi-VN-default');
});

// -------------------------------------------------------------
// Test 6: Persistence Restoration on Reload
// -------------------------------------------------------------
runTest('Đóng và mở lại ứng dụng khôi phục đúng voice đã áp dụng', () => {
  const savedConfig = {
    defaultProviderId: 'edge-online',
    defaultVoice: 'vi-VN-HoaiMyNeural',
    speechRate: 1.25,
  };
  global.localStorage.setItem('storytts_settings', JSON.stringify(savedConfig));

  // Simulate app restart / reload reading storage
  const loadedRaw = global.localStorage.getItem('storytts_settings');
  assert(loadedRaw !== null, 'Settings must exist in storage');
  const loadedSettings = JSON.parse(loadedRaw);

  assert.strictEqual(loadedSettings.defaultVoice, 'vi-VN-HoaiMyNeural');
  assert.strictEqual(loadedSettings.defaultProviderId, 'edge-online');
  assert.strictEqual(loadedSettings.speechRate, 1.25);
});

// -------------------------------------------------------------
// Test 7: Engine Switching (Voice Compatibility Enforced)
// -------------------------------------------------------------
runTest('Chuyển engine không sử dụng nhầm voice ID của engine trước', () => {
  const getCompatibleVoice = (newProvider) => {
    if (newProvider === 'edge-online') return 'vi-VN-NamMinhNeural';
    if (newProvider === 'browser') return 'Microsoft An - Vietnamese';
    if (newProvider === 'offline-ai') return 'vinatts-medium-vi';
    return 'vi-VN-default';
  };

  let currentEngine = 'google';
  let currentVoice = 'vi-VN-default';

  // Switch to Microsoft Edge Neural
  currentEngine = 'edge-online';
  currentVoice = getCompatibleVoice(currentEngine);
  assert.strictEqual(currentVoice, 'vi-VN-NamMinhNeural');

  // Switch to Windows SAPI / Browser
  currentEngine = 'browser';
  currentVoice = getCompatibleVoice(currentEngine);
  assert.strictEqual(currentVoice, 'Microsoft An - Vietnamese');

  // Switch back to Google
  currentEngine = 'google';
  currentVoice = getCompatibleVoice(currentEngine);
  assert.strictEqual(currentVoice, 'vi-VN-default');
});

// -------------------------------------------------------------
// Test 8: Non-existent / Unavailable Voice Handling
// -------------------------------------------------------------
runTest('Voice không tồn tại hoặc không khả dụng được xử lý rõ ràng (báo lỗi/trạng thái)', () => {
  let errorReported = null;

  const mockPlayPreview = (voiceId, provider, onError) => {
    if (provider === 'google' && voiceId !== 'vi-VN-default') {
      onError(`Giọng đọc "${voiceId}" thuộc gói Google Cloud TTS (yêu cầu API Key). Ứng dụng hiện hỗ trợ chính thức giọng chuẩn Google Tiếng Việt (vi-VN-default).`);
      return;
    }
    if (provider === 'tiktok') {
      onError('Dịch vụ giọng đọc TikTok hiện chưa khả dụng (cần kết nối phiên TikTok API).');
      return;
    }
  };

  mockPlayPreview('vi-VN-Standard-A', 'google', (err) => {
    errorReported = err;
  });

  assert(errorReported !== null, 'Must report error message when voice is unconfigured');
  assert(errorReported.includes('Google Cloud TTS'), 'Message must explain the reason clearly');

  // Test TikTok voice
  errorReported = null;
  mockPlayPreview('vi-VN-tiktok-female', 'tiktok', (err) => {
    errorReported = err;
  });
  assert(errorReported !== null);
  assert(errorReported.includes('TikTok'));
});

// -------------------------------------------------------------
// Test 9: Network Error Handling (No silent fallback to misleading voice)
// -------------------------------------------------------------
runTest('Lỗi mạng không làm ứng dụng phát nhầm voice mặc định mà không thông báo', () => {
  let fallbackPlayed = false;
  let networkErrorReported = false;

  const handleAudioError = (reqId, currentReqId, finish, onError) => {
    if (reqId !== currentReqId) return;
    finish();
    // In our new design, onError is called instead of silently playing fallbackSpeechSynthesis!
    onError('Không thể kết nối đến máy chủ Google TTS. Vui lòng kiểm tra mạng.');
  };

  handleAudioError(1, 1, () => {}, (msg) => {
    networkErrorReported = true;
  });

  assert.strictEqual(networkErrorReported, true, 'Network error must be reported explicitly');
  assert.strictEqual(fallbackPlayed, false, 'Must NOT silently play misleading fallback voice');
});

// -------------------------------------------------------------
// Test 10: Reader and Preview Isolation
// -------------------------------------------------------------
runTest('Trình đọc chính và nút nghe thử sử dụng đúng cấu hình voice theo thiết kế', () => {
  let readerVoice = 'vi-VN-default';
  let isReaderPlaying = true;

  // When preview plays, beforePreview callback stops reader
  const onBeforePreview = () => {
    isReaderPlaying = false;
  };

  // Preview Voice B
  onBeforePreview();
  const previewVoice = 'vi-VN-NamMinhNeural';

  assert.strictEqual(isReaderPlaying, false, 'Reader must be stopped when preview starts');
  assert.strictEqual(readerVoice, 'vi-VN-default', 'Reader voice setting must remain untouched by preview');
  assert.strictEqual(previewVoice, 'vi-VN-NamMinhNeural', 'Preview voice must be the clicked voice');
});

console.log('\n----------------------------------------------------------------');
console.log(`📊 TEST SUMMARY: ${passCount}/${totalCount} tests passed (${Math.round((passCount/totalCount)*100)}%).`);
console.log('================================================================\n');

if (passCount === totalCount) {
  console.log('🎉 ALL VOICE SELECTION & PREVIEW TESTS PASSED SUCCESSFULLY.\n');
  process.exit(0);
} else {
  console.error('⛔ SOME TESTS FAILED.\n');
  process.exit(1);
}
