const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createNovel: (novelName) => ipcRenderer.invoke('create-novel', novelName),
  saveChapter: (novelPath, chapterNumber, content) => 
    ipcRenderer.invoke('save-chapter', novelPath, chapterNumber, content),
  loadChapter: (novelPath, chapterNumber) => 
    ipcRenderer.invoke('load-chapter', novelPath, chapterNumber),
  loadNovelMetadata: (novelPath) => 
    ipcRenderer.invoke('load-novel-metadata', novelPath),
  selectNovelFolder: () => ipcRenderer.invoke('select-novel-folder'),
  
  // Secure API Key Storage
  storeApiKey: (provider, keyName, keyValue) => 
    ipcRenderer.invoke('store-api-key', provider, keyName, keyValue),
  retrieveApiKey: (keyId) => 
    ipcRenderer.invoke('retrieve-api-key', keyId),
  listApiKeys: () => 
    ipcRenderer.invoke('list-api-keys'),
  deleteApiKey: (keyId) => 
    ipcRenderer.invoke('delete-api-key', keyId),
  checkEncryptionAvailable: () => 
    ipcRenderer.invoke('check-encryption-available'),
  
  // Usage Tracking
  trackApiCall: (callData) => 
    ipcRenderer.invoke('track-api-call', callData),
  getUsageStats: (options) => 
    ipcRenderer.invoke('get-usage-stats', options),
  checkRateLimit: (provider) => 
    ipcRenderer.invoke('check-rate-limit', provider),
  incrementRateLimit: (provider) => 
    ipcRenderer.invoke('increment-rate-limit', provider)
});