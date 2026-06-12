// ==================== DICHIARAZIONE VARIABILI GLOBALI DELLO STUDIO ====================
let sBatteria, sKick, sSnare, sHat, sBass, sSax, sTrumpet, sPad, sArp;
let studioAttivo = false;
let stileStudioRitmo = "hiphop";
let studioLoop;

// Scale Musicali per l'improvvisazione generativa
const sScalaBasso = ["C2", "D#2", "F2", "G2", "A#2"];
const sScalaSax = ["C3", "D#3", "F3", "G3", "A#3", "C4"];
const sScalaTromba = ["G4", "A#4", "C5", "D#5", "F5", "G5"];
const famiglieAccordi = [
    ["C3", "D#3", "G3", "A#3"], // Do Minore 7
    ["F3", "G#3", "C4", "D#4"], // Fa Minore 7
    ["G3", "A#3", "D4", "F4"]   // Sol Minore 7
];

// Canali attivi nel pannello di controllo
let studioCanali = {
    kick: true,
    snare: true,
    hat: true,
    bass: true,
    sax: true,
    trumpet: true,
    pad: true,
    arp: true
};

// Funzione per aprire/chiudere il pannello a comparsa
function toggleStudioPanel() {
    const panel = document.getElementById('studio-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none' || panel.style.display === '') {
        // Chiudiamo gli altri pannelli grafici se aperti
        if (document.getElementById('mixer-panel')) document.getElementById('mixer-panel').style.display = 'none';
        if (document.getElementById('pitch-panel')) document.getElementById('pitch-panel').style.display = 'none';
        if (document.getElementById('singer-panel')) document.getElementById('singer-panel').style.display = 'none';
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function toggleStudioPanelClose() {
    if (document.getElementById('studio-panel')) {
        document.getElementById('studio-panel').style.display = 'none';
    }
}

// Controllo per l'attivazione/disattivazione dei singoli canali strumenti
function toggleStudioCanale(canale) {
    if (studioCanali.hasOwnProperty(canale)) {
        studioCanali[canale] = !studioCanali[canale];
        const btn = document.getElementById(`st-${canale}`);
        if (btn) {
            if (studioCanali[canale]) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    }
}

// Modifica del BPM in tempo reale dal cursore dello Studio
function cambiaStudioBPM(valore) {
    const bpmVal = document.getElementById('studioBpmVal');
    if (bpmVal) bpmVal.innerText = valore + " BPM";
    Tone.Transport.bpm.value = parseInt(valore);
}

// Selezione del genere musicale
function cambiaStudioStile(stile) {
    stileStudioRitmo = stile;
    console.log("Stile studio cambiato in:", stile);
}

// ==================== INIZIALIZZAZIONE RETE AUDIO ED EFFETTI ====================
async function inizializzaStudioAudio() {
    if (sBatteria) return; // Se già inizializzato, non ripetere l'operazione

    // ==================== INIZIALIZZAZIONE STRUMENTI LOCALI (OFFLINE) ====================

    // 1. Kit Batteria (COMPLETO - Non servono altre note, i componenti sono singoli)
    sBatteria = new Tone.Sampler({
        urls: {
            "C1": "assets/audio/kick.mp3",
            "D1": "assets/audio/snare.mp3",
            "F#1": "assets/audio/hh.mp3"
        },
        volume: -4
    });
    sKick = sBatteria;
    sSnare = sBatteria;
    sHat = sBatteria;

    // 2. Basso Elettrico (Ottava grave 2)
    sBass = new Tone.Sampler({
        urls: {
            "C2": "assets/audio/bass_C2.mp3",   // Già in tuo possesso
            "G2": "assets/audio/bass_G2.mp3",   // Già in tuo possesso
            // --- DA AGGIUNGERE IN SEGUITO PER IL MULTI-SAMPLING PRO: ---
            // "E2": "assets/audio/bass_E2.mp3",   // Nota intermedia grave
            // "C3": "assets/audio/bass_C3.mp3"    // Nota di passaggio all'ottava superiore
        },
        volume: -6
    });

    // 3. Accompagnamento Armonico (Pad / Pianoforte - Ottave 3 e 4)
    sPad = new Tone.Sampler({
        urls: {
            "A3": "assets/audio/piano_A3.mp3",   // Già in tuo possesso
            "C4": "assets/audio/piano_C4.mp3",   // Già in tuo possesso
            // --- DA AGGIUNGERE IN SEGUITO PER IL MULTI-SAMPLING PRO: ---
            // "C3": "assets/audio/piano_C3.mp3",   // Per coprire meglio gli accordi molto gravi
            // "G4": "assets/audio/piano_G4.mp3"    // Per dare brillantezza alle note più alte degli accordi
        },
        volume: -12
    });

    // 4. Sezione Fiati - Sax REALE (Ottave 3 e 4)
    sSax = new Tone.Sampler({
        urls: {
            "C3": "assets/audio/sax_C3.mp3",   // Da cercare / Iniziale medio-basso
            "G4": "assets/audio/sax_G4.mp3",   // Da cercare / Iniziale medio-alto
            // --- DA AGGIUNGERE IN SEGUITO PER IL MULTI-SAMPLING PRO: ---
            // "G3": "assets/audio/sax_G3.mp3",   // Ottimizza la transizione centrale del sax
            // "C5": "assets/audio/sax_C5.mp3"    // Per gli assoli sulle note più acute
        },
        volume: -10 
    });

    // 5. Sezione Fiati - Tromba REALE (Ottave 4 e 5 - Registro più acuto del Sax)
    sTrumpet = new Tone.Sampler({
        urls: {
            "A4": "assets/audio/trumpet_A4.mp3", // Da cercare / Iniziale medio
            "C5": "assets/audio/trumpet_C5.mp3", // Da cercare / Iniziale acuto
            // --- DA AGGIUNGERE IN SEGUITO PER IL MULTI-SAMPLING PRO: ---
            // "D4": "assets/audio/trumpet_D4.mp3", // Copre il registro basso della tromba
            // "G5": "assets/audio/trumpet_G5.mp3"  // Per gli squilli e le note "lead" molto alte
        },
        volume: -10
    });

    // 6. Cyber Arp Synth (Synth nativo)
    sArp = new Tone.Synth().set({
        volume: -22,
        oscillator: { type: "square" },
        envelope: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.05 }
    });

    // EFFETTI E STRUTTURA DI ROUTING
    const sRiverbero = new Tone.Reverb({ roomSize: 0.55, wet: 0.22 }).toDestination();
    const sDelay = new Tone.FeedbackDelay("4n.", 0.25).toDestination();
    const sLimiter = new Tone.Limiter(-2).toDestination();

    // Collegamento degli strumenti agli effetti stabili
    sBatteria.chain(sLimiter);
    sBass.chain(sLimiter);
    sPad.chain(sRiverbero, sLimiter);
    sSax.chain(sDelay, sRiverbero, sLimiter);
    sTrumpet.chain(sDelay, sRiverbero, sLimiter);
    sArp.chain(sDelay, sRiverbero, sLimiter);

    // Carica i file locali ed evita errori bloccanti se lanciato in locale senza server
    try {
        await Tone.loaded();
        console.log("🎛️ Moduli audio pronti in locale!");
    } catch (e) {
        console.warn("Nota: Assicurati che i file mp3 siano presenti nella cartella assets/audio/", e);
    }

    // ==================== MOTORE DEL SEQUENCER AUTOMATICO ====================
    let step = 0;
    let accordoCorrente = famiglieAccordi[0];

    studioLoop = new Tone.Loop(tempo => {
        const posizione = step % 8;

        if (posizione === 0) {
            accordoCorrente = famiglieAccordi[Math.floor(Math.random() * famiglieAccordi.length)];
        }

        // --- 1. SEZIONE RITMICA (BATTERIA) ---
        if (stileStudioRitmo === "hiphop") {
            if (studioCanali.kick && (posizione === 0 || posizione === 3)) sBatteria.triggerAttack("C1", tempo, 0.95);
            if (studioCanali.kick && posizione === 5) sBatteria.triggerAttack("C1", tempo, 0.8);
            if (studioCanali.snare && (posizione === 2 || posizione === 6)) sBatteria.triggerAttack("D1", tempo, 0.85);
            if (studioCanali.hat) sBatteria.triggerAttack("F#1", tempo, (posizione % 2 === 0) ? 0.4 : 0.15);
        } 
        else if (stileStudioRitmo === "techno") {
            if (studioCanali.kick && posizione % 2 === 0) sBatteria.triggerAttack("C1", tempo, 1.0);
            if (studioCanali.snare && posizione === 6) sBatteria.triggerAttack("D1", tempo, 0.7);
            if (studioCanali.hat && posizione % 2 !== 0) sBatteria.triggerAttack("F#1", tempo, 0.5);
        } 
        else if (stileStudioRitmo === "jazz") {
            if (studioCanali.kick && posizione === 0) sBatteria.triggerAttack("C1", tempo, 0.45);
            if (studioCanali.snare && posizione === 4 && Math.random() > 0.5) sBatteria.triggerAttack("D1", tempo, 0.4);
            if (studioCanali.hat && (posizione === 0 || posizione === 2 || posizione === 3 || posizione === 4 || posizione === 6 || posizione === 7)) {
                sBatteria.triggerAttack("F#1", tempo, (posizione === 3 || posizione === 7) ? 0.5 : 0.2);
            }
        }
        else if (stileStudioRitmo === "reggae") {
            if (studioCanali.kick && (posizione === 2 || posizione === 6)) sBatteria.triggerAttack("C1", tempo, 0.9);
            if (studioCanali.snare && (posizione === 2 || posizione === 6)) sBatteria.triggerAttack("D1", tempo, 0.85);
            if (studioCanali.hat && posizione % 2 !== 0) sBatteria.triggerAttack("F#1", tempo, 0.4);
        }
        else if (stileStudioRitmo === "rock") {
            if (studioCanali.kick && (posizione === 0 || posizione === 4)) sBatteria.triggerAttack("C1", tempo, 0.95);
            if (studioCanali.snare && (posizione === 2 || posizione === 6)) sBatteria.triggerAttack("D1", tempo, 0.9);
            if (studioCanali.hat) sBatteria.triggerAttack("F#1", tempo, 0.3);
        }
        else if (stileStudioRitmo === "trap") {
            if (studioCanali.kick && (posizione === 0 || posizione === 3 || posizione === 5)) sBatteria.triggerAttack("C1", tempo, 1.0);
            if (studioCanali.snare && posizione === 4) sBatteria.triggerAttack("D1", tempo, 0.95);
            if (studioCanali.hat) {
                sBatteria.triggerAttack("F#1", tempo, 0.4);
                if (Math.random() > 0.4) sBatteria.triggerAttack("F#1", tempo + 0.06, 0.25);
            }
        }
        else if (stileStudioRitmo === "disco") {
            if (studioCanali.kick) sBatteria.triggerAttack("C1", tempo, 0.9);
            if (studioCanali.snare && (posizione === 2 || posizione === 6)) sBatteria.triggerAttack("D1", tempo, 0.85);
            if (studioCanali.hat) sBatteria.triggerAttack("F#1", tempo, (posizione % 2 !== 0) ? 0.5 : 0.15);
        }

        // --- 2. STRUMENTI MELODICI E ARMONICI ---
        if (studioCanali.bass && (posizione === 0 || posizione === 4 || posizione === 6)) {
            const nBasso = sScalaBasso[Math.floor(Math.random() * sScalaBasso.length)];
            sBass.triggerAttackRelease(nBasso, "4n", tempo, 0.6);
        }

        if (studioCanali.sax && posizione % 2 === 0 && Math.random() > 0.55) {
            const nSax = sScalaSax[Math.floor(Math.random() * sScalaSax.length)];
            sSax.triggerAttackRelease(nSax, "8n", tempo, 0.35); // Sintetizzato matematicamente
        }

        if (studioCanali.trumpet && posizione % 2 !== 0 && Math.random() > 0.6) {
            const nTrumpet = sScalaTromba[Math.floor(Math.random() * sScalaTromba.length)];
            sTrumpet.triggerAttackRelease(nTrumpet, "8n", tempo, 0.35); // Sintetizzato matematicamente
        }

        if (studioCanali.pad && (posizione === 0 || posizione === 4)) {
            sPad.triggerAttackRelease(accordoCorrente, "2n", tempo, 0.28);
        }

        if (studioCanali.arp && Math.random() > 0.45) {
            const notaArp = accordoCorrente[step % accordoCorrente.length];
            sArp.triggerAttackRelease(notaArp, "16n", tempo, 0.18);
        }

        step++;
    }, "8n");
}
// ==================== INTERRUTTORE GENERALE AVVIO / STOP ====================
async function toggleStudioGenerativo() {
    const btn = document.getElementById('studioMainBtn');
    await Tone.start();
    
    if (!studioAttivo) {
        if (btn) btn.innerText = "⏳";
        
        try {
            await inizializzaStudioAudio();
            
            const sliderBpm = document.getElementById('studioBpmSlider');
            if (sliderBpm) {
                Tone.Transport.bpm.value = parseInt(sliderBpm.value);
            }
            
            if (studioLoop) {
                studioLoop.start(0);
                Tone.Transport.start();
            }
            
            studioAttivo = true;
            if (btn) btn.innerHTML = "&#x25A0;"; // Mostra il quadratino di STOP
            console.log("🚀 Cyber Studio Avviato con successo!");
        } catch (error) {
            console.error("Errore nell'avvio dello Studio:", error);
            if (btn) btn.innerHTML = "&#x25B6;";
        }
    } else {
        if (studioLoop) {
            studioLoop.stop();
        }
        studioAttivo = false;
        if (btn) btn.innerHTML = "&#x25B6;"; // Torna al simbolo PLAY
        console.log("🎛Header; Studio Generativo in pausa.");
    }
}