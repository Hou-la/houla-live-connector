# Connecteur Hou.la — démarrage rapide

Ce petit programme relie tes **cadeaux de live Hou.la** à ton **jeu / ta scène**
(Minecraft, OBS, lumières, ASMR, musique…). Pas de terminal, pas de npm.

## 1. Configure (30 secondes)
Ouvre **`houla.config.json`** (à côté du programme) et colle ta clé :

```json
{
  "key": "hle_ta_cle_ici",
  "preset": "bundle.json",
  "vars": { "player": "TonPseudoMinecraft" },
  "rcon": { "host": "127.0.0.1", "port": 25575, "password": "ton_mot_de_passe_rcon" }
}
```
- **`key`** : crée-la sur **Hou.la → Studio → Connecteur live**, puis colle-la ici.
- **`rcon`** : uniquement pour Minecraft (sinon supprime ce bloc — les effets seront juste affichés).
- **`bundle.json`** : fourni à côté (le pack Minecraft, 30 cadeaux → commandes). Édite-le pour changer les effets.

## 2. Lance
- **Windows** : double-clic sur **`houla-connector.exe`**. Si Windows affiche « SmartScreen » → *Informations complémentaires → Exécuter quand même*.
- **macOS** : clic droit sur **`houla-connector`** → *Ouvrir* (la 1ʳᵉ fois, macOS demande confirmation : *Réglages → Confidentialité et sécurité → Ouvrir quand même*). Ou dans le Terminal : `chmod +x houla-connector && ./houla-connector`.
- **Linux** : `chmod +x houla-connector && ./houla-connector`.

Au 1ᵉʳ lancement sans clé, il te la demande et la retient. Laisse-le tourner pendant ton live.

## 3. Minecraft — activer RCON (une fois)
Dans le **`server.properties`** de ton serveur :
```
enable-rcon=true
rcon.port=25575
rcon.password=ton_mot_de_passe_rcon
```
Relance le serveur, rejoins-le, et mets ce mot de passe + ton pseudo dans `houla.config.json`.

## Tester sans live ni coins
Depuis les sources : `MC_PLAYER=TonPseudo RCON_PASSWORD=ton_mdp node examples/minecraft-simulate.js`
→ simule l'envoi des cadeaux, les effets partent réellement en jeu.

---
Créer/personnaliser un pack pour un autre jeu : **github.com/Hou-la/houla-bundles** (via Pull Request).
