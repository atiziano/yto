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

    if (window.yto.players.video.src && !window.yto.players.video.paused && !window.yto.players.video.ended) {
        return;
    }

    if (!hasValidAudio(window.yto.players.sound)) return;

    if (action === 'play') {
        fadeIn(window.yto.players.sound, 1.5);
        if (btnPlay) btnPlay.classList.add('btn-filler-active-play');
        if (btnStop) btnStop.classList.remove('btn-filler-active-stop');
    } else {
        fadeOut(window.yto.players.sound, 1.5);
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
        window.yto.players.sound.muted = false;
        window.yto.players.sound.volume = 1;

        fadeOut(window.yto.players.sound, 1);

        setTimeout(() => {
            const url = URL.createObjectURL(file);
            window.yto.players.sound.src = url;
            if (fillerTitle) fillerTitle.value = file.name;

            if (window.yto.players.video.src && !window.yto.players.video.paused && !window.yto.players.video.ended) {
                window.yto.players.sound.volume = 0;
                window.yto.players.sound.pause();
                return;
            }

            fadeIn(window.yto.players.sound, 2);

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
        if (window.yto.players.sound) {
            window.yto.players.sound.pause();
            window.yto.players.sound.onplay = null;
            window.yto.players.sound.oncanplay = null;
            window.yto.players.sound.src = ""; 
            window.yto.players.sound.load();   
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
