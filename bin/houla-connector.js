#!/usr/bin/env node
/*
 * Hou.la connector — no-code runner.
 *
 * Meant to be shipped as a SINGLE double-clickable executable (see
 * `npm run build:exe`) so a non-technical streamer never touches npm or a
 * terminal. It reads `houla.config.json` sitting NEXT TO the executable, asks
 * for the key on first run, connects, applies a bundle's effect preset, and
 * (optionally) forwards commands to a Minecraft server over RCON.
 *
 * The connector is OPTIONAL — a streamer only runs this if they want gifts to
 * trigger real-world effects.
 */
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { HoulaLiveConnection, loadPreset, applyPreset } = require('../dist')

// Config + preset live NEXT TO the exe when packaged, else the current folder.
const baseDir =
    // eslint-disable-next-line no-undef
    typeof process.pkg !== 'undefined'
        ? path.dirname(process.execPath)
        : process.cwd()
const CONFIG_PATH = path.join(baseDir, 'houla.config.json')

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise((resolve) =>
        rl.question(question, (a) => {
            rl.close()
            resolve(a)
        }),
    )
}

async function main() {
    let cfg = {}
    if (fs.existsSync(CONFIG_PATH)) {
        cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    }

    // First run — ask for the key and remember it.
    if (!cfg.key) {
        console.log('Bienvenue ! Crée une clé dans ton Studio Hou.la → Connecteur live.')
        cfg.key = (await ask('Colle ta clé (hle_…) puis Entrée : ')).trim()
        if (!cfg.key.startsWith('hle_')) {
            console.log('Cette clé ne ressemble pas à une clé Hou.la (hle_…). On continue quand même.')
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
        console.log(`Clé enregistrée dans ${CONFIG_PATH}\n`)
    }

    // Optional effect preset (a bundle.json next to the exe, or cfg.preset).
    let preset = null
    const presetPath = path.join(baseDir, cfg.preset || 'bundle.json')
    if (fs.existsSync(presetPath)) {
        preset = loadPreset(presetPath)
        console.log(`Preset chargé : ${path.basename(presetPath)} (${Object.keys(preset).length} slots)`)
    } else {
        console.log('Aucun preset (bundle.json) — les cadeaux seront juste affichés.')
    }

    // Optional Minecraft RCON (rcon-client is an optional dependency).
    let rcon = null
    if (cfg.rcon && cfg.rcon.host) {
        try {
            const { Rcon } = require('rcon-client')
            rcon = await Rcon.connect({
                host: cfg.rcon.host,
                port: cfg.rcon.port || 25575,
                password: cfg.rcon.password || '',
            })
            console.log(`RCON connecté à ${cfg.rcon.host}:${cfg.rcon.port || 25575}`)
        } catch (e) {
            console.log(`RCON indisponible (${e.message}) — les commandes seront seulement affichées.`)
        }
    }

    const conn = new HoulaLiveConnection({ token: cfg.key, url: cfg.url })
    conn.on('connected', (i) =>
        console.log(`✓ Branché — live du workspace ${i.workspaceId}\n`),
    )
    conn.on('error', (e) => console.error(`Erreur : ${e.message}`))
    conn.on('disconnected', (r) => console.log(`Déconnecté (${r}) — reconnexion auto…`))

    if (preset) {
        applyPreset(conn, preset, {
            cooldownMs: cfg.cooldownMs != null ? cfg.cooldownMs : 1500,
            vars: cfg.vars || {},
            onCommand: async (command, gift) => {
                console.log(`🎁 ${gift.gift.slug} ×${gift.gift.quantity} → ${command}`)
                if (rcon) {
                    try {
                        await rcon.send(command)
                    } catch (e) {
                        console.log(`  RCON: ${e.message}`)
                    }
                }
            },
        })
    } else {
        conn.on('gift', (g) =>
            console.log(`🎁 ${g.gift.name} (${g.gift.slug}) ×${g.gift.quantity} — ${g.sender.name || 'anon'}`),
        )
    }

    conn.connect()
    console.log('En écoute… (ferme la fenêtre pour arrêter)')
}

main().catch(async (e) => {
    console.error(`\nProblème : ${e.message}`)
    // Keep the window open when double-clicked so the message is readable.
    await ask('Appuie sur Entrée pour fermer…')
    process.exit(1)
})
