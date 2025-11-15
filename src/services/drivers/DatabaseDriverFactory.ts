import { DatabaseConfig } from '../../types';
import { IDatabaseDriver } from './IDatabaseDriver';
import { MySQLDriver } from './MySQLDriver';
import { MariaDBDriver } from './MariaDBDriver';

export type DatabaseDriverType = 'mysql' | 'mariadb';

export class DatabaseDriverFactory {
  /**
   * Create a database driver instance
   * @param type - Type of database driver
   * @param config - Optional database configuration
   */
  static createDriver(type: DatabaseDriverType, config?: Partial<DatabaseConfig>): IDatabaseDriver {
    console.log('[FACTORY] Creating database driver:', type);
    switch (type) {
      case 'mysql':
        console.log('[FACTORY] Creating MySQL driver');
        return new MySQLDriver(config);
      case 'mariadb':
        console.log('[FACTORY] Creating MariaDB driver');
        return new MariaDBDriver(config);
      default:
        console.error('[FACTORY] Unsupported driver type:', type);
        throw new Error(`Type de driver non supporté: ${type}`);
    }
  }

  /**
   * Get all available driver types
   */
  static getAvailableDrivers(): DatabaseDriverType[] {
    return ['mysql', 'mariadb'];
  }

  /**
   * Get driver display names
   */
  static getDriverDisplayName(type: DatabaseDriverType): string {
    const names: Record<DatabaseDriverType, string> = {
      mysql: 'MySQL',
      mariadb: 'MariaDB'
    };
    return names[type] || type;
  }
}
