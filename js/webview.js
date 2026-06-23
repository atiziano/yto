let ytDlpWrap = null;

// Avvolgiamo tutto in un blocco di sicurezza: se fallisce, l'app si avvia comunque!
try {
    const YTDlpWrap = require('yt-dlp-wrap').default;
    // process.cwd() punta alla cartella principale del tuo Karaoke
    const ytdlpPath = path.join(process.cwd(), 'bin', 'yt', 'yt-dlp.exe');

    if (fs.existsSync(ytdlpPath)) {
        ytDlpWrap = new YTDlpWrap(ytdlpPath);
        console.log("🚀 Sistema di Download yt-dlp agganciato con successo!");
    } else {
        console.warn("⚠️ Nota: yt-dlp.exe non trovato in bin/yt/. Il download non sarà attivo, ma l'app parte.");
    }
} catch (error) {
    console.error("❌ Errore critico durante l'esecuzione di yt-dlp-wrap:", error);
}

// ====================================================================================
// FUNZIONE IBRIDA COORDINATA: STREAMING IMMEDIATO + DOWNLOAD COMPLETO IN BACKGROUND
// ====================================================================================
window.caricaVideoYouTubeNelTagLocale = function (urlDirettoDaRicerca = null) {
    
    let urlVideo = urlDirettoDaRicerca.trim();

    if (urlVideo && urlVideo.length === 11 && !urlVideo.includes('://')) {
        urlVideo = `https://www.youtube.com/watch?v=${urlVideo}`;
    }

    if (urlVideo.includes('&')) urlVideo = urlVideo.split('&')[0];

    const isValidoYouTube = urlVideo.includes('youtube.com') || urlVideo.includes('youtu.be');
    if (!urlVideo || !isValidoYouTube) {
        alert("Per favore, seleziona prima un video valido su YouTube!");
        return;
    }

    if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
        window.parent.toggleModaleAttesa(true);
    }

    let percorsoEseguibileYtdlp = "yt-dlp";
    if (ytDlpWrap && ytDlpWrap.binaryPath) {
        percorsoEseguibileYtdlp = `"${ytDlpWrap.binaryPath}"`;
    }

    // 🎯 Stringa di comando potenziata con i flag di protezione e blindata dalle virgolette
    const comandoEstrattore = `${percorsoEseguibileYtdlp} --no-update --js-runtimes node --extractor-args "youtube:player_client=android" -f "best[ext=mp4]" -g "${urlVideo}"`;
    
    console.log("🔍 [Streaming] Estrazione con parametri Android...");

    exec(comandoEstrattore, (error, stdout, stderr) => {
        const playerVideoLoco = window.parent.document.getElementById('vid') || document.getElementById('vid');
        const placeholder = window.parent.document.getElementById('player-placeholder') || document.getElementById('player-placeholder');

        if (!error && stdout) {
            const urlFlussoDiretto = stdout.trim();
            if (playerVideoLoco) {
                if (placeholder) placeholder.style.display = "none";
                playerVideoLoco.style.display = "block";
                playerVideoLoco.src = urlFlussoDiretto;
                playerVideoLoco.load();
                
                playerVideoLoco.onplaying = () => {
                    if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') window.parent.toggleModaleAttesa(false);
                    playerVideoLoco.onplaying = null;
                };
                playerVideoLoco.play().catch(() => {
                    if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') window.parent.toggleModaleAttesa(false);
                });
            }
        } else {
            console.error("❌ [Streaming] Fallito:", error || stderr);
            if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
                window.parent.toggleModaleAttesa(false);
            }
            alert("Impossibile avviare lo streaming immediato. Il video potrebbe essere protetto o rimosso.");
        }
    });
}

window.avviaDownloadDaYouTube = async function (urlVideo, opzioni = {}) {

    if (!ytDlpWrap) {
        console.error("❌ [Download] Motore yt-dlp non pronto.");
        return;
    }

    const cartellaDestinazione = path.join(process.cwd(), 'songs');
    const cartellaBin = path.join(process.cwd(), 'bin', 'yt');
    const cartellaTempVideo = path.join(cartellaBin, 'temp_video');

    // Creazione cartelle di sicurezza
    if (!fs.existsSync(cartellaDestinazione)) fs.mkdirSync(cartellaDestinazione, { recursive: true });
    if (!fs.existsSync(cartellaTempVideo)) fs.mkdirSync(cartellaTempVideo, { recursive: true });

    const titoloLog = opzioni.titolo || urlVideo;
    const notificaUI = document.getElementById('progress-text-ui') || window.parent.document.getElementById('progress-text-ui');

    // Pulizia preventiva di vecchi file temporanei rimasti appesi
    const vecchioTemp = path.join(cartellaTempVideo, 'download_corrente.mp4');
    const vecchioTempPart = path.join(cartellaTempVideo, 'download_corrente.mp4.part');
    if (fs.existsSync(vecchioTemp)) fs.unlinkSync(vecchioTemp);
    if (fs.existsSync(vecchioTempPart)) fs.unlinkSync(vecchioTempPart);

    // Usa il titolo reale della canzone nella notifica iniziale se disponibile!
    if (notificaUI) notificaUI.innerText = `📥 Avvio download: ${titoloLog}...`;
    console.log(`📥 [Download Background] Avviato scaricamento sicuro per: ${titoloLog}`);

    // Prepariamo i parametri - Rimossa la thumbnail da qui perché la gestiamo via HTTPS nel 'close'
    const argomenti = [
        urlVideo,
        '-f', 'mp4',
        '--no-update',
        '--js-runtimes', 'node',
        '--extractor-args', 'youtube:player_client=android', // 🎯 Bypass dei blocchi di YouTube
        '--no-check-certificate',                            // Singolare per evitare warning
        '--prefer-insecure',
        '--no-playlist',
        '--no-cache-dir',
        '-o', vecchioTemp                                    // 🎯 Scarica sempre su un file temporaneo fisso
    ];

    ytDlpWrap.exec(argomenti)
    .on('progress', (progress) => {
        // Estraiamo la percentuale in modo solido
        let percentuale = 0;
        if (progress && progress.percent !== undefined) {
            percentuale = Math.round(progress.percent);
        } else if (progress && progress._percent_str) {
            // Fallback se yt-dlp passa la stringa pulita dal template
            percentuale = Math.round(parseFloat(progress._percent_str)) || 0;
        }
        
        if (percentuale > 100) percentuale = 100;
        if (percentuale < 0 || isNaN(percentuale)) percentuale = 0;
        
        // 1. Aggiorna il testo globale
        if (notificaUI) notificaUI.innerText = `📥 Scaricamento: ${percentuale}%`;

        // 2. AGGIORNAMENTO CARD IN TEMPO REALE
        const cardInDownload = document.querySelector(`#myUL li[data-url="${urlVideo}"]`);
        if (cardInDownload) {
            cardInDownload.classList.add("is-downloading");
            
            let badgePercentuale = cardInDownload.querySelector('.percentuale-card');
            if (!badgePercentuale) {
                badgePercentuale = document.createElement('span');
                badgePercentuale.className = 'percentuale-card';
                badgePercentuale.style = "position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); color:#fbbf24; padding:2px 4px; font-size:11px; border-radius:3px; font-weight:bold; z-index:2;";
                cardInDownload.querySelector('.thumb-wrapper').appendChild(badgePercentuale);
            }
            badgePercentuale.innerText = `📥 ${percentuale}%`;
        }
    })
    .on('error', (err) => {
        console.error(`❌ Errore download background per ${titoloLog}:`, err);
        if (notificaUI) notificaUI.innerText = "❌ Errore download.";
        alert(`Il download di "${titoloLog}" è fallito. YouTube potrebbe aver bloccato la richiesta.`);
    })
    .on('close', async () => {
        try {
            // Il processo yt-dlp è CHIUSO. Recuperiamo il titolo reale.
            const info = await ytDlpWrap.getVideoInfo(urlVideo);
            const titoloPulito = info.title.replace(/[\\/:*?"<>|]/g, "_");
            const pathFinaleDefinitivo = path.join(cartellaDestinazione, `${titoloPulito}.mp4`);
            const pathCopertinaDefinitiva = path.join(cartellaDestinazione, `${titoloPulito}.jpg`);

            if (fs.existsSync(vecchioTemp)) {

                // 1. Rinominiamo il video MP4
                fs.renameSync(vecchioTemp, pathFinaleDefinitivo);
                console.log(`🚀 [COMPLETATO] File salvato e sbloccato: ${titoloPulito}.mp4`);

                // 2. 📸 SCARICHIAMO LA COPERTINA IN MODO ISTANTANEO (Forziamo il JPG nativo)
                if (info.id) {
                    const urlCoverJpg = `https://img.youtube.com/vi/${info.id}/hqdefault.jpg`;
                    const https = require('https');
                    const fileStream = fs.createWriteStream(pathCopertinaDefinitiva);
                    
                    https.get(urlCoverJpg, (response) => {
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            console.log(`📸 [COPERTINA] Salvata localmente in JPG: ${titoloPulito}.jpg`);
                        });
                    }).on('error', (err) => {
                        console.error("❌ Impossibile salvare la copertina locale:", err);
                    });
                }

                if (notificaUI) notificaUI.innerText = "📥 Download completato!";

                // PASSA SIA L'URL ORIGINALE CHE IL PERCORSO MP4 DEFINITIVO
                if (typeof trasformaTracciaInLocale === "function") {
                    trasformaTracciaInLocale(urlVideo, pathFinaleDefinitivo);
                }

            } else {
                throw new Error("File temporaneo non trovato al termine del processo.");
            }
        } catch (e) {
            console.error("❌ Errore durante la rinomina finale:", e);
            if (notificaUI) notificaUI.innerText = "⚠️ Completato con errori.";
        }
    });
}

/**
 * Trasforma una traccia in memoria da risorsa remota a file locale
 * @param {string} urlYouTube - L'URL di YouTube usato per la ricerca
 * @param {string} pathLocaleAssoluto - Il percorso completo (es. C:\cartella\brano.mp4)
 */
function trasformaTracciaInLocale(urlYouTube, pathLocaleAssoluto) {
    if (!window.yto || !window.yto.databaseBasi) return;

    // 1. Cerchiamo la traccia nel database unificato usando l'URL di YouTube come chiave
    const traccia = window.yto.databaseBasi.find(base => base.pathCompleto === urlYouTube);

    if (traccia) {
        console.log(`💾 [Database-Unificato] Converto in locale: "${traccia.titolo}"`);

        // 2. Cambiamo il passaporto alla traccia
        traccia.tipo = 'locale';
        
        // 3. Trasformiamo il percorso nativo in URL universale per il tag <video>
        traccia.pathCompleto = 'file:///' + pathLocaleAssoluto.replace(/\\/g, '/');

        // 4. Estraiamo il nome del file con estensione (isolerà "nome_canone.mp4")
        // Usiamo un replace per evitare crash se 'path' globale di Node non fosse visibile in questo file
        traccia.nomeFile = pathLocaleAssoluto.replace(/^.*[\\\/]/, '');

        // 5. Rigeneriamo la griglia visiva (applicherà opacità 1 e badge PC verde)
        mostraInGriglia(window.yto.databaseBasi);
        
        // Aggiorna filtri attivi e contatori
        if (typeof filter === "function") filter();
        else if (typeof updateStat === "function") updateStat();
    } else {
        console.warn(`⚠️ [Database-Unificato] Impossibile trovare l'URL ${urlYouTube} nel database corrente.`);
    }
}

// Esposizione per NW.js
window.trasformaTracciaInLocale = trasformaTracciaInLocale;

function cercaSuYouTubeNW(query, limite = 5) {
    if (!query) return;

    const percorsoYtdlp = path.join(process.cwd(), 'bin', 'yt', 'yt-dlp.exe');
    const comando = `"${percorsoYtdlp}" "ytsearch${limite}:${query}" --dump-json --flat-playlist`;

    console.log(`🔍 [NW.js] Avvio ricerca in background per: "${query}"`);
    
    if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
        window.parent.toggleModaleAttesa(true);
    }                  

    exec(comando, (error, stdout, stderr) => {
        if (window.parent && typeof window.parent.toggleModaleAttesa === 'function') {
            window.parent.toggleModaleAttesa(false);
        }                  

        if (error) {
            console.error("❌ Errore durante l'esecuzione di yt-dlp:", error);
            alert("Errore di rete o yt-dlp non trovato. Controlla la console.");
            return;
        }

        try {
            const linee = stdout.trim().split('\n');
            const risultati = linee
                .filter(linea => linea.trim() !== '')
                .map(linea => JSON.parse(linea));

            console.log("✅ [NW.js] Risultati grezzi ricevuti:", risultati);

            if (typeof aggiornaInterfacciaRicerca === 'function') {
                aggiornaInterfacciaRicerca(risultati);
            } else if (window.parent && typeof window.parent.aggiornaInterfacciaRicerca === 'function') {
                window.parent.aggiornaInterfacciaRicerca(risultati);
            }
        } catch (e) {
            console.error("❌ Errore nel parsing dei dati di YouTube:", e);
        }
    });
}

function caricaVideoYouTube() {

    const placeholder = document.getElementById('player-placeholder');
    const inputCerca = document.getElementById('myInput');
    
    if (!window.yto.players.youtube) {
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

    if (window.yto.players.video) {
        window.yto.players.video.pause();
        window.yto.players.video.style.display = "none";
    }
    if (placeholder) placeholder.style.display = "none";
    window.yto.players.youtube.style.display = "block";

    // 2. COMPOSIZIONE URL DI RICERCA
    const urlRicerca = `https://www.youtube.com/results?search_query=${queryFormattata}&sp=EgIgAQ%253D%253D&theme=dark`;
    window.yto.players.youtube.src = urlRicerca;

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
            let urlCorrente = window.yto.players.youtube.src;
            if (typeof window.yto.players.youtube.getUrl === 'function') {
                urlCorrente = window.yto.players.youtube.getUrl();
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

// UNICO ASCOLTATORE PER IL CARICAMENTO DELLA PAGINA (Raggruppa tutto)
addEventListener('contentload', function gestisciPaginaYouTube() {
    console.log("🛡️ Pagina aggiornata. Applico protezioni e stili CSS...");

    // Silenzia il finto errore del passaggio a about:blank
    window.yto.players.youtube.addEventListener('loadabort', (e) => {
        if (e.url === 'about:blank' || e.code === -3) {
            console.log("🧹 Webview di YouTube resettata e svuotata con successo.");
        }
    });

    // PONTE PER I LOG: Intercetta i log interni di YouTube
    window.yto.players.youtube.addEventListener('consolemessage', (e) => {
        if (e.message.includes("🛡️")) {
            console.log(`[CONTESTO YOUTUBE] ${e.message}`);
        }
    });

    // GESTISCE SOLO VERI ERRORI
    if (window.yto.players.youtube) {
        window.yto.players.youtube.addEventListener('did-fail-load', (e) => {
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
    window.yto.players.youtube.insertCSS({
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
    window.yto.players.youtube.executeScript({
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
