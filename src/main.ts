import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import * as path from 'path';
import copyService from './services/copyService';
import configService from './services/configService';
import databaseService from './services/databaseService';
import vhostService from './services/vhostService';
import { ExtractService } from './services/extractService';
import { rollbackService } from './services/rollbackService';
import { permissionsService } from './services/permissionsService';
import { settings } from './config/settings';
import { logger } from './utils/logger';
import Validator from './utils/validator';
import PathHelper from './utils/pathHelper';
import { GenerateWordPressData, ServiceResult, DatabaseConfig, ProjectExistsResult, ProjectInfo, DeleteProjectResult } from './types';

let mainWindow: BrowserWindow | null;
let currentOperationCanceled = false;

// Initialisation asynchrone
async function initializeApp(): Promise<void> {
  logger.info('MAIN', 'Initialisation de l\'application...');

  // Initialiser les settings
  await settings.initialize();
  logger.info('MAIN', 'Configuration chargée');

  // Initialiser le logger avec les settings
  const loggingConfig = settings.getLogging();
  await logger.initialize({
    enabled: loggingConfig.enabled,
    level: loggingConfig.level,
    maxFiles: loggingConfig.maxFiles,
    maxFileSize: loggingConfig.maxFileSize,
    logsDir: settings.getPaths().logsDir
  });

  logger.info('MAIN', 'Application initialisée avec succès');
}

function createWindow(): void {
  logger.info('MAIN', 'Création de la fenêtre principale...');

  const iconPath = path.join(__dirname, '../assets/logo.png');

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    minWidth: 800,
    minHeight: 700,
    frame: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#000000',
    resizable: true,
    title: 'WordPress Automation',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 }
  });

  const htmlPath = path.join(__dirname, 'renderer', 'index.html');
  mainWindow.loadFile(htmlPath);

  if (process.argv.includes('--dev')) {
    logger.info('MAIN', 'Mode développement - ouverture des DevTools');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    logger.info('MAIN', 'Fenêtre fermée');
    mainWindow = null;
  });
}

// Fonction pour envoyer les mises à jour de progression
function sendProgress(event: IpcMainInvokeEvent, progress: number): void {
  event.sender.send('progress-update', progress);
}

// Vérification d'annulation
function checkCanceled(): boolean {
  return currentOperationCanceled;
}

app.whenReady().then(async () => {
  await initializeApp();
  createWindow();
  logger.info('MAIN', 'Application prête');
});

app.on('window-all-closed', () => {
  logger.info('MAIN', 'Toutes les fenêtres fermées');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Vérifier si un projet existe déjà
ipcMain.handle('check-project-exists', async (_event: IpcMainInvokeEvent, projectName: string, destinationPath: string): Promise<ProjectExistsResult> => {
  logger.info('IPC', 'Vérification de l\'existence du projet', { projectName, destinationPath });

  const projectPath = path.join(destinationPath, projectName);
  const exists = await PathHelper.exists(projectPath);

  return { exists, path: exists ? projectPath : undefined };
});

// Annuler l'opération en cours
ipcMain.handle('cancel-operation', async (): Promise<void> => {
  logger.warn('IPC', 'Annulation de l\'opération demandée');
  currentOperationCanceled = true;
});

// Obtenir la configuration BDD actuelle
ipcMain.handle('get-db-config', async (): Promise<DatabaseConfig> => {
  return settings.getDatabase();
});

// Mettre à jour la configuration BDD
ipcMain.handle('update-db-config', async (_event: IpcMainInvokeEvent, config: DatabaseConfig): Promise<ServiceResult> => {
  logger.info('IPC', 'Mise à jour de la configuration BDD', { host: config.host, port: config.port, user: config.user });

  try {
    // Valider la configuration
    const validation = Validator.validateDatabaseConfig(config);
    if (!validation.valid) {
      return { success: false, message: validation.error };
    }

    // Mettre à jour les settings
    await settings.updateDatabase(config);

    // Mettre à jour le service de base de données
    databaseService.setConfig(config);

    return { success: true, message: 'Configuration mise à jour' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('IPC', 'Erreur lors de la mise à jour de la config BDD', { error: errorMessage });
    return { success: false, message: errorMessage };
  }
});

// Génération WordPress avec rollback et progression
ipcMain.handle('generate-wordpress', async (event: IpcMainInvokeEvent, data: GenerateWordPressData): Promise<ServiceResult> => {
  logger.info('IPC', 'Début de la génération WordPress', data);
  currentOperationCanceled = false;

  const { projectName, databaseName, destinationPath, themesPath, pluginsPath, dbConfig } = data;

  // Validation des entrées
  const projectValidation = Validator.validateProjectName(projectName);
  if (!projectValidation.valid) {
    return { success: false, message: projectValidation.error };
  }

  const dbValidation = Validator.validateDatabaseName(databaseName);
  if (!dbValidation.valid) {
    return { success: false, message: dbValidation.error };
  }

  const pathValidation = Validator.validatePath(destinationPath);
  if (!pathValidation.valid) {
    return { success: false, message: pathValidation.error };
  }

  // Appliquer la configuration BDD si fournie
  if (dbConfig) {
    databaseService.setConfig(dbConfig);
  }

  const projectPath = path.join(destinationPath, projectName);
  const totalSteps = 3 + (themesPath ? 1 : 0) + (pluginsPath ? 1 : 0) + 1 + 1; // +1 permissions +1 vhost
  let currentStep = 0;

  // Réinitialiser le service de rollback
  rollbackService.clear();

  try {
    // Vérification de doublon
    if (await PathHelper.exists(projectPath)) {
      logger.warn('IPC', 'Le projet existe déjà', { projectPath });
      return {
        success: false,
        message: `Le projet "${projectName}" existe déjà dans ce répertoire. Veuillez choisir un autre nom ou supprimer le dossier existant.`
      };
    }

    // Step 1: Copie WordPress
    if (checkCanceled()) throw new Error('Opération annulée par l\'utilisateur');

    currentStep++;
    sendProgress(event, Math.round((currentStep / totalSteps) * 100));
    event.sender.send('status-update', { step: 'copy', message: 'Copie du dossier WordPress...', progress: 10 });

    const wordpressSourcePath = path.join(__dirname, '../assets/wordpress-base');
    logger.info('IPC', 'Copie WordPress', { source: wordpressSourcePath, destination: projectPath });

    await copyService.copyWordPress(wordpressSourcePath, projectPath);
    rollbackService.registerDirectoryCreation(projectPath);

    event.sender.send('status-update', { step: 'copy', message: 'Copie terminée avec succès.', success: true });
    logger.info('IPC', 'Copie terminée');

    // Step 2: Configuration wp-config.php
    if (checkCanceled()) throw new Error('Opération annulée par l\'utilisateur');

    currentStep++;
    sendProgress(event, Math.round((currentStep / totalSteps) * 100));
    event.sender.send('status-update', { step: 'config', message: 'Modification du wp-config.php...' });

    const configPath = path.join(projectPath, 'wp-config.php');
    await configService.updateConfig(configPath, databaseName);

    event.sender.send('status-update', { step: 'config', message: 'Configuration mise à jour.', success: true });
    logger.info('IPC', 'Configuration terminée');

    // Step 3: Création base de données
    if (checkCanceled()) throw new Error('Opération annulée par l\'utilisateur');

    currentStep++;
    sendProgress(event, Math.round((currentStep / totalSteps) * 100));
    event.sender.send('status-update', { step: 'database', message: 'Création de la base de données...' });

    const currentDbConfig = databaseService.getConfig();
    await databaseService.createDatabase(databaseName);
    rollbackService.registerDatabaseCreation(databaseName, currentDbConfig);

    event.sender.send('status-update', { step: 'database', message: 'Base de données créée avec succès.', success: true });
    logger.info('IPC', 'Base de données créée');

    // Step 4: Installation thèmes (optionnel)
    if (themesPath) {
      if (checkCanceled()) throw new Error('Opération annulée par l\'utilisateur');

      currentStep++;
      sendProgress(event, Math.round((currentStep / totalSteps) * 100));
      event.sender.send('status-update', { step: 'themes', message: 'Installation des thèmes...' });

      try {
        const themesResult = await ExtractService.extractThemesFromDirectory(themesPath, projectPath);
        event.sender.send('status-update', {
          step: 'themes',
          message: themesResult.message,
          success: themesResult.success
        });
        logger.info('IPC', 'Installation des thèmes terminée', { result: themesResult.message });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        logger.error('IPC', 'Erreur installation thèmes', { error: errorMessage });
        event.sender.send('status-update', { step: 'themes', message: `Erreur: ${errorMessage}`, success: false });
      }
    }

    // Step 5: Installation plugins (optionnel)
    if (pluginsPath) {
      if (checkCanceled()) throw new Error('Opération annulée par l\'utilisateur');

      currentStep++;
      sendProgress(event, Math.round((currentStep / totalSteps) * 100));
      event.sender.send('status-update', { step: 'plugins', message: 'Installation des plugins...' });

      try {
        const pluginsResult = await ExtractService.extractPluginsFromDirectory(pluginsPath, projectPath);
        event.sender.send('status-update', {
          step: 'plugins',
          message: pluginsResult.message,
          success: pluginsResult.success
        });
        logger.info('IPC', 'Installation des plugins terminée', { result: pluginsResult.message });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        logger.error('IPC', 'Erreur installation plugins', { error: errorMessage });
        event.sender.send('status-update', { step: 'plugins', message: `Erreur: ${errorMessage}`, success: false });
      }
    }

    // Step: Configuration des permissions
    if (checkCanceled()) throw new Error('Opération annulée par l\'utilisateur');

    currentStep++;
    sendProgress(event, Math.round((currentStep / totalSteps) * 100));
    event.sender.send('status-update', { step: 'permissions', message: 'Configuration des permissions fichiers/dossiers...' });

    const permissionsResult = await permissionsService.setWordPressPermissions(projectPath);
    event.sender.send('status-update', {
      step: 'permissions',
      message: permissionsResult.message || 'Permissions configurées.',
      success: permissionsResult.success
    });
    logger.info('IPC', 'Configuration des permissions terminée', { result: permissionsResult.message });

    // Step final: Génération vhost
    currentStep++;
    sendProgress(event, 100);

    const serverName = data.serverName || vhostService.getSuggestedServerName(projectName);
    const configs = vhostService.generateConfigs({
      projectName,
      projectPath,
      serverName
    });

    logger.info('IPC', 'Génération WordPress terminée avec succès!');

    // Effacer les actions de rollback (succès)
    rollbackService.clear();

    return {
      success: true,
      message: 'Projet WordPress généré avec succès!',
      vhostConfig: configs.vhostConfig,
      hostsEntry: configs.hostsEntry,
      serverName: serverName
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('IPC', 'Erreur lors de la génération', { error: errorMessage });

    // Exécuter le rollback
    event.sender.send('status-update', {
      step: 'rollback',
      message: 'Annulation des modifications...',
      success: false
    });

    const rollbackResult = await rollbackService.execute();

    if (!rollbackResult.success) {
      logger.error('IPC', 'Erreurs lors du rollback', { errors: rollbackResult.errors });
    }

    event.sender.send('status-update', {
      step: 'error',
      message: `Erreur: ${errorMessage}`,
      success: false
    });

    return { success: false, message: errorMessage };
  }
});

// Test connexion base de données avec config optionnelle
ipcMain.handle('test-db-connection', async (_event: IpcMainInvokeEvent, config?: DatabaseConfig): Promise<ServiceResult> => {
  logger.info('IPC', 'Test de connexion BDD');

  try {
    if (config) {
      // Tester avec une config spécifique sans modifier les settings
      const validation = Validator.validateDatabaseConfig(config);
      if (!validation.valid) {
        return { success: false, message: validation.error };
      }
      databaseService.setConfig(config);
    }

    const result = await databaseService.testConnection();
    logger.info('IPC', 'Test de connexion réussi', { message: result.message });
    return { success: true, message: result.message || 'Connexion MySQL réussie.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('IPC', 'Test de connexion échoué', { error: errorMessage });
    return { success: false, message: `Erreur de connexion: ${errorMessage}` };
  }
});

// Sélection de répertoire
ipcMain.handle('select-directory', async (): Promise<string | null> => {
  logger.debug('IPC', 'Ouverture du sélecteur de répertoire');

  if (!mainWindow) {
    logger.error('IPC', 'Fenêtre principale non disponible');
    return null;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    logger.debug('IPC', 'Sélection de répertoire annulée');
    return null;
  }

  const selectedPath = result.filePaths[0];
  logger.debug('IPC', 'Répertoire sélectionné', { path: selectedPath });
  return selectedPath;
});

// Obtenir les informations d'un projet WordPress
ipcMain.handle('get-project-info', async (_event: IpcMainInvokeEvent, projectPath: string): Promise<ProjectInfo> => {
  logger.info('IPC', 'Récupération des infos du projet', { projectPath });

  const { deleteService } = await import('./services/deleteService');

  const isValid = await deleteService.isWordPressProject(projectPath);
  const wpConfig = isValid ? await deleteService.extractWpConfig(projectPath) : null;

  return {
    path: projectPath,
    name: path.basename(projectPath),
    isValid,
    wpConfig: wpConfig || undefined
  };
});

// Supprimer un projet WordPress
ipcMain.handle('delete-project', async (event: IpcMainInvokeEvent, projectPath: string, deleteDb: boolean): Promise<DeleteProjectResult> => {
  logger.warn('IPC', 'Suppression de projet demandée', { projectPath, deleteDb });

  const { deleteService } = await import('./services/deleteService');

  event.sender.send('status-update', {
    step: 'delete',
    message: 'Suppression du projet en cours...'
  });

  const result = await deleteService.deleteProject(projectPath, deleteDb);

  event.sender.send('status-update', {
    step: 'delete',
    message: result.message,
    success: result.success
  });

  return result;
});

// Contrôles de fenêtre
ipcMain.on('window-minimize', () => {
  logger.debug('IPC', 'Réduction de la fenêtre');
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  logger.debug('IPC', 'Fermeture de la fenêtre');
  mainWindow?.close();
});
