# Nouvelle Barre de Titre et Thèmes Clair/Sombre

Ce document détaille les améliorations apportées à l'interface utilisateur.

## 🎨 Thème Clair/Sombre

### Fonctionnalités

- **Basculement entre thème sombre et clair** avec un bouton dans la barre de titre
- **Sauvegarde automatique** de la préférence utilisateur dans localStorage
- **Transition fluide** entre les thèmes (0.3s)
- **Thème sombre par défaut**

### Variables CSS

Tous les styles utilisent maintenant des variables CSS pour faciliter le changement de thème :

**Thème Sombre (par défaut)** :
```css
--bg-primary: #000000      /* Fond principal */
--bg-secondary: #0a0a0a    /* Fond secondaire */
--bg-tertiary: #1a1a1a     /* Fond tertiaire (inputs) */
--text-primary: #ffffff    /* Texte principal */
--text-secondary: #999999  /* Texte secondaire */
```

**Thème Clair** :
```css
--bg-primary: #ffffff      /* Fond principal */
--bg-secondary: #f5f5f5    /* Fond secondaire */
--bg-tertiary: #e8e8e8     /* Fond tertiaire (inputs) */
--text-primary: #000000    /* Texte principal */
--text-secondary: #555555  /* Texte secondaire */
```

### Utilisation

Le bouton de basculement de thème se trouve dans la barre de titre (icône lune/soleil).
- **Icône lune** 🌙 = Thème sombre actif
- **Icône soleil** ☀️ = Thème clair actif

## 🪟 Barre de Titre Personnalisée

### Fonctionnalités

- **Barre de titre 100% custom** (pas celle du système d'exploitation)
- **Contrôles de fenêtre** : Réduire, Agrandir/Restaurer, Fermer
- **Zone draggable** : Possibilité de déplacer la fenêtre
- **Icône et titre** de l'application
- **Design cohérent** sur Windows, macOS et Linux

### Contrôles

1. **Bouton Thème** 🎨
   - Bascule entre mode sombre et clair
   - Animation de rotation de l'icône

2. **Bouton Réduire** −
   - Réduit la fenêtre dans la barre des tâches

3. **Bouton Agrandir/Restaurer** □
   - Agrandit en plein écran ou restaure la taille

4. **Bouton Fermer** ✕
   - Ferme l'application
   - Couleur rouge au survol (#e81123)

### Dimensions

- **Hauteur** : 32px
- **Largeur des boutons** : 46px
- **Zone draggable** : Toute la barre de titre sauf les boutons

## 📁 Fichiers Modifiés

### 1. HTML ([src/renderer/index.html](src/renderer/index.html))

```html
<!-- Nouvelle barre de titre -->
<div class="titlebar">
  <div class="titlebar-drag-region">
    <div class="titlebar-icon">...</div>
    <div class="titlebar-title">WordPress Automation</div>
  </div>
  <div class="titlebar-controls">
    <button id="themeToggle">...</button>
    <button id="minimizeBtn">...</button>
    <button id="maximizeBtn">...</button>
    <button id="closeBtn">...</button>
  </div>
</div>
```

### 2. CSS ([src/renderer/styles.css](src/renderer/styles.css))

**Ajout des variables CSS** :
- `:root` - Variables thème sombre
- `html[data-theme="light"]` - Variables thème clair

**Styles de la barre de titre** :
- `.titlebar` - Barre de titre fixe en haut
- `.titlebar-drag-region` - Zone déplaçable
- `.titlebar-button` - Boutons de contrôle
- `.theme-icon` - Icônes soleil/lune avec transitions

**Mise à jour de tous les styles** :
- Remplacement des valeurs hardcodées par des variables CSS
- Ajout de transitions pour les changements de thème

### 3. TypeScript - Renderer ([src/renderer/renderer.ts](src/renderer/renderer.ts))

**Nouvelles fonctions** :
```typescript
function initTheme(): void {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme(): void {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}
```

**Event Listeners** :
```typescript
themeToggle.addEventListener('click', toggleTheme);
minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());
```

### 4. Types ([src/types/index.ts](src/types/index.ts))

**Ajout à ElectronAPI** :
```typescript
export interface ElectronAPI {
  // ... autres méthodes ...
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}
```

### 5. Preload ([src/preload.ts](src/preload.ts))

**Exposition des contrôles de fenêtre** :
```typescript
minimizeWindow: (): void => {
  ipcRenderer.send('window-minimize');
},
maximizeWindow: (): void => {
  ipcRenderer.send('window-maximize');
},
closeWindow: (): void => {
  ipcRenderer.send('window-close');
}
```

### 6. Main Process ([src/main.ts](src/main.ts))

**Configuration de la fenêtre** :
```typescript
mainWindow = new BrowserWindow({
  frame: false,  // Pas de barre de titre par défaut
  titleBarStyle: 'hidden',  // Pour macOS
  // ...
});
```

**Gestionnaires IPC** :
```typescript
ipcMain.on('window-minimize', () => { mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => { mainWindow.close(); });
```

## 🎯 Compatibilité

### Windows
✅ Barre de titre personnalisée fonctionne parfaitement
✅ Contrôles de fenêtre natifs

### macOS
✅ Barre de titre personnalisée
✅ Traffic lights (boutons natifs) cachés avec `titleBarStyle: 'hidden'`
✅ Position personnalisée des traffic lights

### Linux
✅ Barre de titre personnalisée fonctionne parfaitement
✅ Gestion des boutons de fenêtre

## 🚀 Utilisation

### Changer de Thème

1. **Via l'interface** :
   - Cliquez sur le bouton lune/soleil dans la barre de titre

2. **Par défaut** :
   - Premier lancement : Thème sombre
   - Lancements suivants : Dernier thème utilisé (sauvegardé)

### Contrôler la Fenêtre

- **Déplacer** : Glisser-déposer sur la barre de titre
- **Réduire** : Clic sur le bouton −
- **Agrandir** : Clic sur le bouton □
- **Fermer** : Clic sur le bouton ✕

## 🎨 Personnalisation

### Modifier les Couleurs

Éditez les variables CSS dans [src/renderer/styles.css](src/renderer/styles.css:7-56) :

```css
:root {
  --bg-primary: #VOTRE_COULEUR;
  /* ... */
}

html[data-theme="light"] {
  --bg-primary: #VOTRE_COULEUR;
  /* ... */
}
```

### Ajouter un Thème

1. Ajoutez une nouvelle section dans le CSS :
```css
html[data-theme="custom"] {
  --bg-primary: #...;
  --text-primary: #...;
  /* etc. */
}
```

2. Modifiez la fonction `toggleTheme()` pour inclure votre nouveau thème

### Modifier la Barre de Titre

La hauteur de la barre de titre peut être ajustée dans le CSS :

```css
.titlebar {
  height: 32px; /* Modifiez ici */
}

.container {
  padding-top: 72px; /* Ajustez en conséquence */
}
```

## 📊 Avantages

1. **Interface Moderne** : Design épuré et professionnel
2. **Expérience Utilisateur** : Choix entre mode sombre et clair
3. **Cohérence** : Même apparence sur tous les systèmes d'exploitation
4. **Performance** : Transitions CSS optimisées
5. **Accessibilité** : Support des préférences utilisateur

## 🔄 Changements par rapport à l'Ancienne Version

| Avant | Après |
|-------|-------|
| Barre de titre du système | Barre de titre personnalisée |
| Thème sombre uniquement | Thèmes sombre ET clair |
| Couleurs hardcodées | Variables CSS |
| Pas de sauvegarde de préférences | localStorage pour le thème |
| Interface fixe | Interface adaptable |

## ⚙️ Configuration Avancée

### Désactiver la Barre de Titre Custom

Si vous souhaitez revenir à la barre de titre système, modifiez [src/main.ts](src/main.ts:16) :

```typescript
mainWindow = new BrowserWindow({
  frame: true,  // Utiliser la barre système
  // Supprimez titleBarStyle et trafficLightPosition
});
```

Et cachez la barre custom dans le HTML ou CSS.

### Forcer un Thème

Pour forcer un thème spécifique, modifiez [src/renderer/renderer.ts](src/renderer/renderer.ts:30) :

```typescript
function initTheme(): void {
  // const savedTheme = localStorage.getItem('theme') || 'dark';
  const savedTheme = 'light'; // Force thème clair
  document.documentElement.setAttribute('data-theme', savedTheme);
}
```

## 📝 Notes

- Le thème est sauvegardé dans `localStorage` du navigateur Electron
- Les transitions CSS sont désactivables pour de meilleures performances
- La barre de titre fonctionne avec le drag-and-drop natif d'Electron
- Les icônes SVG sont optimisées pour la performance
