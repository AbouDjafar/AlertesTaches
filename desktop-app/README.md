# Alertes Taches Desktop

Application desktop Tauri + React/Vite integree au depot principal `AlertesTaches`.

## Commandes utiles

```bash
npm install
npm run tauri:dev
npm run tauri:build
```

## Versioning

La version source est celle de `package.json`.

Avant chaque build web ou Tauri, le script `npm run sync:version` recopie cette version dans:

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Le backend Rust utilise ensuite `CARGO_PKG_VERSION`, ce qui garantit une version identique dans les metadonnees Tauri, les artefacts et les exports.

## Release GitHub Actions

Le workflow `desktop-release.yml` publie les builds Windows quand un tag Git `vX.Y.Z` est pousse.

Les artefacts de release sont generes depuis ce sous-projet uniquement:

- NSIS (`-setup.exe`)
- MSI (`.msi`)

## Signature Windows

Sans certificat de signature de code, Windows continuera d'afficher un avertissement de type editeur inconnu. C'est attendu.

Quand un certificat sera disponible, reserver les secrets GitHub suivants:

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`
- `WINDOWS_CERTIFICATE_SHA1` si la methode de signature retenue l'exige

Le champ `bundle.publisher` est deja defini a `AbouDjafar`, mais cela ne remplace pas une vraie signature numerique.
