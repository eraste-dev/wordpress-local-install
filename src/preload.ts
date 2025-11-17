import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { GenerateWordPressData, ServiceResult, StatusUpdate, ElectronAPI } from './types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Generate WordPress project
  generateWordPress: (data: GenerateWordPressData): Promise<ServiceResult> =>
    ipcRenderer.invoke('generate-wordpress', data),

  // Test database connection
  testDbConnection: (): Promise<ServiceResult> =>
    ipcRenderer.invoke('test-db-connection'),

  // Select directory
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('select-directory'),

  // Listen for status updates
  onStatusUpdate: (callback: (data: StatusUpdate) => void): void => {
    ipcRenderer.on('status-update', (_event: IpcRendererEvent, data: StatusUpdate) => callback(data));
  },

  // Window controls
  minimizeWindow: (): void => {
    ipcRenderer.send('window-minimize');
  },

  maximizeWindow: (): void => {
    ipcRenderer.send('window-maximize');
  },

  closeWindow: (): void => {
    ipcRenderer.send('window-close');
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
