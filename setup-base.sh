#!/bin/bash

# WordPress Automation App - Setup Script
# This script helps you set up the wordpress-base directory

echo "========================================="
echo "  WordPress Automation - Setup Helper"
echo "========================================="
echo ""

# Check if wordpress-base already has content
if [ -d "assets/wordpress-base/wp-admin" ]; then
    echo "⚠️  Le dossier wordpress-base contient déjà WordPress."
    echo ""
    read -p "Voulez-vous le remplacer ? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Annulé."
        exit 0
    fi
    rm -rf assets/wordpress-base/*
fi

echo "Options disponibles :"
echo ""
echo "1) Copier depuis wordpress/wordpress (local)"
echo "2) Copier depuis un autre projet WordPress"
echo "3) Télécharger WordPress depuis wordpress.org"
echo "4) Annuler"
echo ""
read -p "Choisissez une option (1-4) : " option

case $option in
    1)
        if [ -d "wordpress/wordpress" ]; then
            echo "Copie depuis wordpress/wordpress..."
            cp -r wordpress/wordpress/* assets/wordpress-base/
            echo "✓ Copie terminée !"
        else
            echo "❌ Le dossier wordpress/wordpress n'existe pas."
            exit 1
        fi
        ;;
    2)
        read -p "Entrez le chemin du dossier WordPress : " wp_path
        if [ -d "$wp_path" ]; then
            echo "Copie depuis $wp_path..."
            cp -r "$wp_path"/* assets/wordpress-base/
            echo "✓ Copie terminée !"
        else
            echo "❌ Le dossier $wp_path n'existe pas."
            exit 1
        fi
        ;;
    3)
        echo "Téléchargement de WordPress..."
        cd assets
        wget -q https://wordpress.org/latest.tar.gz
        if [ $? -eq 0 ]; then
            echo "Extraction..."
            tar -xzf latest.tar.gz
            rm -rf wordpress-base
            mv wordpress wordpress-base
            rm latest.tar.gz
            cd ..
            echo "✓ Téléchargement terminé !"
        else
            echo "❌ Erreur lors du téléchargement."
            exit 1
        fi
        ;;
    4)
        echo "Annulé."
        exit 0
        ;;
    *)
        echo "❌ Option invalide."
        exit 1
        ;;
esac

echo ""
echo "Vérification de wp-config.php..."

if [ ! -f "assets/wordpress-base/wp-config.php" ]; then
    if [ -f "assets/wordpress-base/wp-config-sample.php" ]; then
        echo "⚠️  wp-config.php n'existe pas."
        read -p "Voulez-vous créer wp-config.php depuis wp-config-sample.php ? (Y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            cp assets/wordpress-base/wp-config-sample.php assets/wordpress-base/wp-config.php
            echo "✓ wp-config.php créé !"
            echo ""
            echo "⚠️  IMPORTANT : Modifiez assets/wordpress-base/wp-config.php"
            echo "   pour définir les paramètres de base de données."
        fi
    else
        echo "❌ wp-config-sample.php n'existe pas non plus."
        echo "   Vous devrez créer wp-config.php manuellement."
    fi
else
    echo "✓ wp-config.php existe déjà."
fi

echo ""
echo "========================================="
echo "  Configuration terminée !"
echo "========================================="
echo ""
echo "Prochaines étapes :"
echo "1. Vérifiez assets/wordpress-base/wp-config.php"
echo "2. Installez les dépendances : npm install"
echo "3. Lancez l'application : npm start"
echo ""
