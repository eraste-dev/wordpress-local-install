import { DatabaseConfig, ServiceResult } from '../../types';

export interface IDatabaseDriver {
  /**
   * Test the database connection
   */
  testConnection(): Promise<ServiceResult>;

  /**
   * Create a new database
   * @param databaseName - Name of the database to create
   */
  createDatabase(databaseName: string): Promise<ServiceResult>;

  /**
   * Check if a database exists
   * @param databaseName - Name of the database to check
   */
  databaseExists(databaseName: string): Promise<boolean>;

  /**
   * Get the driver name
   */
  getDriverName(): string;

  /**
   * Set database configuration
   * @param config - Database configuration
   */
  setConfig(config: Partial<DatabaseConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): DatabaseConfig;
}
