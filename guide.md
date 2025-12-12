# FactureXL - Guide d'installation et d'utilisation

## Description

FactureXL est une application de gestion de facturation construite avec Next.js 14, Prisma, et MySQL. Elle permet de gerer les factures, devis, avoirs, clients, et employes.

## Technologies utilisees

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Base de donnees**: MySQL avec Prisma ORM
- **Authentification**: NextAuth.js
- **Paiements**: Stripe
- **PDF**: pdfmake
- **Graphiques**: Recharts
- **Email**: Nodemailer

## Pre-requis

- Node.js 18+
- npm ou yarn
- MySQL 8.0+
- Compte Stripe (pour les paiements)

## Installation

### 1. Cloner le projet

```bash
cd facturexl-next
```

### 2. Installer les dependances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Modifier le fichier `.env` avec vos informations :

```env
# Database - Connexion MySQL
DATABASE_URL="mysql://root:password@localhost:3306/facturexl"

# NextAuth - Cle secrete pour l'authentification
NEXTAUTH_SECRET="votre-cle-secrete-ici"
NEXTAUTH_URL="http://localhost:3000"

# Stripe - Cles API pour les paiements
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (SMTP) - Configuration pour l'envoi d'emails
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="votre-mot-de-passe-application"
EMAIL_FROM="noreply@facturexl.com"

# App
APP_URL="http://localhost:3000"
```

### 4. Creer la base de donnees MySQL

```sql
CREATE DATABASE facturexl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Generer le client Prisma et appliquer le schema

```bash
# Generer le client Prisma
npm run db:generate

# Appliquer le schema a la base de donnees
npm run db:push
```

### 6. (Optionnel) Remplir la base avec des donnees de test

```bash
npm run db:seed
```

Cette commande cree :
- Une entreprise par defaut
- Des taxes (TGC 0%, 3%, 6%, 11%, 22%)
- Des groupes de produits/services
- Des utilisateurs de test (admin, employes, clients)
- Des factures, devis et avoirs de demonstration

## Lancer l'application

### Mode developpement

```bash
npm run dev
```

L'application sera accessible sur : http://localhost:3000

### Mode production

```bash
# Construire l'application
npm run build

# Demarrer en production
npm run start
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lancer en mode developpement |
| `npm run build` | Construire pour la production |
| `npm run start` | Demarrer en mode production |
| `npm run lint` | Verifier le code avec ESLint |
| `npm run db:generate` | Generer le client Prisma |
| `npm run db:push` | Appliquer le schema a la base |
| `npm run db:studio` | Ouvrir Prisma Studio (interface graphique) |
| `npm run db:seed` | Remplir la base avec des donnees de test |

## Structure du projet

```
facturexl-next/
├── prisma/
│   ├── schema.prisma    # Schema de la base de donnees
│   └── seed.ts          # Script de seed
├── src/
│   ├── app/
│   │   ├── (auth)/      # Pages d'authentification
│   │   ├── (dashboard)/ # Pages du tableau de bord
│   │   └── api/         # Routes API
│   ├── components/      # Composants React
│   ├── lib/             # Utilitaires et configurations
│   └── styles/          # Styles CSS
├── public/              # Fichiers statiques
├── .env                 # Variables d'environnement
└── package.json         # Dependances du projet
```

## Comptes utilisateurs par defaut (apres seed)

| Role | Email | Mot de passe |
|------|-------|--------------|
| Owner | owner@facturexl.com | password123 |
| Admin | admin@facturexl.com | password123 |
| Employee | jean.dupont@facturexl.nc | password123 |
| Client | client1@example.com | password123 |

## Fonctionnalites

- **Tableau de bord** : Statistiques et graphiques
- **Factures** : Creation, modification, suppression, PDF
- **Devis** : Gestion des devis avec date de validite
- **Avoirs** : Notes de credit
- **Clients** : Gestion des clients
- **Employes** : Gestion des employes
- **Groupes** : Categories de produits/services
- **Articles** : Produits et services
- **Virements** : Suivi des paiements par virement
- **Paiements Stripe** : Paiement en ligne par carte
- **Multilingue** : Systeme de traduction complet Francais/Anglais

## Configuration Stripe (Paiements)

1. Creer un compte sur https://stripe.com
2. Recuperer les cles API dans le dashboard Stripe
3. Configurer les cles dans le fichier `.env`

## Configuration Email (SMTP)

Pour Gmail :
1. Activer l'authentification a deux facteurs
2. Creer un mot de passe d'application
3. Utiliser ce mot de passe dans `SMTP_PASS`

## Systeme de Traduction

L'application supporte maintenant un systeme de traduction complet Francais/Anglais.

### Utilisation

Dans vos composants :

```tsx
"use client";

import { useLanguage } from "@/lib/i18n";

export default function MyComponent() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <h1>{t("dashboard")}</h1>
      <button onClick={() => setLanguage("fr")}>Francais</button>
    </div>
  );
}
```

### Documentation

- **TRANSLATION_GUIDE.md** : Guide complet d'utilisation
- **TRANSLATION_EXAMPLES.md** : Exemples de conversion
- **TRANSLATION_IMPLEMENTATION.md** : Details de l'implementation

### Fonctionnalites

- ✅ 210+ cles de traduction
- ✅ Traduction en temps reel
- ✅ Persistance automatique (localStorage)
- ✅ Support TypeScript complet
- ✅ Selecteur de langue dans l'en-tete
- ✅ Parametres dynamiques (`t("displayingXofY", { x: 10, y: 100 })`)

## Support

Pour toute question ou probleme, consultez la documentation ou ouvrez une issue sur le repository.
