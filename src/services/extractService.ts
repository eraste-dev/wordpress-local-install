import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { ServiceResult } from '../types';
import PathHelper from '../utils/pathHelper';
import Validator from '../utils/validator';
import { logger } from '../utils/logger';

/**
 * Service d'extraction sécurisé pour les thèmes et plugins WordPress
 * Utilise spawn au lieu de exec pour éviter les injections de commandes
 */

export class ExtractService {
  /**
   * Vérifie si une commande est disponible sur le système
   */
  private static async isCommandAvailable(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const which = process.platform === 'win32' ? 'where' : 'which';
      const proc = spawn(which, [command], { stdio: 'ignore' });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Détermine le type d'archive en fonction de l'extension
   */
  private static getArchiveType(filePath: string): 'zip' | 'rar' | 'unknown' {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.zip') return 'zip';
    if (ext === '.rar') return 'rar';
    return 'unknown';
  }

  /**
   * Extrait une archive de manière sécurisée (sans injection de commandes)
   */
  private static async extractToTemp(archivePath: string, tempDir: string): Promise<void> {
    // Validation des chemins
    const archiveValidation = Validator.validatePath(archivePath);
    if (!archiveValidation.valid) {
      throw new Error(`Chemin d'archive invalide: ${archiveValidation.error}`);
    }

    const tempValidation = Validator.validatePath(tempDir);
    if (!tempValidation.valid) {
      throw new Error(`Chemin temporaire invalide: ${tempValidation.error}`);
    }

    const archiveType = this.getArchiveType(archivePath);

    return new Promise((resolve, reject) => {
      let proc;

      if (archiveType === 'zip') {
        // Utiliser spawn avec des arguments séparés (sécurisé)
        proc = spawn('unzip', ['-q', archivePath, '-d', tempDir], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else if (archiveType === 'rar') {
        // Vérifier si unrar est disponible
        this.isCommandAvailable('unrar').then((hasUnrar) => {
          if (!hasUnrar) {
            reject(new Error('unrar n\'est pas installé. Installez-le avec: sudo apt-get install unrar'));
            return;
          }
        });

        proc = spawn('unrar', ['x', '-idq', archivePath, tempDir + '/'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        reject(new Error('Format d\'archive non supporté. Utilisez .zip ou .rar'));
        return;
      }

      let stderr = '';

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          logger.info('EXTRACT', `Archive extraite avec succès`, { archivePath, tempDir });
          resolve();
        } else {
          logger.error('EXTRACT', `Échec de l'extraction`, { archivePath, code, stderr });
          reject(new Error(`Erreur d'extraction (code ${code}): ${stderr || 'Erreur inconnue'}`));
        }
      });

      proc.on('error', (error) => {
        logger.error('EXTRACT', `Erreur de processus`, { error: error.message });
        reject(new Error(`Erreur lors de l'extraction: ${error.message}`));
      });
    });
  }

  /**
   * Nettoie les dossiers __MACOSX et autres fichiers système
   */
  private static async cleanSystemFiles(dir: string): Promise<void> {
    try {
      const items = await fs.readdir(dir);
      const systemFiles = ['__MACOSX', '.DS_Store', 'Thumbs.db', 'desktop.ini'];

      for (const item of items) {
        if (systemFiles.includes(item) || item.startsWith('._')) {
          const itemPath = path.join(dir, item);
          await fs.remove(itemPath);
          logger.debug('EXTRACT', `Fichier système supprimé: ${item}`);
        }
      }
    } catch (error) {
      logger.warn('EXTRACT', `Erreur lors du nettoyage des fichiers système`, { error });
    }
  }

  /**
   * Trouve le vrai dossier contenant les fichiers du thème/plugin
   * Gère le cas où l'archive contient un dossier racine unique
   */
  private static async findContentDirectory(extractDir: string): Promise<string> {
    // Nettoyer d'abord les fichiers système
    await this.cleanSystemFiles(extractDir);

    const items = await fs.readdir(extractDir);
    const dirs: string[] = [];
    const files: string[] = [];

    for (const item of items) {
      const itemPath = path.join(extractDir, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        dirs.push(item);
      } else {
        files.push(item);
      }
    }

    // Si on a un seul dossier et aucun fichier à la racine, c'est probablement un wrapper
    if (dirs.length === 1 && files.length === 0) {
      const subDir = path.join(extractDir, dirs[0]);
      await this.cleanSystemFiles(subDir);
      return subDir;
    }

    // Sinon, le contenu est déjà à la racine
    return extractDir;
  }

  /**
   * Copie le contenu d'un dossier vers un autre en évitant les doublons
   */
  private static async copyDirectoryContent(source: string, destination: string): Promise<void> {
    const items = await fs.readdir(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      await fs.copy(sourcePath, destPath, { overwrite: false });
    }
  }

  /**
   * Extrait et installe un thème depuis une archive
   */
  static async extractTheme(
    archivePath: string,
    wordpressPath: string
  ): Promise<ServiceResult> {
    // Créer un répertoire temporaire unique
    const tempDir = PathHelper.createTempDir('theme-extract');

    try {
      // Vérifier que l'archive existe
      if (!await fs.pathExists(archivePath)) {
        return {
          success: false,
          message: `Archive introuvable: ${archivePath}`
        };
      }

      // Valider le chemin WordPress
      const wpValidation = Validator.validatePath(wordpressPath);
      if (!wpValidation.valid) {
        return {
          success: false,
          message: `Chemin WordPress invalide: ${wpValidation.error}`
        };
      }

      // Créer le dossier temporaire
      await fs.ensureDir(tempDir);
      logger.info('EXTRACT', `Extraction du thème`, { archivePath, tempDir });

      // Extraire l'archive
      await this.extractToTemp(archivePath, tempDir);

      // Trouver le vrai dossier de contenu
      const contentDir = await this.findContentDirectory(tempDir);

      // Obtenir le nom du thème
      const themeName = path.basename(contentDir);
      const themeDestination = path.join(wordpressPath, 'wp-content', 'themes', themeName);

      // Créer le dossier de destination
      await fs.ensureDir(themeDestination);

      // Copier le contenu
      await this.copyDirectoryContent(contentDir, themeDestination);

      // Nettoyer le dossier temporaire
      await fs.remove(tempDir);

      logger.info('EXTRACT', `Thème installé avec succès`, { themeName, destination: themeDestination });

      return {
        success: true,
        message: `Thème "${themeName}" installé avec succès`,
        themeName
      };
    } catch (error: unknown) {
      // Nettoyer en cas d'erreur
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }

      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('EXTRACT', `Erreur lors de l'extraction du thème`, { error: errorMessage });

      return {
        success: false,
        message: `Erreur lors de l'extraction du thème: ${errorMessage}`
      };
    }
  }

  /**
   * Extrait et installe un plugin depuis une archive
   */
  static async extractPlugin(
    archivePath: string,
    wordpressPath: string
  ): Promise<ServiceResult> {
    // Créer un répertoire temporaire unique
    const tempDir = PathHelper.createTempDir('plugin-extract');

    try {
      // Vérifier que l'archive existe
      if (!await fs.pathExists(archivePath)) {
        return {
          success: false,
          message: `Archive introuvable: ${archivePath}`
        };
      }

      // Valider le chemin WordPress
      const wpValidation = Validator.validatePath(wordpressPath);
      if (!wpValidation.valid) {
        return {
          success: false,
          message: `Chemin WordPress invalide: ${wpValidation.error}`
        };
      }

      // Créer le dossier temporaire
      await fs.ensureDir(tempDir);
      logger.info('EXTRACT', `Extraction du plugin`, { archivePath, tempDir });

      // Extraire l'archive
      await this.extractToTemp(archivePath, tempDir);

      // Trouver le vrai dossier de contenu
      const contentDir = await this.findContentDirectory(tempDir);

      // Obtenir le nom du plugin
      const pluginName = path.basename(contentDir);
      const pluginDestination = path.join(wordpressPath, 'wp-content', 'plugins', pluginName);

      // Créer le dossier de destination
      await fs.ensureDir(pluginDestination);

      // Copier le contenu
      await this.copyDirectoryContent(contentDir, pluginDestination);

      // Nettoyer le dossier temporaire
      await fs.remove(tempDir);

      logger.info('EXTRACT', `Plugin installé avec succès`, { pluginName, destination: pluginDestination });

      return {
        success: true,
        message: `Plugin "${pluginName}" installé avec succès`,
        pluginName
      };
    } catch (error: unknown) {
      // Nettoyer en cas d'erreur
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }

      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('EXTRACT', `Erreur lors de l'extraction du plugin`, { error: errorMessage });

      return {
        success: false,
        message: `Erreur lors de l'extraction du plugin: ${errorMessage}`
      };
    }
  }

  /**
   * Extrait et installe plusieurs thèmes depuis un dossier
   */
  static async extractThemesFromDirectory(
    themesDir: string,
    wordpressPath: string
  ): Promise<ServiceResult> {
    try {
      // Valider le chemin
      const validation = Validator.validatePath(themesDir);
      if (!validation.valid) {
        return {
          success: false,
          message: `Chemin de thèmes invalide: ${validation.error}`
        };
      }

      if (!await fs.pathExists(themesDir)) {
        return {
          success: false,
          message: `Dossier de thèmes introuvable: ${themesDir}`
        };
      }

      const files = await fs.readdir(themesDir);
      const archives = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.zip' || ext === '.rar';
      });

      if (archives.length === 0) {
        return {
          success: false,
          message: 'Aucune archive trouvée dans le dossier de thèmes'
        };
      }

      logger.info('EXTRACT', `Extraction de ${archives.length} thème(s)`, { themesDir });

      const results = [];
      for (const archive of archives) {
        const archivePath = path.join(themesDir, archive);
        const result = await this.extractTheme(archivePath, wordpressPath);
        results.push({ archive, ...result });
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      return {
        success: successCount > 0,
        message: `${successCount} thème(s) installé(s), ${failedCount} échec(s)`,
        results
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('EXTRACT', `Erreur lors de l'extraction des thèmes`, { error: errorMessage });

      return {
        success: false,
        message: `Erreur lors de l'extraction des thèmes: ${errorMessage}`
      };
    }
  }

  /**
   * Extrait et installe plusieurs plugins depuis un dossier
   */
  static async extractPluginsFromDirectory(
    pluginsDir: string,
    wordpressPath: string
  ): Promise<ServiceResult> {
    try {
      // Valider le chemin
      const validation = Validator.validatePath(pluginsDir);
      if (!validation.valid) {
        return {
          success: false,
          message: `Chemin de plugins invalide: ${validation.error}`
        };
      }

      if (!await fs.pathExists(pluginsDir)) {
        return {
          success: false,
          message: `Dossier de plugins introuvable: ${pluginsDir}`
        };
      }

      const files = await fs.readdir(pluginsDir);
      const archives = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.zip' || ext === '.rar';
      });

      if (archives.length === 0) {
        return {
          success: false,
          message: 'Aucune archive trouvée dans le dossier de plugins'
        };
      }

      logger.info('EXTRACT', `Extraction de ${archives.length} plugin(s)`, { pluginsDir });

      const results = [];
      for (const archive of archives) {
        const archivePath = path.join(pluginsDir, archive);
        const result = await this.extractPlugin(archivePath, wordpressPath);
        results.push({ archive, ...result });
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      return {
        success: successCount > 0,
        message: `${successCount} plugin(s) installé(s), ${failedCount} échec(s)`,
        results
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('EXTRACT', `Erreur lors de l'extraction des plugins`, { error: errorMessage });

      return {
        success: false,
        message: `Erreur lors de l'extraction des plugins: ${errorMessage}`
      };
    }
  }
}
