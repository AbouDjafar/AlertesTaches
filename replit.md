# Alertes Tâches

Application mobile Expo/React Native de suivi de tâches à partir d'un fichier JSON stocké sur Android.

## Architecture

- `app/` contient les écrans Expo Router.
- `context/TaskContext.tsx` centralise les tâches, le fichier JSON chargé, les réglages et les actions de modification.
- `utils/core.ts` contient la logique métier, la lecture/écriture du JSON et l'accès au stockage Android.
- `utils/notifications.ts` gère les notifications locales groupées par échéance.

## Accès au fichier JSON Android

L'application tente d'abord l'ancien chemin direct `/storage/emulated/0/AlertesTaches/` pour compatibilité. Sur Android récent, l'accès direct étant bloqué, elle utilise ensuite le Storage Access Framework via `expo-file-system` pour demander à l'utilisateur de sélectionner le dossier `AlertesTaches`. L'URI du dossier autorisé est mémorisé avec AsyncStorage et réutilisé pour lire et mettre à jour le fichier JSON.