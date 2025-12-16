import * as fs from 'fs-extra';
import * as path from 'path';
import { ServiceResult, DatabaseConfig } from '../types';
import { logger } from '../utils/logger';
import PathHelper from '../utils/pathHelper';
import databaseService from './databaseService';

/**
 * Service de suppression de projet WordPress
 * Lit le wp-config.php pour extraire les infos de BDD et supprime le projet
 */

export interface WpConfigInfo {
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbHost: string;
  dbPrefix?: string;
}

export interface DeleteProjectResult extends ServiceResult {
  dbDeleted?: boolean;
  filesDeleted?: boolean;
  wpConfig?: WpConfigInfo;
}

class DeleteService {
  /**
   * Extrait les informations de base de données depuis wp-config.php
   */
  async extractWpConfig(projectPath: string): Promise<WpConfigInfo | null> {
    const configPath = path.join(projectPath, 'wp-config.php');

    try {
      // Vérifier que le fichier existe
      if (!await fs.pathExists(configPath)) {
        logger.warn('DELETE', 'wp-config.php introuvable', { projectPath });
        return null;
      }

      const content = await fs.readFile(configPath, 'utf8');

      // Extraire les constantes de configuration
      const dbName = this.extractDefine(content, 'DB_NAME');
      const dbUser = this.extractDefine(content, 'DB_USER');
      const dbPassword = this.extractDefine(content, 'DB_PASSWORD');
      const dbHost = this.extractDefine(content, 'DB_HOST');
      const dbPrefix = this.extractTablePrefix(content);

      if (!dbName) {
        logger.warn('DELETE', 'DB_NAME non trouvé dans wp-config.php');
        return null;
      }

      logger.info('DELETE', 'Configuration extraite', { dbName, dbUser, dbHost, dbPrefix });

      return {
        dbName,
        dbUser: dbUser || 'root',
        dbPassword: dbPassword || '',
        dbHost: dbHost || 'localhost',
        dbPrefix: dbPrefix || undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('DELETE', 'Erreur lors de la lecture de wp-config.php', { error: errorMessage });
      return null;
    }
  }

  /**
   * Extrait la valeur d'une constante define() du wp-config.php
   */
  private extractDefine(content: string, constant: string): string | null {
    // Pattern pour capturer: define( 'CONSTANT', 'value' );
    const patterns = [
      new RegExp(`define\\s*\\(\\s*['"]${constant}['"]\\s*,\\s*['"]([^'"]*)['""]\\s*\\)`, 'i'),
      new RegExp(`define\\s*\\(\\s*'${constant}'\\s*,\\s*'([^']*)'\\s*\\)`, 'i'),
      new RegExp(`define\\s*\\(\\s*"${constant}"\\s*,\\s*"([^"]*)"\\s*\\)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1] !== undefined) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extrait le préfixe de table
   */
  private extractTablePrefix(content: string): string | null {
    const match = content.match(/\$table_prefix\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  /**
   * Vérifie si un chemin est un projet WordPress valide
   */
  async isWordPressProject(projectPath: string): Promise<boolean> {
    const requiredFiles = ['wp-config.php', 'wp-content', 'wp-includes'];

    for (const file of requiredFiles) {
      const filePath = path.join(projectPath, file);
      if (!await fs.pathExists(filePath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Supprime la base de données associée au projet
   */
  async deleteDatabase(wpConfig: WpConfigInfo): Promise<ServiceResult> {
    try {
      // Configurer le service de base de données avec les credentials du wp-config
      const dbConfig: DatabaseConfig = {
        host: wpConfig.dbHost,
        user: wpConfig.dbUser,
        password: wpConfig.dbPassword,
        port: 3306
      };

      // Extraire le port si spécifié dans l'hôte (ex: localhost:3307)
      if (wpConfig.dbHost.includes(':')) {
        const [host, portStr] = wpConfig.dbHost.split(':');
        dbConfig.host = host;
        dbConfig.port = parseInt(portStr, 10) || 3306;
      }

      databaseService.setConfig(dbConfig);

      // Vérifier que la base existe
      const exists = await databaseService.databaseExists(wpConfig.dbName);
      if (!exists) {
        logger.info('DELETE', 'Base de données inexistante', { dbName: wpConfig.dbName });
        return { success: true, message: 'Base de données inexistante (déjà supprimée)' };
      }

      // Supprimer la base de données
      await databaseService.dropDatabase(wpConfig.dbName);

      logger.info('DELETE', 'Base de données supprimée', { dbName: wpConfig.dbName });
      return { success: true, message: `Base de données "${wpConfig.dbName}" supprimée` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('DELETE', 'Erreur lors de la suppression de la BDD', { error: errorMessage });
      return { success: false, message: `Erreur: ${errorMessage}` };
    }
  }

  /**
   * Supprime les fichiers du projet
   */
  async deleteProjectFiles(projectPath: string): Promise<ServiceResult> {
    try {
      // Vérifications de sécurité
      const normalizedPath = PathHelper.normalize(projectPath);

      // Ne pas supprimer les répertoires système
      const protectedPaths = ['/', '/home', '/root', '/etc', '/var', '/usr', '/opt'];
      if (protectedPaths.includes(normalizedPath)) {
        return { success: false, message: 'Impossible de supprimer un répertoire système' };
      }

      // Vérifier que c'est bien un projet WordPress
      const isWp = await this.isWordPressProject(projectPath);
      if (!isWp) {
        return { success: false, message: 'Ce n\'est pas un projet WordPress valide' };
      }

      // Supprimer le répertoire
      await fs.remove(projectPath);

      logger.info('DELETE', 'Fichiers du projet supprimés', { projectPath });
      return { success: true, message: 'Fichiers supprimés avec succès' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('DELETE', 'Erreur lors de la suppression des fichiers', { error: errorMessage });
      return { success: false, message: `Erreur: ${errorMessage}` };
    }
  }

  /**
   * Supprime un projet WordPress complet (BDD + fichiers)
   */
  async deleteProject(projectPath: string, deleteDb: boolean = true): Promise<DeleteProjectResult> {
    logger.info('DELETE', 'Début de la suppression du projet', { projectPath, deleteDb });

    // Vérifier que le projet existe
    if (!await fs.pathExists(projectPath)) {
      return {
        success: false,
        message: 'Le projet n\'existe pas',
        dbDeleted: false,
        filesDeleted: false
      };
    }

    // Vérifier que c'est un projet WordPress
    const isWp = await this.isWordPressProject(projectPath);
    if (!isWp) {
      return {
        success: false,
        message: 'Ce répertoire n\'est pas un projet WordPress valide',
        dbDeleted: false,
        filesDeleted: false
      };
    }

    // Extraire la configuration
    const wpConfig = await this.extractWpConfig(projectPath);

    let dbDeleted = false;
    let dbMessage = '';

    // Supprimer la base de données si demandé
    if (deleteDb && wpConfig) {
      const dbResult = await this.deleteDatabase(wpConfig);
      dbDeleted = dbResult.success;
      dbMessage = dbResult.message || '';
    } else if (deleteDb && !wpConfig) {
      dbMessage = 'Configuration non trouvée, base de données non supprimée';
    }

    // Supprimer les fichiers
    const filesResult = await this.deleteProjectFiles(projectPath);

    // Résultat final
    const success = filesResult.success;
    let message = '';

    if (success) {
      message = 'Projet supprimé avec succès';
      if (deleteDb) {
        message += dbDeleted ? ' (BDD supprimée)' : ` (${dbMessage})`;
      }
    } else {
      message = filesResult.message || 'Erreur lors de la suppression';
    }

    logger.info('DELETE', 'Suppression terminée', { success, dbDeleted, filesDeleted: filesResult.success });

    return {
      success,
      message,
      dbDeleted,
      filesDeleted: filesResult.success,
      wpConfig: wpConfig || undefined
    };
  }
}

export const deleteService = new DeleteService();
export default deleteService;
