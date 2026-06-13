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

function switchPlayer(tipoTarget) {
    const placeholder = document.getElementById('player-placeholder');

    console.log(`🎛️ [Interruttore] Switch a caldo richiesto su: ${tipoTarget}`);

    if (tipoTarget === 'youtube') {
        // --- PASSAGGIO A YOUTUBE ---
        // Se la webview era vuota su about:blank, significa che è vuota e aspetta il primo caricamento

        const srcProprieta = window.karaoke.players.youtube.src ? window.karaoke.players.youtube.src.trim() : "";
        const srcAttributo = window.karaoke.players.youtube.getAttribute('src') ? window.karaoke.players.youtube.getAttribute('src').trim() : "";

        // Controllo unico: se uno dei due è vuoto o punta a about:blank
        if (!srcProprieta || srcProprieta === "about:blank" || !srcAttributo || srcAttributo === "about:blank") {
            console.log("🌐 [Switch] La webview è vuota. Carico la homepage di YouTube.");
            caricaVideoYouTube();
        }

        // Nascondiamo il locale senza resettarlo (mantiene la posizione corrente del brano!)
        window.karaoke.players.video.style.display = "none";
        if (placeholder) placeholder.style.display = "none";
        
        // Portiamo in primo piano la webview
        window.karaoke.players.youtube.style.display = "block";
        
    } else if (tipoTarget === 'locale') {
        // --- PASSAGGIO A LOCALE ---
        // Nascondiamo YouTube (rimane congelato in background senza perdere la pagina aperta)
        window.karaoke.players.youtube.style.display = "none";
        if (placeholder) placeholder.style.display = "none";
        
        // Mostriamo il player locale offline
        window.karaoke.players.video.style.display = "block";
    }
}

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

/**
 * Popola la lista principale #myUL con i risultati ottenuti da YouTube
 * Mantiene la stessa identica struttura DOM dei file locali per coerenza visiva e logica
 * @param {Array} risultati - Array di oggetti video restituiti da yt-dlp
 */
function aggiornaInterfacciaRicerca(risultati) {
    const ul = document.getElementById('myUL');
    if (!ul) {
        console.error("❌ Impossibile trovare la lista #myUL nel DOM.");
        return;
    }

    // Svuota la lista (proprio come fai per i file locali)
    ul.innerHTML = '';

    if (!risultati || risultati.length === 0) {
        alert("Nessun risultato trovato su YouTube!");
        return;
    }

    // Ciclo sui 5 risultati di YouTube
    risultati.forEach(video => {
        const videoId = video.id;
        const titoloTesto = video.title;

        // Creiamo il tag <li> coerente
        const li = document.createElement('li');
        li.setAttribute('data-name', titoloTesto);
        
        // Al click, ricostruiamo l'URL completo usando l'ID e lo passiamo alla tua funzione principale
        li.onclick = function () { 
            const urlCompleto = `https://www.youtube.com/watch?v=${videoId}`;
            
            if (typeof window.caricaVideoYouTubeNelTagLocale === 'function') {
                console.log(`🚀 [UI] Click su traccia YouTube. Avvio streaming per: ${urlCompleto}`);
                window.caricaVideoYouTubeNelTagLocale(urlCompleto); 
            } else {
                console.error("❌ Funzione caricaVideoYouTubeNelTagLocale non trovata.");
            }
        };

        // Struttura Flex identica alla tua locale
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "space-between";

        // Titolo della canzone (con un piccolo tag [YT] per distinguerlo se vuoi, o lascialo puro)
        const titolo = document.createElement("span");
        titolo.innerText = `🔴 [YT] ${titoloTesto}`; // Il prefisso aiuta a capire che è in streaming

        // Assemblaggio del DOM
        wrapper.appendChild(titolo);
        li.appendChild(wrapper);
        ul.appendChild(li);
    });

    // Eseguiamo le tue funzioni di aggiornamento statistiche e filtri native
    if (typeof updateStat === 'function') updateStat();
    if (typeof filter === 'function') filter();
}