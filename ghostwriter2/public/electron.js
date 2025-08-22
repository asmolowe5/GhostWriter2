const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const isDev = require('electron-is-dev');

let mainWindow;

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

app.whenReady().then(createWindow);

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