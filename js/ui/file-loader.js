// ==========================================================================
// FILE LOADER - Caricamento file video e ricerca
// ==========================================================================
/**
 * L'UNICO MOTORE DI CARICAMENTO LOCALE
 * Scansiona una cartella qualsiasi tramite Node.js e popola la griglia.
 * @param {string} percorsoAssoluto - Il percorso della cartella da leggere
 */
/**
 * Scansiona una cartella locale, estrae i video e le copertine,
 * e passa i dati normalizzati al motore centrale.
 */
function caricaCartellaLocale(percorsoAssoluto) {
    if (!fs.existsSync(percorsoAssoluto)) {
        fs.mkdirSync(percorsoAssoluto, { recursive: true });
    }

    console.log("📂 [Core-Loader] Scansione cartella in corso:", percorsoAssoluto);

    // ==========================================================================
    // 🚀 LOGICA DI MEMORIZZAZIONE DIFENSIVA DELLE CARTELLE (Invariata)
    // ==========================================================================
    try {
        const cartelleSalvateRaw = localStorage.getItem('yto_cartelle_locali') || "[]";
        let listaCartelle = JSON.parse(cartelleSalvateRaw);

        if (!listaCartelle.includes(percorsoAssoluto)) {
            listaCartelle.push(percorsoAssoluto);
            localStorage.setItem('yto_cartelle_locali', JSON.stringify(listaCartelle));
            console.log("💾 [Storage] Percorso cartella memorizzato con successo:", percorsoAssoluto);
        }
    } catch (e) {
        console.error("❌ [Storage] Impossibile salvare la cartella nel localStorage:", e);
    }
    // ==========================================================================

    fs.readdir(percorsoAssoluto, (err, files) => {
        if (err) {
            console.error("❌ Errore nella lettura della cartella:", err);
            return;
        }

        const videoFiles = files.filter(file => file.toLowerCase().endsWith('.mp4'));
        const immagini = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
        
        // Mappa delle copertine
        const mappaCopertine = {};
        immagini.forEach(img => {
            const nomePuro = img.substring(0, img.lastIndexOf('.'));
            const pathAssolutoImg = path.join(percorsoAssoluto, img);
            mappaCopertine[nomePuro] = 'file:///' + pathAssolutoImg.replace(/\\/g, '/'); 
        });

        // Array temporaneo di supporto per raccogliere le tracce locali di questa scansione
        const tracceLocaliNormalizzate = [];
        const tracceMancantiDiCopertina = [];

        videoFiles.forEach(file => {
            const nomePuro = file.substring(0, file.lastIndexOf('.'));
            const pathCompletoVideo = path.join(percorsoAssoluto, file);
            const urlVideoUniversale = 'file:///' + pathCompletoVideo.replace(/\\/g, '/');
            
            let copertinaAssegnata = mappaCopertine[nomePuro];

            if (!copertinaAssegnata) {
                copertinaAssegnata = ''; 
                tracceMancantiDiCopertina.push({
                    titolo: nomePuro,
                    nomeFile: file
                });
            }

            // Prepariamo l'oggetto nel formato standard condiviso
            tracceLocaliNormalizzate.push({
                tipo: 'locale',
                nomeFile: file,
                titolo: nomePuro,
                pathCompleto: urlVideoUniversale,
                copertina: copertinaAssegnata 
            });
        });

        // 🚀 PASSAGGIO AL MOTORE UNICO: Deleghiamo inserimento, ordinamento e rendering
        aggiungiTracceAlDatabase(tracceLocaliNormalizzate);
        
        // Coda download copertine (Invariata)
        if (typeof eseguiCodaDownloadCopertine === "function" && tracceMancantiDiCopertina.length > 0) {
            const codaStandard = tracceMancantiDiCopertina.map(t => ({
                titolo: t.titolo,
                soloCopertina: true
            }));
            eseguiCodaDownloadCopertine(percorsoAssoluto, codaStandard);
        }
    });
}

// Esposizione globale
window.caricaCartellaLocale = caricaCartellaLocale;

/**
 * Carica i file video selezionati e li mostra nella lista, ordinati alfabeticamente
 * @param {HTMLInputElement} input - L'input file da cui leggere i video
 */
function loadExternalFiles(input) {
    if (!input.files || input.files.length === 0) return;
    
    // Sfruttiamo NW.js per estrarre il percorso reale assoluto della cartella scelta dal PC!
    const percorsoCartellaScelta = input.files[0].path ? path.dirname(input.files[0].path) : null;
    
    if (percorsoCartellaScelta) {
        caricaCartellaLocale(percorsoCartellaScelta);
    } else {
        alert("Impossibile recuperare il percorso della cartella.");
    }
}

async function eseguiCodaDownloadCopertine(cartella, listaTracce) {

    const percorsoYtdlp = path.join(process.cwd(), 'bin', 'yt', 'yt-dlp.exe');
    const totaleTracce = listaTracce.length;

    if (totaleTracce > 50 && listaTracce[0].soloCopertina !== false) {
        const conferma = confirm(`⚠️ Ci sono ben ${totaleTracce} canzoni senza copertina.\n\nVuoi procedere comunque lentamente in background?`);
        if (!conferma) return;
    }

    const cartellaBin = path.join(process.cwd(), 'bin', 'yt');
    const https = require('https');

    console.log(`🔍 [Init Copertine] Controllo di ${totaleTracce} tracce in corso...`);

    for (let i = 0; i < totaleTracce; i++) {
        const traccia = listaTracce[i];
        
        try {
            let titoloCercaYT = traccia.titolo;
            const percorsoDestinazioneJpg = path.join(cartella, `${traccia.titolo}.jpg`);
            let urlImmagineCruco = '';
            let videoId = null;

            // STRATEGIA 1: Proviamo a prendere l'ID dall'URL se esiste
            if (traccia.urlYt) {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = traccia.urlYt.match(regExp);
                if (match && match[2].length === 11) videoId = match[2];
            }

            // STRATEGIA 2: Se non c'è l'URL, usiamo yt-dlp al volo SOLO per farci dare l'ID del video su YouTube!
            if (!videoId && fs.existsSync(percorsoYtdlp)) {
                
                // 🎯 Ottimizziamo la query solo per YouTube per cercare la copertina dell'album ufficiale
                const queryOttimizzata = `${titoloCercaYT}`;

                await new Promise((resolve) => {
                    // Chiediamo a yt-dlp solo l'ID usando --get-id con la queryOttimizzata, è velocissimo
                    const comandoId = `"${percorsoYtdlp}" "ytsearch1:${queryOttimizzata}" --get-id --no-check-certificates --extractor-args "youtube:player_client=android"`;
                    
                    exec(comandoId, (error, stdout) => {
                        if (!error && stdout) {
                            const idEstratto = stdout.trim();
                            // YouTube restituisce l'ID pulito di 11 caratteri (se ci sono caratteri strani o spazi, saltiamo)
                            if (idEstratto.length === 11 && !idEstratto.includes(" ")) {
                                videoId = idEstratto;
                            }
                        }
                        resolve();
                    });
                });
            }

            // 🎯 ORA CHE ABBIAMO L'ID (da URL o da Ricerca), SCARICHIAMO IL JPG NATIVO VIA HTTPS
            if (videoId) {
                const urlCoverJpg = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                
                await new Promise((resolve) => {
                    const fileStream = fs.createWriteStream(percorsoDestinazioneJpg);
                    https.get(urlCoverJpg, (response) => {
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            urlImmagineCruco = 'file:///' + percorsoDestinazioneJpg.replace(/\\/g, '/');
                            console.log(`📸 [Copertina JPG] Salvata con successo: ${traccia.titolo}.jpg`);
                            resolve();
                        });
                    }).on('error', (err) => {
                        console.error(`❌ Errore download HTTPS per ${traccia.titolo}:`, err);
                        resolve();
                    });
                });
            } else if (traccia.soloCopertina === false && fs.existsSync(percorsoYtdlp)) {
                // Sotto-caso: Se è un download video completo richiesto esplicitamente, usiamo il comando classico
                const fileUscitaPattern = path.join(cartella, `${traccia.titolo}.%(ext)s`);
                const comandoCompleto = `"${percorsoYtdlp}" "${traccia.urlYt}" -f "mp4" --write-thumbnail --convert-thumbnails jpg --ffmpeg-location "${cartellaBin}" --no-check-certificates --extractor-args "youtube:player_client=android" -o "${fileUscitaPattern}"`;
                
                await new Promise((resolve) => {
                    exec(comandoCompleto, () => resolve());
                });

                if (fs.existsSync(percorsoDestinazioneJpg)) {
                    urlImmagineCruco = 'file:///' + percorsoDestinazioneJpg.replace(/\\/g, '/');
                }
            }

            // Aggiorniamo la memoria dell'applicazione
            const baseInMemoria = window.yto.databaseBasi.find(b => b.titolo === traccia.titolo && b.tipo === 'locale');
            if (baseInMemoria && urlImmagineCruco) {
                baseInMemoria.copertina = urlImmagineCruco;
                if (traccia.soloCopertina === false) {
                    baseInMemoria.nomeFile = `${traccia.titolo}.mp4`;
                    baseInMemoria.pathCompleto = path.join(cartella, `${traccia.titolo}.mp4`);
                }
            }

            // Aggiorniamo l'interfaccia ogni 5 elementi o all'ultimo per non appesantire NW.js
            if (typeof mostraInGriglia === "function") {
                if (traccia.soloCopertina === false) {
                    mostraInGriglia([baseInMemoria].filter(Boolean));
                } else if (i === totaleTracce - 1 || i % 5 === 0) {
                    mostraInGriglia(window.yto.databaseBasi);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 150));

        } catch (err) {
            console.error(`❌ Errore nel ciclo per: "${traccia.titolo}"`, err);
        }
    }
}

/**
 * Filtra la lista dei video leggendo direttamente dal DOM (data-name)
 * Ripristina il comportamento originale sicuro per il caricamento delle cartelle
 */
function filter() {
    const inputVal = document.getElementById('myInput').value.trim();
    const valUpper = inputVal.toUpperCase();
    
    // Spezza l'input in singole parole ignorando gli spazi multipli
    const paroleCercate = valUpper.split(/\s+/).filter(p => p.length > 0);
    
    const li = document.getElementById('myUL').getElementsByTagName('li');

    for (let i = 0; i < li.length; i++) {
        const item = li[i];
        
        // 🎯 FIX 1: Recuperiamo il titolo dall'attributo data-name. 
        // Se non c'è (es. su YT), proviamo a prenderlo direttamente dal tag h4 interno.
        let txt = item.getAttribute('data-name') || item.querySelector('h4')?.innerText || '';
        txt = txt.replace(/\.mp4$/i, ''); // Elimina l'estensione per i file locali
        
        const txtUpper = txt.toUpperCase();

        // Verifichiamo se TUTTE le parole cercate sono contenute nel titolo (anche non consecutive)
        const matchTrovato = paroleCercate.every(parola => txtUpper.indexOf(parola) > -1);

        if (matchTrovato || paroleCercate.length === 0) {
            item.style.display = "";

            // Cerchiamo 'h4' che è il tag reale usato nelle card grandi
            const h4Titolo = item.querySelector('h4');
            if (h4Titolo) {
                if (paroleCercate.length > 0) {
                    // Crea una regex che intercetta tutte le parole cercate separate da un "or" (|)
                    const pattern = paroleCercate.map(p => typeof escapeRegExp === 'function' ? escapeRegExp(p) : p.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
                    const regex = new RegExp(`(${pattern})`, "gi");
                    
                    // 🎯 FIX 2: Sostituito 'txtPulito' (che mandava in crash l'app) con 'txt'
                    h4Titolo.innerHTML = txt.replace(regex, "<span class='search-match'>$1</span>");
                } else {
                    // Se l'input è vuoto, ripristina il testo originale pulito senza tag
                    h4Titolo.innerText = txt;
                }
            }
        } else {
            item.style.display = "none";
        }
    }
    
    if (typeof updateStat === 'function') updateStat();
}

/**
 * Funzione di supporto per scaricare file aggirando i limiti API di GitHub
 */
window.downloadFileDiretto = function (url, destinazione, callback) {

    const file = fs.createWriteStream(destinazione);
    
    const getRequest = (targetUrl) => {
        // 🎯 Aggiunto 'rejectUnauthorized: false' nelle opzioni di https
        const opzioni = { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            rejectUnauthorized: false 
        };

        https.get(targetUrl, opzioni, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                getRequest(response.headers.location);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                callback(false, `Server risponde con codice: ${response.statusCode}`);
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close(() => callback(true, null));
            });
        }).on('error', (err) => {
            fs.unlink(destinazione, () => {}); 
            file.close();
            callback(false, err.message);
        });
    };

    getRequest(url);
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
    if (statEl) statEl.innerHTML = visible + " / " + total;
}
