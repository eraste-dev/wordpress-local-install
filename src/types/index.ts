export interface GenerateWordPressData {
  projectName: string;
  databaseName: string;
  destinationPath: string;
}

export interface StatusUpdate {
  step: 'copy' | 'config' | 'database' | 'error';
  message: string;
  success?: boolean;
}

export interface ServiceResult {
  success: boolean;
  message?: string;
  path?: string;
  databaseName?: string;
  config?: DatabaseConfig | ConfigUpdateData;
  [key: string]: any;
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

export interface ElectronAPI {
  generateWordPress: (data: GenerateWordPressData) => Promise<ServiceResult>;
  testDbConnection: () => Promise<ServiceResult>;
  selectDirectory: () => Promise<string | null>;
  onStatusUpdate: (callback: (data: StatusUpdate) => void) => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
