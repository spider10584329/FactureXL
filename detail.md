# FactureXL - Documentation Detaillee

## Vue d'ensemble

**FactureXL** est une plateforme complete de gestion de facturation construite avec des technologies web modernes. C'est un systeme multi-utilisateurs et multi-entreprises concu pour gerer les factures, devis, avoirs, clients, employes et transactions financieres.

### Stack Technologique

| Categorie | Technologies |
|-----------|--------------|
| Frontend | Next.js 14, React 18, TailwindCSS |
| Backend | Next.js API Routes |
| Base de donnees | MySQL avec Prisma ORM |
| Authentification | NextAuth.js avec JWT |
| Paiements | Stripe (paiements par carte) |
| Generation PDF | pdfmake |
| Export Excel | xlsx |
| Graphiques | Recharts |
| Email | Nodemailer |
| Validation | Zod, React Hook Form |

---

## Roles Utilisateurs et Permissions

L'application implemente un systeme de controle d'acces base sur 6 roles :

### 1. SUPER_ADMIN
- **Acces** : Tableau de bord + Gestion des entreprises uniquement
- Peut voir toutes les entreprises
- Peut creer de nouvelles entreprises
- Limite aux routes `/` et `/companies`

### 2. OWNER (Proprietaire)
- **Acces complet** a toutes les fonctionnalites
- Aucune restriction de route
- Droits complets de gestion d'entreprise

### 3. ADMIN (Administrateur)
- **Routes autorisees** : Tableau de bord, Clients, Employes, Groupes, Factures, Avoirs, Devis, Virements, Taxes, Profil
- Peut gerer les utilisateurs, produits et documents
- Ne peut pas acceder aux fonctionnalites super admin

### 4. MANAGER & EMPLOYEE (Gestionnaire & Employe)
- **Routes autorisees** : Factures, Avoirs, Devis, Profil
- Limite a la creation et consultation des factures/devis/avoirs
- Ne peut pas gerer les clients ou employes

### 5. CLIENT
- **Routes autorisees** : Tableau de bord, Factures, Profil
- Peut voir ses propres factures
- Peut effectuer des paiements
- Acces principalement en lecture seule

---

## Pages et Fonctionnalites

### 1. Tableau de bord (`/`)

**Fonctionnalites :**
- Cartes statistiques : Chiffre d'affaires total, Nombre de clients, Nombre de factures
- Tableau des factures du mois en cours avec pagination (10 elements par page)
- Export des ecritures comptables vers Excel avec filtrage par plage de dates
- Tableau statistiques par groupe (repartition mensuelle par categorie de produit)
- Tableau statistiques par employe (repartition mensuelle par employe)
- Graphique en ligne : Groupes/Mois avec infobulle interactive
- Support multilingue (Francais/Anglais)
- Recuperation des donnees en temps reel avec React Query

### 2. Factures (`/invoices`)

**Fonctionnalites :**
- Liste de toutes les factures avec recherche et filtrage (payee/en attente/toutes)
- Support de pagination (20 elements par page)
- Marquer comme payee avec selection du mode de paiement (carte, virement, prelevement)
- Paiement groupe pour plusieurs factures
- Integration Stripe pour les paiements par carte
- Telechargement PDF pour chaque facture
- Modification des factures via modal
- Suppression des factures (avec confirmation)
- Gestion du callback de paiement Stripe
- Visibilite basee sur le role (clients voient les leurs, admin voit tout)

### 3. Avoirs (`/avoirs`)

**Fonctionnalites :**
- Similaire aux factures mais pour les notes de credit
- Operations CRUD (Creer, Lire, Mettre a jour, Supprimer)
- Generation PDF
- Fonctionnalite de recherche
- Formulaire base sur dialog pour l'edition
- Affichage des montants en negatif (rouge)

### 4. Devis (`/devis`)

**Fonctionnalites :**
- Gestion des devis/propositions
- Conversion possible des devis en factures
- Suivi du statut de conversion
- Telechargement PDF
- Organisation par date
- Association client
- Indicateur d'expiration pour les devis depasses

### 5. Clients (`/clients`)

**Fonctionnalites :**
- Ajouter de nouveaux clients (avec role: CLIENT)
- Modifier les informations client
- Supprimer des clients
- Rechercher des clients par nom/email
- Details client : nom, email, telephone, adresse, ville, code postal, code de remise
- Gestion du statut actif
- Voir les details individuels du client (`/clients/[id]`)

### 6. Employes (`/employees`)

**Fonctionnalites :**
- Gerer les comptes employes
- Ajouter, modifier, supprimer des employes
- Fonctionnalite de recherche
- Roles employes : EMPLOYEE, ADMIN, OWNER
- Voir l'employe individuel (`/employees/[id]`)
- Suivre les factures creees par employe

### 7. Utilisateurs (`/users`)

**Fonctionnalites :**
- Gestion generale des utilisateurs
- Creer des utilisateurs avec differents roles
- Modifier les informations utilisateur
- Supprimer des utilisateurs
- Rechercher des utilisateurs
- Afficher tous les details utilisateur

### 8. Groupes (Categories de produits) (`/groups`)

**Fonctionnalites :**
- Creer des groupes/categories de produits/services
- Developper/reduire les groupes pour voir les articles
- Ajouter des articles dans les groupes
- Modifier les details du groupe (nom, code comptable, couleur)
- Supprimer des groupes
- Gestion des articles imbriques
- Organisation visuelle avec arbre expansible

### 9. Articles/Produits

**Fonctionnalites :**
- Ajouter des produits/services individuels aux groupes
- Definir : titre, prix, code, reference interne, unite, description, taxe
- Produits reutilisables pour les factures

### 10. Taxes (`/taxes`)

**Fonctionnalites :**
- Creer des taux de taxe (nom, pourcentage 0-100)
- Modifier les taxes existantes
- Supprimer des taxes
- Rechercher des taxes
- Pre-configure : TGC 0%, 3%, 6%, 11%, 22%

### 11. Virements (`/transfers`)

**Fonctionnalites :**
- Suivre les paiements par virement bancaire
- Filtrer par statut (confirme/en attente/tous)
- Confirmer l'achevement du virement
- Marquer les factures comme payees par virement
- Fonctionnalite de recherche
- Support de pagination

### 12. Factures d'abonnement (`/subscription-invoices`)

**Fonctionnalites :**
- Creer des factures recurrentes/d'abonnement
- Selectionner les mois d'abonnement
- Calcul automatique pour les elements recurrents
- Support des abonnements mensuels
- Modifier et gerer les abonnements

### 13. Parametres Entreprise (`/company`)

**Fonctionnalites :**
- Upload du logo/image de l'entreprise
- Nom de l'entreprise, email, telephone
- Adresse, ville, code postal
- Details bancaires : nom de banque, numero de compte, IBAN
- Description
- Apercu de l'image avec fonctionnalite d'upload

### 14. Profil Utilisateur (`/profile`)

**Fonctionnalites :**
- Modifier les informations personnelles : nom, email, telephone, adresse
- Fonctionnalite de changement de mot de passe
- Voir le role actuel
- Mise a jour de la session apres les changements
- Verification du mot de passe actuel

### 15. Gestion des Entreprises (`/companies`) - SUPER_ADMIN uniquement

**Fonctionnalites :**
- Lister toutes les entreprises
- Creer de nouvelles entreprises
- Gerer les details de l'entreprise
- Compteur d'utilisateurs par entreprise

---

## Points d'API (Endpoints)

### Routes d'Authentification

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/forgot-password` | Generer un token de reinitialisation de mot de passe |
| POST | `/api/auth/reset-password` | Reinitialiser le mot de passe avec le token |
| * | `/api/auth/[...nextauth]` | Configuration NextAuth.js |

### Gestion des Factures

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/invoices` | Recuperer les factures avec filtres optionnels |
| POST | `/api/invoices` | Creer une nouvelle facture |
| GET | `/api/invoices/[id]` | Recuperer une facture specifique |
| PUT | `/api/invoices/[id]` | Mettre a jour une facture |
| DELETE | `/api/invoices/[id]` | Supprimer une facture |

**Parametres de requete GET :**
- `type` : invoice | avoir | devis
- `archived` : true | false
- `paid` : true | false
- `clientId` : ID du client
- `employeeId` : ID de l'employe

### Gestion des Utilisateurs

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Lister les utilisateurs de l'entreprise |
| POST | `/api/users` | Creer un nouvel utilisateur |
| GET | `/api/users/[id]` | Recuperer un utilisateur specifique |
| PUT | `/api/users/[id]` | Mettre a jour un utilisateur |
| DELETE | `/api/users/[id]` | Supprimer un utilisateur |
| POST | `/api/users/[id]/change-password` | Changer le mot de passe |

### Gestion des Groupes

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/groups` | Lister les groupes de produits/services |
| POST | `/api/groups` | Creer un nouveau groupe |
| PUT | `/api/groups/[id]` | Mettre a jour un groupe |
| DELETE | `/api/groups/[id]` | Supprimer un groupe |

### Gestion de l'Entreprise

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/company` | Recuperer l'entreprise de l'utilisateur actuel |
| PUT | `/api/company` | Mettre a jour les details de l'entreprise |
| GET | `/api/companies` | Lister toutes les entreprises (SUPER_ADMIN) |
| POST | `/api/companies` | Creer une nouvelle entreprise (SUPER_ADMIN) |
| PUT | `/api/companies/[id]` | Mettre a jour une entreprise (SUPER_ADMIN) |
| DELETE | `/api/companies/[id]` | Supprimer une entreprise (SUPER_ADMIN) |

### Gestion des Taxes

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tax` | Lister tous les taux de taxe |
| POST | `/api/tax` | Creer un nouveau taux de taxe |
| PUT | `/api/tax/[id]` | Mettre a jour un taux de taxe |
| DELETE | `/api/tax/[id]` | Supprimer un taux de taxe |

### Integration Paiement (Stripe)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/stripe/create-checkout` | Creer une session de paiement Stripe |
| POST | `/api/stripe/webhook` | Gerer les evenements Stripe |

---

## Modeles de Donnees

### User (Utilisateur)
```
id            String    @id @default(cuid())
name          String?
email         String    @unique
password      String
role          Role      (SUPER_ADMIN|OWNER|ADMIN|MANAGER|EMPLOYEE|CLIENT)
isActive      Boolean   @default(false)
photo         String?
contract      String?
address       String?
city          String?
zipCode       String?
phone         String?
discount      Float     @default(0)
activeInvoice Boolean   @default(false)
code          String?
turnover      Float?
paymentMethod String?
resetToken    String?   @unique
resetTokenExpiry DateTime?
companyId     String?
```

### Company (Entreprise)
```
id          String   @id @default(cuid())
name        String
email       String?
password    String?
codePostal  String?
city        String?
phone       String?
address     String?
description String?  @db.Text
photo       String?
bank        String?
account     String?
iban        String?
```

### Invoice (Facture)
```
id                 String    @id @default(cuid())
ref                String    @unique
type               String    (invoice|avoir|devis)
startDate          DateTime?
endDate            DateTime?
paymentDate        DateTime?
total              Float     @default(0)
totalHT            Float     @default(0)
wording            String?
commentary         String?   @db.Text
subscription       Boolean   @default(false)
subscriptionMonths String?
month              Int?
archived           Boolean   @default(false)
paid               Boolean   @default(false)
lastPaymentMethod  String?
clientId           String
employeeId         String?
companyId          String
```

### InvoiceItem (Ligne de facture)
```
id          String  @id @default(cuid())
product     String
description String?
internRef   String?
unite       String?
price       Float
quantity    Int
discount    Float   @default(0)
tax         Float   @default(0)
invoiceId   String
groupId     String?
```

### Group (Groupe)
```
id        String  @id @default(cuid())
name      String
account   String?
color     String?
companyId String
```

### Article
```
id        String  @id @default(cuid())
title     String
code      String?
internRef String?
price     Float
unite     String?
description String?
tax       String?
groupId   String
```

### Tax (Taxe)
```
id      String @id @default(cuid())
name    String
percent Float
```

### Transfer (Virement)
```
id          String    @id @default(cuid())
ref         String
amount      Float
paymentDate DateTime?
```

---

## Fonctionnalites Cles et Integrations

### 1. Generation PDF
- **Bibliotheque** : pdfmake
- **Fonctionnalites** :
  - Generer des PDF pour factures, avoirs, devis
  - Inclure l'en-tete de l'entreprise avec logo
  - Informations de facturation client
  - Lignes detaillees avec taxes/remises
  - Calculs des totaux
  - Details bancaires de l'entreprise
  - Formatage professionnel
  - Support multilingue

### 2. Export Excel
- **Bibliotheque** : xlsx
- **Donnees exportees** :
  - Reference facture, nom client
  - Date de creation, date de paiement
  - Totaux (HT et TTC)
  - Statut de paiement
  - Mode de paiement
  - Information employe
  - Filtrage par plage de dates personnalisee
  - Nom de fichier automatique avec plage de dates

### 3. Integration Stripe
- **Capacites** :
  - Creer des sessions de paiement pour une ou plusieurs factures
  - Traitement des paiements par carte
  - Support de la devise XPF (Franc Pacifique)
  - Gestion des webhooks pour confirmation de paiement
  - Mise a jour automatique du statut de facture apres paiement reussi
  - Gestion des echecs de paiement
  - Verification securisee de signature
  - Suivi des metadonnees pour reconciliation

### 4. Authentification et Autorisation
- **NextAuth.js** :
  - Fournisseur de credentials (email/mot de passe)
  - Strategie de session JWT (expiration 30 jours)
  - Protection middleware basee sur les roles
  - Redirection automatique vers login si non autorise
  - Hachage de mot de passe Bcryptjs
  - Exigence d'activation de compte
  - Fonctionnalite de reinitialisation de mot de passe

### 5. Support Multilingue
- **Langues** : Anglais (en), Francais (fr)
- **Traductions** : Labels du tableau de bord, boutons, champs de formulaire
- **Hook** : `useLanguage()` pour acceder aux traductions

### 6. Composants UI
- **Framework** : Radix UI + TailwindCSS personnalise
- **Composants** :
  - Button, Card, Input, Label, Badge
  - Dialog (modal), Select
  - Tabs, Toast notifications
  - Pagination
  - Skeletons de chargement
  - Dialogues de confirmation
  - Dropdowns, alert dialogs

---

## Securite

### Authentification
- NextAuth.js avec JWT
- Hachage de mot de passe Bcryptjs (10 tours de sel)
- Tokens de reinitialisation de mot de passe avec expiration (1 heure)
- Exigence d'activation de compte

### Autorisation
- Verification de role basee sur middleware
- Protection de route par role
- Validation de session cote serveur
- Isolation des donnees basee sur l'entreprise (multi-tenant)

### Securite API
- Validation de session sur toutes les routes API
- Verification de signature webhook Stripe
- Validation de schema Zod
- Gestion des erreurs sans exposer de details sensibles

### Protection des Donnees
- Filtrage base sur l'entreprise pour support multi-tenant
- Application des roles utilisateur
- Tokens de reinitialisation proteges par mot de passe

---

## Structure du Projet

```
facturexl-next/
├── prisma/
│   ├── schema.prisma          # Schema de la base de donnees
│   └── seed.ts                # Script de seed
├── src/
│   ├── app/
│   │   ├── (auth)/            # Pages d'authentification
│   │   │   ├── login/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/       # Pages du tableau de bord
│   │   │   ├── page.tsx       # Tableau de bord principal
│   │   │   ├── invoices/      # Gestion des factures
│   │   │   ├── avoirs/        # Notes de credit
│   │   │   ├── devis/         # Devis
│   │   │   ├── clients/       # Gestion des clients
│   │   │   ├── employees/     # Gestion des employes
│   │   │   ├── users/         # Gestion des utilisateurs
│   │   │   ├── groups/        # Categories de produits
│   │   │   ├── taxes/         # Taux de taxe
│   │   │   ├── transfers/     # Virements bancaires
│   │   │   ├── subscription-invoices/
│   │   │   ├── company/       # Parametres entreprise
│   │   │   ├── profile/       # Profil utilisateur
│   │   │   └── companies/     # Gestion entreprises (SUPER_ADMIN)
│   │   ├── api/               # Routes API
│   │   │   ├── auth/
│   │   │   ├── invoices/
│   │   │   ├── users/
│   │   │   ├── companies/
│   │   │   ├── groups/
│   │   │   ├── tax/
│   │   │   ├── company/
│   │   │   └── stripe/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── invoices/          # Composants specifiques factures
│   │   ├── layout/            # Composants de mise en page
│   │   └── ui/                # Composants UI reutilisables
│   ├── lib/
│   │   ├── auth.ts            # Configuration NextAuth
│   │   ├── prisma.ts          # Client base de donnees
│   │   ├── pdf-generator.ts   # Creation PDF
│   │   ├── utils.ts           # Fonctions utilitaires
│   │   ├── toast.ts           # Notifications toast
│   │   └── i18n/              # Internationalisation
│   ├── types/                 # Types TypeScript
│   └── middleware.ts          # Routage base sur les roles
├── public/                    # Fichiers statiques
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## Statistiques du Projet

| Element | Nombre |
|---------|--------|
| Pages du tableau de bord | 16 |
| Routes API | 17+ |
| Modeles de donnees | 8 (User, Company, Invoice, InvoiceItem, Group, Article, Tax, Transfer) |
| Roles utilisateur | 6 (SUPER_ADMIN, OWNER, ADMIN, MANAGER, EMPLOYEE, CLIENT) |
| Types de document | 3 (Facture, Avoir, Devis) |
| Modes de paiement | 3 (Carte/Stripe, Virement, Prelevement) |
| Langues supportees | 2 (Francais, Anglais) |

---

## Details d'Implementation Notables

1. **Multi-Tenancy** : Toutes les donnees sont filtrees par entreprise pour la securite et l'isolation
2. **Calculs Automatiques** : Totaux, taxes et remises calcules a la creation/mise a jour
3. **Generation de Reference** : Numeros de reference facture auto-generes
4. **Pagination** : Le tableau de bord supporte 10-20 elements par page avec gestion d'etat
5. **Mises a Jour Temps Reel** : React Query gere le cache et l'invalidation
6. **Upload de Fichiers** : Support logo/image avec apercu pour entreprises et profils
7. **Gestion des Dates** : Support des plages de dates et filtrage par mois
8. **Stockage JSON** : Mois d'abonnement stockes en JSON pour flexibilite
9. **Suppressions en Cascade** : Les groupes suppriment avec cascade vers articles et lignes
10. **Suivi de Statut** : Les factures supportent paye/non paye, archive, et suivi du mode de paiement

---

## Comptes par Defaut (apres seed)

| Role | Email | Mot de passe |
|------|-------|--------------|
| Owner | owner@facturexl.com | password123 |
| Admin | admin@facturexl.com | password123 |
| Employee | jean.dupont@facturexl.nc | password123 |
| Client | client1@example.nc | password123 |

---

## Devise

L'application utilise le **XPF (Franc Pacifique)** comme devise principale, adaptee pour la Nouvelle-Caledonie et les territoires du Pacifique.
