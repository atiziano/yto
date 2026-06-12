## Struttura dei Moduli

```
js/
├── core/                           # Logica audio core
│   ├── audio-engine.js             (6.8 KB) Setup Tone.js + mixer routing
│   ├── mixer-effects.js            (6.0 KB) Gestione effetti + updateFX()
│   └── playback-manager.js         (9.2 KB) Play/Pause + fade in/out
│
├── ui/                             # Controller UI
│   ├── panel-controller.js         (1.7 KB) Toggle pannelli (Mixer/Pitch/Singer)
│   ├── file-loader.js              (2.7 KB) Caricamento video + ricerca
│   └── filler-manager.js           (3.7 KB) Gestione sottofondo
│
├── modules/                        # Moduli funzionali
│   ├── singers.js                  Lista cantanti
│   ├── studio.js                   Cyber Studio generativo
│   ├── qrcode.js                   QR code generator
│   └── webview.js                  YouTube + yt-dlp streaming
│
├── app.js                          (1.6 KB) Init + globali semplificati
└── tone.js                         Libreria Tone.js bundled

```

## Dipendenze tra Moduli

```
audio-engine.js
  ├─ Exports: setupAudio(), updateMeter()
  ├─ Uses: Tone.js
  └─ Global: window.karaoke.audio.isSetup, volumeNode, eqBands[], etc.

mixer-effects.js
  ├─ Exports: updateFX(), resetFX(), controlli{}
  ├─ Depends: audio-engine (usa nodi creati)
  └─ Global: volumeNode, eqBands[], etc.

playback-manager.js
  ├─ Exports: play(), handleVideoEnd(), fadeIn(), fadeOut()
  ├─ Depends: audio-engine, mixer-effects
  └─ Uses: setupAudio(), resetFX(), fillerNode

panel-controller.js
  ├─ Exports: toggleMixerPanel(), gestisciPannelli()
  └─ DOM only - nessuna dipendenza

file-loader.js
  ├─ Exports: loadExternalFiles(), filter(), updateStat()
  ├─ Depends: playback-manager (usa play())
  └─ DOM only

filler-manager.js
  ├─ Exports: controlFiller(), loadSingleFiller()
  ├─ Depends: audio-engine, playback-manager
  └─ DOM only

app.js
  ├─ Exports: initApp(), setButtonState()
  ├─ Depends: Tutti i moduli (li usa)
  └─ Entry point dell'app
```

## 🚀 Ordine di Caricamento in HTML

```html
<!-- 1. Librerie -->
<script src="js/tone.js"></script>

<!-- 2. Core Audio (fondazione) -->
<script src="js/core/audio-engine.js"></script>
<script src="js/core/mixer-effects.js"></script>
<script src="js/core/playback-manager.js"></script>

<!-- 3. UI Controllers (dipendono da core) -->
<script src="js/ui/panel-controller.js"></script>
<script src="js/ui/file-loader.js"></script>
<script src="js/ui/filler-manager.js"></script>

<!-- 4. App Init (ultimo, usa tutti i moduli) -->
<script src="js/app.js"></script>

<!-- 5. Moduli funzionali (opzionali) -->
<script src="js/studio.js"></script>
<script src="js/webview.js"></script>
<script src="js/singers.js"></script>
<script src="js/qrcode.js"></script>
```

## 📝 Funzioni Principali per Modulo

### core/audio-engine.js
- `setupAudio()` - Inizializza tutta la catena Tone.js
- `updateMeter()` - Aggiorna barra livello in tempo reale
- Globali: `window.karaoke.audio.isSetup`, `volumeNode`, `limiter`, `eqBands[]`, ecc.

### core/mixer-effects.js
- `updateFX(type, val, iniziale)` - Aggiorna parametro effetto (31 case)
- `resetFX(what)` - Resetta mixer o effetti
- Globali: `controlli{}` (mappatura ID HTML ↔ parametri)

### core/playback-manager.js
- `play(fileUrl, el)` - Avvia riproduzione video
- `handleVideoEnd()` - Riattiva sottofondo quando finisce
- `fadeIn(player, duration, targetVol)` - Dissolvenza in salita
- `fadeOut(player, duration)` - Dissolvenza in discesa
- `hasValidAudio(player)` - Valida src del player

### ui/panel-controller.js
- `toggleMixerPanel()`, `togglePitchPanel()`, ecc.
- `gestisciPannelli(panelId, btnId)` - Logica centrale (mutualmente esclusivo)

### ui/file-loader.js
- `loadExternalFiles(input)` - Carica video da cartella
- `filter()` - Ricerca con evidenziazione
- `updateStat()` - Aggiorna contatore canzoni

### ui/filler-manager.js
- `controlFiller(action)` - Play/Stop sottofondo
- `loadSingleFiller(input)` - Carica file audio personalizzato


## 🔧 Come Aggiungere una Nuova Feature

### Esempio: Aggiungere effetto "Echo" custom

1. Crea `js/core/echo-effect.js`:
```javascript
let echoEffect = null;

function initEcho() {
    echoEffect = new Tone.Delay({ delayTime: 0.5, feedback: 0.4 });
    // Collegalo nella catena in playback-manager.js
}

function updateEcho(value) {
    if (echoEffect) echoEffect.wet.value = value;
}
```

2. Aggiungi in `mixer-effects.js`:
```javascript
case "echo":
    updateEcho(num);
    break;
```

3. Aggiungi in HTML slider e init:
```html
<input type="range" id="echoSlider" ... onchange="updateFX('echo', this.value)">
```

## 📚 Dipendenze Globali Necessarie

Questi oggetti devono essere accessibili da tutti i moduli (sono comuni):

```javascript
// Player HTML globali (app.js)
window.karaoke.players.video = null;
window.karaoke.players.sound = null;
window.karaoke.players.youtube = null;

// Nodi Tone (audio-engine.js)
window.karaoke.audio.isSetup = false;

// Controlli UI (mixer-effects.js)
window.karaoke.ui.controlli = { /* mappa ID */ };

```
