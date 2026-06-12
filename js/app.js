// ==========================================================================
// APP.JS - MAIN APPLICATION FILE (Struttura ad Oggetto Unico)
// ==========================================================================

// 1. DICHIARAZIONE E INIZIALIZZAZIONE DELL'OGGETTO SPAZIO DEI NOMI (NAMESPACE)
window.karaoke = {
    players: {
        video: null,
        sound: null,
        youtube: null
    },
    audio: {
        isSetup: false,
        volumeNode: null,
        limiter: null,
        eqBands: []
        // ... aggiungi qui gli altri nodi quando servono
    },
    ui: {
        controlli: (typeof controlli !== "undefined") ? controlli : {}
    }
};

/**
 * Funzione di inizializzazione dell'app, chiamata al caricamento del DOM
 */
function initApp() {
    console.log("🚀 [Core] Inizializzazione sistema Karaoke (Oggetto Unico)...");

    // Recupera i riferimenti e li salva direttamente dentro window.karaoke
    window.karaoke.players.video = document.getElementById('vid');
    window.karaoke.players.sound = document.getElementById('suono');
    window.karaoke.players.youtube = document.getElementById('youtube-player');

    // Inizializza tutti i controlli audio basandoti sulla nuova posizione di controlli
    if (window.karaoke.ui.controlli) {
        Object.keys(window.karaoke.ui.controlli).forEach(type => {
            if (typeof updateFX === "function") updateFX(type, null, true);
        });
    }

    // Avvio funzioni di supporto grafiche/statistiche
    if (typeof updateStat === "function") updateStat();
    if (typeof renderSingers === "function") renderSingers();

    console.log("✅ [Core] Sistema Pronto! Struttura window.karaoke attiva.");
}

// Avvio rapido non appena la struttura del DOM è pronta
document.addEventListener("DOMContentLoaded", initApp);