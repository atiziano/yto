// ==========================================================================
// PLAYBACK MANAGER - Gestione riproduzione video e sottofondo
// ==========================================================================

/**
 * Gestisce l'avvio di un nuovo brano karaoke
 * @param {string} fileUrl - URL del file video da riprodurre
 * @param {HTMLElement} el - Elemento della lista da evidenziare (opzionale)
 */
async function play(fileUrl, el) {

    mostraPlayer();
    
    const placeholder = document.getElementById('player-placeholder');
    const btnPlay = document.getElementById('btn-filler-play');
    const btnStop = document.getElementById('btn-filler-stop');

    await Tone.start();
    console.log("Audio Context attivato.");

    // Rileva il tipo di contenuto
    const isStreamEstratto = fileUrl.includes('googlevideo.com');
    const isYouTube = fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be');

    // Gestione sottofondo
    if (window.yto.audio.isSetup && fillerNode) {
        fillerNode.volume.rampTo(-100, 1); 
        setTimeout(() => { 
            if (isYouTube || isStreamEstratto || !window.yto.players.video.paused) window.yto.players.sound.pause(); 
        }, 1000);
    } else if (window.yto.players.sound) {
        window.yto.players.sound.pause();
        window.yto.players.sound.volume = 0;
    }

    // Reset UI filler
    if (btnPlay) btnPlay.classList.remove('btn-filler-active-play');
    if (btnStop) btnStop.classList.add('btn-filler-active-stop');
    
    // Pulizia video precedente
    window.yto.players.video.onended = null;
    window.yto.players.video.pause();
    
    // Aggiornamento UI lista
    document.querySelectorAll('li').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');

    // Setup audio
    await setupAudio();
    resetFX('pitch'); 

    // ==========================================
    // CARICAMENTO E GESTIONE DEI PLAYER
    // ==========================================
    if (isStreamEstratto) {
        console.log("📺 [Play] Rilevato flusso estratto googlevideo. Uso il player locale.");
        
        if (placeholder) placeholder.style.display = "none"; 
        window.yto.players.video.style.display = "block"; 

        window.yto.players.video.src = fileUrl;
        window.yto.players.video.load();
        window.yto.players.video.onended = handleVideoEnd;

        window.yto.players.video.muted = false;
        window.yto.players.video.volume = 0;

        try {
            await window.yto.players.video.play();
            if (window.yto.audio.isSetup && fillerNode) {
                fillerNode.volume.rampTo(-100, 1.5);
            }
            fadeIn(window.yto.players.video, 1.5, 1);
            console.log("🚀 [Mixer] Streaming YouTube avviato nel player locale!");
        } catch (e) {
            console.warn("⚠️ Impossibile avviare lo streaming locale in automatico:", e);
        }

    } else if (isYouTube) {
        console.log("🌐 [Play] Link YouTube standard rilevato. Gestione Ibrida attiva per:", fileUrl);
        
        const titoloCanzone = el ? el.getAttribute('data-name') : null;
        
        // 🎯 Cerca la funzione di download (locala o nel parent)
        const downloadFn = window.avviaDownloadDaYouTube || window.parent.avviaDownloadDaYouTube;

        if (typeof downloadFn === 'function') {
            downloadFn(fileUrl, { soloCopertina: false, titolo: titoloCanzone });
        } else {
            console.warn("⚠️ Impossibile avviare il download in background (funzione non trovata).");
        }
        
        // 📺 AVVIA LO STREAMING IMMEDIATO SUL TAG VIDEO LOCALE
        // Chiamiamo direttamente la funzione estrattrice senza passare da Webview
        const streamFn = window.caricaVideoYouTubeNelTagLocale || window.parent.caricaVideoYouTubeNelTagLocale;

        if (typeof streamFn === 'function') {
            streamFn(fileUrl);
        } else {
            console.error("❌ Impossibile avviare lo streaming locale: caricaVideoYouTubeNelTagLocale non trovata.");
        }

        if (window.yto?.audio?.isSetup && typeof fillerNode !== 'undefined' && fillerNode) {
            fillerNode.volume.rampTo(-100, 1.5);
        }

    } else {
        // File locale classico
        if (placeholder) placeholder.style.display = "none"; 
        
        window.yto.players.video.style.display = "block"; 
        window.yto.players.video.src = fileUrl;
        window.yto.players.video.load(); 
        window.yto.players.video.onended = handleVideoEnd;
        
        window.yto.players.video.muted = false;
        window.yto.players.video.volume = 0;
        
        try {
            await window.yto.players.video.play();
            if (window.yto.audio.isSetup && fillerNode) {
                fillerNode.volume.rampTo(-100, 1.5);
            }
            fadeIn(window.yto.players.video, 1.5, 1);
            console.log("✅ Riproduzione video locale avviata con successo!");
        } catch (e) {
            console.warn("⚠️ Impossibile avviare il video locale in automatico:", e);
        }
    }
}

/**
 * Gestisce la fine del brano e riattiva il sottofondo
 */
async function handleVideoEnd() {

    const btnPlay = document.getElementById('btn-filler-play');
    const btnStop = document.getElementById('btn-filler-stop');

    // Pulizia Video
    if (window.yto.players.video) {
        window.yto.players.video.pause();
        window.yto.players.video.src = "";
        window.yto.players.video.load();
    }

    console.log("Fine brano: ripristino sottofondo.");

    // Reset UI
    const canzoneAttiva = document.querySelector('#myUL li.active, #myUL li.selected');
    if (canzoneAttiva) {
        canzoneAttiva.classList.remove('active', 'selected');
    }

    if (btnPlay) btnPlay.classList.add('btn-filler-active-play');
    if (btnStop) btnStop.classList.remove('btn-filler-active-stop');
    
    try {
        await Tone.context.resume();
    } catch(err) {
        console.error("⚠️ Impossibile svegliare Tone.js:", err);
    }
    
    if (hasValidAudio(window.yto.players.sound)) {
        window.yto.players.sound.muted = false;
        window.yto.players.sound.volume = 1;
        try {
            await window.yto.players.sound.play();
            console.log("▶️ Riproduzione tag audio avviata");
            fadeIn(window.yto.players.sound, 2.5, 1);
            console.log("🔊 Volume player impostato a 0dB");
        } catch (e) {
            console.error("❌ Errore play tag audio:", e);
        }
    }
    else {
        console.warn("⚠️ sound Player non definito!");
    }
}

/**
 * Alza il volume gradualmente
 * @param {HTMLMediaElement} player - Il tag <video> o <audio>
 * @param {number} duration - Secondi della sfumatura
 * @param {number} targetVol - Volume finale (0.0 a 1.0)
 */
function fadeIn(player, duration = 1, targetVol = 1) {
    if (!window.yto.audio.isSetup || !fillerNode) return;

    if (player.id === 'suono') {
        player.muted = false;
        player.play().catch(() => {});
        
        const db = targetVol > 0 ? 20 * Math.log10(targetVol) : -100;
        fillerNode.volume.rampTo(db, duration);
        
        console.log(`🔊 Sottofondo in risalita a ${db}dB`);
    } else {
        player.muted = false;
        player.volume = targetVol;
        player.play().catch(() => {});
    }
}

/**
 * Abbassa il volume gradualmente
 * @param {HTMLMediaElement} player - Il tag <video> o <audio>
 * @param {number} duration - Secondi della sfumatura
 */
function fadeOut(player, duration = 1) {
    if (!window.yto.audio.isSetup) {
        if (player) player.pause();
        return;
    }

    if (player.id === 'suono' && fillerNode) {
        fillerNode.volume.rampTo(-100, duration);
        console.log(`🔊 Sottofondo in discesa a -100dB`);

        setTimeout(() => {
            if (fillerNode.volume.value <= -90) player.pause();
        }, duration * 1000);
    } 
    else {
        player.pause();
    }
}

/**
 * Verifica se l'elemento player ha un file multimediale valido caricato
 * @param {HTMLAudioElement|HTMLVideoElement} player - L'elemento da controllare
 * @returns {boolean} True se c'è un file valido
 */
function hasValidAudio(player) {
    console.log("Controllo validità player:", player ? player.src : "null");

    if (!player || !player.src || player.src === '' || player.src === window.location.href) {
        console.log("❌ Player non valido: src vuoto, inesistente o reset locale.", player ? "<" + player.src + ">" : "null");
        return false;
    }
    
    if (player.src.startsWith('blob:')) {
        console.log("✅ Validazione superata: Rilevato Blob URL valido in memoria.");
        return true;
    }

    const cleanSrc = player.src.split('?')[0].split('#')[0];
    if (cleanSrc.endsWith('/') || cleanSrc.toLocaleLowerCase().endsWith('.html')) {
        console.log("❌ Player non valido: l'src punta solo alla cartella o alla pagina principale.");
        return false;
    }

    const isNotBuggy = !player.src.includes('undefined');
    
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mp4', '.mkv', '.webm'];
    const hasValidExtension = validExtensions.some(ext => cleanSrc.toLowerCase().endsWith(ext));

    console.log("Risultato validazione standard:", hasValidExtension && isNotBuggy);
    return hasValidExtension && isNotBuggy;
}
