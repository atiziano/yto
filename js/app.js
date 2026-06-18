// Usiamo i moduli nativi di Node.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==========================================================================
// APP.JS - MAIN APPLICATION FILE (Struttura ad Oggetto Unico)
// ==========================================================================

// 1. DICHIARAZIONE E INIZIALIZZAZIONE DELL'OGGETTO SPAZIO DEI NOMI (NAMESPACE)
window.yto = {
    databaseBasi: [],
    players: {
        video: null,
        sound: null
    },
    audio: {
        isSetup: false,
        volumeNode: null,
        limiter: null,
        eqBands: []
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
    
    // Forza la massimizzazione immediata tramite le API native di NW.js
    nw.Window.get().maximize();
    
    // Recupera i riferimenti ai player nel DOM
    window.yto.players.video = document.getElementById('vid');
    window.yto.players.sound = document.getElementById('suono');

    // 1. Carica la cartella predefinita standard all'avvio
    const percorsoSongs = path.join(process.cwd(), 'songs');
    caricaCartellaLocale(percorsoSongs);    

    // ==========================================================================
    // 💾 2. RIPRISTINO AUTOMATICO CARTELLE APERTE PRECEDENTEMENTE (LocalStorage)
    // ==========================================================================
    const cartelleSalvate = localStorage.getItem('yto_cartelle_locali');
    if (cartelleSalvate) {
        try {
            const percorsi = JSON.parse(cartelleSalvate);
            if (Array.isArray(percorsi) && percorsi.length > 0) {
                console.log(`🔄 [Storage] Ripristino di ${percorsi.length} cartelle salvate...`);
                percorsi.forEach(percorso => {
                    // Evitiamo di scansionare due volte la cartella 'songs' predefinita se è già lì
                    if (percorso !== percorsoSongs) {
                        caricaCartellaLocale(percorso);
                    }
                });
            }
        } catch (e) {
            console.error("❌ [Storage] Errore nel caricamento delle cartelle salvate:", e);
        }
    }
    // ==========================================================================

    // Inizializza tutti i controlli audio basandoti sulla nuova posizione di controlli
    if (window.yto.ui.controlli) {
        Object.keys(window.yto.ui.controlli).forEach(type => {
            if (typeof updateFX === "function") updateFX(type, null, true);
        });
    }

    if (typeof renderSingers === "function") renderSingers();

    // 🚀 GESTIONE ERRORI: Intercetta file locali corrotti o chiavette rimosse
    if (window.yto.players.video) {
        window.yto.players.video.onerror = function() {
            console.error("❌ Errore nel caricamento del file video corrente.");
            alert("Impossibile riprodurre il file. Potrebbe essere stato spostato o danneggiato.");
        };

        // Spegne filler quando parte la traccia locale
        window.yto.players.video.onplay = function() {
            if (window.yto.players.sound && !window.yto.players.sound.paused) {
                window.yto.players.sound.pause();
            }
        };
    }
    
    // 🚀 GESTIONE SIDEBAR UNIFICATA: Interamente delegata al JS (rimosso inline HTML)
    const menuBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.onclick = function() {
            sidebar.classList.toggle('sidebar-visible');
            sidebar.classList.toggle('sidebar-hidden');
        };
    }

    // 🚀 COMODITÀ DI RICERCA: Se l'utente preme Invio nell'input, avvia la ricerca YouTube
    const inputRicerca = document.getElementById('myInput');

    if (inputRicerca) {
        inputRicerca.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                const query = this.value.trim();
                
                // 🎯 LETTURA DINAMICA: Recuperiamo il valore della combo al momento del click/invio
                const selectLimite = document.getElementById('quantita-risultati');
                const limiteAttuale = selectLimite ? selectLimite.value : 5; 

                if (query !== "" && typeof cercaSuYouTubeNW === 'function') {
                    cercaSuYouTubeNW(query, limiteAttuale);
                }
            }
        });
    }

    console.log("✅ [Core] Sistema Pronto! Struttura window.yto attiva.");
}

/**
 * Renderizza i brani del database all'interno della griglia HTML.
 * Gestisce sia le canzoni locali complete, sia quelle in fase di download (placeholder vuoti).
 * @param {Array} arrayBasi - La lista di tracce da mostrare (es. window.yto.databaseBasi)
 */
function mostraInGriglia(arrayBasi) {
    const container = document.getElementById("myUL");
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!arrayBasi || arrayBasi.length === 0) {
        container.innerHTML = `<li style="padding:20px; color:#64748b; width:100%; text-align:center;">Nessuna traccia disponibile.</li>`;
        return;
    }

    arrayBasi.forEach(base => {
        const li = document.createElement("li");
        
        li.setAttribute('data-name', base.titolo || '');
        
        // Gestione classe download in corso
        if (base.tipo === 'locale' && !base.pathCompleto) {
            li.classList.add("is-downloading");
        }
        
        li.innerHTML = `
            <div class="thumb-wrapper" style="position:relative; width:100%; aspect-ratio:16/9; overflow:hidden;">
                ${base.copertina ? 
                    `<img src="${base.copertina}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">` : 
                    `<div class="placeholder-thumb" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">${!base.pathCompleto ? '📥' : '🎵'}</div>`
                }
            </div>
            <div class="song-info">
                <h4 title="${base.titolo}">${base.titolo}</h4>
            </div>
        `;
        
        // Evento click per avviare la riproduzione
        li.onclick = () => {
            if (base.tipo === 'locale' && !base.pathCompleto) return;
            if (typeof play === 'function') {
                play(base.pathCompleto, li);
            } else if (window.parent && typeof window.parent.play === 'function') {
                window.parent.play(base.pathCompleto, li);
            }
        };
        
        container.appendChild(li);
    });
}

// Esponiamo la funzione globalmente
window.mostraInGriglia = mostraInGriglia;

/**
 * Gestisce la visibilità della modale di caricamento.
 * @param {boolean} mostra - true per aprire la modale, false per chiuderla.
 */
window.toggleModaleAttesa = function(mostra) {
    const dialog = document.getElementById('modal-attesa');
    if (!dialog) return;

    if (mostra) {
        if (!dialog.open) {
            dialog.showModal();
        }
    } else {
        if (dialog.open) {
            dialog.close();
        }
    }
};

// Avvio rapido non appena la struttura del DOM è pronta
document.addEventListener("DOMContentLoaded", initApp);