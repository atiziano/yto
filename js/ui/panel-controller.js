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