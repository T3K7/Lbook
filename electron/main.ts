import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import http from 'http';
import net from 'net';
import express from 'express';
import { createExpressApp } from '../server/app.ts';

const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : (currentFilename ? path.dirname(currentFilename) : process.cwd());

const windows = new Set<BrowserWindow>();
let backendServer: http.Server | null = null;
let backendPort = 3000;
let backendBaseUrl = 'http://127.0.0.1:3000';

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

/**
 * Finds a free TCP port starting from preferredPort, strictly bound to loopback.
 */
function findFreePort(preferredPort = 3000): Promise<number> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => {
      // Preferred port busy, ask OS for any available dynamic port
      const randomTester = net.createServer();
      randomTester.once('listening', () => {
        const port = (randomTester.address() as net.AddressInfo).port;
        randomTester.close(() => resolve(port));
      });
      randomTester.listen(0, '127.0.0.1');
    });
    tester.once('listening', () => {
      const port = (tester.address() as net.AddressInfo).port;
      tester.close(() => resolve(port));
    });
    tester.listen(preferredPort, '127.0.0.1');
  });
}

/**
 * Starts the internal Express server strictly bound to 127.0.0.1 loopback interface.
 */
async function startBackend(): Promise<string> {
  const expressApp = createExpressApp();

  // If in production packaged mode, serve the built Vite SPA static files directly
  if (!isDev) {
    const appRoot = app.isPackaged ? app.getAppPath() : path.resolve(currentDirname, '..');
    const staticDistPath = path.resolve(appRoot, 'dist');
    expressApp.use(express.static(staticDistPath));
    expressApp.get('*', (_req, res) => {
      res.sendFile(path.resolve(staticDistPath, 'index.html'));
    });
  }

  const port = await findFreePort(isDev ? 3000 : 38240);
  backendPort = port;
  backendBaseUrl = `http://127.0.0.1:${port}`;

  return new Promise((resolve, reject) => {
    backendServer = expressApp.listen(port, '127.0.0.1', () => {
      console.log(`[Lbook Electron Backend] listening on ${backendBaseUrl}`);
      resolve(backendBaseUrl);
    });

    backendServer.on('error', (err) => {
      console.error('[Lbook Electron Backend] Failed to start:', err);
      reject(err);
    });
  });
}

/**
 * Waits for an HTTP endpoint to respond with status 200 before loading UI
 */
function waitForHttp(url: string, timeoutMs = 20000): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', retry);
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Timeout waiting for ${url}`));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Lbook - Trình Đọc & Nghe Sách Thông Minh',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.resolve(currentDirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  windows.add(win);

  win.on('closed', () => {
    windows.delete(win);
  });

  // Load URL - ALL windows load from the SAME backendBaseUrl to guarantee identical origin, localStorage & IndexedDB
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || backendBaseUrl;
    console.log(`[Lbook Electron] Loading dev URL in window: ${devUrl}`);
    waitForHttp(`${backendBaseUrl}/api/health`, 15000)
      .then(() => {
        if (!win.isDestroyed()) win.loadURL(devUrl);
      })
      .catch((err) => {
        console.error('Failed to connect to dev server, loading fallback', err);
        if (!win.isDestroyed()) win.loadURL(devUrl);
      });
  } else {
    waitForHttp(`${backendBaseUrl}/api/health`, 15000)
      .then(() => {
        if (!win.isDestroyed()) win.loadURL(backendBaseUrl);
      })
      .catch((err) => {
        console.error('Failed to connect to production internal backend:', err);
        const appRoot = app.isPackaged ? app.getAppPath() : path.resolve(currentDirname, '..');
        const fallbackFile = path.resolve(appRoot, 'dist', 'index.html');
        if (!win.isDestroyed()) win.loadFile(fallbackFile);
      });
  }

  return win;
}

// Global IPC Handlers (Registered once, dynamically resolving the calling BrowserWindow)
ipcMain.handle('get-api-base-url', () => backendBaseUrl);
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

ipcMain.on('window-new', () => {
  createWindow();
});

// Clean up background server on exit to avoid orphan processes
function cleanupBackend() {
  if (backendServer) {
    try {
      backendServer.close(() => {
        console.log('[Lbook Electron Backend] Closed successfully.');
      });
    } catch (e) {
      // ignore
    }
    backendServer = null;
  }
}

// Single Instance Lock:
// Guarantees all secondary windows created by launching the app again run in the primary instance
// and connect to the EXACT SAME loopback port, origin, session, localStorage, and IndexedDB!
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Lbook Electron] Secondary process detected. Handing over to primary instance and exiting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    console.log('[Lbook Electron] User opened second window. Creating new BrowserWindow on shared backend origin.');
    const newWin = createWindow();
    if (newWin) {
      if (newWin.isMinimized()) newWin.restore();
      newWin.focus();
    }
  });

  // Application Lifecycle
  app.whenReady().then(async () => {
    try {
      await startBackend();
    } catch (err) {
      console.error('Fatal: Could not start internal backend:', err);
    }
    createWindow();

    app.on('activate', () => {
      if (windows.size === 0) {
        createWindow();
      }
    });
  });

  app.on('before-quit', () => {
    cleanupBackend();
  });

  app.on('window-all-closed', () => {
    cleanupBackend();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
