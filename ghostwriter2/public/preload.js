const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createNovel: (novelName) => ipcRenderer.invoke('create-novel', novelName),
  saveChapter: (novelPath, chapterNumber, content) => 
    ipcRenderer.invoke('save-chapter', novelPath, chapterNumber, content),
  loadChapter: (novelPath, chapterNumber) => 
    ipcRenderer.invoke('load-chapter', novelPath, chapterNumber),
  loadNovelMetadata: (novelPath) => 
    ipcRenderer.invoke('load-novel-metadata', novelPath),
  selectNovelFolder: () => ipcRenderer.invoke('select-novel-folder')
});