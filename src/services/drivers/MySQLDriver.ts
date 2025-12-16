import * as mysql from 'mysql2/promise';
import { DatabaseConfig, ServiceResult } from '../../types';
import { IDatabaseDriver } from './IDatabaseDriver';
import { settings } from '../../config/settings';
import { logger } from '../../utils/logger';
import Validator from '../../utils/validator';

/**
 * Driver MySQL amélioré avec:
 * - Configuration centralisée
 * - Logging persistant
 * - Validation des entrées
 * - Pool de connexions optionnel
 */

export class MySQLDriver implements IDatabaseDriver {
  private config: DatabaseConfig;
  private pool: mysql.Pool | null = null;
  private usePool: boolean;

  constructor(config?: Partial<DatabaseConfig>, usePool: boolean = false) {
    // Récupérer la configuration depuis le gestionnaire de settings
    const defaultConfig = settings.getDatabase();

    this.config = {
      host: defaultConfig.host,
      user: defaultConfig.user,
      password: defaultConfig.password,
      port: defaultConfig.port,
      ...config
    };

    this.usePool = usePool;

    logger.info('MYSQL', 'MySQLDriver initialisé', {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      usePool: this.usePool
    });
  }

  /**
   * Initialise le pool de connexions si activé
   */
  async initPool(): Promise<void> {
    if (!this.usePool || this.pool) return;

    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    logger.info('MYSQL', 'Pool de connexions initialisé');
  }

  /**
   * Ferme le pool de connexions
   */
  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('MYSQL', 'Pool de connexions fermé');
    }
  }

  /**
   * Obtient une connexion (pool ou nouvelle)
   */
  private async getConnection(): Promise<mysql.Connection | mysql.PoolConnection> {
    if (this.usePool && this.pool) {
      return this.pool.getConnection();
    }
    return mysql.createConnection(this.config);
  }

  /**
   * Libère une connexion
   */
  private async releaseConnection(connection: mysql.Connection | mysql.PoolConnection): Promise<void> {
    if (this.usePool && 'release' in connection) {
      (connection as mysql.PoolConnection).release();
    } else {
      await connection.end();
    }
  }

  getDriverName(): string {
    return 'MySQL';
  }

  async testConnection(): Promise<ServiceResult> {
    logger.info('MYSQL', `Test de connexion ${this.getDriverName()}...`, {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user
    });

    let connection;
    try {
      connection = await this.getConnection();
      await connection.ping();

      // Récupérer la version MySQL
      const [rows] = await connection.query('SELECT VERSION() as version');
      const version = (rows as mysql.RowDataPacket[])[0]?.version || 'Unknown';

      logger.info('MYSQL', `Connexion réussie`, { version });

      return {
        success: true,
        message: `Connexion ${this.getDriverName()} réussie (v${version})`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('MYSQL', `Échec de la connexion`, { error: errorMessage });
      throw new Error(`Impossible de se connecter à ${this.getDriverName()}: ${errorMessage}`);
    } finally {
      if (connection) {
        await this.releaseConnection(connection);
      }
    }
  }

  async createDatabase(databaseName: string): Promise<ServiceResult> {
    logger.info('MYSQL', `Création de la base de données: ${databaseName}`);

    // Validation du nom de base de données
    const validation = Validator.validateDatabaseName(databaseName);
    if (!validation.valid) {
      logger.error('MYSQL', `Nom de base de données invalide`, {
        databaseName,
        error: validation.error
      });
      throw new Error(validation.error);
    }

    let connection;
    try {
      connection = await this.getConnection();

      // Vérifier si la base existe déjà
      const [databases] = await connection.query(
        'SHOW DATABASES LIKE ?',
        [databaseName]
      );

      if (Array.isArray(databases) && databases.length > 0) {
        logger.warn('MYSQL', `La base de données existe déjà`, { databaseName });
        throw new Error(`La base de données '${databaseName}' existe déjà`);
      }

      // Créer la base avec UTF8MB4
      await connection.query(
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      logger.info('MYSQL', `Base de données créée avec succès`, { databaseName });

      return { success: true, databaseName };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('MYSQL', `Échec de la création`, { databaseName, error: errorMessage });
      throw new Error(`Erreur lors de la création de la base de données: ${errorMessage}`);
    } finally {
      if (connection) {
        await this.releaseConnection(connection);
      }
    }
  }

  async databaseExists(databaseName: string): Promise<boolean> {
    logger.debug('MYSQL', `Vérification de l'existence de: ${databaseName}`);

    let connection;
    try {
      connection = await this.getConnection();

      const [databases] = await connection.query(
        'SHOW DATABASES LIKE ?',
        [databaseName]
      );

      const exists = Array.isArray(databases) && databases.length > 0;
      logger.debug('MYSQL', `Base de données ${exists ? 'existe' : 'n\'existe pas'}`, { databaseName });

      return exists;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('MYSQL', `Erreur lors de la vérification`, { databaseName, error: errorMessage });
      throw new Error(`Erreur lors de la vérification de la base de données: ${errorMessage}`);
    } finally {
      if (connection) {
        await this.releaseConnection(connection);
      }
    }
  }

  /**
   * Supprime une base de données (utilisé pour le rollback)
   */
  async dropDatabase(databaseName: string): Promise<ServiceResult> {
    logger.warn('MYSQL', `Suppression de la base de données: ${databaseName}`);

    // Validation du nom
    const validation = Validator.validateDatabaseName(databaseName);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Vérifier que ce n'est pas une base système
    const systemDbs = ['mysql', 'information_schema', 'performance_schema', 'sys'];
    if (systemDbs.includes(databaseName.toLowerCase())) {
      throw new Error(`Impossible de supprimer la base de données système: ${databaseName}`);
    }

    let connection;
    try {
      connection = await this.getConnection();

      // Vérifier que la base existe
      const exists = await this.databaseExists(databaseName);
      if (!exists) {
        logger.info('MYSQL', `Base de données déjà supprimée ou inexistante`, { databaseName });
        return { success: true, message: 'Base de données inexistante' };
      }

      await connection.query(`DROP DATABASE \`${databaseName}\``);

      logger.info('MYSQL', `Base de données supprimée`, { databaseName });
      return { success: true, databaseName };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('MYSQL', `Échec de la suppression`, { databaseName, error: errorMessage });
      throw new Error(`Erreur lors de la suppression de la base de données: ${errorMessage}`);
    } finally {
      if (connection) {
        await this.releaseConnection(connection);
      }
    }
  }

  setConfig(config: Partial<DatabaseConfig>): void {
    // Valider la nouvelle configuration
    const validation = Validator.validateDatabaseConfig(config);
    if (!validation.valid) {
      logger.error('MYSQL', `Configuration invalide`, { error: validation.error });
      throw new Error(validation.error);
    }

    this.config = { ...this.config, ...config };

    // Recréer le pool si actif
    if (this.usePool && this.pool) {
      this.closePool().then(() => this.initPool());
    }

    logger.info('MYSQL', 'Configuration mise à jour', {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user
    });
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}
