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

    console.log(`📥 [Download Background] Avviato scaricamento sicuro per: ${titoloLog}`);

    // Prepariamo i parametri usando i trucchi della funzione che funziona sempre
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
        if (notificaUI) notificaUI.innerText = `📥 Download background: ${progress.percent}%`;
    })
    .on('error', (err) => {
        console.error(`❌ Errore download background per ${titoloLog}:`, err);
        if (notificaUI) notificaUI.innerText = "❌ Errore download.";

        alert(`Il download di "${titoloLog}" è fallito. YouTube potrebbe aver bloccato la richiesta.`);
    })
    .on('close', async () => {
        try {
            // Il processo yt-dlp è CHIUSO, gli handle sono liberi. Recuperiamo il titolo reale.
            const info = await ytDlpWrap.getVideoInfo(urlVideo);
            const titoloPulito = info.title.replace(/[\\\\/:*?"<>|]/g, "_");
            const pathFinaleDefinitivo = path.join(cartellaDestinazione, `${titoloPulito}.mp4`);

            if (fs.existsSync(vecchioTemp)) {
                // 🎯 Rinomina e spostamento a bocce ferme! Zero WinError 32
                fs.renameSync(vecchioTemp, pathFinaleDefinitivo);
                console.log(`🚀 [COMPLETATO] File salvato e sbloccato: ${titoloPulito}.mp4`);
                if (notificaUI) notificaUI.innerText = "📥 Download completato!";
            } else {
                throw new Error("File temporaneo non trovato al termine del processo.");
            }
        } catch (e) {
            console.error("❌ Errore durante la rinomina finale:", e);
            if (notificaUI) notificaUI.innerText = "⚠️ Completato con errori.";
        }

        const scanSongs = window.parent.scanSongs || window.scanSongs;
        if (typeof scanSongs === 'function') scanSongs();
    });
}

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