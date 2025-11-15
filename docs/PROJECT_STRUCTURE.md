# Project Structure

Vue d'ensemble complète de la structure du projet WordPress Automation App.

## Architecture

```
wordpress-local-install/
│
├── assets/                          # Assets de l'application
│   ├── wordpress-base/              # WordPress modèle (à configurer)
│   │   ├── wp-admin/
│   │   ├── wp-content/
│   │   ├── wp-includes/
│   │   ├── wp-config.php            # Important: fichier de configuration
│   │   └── ... (fichiers WordPress)
│   └── README.md                    # Instructions pour setup WordPress base
│
├── src/                             # Code source de l'application
│   ├── main.js                      # Process principal Electron
│   ├── preload.js                   # Bridge sécurisé IPC
│   │
│   ├── services/                    # Services métier
│   │   ├── copyService.js           # Copie de dossiers WordPress
│   │   ├── configService.js         # Modification wp-config.php
│   │   └── databaseService.js       # Création bases MySQL
│   │
│   └── renderer/                    # Interface utilisateur
│       ├── index.html               # Structure HTML
│       ├── styles.css               # Styles (noir & blanc)
│       └── renderer.js              # Logique UI
│
├── package.json                     # Dépendances et scripts
├── .gitignore                       # Fichiers à ignorer par Git
├── .env.example                     # Exemple de configuration MySQL
│
├── MVP.md                           # Spécifications du MVP
├── README.md                        # Documentation complète
├── QUICKSTART.md                    # Guide de démarrage rapide
├── PROJECT_STRUCTURE.md             # Ce fichier
│
└── setup-base.sh                    # Script d'aide au setup

Généré après build:
├── node_modules/                    # Dépendances installées
└── dist/                            # Applications compilées
```

## Flux de données

```
┌─────────────────────────────────────────────────────────┐
│                     RENDERER PROCESS                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  index.html + styles.css + renderer.js             │ │
│  │  Interface utilisateur (Noir & Blanc)              │ │
│  └──────────────────┬─────────────────────────────────┘ │
│                     │                                    │
│                     │ IPC (via preload.js)               │
│                     ▼                                    │
└─────────────────────┼─────────────────────────────────┘
                      │
┌─────────────────────┼─────────────────────────────────┐
│                     │        MAIN PROCESS              │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │              main.js                            │   │
│  │         Orchestration centrale                   │   │
│  └──┬────────────┬────────────┬────────────────────┘   │
│     │            │            │                         │
│     ▼            ▼            ▼                         │
│  ┌────────┐  ┌────────┐  ┌──────────┐                  │
│  │ Copy   │  │Config  │  │ Database │                  │
│  │Service │  │Service │  │ Service  │                  │
│  └───┬────┘  └───┬────┘  └────┬─────┘                  │
└──────┼───────────┼────────────┼─────────────────────┘
       │           │            │
       ▼           ▼            ▼
   File System  File System   MySQL
```

## Communication IPC

### Channels utilisés

**Renderer → Main (invoke)**
- `generate-wordpress` : Démarre la génération d'un projet
- `test-db-connection` : Test la connexion MySQL

**Main → Renderer (send)**
- `status-update` : Mise à jour du statut en temps réel

## Services

### copyService.js
- **Rôle** : Copie le dossier WordPress modèle
- **Méthodes** :
  - `copyWordPress(sourcePath, destPath)` : Copie complète
  - `checkPathAccessible(targetPath)` : Vérification permissions

### configService.js
- **Rôle** : Modifie wp-config.php
- **Méthodes** :
  - `updateConfig(configPath, databaseName)` : Change DB_NAME
  - `updateMultipleConfig(configPath, config)` : Change plusieurs valeurs

### databaseService.js
- **Rôle** : Gestion MySQL
- **Méthodes** :
  - `createDatabase(databaseName)` : Crée une base de données
  - `testConnection()` : Test la connexion
  - `databaseExists(databaseName)` : Vérifie l'existence
  - `setConfig(config)` : Configure la connexion

## Sécurité

### Context Isolation
- `contextIsolation: true` dans BrowserWindow
- `nodeIntegration: false`
- Utilisation de preload.js pour exposer seulement les API nécessaires

### Validation
- Nom de projet : `[a-zA-Z0-9_-]+`
- Nom de base : `[a-zA-Z0-9_]+`
- Protection contre l'injection SQL avec paramètres bindés

## Scripts disponibles

```bash
npm start              # Lance l'app en mode normal
npm run dev            # Lance l'app avec DevTools
npm run build:win      # Compile pour Windows
npm run build:mac      # Compile pour macOS
npm run build:linux    # Compile pour Linux
npm run build:all      # Compile pour toutes les plateformes
```

## Configuration

### MySQL (databaseService.js)
```javascript
{
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
}
```

### Electron (main.js)
```javascript
{
  width: 800,
  height: 600,
  backgroundColor: '#000000'
}
```

## Workflow typique

1. **Utilisateur** remplit le formulaire
2. **Renderer** envoie les données via IPC
3. **Main** reçoit et démarre le processus
4. **CopyService** copie WordPress
5. **ConfigService** modifie wp-config.php
6. **DatabaseService** crée la base MySQL
7. **Main** envoie des status-update à chaque étape
8. **Renderer** affiche la progression
9. **Utilisateur** voit le résultat final

## Technologies

- **Electron** : Framework desktop
- **Node.js** : Runtime JavaScript
- **fs-extra** : Opérations fichiers avancées
- **mysql2** : Client MySQL avec Promises
- **HTML/CSS/JS** : Interface utilisateur

## Points d'extension

Pour étendre l'application :

1. **Ajouter des paramètres de configuration** :
   - Modifier `renderer/index.html` (champs)
   - Modifier `renderer/renderer.js` (logique)
   - Modifier `services/configService.js` (traitement)

2. **Changer le thème** :
   - Modifier `renderer/styles.css`

3. **Ajouter des services** :
   - Créer un nouveau fichier dans `services/`
   - L'importer dans `main.js`
   - Ajouter un handler IPC si nécessaire

4. **Support de plusieurs bases WordPress** :
   - Modifier la structure `assets/` pour supporter plusieurs templates
   - Ajouter un sélecteur dans l'UI
