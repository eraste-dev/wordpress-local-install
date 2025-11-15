
# **MVP – Application d’automatisation WordPress (Electron, Cross-Plateforme, Sans Backend)**

## **🎯 Objectif**

Créer une application de bureau minimaliste en **Electron** (Windows / macOS / Linux) permettant d’automatiser deux tâches répétitives :

1. **Copier un dossier WordPress modèle** depuis les assets et générer un nouveau projet en local.
2. **Modifier automatiquement le fichier `wp-config.php`** pour y insérer un nouveau nom de base, puis **créer la base MySQL** localement.

Aucun backend n’est requis :
➡️ toute la logique sera exécutée directement dans **Electron (main process + services locaux)**.

---

# **🧩 Fonctionnalités MVP**

## **1. Interface minimaliste (UI Noir & Blanc)**

* Une seule fenêtre en noir et blanc.
* Trois champs :

  * Nom du projet
  * Nom de la base MySQL
  * Chemin du dossier de destination
* Un bouton **“Générer”**.
* Une zone de statut affichant les étapes : copie, configuration, création de base.

UI conçue en HTML/CSS dans le renderer Electron.

---

## **2. Copie automatique du WordPress modèle**

* L’application embarque un dossier :
  **`/assets/wordpress-base`**
* Lors du clic “Générer” :

  * copie intégrale vers :
    **`<destination>/<nom-projet>`**
  * vérification :

    * accessibilité du dossier cible
    * réussite de la copie

Traitement fait dans le **main process** via Node (fs-extra).

---

## **3. Mise à jour du fichier `wp-config.php`**

* Lecture du fichier dans le nouveau projet.
* Remplacement de la ligne `DB_NAME`.
* Préservation du reste du fichier.
* Sauvegarde en local.

Fait en Node, directement depuis Electron (pas de backend).

---

## **4. Création automatique de la base MySQL**

* Connexion locale via `mysql2`.
* Test si la base existe.
* Si non → création :
  `CREATE DATABASE nomBase;`
* Retour d’état envoyé à l’UI via IPC.

---


# **🚀 Résultat attendu**

Une application **cross-plateforme** simple et rapide qui :

1. copie automatiquement un WordPress préconfiguré,
2. modifie le `wp-config.php`,
3. crée la base MySQL,
4. le tout à partir d’une interface minimaliste en noir & blanc.

