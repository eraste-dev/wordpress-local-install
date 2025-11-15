# Getting Started - WordPress Automation App (TypeScript)

Bienvenue! Ce guide vous permettra de démarrer rapidement avec l'application.

## 🚀 Démarrage Rapide (3 étapes)

### 1️⃣ Installation

```bash
# Installer les dépendances
npm install

# Compiler le TypeScript
npm run build
```

### 2️⃣ Préparation du WordPress de base

Utilisez le script automatique :

```bash
./setup-base.sh
```

Ou manuellement :

```bash
# Copier depuis un projet existant
cp -r wordpress/wordpress/* assets/wordpress-base/
```

### 3️⃣ Lancement

```bash
# Démarrer l'application
npm start
```

## 📖 Documentation Complète

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Documentation complète du projet |
| [QUICKSTART.md](QUICKSTART.md) | Guide de démarrage rapide (5 min) |
| [TYPESCRIPT.md](TYPESCRIPT.md) | Guide TypeScript et types |
| [MIGRATION_TYPESCRIPT.md](MIGRATION_TYPESCRIPT.md) | Détails de la migration TypeScript |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Architecture du projet |
| [MVP.md](MVP.md) | Spécifications originales |

## 🔧 Commandes Principales

```bash
# Développement
npm run dev              # Compiler et lancer en mode dev
npm run watch            # Compilation automatique (mode watch)

# Production
npm start                # Compiler et lancer
npm run build            # Compiler le TypeScript uniquement

# Build pour distribution
npm run build:linux      # Build pour Linux
npm run build:win        # Build pour Windows
npm run build:mac        # Build pour macOS
npm run build:all        # Build toutes les plateformes

# Maintenance
npm run clean            # Nettoyer les fichiers compilés
```

## 🏗️ Structure du Projet

```
wordpress-local-install/
├── assets/
│   └── wordpress-base/          # Votre WordPress modèle (à configurer)
├── src/                         # Code source TypeScript
│   ├── types/                   # Définitions de types
│   ├── services/                # Services métier
│   ├── renderer/                # Interface utilisateur
│   ├── main.ts                  # Process principal Electron
│   └── preload.ts               # Bridge IPC sécurisé
├── dist/                        # JavaScript compilé (généré)
└── build/                       # Builds de production (généré)
```

## ✅ Checklist de Démarrage

- [ ] Node.js installé (v16+)
- [ ] MySQL/XAMPP/LAMPP en cours d'exécution
- [ ] Dépendances installées (`npm install`)
- [ ] TypeScript compilé (`npm run build`)
- [ ] WordPress de base configuré dans `assets/wordpress-base/`
- [ ] `wp-config.php` existe dans le WordPress de base
- [ ] Application démarre sans erreur (`npm start`)

## 🎯 Premier Projet WordPress

1. **Lancez l'application**
   ```bash
   npm start
   ```

2. **Vérifiez MySQL** (indicateur vert en bas)

3. **Remplissez le formulaire** :
   - Nom du projet : `test-site`
   - Nom de la base : `test_site_db`
   - Destination : `/opt/lampp/htdocs/www/eraste/wordpress`

4. **Cliquez sur "Générer"**

5. **Accédez au site** :
   ```
   http://localhost/test-site
   ```

## 🐛 Dépannage

### Erreur : "Cannot find module"

**Solution** : Compilez le TypeScript
```bash
npm run build
```

### Erreur : "MySQL connection failed"

**Solution** : Démarrez MySQL
```bash
# Pour LAMPP
sudo /opt/lampp/lampp startmysql

# Vérifier le statut
sudo /opt/lampp/lampp status
```

### Erreur : "wp-config.php not found"

**Solution** : Vérifiez le WordPress de base
```bash
ls -la assets/wordpress-base/wp-config.php
```

Si absent, créez-le depuis le sample :
```bash
cp assets/wordpress-base/wp-config-sample.php assets/wordpress-base/wp-config.php
```

### Erreur : "Database already exists"

**Solution** : Choisissez un autre nom ou supprimez la base existante
```bash
mysql -u root -p -e "DROP DATABASE nom_de_la_base;"
```

## 🔥 Mode Développement

Pour un workflow de développement optimal :

**Terminal 1** - Compilation automatique :
```bash
npm run watch
```

**Terminal 2** - Lancer l'application :
```bash
electron . --dev
```

Les changements TypeScript seront automatiquement recompilés!

## 🌟 Fonctionnalités Clés

- ✅ **Copie automatique** du WordPress modèle
- ✅ **Modification automatique** de wp-config.php
- ✅ **Création automatique** de la base MySQL
- ✅ **Interface noir & blanc** minimaliste
- ✅ **Suivi en temps réel** des opérations
- ✅ **TypeScript** pour la sécurité des types
- ✅ **Cross-platform** (Windows, macOS, Linux)

## 📚 Ressources

- [Electron Documentation](https://www.electronjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WordPress Developer Resources](https://developer.wordpress.org/)

## 💡 Besoin d'Aide ?

1. Consultez [QUICKSTART.md](QUICKSTART.md) pour un guide pas à pas
2. Lisez [TYPESCRIPT.md](TYPESCRIPT.md) pour comprendre les types
3. Vérifiez [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) pour l'architecture

---

**Prêt à automatiser vos projets WordPress ?** 🚀

Lancez `npm start` et créez votre premier projet !
