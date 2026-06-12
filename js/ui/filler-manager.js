// ==========================================================================
// FILLER MANAGER - Gestione sottofondo/filler audio
// ==========================================================================

/**
 * Controlla la riproduzione del filler (sottofondo)
 * @param {string} action - "play" o "stop"
 */
async function controlFiller(action) {
    const btnPlay = document.getElementById('btn-filler-play');
    const btnStop = document.getElementById('btn-filler-stop');

    // Assicura che l'audio sia collegato al mixer prima di suonare
    await setupAudio();

    if (window.karaoke.players.video.src && !window.karaoke.players.video.paused && !window.karaoke.players.video.ended) {
        return;
    }

    if (!hasValidAudio(window.karaoke.players.sound)) return;

    if (action === 'play') {
        fadeIn(window.karaoke.players.sound, 1.5);
        if (btnPlay) btnPlay.classList.add('btn-filler-active-play');
        if (btnStop) btnStop.classList.remove('btn-filler-active-stop');
    } else {
        fadeOut(window.karaoke.players.sound, 1.5);
        if (btnStop) btnStop.classList.add('btn-filler-active-stop');
        if (btnPlay) btnPlay.classList.remove('btn-filler-active-play');
    }
}

/**
 * Carica un file audio selezionato come filler (sottofondo)
 * @param {HTMLInputElement} input - L'input file da cui leggere il filler
 */
async function loadSingleFiller(input) {
    const file = input.files[0];
    const soundPlayer = document.getElementById('suono');
    const fillerTitle = document.getElementById('fillerTitle');

    if (file) {
        // FORZA IL SETUP AUDIO
        await setupAudio();

        // Forza lo stato del tag audio HTML
        window.karaoke.players.sound.muted = false;
        window.karaoke.players.sound.volume = 1;

        fadeOut(window.karaoke.players.sound, 1);

        setTimeout(() => {
            const url = URL.createObjectURL(file);
            window.karaoke.players.sound.src = url;
            if (fillerTitle) fillerTitle.value = file.name;

            if (window.karaoke.players.video.src && !window.karaoke.players.video.paused && !window.karaoke.players.video.ended) {
                window.karaoke.players.sound.volume = 0;
                window.karaoke.players.sound.pause();
                return;
            }

            fadeIn(window.karaoke.players.sound, 2);

            const btnPlay = document.getElementById('btn-filler-play');
            const btnStop = document.getElementById('btn-filler-stop');
            if (btnPlay) btnPlay.classList.add('btn-filler-active-play');
            if (btnStop) btnStop.classList.remove('btn-filler-active-stop');
        }, 1000);
    } else {
        // --- SE L'UTENTE PREME ANNULLA ---
        
        if (fillerTitle) {
            if (fillerTitle.tagName === 'INPUT') {
                fillerTitle.value = "";
            } else {
                fillerTitle.innerText = "Nessun sottofondo"; 
            }
        }

        // Pulizia audio totale
        if (window.karaoke.players.sound) {
            window.karaoke.players.sound.pause();
            window.karaoke.players.sound.onplay = null;
            window.karaoke.players.sound.oncanplay = null;
            window.karaoke.players.sound.src = ""; 
            window.karaoke.players.sound.load();   
        }

        // Reset visivo dei pulsanti
        const btnPlay = document.getElementById('btn-filler-play');
        const btnStop = document.getElementById('btn-filler-stop');
        
        if (btnPlay) {
            btnPlay.classList.remove('btn-filler-active-play');
        }
        
        if (btnStop) {
            btnStop.classList.remove('btn-filler-active-stop');
        }

        // Azzera il valore dell'input file
        input.value = "";
    }
}
