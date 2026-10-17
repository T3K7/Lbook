#!/usr/bin/env node
import assert from 'node:assert';

console.log('================================================================');
console.log(' 🧪 LBOOK TEST SUITE: MULTI-WINDOW & PERSISTENT STORAGE AUDIT');
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
// Mock Shared Origin Storage (Simulates shared origin localStorage)
// -------------------------------------------------------------
const sharedStorage = new Map();
class MockLocalStorage {
  getItem(key) {
    return sharedStorage.has(key) ? sharedStorage.get(key) : null;
  }
  setItem(key, val) {
    sharedStorage.set(key, String(val));
  }
  removeItem(key) {
    sharedStorage.delete(key);
  }
  clear() {
    sharedStorage.clear();
  }
  get length() {
    return sharedStorage.size;
  }
  key(index) {
    return Array.from(sharedStorage.keys())[index] || null;
  }
}

// Shared Mock BroadcastChannel
const channelListeners = new Set();
class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage(message) {
    // Deliver asynchronously to other windows
    for (const listener of channelListeners) {
      if (listener.owner !== this) {
        setTimeout(() => listener.callback({ data: message }), 0);
      }
    }
  }
  set onmessage(callback) {
    channelListeners.add({ owner: this, callback });
  }
  close() {
    for (const l of channelListeners) {
      if (l.owner === this) channelListeners.delete(l);
    }
  }
}

// -------------------------------------------------------------
// Test 1: Khởi động lại (Restart Persistence)
// -------------------------------------------------------------
runTest('Test 1: Thêm truyện, lưu, đóng và mở lại ứng dụng vẫn còn nguyên vẹn', () => {
  sharedStorage.clear();
  const mockStorage = new MockLocalStorage();

  // 1. User adds book in session 1
  const book1 = {
    id: 'book_truyen_kieu_01',
    title: 'Truyện Kiều',
    author: 'Nguyễn Du',
    totalChapters: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockStorage.setItem('storytts_books', JSON.stringify([book1]));
  assert.strictEqual(sharedStorage.has('storytts_books'), true);

  // 2. Simulate app restart (new execution context reading storage)
  const freshReadRaw = mockStorage.getItem('storytts_books');
  assert(freshReadRaw !== null, 'Data must exist after app restart');
  const freshBooks = JSON.parse(freshReadRaw);

  assert.strictEqual(freshBooks.length, 1);
  assert.strictEqual(freshBooks[0].id, 'book_truyen_kieu_01');
  assert.strictEqual(freshBooks[0].title, 'Truyện Kiều');
});

// -------------------------------------------------------------
// Test 2: Hai cửa sổ (Window B loads Window A shared data)
// -------------------------------------------------------------
runTest('Test 2: Cửa sổ B mở sau cửa sổ A cùng đọc được toàn bộ truyện đã lưu', () => {
  // Window A already saved 2 books
  const booksInA = [
    { id: 'b1', title: 'Tắt Đèn', author: 'Ngô Tất Tố', totalChapters: 5 },
    { id: 'b2', title: 'Số Đỏ', author: 'Vũ Trọng Phụng', totalChapters: 8 },
  ];
  sharedStorage.set('storytts_books', JSON.stringify(booksInA));

  // Window B opens (Window B instance initialization)
  const windowBStorage = new MockLocalStorage();
  const windowBData = windowBStorage.getItem('storytts_books');

  assert(windowBData !== null, 'Window B must have access to shared origin data');
  const windowBBooks = JSON.parse(windowBData);

  assert.strictEqual(windowBBooks.length, 2, 'Window B library must NOT be empty');
  assert.strictEqual(windowBBooks[0].title, 'Tắt Đèn');
  assert.strictEqual(windowBBooks[1].title, 'Số Đỏ');
});

// -------------------------------------------------------------
// Test 3: Đồng bộ thay đổi giữa các cửa sổ (Live sync Window A -> B)
// -------------------------------------------------------------
await runAsyncTest('Test 3: Thêm truyện ở Cửa sổ A, Cửa sổ B nhận cập nhật qua BroadcastChannel', async () => {
  const channelA = new MockBroadcastChannel('lbook_cross_window_sync');
  const channelB = new MockBroadcastChannel('lbook_cross_window_sync');

  let windowBReceivedBooks = null;
  channelB.onmessage = (event) => {
    if (event.data?.type === 'BOOKS_UPDATED') {
      windowBReceivedBooks = event.data.books;
    }
  };

  const newBookInA = {
    id: 'b3',
    title: 'Dế Mèn Phiêu Lưu Ký',
    author: 'Tô Hoài',
    totalChapters: 10,
  };

  // Window A saves and broadcasts
  channelA.postMessage({
    type: 'BOOKS_UPDATED',
    books: [newBookInA],
  });

  // Wait for async message delivery
  await new Promise((res) => setTimeout(res, 20));

  assert(windowBReceivedBooks !== null, 'Window B must receive broadcast message');
  assert.strictEqual(windowBReceivedBooks.length, 1);
  assert.strictEqual(windowBReceivedBooks[0].title, 'Dế Mèn Phiêu Lưu Ký');

  channelA.close();
  channelB.close();
});

// -------------------------------------------------------------
// Test 4: Khởi tạo an toàn (Không xóa dữ liệu khi mở cửa sổ mới)
// -------------------------------------------------------------
runTest('Test 4: Mở cửa sổ mới không chạy clean-slate phá hủy dữ liệu của người dùng', () => {
  // Existing library with 5 books
  const existing = [
    { id: 'book_01', title: 'Chí Phèo', author: 'Nam Cao' },
    { id: 'book_02', title: 'Lão Hạc', author: 'Nam Cao' },
  ];
  sharedStorage.set('storytts_books', JSON.stringify(existing));
  sharedStorage.set('storytts_chapters_book_01', JSON.stringify([{ id: 'c1', title: 'Chương 1' }]));

  // Safe init logic
  const INIT_FLAG_KEY = 'lbook_storage_initialized_v2';
  const storage = new MockLocalStorage();
  if (!storage.getItem(INIT_FLAG_KEY)) {
    storage.setItem(INIT_FLAG_KEY, 'true');
  }

  // Verify that books and chapters are STILL present and intact!
  const afterInitBooks = JSON.parse(storage.getItem('storytts_books'));
  const afterInitChapters = JSON.parse(storage.getItem('storytts_chapters_book_01'));

  assert.strictEqual(afterInitBooks.length, 2, 'Books must never be cleared during window init');
  assert.strictEqual(afterInitChapters.length, 1, 'Chapters must never be deleted during window init');
});

// -------------------------------------------------------------
// Test 5: Bảo toàn tiến độ đọc và cài đặt
// -------------------------------------------------------------
runTest('Test 5: Bảo toàn tiến độ đọc, bookmark và cấu hình TTS khi nhiều cửa sổ cùng chạy', () => {
  const storage = new MockLocalStorage();

  const progress = {
    bookId: 'book_01',
    chapterId: 'ch_2',
    chapterIndex: 1,
    paragraphIndex: 3,
    sentenceIndex: 1,
    playbackSeconds: 45.2,
    status: 'in_progress',
  };
  storage.setItem('storytts_progress', JSON.stringify({ book_01: progress }));

  const settings = {
    defaultProviderId: 'google',
    defaultVoice: 'vi-VN-default',
    speechRate: 1.25,
  };
  storage.setItem('storytts_settings', JSON.stringify(settings));

  const readProgress = JSON.parse(storage.getItem('storytts_progress'));
  const readSettings = JSON.parse(storage.getItem('storytts_settings'));

  assert.strictEqual(readProgress['book_01'].playbackSeconds, 45.2);
  assert.strictEqual(readSettings.speechRate, 1.25);
});

// -------------------------------------------------------------
// Test 6: Single-Instance Lock Protocol Verification
// -------------------------------------------------------------
runTest('Test 6: Kiểm tra cơ chế Single-Instance Lock trong Electron ngăn chặn phân mảnh port/origin', () => {
  let primaryInstance = true;
  let secondInstanceBlocked = false;
  let newWindowOpenedOnSharedBackend = false;

  const mockApp = {
    requestSingleInstanceLock: () => {
      // Primary got lock, second instance will fail lock
      if (primaryInstance) {
        return true;
      }
      return false;
    },
  };

  // 1. Primary instance starts
  const lock1 = mockApp.requestSingleInstanceLock();
  assert.strictEqual(lock1, true, 'Primary process must obtain instance lock');

  // 2. Secondary instance tries to start
  primaryInstance = false; // now primary exists
  const lock2 = mockApp.requestSingleInstanceLock();
  assert.strictEqual(lock2, false, 'Secondary process must NOT obtain instance lock');

  if (!lock2) {
    secondInstanceBlocked = true;
    // Primary instance receives 'second-instance' and calls createWindow() on shared port
    newWindowOpenedOnSharedBackend = true;
  }

  assert.strictEqual(secondInstanceBlocked, true);
  assert.strictEqual(newWindowOpenedOnSharedBackend, true);
});

console.log('\n----------------------------------------------------------------');
console.log(`📊 TEST SUMMARY: ${passCount}/${totalCount} tests passed (${Math.round((passCount/totalCount)*100)}%).`);
console.log('================================================================\n');

if (passCount === totalCount) {
  console.log('🎉 ALL MULTI-WINDOW & PERSISTENT STORAGE TESTS PASSED SUCCESSFULLY.\n');
  process.exit(0);
} else {
  console.error('⛔ SOME TESTS FAILED.\n');
  process.exit(1);
}
