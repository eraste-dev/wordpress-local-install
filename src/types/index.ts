export interface GenerateWordPressData {
  projectName: string;
  databaseName: string;
  destinationPath: string;
  serverName?: string;
  themesPath?: string;
  pluginsPath?: string;
  dbConfig?: DatabaseConfig;
}

export interface StatusUpdate {
  step: 'copy' | 'config' | 'database' | 'themes' | 'plugins' | 'error' | 'rollback';
  message: string;
  success?: boolean;
  progress?: number; // Progression en pourcentage (0-100)
}

export interface ServiceResult {
  success: boolean;
  message?: string;
  path?: string;
  databaseName?: string;
  config?: DatabaseConfig | ConfigUpdateData;
  vhostConfig?: string;
  hostsEntry?: string;
  serverName?: string;
  [key: string]: unknown;
}

export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  port: number;
  database?: string;
}

export interface ConfigUpdateData {
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  dbHost?: string;
}

export interface ProjectExistsResult {
  exists: boolean;
  path?: string;
}

export interface WpConfigInfo {
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbHost: string;
  dbPrefix?: string;
}

export interface DeleteProjectResult extends ServiceResult {
  dbDeleted?: boolean;
  filesDeleted?: boolean;
  wpConfig?: WpConfigInfo;
}

export interface ProjectInfo {
  path: string;
  name: string;
  isValid: boolean;
  wpConfig?: WpConfigInfo;
}

export interface CancelableOperation {
  cancel: () => void;
  isCanceled: () => boolean;
}

export interface ElectronAPI {
  generateWordPress: (data: GenerateWordPressData) => Promise<ServiceResult>;
  testDbConnection: (config?: DatabaseConfig) => Promise<ServiceResult>;
  selectDirectory: () => Promise<string | null>;
  checkProjectExists: (projectName: string, destinationPath: string) => Promise<ProjectExistsResult>;
  cancelOperation: () => Promise<void>;
  updateDbConfig: (config: DatabaseConfig) => Promise<ServiceResult>;
  getDbConfig: () => Promise<DatabaseConfig>;
  // Delete project
  getProjectInfo: (projectPath: string) => Promise<ProjectInfo>;
  deleteProject: (projectPath: string, deleteDb: boolean) => Promise<DeleteProjectResult>;
  // Events
  onStatusUpdate: (callback: (data: StatusUpdate) => void) => void;
  onProgressUpdate: (callback: (progress: number) => void) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
