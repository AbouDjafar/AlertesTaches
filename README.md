# Alertes Tâches — Guide de Build Complet

Application mobile de gestion de tâches avec alertes visuelles et notifications push groupées par échéance.

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Structure du projet](#structure-du-projet)
3. [Versions exactes des packages](#versions-exactes-des-packages)
4. [Installation depuis les sources](#installation-depuis-les-sources)
5. [Lancer en développement (Expo Go)](#lancer-en-développement-expo-go)
6. [Build APK Android (EAS Build)](#build-apk-android-eas-build)
7. [Build IPA iOS (EAS Build)](#build-ipa-ios-eas-build)
8. [Fonctionnalités](#fonctionnalités)

---

## Prérequis

| Outil | Version requise | Installation |
|-------|-----------------|--------------|
| Node.js | >= 18 (recommandé : 24 LTS) | https://nodejs.org |
| npm | >= 10 | Inclus avec Node.js |
| Expo CLI | Dernière version | `npm install -g expo-cli` |
| EAS CLI | Dernière version | `npm install -g eas-cli` |
| Git | >= 2.x | https://git-scm.com |

> **Android** : Android Studio avec SDK 33+ pour builds locaux optionnels
> **iOS** : macOS avec Xcode 15+ (build iOS uniquement sur macOS)

---

## Structure du projet

```
alertes-taches/
├── app/
│   ├── _layout.tsx          # Layout racine + gestionnaire notifications
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar (4 onglets)
│       ├── index.tsx        # Accueil
│       ├── tasks.tsx        # Liste des tâches
│       ├── settings.tsx     # Réglages + notifications
│       └── about.tsx        # À propos
├── assets/
│   └── images/
│       └── icon.png         # Icône de l'application
├── components/
│   ├── AddTaskModal.tsx     # Modal ajout de tâche
│   ├── ErrorBoundary.tsx    # Gestion d'erreurs globale
│   ├── ErrorFallback.tsx    # UI d'erreur
│   ├── HomeButton.tsx       # Bouton de navigation accueil
│   ├── KeyboardAwareScrollViewCompat.tsx
│   └── TaskCard.tsx         # Carte de tâche avec code couleur
├── constants/
│   └── colors.ts            # Design tokens (couleurs, radius)
├── context/
│   └── TaskContext.tsx      # État global des tâches (React Context)
├── data/
│   └── sampleTasks.json     # Données d'exemple (fallback)
├── hooks/
│   └── useColors.ts         # Hook pour les couleurs avec dark mode
├── utils/
│   ├── core.ts              # Logique métier (filtrage, calcul échéances)
│   ├── excelExport.ts       # Export CSV + partage
│   └── notifications.ts     # Notifications push groupées
├── app.json                 # Configuration Expo
├── babel.config.js          # Configuration Babel
├── package.json             # Dépendances
└── tsconfig.json            # Configuration TypeScript
```

---

## Versions exactes des packages

### Runtime

| Package | Version |
|---------|---------|
| `react` | `19.1.0` |
| `react-native` | `0.81.5` |
| `expo` | `~54.0.27` |
| `expo-router` | `~6.0.17` |

### Expo Modules

| Package | Version |
|---------|---------|
| `expo-blur` | `~15.0.8` |
| `expo-constants` | `~18.0.11` |
| `expo-file-system` | `~19.0.21` |
| `expo-font` | `~14.0.10` |
| `expo-glass-effect` | `~0.1.4` |
| `expo-haptics` | `~15.0.8` |
| `expo-image` | `~3.0.11` |
| `expo-image-picker` | `~17.0.9` |
| `expo-linear-gradient` | `~15.0.8` |
| `expo-linking` | `~8.0.10` |
| `expo-location` | `~19.0.8` |
| `expo-notifications` | `~0.32.16` |
| `expo-sharing` | `~14.0.8` |
| `expo-splash-screen` | `~31.0.12` |
| `expo-status-bar` | `~3.0.9` |
| `expo-symbols` | `~1.0.8` |
| `expo-system-ui` | `~6.0.9` |
| `expo-web-browser` | `~15.0.10` |

### React Native Libraries

| Package | Version |
|---------|---------|
| `react-native-gesture-handler` | `~2.28.0` |
| `react-native-keyboard-controller` | `1.18.5` |
| `react-native-reanimated` | `~4.1.1` |
| `react-native-safe-area-context` | `~5.6.0` |
| `react-native-screens` | `~4.16.0` |
| `react-native-svg` | `15.12.1` |
| `react-native-web` | `^0.21.0` |
| `react-native-worklets` | `0.5.1` |
| `@react-native-async-storage/async-storage` | `2.2.0` |

### Outils & Dev

| Package | Version |
|---------|---------|
| `typescript` | `~5.9.2` |
| `@babel/core` | `^7.25.2` |
| `@expo/cli` | `54.0.23` |
| `@expo/vector-icons` | `^15.0.3` |
| `@expo-google-fonts/inter` | `^0.4.0` |
| `@tanstack/react-query` | `^5.90.21` |
| `babel-plugin-react-compiler` | `^19.0.0-beta-e993439-20250117` |

---

## Installation depuis les sources

### Étape 1 — Extraire les sources

```bash
# Dézipper l'archive
unzip alertes-taches-sources.zip -d alertes-taches
cd alertes-taches
```

### Étape 2 — Installer Node.js 24 (si pas déjà installé)

```bash
# Via nvm (recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
node --version   # Doit afficher v24.x.x
```

### Étape 3 — Installer les dépendances

```bash
npm install
```

> ⚠️ Utiliser `npm install` (et non `yarn` ou `pnpm`) pour éviter les conflits de lockfile avec Expo Go.

### Étape 4 — Vérifier l'installation

```bash
npx expo doctor
```

Résoudre tous les avertissements signalés avant de continuer.

---

## Lancer en développement (Expo Go)

### Sur émulateur / appareil physique

```bash
# Démarrer le serveur Metro
npx expo start

# Puis :
# - Appuyer sur 'a' pour ouvrir Android Emulator
# - Appuyer sur 'i' pour ouvrir iOS Simulator (macOS uniquement)
# - Scanner le QR code avec l'app Expo Go sur votre téléphone
```

### Sur web (navigateur)

```bash
npx expo start --web
```

---

## Build APK Android (EAS Build)

### Étape 1 — Créer un compte Expo

1. Aller sur https://expo.dev
2. Créer un compte gratuit
3. Créer un nouveau projet dans le dashboard

### Étape 2 — Installer EAS CLI

```bash
npm install -g eas-cli
```

### Étape 3 — Se connecter

```bash
eas login
# Saisir email + mot de passe du compte Expo
```

### Étape 4 — Initialiser EAS dans le projet

```bash
eas init
# Suivre les instructions : sélectionner le projet créé sur expo.dev
```

Cela crée / met à jour le `app.json` avec un `projectId` et génère un fichier `eas.json`.

### Étape 5 — Configurer eas.json

Créer ou vérifier le fichier `eas.json` à la racine :

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Étape 6 — Lancer le build APK (profil "preview")

```bash
eas build --platform android --profile preview
```

> Le build se lance dans le cloud Expo (~10-20 minutes). Un lien de téléchargement du `.apk` est fourni à la fin.

### Étape 7 — Télécharger et installer l'APK

```bash
# Télécharger depuis le lien fourni par EAS
# Ou via la commande :
eas build:list
# Copier l'URL du build et ouvrir dans navigateur pour télécharger
```

Transférer le `.apk` sur votre appareil Android et l'installer (activer "Sources inconnues" si nécessaire dans Paramètres > Sécurité).

---

## Build IPA iOS (EAS Build)

> Requiert : un compte Apple Developer (99 $/an) et un Mac avec Xcode 15+.

### Étape 1 — Configurer les certificats Apple

```bash
eas credentials
# Suivre les instructions pour configurer le certificat de distribution
# et le profil de provisionnement
```

### Étape 2 — Lancer le build iOS

```bash
# Build pour TestFlight / App Store
eas build --platform ios --profile production

# Build pour test interne (IPA)
eas build --platform ios --profile preview
```

### Étape 3 — Soumettre sur l'App Store (optionnel)

```bash
eas submit --platform ios
```

---

## Build local Android (sans compte Expo, avancé)

> Requiert Android Studio installé avec SDK 33+ et les variables d'environnement configurées.

```bash
# Générer le projet Android natif
npx expo prebuild --platform android

# Compiler avec Gradle
cd android
./gradlew assembleRelease    # APK release
./gradlew assembleDebug      # APK debug

# L'APK se trouve dans :
# android/app/build/outputs/apk/release/app-release.apk
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Fonctionnalités

### Code couleur des tâches

| Couleur | Condition |
|---------|-----------|
| Gris | Échéance dépassée ou aujourd'hui |
| Rose | Échéance demain |
| Jaune | Échéance dans 2 jours |
| Bleu clair | Échéance entre 3 et 7 jours |
| Vert clair | Échéance dans plus de 7 jours |

### Notifications push

- **Groupées** par nombre de jours restants (une notification par groupe)
- **Quotidiennes** à l'heure configurée dans les Réglages
- **Clic** sur la notification ouvre directement la page Tâches
- Activables depuis l'onglet Réglages (toggle + demande de permission)

### Format JSON des tâches

```json
[
  {
    "nom": "Nom de la tâche",
    "echeance": "2026-04-15",
    "personne": "Prénom",
    "duree": 3,
    "details": "Description de la tâche",
    "terminee": false
  }
]
```

- Les tâches avec `"terminee": true` sont automatiquement filtrées
- Si aucune tâche active : "Aucune tâche en cours pour l'instant"

### Export

- Format CSV (`.csv`) nommé `nomUtilisateur_taches.csv`
- Partage via le système natif (AirDrop, e-mail, WhatsApp, etc.)

---

## Dépannage fréquent

| Problème | Solution |
|----------|----------|
| `ENOENT: no such file or directory, watch ...sucrase_tmp` | Relancer `npx expo start` (erreur Metro transitoire) |
| `expo-notifications` version incompatible | `npx expo install expo-notifications` (auto-détecte la bonne version) |
| Notifications ne s'affichent pas sur iOS Simulator | Tester sur appareil physique uniquement |
| Permission notification refusée | Aller dans Réglages appareil > Notifications > Alertes Tâches |
| Metro bundler lent au premier démarrage | Normal, attendre le cache initial (~60s) |

---

## Support

Développé avec [Expo SDK 54](https://docs.expo.dev) et [React Native 0.81](https://reactnative.dev).
