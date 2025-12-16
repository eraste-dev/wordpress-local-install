/**
 * Validateur d'entrées utilisateur
 * Prévient les injections et assure la validité des données
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export class Validator {
  // Caractères dangereux pour les commandes shell
  private static readonly SHELL_DANGEROUS_CHARS = /[;&|`$(){}[\]<>!#*?\\'"]/g;

  // Pattern pour les noms de projet valides
  private static readonly PROJECT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

  // Pattern pour les noms de base de données MySQL valides
  private static readonly DATABASE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

  // Pattern pour les chemins de fichiers (cross-platform)
  private static readonly PATH_PATTERN = /^[a-zA-Z0-9_\-./\\: ]+$/;

  /**
   * Valide et sanitize un nom de projet
   */
  static validateProjectName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Le nom du projet est requis' };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Le nom du projet ne peut pas être vide' };
    }

    if (trimmed.length > 64) {
      return { valid: false, error: 'Le nom du projet ne peut pas dépasser 64 caractères' };
    }

    if (!this.PROJECT_NAME_PATTERN.test(trimmed)) {
      return {
        valid: false,
        error: 'Le nom du projet doit commencer par une lettre et ne contenir que des lettres, chiffres, tirets et underscores'
      };
    }

    // Liste de noms réservés
    const reserved = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'lpt1', 'lpt2', 'lpt3'];
    if (reserved.includes(trimmed.toLowerCase())) {
      return { valid: false, error: 'Ce nom est réservé par le système' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Valide et sanitize un nom de base de données
   */
  static validateDatabaseName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Le nom de la base de données est requis' };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Le nom de la base de données ne peut pas être vide' };
    }

    if (trimmed.length > 64) {
      return { valid: false, error: 'Le nom de la base de données ne peut pas dépasser 64 caractères' };
    }

    if (!this.DATABASE_NAME_PATTERN.test(trimmed)) {
      return {
        valid: false,
        error: 'Le nom de la base de données doit commencer par une lettre ou underscore et ne contenir que des lettres, chiffres et underscores'
      };
    }

    // Mots réservés MySQL
    const mysqlReserved = ['mysql', 'information_schema', 'performance_schema', 'sys', 'test'];
    if (mysqlReserved.includes(trimmed.toLowerCase())) {
      return { valid: false, error: 'Ce nom est réservé par MySQL' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Valide et sanitize un chemin de fichier
   */
  static validatePath(filePath: string): ValidationResult {
    if (!filePath || typeof filePath !== 'string') {
      return { valid: false, error: 'Le chemin est requis' };
    }

    const trimmed = filePath.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Le chemin ne peut pas être vide' };
    }

    if (trimmed.length > 4096) {
      return { valid: false, error: 'Le chemin est trop long' };
    }

    // Vérifier les séquences dangereuses
    if (trimmed.includes('..')) {
      return { valid: false, error: 'Les chemins relatifs avec ".." ne sont pas autorisés' };
    }

    // Vérifier les caractères dangereux pour les commandes shell
    if (this.SHELL_DANGEROUS_CHARS.test(trimmed)) {
      return {
        valid: false,
        error: 'Le chemin contient des caractères non autorisés'
      };
    }

    // Vérifier le format du chemin
    if (!this.PATH_PATTERN.test(trimmed)) {
      return {
        valid: false,
        error: 'Le format du chemin est invalide'
      };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Valide une configuration de base de données
   */
  static validateDatabaseConfig(config: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
  }): ValidationResult {
    // Validation de l'hôte
    if (config.host !== undefined) {
      const hostPattern = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,253}[a-zA-Z0-9]$|^[a-zA-Z0-9]$|^localhost$/;
      if (!hostPattern.test(config.host)) {
        return { valid: false, error: 'Format d\'hôte invalide' };
      }
    }

    // Validation du port
    if (config.port !== undefined) {
      if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        return { valid: false, error: 'Le port doit être un nombre entre 1 et 65535' };
      }
    }

    // Validation de l'utilisateur
    if (config.user !== undefined) {
      if (typeof config.user !== 'string' || config.user.length > 32) {
        return { valid: false, error: 'Le nom d\'utilisateur est invalide' };
      }
      // Vérifier les caractères dangereux
      if (this.SHELL_DANGEROUS_CHARS.test(config.user)) {
        return { valid: false, error: 'Le nom d\'utilisateur contient des caractères non autorisés' };
      }
    }

    // Le mot de passe peut contenir des caractères spéciaux mais pas de caractères de contrôle
    if (config.password !== undefined) {
      // eslint-disable-next-line no-control-regex
      if (typeof config.password !== 'string' || /[\x00-\x1f\x7f]/.test(config.password)) {
        return { valid: false, error: 'Le mot de passe contient des caractères invalides' };
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize une chaîne pour utilisation dans une commande shell
   * ATTENTION: Préférer les méthodes natives (spawn avec args array) quand possible
   */
  static sanitizeForShell(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    // Échapper les caractères spéciaux du shell
    return input.replace(/(["\s'$`\\!])/g, '\\$1');
  }

  /**
   * Valide un nom de serveur (pour vhost)
   */
  static validateServerName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Le nom de serveur est requis' };
    }

    const trimmed = name.trim().toLowerCase();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Le nom de serveur ne peut pas être vide' };
    }

    // Pattern pour un nom de domaine local valide
    const serverNamePattern = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*\.local$/;
    if (!serverNamePattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Le nom de serveur doit être au format "nom.local" ou "sous-domaine.nom.local"'
      };
    }

    if (trimmed.length > 253) {
      return { valid: false, error: 'Le nom de serveur est trop long' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Vérifie si une chaîne contient des caractères potentiellement dangereux
   */
  static hasDangerousChars(input: string): boolean {
    return this.SHELL_DANGEROUS_CHARS.test(input);
  }
}

export default Validator;
