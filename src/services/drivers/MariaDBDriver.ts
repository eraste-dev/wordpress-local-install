import { MySQLDriver } from './MySQLDriver';

/**
 * MariaDB Driver
 * Extends MySQL driver as MariaDB is MySQL-compatible
 * Can be extended with MariaDB-specific features if needed
 */
export class MariaDBDriver extends MySQLDriver {
  getDriverName(): string {
    return 'MariaDB';
  }
}
