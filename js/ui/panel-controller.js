// ==========================================================================
// PANEL CONTROLLER - Gestione pannelli UI (Mixer, Pitch, Singers, Studio)
// ==========================================================================

function toggleMixerPanel() {
    gestisciPannelli('mixer-panel', 'mixer-toggle');
}

function togglePitchPanel() {
    gestisciPannelli('pitch-panel', 'pitch-toggle');
}

function toggleSingerPanel() {
    gestisciPannelli('singer-panel', 'singer-toggle');
}

function toggleStudioPanel() {
    gestisciPannelli('studio-panel', 'studio-toggle');
}

/**
 * Gestisce l'apertura/chiusura di un pannello (mutualmente esclusivo con gli altri)
 * @param {string} panelId - ID del pannello da gestire
 * @param {string} btnId - ID del bottone associato
 */
function gestisciPannelli(panelId, btnId) {
    const panels = ['mixer-panel', 'pitch-panel', 'singer-panel', 'studio-panel'];
    const buttons = ['mixer-toggle', 'pitch-toggle', 'singer-toggle', 'studio-toggle'];

    const target = document.getElementById(panelId);
    if (!target) return;

    const isVis = target.style.display === 'block';

    // Chiude tutti i pannelli e spegne i bottoni
    panels.forEach(id => {
        const p = document.getElementById(id);
        if (p) {p.style.display = 'none'; p.style.border = 'none';}
    });

    buttons.forEach(id => {
        const b = document.getElementById(id);
        if (b) {b.classList.remove('active'); b.style.border = 'none';}
    });

    // Se il pannello era chiuso, lo apre e attiva il suo bottone
    if (!isVis) {
        target.style.display = 'block';
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');
    }
}

/** Non usata
 * Gestisce lo stato attivo/disattivato di un pulsante
 * @param {HTMLElement|string} btn - L'elemento DOM del bottone o il suo ID stringa
 * @param {boolean} isActive - True per renderlo attivo, False per spegnerlo
 */
function setButtonState(btn, isActive) {
    const element = typeof btn === 'string' ? document.getElementById(btn) : btn;
    
    if (!element) return;

    if (isActive) {
        element.classList.add('btn-filler-active-play');
        element.style.pointerEvents = "auto";
        element.style.opacity = "1";
        if (element.tagName === 'BUTTON') element.disabled = false;
    } else {
        element.classList.remove('btn-filler-active-play');
        element.style.pointerEvents = "none";
        element.style.opacity = "0.4";
        if (element.tagName === 'BUTTON') element.disabled = true;
    }
}

/**
 * Apre la console della Webview per debug
 */
function apriConsoleWebview() {

    // Usiamo il timeout per essere sicuri che la finestra sia renderizzata
    setTimeout(() => {
        try {
            // Controlliamo se siamo effettivamente dentro l'ambiente NW.js
            if (typeof nw !== 'undefined') {
                // Questo comando dice a NW.js di aprire i DevTools di TUTTA l'applicazione (il body principale)
                nw.Window.get().showDevTools(); 
                console.log("🚀 Console Principale (Body/App) aperta con successo!");
            } else {
                alert("Errore: Impossibile aprire i DevTools. Non sei in esecuzione dentro NW.js!");
            }
        } catch (errore) {
            alert("Errore nel lancio dei DevTools del Body: " + errore.message);
        }
    }, 200);
}

/** Non usata
* Converte un valore in Decibel (dB) nel volume lineare (0.0 - 1.0) richiesto da YouTube.
* @param {number} db - Il valore in decibel (es. da -40 a 10)
* @returns {number} Il volume lineare compreso tra 0 e 1
*/
function sliderDbToLinearValue(db) {
    const dbNum = parseFloat(db);
    
    // Gestione del muto totale al limite inferiore
    if (isNaN(dbNum) || dbNum <= -40) {
        return 0;
    }
    
    // Formula inversa dei decibel: 10 ^ (db / 20)
    let linearVol = Math.pow(10, dbNum / 20);
    
    // Cap di sicurezza (massimo 1.0 per evitare crash di YouTube)
    if (linearVol > 1) {
        linearVol = 1;
    }
    
    // Arrotonda a 2 cifre decimali (es. 0.35) per pulizia del codice iniettato
    return Math.round(linearVol * 100) / 100;
}

/**
 * Popola la lista principale #myUL con i risultati ottenuti da YouTube
 * Mantiene la stessa identica struttura DOM dei file locali per coerenza visiva e logica
 * @param {Array} risultati - Array di oggetti video restituiti da yt-dlp
 */
function aggiornaInterfacciaRicerca(risultati) {
    const tracceNormalizzate = risultati.map(video => {
        const urlCompleto = video.url || `https://www.youtube.com/watch?v=${video.id}`;
        let urlAnteprima = '';
        if (video.thumbnail) {
            urlAnteprima = video.thumbnail;
        } else if (video.thumbnails && video.thumbnails.length > 0) {
            urlAnteprima = video.thumbnails[video.thumbnails.length - 1].url;
        }

        return {
            tipo: 'youtube',
            nomeFile: '', 
            titolo: video.title || "Traccia streaming",
            pathCompleto: urlCompleto,
            copertina: urlAnteprima,
            canale: video.uploader || video.channel || "YouTube Streaming"
        };
    });

    // 🎯 FIX: rimosso il refuso "traccie..." con la i
    aggiungiTracceAlDatabase(tracceNormalizzate);
}
window.aggiornaInterfacciaRicerca = aggiornaInterfacciaRicerca;

function switchPlayer(tipoTarget='locale', always=true) {
    const placeholder = document.getElementById('player-placeholder');

    console.log(`🎛️ [Interruttore] Switch a caldo richiesto su: ${tipoTarget}`);

    if (tipoTarget === 'youtube') {
        // --- PASSAGGIO A YOUTUBE ---
        // Se la webview era vuota su about:blank, significa che è vuota e aspetta il primo caricamento

        const srcProprieta = window.yto.players.youtube.src ? window.yto.players.youtube.src.trim() : "";
        const srcAttributo = window.yto.players.youtube.getAttribute('src') ? window.yto.players.youtube.getAttribute('src').trim() : "";

        // Controllo unico: se uno dei due è vuoto o punta a about:blank
        if (!srcProprieta || srcProprieta === "about:blank" || !srcAttributo || srcAttributo === "about:blank") {
            console.log("🌐 [Switch] La webview è vuota. Carico la homepage di YouTube.");
            caricaVideoYouTube();
        }

        // Nascondiamo il locale senza resettarlo (mantiene la posizione corrente del brano!)
        window.yto.players.video.style.display = "none";
        if (placeholder) placeholder.style.display = "none";
        
        // Portiamo in primo piano la webview
        window.yto.players.youtube.style.display = "block";

        // Focus
        setTimeout(() => {
            if (window.yto.players.youtube) {
                window.yto.players.youtube.focus();
            }
        }, 50);

        // Mostra pulsanti avanti e indietro
        const btnBack = document.getElementById('btn-back');
        const btnForward = document.getElementById('btn-forward');
        if (btnBack && btnForward) {
            btnBack.style.display = "flex";
            btnForward.style.display = "flex";
        }
        
    } else if (tipoTarget === 'locale') {
        // --- PASSAGGIO A LOCALE ---
        // Nascondiamo YouTube (rimane congelato in background senza perdere la pagina aperta)
        window.yto.players.youtube.style.display = "none";
        if (placeholder) placeholder.style.display = "none";
        
        // Mostriamo il player locale offline
        window.yto.players.video.style.display = "block";

        // Nasconde pulsanti avanti e indietro
        const btnBack = document.getElementById('btn-back');
        const btnForward = document.getElementById('btn-forward');
        if (btnBack && btnForward) {
            btnBack.style.display = "none";
            btnForward.style.display = "none";
        }

    }

    // Mostra il player
    if (tipoTarget === 'youtube' || tipoTarget === 'locale') {

        const riquadroPlayer = document.getElementById('riquadro-player-cyber');
    
        if (riquadroPlayer) {
            // Se always è true, forza l'apertura a prescindere da tutto
            if (always === true) {
                riquadroPlayer.style.display = 'flex';
                return; // Esci subito dalla funzione
            }

            // Altrimenti (se always è false), fa il normale Toggle (mostra/nascondi)
            if (riquadroPlayer.style.display === 'none' || riquadroPlayer.style.display === '') {
                riquadroPlayer.style.display = 'flex'; // Usiamo 'flex' come da tuo CSS aggiornato
            } else {
                riquadroPlayer.style.display = 'none';
            }
        }

    }
}
window.switchPlayer = switchPlayer;

// Ascolta i clic su tutta la pagina
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    // Selezioniamo il contenitore della ricerca che ora si trova nel content-area
    const searchBox = document.querySelector('.top-center');

    // Se la sidebar è visibile (quindi NON ha la classe 'sidebar-hidden')
    if (sidebar && !sidebar.classList.contains('sidebar-hidden')) {
        
        // Controlla se il click è partito da dentro uno dei pannelli floating o dall'equalizzatore
        const cliccatoSuPannelloProtetto =  event.target.closest('#mixer-panel') || 
                                            event.target.closest('#pitch-panel') || 
                                            event.target.closest('#singer-panel') ||
                                            event.target.closest('#studio-panel');
        // Verifica che il clic sia avvenuto FUORI da:
        // 1. Sidebar stessa
        // 2. Bottone tre linee ☰
        // 3. Intero blocco di ricerca (input, select, bottoni caricamento/svuota)
        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedMenuToggle = menuToggle && menuToggle.contains(event.target);
        const clickedSearchBox = searchBox && searchBox.contains(event.target);

        if (!cliccatoSuPannelloProtetto && !clickedInsideSidebar && !clickedMenuToggle && !clickedSearchBox) {
            // Chiudi la sidebar in sicurezza
            sidebar.classList.add('sidebar-hidden');
            if (menuToggle) menuToggle.classList.remove('active'); 
        }
    }
});