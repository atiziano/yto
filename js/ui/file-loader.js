// ==========================================================================
// FILE LOADER - Caricamento file video e ricerca
// ==========================================================================

/**
 * Carica i file video selezionati e li mostra nella lista, ordinati alfabeticamente
 * @param {HTMLInputElement} input - L'input file da cui leggere i video
 */
function loadExternalFiles(input) {
    if (!input.files || input.files.length === 0) {
        alert("Nessun file selezionato o cartella vuota!");
        return;
    }

    const allFiles = Array.from(input.files);
    
    // 1. Isoliamo i video .mp4
    const videoFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.mp4'));

    if (videoFiles.length === 0) {
        alert("Nella cartella non ci sono video .mp4 validi per il karaoke!");
        return;
    }

    // Recuperiamo il percorso assoluto reale della cartella (Funzionalità nativa NW.js)
    const percorsoCartellaReale = input.files[0].path ? path.dirname(input.files[0].path) : null;

    // 2. Creiamo una mappa rapida delle immagini presenti nella cartella.
    const mappaCopertine = {};
    allFiles.forEach(f => {
        const nomeMinuscolo = f.name.toLowerCase();
        if (nomeMinuscolo.endsWith('.jpg') || nomeMinuscolo.endsWith('.jpeg') || nomeMinuscolo.endsWith('.png') || nomeMinuscolo.endsWith('.webp')) {
            const nomePuro = f.name.substring(0, f.name.lastIndexOf('.'));
            mappaCopertine[nomePuro] = URL.createObjectURL(f);
        }
    });

    const ul = document.getElementById('myUL');
    ul.innerHTML = '';

    // Array di supporto per tracciare quali video hanno bisogno del download della copertina
    const tracceMancantiDiCopertina = [];

    // 3. Generiamo la lista
    videoFiles.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
        const li = document.createElement('li');
        const urlVideo = URL.createObjectURL(f);
        li.setAttribute('data-name', f.name);
        li.onclick = function () { play(urlVideo, this); };

        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "space-between";
        wrapper.style.width = "100%";

        const latoSinistro = document.createElement("div");
        latoSinistro.style.display = "flex";
        latoSinistro.style.alignItems = "center";
        latoSinistro.style.gap = "12px";

        const nomeVideoPuro = f.name.substring(0, f.name.lastIndexOf('.'));

        // 🖼️ CONTROLLO COPERTINA: C'è la foto corrispondente nella cartella?
        if (mappaCopertine[nomeVideoPuro]) {
            // Se esiste, carichiamo la foto statica locale
            const img = document.createElement("img");
            img.src = mappaCopertine[nomeVideoPuro];
            img.style.width = "50px";
            img.style.height = "35px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "4px";
            img.style.border = "1px solid #334155";
            latoSinistro.appendChild(img);
        } else {
            // Se non c'è la foto, mettiamo il quadratino di riserva ma IDentifichiamo il contenitore
            // per poterci iniettare l'immagine non appena yt-dlp finirà il download scaricato
            const iconaLocale = document.createElement("div");
            iconaLocale.style.width = "50px";
            iconaLocale.style.height = "35px";
            iconaLocale.style.display = "flex";
            iconaLocale.style.alignItems = "center";
            iconaLocale.style.justifyContent = "center";
            iconaLocale.style.borderRadius = "4px";
            iconaLocale.style.backgroundColor = "#1e293b";
            iconaLocale.style.border = "1px solid #334155";
            iconaLocale.style.fontSize = "16px";
            iconaLocale.style.color = "#38bdf8";
            iconaLocale.innerHTML = "&#x266B;"; 
            
            // Assegniamo una classe e un id univoco basato sul nome del file per intercettarlo dopo
            iconaLocale.id = `thumb-${btoa(encodeURIComponent(nomeVideoPuro)).replace(/=/g, "")}`;
            
            latoSinistro.appendChild(iconaLocale);

            // Salviamo il titolo tra quelli da scaricare
            tracceMancantiDiCopertina.push({
                titolo: nomeVideoPuro,
                elementId: iconaLocale.id
            });
        }

        const titolo = document.createElement("span");
        titolo.innerText = f.name;

        latoSinistro.appendChild(titolo);
        wrapper.appendChild(latoSinistro);
        li.appendChild(wrapper);
        ul.appendChild(li);
    });

    updateStat();
    filter();

    // 🚀 CONTROLLO AUTOMATICO COPERTINE MANCANTI (In background)
    if (percorsoCartellaReale && tracceMancantiDiCopertina.length > 0) {
        console.log(`⏳ [Background] Rilevati ${tracceMancantiDiCopertina.length} video senza copertina. Avvio download asincrono...`);
        // Lanciamo la coda di download senza 'await' per non bloccare l'interfaccia utente
        eseguiCodaDownloadCopertine(percorsoCartellaReale, tracceMancantiDiCopertina);
    } else {
        console.log("%c✨ [Background] Tutte le copertine sono già presenti in locale!", "color: #22c55e; font-weight: bold;");
    }
}

async function eseguiCodaDownloadCopertine(cartella, listaTracce) {
    const percorsoYtdlp = path.join(process.cwd(), 'bin', 'yt', 'yt-dlp.exe');
    const totaleTracce = listaTracce.length;

    if (totaleTracce > 50) {
        const conferma = confirm(`⚠️ Ci sono ben ${totaleTracce} canzoni senza copertina.\n\nVuoi procedere comunque lentamente in background?`);
        if (!conferma) return;
    }

    if (!fs.existsSync(percorsoYtdlp)) {
        console.error(`❌ [Errore] yt-dlp.exe non trovato in: ${percorsoYtdlp}`);
        return;
    }

    console.log(`%c🚀 [Sincronizzazione Mirata Karaoke] Elaboro ${totaleTracce} copertine...`, "color: #38bdf8; font-weight: bold;");

    const percorsoTempIniziale = path.join(process.cwd(), 'bin', 'yt', 'temp_thumb');

    for (let i = 0; i < totaleTracce; i++) {
        const traccia = listaTracce[i];
        const indiceVisuale = i + 1;
        
        console.log(`%c⏳ [${indiceVisuale}/${totaleTracce}] Ricerca per: "${traccia.titolo}"`, "color: #94a3b8;");

        try {
            // --- LOGICA DI OTTIMIZZAZIONE DELLA QUERY ---
            const titoloMinuscolo = traccia.titolo.toLowerCase();
            let titoloCercaYT = traccia.titolo.replace(/[\(\)\[\]]/g, "").trim();

            console.log(`%c   ▶ Cerco su YT: "${titoloCercaYT}"`, "color: #cbd5e1; font-style: italic;");
            // --------------------------------------------

            const estensioniPossibili = ['.jpg', '.webp', '.png', '.jpeg'];
            estensioniPossibili.forEach(est => {
                const vecchioTemp = `${percorsoTempIniziale}${est}`;
                if (fs.existsSync(vecchioTemp)) fs.unlinkSync(vecchioTemp);
            });

            const comando = `"${percorsoYtdlp}" "ytsearch1:${titoloCercaYT}" --skip-download --write-thumbnail --no-check-certificates --extractor-args "youtube:player_client=android" -o "${percorsoTempIniziale}.%(ext)s"`;

            await new Promise((resolve, reject) => {
                exec(comando, (error, stdout, stderr) => {
                    if (error) return reject(error);
                    resolve();
                });
            });

            let fileTemporaneoTrovato = null;
            let estensioneTrovata = '';

            for (const est of estensioniPossibili) {
                const verificaTemp = `${percorsoTempIniziale}${est}`;
                if (fs.existsSync(verificaTemp)) {
                    fileTemporaneoTrovato = verificaTemp;
                    estensioneTrovata = est;
                    break;
                }
            }

            if (fileTemporaneoTrovato) {
                const percorsoDestinazioneFinale = path.join(cartella, `${traccia.titolo}${estensioneTrovata}`);
                fs.renameSync(fileTemporaneoTrovato, percorsoDestinazioneFinale);

                console.log(`%c   ▶ ✅ COPERTINA GENERATA! -> "${traccia.titolo}${estensioneTrovata}"`, "color: #22c55e; font-weight: bold;");

                const contenitoreNota = document.getElementById(traccia.elementId);
                if (contenitoreNota) {
                    const img = document.createElement("img");
                    img.src = `file:///${percorsoDestinazioneFinale.replace(/\\/g, '/')}`;
                    img.style.width = "50px";
                    img.style.height = "35px";
                    img.style.objectFit = "cover";
                    img.style.borderRadius = "4px";
                    img.style.border = "1px solid #334155";
                    
                    contenitoreNota.replaceWith(img);
                }
            } else {
                console.log(`%c   ▶ ⚠️ Nessun file temp trovato.`, "color: #eab308;");
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
            console.error(`%c   ▶ ❌ Errore per: "${traccia.titolo}"`, "color: #f43f5e; font-weight: bold;");
        }
    }
    console.log("%c✨ [Sincronizzazione] Completata!", "color: #22c55e; font-weight: bold;");
}

/**
 * Filtra la lista dei video in base al testo inserito nell'input di ricerca
 * Supporta parole non consecutive ed evidenzia i match senza rompere il DOM
 */
function filter() {
    const inputVal = document.getElementById('myInput').value.trim();
    const valUpper = inputVal.toUpperCase();
    
    // Spezza l'input in singole parole ignorando gli spazi multipli
    const paroleCercate = valUpper.split(/\s+/).filter(p => p.length > 0);
    
    const li = document.getElementById('myUL').getElementsByTagName('li');

    for (let i = 0; i < li.length; i++) {
        const item = li[i];
        const txt = item.getAttribute('data-name') || '';
        const txtUpper = txt.toUpperCase();

        // Verifichiamo se TUTTE le parole cercate sono contenute nel titolo (anche non consecutive)
        const matchTrovato = paroleCercate.every(parola => txtUpper.indexOf(parola) > -1);

        if (matchTrovato || paroleCercate.length === 0) {
            item.style.display = "";

            // Trova lo span interno del titolo per non distruggere il wrapper flex
            const spanTitolo = item.querySelector('span');
            if (spanTitolo) {
                if (paroleCercate.length > 0) {
                    // Crea una regex che intercetta tutte le parole cercate separate da un "or" (|)
                    // Es: (parola1|parola2)
                    const pattern = paroleCercate.map(p => escapeRegExp(p)).join('|');
                    const regex = new RegExp(`(${pattern})`, "gi");
                    
                    // Evidenzia i match sul testo puro del titolo
                    spanTitolo.innerHTML = txt.replace(regex, "<span class='search-match'>$1</span>");
                } else {
                    // Se l'input è vuoto, ripristina il testo originale pulito
                    spanTitolo.innerText = txt;
                }
            }
        } else {
            item.style.display = "none";
        }
    }
    
    if (typeof updateStat === 'function') updateStat();
}

/**
 * Funzione di utilità per evitare che caratteri speciali nella ricerca (es. ?, +, -) rompano la Regex
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Aggiorna il contatore delle canzoni totali e visibili
 */
function updateStat() {
    const total = document.querySelectorAll("#myUL li").length;
    const visible = document.querySelectorAll("#myUL li:not([style*='display: none'])").length;
    const statEl = document.getElementById("stat");
    if (statEl) statEl.innerHTML = visible + " / " + total + " canzoni";
}
