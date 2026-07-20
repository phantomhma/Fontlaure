# Potager Fontlaure

PWA de gestion du potager : ramassage, vente, articles/prix, tableau de bord.

## Usage

Ouvrir `index.html` via un serveur local (le service worker exige http:// ou https://, pas `file://`) :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis "Ajouter à l'écran d'accueil" depuis le téléphone pour l'installer en PWA.

## Données

- Stockage local : `localStorage`, persistant sur l'appareil.
- Export/Import JSON : onglet Réglages, pour sauvegarde manuelle.
- Synchronisation GitHub (Réglages) : nécessite un PAT avec le scope `repo`,
  lit/écrit `data.json` dans ce dépôt via l'API Contents. La fusion se fait
  par enregistrement (le plus récent `updatedAt` gagne), donc deux
  contributeurs peuvent modifier hors-ligne sans s'écraser mutuellement.
