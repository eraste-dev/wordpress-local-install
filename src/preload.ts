import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { GenerateWordPressData, ServiceResult, StatusUpdate, ElectronAPI, DatabaseConfig, ProjectExistsResult, ProjectInfo, DeleteProjectResult } from './types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Generate WordPress project
  generateWordPress: (data: GenerateWordPressData): Promise<ServiceResult> =>
    ipcRenderer.invoke('generate-wordpress', data),

  // Test database connection (with optional config)
  testDbConnection: (config?: DatabaseConfig): Promise<ServiceResult> =>
    ipcRenderer.invoke('test-db-connection', config),

  // Select directory
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('select-directory'),

  // Check if project already exists
  checkProjectExists: (projectName: string, destinationPath: string): Promise<ProjectExistsResult> =>
    ipcRenderer.invoke('check-project-exists', projectName, destinationPath),

  // Cancel current operation
  cancelOperation: (): Promise<void> =>
    ipcRenderer.invoke('cancel-operation'),

  // Update database configuration
  updateDbConfig: (config: DatabaseConfig): Promise<ServiceResult> =>
    ipcRenderer.invoke('update-db-config', config),

  // Get current database configuration
  getDbConfig: (): Promise<DatabaseConfig> =>
    ipcRenderer.invoke('get-db-config'),

  // Get project info (for deletion)
  getProjectInfo: (projectPath: string): Promise<ProjectInfo> =>
    ipcRenderer.invoke('get-project-info', projectPath),

  // Delete project
  deleteProject: (projectPath: string, deleteDb: boolean): Promise<DeleteProjectResult> =>
    ipcRenderer.invoke('delete-project', projectPath, deleteDb),

  // Listen for status updates
  onStatusUpdate: (callback: (data: StatusUpdate) => void): void => {
    ipcRenderer.on('status-update', (_event: IpcRendererEvent, data: StatusUpdate) => callback(data));
  },

  // Listen for progress updates
  onProgressUpdate: (callback: (progress: number) => void): void => {
    ipcRenderer.on('progress-update', (_event: IpcRendererEvent, progress: number) => callback(progress));
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
