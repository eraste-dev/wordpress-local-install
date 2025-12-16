import * as fs from 'fs-extra';
import * as path from 'path';
import { ServiceResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Service pour gérer les permissions des fichiers et dossiers WordPress
 * Permissions standards WordPress:
 * - Dossiers: 755 (rwxr-xr-x)
 * - Fichiers: 644 (rw-r--r--)
 * - wp-config.php: 640 (rw-r-----)
 */
class PermissionsService {
  // Permissions standards pour WordPress
  private readonly DIR_PERMISSIONS = 0o755;   // rwxr-xr-x
  private readonly FILE_PERMISSIONS = 0o644;  // rw-r--r--
  private readonly CONFIG_PERMISSIONS = 0o640; // rw-r----- (plus restrictif pour wp-config.php)

  /**
   * Applique les permissions correctes à un projet WordPress
   * @param projectPath - Chemin racine du projet WordPress
   */
  async setWordPressPermissions(projectPath: string): Promise<ServiceResult> {
    logger.info('PERMISSIONS', 'Début de la configuration des permissions', { projectPath });

    try {
      // Vérifier que le chemin existe
      const exists = await fs.pathExists(projectPath);
      if (!exists) {
        throw new Error(`Le chemin n'existe pas: ${projectPath}`);
      }

      let filesProcessed = 0;
      let dirsProcessed = 0;

      // Parcourir récursivement tous les fichiers et dossiers
      await this.processDirectory(projectPath, (itemPath, isDirectory) => {
        if (isDirectory) {
          dirsProcessed++;
        } else {
          filesProcessed++;
        }
      });

      // Traiter wp-config.php avec des permissions plus restrictives
      const wpConfigPath = path.join(projectPath, 'wp-config.php');
      if (await fs.pathExists(wpConfigPath)) {
        await fs.chmod(wpConfigPath, this.CONFIG_PERMISSIONS);
        logger.debug('PERMISSIONS', 'Permissions wp-config.php définies à 640');
      }

      logger.info('PERMISSIONS', 'Permissions configurées avec succès', {
        files: filesProcessed,
        directories: dirsProcessed
      });

      return {
        success: true,
        message: `Permissions configurées: ${dirsProcessed} dossiers (755), ${filesProcessed} fichiers (644)`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('PERMISSIONS', 'Erreur lors de la configuration des permissions', { error: errorMessage });
      return {
        success: false,
        message: `Erreur lors de la configuration des permissions: ${errorMessage}`
      };
    }
  }

  /**
   * Parcourt récursivement un répertoire et applique les permissions
   * @param dirPath - Chemin du répertoire à parcourir
   * @param callback - Fonction appelée pour chaque élément traité
   */
  private async processDirectory(
    dirPath: string,
    callback?: (itemPath: string, isDirectory: boolean) => void
  ): Promise<void> {
    // Définir les permissions du dossier courant
    await fs.chmod(dirPath, this.DIR_PERMISSIONS);
    callback?.(dirPath, true);

    // Lire le contenu du dossier
    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        // Récursion pour les sous-dossiers
        await this.processDirectory(itemPath, callback);
      } else {
        // Définir les permissions du fichier
        // Note: wp-config.php sera traité séparément avec des permissions plus restrictives
        if (item !== 'wp-config.php') {
          await fs.chmod(itemPath, this.FILE_PERMISSIONS);
        }
        callback?.(itemPath, false);
      }
    }
  }

  /**
   * Vérifie les permissions d'un fichier ou dossier
   * @param targetPath - Chemin à vérifier
   */
  async checkPermissions(targetPath: string): Promise<{ mode: string; octal: string }> {
    const stats = await fs.stat(targetPath);
    const mode = stats.mode;
    const octal = (mode & 0o777).toString(8);
    return { mode: mode.toString(), octal };
  }

  /**
   * Définit des permissions personnalisées sur un fichier ou dossier
   * @param targetPath - Chemin cible
   * @param permissions - Permissions en octal (ex: 0o755)
   */
  async setCustomPermissions(targetPath: string, permissions: number): Promise<ServiceResult> {
    try {
      await fs.chmod(targetPath, permissions);
      return {
        success: true,
        message: `Permissions ${permissions.toString(8)} appliquées à ${targetPath}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Erreur: ${errorMessage}`
      };
    }
  }
}

export const permissionsService = new PermissionsService();
export default permissionsService;
