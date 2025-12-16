import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

/**
 * Configuration centralisée de l'application
 * Gère les paramètres par défaut et la persistance des configurations utilisateur
 */

export interface AppSettings {
  database: DatabaseSettings;
  paths: PathSettings;
  logging: LoggingSettings;
}

export interface DatabaseSettings {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface PathSettings {
  tempDir: string;
  logsDir: string;
  wordpressBase: string;
}

export interface LoggingSettings {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  maxFiles: number;
  maxFileSize: number; // in bytes
}

// Chemin du fichier de configuration utilisateur
const getUserConfigPath = (): string => {
  const appName = 'wordpress-automation';
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || os.homedir(), appName, 'config.json');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName, 'config.json');
    default:
      return path.join(os.homedir(), '.config', appName, 'config.json');
  }
};

// Configuration par défaut
const getDefaultSettings = (): AppSettings => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  paths: {
    tempDir: os.tmpdir(),
    logsDir: path.join(os.homedir(), '.wordpress-automation', 'logs'),
    wordpressBase: '' // Sera défini au runtime
  },
  logging: {
    enabled: true,
    level: 'info',
    maxFiles: 5,
    maxFileSize: 5 * 1024 * 1024 // 5 MB
  }
});

class SettingsManager {
  private settings: AppSettings;
  private configPath: string;
  private initialized: boolean = false;

  constructor() {
    this.settings = getDefaultSettings();
    this.configPath = getUserConfigPath();
  }

  /**
   * Initialise le gestionnaire de configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Créer le répertoire de config si nécessaire
      await fs.ensureDir(path.dirname(this.configPath));

      // Charger la configuration utilisateur si elle existe
      if (await fs.pathExists(this.configPath)) {
        const userConfig = await fs.readJson(this.configPath);
        this.settings = this.mergeSettings(this.settings, userConfig);
        console.log('[SETTINGS] Configuration utilisateur chargée depuis:', this.configPath);
      } else {
        // Sauvegarder la configuration par défaut
        await this.save();
        console.log('[SETTINGS] Configuration par défaut créée:', this.configPath);
      }

      // Créer le répertoire de logs
      await fs.ensureDir(this.settings.paths.logsDir);

      this.initialized = true;
    } catch (error) {
      console.error('[SETTINGS] Erreur lors de l\'initialisation:', error);
      // Utiliser les paramètres par défaut en cas d'erreur
      this.initialized = true;
    }
  }

  /**
   * Fusionne les paramètres par défaut avec les paramètres utilisateur
   */
  private mergeSettings(defaults: AppSettings, userSettings: Partial<AppSettings>): AppSettings {
    return {
      database: { ...defaults.database, ...userSettings.database },
      paths: { ...defaults.paths, ...userSettings.paths },
      logging: { ...defaults.logging, ...userSettings.logging }
    };
  }

  /**
   * Récupère tous les paramètres
   */
  getAll(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Récupère les paramètres de base de données
   */
  getDatabase(): DatabaseSettings {
    return { ...this.settings.database };
  }

  /**
   * Récupère les paramètres de chemins
   */
  getPaths(): PathSettings {
    return { ...this.settings.paths };
  }

  /**
   * Récupère les paramètres de logging
   */
  getLogging(): LoggingSettings {
    return { ...this.settings.logging };
  }

  /**
   * Met à jour les paramètres de base de données
   */
  async updateDatabase(config: Partial<DatabaseSettings>): Promise<void> {
    this.settings.database = { ...this.settings.database, ...config };
    await this.save();
    console.log('[SETTINGS] Paramètres de base de données mis à jour');
  }

  /**
   * Met à jour les paramètres de chemins
   */
  async updatePaths(config: Partial<PathSettings>): Promise<void> {
    this.settings.paths = { ...this.settings.paths, ...config };
    await this.save();
    console.log('[SETTINGS] Paramètres de chemins mis à jour');
  }

  /**
   * Met à jour les paramètres de logging
   */
  async updateLogging(config: Partial<LoggingSettings>): Promise<void> {
    this.settings.logging = { ...this.settings.logging, ...config };
    await this.save();
    console.log('[SETTINGS] Paramètres de logging mis à jour');
  }

  /**
   * Sauvegarde la configuration dans le fichier
   */
  async save(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, this.settings, { spaces: 2 });
      console.log('[SETTINGS] Configuration sauvegardée');
    } catch (error) {
      console.error('[SETTINGS] Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Réinitialise les paramètres par défaut
   */
  async reset(): Promise<void> {
    this.settings = getDefaultSettings();
    await this.save();
    console.log('[SETTINGS] Configuration réinitialisée aux valeurs par défaut');
  }

  /**
   * Retourne le chemin du fichier de configuration
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

// Instance singleton
export const settings = new SettingsManager();
export default settings;
