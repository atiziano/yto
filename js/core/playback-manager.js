// ==========================================================================
// PLAYBACK MANAGER - Gestione riproduzione video e sottofondo
// ==========================================================================

/**
 * Gestisce l'avvio di un nuovo brano karaoke
 * @param {string} fileUrl - URL del file video da riprodurre
 * @param {HTMLElement} el - Elemento della lista da evidenziare (opzionale)
 */
async function play(fileUrl, el) {
    const videoPlayer = document.getElementById('vid');
    const placeholder = document.getElementById('player-placeholder');
    const btnPlay = document.getElementById('btn-filler-play');
    const btnStop = document.getElementById('btn-filler-stop');

    await Tone.start();
    console.log("Audio Context attivato.");

    // Rileva il tipo di contenuto
    const isStreamEstratto = fileUrl.includes('googlevideo.com');
    const isYouTube = fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be');

    // Gestione sottofondo
    if (window.karaoke.audio.isSetup && fillerNode) {
        fillerNode.volume.rampTo(-100, 1); 
        setTimeout(() => { 
            if (isYouTube || isStreamEstratto || !window.karaoke.players.video.paused) window.karaoke.players.sound.pause(); 
        }, 1000);
    } else if (window.karaoke.players.sound) {
        window.karaoke.players.sound.pause();
        window.karaoke.players.sound.volume = 0;
    }

    // Reset UI filler
    if (btnPlay) btnPlay.classList.remove('btn-filler-active-play');
    if (btnStop) btnStop.classList.add('btn-filler-active-stop');
    
    // Pulizia video precedente
    window.karaoke.players.video.onended = null;
    window.karaoke.players.video.pause();
    
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
        
        if (window.karaoke.players.youtube) {
            window.karaoke.players.youtube.src = "about:blank"; 
            window.karaoke.players.youtube.style.display = "none";
        }
        
        if (placeholder) placeholder.style.display = "none"; 
        window.karaoke.players.video.style.display = "block"; 

        window.karaoke.players.video.src = fileUrl;
        window.karaoke.players.video.load();
        window.karaoke.players.video.onended = handleVideoEnd;

        window.karaoke.players.video.muted = false;
        window.karaoke.players.video.volume = 0;

        try {
            await window.karaoke.players.video.play();
            if (window.karaoke.audio.isSetup && fillerNode) {
                fillerNode.volume.rampTo(-100, 1.5);
            }
            fadeIn(videoPlayer, 1.5, 1);
            console.log("🚀 [Mixer] Streaming YouTube avviato nel player locale!");
        } catch (e) {
            console.warn("⚠️ Impossibile avviare lo streaming locale in automatico:", e);
        }

    } else if (isYouTube) {
        console.log("🌐 [Play] Link YouTube standard rilevato. Devio il flusso su yt-dlp...");
        
        if (window.caricaVideoYouTubeNelTagLocale) {
            window.caricaVideoYouTubeNelTagLocale();
        } else if (window.karaoke.players.youtube.contentWindow && window.karaoke.players.youtube.contentWindow.caricaVideoYouTubeNelTagLocale) {
            window.karaoke.players.youtube.contentWindow.caricaVideoYouTubeNelTagLocale();
        } else {
            window.karaoke.players.video.style.display = "none";
            placeholder.style.display = "none";
            window.karaoke.players.youtube.style.display = "block";
            window.karaoke.players.youtube.src = fileUrl;
        }

        if (window.karaoke.audio.isSetup && fillerNode) {
            fillerNode.volume.rampTo(-100, 1.5);
        }

    } else {
        // File locale classico
        if (window.karaoke.players.youtube) {
            window.karaoke.players.youtube.src = "about:blank";
            window.karaoke.players.youtube.style.display = "none"; 
        }
        
        if (placeholder) placeholder.style.display = "none"; 
        
        window.karaoke.players.video.style.display = "block"; 
        window.karaoke.players.video.src = fileUrl;
        window.karaoke.players.video.load(); 
        window.karaoke.players.video.onended = handleVideoEnd;
        
        window.karaoke.players.video.muted = false;
        window.karaoke.players.video.volume = 0;
        
        try {
            await window.karaoke.players.video.play();
            if (window.karaoke.audio.isSetup && fillerNode) {
                fillerNode.volume.rampTo(-100, 1.5);
            }
            fadeIn(videoPlayer, 1.5, 1);
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
    const videoPlayer = document.getElementById('vid');
    const soundPlayer = document.getElementById('suono');
    const btnPlay = document.getElementById('btn-filler-play');
    const btnStop = document.getElementById('btn-filler-stop');

    // Pulizia Video
    if (window.karaoke.players.video) {
        window.karaoke.players.video.pause();
        window.karaoke.players.video.src = "";
        window.karaoke.players.video.load();
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
    
    if (hasValidAudio(window.karaoke.players.sound)) {
        window.karaoke.players.sound.muted = false;
        window.karaoke.players.sound.volume = 1;
        try {
            await window.karaoke.players.sound.play();
            console.log("▶️ Riproduzione tag audio avviata");
            fadeIn(window.karaoke.players.sound, 2.5, 1);
            console.log("🔊 Volume soundPlayer impostato a 0dB");
        } catch (e) {
            console.error("❌ Errore play tag audio:", e);
        }
    }
    else {
        console.warn("⚠️ soundPlayer non definito!");
    }
}

/**
 * Alza il volume gradualmente
 * @param {HTMLMediaElement} player - Il tag <video> o <audio>
 * @param {number} duration - Secondi della sfumatura
 * @param {number} targetVol - Volume finale (0.0 a 1.0)
 */
function fadeIn(player, duration = 1, targetVol = 1) {
    if (!window.karaoke.audio.isSetup || !fillerNode) return;

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
    if (!window.karaoke.audio.isSetup) {
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
