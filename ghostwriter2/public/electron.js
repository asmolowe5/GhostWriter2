const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();
const isDev = require('electron-is-dev');

let mainWindow;
let usageDb;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': isDev
          ? ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 ws://localhost:3000"]
          : ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"]
      }
    });
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize Usage Tracking Database
function initializeUsageDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'usage-tracking.db');
  console.log('Initializing usage database at:', dbPath);
  
  usageDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening usage database:', err);
      return;
    }
    console.log('Connected to usage tracking database');
    
    // Create tables
    usageDb.serialize(() => {
      // API calls table
      usageDb.run(`
        CREATE TABLE IF NOT EXISTS api_calls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          provider TEXT NOT NULL,
          endpoint TEXT,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          cost_usd DECIMAL(10,6) DEFAULT 0,
          response_time_ms INTEGER DEFAULT 0,
          success BOOLEAN DEFAULT 1,
          error_message TEXT
        )
      `);
      
      // Daily usage summary table
      usageDb.run(`
        CREATE TABLE IF NOT EXISTS daily_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          provider TEXT NOT NULL,
          total_calls INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          total_cost_usd DECIMAL(10,6) DEFAULT 0,
          UNIQUE(date, provider)
        )
      `);
      
      // Rate limiting table
      usageDb.run(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          minute_start DATETIME NOT NULL,
          requests_count INTEGER DEFAULT 0,
          UNIQUE(provider, minute_start)
        )
      `);
      
      console.log('Usage tracking tables initialized');
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  initializeUsageDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('create-novel', async (event, novelName) => {
  try {
    // Let user choose where to save the novel
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Choose where to save your novel',
      defaultPath: path.join(app.getPath('documents'), 'GhostWriter Novels', novelName),
      properties: ['createDirectory'],
      buttonLabel: 'Create Novel Here'
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    const novelPath = result.filePath;
    
    // Create novel directory
    await fs.mkdir(novelPath, { recursive: true });
    
    // Create metadata file
    const metadata = {
      title: novelName,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      chapters: []
    };
    
    await fs.writeFile(
      path.join(novelPath, 'novel.json'),
      JSON.stringify(metadata, null, 2)
    );

    return { success: true, path: novelPath };
  } catch (error) {
    console.error('Create novel error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-chapter', async (event, novelPath, chapterNumber, content) => {
  try {
    const fileName = `chapter-${chapterNumber.toString().padStart(2, '0')}.md`;
    const filePath = path.join(novelPath, fileName);
    
    await fs.writeFile(filePath, content);

    // Update metadata
    const metadataPath = path.join(novelPath, 'novel.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    const chapterIndex = metadata.chapters.findIndex(ch => ch.number === chapterNumber);
    if (chapterIndex >= 0) {
      metadata.chapters[chapterIndex].lastModified = new Date().toISOString();
    } else {
      metadata.chapters.push({
        number: chapterNumber,
        title: `Chapter ${chapterNumber}`,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
    }
    
    metadata.lastModified = new Date().toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-chapter', async (event, novelPath, chapterNumber) => {
  try {
    const fileName = `chapter-${chapterNumber.toString().padStart(2, '0')}.md`;
    const filePath = path.join(novelPath, fileName);
    
    const content = await fs.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, content: '' }; // New chapter
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-novel-metadata', async (event, novelPath) => {
  try {
    const metadataPath = path.join(novelPath, 'novel.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    return { success: true, metadata };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-novel-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Novel Folder',
      defaultPath: path.join(app.getPath('documents'), 'GhostWriter Novels')
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Secure API Key Storage using Electron's safeStorage
ipcMain.handle('store-api-key', async (event, provider, keyName, keyValue) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }

    // Encrypt the API key
    const encryptedKey = safeStorage.encryptString(keyValue);
    
    // Store in a secure location (app data directory)
    const keysDir = path.join(app.getPath('userData'), 'secure-keys');
    await fs.mkdir(keysDir, { recursive: true });
    
    // Use provider and keyName to create unique filename
    const keyFileName = `${provider}_${keyName.replace(/[^a-zA-Z0-9]/g, '_')}.key`;
    const keyFilePath = path.join(keysDir, keyFileName);
    
    // Store encrypted key and metadata
    const keyData = {
      provider,
      keyName,
      encryptedKey: encryptedKey.toString('base64'),
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(keyFilePath, JSON.stringify(keyData), 'utf8');
    
    return { success: true, id: keyFileName };
  } catch (error) {
    console.error('Error storing API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('retrieve-api-key', async (event, keyId) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }

    const keysDir = path.join(app.getPath('userData'), 'secure-keys');
    const keyFilePath = path.join(keysDir, keyId);
    
    const keyDataJson = await fs.readFile(keyFilePath, 'utf8');
    const keyData = JSON.parse(keyDataJson);
    
    // Decrypt the API key
    const encryptedBuffer = Buffer.from(keyData.encryptedKey, 'base64');
    const decryptedKey = safeStorage.decryptString(encryptedBuffer);
    
    return { 
      success: true, 
      provider: keyData.provider,
      keyName: keyData.keyName,
      keyValue: decryptedKey,
      createdAt: keyData.createdAt
    };
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-api-keys', async () => {
  try {
    const keysDir = path.join(app.getPath('userData'), 'secure-keys');
    
    try {
      await fs.access(keysDir);
    } catch {
      // Directory doesn't exist, return empty list
      return { success: true, keys: [] };
    }
    
    const files = await fs.readdir(keysDir);
    const keyFiles = files.filter(file => file.endsWith('.key'));
    
    const keys = [];
    for (const file of keyFiles) {
      try {
        const filePath = path.join(keysDir, file);
        const keyDataJson = await fs.readFile(filePath, 'utf8');
        const keyData = JSON.parse(keyDataJson);
        
        keys.push({
          id: file,
          provider: keyData.provider,
          keyName: keyData.keyName,
          createdAt: keyData.createdAt
        });
      } catch (error) {
        console.error(`Error reading key file ${file}:`, error);
      }
    }
    
    return { success: true, keys };
  } catch (error) {
    console.error('Error listing API keys:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-api-key', async (event, keyId) => {
  try {
    const keysDir = path.join(app.getPath('userData'), 'secure-keys');
    const keyFilePath = path.join(keysDir, keyId);
    
    await fs.unlink(keyFilePath);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-encryption-available', async () => {
  return { available: safeStorage.isEncryptionAvailable() };
});

// Usage Tracking IPC Handlers
ipcMain.handle('track-api-call', async (event, callData) => {
  try {
    if (!usageDb) {
      throw new Error('Usage database not initialized');
    }

    const {
      provider,
      endpoint,
      inputTokens = 0,
      outputTokens = 0,
      costUsd = 0,
      responseTimeMs = 0,
      success = true,
      errorMessage = null
    } = callData;

    const totalTokens = inputTokens + outputTokens;

    return new Promise((resolve, reject) => {
      usageDb.run(`
        INSERT INTO api_calls (
          provider, endpoint, input_tokens, output_tokens, 
          total_tokens, cost_usd, response_time_ms, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [provider, endpoint, inputTokens, outputTokens, totalTokens, costUsd, responseTimeMs, success, errorMessage], 
      function(err) {
        if (err) {
          console.error('Error tracking API call:', err);
          reject({ success: false, error: err.message });
        } else {
          // Update daily summary
          const today = new Date().toISOString().split('T')[0];
          usageDb.run(`
            INSERT OR REPLACE INTO daily_usage (date, provider, total_calls, total_tokens, total_cost_usd)
            VALUES (?, ?, 
              COALESCE((SELECT total_calls FROM daily_usage WHERE date = ? AND provider = ?), 0) + 1,
              COALESCE((SELECT total_tokens FROM daily_usage WHERE date = ? AND provider = ?), 0) + ?,
              COALESCE((SELECT total_cost_usd FROM daily_usage WHERE date = ? AND provider = ?), 0) + ?
            )
          `, [today, provider, today, provider, today, provider, totalTokens, today, provider, costUsd],
          (err) => {
            if (err) {
              console.error('Error updating daily usage:', err);
            }
            resolve({ success: true, callId: this.lastID });
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in track-api-call:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-usage-stats', async (event, options = {}) => {
  try {
    if (!usageDb) {
      throw new Error('Usage database not initialized');
    }

    const { timeframe = 'today', provider = null } = options;
    
    return new Promise((resolve, reject) => {
      let query = '';
      let params = [];

      if (timeframe === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = `
          SELECT provider, 
                 SUM(total_calls) as total_calls,
                 SUM(total_tokens) as total_tokens,
                 SUM(total_cost_usd) as total_cost_usd
          FROM daily_usage 
          WHERE date = ?
        `;
        params = [today];
      } else if (timeframe === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query = `
          SELECT provider,
                 SUM(total_calls) as total_calls,
                 SUM(total_tokens) as total_tokens,
                 SUM(total_cost_usd) as total_cost_usd
          FROM daily_usage 
          WHERE date >= ?
        `;
        params = [weekAgo];
      } else if (timeframe === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query = `
          SELECT provider,
                 SUM(total_calls) as total_calls,
                 SUM(total_tokens) as total_tokens,
                 SUM(total_cost_usd) as total_cost_usd
          FROM daily_usage 
          WHERE date >= ?
        `;
        params = [monthAgo];
      }

      if (provider) {
        query += ' AND provider = ?';
        params.push(provider);
      }

      query += ' GROUP BY provider';

      usageDb.all(query, params, (err, rows) => {
        if (err) {
          console.error('Error getting usage stats:', err);
          reject({ success: false, error: err.message });
        } else {
          resolve({ success: true, stats: rows });
        }
      });
    });
  } catch (error) {
    console.error('Error in get-usage-stats:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-rate-limit', async (event, provider) => {
  try {
    if (!usageDb) {
      throw new Error('Usage database not initialized');
    }

    const now = new Date();
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const minuteStart = currentMinute.toISOString().slice(0, 16) + ':00.000Z';

    return new Promise((resolve, reject) => {
      // Get current minute's request count
      usageDb.get(`
        SELECT requests_count 
        FROM rate_limits 
        WHERE provider = ? AND minute_start = ?
      `, [provider, minuteStart], (err, row) => {
        if (err) {
          console.error('Error checking rate limit:', err);
          reject({ success: false, error: err.message });
        } else {
          const currentCount = row ? row.requests_count : 0;
          
          // Provider-specific rate limits (requests per minute)
          const limits = {
            'openai': 60,
            'claude': 50,
            'gemini': 60,
            'grok': 60
          };
          
          const limit = limits[provider] || 60;
          const allowed = currentCount < limit;
          
          resolve({
            success: true,
            allowed,
            currentCount,
            limit,
            resetTime: new Date(currentMinute.getTime() + 60000).toISOString()
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in check-rate-limit:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('increment-rate-limit', async (event, provider) => {
  try {
    if (!usageDb) {
      throw new Error('Usage database not initialized');
    }

    const now = new Date();
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const minuteStart = currentMinute.toISOString().slice(0, 16) + ':00.000Z';

    return new Promise((resolve, reject) => {
      usageDb.run(`
        INSERT OR REPLACE INTO rate_limits (provider, minute_start, requests_count)
        VALUES (?, ?, COALESCE((SELECT requests_count FROM rate_limits WHERE provider = ? AND minute_start = ?), 0) + 1)
      `, [provider, minuteStart, provider, minuteStart], function(err) {
        if (err) {
          console.error('Error incrementing rate limit:', err);
          reject({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    console.error('Error in increment-rate-limit:', error);
    return { success: false, error: error.message };
  }
});