import * as fs from 'fs-extra';
import { ServiceResult, ConfigUpdateData } from '../types';

class ConfigService {
  /**
   * Update wp-config.php with new database name
   * @param configPath - Path to wp-config.php
   * @param databaseName - New database name
   */
  async updateConfig(configPath: string, databaseName: string): Promise<ServiceResult> {
    console.log('[CONFIG] Starting wp-config.php update');
    console.log('[CONFIG] Config path:', configPath);
    console.log('[CONFIG] Database name:', databaseName);

    try {
      // Check if wp-config.php exists
      console.log('[CONFIG] Checking if wp-config.php exists...');
      const configExists = await fs.pathExists(configPath);
      if (!configExists) {
        console.error('[CONFIG] wp-config.php does not exist:', configPath);
        throw new Error(`Le fichier wp-config.php n'existe pas: ${configPath}`);
      }
      console.log('[CONFIG] wp-config.php found ✓');

      // Read the file
      console.log('[CONFIG] Reading wp-config.php...');
      let content = await fs.readFile(configPath, 'utf8');
      console.log('[CONFIG] File read successfully, size:', content.length, 'bytes');

      // Replace DB_NAME
      // Pattern matches: define('DB_NAME', 'anything');
      const dbNamePattern = /(define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"])([^'"]*)(['"]\s*\)\s*;)/g;

      console.log('[CONFIG] Searching for DB_NAME definition...');
      if (!dbNamePattern.test(content)) {
        console.error('[CONFIG] DB_NAME definition not found in wp-config.php');
        throw new Error('La ligne DB_NAME n\'a pas été trouvée dans wp-config.php');
      }
      console.log('[CONFIG] DB_NAME definition found ✓');

      // Reset regex lastIndex
      dbNamePattern.lastIndex = 0;

      // Replace the database name
      console.log('[CONFIG] Replacing DB_NAME value...');
      content = content.replace(dbNamePattern, `$1${databaseName}$3`);
      console.log('[CONFIG] DB_NAME replaced successfully ✓');

      // Write back to file
      console.log('[CONFIG] Writing updated content back to file...');
      await fs.writeFile(configPath, content, 'utf8');
      console.log('[CONFIG] File written successfully ✓');

      console.log('[CONFIG] wp-config.php update completed successfully!');
      return { success: true, databaseName };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[CONFIG] Update failed:', errorMessage);
      throw new Error(`Erreur lors de la modification du wp-config.php: ${errorMessage}`);
    }
  }

  /**
   * Update multiple config values
   * @param configPath - Path to wp-config.php
   * @param config - Configuration object with keys: dbName, dbUser, dbPassword, dbHost
   */
  async updateMultipleConfig(configPath: string, config: ConfigUpdateData): Promise<ServiceResult> {
    console.log('[CONFIG] Starting multiple config update');
    console.log('[CONFIG] Config path:', configPath);
    console.log('[CONFIG] Update data:', config);

    try {
      console.log('[CONFIG] Checking if wp-config.php exists...');
      const configExists = await fs.pathExists(configPath);
      if (!configExists) {
        console.error('[CONFIG] wp-config.php does not exist:', configPath);
        throw new Error(`Le fichier wp-config.php n'existe pas: ${configPath}`);
      }
      console.log('[CONFIG] wp-config.php found ✓');

      console.log('[CONFIG] Reading wp-config.php...');
      let content = await fs.readFile(configPath, 'utf8');
      console.log('[CONFIG] File read successfully');

      // Replace DB_NAME
      if (config.dbName) {
        console.log('[CONFIG] Updating DB_NAME to:', config.dbName);
        const dbNamePattern = /(define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"])([^'"]*)(['"]\s*\)\s*;)/g;
        content = content.replace(dbNamePattern, `$1${config.dbName}$3`);
        console.log('[CONFIG] DB_NAME updated ✓');
      }

      // Replace DB_USER
      if (config.dbUser) {
        console.log('[CONFIG] Updating DB_USER to:', config.dbUser);
        const dbUserPattern = /(define\s*\(\s*['"]DB_USER['"]\s*,\s*['"])([^'"]*)(['"]\s*\)\s*;)/g;
        content = content.replace(dbUserPattern, `$1${config.dbUser}$3`);
        console.log('[CONFIG] DB_USER updated ✓');
      }

      // Replace DB_PASSWORD
      if (config.dbPassword !== undefined) {
        console.log('[CONFIG] Updating DB_PASSWORD');
        const dbPasswordPattern = /(define\s*\(\s*['"]DB_PASSWORD['"]\s*,\s*['"])([^'"]*)(['"]\s*\)\s*;)/g;
        content = content.replace(dbPasswordPattern, `$1${config.dbPassword}$3`);
        console.log('[CONFIG] DB_PASSWORD updated ✓');
      }

      // Replace DB_HOST
      if (config.dbHost) {
        console.log('[CONFIG] Updating DB_HOST to:', config.dbHost);
        const dbHostPattern = /(define\s*\(\s*['"]DB_HOST['"]\s*,\s*['"])([^'"]*)(['"]\s*\)\s*;)/g;
        content = content.replace(dbHostPattern, `$1${config.dbHost}$3`);
        console.log('[CONFIG] DB_HOST updated ✓');
      }

      console.log('[CONFIG] Writing updated content back to file...');
      await fs.writeFile(configPath, content, 'utf8');
      console.log('[CONFIG] File written successfully ✓');

      console.log('[CONFIG] Multiple config update completed successfully!');
      return { success: true, config };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[CONFIG] Multiple update failed:', errorMessage);
      throw new Error(`Erreur lors de la modification du wp-config.php: ${errorMessage}`);
    }
  }
}

export default new ConfigService();
