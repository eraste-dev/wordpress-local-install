import * as fs from 'fs-extra';
import * as mysql from 'mysql2/promise';
import { logger } from '../utils/logger';
import PathHelper from '../utils/pathHelper';
import { DatabaseConfig } from '../types';

/**
 * Service de rollback pour annuler les opérations en cas d'erreur
 * Permet de revenir à l'état initial si une étape échoue
 */

export interface RollbackAction {
  type: 'directory' | 'database' | 'file';
  description: string;
  data: {
    path?: string;
    databaseName?: string;
    dbConfig?: DatabaseConfig;
  };
}

export class RollbackService {
  private actions: RollbackAction[] = [];
  private isRollingBack: boolean = false;

  /**
   * Enregistre une action de création de répertoire pour rollback
   */
  registerDirectoryCreation(dirPath: string): void {
    if (this.isRollingBack) return;

    this.actions.push({
      type: 'directory',
      description: `Supprimer le répertoire: ${dirPath}`,
      data: { path: dirPath }
    });

    logger.debug('ROLLBACK', `Action enregistrée: création répertoire`, { path: dirPath });
  }

  /**
   * Enregistre une action de création de base de données pour rollback
   */
  registerDatabaseCreation(databaseName: string, dbConfig: DatabaseConfig): void {
    if (this.isRollingBack) return;

    this.actions.push({
      type: 'database',
      description: `Supprimer la base de données: ${databaseName}`,
      data: { databaseName, dbConfig }
    });

    logger.debug('ROLLBACK', `Action enregistrée: création BDD`, { databaseName });
  }

  /**
   * Enregistre une action de création de fichier pour rollback
   */
  registerFileCreation(filePath: string): void {
    if (this.isRollingBack) return;

    this.actions.push({
      type: 'file',
      description: `Supprimer le fichier: ${filePath}`,
      data: { path: filePath }
    });

    logger.debug('ROLLBACK', `Action enregistrée: création fichier`, { path: filePath });
  }

  /**
   * Retourne le nombre d'actions enregistrées
   */
  getActionsCount(): number {
    return this.actions.length;
  }

  /**
   * Retourne les actions enregistrées
   */
  getActions(): RollbackAction[] {
    return [...this.actions];
  }

  /**
   * Efface toutes les actions (après succès)
   */
  clear(): void {
    this.actions = [];
    logger.debug('ROLLBACK', 'Actions effacées (succès)');
  }

  /**
   * Exécute le rollback de toutes les actions enregistrées
   */
  async execute(): Promise<{ success: boolean; errors: string[] }> {
    if (this.actions.length === 0) {
      logger.info('ROLLBACK', 'Aucune action à annuler');
      return { success: true, errors: [] };
    }

    this.isRollingBack = true;
    const errors: string[] = [];

    logger.warn('ROLLBACK', `Début du rollback: ${this.actions.length} action(s) à annuler`);

    // Exécuter les actions en ordre inverse (LIFO)
    const reversedActions = [...this.actions].reverse();

    for (const action of reversedActions) {
      try {
        await this.executeAction(action);
        logger.info('ROLLBACK', `Action réussie: ${action.description}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
        errors.push(`${action.description}: ${errorMsg}`);
        logger.error('ROLLBACK', `Échec: ${action.description}`, { error: errorMsg });
      }
    }

    this.actions = [];
    this.isRollingBack = false;

    const success = errors.length === 0;
    logger.info('ROLLBACK', `Rollback terminé`, { success, errorsCount: errors.length });

    return { success, errors };
  }

  /**
   * Exécute une action de rollback individuelle
   */
  private async executeAction(action: RollbackAction): Promise<void> {
    switch (action.type) {
      case 'directory':
        await this.rollbackDirectory(action.data.path!);
        break;
      case 'database':
        await this.rollbackDatabase(action.data.databaseName!, action.data.dbConfig!);
        break;
      case 'file':
        await this.rollbackFile(action.data.path!);
        break;
      default:
        throw new Error(`Type d'action inconnu: ${action.type}`);
    }
  }

  /**
   * Supprime un répertoire créé
   */
  private async rollbackDirectory(dirPath: string): Promise<void> {
    if (!dirPath) {
      throw new Error('Chemin du répertoire non spécifié');
    }

    const exists = await PathHelper.exists(dirPath);
    if (!exists) {
      logger.debug('ROLLBACK', `Répertoire déjà supprimé: ${dirPath}`);
      return;
    }

    // Vérification de sécurité: ne pas supprimer les répertoires système
    const safePaths = ['/tmp', '/home', '/opt', process.env.HOME || ''];
    const normalizedPath = PathHelper.normalize(dirPath);

    const isSafe = safePaths.some(safe =>
      safe && normalizedPath.startsWith(PathHelper.normalize(safe))
    );

    if (!isSafe) {
      throw new Error(`Suppression non autorisée pour des raisons de sécurité: ${dirPath}`);
    }

    await fs.remove(dirPath);
    logger.info('ROLLBACK', `Répertoire supprimé: ${dirPath}`);
  }

  /**
   * Supprime une base de données créée
   */
  private async rollbackDatabase(databaseName: string, dbConfig: DatabaseConfig): Promise<void> {
    if (!databaseName) {
      throw new Error('Nom de la base de données non spécifié');
    }

    // Validation du nom de base de données
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(databaseName)) {
      throw new Error('Nom de base de données invalide');
    }

    // Vérifier que ce n'est pas une base système
    const systemDbs = ['mysql', 'information_schema', 'performance_schema', 'sys'];
    if (systemDbs.includes(databaseName.toLowerCase())) {
      throw new Error(`Impossible de supprimer la base de données système: ${databaseName}`);
    }

    let connection;
    try {
      connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
      });

      // Vérifier que la base existe
      const [databases] = await connection.query('SHOW DATABASES LIKE ?', [databaseName]);
      if (!Array.isArray(databases) || databases.length === 0) {
        logger.debug('ROLLBACK', `Base de données déjà supprimée: ${databaseName}`);
        return;
      }

      // Supprimer la base de données
      await connection.query(`DROP DATABASE \`${databaseName}\``);
      logger.info('ROLLBACK', `Base de données supprimée: ${databaseName}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Supprime un fichier créé
   */
  private async rollbackFile(filePath: string): Promise<void> {
    if (!filePath) {
      throw new Error('Chemin du fichier non spécifié');
    }

    const exists = await PathHelper.exists(filePath);
    if (!exists) {
      logger.debug('ROLLBACK', `Fichier déjà supprimé: ${filePath}`);
      return;
    }

    await fs.remove(filePath);
    logger.info('ROLLBACK', `Fichier supprimé: ${filePath}`);
  }
}

// Instance singleton
export const rollbackService = new RollbackService();
export default rollbackService;
