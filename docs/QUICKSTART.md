# Quick Start Guide

Guide rapide pour démarrer avec WordPress Automation App (TypeScript).

## Installation en 5 minutes

### 1. Installer les dépendances

```bash
npm install
```

### 2. Compiler le TypeScript

```bash
npm run build
```

### 3. Préparer le WordPress de base

Vous avez deux options :

**Option A : Copier depuis un projet existant**
```bash
cp -r wordpress/wordpress/* assets/wordpress-base/
```

**Option B : Télécharger WordPress**
```bash
cd assets
wget https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz
mv wordpress wordpress-base
rm latest.tar.gz
cd ..
```

### 3. Vérifier wp-config.php

Assurez-vous que `assets/wordpress-base/wp-config.php` existe et contient :

```php
define('DB_NAME', 'database_name_here');
define('DB_USER', 'username_here');
define('DB_PASSWORD', 'password_here');
define('DB_HOST', 'localhost');
```

Si le fichier n'existe pas, créez-le à partir de `wp-config-sample.php`.

### 4. Démarrer MySQL

Assurez-vous que MySQL est en cours d'exécution :

```bash
# Pour LAMPP/XAMPP
sudo /opt/lampp/lampp start

# Ou vérifier le statut
sudo /opt/lampp/lampp status
```

### 5. Lancer l'application

```bash
npm start
```

## Premier projet

1. L'application s'ouvre
2. Vérifiez que MySQL est connecté (indicateur vert en bas)
3. Remplissez :
   - **Nom du projet** : `test-site`
   - **Nom de la base** : `test_site_db`
   - **Destination** : `/opt/lampp/htdocs/www/eraste/wordpress`
4. Cliquez sur **Générer**

Votre nouveau site sera créé à : `/opt/lampp/htdocs/www/eraste/wordpress/test-site`

## Accéder au site

1. Ouvrez votre navigateur
2. Allez à : `http://localhost/test-site`
3. Suivez l'installation WordPress

## Dépannage rapide

**MySQL ne se connecte pas ?**
```bash
# Démarrer MySQL
sudo /opt/lampp/lampp startmysql

# Tester manuellement
mysql -u root -p
```

**Erreur de permission ?**
```bash
# Donner les permissions d'écriture
sudo chmod -R 777 /opt/lampp/htdocs/www/eraste/wordpress
```

**Le dossier existe déjà ?**
- Changez le nom du projet ou supprimez le dossier existant

## Prochaines étapes

- Consultez [README.md](README.md) pour plus de détails
- Modifiez les paramètres MySQL dans [src/services/databaseService.js](src/services/databaseService.js)
- Personnalisez l'interface dans [src/renderer/](src/renderer/)
- Créez des builds pour production avec `npm run build:linux`
