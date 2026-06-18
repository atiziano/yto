// ==========================================================================
// AUDIO ENGINE - Inizializzazione e gestione nodi Tone.js
// ==========================================================================

// Riferimenti ai nodi Tone.js
let meterL = null;
let meterR = null;
let volumeNode = null;
let fillerVolumeNode = null;
let fillerNode = null;
let limiter = null;

// Effetti in serie
let vibrato = null;
let pitchShift = null;
let distortion = null;
let bitCrusher = null;
let phaser = null;
let tremolo = null;

// Effetti paralleli
let chorus = null;
let delay = null;
let reverb = null;
let stereoWidener = null;
let panner = null;

// Equalizzatore 10 bande
let eqBands = [];

// Vocal Remover
let midGain = null;
let sideGain = null;

// Sorgenti audio
let videoSource = null;
let soundSource = null;

// Frequenze standard per EQ 10 bande
const eqFrequenze = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

/**
 * Inizializza la catena audio completa di Tone.js
 */
async function setupAudio() {
    if (window.yto.audio.isSetup) return;

    try {
        await Tone.start();
        await Tone.context.resume();

        // ===== 1) MASTER =====
        meterL = new Tone.Meter();
        meterR = new Tone.Meter();
        const splitter = new Tone.Split();

        volumeNode = new Tone.Volume(parseFloat(document.getElementById('volSlider').value) || 0);

        fillerVolumeNode = new Tone.Volume(parseFloat(document.getElementById('fillerVolSlider').value) || -6);
        fillerNode = new Tone.Volume(0);

        // ===== 2) LIMITER & ROUTING FINALE =====
        limiter = new Tone.Compressor({
            threshold: parseFloat(document.getElementById('limiterSlider').value) || -12,
            ratio: 12,
            attack: 0.003,
            release: 0.25
        });

        limiter.connect(volumeNode);
        volumeNode.toDestination();
        volumeNode.connect(splitter);

        splitter.connect(meterL, 0);
        splitter.connect(meterR, 1);

        // ===== 3) EFFETTI IN SERIE =====
        vibrato = new Tone.Vibrato(5, parseFloat(document.getElementById('vibSlider').value) || 0);
        pitchShift = new Tone.PitchShift(parseFloat(document.getElementById('pitchSlider').value) || 0);

        distortion = new Tone.Distortion({
            distortion: parseFloat(document.getElementById('distSlider').value) || 0,
            wet: 0
        });

        bitCrusher = new Tone.BitCrusher({
            bits: parseFloat(document.getElementById('bitSlider').value) || 16,
            wet: 0
        });

        phaser = new Tone.Phaser({
            frequency: parseFloat(document.getElementById('phaserSlider').value) || 0.5,
            octaves: 3,
            baseFrequency: 350,
            wet: 0
        });

        tremolo = new Tone.Tremolo({
            frequency: 5,
            depth: parseFloat(document.getElementById('tremoloSlider').value) || 0,
        }).start();
        
        chorus = new Tone.Chorus({
            frequency: 4,
            delayTime: 2.5,
            depth: 0.5,
            wet: parseFloat(document.getElementById('chorusSlider').value) || 0
        }).start();

        // ===== 4) EQUALIZZATORE A 10 BANDE =====
        eqBands = eqFrequenze.map((freq, i) => {
            const savedVal = parseFloat(document.getElementById(`eq-${freq}Slider`)?.value) || 0;
            return new Tone.Filter({
                type: "peaking",
                frequency: freq,
                Q: 1.414,
                gain: savedVal
            });
        });
        
        for (let i = 0; i < eqBands.length - 1; i++) {
            eqBands[i].connect(eqBands[i + 1]);
        }

        // ===== 5) ALTRI EFFETTI =====
        stereoWidener = new Tone.StereoWidener(parseFloat(document.getElementById('widthSlider').value) || 0);
        delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: parseFloat(document.getElementById('delaySlider').value) || 0 });
        reverb = new Tone.Reverb({ decay: 2, wet: parseFloat(document.getElementById('reverbSlider').value) || 0 });
        panner = new Tone.Panner(parseFloat(document.getElementById('panSlider').value) || 0);

        // ===== 6) VOCAL REMOVER =====
        midGain = new Tone.Gain(1);   
        sideGain = new Tone.Gain(1);  

        midGain.connect(vibrato);
        sideGain.connect(vibrato);

        // ===== 7) COLLEGAMENTO SERIALE =====
        vibrato.connect(pitchShift);
        pitchShift.connect(distortion);
        distortion.connect(bitCrusher);
        bitCrusher.connect(phaser);
        phaser.connect(tremolo);
        tremolo.connect(chorus);

        chorus.connect(eqBands[0]);
        eqBands[eqBands.length - 1].connect(stereoWidener);

        stereoWidener.connect(delay);
        delay.connect(reverb);
        reverb.connect(panner);
        panner.connect(limiter);

        // ===== 8) SORGENTE VIDEO =====
        if (window.yto.players.video && !videoSource) {
            videoSource = Tone.getContext().createMediaElementSource(window.yto.players.video);
            Tone.connect(videoSource, midGain);
            Tone.connect(videoSource, sideGain);
            console.log("🎤 Video collegato alla catena coerente.");
        }

        // ===== 9) SORGENTE FILLER =====
        if (window.yto.players.sound && !soundSource) {
            soundSource = Tone.getContext().createMediaElementSource(window.yto.players.sound);
            Tone.connect(soundSource, fillerVolumeNode);
            fillerVolumeNode.connect(fillerNode);
            fillerNode.connect(volumeNode);
            console.log("🎶 Sottofondo collegato.");
        }

        window.yto.audio.isSetup = true;
        console.log("🔊 Setup Audio COMPLETO e FUNZIONANTE!");
        if (typeof updateMeter === "function") updateMeter();

    } catch (error) {
        console.error("❌ Errore durante il setup audio:", error);
    }
}

/**
 * Aggiorna l'animazione della barra di livello audio
 */
function updateMeter() {
    if (meterL && meterR) {
        let levelL = meterL.getValue();
        let levelR = meterR.getValue();
        
        if (levelL === -Infinity || levelL < -60) levelL = -60;
        if (levelR === -Infinity || levelR < -60) levelR = -60;

        const level = (levelL + levelR) / 2;
        let percentage = Math.max(0, (level + 60) * 1.66);
        
        if (levelL === -60 && levelR === -60) percentage = 0;
        
        const bar = document.getElementById('meterBar');
        if (bar) bar.style.width = percentage + "%";
    }
    
    requestAnimationFrame(updateMeter);
}
