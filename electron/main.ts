import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import http from 'http';
import net from 'net';
import express from 'express';
import { createExpressApp } from '../server/app.ts';

const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : (currentFilename ? path.dirname(currentFilename) : process.cwd());

let mainWindow: BrowserWindow | null = null;
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
    const staticDistPath = path.resolve(currentDirname, '..', 'dist');
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

function createWindow() {
  mainWindow = new BrowserWindow({
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

  // Handle IPC calls
  ipcMain.handle('get-api-base-url', () => backendBaseUrl);
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load URL
  if (isDev) {
    // In dev mode, Vite is running on port 3000 (or backend port)
    const devUrl = process.env.VITE_DEV_SERVER_URL || backendBaseUrl;
    console.log(`[Lbook Electron] Loading dev URL: ${devUrl}`);
    waitForHttp(`${backendBaseUrl}/api/health`, 15000)
      .then(() => {
        mainWindow?.loadURL(devUrl);
      })
      .catch((err) => {
        console.error('Failed to connect to dev server, loading fallback', err);
        mainWindow?.loadURL(devUrl);
      });
  } else {
    // In production, backend serves dist/ via backendBaseUrl
    waitForHttp(`${backendBaseUrl}/api/health`, 15000)
      .then(() => {
        mainWindow?.loadURL(backendBaseUrl);
      })
      .catch((err) => {
        console.error('Failed to connect to production internal backend:', err);
        // Fallback load file directly
        const fallbackFile = path.resolve(currentDirname, '..', 'dist', 'index.html');
        mainWindow?.loadFile(fallbackFile);
      });
  }
}

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

// Application Lifecycle
app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (err) {
    console.error('Fatal: Could not start internal backend:', err);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
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
