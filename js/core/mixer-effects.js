// ==========================================================================
// MIXER EFFECTS - Gestione effetti audio e parametri
// ==========================================================================

const controlli = {
    // MIXER GENERALI
    volume:       { id: "vol",        def: 0,   suffix: " dB" },
    sottofondo:   { id: "fillerVol",  def: -6,  suffix: " dB" },
    limiter:      { id: "limiter",    def: -12, suffix: " dB" },
    bilanciamento:{ id: "pan",        def: 0,   suffix: "" },

    // DINAMICI PER LE 10 BANDE EQ
    ...Object.fromEntries([31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((freq, i) => [
        `eq${i}`, { id: `eq-${freq}`, def: 0, suffix: " dB" }
    ])),

    // EFFETTI
    pitch:        { id: "pitch",      def: 0,   suffix: "" },
    speed:        { id: "speed",      def: 1,   suffix: "x" },
    vibrato:      { id: "vib",        def: 0,   suffix: "" },
    reverb:       { id: "reverb",     def: 0,   suffix: "" },
    delay:        { id: "delay",      def: 0,   suffix: "" },
    chorus:       { id: "chorus",     def: 0,   suffix: "" },
    width:        { id: "width",      def: 0,   suffix: "" },
    vocal:        { id: "vocal",      def: 0,   suffix: "" },
    distortion:   { id: "dist",       def: 0,   suffix: "" },
    bitcrusher:   { id: "bit",        def: 16,  suffix: "" },
    phaser:       { id: "phaser",     def: 0,   suffix: "" },
    tremolo:      { id: "tremolo",    def: 0,   suffix: "" }
};

/**
 * Aggiorna i parametri di effetto audio
 * @param {string} type - Il tipo di effetto da aggiornare
 * @param {string} val - Il nuovo valore per l'effetto
 * @param {boolean} iniziale - Se true, carica da localStorage
 */
function updateFX(type, val, iniziale = false) {
    const c = controlli[type];
    if (!c) {
        console.warn(`⚠️ Controllo sconosciuto: ${type}`);
        return;
    }

    const slider = document.getElementById(c.id + "Slider");
    const display = document.getElementById(c.id + "-val");

    if (iniziale) {
        try {
            val = localStorage.getItem("karaoke_" + type) ?? c.def;
        } catch (e) {
            console.warn(`⚠️ Errore lettura localStorage per ${type}:`, e);
            val = c.def;
        }
    }

    if (slider) slider.value = val;

    const num = parseFloat(val);
    
    try {
        localStorage.setItem("karaoke_" + type, val);
    } catch (e) {
        console.warn(`⚠️ Errore scrittura localStorage per ${type}:`, e);
    }

    if (display) {
        if (type === "bilanciamento") {
            display.innerText = num === 0 ? "Centro" : (num < 0 ? "L " + Math.abs(num) : "R " + num);
        } else {
            display.innerText = val + c.suffix;
        }
    }

    if (!window.karaoke.audio.isSetup) return;

    switch (type) {
        // MIXER
        case "volume": volumeNode.volume.value = num; break;
        case "sottofondo":    fillerVolumeNode.volume.value = num; break;
        case "limiter":       limiter.threshold.value = num; break;

        // EQUALIZZATORE 10 BANDE
        case "eq0": eqBands[0].gain.value = num; break;
        case "eq1": eqBands[1].gain.value = num; break;
        case "eq2": eqBands[2].gain.value = num; break;
        case "eq3": eqBands[3].gain.value = num; break;
        case "eq4": eqBands[4].gain.value = num; break;
        case "eq5": eqBands[5].gain.value = num; break;
        case "eq6": eqBands[6].gain.value = num; break;
        case "eq7": eqBands[7].gain.value = num; break;
        case "eq8": eqBands[8].gain.value = num; break;
        case "eq9": eqBands[9].gain.value = num; break;

        case "bilanciamento": panner.pan.value = num; break;

        // EFFETTI SERIE
        case "pitch":         pitchShift.pitch = num; break;
        case "vibrato":       vibrato.depth.value = num; break;

        case "distortion":
            distortion.distortion = num;
            distortion.wet.value = num > 0 ? 1 : 0;
            break;

        case "bitcrusher":
            bitCrusher.bits.value = num;
            bitCrusher.wet.value = num < 16 ? 1 : 0;
            break;

        case "phaser":
            phaser.frequency.value = num;
            phaser.wet.value = num > 0 ? 0.8 : 0; 
            break;

        case "tremolo":
            tremolo.depth.value = num;
            tremolo.wet.value = num > 0 ? 1 : 0;
            break;

        // EFFETTI PARALLELI
        case "chorus":        chorus.wet.value = num; break;
        case "delay":         delay.wet.value = num; break;
        case "reverb":        reverb.wet.value = num; break;
        case "width":         stereoWidener.width.value = num; break;

        // VELOCITÀ VIDEO
        case "speed": 
            if (window.karaoke.players.video) window.karaoke.players.video.playbackRate = num; 
            break;

        // VOCAL REMOVER
        case "vocal":
            if (midGain && sideGain) {
                midGain.gain.value = 1 - num;
                sideGain.gain.value = num * 2;
            }
            break;
    }
}

/**
 * Reimposta i parametri di effetto audio
 * @param {string} what - Il gruppo da resettare ("mixer" o "pitch")
 */
function resetFX(what) {
    if (what === 'mixer') {
        updateFX('volume', 0);
        updateFX('sottofondo', -6);
        updateFX('limiter', -12);
        updateFX('bilanciamento', 0);
        for(let i=0; i<10; i++) {
            updateFX(`eq${i}`, 0);
        }
    }

    if (what === 'pitch') {
        updateFX('pitch', 0);
        updateFX('speed', 1);
        updateFX('vibrato', 0);
        updateFX('reverb', 0);
        updateFX('delay', 0);
        updateFX('chorus', 0);
        updateFX('width', 0);
        updateFX('vocal', 0);
        updateFX('distortion', 0);
        updateFX('bitcrusher', 16);
        updateFX('phaser', 0);
        updateFX('tremolo', 0);
    }
}
