import * as mysql from 'mysql2/promise';
import { DatabaseConfig, ServiceResult } from '../../types';
import { IDatabaseDriver } from './IDatabaseDriver';

export class MySQLDriver implements IDatabaseDriver {
  private config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    // Default MySQL configuration for local installations
    this.config = {
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306,
      ...config
    };
    console.log('[MYSQL] MySQLDriver initialized with config:', { ...this.config, password: '***' });
  }

  getDriverName(): string {
    return 'MySQL';
  }

  async testConnection(): Promise<ServiceResult> {
    console.log(`[MYSQL] Testing ${this.getDriverName()} connection...`);
    console.log(`[MYSQL] Host: ${this.config.host}:${this.config.port}, User: ${this.config.user}`);

    let connection;
    try {
      console.log('[MYSQL] Creating connection...');
      connection = await mysql.createConnection(this.config);
      console.log('[MYSQL] Connection created, pinging server...');
      await connection.ping();
      console.log('[MYSQL] Ping successful ✓');

      // Get MySQL version
      console.log('[MYSQL] Retrieving version information...');
      const [rows] = await connection.query('SELECT VERSION() as version');
      const version = (rows as any)[0]?.version || 'Unknown';
      console.log(`[MYSQL] Version: ${version}`);

      const result = {
        success: true,
        message: `Connexion ${this.getDriverName()} réussie (v${version})`
      };
      console.log('[MYSQL] Connection test successful!');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[MYSQL] Connection test failed:`, errorMessage);
      throw new Error(`Impossible de se connecter à ${this.getDriverName()}: ${errorMessage}`);
    } finally {
      if (connection) {
        console.log('[MYSQL] Closing connection...');
        await connection.end();
        console.log('[MYSQL] Connection closed');
      }
    }
  }

  async createDatabase(databaseName: string): Promise<ServiceResult> {
    console.log(`[MYSQL] Creating database: ${databaseName}`);

    let connection;
    try {
      // Validate database name (alphanumeric and underscores only)
      console.log('[MYSQL] Validating database name...');
      if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
        console.error('[MYSQL] Invalid database name:', databaseName);
        throw new Error('Le nom de la base de données ne peut contenir que des lettres, chiffres et underscores');
      }
      console.log('[MYSQL] Database name is valid ✓');

      console.log('[MYSQL] Creating connection...');
      connection = await mysql.createConnection(this.config);
      console.log('[MYSQL] Connection created ✓');

      // Check if database already exists
      console.log('[MYSQL] Checking if database already exists...');
      const [databases] = await connection.query(
        'SHOW DATABASES LIKE ?',
        [databaseName]
      );

      if (Array.isArray(databases) && databases.length > 0) {
        console.error(`[MYSQL] Database already exists: ${databaseName}`);
        throw new Error(`La base de données '${databaseName}' existe déjà`);
      }
      console.log('[MYSQL] Database does not exist, proceeding with creation ✓');

      // Create the database with UTF8MB4
      console.log('[MYSQL] Creating database with UTF8MB4 charset...');
      await connection.query(
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`[MYSQL] Database created successfully: ${databaseName} ✓`);

      return { success: true, databaseName };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[MYSQL] Database creation failed:', errorMessage);
      throw new Error(`Erreur lors de la création de la base de données: ${errorMessage}`);
    } finally {
      if (connection) {
        console.log('[MYSQL] Closing connection...');
        await connection.end();
        console.log('[MYSQL] Connection closed');
      }
    }
  }

  async databaseExists(databaseName: string): Promise<boolean> {
    console.log(`[MYSQL] Checking if database exists: ${databaseName}`);

    let connection;
    try {
      connection = await mysql.createConnection(this.config);

      const [databases] = await connection.query(
        'SHOW DATABASES LIKE ?',
        [databaseName]
      );

      const exists = Array.isArray(databases) && databases.length > 0;
      console.log(`[MYSQL] Database exists: ${exists}`);
      return exists;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[MYSQL] Database existence check failed:', errorMessage);
      throw new Error(`Erreur lors de la vérification de la base de données: ${errorMessage}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  setConfig(config: Partial<DatabaseConfig>): void {
    console.log('[MYSQL] Updating configuration:', { ...config, password: config.password ? '***' : undefined });
    this.config = { ...this.config, ...config };
    console.log('[MYSQL] Configuration updated');
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}
