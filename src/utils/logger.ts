import * as fs from 'fs-extra';
import * as path from 'path';
import PathHelper from './pathHelper';

/**
 * Système de logging avec persistance fichier
 * Écrit les logs dans des fichiers rotatifs et dans la console
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  maxFiles: number;
  maxFileSize: number;
  logsDir: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private config: LoggerConfig;
  private currentLogFile: string = '';
  private currentFileSize: number = 0;
  private initialized: boolean = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.config = {
      enabled: true,
      level: 'info',
      maxFiles: 5,
      maxFileSize: 5 * 1024 * 1024, // 5 MB
      logsDir: PathHelper.getAppLogsDir()
    };
  }

  /**
   * Initialise le logger
   */
  async initialize(config?: Partial<LoggerConfig>): Promise<void> {
    if (this.initialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      await fs.ensureDir(this.config.logsDir);
      await this.rotateLogsIfNeeded();
      this.currentLogFile = path.join(
        this.config.logsDir,
        PathHelper.generateLogFileName('wordpress-automation')
      );

      // Vérifier la taille du fichier existant
      if (await fs.pathExists(this.currentLogFile)) {
        const stats = await fs.stat(this.currentLogFile);
        this.currentFileSize = stats.size;
      }

      this.initialized = true;
      this.info('LOGGER', 'Logger initialisé', { logsDir: this.config.logsDir });
    } catch (error) {
      console.error('[LOGGER] Erreur d\'initialisation:', error);
      // Logger fonctionne quand même (console seulement)
      this.initialized = true;
    }
  }

  /**
   * Configure le logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Vérifie si le niveau de log est actif
   */
  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  /**
   * Formate une entrée de log
   */
  private formatEntry(entry: LogEntry): string {
    const { timestamp, level, category, message, data } = entry;
    const levelStr = level.toUpperCase().padEnd(5);
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `${timestamp} [${levelStr}] [${category}] ${message}${dataStr}`;
  }

  /**
   * Écrit dans le fichier de log
   */
  private async writeToFile(entry: string): Promise<void> {
    if (!this.config.enabled || !this.currentLogFile) return;

    // Utiliser une queue pour éviter les écritures concurrentes
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const line = entry + '\n';
        const lineSize = Buffer.byteLength(line, 'utf8');

        // Rotation si nécessaire
        if (this.currentFileSize + lineSize > this.config.maxFileSize) {
          await this.rotateCurrentLog();
        }

        await fs.appendFile(this.currentLogFile, line, 'utf8');
        this.currentFileSize += lineSize;
      } catch (error) {
        console.error('[LOGGER] Erreur d\'écriture:', error);
      }
    });

    await this.writeQueue;
  }

  /**
   * Rotation du fichier de log courant
   */
  private async rotateCurrentLog(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedName = `wordpress-automation-${timestamp}.log`;
      const rotatedPath = path.join(this.config.logsDir, rotatedName);

      await fs.rename(this.currentLogFile, rotatedPath);
      this.currentFileSize = 0;

      // Supprimer les anciens fichiers
      await this.cleanOldLogs();
    } catch (error) {
      console.error('[LOGGER] Erreur lors de la rotation:', error);
    }
  }

  /**
   * Supprime les anciens fichiers de log
   */
  private async cleanOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.logsDir);
      const logFiles = files
        .filter(f => f.startsWith('wordpress-automation') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.config.logsDir, f)
        }));

      // Trier par date de modification (plus récent en premier)
      const sortedFiles = await Promise.all(
        logFiles.map(async f => ({
          ...f,
          mtime: (await fs.stat(f.path)).mtime.getTime()
        }))
      );
      sortedFiles.sort((a, b) => b.mtime - a.mtime);

      // Supprimer les fichiers en excès
      const filesToDelete = sortedFiles.slice(this.config.maxFiles);
      for (const file of filesToDelete) {
        await fs.remove(file.path);
        console.log('[LOGGER] Ancien fichier supprimé:', file.name);
      }
    } catch (error) {
      console.error('[LOGGER] Erreur lors du nettoyage:', error);
    }
  }

  /**
   * Vérifie et effectue la rotation des logs au démarrage
   */
  private async rotateLogsIfNeeded(): Promise<void> {
    await this.cleanOldLogs();
  }

  /**
   * Log un message
   */
  private async log(level: LogLevel, category: string, message: string, data?: unknown): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    const formatted = this.formatEntry(entry);

    // Toujours afficher dans la console
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }

    // Écrire dans le fichier si initialisé
    if (this.initialized) {
      await this.writeToFile(formatted);
    }
  }

  /**
   * Log niveau debug
   */
  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  /**
   * Log niveau info
   */
  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  /**
   * Log niveau warn
   */
  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  /**
   * Log niveau error
   */
  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  /**
   * Retourne le chemin du répertoire de logs
   */
  getLogsDir(): string {
    return this.config.logsDir;
  }

  /**
   * Retourne le chemin du fichier de log courant
   */
  getCurrentLogFile(): string {
    return this.currentLogFile;
  }

  /**
   * Lit les logs du fichier courant
   */
  async readCurrentLogs(lines: number = 100): Promise<string[]> {
    try {
      if (!await fs.pathExists(this.currentLogFile)) {
        return [];
      }

      const content = await fs.readFile(this.currentLogFile, 'utf8');
      const allLines = content.split('\n').filter(l => l.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error('[LOGGER] Erreur de lecture:', error);
      return [];
    }
  }
}

// Instance singleton
export const logger = new Logger();
export default logger;
