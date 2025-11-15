import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import copyService from './services/copyService';
import configService from './services/configService';
import databaseService from './services/databaseService';
import { GenerateWordPressData, ServiceResult } from './types';

let mainWindow: BrowserWindow | null;

function createWindow(): void {
  console.log('[MAIN] Creating main window...');

  const iconPath = path.join(__dirname, '../assets/logo.png');
  console.log('[MAIN] Icon path:', iconPath);

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Remove default title bar
    icon: iconPath, // Application icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#000000',
    resizable: true,
    title: 'WordPress Automation',
    titleBarStyle: 'hidden', // For macOS
    trafficLightPosition: { x: 10, y: 10 } // For macOS
  });

  console.log('[MAIN] Window created with dimensions: 1000x800');

  const htmlPath = path.join(__dirname, 'renderer', 'index.html');
  console.log('[MAIN] Loading HTML file from:', htmlPath);
  mainWindow.loadFile(htmlPath);

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    console.log('[MAIN] Development mode detected - opening DevTools');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    console.log('[MAIN] Window closed');
    mainWindow = null;
  });
}

console.log('[MAIN] Electron app starting...');
app.whenReady().then(() => {
  console.log('[MAIN] App is ready');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('[MAIN] All windows closed');
  if (process.platform !== 'darwin') {
    console.log('[MAIN] Quitting app (not macOS)');
    app.quit();
  }
});

app.on('activate', () => {
  console.log('[MAIN] App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('[MAIN] No windows open - creating new window');
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('generate-wordpress', async (event: IpcMainInvokeEvent, data: GenerateWordPressData): Promise<ServiceResult> => {
  console.log('[IPC] Received generate-wordpress request:', data);
  const { projectName, databaseName, destinationPath } = data;

  try {
    // Step 1: Copy WordPress base
    console.log('[IPC] Step 1: Copying WordPress files...');
    event.sender.send('status-update', { step: 'copy', message: 'Copie du dossier WordPress...' });
    const wordpressSourcePath = path.join(__dirname, '../assets/wordpress-base');
    const projectPath = path.join(destinationPath, projectName);
    console.log('[IPC] Source:', wordpressSourcePath);
    console.log('[IPC] Destination:', projectPath);

    await copyService.copyWordPress(wordpressSourcePath, projectPath);
    console.log('[IPC] Copy completed successfully');
    event.sender.send('status-update', { step: 'copy', message: 'Copie terminée avec succès.', success: true });

    // Step 2: Update wp-config.php
    console.log('[IPC] Step 2: Updating wp-config.php...');
    event.sender.send('status-update', { step: 'config', message: 'Modification du wp-config.php...' });
    const configPath = path.join(projectPath, 'wp-config.php');
    console.log('[IPC] Config path:', configPath);
    await configService.updateConfig(configPath, databaseName);
    console.log('[IPC] Config updated successfully');
    event.sender.send('status-update', { step: 'config', message: 'Configuration mise à jour.', success: true });

    // Step 3: Create MySQL database
    console.log('[IPC] Step 3: Creating database...');
    event.sender.send('status-update', { step: 'database', message: 'Création de la base de données...' });
    await databaseService.createDatabase(databaseName);
    console.log('[IPC] Database created successfully');
    event.sender.send('status-update', { step: 'database', message: 'Base de données créée avec succès.', success: true });

    console.log('[IPC] WordPress generation completed successfully!');
    return { success: true, message: 'Projet WordPress généré avec succès!' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[IPC] Error during WordPress generation:', errorMessage);
    event.sender.send('status-update', {
      step: 'error',
      message: `Erreur: ${errorMessage}`,
      success: false
    });
    return { success: false, message: errorMessage };
  }
});

// Test database connection
ipcMain.handle('test-db-connection', async (): Promise<ServiceResult> => {
  console.log('[IPC] Testing database connection...');
  try {
    const result = await databaseService.testConnection();
    console.log('[IPC] Database connection test result:', result);
    return { success: true, message: result.message || 'Connexion MySQL réussie.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[IPC] Database connection test failed:', errorMessage);
    return { success: false, message: `Erreur de connexion: ${errorMessage}` };
  }
});

// Window control handlers
ipcMain.on('window-minimize', () => {
  console.log('[IPC] Window minimize requested');
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  console.log('[IPC] Window maximize/restore requested');
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      console.log('[IPC] Window is maximized - restoring');
      mainWindow.unmaximize();
    } else {
      console.log('[IPC] Window is not maximized - maximizing');
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  console.log('[IPC] Window close requested');
  if (mainWindow) {
    mainWindow.close();
  }
});
