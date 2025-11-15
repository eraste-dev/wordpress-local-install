# Assets Directory

## wordpress-base

Placez votre installation WordPress modèle dans le dossier `wordpress-base/`.

### Comment préparer votre WordPress de base

1. Téléchargez WordPress depuis [wordpress.org](https://wordpress.org/download/)

2. Extrayez et placez tous les fichiers dans `assets/wordpress-base/`

3. Créez un fichier `wp-config.php` ou copiez `wp-config-sample.php` vers `wp-config.php`

4. Assurez-vous que le fichier contient au minimum ces lignes :

```php
define('DB_NAME', 'database_name_here');
define('DB_USER', 'username_here');
define('DB_PASSWORD', 'password_here');
define('DB_HOST', 'localhost');
```

L'application remplacera automatiquement la valeur de `DB_NAME` lors de la génération.

### Alternative : Utiliser une installation WordPress existante

Si vous avez déjà une installation WordPress configurée avec vos plugins et thèmes préférés :

```bash
# Exemple : copier depuis un projet existant
cp -r /opt/lampp/htdocs/www/eraste/wordpress/wordpress/* assets/wordpress-base/
```

### Structure attendue

```
assets/
└── wordpress-base/
    ├── wp-admin/
    ├── wp-content/
    │   ├── plugins/
    │   ├── themes/
    │   └── uploads/
    ├── wp-includes/
    ├── index.php
    ├── wp-config.php  ← Important !
    └── ... (autres fichiers WordPress)
```
