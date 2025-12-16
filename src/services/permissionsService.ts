import * as fs from 'fs-extra';
import * as path from 'path';
import { ServiceResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Service pour gérer les permissions des fichiers et dossiers WordPress
 * Pour une installation locale (LAMPP/XAMPP), on applique 777 pour éviter les problèmes de permissions
 */
class PermissionsService {
  // Permissions pour installation locale (full access)
  private readonly LOCAL_PERMISSIONS = 0o777; // rwxrwxrwx

  /**
   * Applique les permissions 777 à un projet WordPress (installation locale)
   * @param projectPath - Chemin racine du projet WordPress
   */
  async setWordPressPermissions(projectPath: string): Promise<ServiceResult> {
    logger.info('PERMISSIONS', 'Début de la configuration des permissions (777)', { projectPath });

    try {
      // Vérifier que le chemin existe
      const exists = await fs.pathExists(projectPath);
      if (!exists) {
        throw new Error(`Le chemin n'existe pas: ${projectPath}`);
      }

      let filesProcessed = 0;
      let dirsProcessed = 0;

      // Parcourir récursivement tous les fichiers et dossiers
      await this.processDirectory(projectPath, (_itemPath, isDirectory) => {
        if (isDirectory) {
          dirsProcessed++;
        } else {
          filesProcessed++;
        }
      });

      logger.info('PERMISSIONS', 'Permissions 777 configurées avec succès', {
        files: filesProcessed,
        directories: dirsProcessed
      });

      return {
        success: true,
        message: `Permissions 777 appliquées: ${dirsProcessed} dossiers, ${filesProcessed} fichiers`
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
   * Parcourt récursivement un répertoire et applique les permissions 777
   * @param dirPath - Chemin du répertoire à parcourir
   * @param callback - Fonction appelée pour chaque élément traité
   */
  private async processDirectory(
    dirPath: string,
    callback?: (itemPath: string, isDirectory: boolean) => void
  ): Promise<void> {
    // Définir les permissions du dossier courant
    await fs.chmod(dirPath, this.LOCAL_PERMISSIONS);
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
        // Définir les permissions 777 pour tous les fichiers
        await fs.chmod(itemPath, this.LOCAL_PERMISSIONS);
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
