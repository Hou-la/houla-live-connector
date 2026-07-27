// Test interactif DIRECT dans Minecraft — SANS live, SANS coins, SANS viewer.
//
// Ce script charge le mapping d'effet du pack (gaming-fx.bundle.json), le branche
// au MÊME moteur que le vrai connecteur (`applyPreset`), puis SIMULE l'envoi de
// chaque cadeau interactif. La commande part réellement dans Minecraft via RCON,
// donc tu vois les effets en jeu tout de suite — c'est le moyen le plus rapide de
// valider que « les triggers remontent bien » avant de tester en live réel.
//
// ── Pré-requis ────────────────────────────────────────────────────────────────
// Un serveur Minecraft Java local (pas un monde solo — RCON exige un serveur) avec,
// dans server.properties :
//   enable-rcon=true
//   rcon.port=25575
//   rcon.password=changeme
// …et TON joueur connecté sur ce serveur (les commandes ciblent {player}).
//
// ── Lancer (depuis le repo du connecteur — dist déjà build, rcon-client déjà là) ─
//   MC_PLAYER=TonPseudo RCON_PASSWORD=changeme node examples/minecraft-simulate.js
//
// (Windows PowerShell : $env:MC_PLAYER="TonPseudo"; $env:RCON_PASSWORD="changeme"; node examples/minecraft-simulate.js)

const path = require('path');

// Marche depuis le repo (../dist) OU en standalone après `npm i @houla/live-connector`.
let houla;
try {
  houla = require('@houla/live-connector');
} catch {
  houla = require('../dist');
}
const { HoulaLiveConnection, loadPreset, applyPreset } = houla;
const { Rcon } = require('rcon-client');

const PLAYER = process.env.MC_PLAYER || 'TonPseudo';
const RCON = {
  host: process.env.RCON_HOST || '127.0.0.1',
  port: Number(process.env.RCON_PORT || 25575),
  password: process.env.RCON_PASSWORD || 'changeme',
};
const PRESET_PATH = path.join(__dirname, 'gaming-fx.bundle.json');

async function main() {
  const rcon = await Rcon.connect(RCON);
  console.log(`RCON connecté ${RCON.host}:${RCON.port} — joueur cible : ${PLAYER}\n`);

  const preset = loadPreset(PRESET_PATH);
  // Pas de connexion réseau : simulateGift émet localement, applyPreset l'exécute.
  const conn = new HoulaLiveConnection({ token: 'sandbox' });

  applyPreset(conn, preset, {
    vars: { player: PLAYER },
    onCommand: async (cmd, g) => {
      console.log(`🎁 ${g.gift.slug}  →  ${cmd}`);
      try {
        const res = await rcon.send(cmd);
        if (res && res.trim()) console.log('   ↳', res.trim());
      } catch (e) {
        console.log('   RCON:', e.message);
      }
    },
  });

  // Simule l'envoi de chaque cadeau du pack, à 2,5 s d'intervalle, pour voir
  // chaque effet distinctement en jeu.
  const slugs = Object.keys(preset);
  console.log(`Simulation de ${slugs.length} cadeaux : ${slugs.join(', ')}\n`);
  for (const slug of slugs) {
    conn.simulateGift({ slug, senderName: 'Testeur' });
    await new Promise((r) => setTimeout(r, 2500));
  }

  await rcon.end();
  console.log(
    "\nTerminé ✅  (rien en jeu ? vérifie que ton joueur est connecté au serveur et que RCON vise le bon serveur)",
  );
}

main().catch((e) => {
  console.error('Échec :', e.message);
  process.exit(1);
});
