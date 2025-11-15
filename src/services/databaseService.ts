import { ServiceResult, DatabaseConfig } from '../types';
import { IDatabaseDriver, DatabaseDriverFactory, DatabaseDriverType } from './drivers';

class DatabaseService {
  private driver: IDatabaseDriver;
  private driverType: DatabaseDriverType;

  constructor(driverType: DatabaseDriverType = 'mysql') {
    console.log('[DATABASE] Initializing DatabaseService with driver:', driverType);
    this.driverType = driverType;
    // Default configuration for local XAMPP/LAMPP/MySQL Ubuntu
    this.driver = DatabaseDriverFactory.createDriver(driverType, {
      host: 'localhost',
      user: 'root',
      password: '', // Default password is empty for Ubuntu MySQL and XAMPP
      port: 3306
    });
    console.log('[DATABASE] DatabaseService initialized with default config');
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<ServiceResult> {
    console.log('[DATABASE] Testing connection using driver:', this.driver.getDriverName());
    const result = await this.driver.testConnection();
    console.log('[DATABASE] Connection test result:', result);
    return result;
  }

  /**
   * Create a new database
   * @param databaseName - Name of the database to create
   */
  async createDatabase(databaseName: string): Promise<ServiceResult> {
    console.log('[DATABASE] Creating database:', databaseName);
    const result = await this.driver.createDatabase(databaseName);
    console.log('[DATABASE] Database creation result:', result);
    return result;
  }

  /**
   * Check if a database exists
   * @param databaseName - Name of the database to check
   */
  async databaseExists(databaseName: string): Promise<boolean> {
    console.log('[DATABASE] Checking if database exists:', databaseName);
    const exists = await this.driver.databaseExists(databaseName);
    console.log('[DATABASE] Database exists:', exists);
    return exists;
  }

  /**
   * Update database connection configuration
   * @param config - Configuration object with host, user, password, port
   */
  setConfig(config: Partial<DatabaseConfig>): void {
    console.log('[DATABASE] Updating configuration:', config);
    this.driver.setConfig(config);
    console.log('[DATABASE] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): DatabaseConfig {
    const config = this.driver.getConfig();
    console.log('[DATABASE] Current configuration:', { ...config, password: '***' });
    return config;
  }

  /**
   * Change database driver
   * @param driverType - Type of database driver
   * @param config - Optional configuration
   */
  setDriver(driverType: DatabaseDriverType, config?: Partial<DatabaseConfig>): void {
    console.log('[DATABASE] Changing driver to:', driverType);
    this.driverType = driverType;
    const currentConfig = this.driver.getConfig();
    this.driver = DatabaseDriverFactory.createDriver(driverType, config || currentConfig);
    console.log('[DATABASE] Driver changed successfully');
  }

  /**
   * Get current driver type
   */
  getDriverType(): DatabaseDriverType {
    return this.driverType;
  }

  /**
   * Get current driver name
   */
  getDriverName(): string {
    return this.driver.getDriverName();
  }

  /**
   * Get available drivers
   */
  getAvailableDrivers(): DatabaseDriverType[] {
    return DatabaseDriverFactory.getAvailableDrivers();
  }
}

export default new DatabaseService();
