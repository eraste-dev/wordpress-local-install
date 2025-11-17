import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ServiceResult } from '../types';

const execAsync = promisify(exec);

export class ExtractService {
  /**
   * Vérifie si une commande est disponible sur le système
   */
  private static async isCommandAvailable(command: string): Promise<boolean> {
    try {
      await execAsync(`which ${command}`);
      return true;
    } catch {
      return false;
    }
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
   * Extrait une archive dans un dossier temporaire
   */
  private static async extractToTemp(archivePath: string, tempDir: string): Promise<void> {
    const archiveType = this.getArchiveType(archivePath);

    if (archiveType === 'zip') {
      await execAsync(`unzip -q "${archivePath}" -d "${tempDir}"`);
    } else if (archiveType === 'rar') {
      const hasUnrar = await this.isCommandAvailable('unrar');
      if (!hasUnrar) {
        throw new Error('unrar n\'est pas installé. Installez-le avec: sudo apt-get install unrar');
      }
      await execAsync(`unrar x -idq "${archivePath}" "${tempDir}/"`);
    } else {
      throw new Error('Format d\'archive non supporté. Utilisez .zip ou .rar');
    }
  }

  /**
   * Nettoie les dossiers __MACOSX et autres fichiers système
   */
  private static async cleanSystemFiles(dir: string): Promise<void> {
    const items = await fs.readdir(dir);

    for (const item of items) {
      if (item === '__MACOSX' || item === '.DS_Store' || item.startsWith('._')) {
        await fs.remove(path.join(dir, item));
      }
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
    const dirs = [];
    const files = [];

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
    const tempDir = path.join('/tmp', `theme-extract-${Date.now()}`);

    try {
      // Vérifier que l'archive existe
      if (!await fs.pathExists(archivePath)) {
        return {
          success: false,
          message: `Archive introuvable: ${archivePath}`
        };
      }

      // Créer un dossier temporaire
      await fs.ensureDir(tempDir);

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

      return {
        success: true,
        message: `Thème "${themeName}" installé avec succès`,
        themeName
      };
    } catch (error: any) {
      // Nettoyer en cas d'erreur
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }

      return {
        success: false,
        message: `Erreur lors de l'extraction du thème: ${error.message}`
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
    const tempDir = path.join('/tmp', `plugin-extract-${Date.now()}`);

    try {
      // Vérifier que l'archive existe
      if (!await fs.pathExists(archivePath)) {
        return {
          success: false,
          message: `Archive introuvable: ${archivePath}`
        };
      }

      // Créer un dossier temporaire
      await fs.ensureDir(tempDir);

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

      return {
        success: true,
        message: `Plugin "${pluginName}" installé avec succès`,
        pluginName
      };
    } catch (error: any) {
      // Nettoyer en cas d'erreur
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }

      return {
        success: false,
        message: `Erreur lors de l'extraction du plugin: ${error.message}`
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
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur lors de l'extraction des thèmes: ${error.message}`
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
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur lors de l'extraction des plugins: ${error.message}`
      };
    }
  }
}
