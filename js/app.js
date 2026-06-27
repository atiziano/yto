// Usiamo i moduli nativi di Node.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const gui = require('nw.gui');
const { exec } = require('child_process');

const listaTemi = ['dark', 'light'];

// ==========================================================================
// APP.JS - MAIN APPLICATION FILE (Struttura ad Oggetto Unico)
// ==========================================================================

// 1. DICHIARAZIONE E INIZIALIZZAZIONE DELL'OGGETTO SPAZIO DEI NOMI (NAMESPACE)
window.yto = {
    databaseBasi: [],
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
    
    // Ti mostra il percorso esatto dell'eseguibile che sta girando in questo momento
    console.log("📍 NW.js sta girando da qui:", process.execPath);
    
    // Forza la massimizzazione immediata tramite le API native di NW.js
    nw.Window.get().maximize();
    
    // Recupera i riferimenti ai player nel DOM
    window.yto.players.video = document.getElementById('vid');
    window.yto.players.sound = document.getElementById('suono');
    window.yto.players.youtube = document.getElementById('youtube-player');

    caricaTemaPredefinito();

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

    // 🎯 LOGICA PER IL MENU SEGRETO DI MANUTENZIONE
    const btnConsole = document.getElementById("btn-console");
    const menuSegreto = document.getElementById("menu-manutenzione-segreto");

    if (btnConsole && menuSegreto) {
        // Cattura il CLICK DESTRO sul tasto 🛠️
        btnConsole.addEventListener("contextmenu", (e) => {
            e.preventDefault(); // Blocca il menu predefinito di Windows
            menuSegreto.style.display = "block"; // Mostra la tendina
        });
    }

    // Chiude il menu se l'utente clicca in un qualsiasi altro punto dello schermo
    document.addEventListener("click", (e) => {
        if (menuSegreto && btnConsole && !btnConsole.contains(e.target) && !menuSegreto.contains(e.target)) {
            menuSegreto.style.display = "none";
        }
    });
    
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
        
        li.setAttribute('data-url', base.pathCompleto || ''); // Permette al progresso di trovare la card

        // 1. Assegnazione classi di stato e sorgente (per l'opacità via CSS)
        if (base.tipo === 'locale') {
            li.classList.add("is-local");
            if (!base.pathCompleto) li.classList.add("is-downloading");
        }
        
        if (base.tipo === 'youtube') {
            li.classList.add("is-youtube"); 
        }
        
        // 2. Definizione dei badge sovrapposti e delle icone di fallback
        let badgeSorgente = "";
        let fallbackIcona = "🎵";

        if (base.tipo === 'youtube') {
            badgeSorgente = `<div class="badge-sorgente" style="position:absolute; top:5px; right:5px; background:rgba(255,0,0,0.85); color:white; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; z-index:2; user-select:none;">🌐 YT</div>`;
            fallbackIcona = "🌐";
        } else if (base.tipo === 'locale') {
            badgeSorgente = `<div class="badge-sorgente" style="position:absolute; top:5px; right:5px; background:rgba(34,197,94,0.85); color:white; padding:2px 6px; font-size:10px; border-radius:4px; font-weight:bold; z-index:2; user-select:none;">📁 PC</div>`;
            fallbackIcona = !base.pathCompleto ? '📥' : '🎵';
        }
        
        // 3. Generazione dell'HTML della card
        li.innerHTML = `
            <div class="thumb-wrapper" style="position:relative; width:100%; aspect-ratio:16/9; overflow:hidden;">
                ${badgeSorgente}
                ${base.copertina ? 
                    `<img src="${base.copertina}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">` : 
                    `<div class="placeholder-thumb" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1e1e2e; font-size:2rem;">${fallbackIcona}</div>`
                }
            </div>
            <div class="song-info" style="position:relative;">
                <h4 title="${base.titolo}">${base.titolo}</h4>
                ${base.canale ? `<small style="color:#64748b; font-size:0.75rem; display:block; margin-top:2px;">${base.canale}</small>` : ''}
            </div>
        `;
        
        // 4. Gestione dell'evento click (Invariata)
        li.onclick = () => {
            if (base.tipo === 'locale' && !base.pathCompleto) return;
            if (typeof play === 'function') {
                play(base.pathCompleto, li);
            } else if (window.parent && typeof window.parent.play === 'function') {
                window.parent.play(base.pathCompleto, li);
            }
            switchPlayer(base.tipo);
        };
        
        container.appendChild(li);

        agganciaMenuContestuale(li, base.pathCompleto);
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
            dialog.show();
        }
    } else {
        if (dialog.open) {
            dialog.close();
        }
    }
};

/**
 * Aggiorna il binario di yt-dlp usando il wrapper ytDlpWrap
 */
function aggiornaYtdlp() {
    console.log("⚡ [Updater] Avvio controllo aggiornamenti per yt-dlp...");
    
    if (!ytDlpWrap) {
        console.error("❌ [Download] Motore yt-dlp non pronto.");
        return;
    }

    if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(true);

    const argomentiUpdate = ['--update-to', 'stable'];
    let giaAggiornato = false;

    // 1. Avviamo l'esecuzione memorizzando l'istanza del processo restituito dal wrapper
    const promessaUpdate = ytDlpWrap.exec(argomentiUpdate);

    // 2. 🎯 Intercettiamo l'output testuale direttamente dallo stream stdout del processo nativo
    if (promessaUpdate.ytDlpProcess && promessaUpdate.ytDlpProcess.stdout) {
        promessaUpdate.ytDlpProcess.stdout.on('data', (data) => {
            const rigaTesto = data.toString();
            console.log(`📄 [yt-dlp Output]: ${rigaTesto}`); // Sostituisce il vecchio console.log fasullo

            if (rigaTesto.includes("is up to date") || rigaTesto.includes("already installed")) {
                giaAggiornato = true;
            }
        });
    }

    // 3. Gestione degli eventi standard del wrapper (che rimangono identici)
    promessaUpdate
    .on('progress', (progress) => {
        console.log(`📥 Scaricamento nuovo binario: ${progress.percent}%`);
    })
    .on('error', (err) => {
        console.error(`❌ [Updater] Errore durante l'aggiornamento:`, err);
        if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);

        if (err.message.includes("403") || err.message.includes("rate limit")) {
            alert("GitHub ha bloccato la richiesta (Errore 403 Rate Limit).\nRiprova più tardi.");
        } else {
            alert(`Errore durante l'aggiornamento: ${err.message}`);
        }
    })
    .on('close', () => {
        console.log("🚀 [Updater] Processo di aggiornamento terminato.");
        if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
        
        if (giaAggiornato) {
            alert("Il motore yt-dlp è già aggiornato all'ultima versione disponibile! ✅");
        } else {
            alert("Il motore yt-dlp è stato aggiornato con successo all'ultima versione! 🎉");
        }
    });
}

/**
 * Reindirizza l'utente alla pagina di download o a GitHub per NW.js
 */
async function aggiornaCoreNWJS() {
    
    console.log("🌐 [Updater App] Avvio controllo e aggiornamento automatico NW.js...");
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(true);
    
    try {
        const risposta = await fetch('https://nwjs.io/versions.json');
        if (!risposta.ok) throw new Error(`Errore server NW.js: ${risposta.status}`);
        
        const dati = await risposta.json();
        let ultimaVersioneTag = dati.stable; // es: "v0.111.0"
        let ultimaVersionePura = ultimaVersioneTag.replace('v', '');
        let versioneAttuale = process.versions.nw; // potrebbe essere "0.111" o "0.111.0"

        // 🎯 NORMALIZZAZIONE: Assicuriamoci che entrambe abbiano il formato X.Y.Z
        if (versioneAttuale.split('.').length === 2) versioneAttuale += '.0';
        if (ultimaVersionePura.split('.').length === 2) ultimaVersionePura += '.0';

        console.log(`🔍 Confronto normalizzato -> Locale: ${versioneAttuale} | Server: ${ultimaVersionePura}`);
        
        if (versioneAttuale === ultimaVersionePura) {
            if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
            alert(`NW.js è già aggiornato all'ultima versione stabile (${process.versions.nw})! ✅`);
            return;
        }

        const messaggio = `È disponibile una nuova versione di NW.js!\n\n` +
                        `• Versione installata: ${versioneAttuale}\n` +
                        `• Nuova versione stabile: ${ultimaVersionePura}\n\n` +
                        `Vuoi scaricare direttamente il pacchetto ZIP aggiornato (SDK)?`;
        
        if (!confirm(messaggio)) {
            if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
            console.log("❌ Download bloccato dall'utente");
            return;
        }

        // 🎯 Componiamo l'URL. Uso "nwjs-sdk" perché abbiamo visto che ti servono i DevTools!
        const urlZip = `https://dl.nwjs.io/${ultimaVersioneTag}/nwjs-sdk-${ultimaVersioneTag}-win-x64.zip`;
        
        const cartellaBin = path.join(process.cwd(), 'bin');
        const zipDestinazione = path.join(cartellaBin, 'nw_aggiornamento.zip');
        const cartellaTemporaneaEstrazione = path.join(cartellaBin, 'nw_nuovo_temp');

        console.log("📥 Scaricamento dello ZIP di aggiornamento...");
        
        // 1. Scarichiamo lo ZIP in background aggirando i blocchi
        downloadFileDiretto(urlZip, zipDestinazione, (successo, erroreDownload) => {
            if (!successo) {
                if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
                alert(`Errore nel download dello ZIP: ${erroreDownload}`);
                return;
            }

            console.log("📦 Download completato. Estrazione dello ZIP via PowerShell nativa...");

            // 2. Estraiamo lo ZIP usando PowerShell (nativo in Windows, zero librerie npm)
            const comandoEstrazione = `powershell -Command "Expand-Archive -Path '${zipDestinazione}' -DestinationPath '${cartellaTemporaneaEstrazione}' -Force"`;
            
            exec(comandoEstrazione, (errExtract) => {
                // Rimuoviamo subito lo ZIP per non lasciare sporcizia
                if (fs.existsSync(zipDestinazione)) fs.unlinkSync(zipDestinazione);

                if (errExtract) {
                    if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
                    console.error("❌ Errore estrazione:", errExtract);
                    alert("Errore durante l'estrazione dei file di aggiornamento.");
                    return;
                }

                // 3. Prepariamo lo script Batch di sgancio
                // Nota: NW.js quando viene estratto crea una sottocartella (es: bin/nw_nuovo_temp/nwjs-sdk-v0.111.0-win-x64/)
                const sottocartelle = fs.readdirSync(cartellaTemporaneaEstrazione);
                const cartellaContenutoEstratto = path.join(cartellaTemporaneaEstrazione, sottocartelle[0]);

                const percorsoScriptBat = path.join(process.cwd(), 'aggiorna_nw.bat');
                const cartellaNwAttuale = path.join(cartellaBin, 'nw');

                // Questo script aspetta che NW.js si chiuda, cancella la vecchia cartella, sposta la nuova e riavvia l'app
                const contenutoBat = 
`@echo off
timeout /t 2 /nobreak > nul
echo 🔄 Aggiornamento in corso... Non chiudere questa finestra.
rmdir /s /q "${cartellaNwAttuale}"
move /y "${cartellaContenutoEstratto}" "${cartellaNwAttuale}"
rmdir /s /q "${cartellaTemporaneaEstrazione}"
echo 🎉 Aggiornamento completato con successo! Riavvio...
start "" "${path.join(cartellaNwAttuale, 'nw.exe')}" "${process.cwd()}"
del "%~f0"
`;

                fs.writeFileSync(percorsoScriptBat, contenutoBat, 'utf-8');

                if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
                
                alert("L'applicazione verrà chiusa per completare l'aggiornamento del core alla versione " + ultimaVersionePura + ". Si riavvierà da sola tra pochi secondi! 🚀");

                // 4. Lanciamo il file batch in modo distaccato ed usciamo immediatamente!
                const { spawn } = require('child_process');
                spawn('cmd.exe', ['/c', percorsoScriptBat], {
                    detached: true,
                    stdio: 'ignore'
                }).unref();

                // Chiude l'applicazione NW.js all'istante sbloccando i file .exe e .dll
                gui.App.quit();
            });
        });

    } catch (e) {
        if (typeof toggleModaleAttesa === "function") toggleModaleAttesa(false);
        console.error("❌ Errore updater core:", e);
        alert("Impossibile completare l'operazione.");
    }
}

/**
 * Motore unico di memorizzazione e rendering.
 * Fonde qualsiasi traccia (locale o YouTube) nel database globale.
 * @param {Array} tracceDaInserire - Array di oggetti traccia standardizzati
 */
window.aggiungiTracceAlDatabase = function (tracceDaInserire) {
    if (!window.yto) window.yto = {};
    if (!window.yto.databaseBasi) window.yto.databaseBasi = [];

    tracceDaInserire.forEach(traccia => {
        // Controllo anti-duplicato universale (usa il pathCompleto come chiave unica)
        const giaPresente = window.yto.databaseBasi.some(base => base.pathCompleto === traccia.pathCompleto);
        
        if (!giaPresente) {
            window.yto.databaseBasi.push(traccia);
        }
    });

    // Ordina tutto alfabeticamente per titolo (sia locali che YouTube mischiati)
    window.yto.databaseBasi.sort((a, b) => a.titolo.localeCompare(b.titolo));

    // Renderizza l'intero database unificato
    mostraInGriglia(window.yto.databaseBasi);

    // Aggiorna contatori e filtri attivi
    if (typeof updateStat === "function") updateStat();
    if (typeof filter === "function") filter();
}

function toggleTheme() {
    const body = document.body;
    
    // 1. Troviamo quale tema è attualmente attivo (Ora il predefinito senza classe è 'light')
    let temaAttuale = body.classList.contains('dark-mode') ? 'dark' : 'light';
    
    // 2. Calcoliamo il prossimo tema basandoci sulla lista dei temi
    let indiceAttuale = listaTemi.indexOf(temaAttuale);
    let prossimoIndice = (indiceAttuale + 1) % listaTemi.length;
    let prossimoTema = listaTemi[prossimoIndice];
    
    // 3. Applichiamo la classe al body (Rimuoviamo la vecchia classe dark)
    body.classList.remove('dark-mode');
    if (prossimoTema !== 'light') {
        body.classList.add(`${prossimoTema}-mode`);
    }

    // 🎯 4. AGGIORNAMENTO GRAFICO DELLO SWITCH (ON = Dark Mode / OFF = Light Mode)
    const knob = document.getElementById('btn-theme-knob');
    const track = document.getElementById('theme-switch-track');

    if (knob && track) {
        if (prossimoTema === 'dark') {
            // STATO ON (A destra): Attiviamo la modalità scura/cyberpunk
            knob.style.left = '20px';
            track.style.background = 'var(--switch-on-color)';
        } else {
            // STATO OFF (A sinistra): Torniamo alla modalità chiara predefinita
            knob.style.left = '2px';
            track.style.background = 'var(--switch-off-color)'; 
        }
    }
    
    // 5. Salviamo in memoria
    localStorage.setItem('app-karaoke-theme', prossimoTema);
    console.log(`Tema cambiato in: ${prossimoTema}`);
}

// Funzione aggiornata per caricare il tema corretto all'avvio dell'app
function caricaTemaPredefinito() {

    const temaIniziale = localStorage.getItem('app-karaoke-theme') || 'light';
    if (temaIniziale === 'dark') {
        document.body.classList.add('dark-mode');
        const knob = document.getElementById('btn-theme-knob');
        const track = document.getElementById('theme-switch-track');
        if (knob && track) {
            knob.style.left = '20px';
            track.style.background = 'var(--switch-on-color)';
        }
    }

}

window.mostraTost = function (messaggio) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Crea l'elemento del toast
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `${messaggio}`; // Usiamo il fulmine nitido che ti piaceva!

    // Lo aggiunge al contenitore
    container.appendChild(toast);

    // Lo rimuove dal DOM dopo esattamente 2 secondi (durata dell'animazione)
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// Avvio rapido non appena la struttura del DOM è pronta
document.addEventListener("DOMContentLoaded", initApp);