import * as path from 'path';

export interface VhostConfig {
  projectName: string;
  projectPath: string;
  serverName: string;
  port?: number;
}

export interface GeneratedConfigs {
  vhostConfig: string;
  hostsEntry: string;
}

class VhostService {
  /**
   * Generate Apache vhost configuration
   */
  generateVhostConfig(config: VhostConfig): string {
    console.log('[VHOST] Generating vhost configuration for:', config.serverName);

    const port = config.port || 80;
    const documentRoot = path.join(config.projectPath);

    const vhostTemplate = `<VirtualHost *:${port}>
    ServerName ${config.serverName}
    ServerAlias www.${config.serverName}
    DocumentRoot "${documentRoot}"

    <Directory "${documentRoot}">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog "\${APACHE_LOG_DIR}/${config.projectName}-error.log"
    CustomLog "\${APACHE_LOG_DIR}/${config.projectName}-access.log" combined
</VirtualHost>`;

    console.log('[VHOST] Vhost configuration generated successfully');
    return vhostTemplate;
  }

  /**
   * Generate hosts file entry
   */
  generateHostsEntry(serverName: string): string {
    console.log('[VHOST] Generating hosts entry for:', serverName);

    const hostsEntry = `127.0.0.1    ${serverName}
127.0.0.1    www.${serverName}`;

    console.log('[VHOST] Hosts entry generated successfully');
    return hostsEntry;
  }

  /**
   * Generate both vhost and hosts configurations
   */
  generateConfigs(config: VhostConfig): GeneratedConfigs {
    console.log('[VHOST] Generating all configurations for:', config.projectName);

    const vhostConfig = this.generateVhostConfig(config);
    const hostsEntry = this.generateHostsEntry(config.serverName);

    console.log('[VHOST] All configurations generated successfully');

    return {
      vhostConfig,
      hostsEntry
    };
  }

  /**
   * Get suggested server name from project name
   */
  getSuggestedServerName(projectName: string): string {
    // Convert project name to valid domain format
    // Replace underscores and spaces with hyphens, lowercase
    const serverName = projectName
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const suggested = `${serverName}.local`;
    console.log('[VHOST] Suggested server name:', suggested);

    return suggested;
  }

  /**
   * Get vhost file path for different systems
   */
  getVhostFilePath(system: 'ubuntu' | 'lampp' | 'xampp' | 'windows'): string {
    const paths = {
      ubuntu: '/etc/apache2/sites-available/',
      lampp: '/opt/lampp/etc/extra/httpd-vhosts.conf',
      xampp: '/opt/lampp/etc/extra/httpd-vhosts.conf',
      windows: 'C:\\xampp\\apache\\conf\\extra\\httpd-vhosts.conf'
    };

    return paths[system];
  }

  /**
   * Get hosts file path for different systems
   */
  getHostsFilePath(system: 'linux' | 'windows'): string {
    const paths = {
      linux: '/etc/hosts',
      windows: 'C:\\Windows\\System32\\drivers\\etc\\hosts'
    };

    return paths[system];
  }
}

export default new VhostService();
