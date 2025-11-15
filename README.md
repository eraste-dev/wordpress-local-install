# WordPress Automation App

Application de bureau cross-plateforme (Windows, macOS, Linux) pour automatiser la création de projets WordPress locaux.

**Développée en TypeScript avec Electron**

## Fonctionnalités

- **Copie automatique** d'un dossier WordPress modèle
- **Modification automatique** du fichier `wp-config.php`
- **Création automatique** de la base de données MySQL
- Interface minimaliste en noir et blanc
- Suivi en temps réel des opérations
- **TypeScript** pour une meilleure maintenabilité et sécurité du code

## Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn
- MySQL/MariaDB installé et en cours d'exécution (XAMPP, LAMPP, MAMP, etc.)
- Un dossier WordPress de base à utiliser comme modèle

## Installation

1. Clonez ou téléchargez ce projet

2. Installez les dépendances :
```bash
npm install
```

3. Compilez le TypeScript :
```bash
npm run build
```

4. Créez le dossier pour le WordPress de base :
```bash
mkdir -p assets/wordpress-base
```

4. Copiez votre installation WordPress modèle dans `assets/wordpress-base/`

## Structure du projet

```
wordpress-local-install/
├── assets/
│   └── wordpress-base/          # Votre WordPress modèle
├── src/
│   ├── main.js                  # Process principal Electron
│   ├── preload.js               # Script de préchargement sécurisé
│   ├── services/
│   │   ├── copyService.js       # Service de copie de fichiers
│   │   ├── configService.js     # Service de modification wp-config
│   │   └── databaseService.js   # Service de création de base MySQL
│   └── renderer/
│       ├── index.html           # Interface utilisateur
│       ├── styles.css           # Styles noir et blanc
│       └── renderer.js          # Logique de l'interface
├── package.json
└── README.md
```

## Configuration

### Configuration MySQL

Par défaut, l'application utilise ces paramètres pour MySQL :
- Host: `localhost`
- User: `root`
- Password: `` (vide - typique pour XAMPP/LAMPP)
- Port: `3306`

Si vos paramètres MySQL sont différents, modifiez le fichier [src/services/databaseService.js](src/services/databaseService.js:9-14).

### WordPress de base

Placez votre installation WordPress configurée dans `assets/wordpress-base/`. Cette installation doit contenir :
- Tous les fichiers WordPress
- Un fichier `wp-config.php` avec les constantes de base de données définies

Exemple de `wp-config.php` requis :
```php
define('DB_NAME', 'database_name_here');
define('DB_USER', 'username_here');
define('DB_PASSWORD', 'password_here');
define('DB_HOST', 'localhost');
```

## Utilisation

### Lancer l'application en mode développement

```bash
npm start
```

ou avec DevTools ouvert :

```bash
npm run dev
```

### Utiliser l'application

1. Lancez l'application
2. Vérifiez que MySQL est connecté (indicateur en bas de page)
3. Remplissez les champs :
   - **Nom du projet** : nom du dossier qui sera créé (ex: `mon-site`)
   - **Nom de la base de données** : nom de la base MySQL à créer (ex: `mon_site_db`)
   - **Chemin de destination** : où créer le projet (ex: `/opt/lampp/htdocs/www/eraste/wordpress`)
4. Cliquez sur **Générer**
5. Suivez la progression dans la zone de statut

Le projet sera créé dans : `<destination>/<nom-projet>`

## Build pour production

### Windows
```bash
npm run build:win
```

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

### Tous les systèmes
```bash
npm run build:all
```

Les fichiers compilés seront dans le dossier `dist/`.

## Dépannage

### Erreur de connexion MySQL

Si vous obtenez une erreur de connexion MySQL :

1. Vérifiez que MySQL est en cours d'exécution :
   ```bash
   # Linux/LAMPP
   sudo /opt/lampp/lampp status

   # Ou
   systemctl status mysql
   ```

2. Testez la connexion manuellement :
   ```bash
   mysql -u root -p
   ```

3. Vérifiez les paramètres dans [src/services/databaseService.js](src/services/databaseService.js)

### La base de données existe déjà

L'application refuse de créer une base de données qui existe déjà. Supprimez-la d'abord :

```bash
mysql -u root -p -e "DROP DATABASE nom_de_la_base;"
```

### Erreur de copie de fichiers

Vérifiez que :
- Le dossier `assets/wordpress-base` existe et contient WordPress
- Le chemin de destination est accessible en écriture
- Le dossier de destination n'existe pas déjà

## Personnalisation

### Modifier l'interface

Les fichiers d'interface sont dans `src/renderer/` :
- [index.html](src/renderer/index.html) : Structure HTML
- [styles.css](src/renderer/styles.css) : Styles (noir et blanc)
- [renderer.js](src/renderer/renderer.js) : Logique JavaScript

### Ajouter des paramètres de configuration

Pour ajouter d'autres paramètres WordPress (DB_USER, DB_PASSWORD, etc.), modifiez :
1. [src/renderer/index.html](src/renderer/index.html) : ajoutez les champs de formulaire
2. [src/renderer/renderer.js](src/renderer/renderer.js) : récupérez les valeurs
3. [src/services/configService.js](src/services/configService.js) : utilisez `updateMultipleConfig()`

## Licence

MIT

## Support

Pour tout problème, créez une issue sur le dépôt GitHub ou contactez le développeur.
