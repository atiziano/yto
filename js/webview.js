// Usiamo i moduli nativi di Node.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let ytDlpWrap = null;

// Avvolgiamo tutto in un blocco di sicurezza: se fallisce, l'app si avvia comunque!
try {
    const YTDlpWrap = require('yt-dlp-wrap').default;
    // process.cwd() punta alla cartella principale del tuo Karaoke (D:\karaokepro)
    const ytdlpPath = path.join(process.cwd(), 'bin', 'yt', 'yt-dlp.exe');

    if (fs.existsSync(ytdlpPath)) {
        ytDlpWrap = new YTDlpWrap(ytdlpPath);
        console.log("🚀 Sistema di Download yt-dlp agganciato con successo!");
    } else {
        console.warn("⚠️ Nota: yt-dlp.exe non trovato in bin/yt/. Il download non sarà attivo, ma l'app parte.");
    }
} catch (error) {
    console.error("❌ Errore critico durante il caricamento di yt-dlp-wrap:", error);
}

function caricaVideoYouTube() {

    const placeholder = document.getElementById('player-placeholder');
    const inputCerca = document.getElementById('myInput');
    
    if (!window.karaoke.players.youtube) {
        console.error("❌ Errore Critico: Elemento 'youtube-player' non trovato nel DOM!");
        return;
    }

    // 1. Recuperiamo il testo inserito dall'utente nella barra di ricerca
    let testoDaCercare = inputCerca ? inputCerca.value.trim() : "";

    if (testoDaCercare === "") {
        testoDaCercare = "karaoke";
    } else {
        if (!testoDaCercare.toLowerCase().includes("karaoke")) {
            testoDaCercare += " karaoke";
        }
    }

    const queryFormattata = encodeURIComponent(testoDaCercare);
    console.log(`📺 Apertura di YouTube. Ricerca automatica per: "${testoDaCercare}"`);

    if (window.karaoke.players.video) {
        window.karaoke.players.video.pause();
        window.karaoke.players.video.style.display = "none";
    }
    if (placeholder) placeholder.style.display = "none";
    window.karaoke.players.youtube.style.display = "block";

    // 2. COMPOSIZIONE URL DI RICERCA
    const urlRicerca = `https://www.youtube.com/results?search_query=${queryFormattata}&sp=EgIgAQ%253D%253D&theme=dark`;
    window.karaoke.players.youtube.src = urlRicerca;

    // ====================================================================================
    // SISTEMA DI POLLING INFALLIBILE (CONTROLLO DIRETTO OGNI 500ms)
    // ====================================================================================
    
    // Se c'è già un vecchio controllo attivo da una ricerca precedente, lo spegniamo
    if (window.intervalloTracciamentoYT) {
        clearInterval(window.intervalloTracciamentoYT);
    }

    // Facciamo partire il controllo continuo sull'attributo .src o .getUrl() della webview
    let ultimoURLRilevato = "";
    
    window.intervalloTracciamentoYT = setInterval(() => {
        try {
            // Nelle webview di NW.js l'URL corrente si prende con .src o col metodo .getUrl()
            let urlCorrente = window.karaoke.players.youtube.src;
            if (typeof window.karaoke.players.youtube.getUrl === 'function') {
                urlCorrente = window.karaoke.players.youtube.getUrl();
            }

            // Se l'URL è cambiato rispetto all'ultimo controllo ed è un video di YouTube
            if (urlCorrente && urlCorrente !== ultimoURLRilevato) {
                ultimoURLRilevato = urlCorrente;
                
                if (urlCorrente.includes('watch?v=')) {
                    // Puliamo l'URL troncando i parametri superflui (&list, &index, ecc.)
                    const urlPulito = urlCorrente.split('&')[0];
                    
                    const inputDownload = document.getElementById('url-download');
                    if (inputDownload) {
                        inputDownload.value = urlPulito;
                        console.log("🎯 [SISTEMA DIRETTO] URL Video rilevato e inserito:", urlPulito);
                        
                        // Effetto visivo Cyber sul bordo dell'input
                        inputDownload.style.borderColor = "#00ffcc";
                        inputDownload.style.boxShadow = "0 0 10px #00ffcc";
                        setTimeout(() => {
                            inputDownload.style.borderColor = "";
                            inputDownload.style.boxShadow = "";
                        }, 800);
                    }
                }
            }
        } catch (errPolling) {
            // Silenziamo eventuali errori momentanei se la webview si sta ricaricando
        }
    }, 500); // Controlla ogni mezzo secondo in background

    // ====================================================================================

}

// ESEMPIO DI TEST: Puoi chiamare questa funzione per fare una prova con Rick Astley
// caricaVideoYouTube('dQw4w9WgXcQ');   

// ====================================================================================
// FUNZIONE DI DOWNLOAD CON UNIONE AUDIO/VIDEO GESTITA VIA NODE.JS (ANTI-ANTIVIRUS)
// ====================================================================================
function avviaDownloadDalForm() {
    let inputDownload = document.getElementById('url-download');
    const urlVideo = inputDownload ? inputDownload.value.trim() : "";

    if (!urlVideo || !urlVideo.includes('watch?v=')) {
        alert("Per favore, seleziona prima un video valido su YouTube!");
        return;
    }

    if (!ytDlpWrap) {
        alert("Il motore di download (yt-dlp) non è pronto o non è stato caricato correttamente.");
        return;
    }

    console.log("📥 Avvio il download diretto (Audio+Video uniti a 720p) per:", urlVideo);
    
    if (inputDownload) {
        inputDownload.style.backgroundColor = "#1e293b";
        inputDownload.disabled = true;
    }

    const path = require('path');
    const fs = require('fs');
    
    const cartellaDestinazione = path.join(process.cwd(), 'songs');
    
    if (!fs.existsSync(cartellaDestinazione)){
        fs.mkdirSync(cartellaDestinazione);
    }

    ytDlpWrap.getVideoInfo(urlVideo).then(info => {
        const titoloPulito = info.title.replace(/[\\\\/:*?"<>|]/g, "_");
        const fileFinale = path.join(cartellaDestinazione, `${titoloPulito}.mp4`);

        // CAMBIAMENTO STRATEGICO: Chiediamo il formato combinato "b" (best) che contiene già video+audio
        // Limitando a ext=mp4, YouTube restituisce il file a 720p già unito di fabbrica.
        ytDlpWrap.exec([
            urlVideo, 
            '-f', 'b[ext=mp4]', 
            '-o', fileFinale
        ])
        .on('progress', (progress) => {
            console.log(`⏳ Scaricamento file unico: ${progress.percent}%`);
        })
        .on('error', (err) => {
            console.error('❌ Errore download:', err);
            ripristinaInput();
        })
        .on('close', () => {
            console.log(`🚀 [COMPLETATO] File unico scaricato direttamente in /songs/: ${titoloPulito}.mp4`);
            ripristinaInput(true);
        });

    }).catch(errInfo => {
        console.error("❌ Errore nel recupero informazioni video:", errInfo);
        ripristinaInput();
    });

    function ripristinaInput(svuota = false) {
        if (inputDownload) {
            if (svuota) inputDownload.value = "";
            inputDownload.style.backgroundColor = "#0f172a";
            inputDownload.disabled = false;
        }
    }
}

// Rendiamo la funzione disponibile globalmente se serve richiamarla da file esterni o bottoni
window.avviaDownloadDalForm = avviaDownloadDalForm;

// ====================================================================================
// FUNZIONE DI STREAMING DIRETTO STRUTTURATA (VERSIONE AGGIORNATA IBRIDA)
// ====================================================================================
function caricaVideoYouTubeNelTagLocale(urlDirettoDaRicerca = null) {
    
    let urlVideo = "";
    let inputDownload = document.getElementById('url-download');

    // 1. Controllo intelligente: se abbiamo passato l'url direttamente lo usiamo,
    // altrimenti andiamo a leggerlo dal form HTML
    if (urlDirettoDaRicerca) {
        urlVideo = urlDirettoDaRicerca.trim();
    } else if (inputDownload) {
        urlVideo = inputDownload.value.trim();
    }

    // Pulizia dell'URL per isolare l'ID video
    if (urlVideo.includes('&')) {
        urlVideo = urlVideo.split('&')[0];
    }

    if (!urlVideo || (!urlVideo.includes('watch?v=') && !urlVideo.includes('youtu.be') && urlVideo.length < 11)) {
        alert("Per favore, seleziona prima un video valido su YouTube!");
        return;
    }

    if (!ytDlpWrap) {
        alert("Il motore di streaming (yt-dlp) non è pronto o non è stato caricato correttamente.");
        return;
    }

    console.log("🌐 [Streaming] Avvio estrazione pulita tramite execPromise per:", urlVideo);
    
    // Feedback visivo di caricamento sull'input
    if (inputDownload) {
        inputDownload.style.backgroundColor = "#1e293b";
        inputDownload.disabled = true;
    }

    // Dialog attesa
    if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
        window.parent.toggleModaleAttesa(true);
    }

    // 2. Utilizziamo execPromise che cattura nativamente l'output testuale (stdout)
    // Usiamo il formato 'b' (miglior video con audio integrato)
    ytDlpWrap.execPromise([
        urlVideo, 
        '-g', 
        '-f', 'b',
        '--no-playlist'
    ])
    .then((stdout) => {
        // Con execPromise, lo stdout arriva direttamente come parametro del .then()!
        let urlEstratto = stdout ? stdout.trim() : "";

        if (urlEstratto) {
            console.log("🚀 [Streaming COMPLETATO] Flusso estratto con successo!");
            
            // Recuperiamo la funzione play() dal contesto globale/padre
            const funzionePlayPrincipale = window.parent.play || window.top.play || play;

            if (typeof funzionePlayPrincipale === 'function') {
                console.log("🎬 [Streaming] Passo il flusso estratto alla funzione play()...");
                
                // CHIAMATA DIRETTA: Passiamo il link di streaming puro
                funzionePlayPrincipale(urlEstratto, null);


            } else {
                console.error("❌ [Streaming] Impossibile trovare la funzione play().");
            }
        } else {
            console.error("❌ [Streaming] L'output di yt-dlp è vuoto.");
        }

        ripristinaInput();
    })
    .catch((err) => {
        // Se yt-dlp fallisce internamente (es. restrizioni geografiche o di età), finisce qui
        console.error("❌ Errore critico durante l'esecuzione di yt-dlp:", err);
        ripristinaInput();
    });

    // Funzione interna per sbloccare l'input dell'interfaccia
    function ripristinaInput() {
        if (inputDownload) {
            inputDownload.style.backgroundColor = "#0f172a";
            inputDownload.disabled = false;
        }
        // Chiude Dialog
        if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
            window.parent.toggleModaleAttesa(false);
        }               
    }
}

// Esponiamo la funzione nel window della webview
window.caricaVideoYouTubeNelTagLocale = caricaVideoYouTubeNelTagLocale;

// ---------------------------------------
// YOUTUBE PLAYER EVENTS
// ---------------------------------------

// UNICO ASCOLTATORE PER IL CARICAMENTO DELLA PAGINA (Raggruppa tutto)
addEventListener('contentload', function gestisciPaginaYouTube() {
    console.log("🛡️ Pagina aggiornata. Applico protezioni e stili CSS...");

    // Silenzia il finto errore del passaggio a about:blank
    window.karaoke.players.youtube.addEventListener('loadabort', (e) => {
        if (e.url === 'about:blank' || e.code === -3) {
            console.log("🧹 Webview di YouTube resettata e svuotata con successo.");
        }
    });

    // PONTE PER I LOG: Intercetta i log interni di YouTube
    window.karaoke.players.youtube.addEventListener('consolemessage', (e) => {
        if (e.message.includes("🛡️")) {
            console.log(`[CONTESTO YOUTUBE] ${e.message}`);
        }
    });

    // GESTISCE SOLO VERI ERRORI
    if (window.karaoke.players.youtube) {
        window.karaoke.players.youtube.addEventListener('did-fail-load', (e) => {
            // Il codice errore -3 è ERR_ABORTED (richiesta annullata intenzionalmente da Chromium)
            if (e.errorCode === -3) {
                // Silenziamo l'errore nel log standard perché è solo il login di YouTube abortito
                console.log("ℹ️ [Webview] Ignorato redirect di login di YouTube (ERR_ABORTED).");
                return;
            }
            
            // Mostra in console solo i veri errori critici di caricamento (es. internet assente)
            console.warn(`⚠️ [Webview] Errore di caricamento reale: ${e.errorDescription} (Codice: ${e.errorCode})`);
        });
    }

    // INIEZIONE CSS UNIFICATA (Pulisce l'interfaccia e imposta lo sfondo scuro)
    window.karaoke.players.youtube.insertCSS({
        code: `
            #comments, #sidebar, #header-container, #masthead-container,
            /* Toglie barra di ricerca e pulsanti
            .ytp-chrome-top, .ytp-sharing-button { 
                display: none !important; 
            }
            */
            ytd-watch-flexy { margin-top: 0 !important; padding: 0 !important; }
            #masthead-container, ytd-app { background: #0f172a !important; }
        `
    }, () => {
        if (chrome.runtime.lastError) {
            console.warn("Nota CSS:", chrome.runtime.lastError.message);
        } else {
            console.log("🎨 [CSS] Layout ripulito e sfondo scuro applicato!");
        }
    });

    // INIEZIONE ADBLOCK E COALIZIONE VIDEO
    window.karaoke.players.youtube.executeScript({
        code: `
            if (window.mioIntervalloAdBlock) {
                clearInterval(window.mioIntervalloAdBlock);
            }

            window.mioIntervalloAdBlock = setInterval(() => {

                // --- 1. RILEVAMENTO VIDEO (Contesto YouTube) ---
                const inAd = document.querySelector('.ad-showing');
                if (!inAd) {
                    const mainVideo = document.querySelector('video');

                    if (mainVideo && window.mioVideoKaraoke !== mainVideo) {
                        window.mioVideoKaraoke = mainVideo;
                        console.log("🛡️ [YouTube] Nuovo video Karaoke intercettato e memorizzato!");
                    }
                }

                // --- 2. GESTIONE AD-BLOCK ---
                const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern');
                if (skipButton) {
                    skipButton.click();
                    console.log("🛡️ Spot pubblicitario rilevato e saltato!");
                }

                const ad = document.querySelector('.ad-showing video');
                if (ad) {
                    ad.playbackRate = 16;
                    ad.muted = true;
                    console.log("🛡️ Annuncio non skippabile accelerato!");
                }

                const overlay = document.querySelector('.ytp-ad-overlay-container, #player-ads, ytd-banner-promo-renderer');
                if (overlay && overlay.style.display !== 'none') {
                    overlay.style.display = 'none';
                    console.log("🛡️ Banner grafico nascosto!");
                }
            }, 300);
        `
    }, () => {
        // console.warn("executeScript error");
    });
});    

/**
 * Esegue la ricerca su YouTube tramite yt-dlp e passa i risultati alla UI
 * @param {string} query - Testo da cercare (es. "Karaoke Battisti")
 */
function cercaSuYouTubeNW(query) {
    if (!query) return;

    // Calcola il percorso dinamico basato sulla posizione dell'app (perfetto per chiavetta USB)
    // Punta a: resources/bin/yt/yt-dlp.exe
    const percorsoYtdlp = path.join(process.cwd(), 'bin', 'yt', 'yt-dlp.exe');
    
    // Comando: cerca 5 elementi, sputa in JSON pulito, non scaricare playlist intere
    const comando = `"${percorsoYtdlp}" "ytsearch5:${query}" --dump-json --flat-playlist`;

    console.log(`🔍 [NW.js] Avvio ricerca in background per: "${query}"`);
    
    // Mostra un caricamento nella UI
    if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
        window.parent.toggleModaleAttesa(true);
    }               


    exec(comando, (error, stdout, stderr) => {
        // Chiude Dialog
        if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
            window.parent.toggleModaleAttesa(false);
        }               

        if (error) {
            console.error("❌ Errore durante l'esecuzione di yt-dlp:", error);
            alert("Errore di rete o yt-dlp non trovato. Controlla la console.");
            return;
        }

        try {
            // yt-dlp restituisce una riga JSON per ogni video trovato
            const linee = stdout.trim().split('\n');
            
            // Filtra le righe vuote e converti ogni riga in un oggetto JS
            const risultati = linee
                .filter(linea => linea.trim() !== '')
                .map(linea => JSON.parse(linea));

            console.log("✅ [NW.js] Risultati grezzi ricevuti:", risultati);

            // Manda i dati puliti alla funzione che disegna la UI
            aggiornaInterfacciaRicerca(risultati);

        } catch (e) {
            console.error("❌ Errore nel parsing dei dati di YouTube:", e);
        }
    });
}