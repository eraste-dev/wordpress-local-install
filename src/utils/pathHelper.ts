import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper pour la gestion des chemins cross-platform
 * Assure la compatibilité Windows/Mac/Linux
 */

export class PathHelper {
  /**
   * Retourne le répertoire temporaire du système
   */
  static getTempDir(): string {
    return os.tmpdir();
  }

  /**
   * Crée un répertoire temporaire unique avec un préfixe
   */
  static createTempDir(prefix: string = 'wp-automation'): string {
    const uniqueId = uuidv4().slice(0, 8);
    return path.join(os.tmpdir(), `${prefix}-${uniqueId}`);
  }

  /**
   * Normalise un chemin pour le système courant
   */
  static normalize(filePath: string): string {
    if (!filePath) return '';
    // Convertir les séparateurs et normaliser
    return path.normalize(filePath.replace(/[\\/]+/g, path.sep));
  }

  /**
   * Joint des chemins de manière sécurisée
   */
  static join(...paths: string[]): string {
    const filtered = paths.filter(p => p && typeof p === 'string');
    return path.join(...filtered);
  }

  /**
   * Vérifie si un chemin est absolu
   */
  static isAbsolute(filePath: string): boolean {
    if (!filePath) return false;
    return path.isAbsolute(filePath);
  }

  /**
   * Résout un chemin relatif en chemin absolu
   */
  static resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  /**
   * Retourne le nom du fichier/dossier depuis un chemin
   */
  static basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  /**
   * Retourne le répertoire parent d'un chemin
   */
  static dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Retourne l'extension d'un fichier
   */
  static extname(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Vérifie si un chemin existe
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si un chemin est un répertoire
   */
  static async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si un chemin est un fichier
   */
  static async isFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Crée un répertoire et tous ses parents si nécessaire
   */
  static async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Supprime un fichier ou répertoire récursivement
   */
  static async remove(filePath: string): Promise<void> {
    await fs.remove(filePath);
  }

  /**
   * Retourne le chemin du répertoire home de l'utilisateur
   */
  static getHomeDir(): string {
    return os.homedir();
  }

  /**
   * Retourne le chemin du répertoire de configuration de l'application
   */
  static getAppConfigDir(appName: string = 'wordpress-automation'): string {
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA || os.homedir(), appName);
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
      default:
        return path.join(os.homedir(), '.config', appName);
    }
  }

  /**
   * Retourne le chemin du répertoire de logs de l'application
   */
  static getAppLogsDir(appName: string = 'wordpress-automation'): string {
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA || os.homedir(), appName, 'logs');
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Logs', appName);
      default:
        return path.join(os.homedir(), '.local', 'share', appName, 'logs');
    }
  }

  /**
   * Convertit un chemin Windows en chemin Unix (utile pour les scripts)
   */
  static toUnixPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Convertit un chemin Unix en chemin Windows
   */
  static toWindowsPath(filePath: string): string {
    return filePath.replace(/\//g, '\\');
  }

  /**
   * Retourne le chemin adapté au système courant
   */
  static toPlatformPath(filePath: string): string {
    if (process.platform === 'win32') {
      return this.toWindowsPath(filePath);
    }
    return this.toUnixPath(filePath);
  }

  /**
   * Échappe un chemin pour utilisation dans une commande shell
   */
  static escapeForShell(filePath: string): string {
    if (process.platform === 'win32') {
      // Windows: encadrer avec des guillemets
      return `"${filePath.replace(/"/g, '\\"')}"`;
    }
    // Unix: encadrer avec des guillemets simples et échapper les guillemets existants
    return `'${filePath.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Génère un nom de fichier unique pour les logs
   */
  static generateLogFileName(prefix: string = 'app'): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
    return `${prefix}-${dateStr}.log`;
  }

  /**
   * Vérifie si un chemin est à l'intérieur d'un autre (sécurité)
   */
  static isInsidePath(childPath: string, parentPath: string): boolean {
    const relative = path.relative(parentPath, childPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Retourne le séparateur de chemin du système
   */
  static get separator(): string {
    return path.sep;
  }

  /**
   * Retourne le délimiteur de PATH du système (; sur Windows, : sur Unix)
   */
  static get delimiter(): string {
    return path.delimiter;
  }
}

export default PathHelper;
