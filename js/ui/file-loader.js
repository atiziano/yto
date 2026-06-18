// ==========================================================================
// FILE LOADER - Caricamento file video e ricerca
// ==========================================================================
/**
 * L'UNICO MOTORE DI CARICAMENTO LOCALE
 * Scansiona una cartella qualsiasi tramite Node.js e popola la griglia.
 * @param {string} percorsoAssoluto - Il percorso della cartella da leggere
 */
function caricaCartellaLocale(percorsoAssoluto) {
    if (!fs.existsSync(percorsoAssoluto)) {
        fs.mkdirSync(percorsoAssoluto, { recursive: true });
    }

    console.log("📂 [Core-Loader] Scansione cartella in corso:", percorsoAssoluto);

    // ==========================================================================
    // 🚀 LOGICA DI MEMORIZZAZIONE DIFENSIVA DELLE CARTELLE
    // ==========================================================================
    try {
        // 1. Recupera la stringa dal localStorage, se non esiste parte con un array vuoto "[]"
        const cartelleSalvateRaw = localStorage.getItem('yto_cartelle_locali') || "[]";
        let listaCartelle = JSON.parse(cartelleSalvateRaw);

        // 2. Aggiunge il percorso corrente alla lista solo se non è già presente
        if (!listaCartelle.includes(percorsoAssoluto)) {
            listaCartelle.push(percorsoAssoluto);
            
            // 3. Risalva l'array aggiornato nel localStorage convertito in stringa
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

        // Inizializza l'oggetto e l'array globale SOLO se non esistono ancora
        if (!window.yto) window.yto = {};
        if (!window.yto.databaseBasi) window.yto.databaseBasi = [];

        const tracceMancantiDiCopertina = [];

        videoFiles.forEach(file => {
            const nomePuro = file.substring(0, file.lastIndexOf('.'));
            const pathCompletoVideo = path.join(percorsoAssoluto, file);
            const urlVideoUniversale = 'file:///' + pathCompletoVideo.replace(/\\/g, '/');
            
            // 🎯 CONTROLLO DI ESISTENZA: Verifica se questo file è già presente nel database
            const giaPresente = window.yto.databaseBasi.some(base => base.pathCompleto === urlVideoUniversale);
            
            // Se il brano esiste già, saltiamo il push e passiamo al prossimo file
            if (giaPresente) {
                return; 
            }

            let copertinaAssegnata = mappaCopertine[nomePuro];

            if (!copertinaAssegnata) {
                copertinaAssegnata = ''; 
                tracceMancantiDiCopertina.push({
                    titolo: nomePuro,
                    nomeFile: file
                });
            }

            // Aggiunge il brano SOLO se ha superato il controllo di esistenza
            window.yto.databaseBasi.push({
                tipo: 'locale',
                nomeFile: file,
                titolo: nomePuro,
                pathCompleto: urlVideoUniversale,
                copertina: copertinaAssegnata 
            });
        });

        // Ordina alfabeticamente
        window.yto.databaseBasi.sort((a, b) => a.titolo.localeCompare(b.titolo));
        
        // Renderizza usando il sovrano unico
        mostraInGriglia(window.yto.databaseBasi);
        
        if (typeof updateStat === "function") updateStat();
        if (typeof filter === "function") filter();
        
        // Coda download copertine
        if (typeof eseguiCodaDownloadCopertine === "function" && tracceMancantiDiCopertina.length > 0) {
            const codaStandard = tracceMancantiDiCopertina.map(t => ({
                titolo: t.titolo,
                soloCopertina: true
            }));
            eseguiCodaDownloadCopertine(percorsoAssoluto, codaStandard);
        }
    });
}

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

    if (!fs.existsSync(percorsoYtdlp)) {
        console.error(`❌ [Errore] yt-dlp.exe non trovato in: ${percorsoYtdlp}`);
        return;
    }

    const percorsoTempIniziale = path.join(process.cwd(), 'bin', 'yt', 'temp_thumb');
    const cartellaBin = path.join(process.cwd(), 'bin', 'yt');

    for (let i = 0; i < totaleTracce; i++) {
        const traccia = listaTracce[i];
        
        try {
            let titoloCercaYT = traccia.titolo.replace(/[\(\)\[\]]/g, "").trim();
            const estensioniPossibili = ['.jpg', '.webp', '.png', '.jpeg'];

            let comando = "";
            if (traccia.soloCopertina === false) {
                console.log(`%c   ▶ [Download Completo] Video + Cover per: "${traccia.titolo}"`, "color: #38bdf8;");
                // Proteggiamo i percorsi con le virgolette per evitare i crash di Windows
                const fileUscitaPattern = path.join(cartella, `${traccia.titolo}.%(ext)s`);
                comando = `"${percorsoYtdlp}" "${traccia.urlYt}" -f "mp4" --write-thumbnail --convert-thumbnails jpg --ffmpeg-location "${cartellaBin}" --no-check-certificates --extractor-args "youtube:player_client=android" -o "${fileUscitaPattern}"`;
            } else {
                // Svuotiamo i vecchi file temporanei
                estensioniPossibili.forEach(est => {
                    const vecchioTemp = `${percorsoTempIniziale}${est}`;
                    if (fs.existsSync(vecchioTemp)) fs.unlinkSync(vecchioTemp);
                });
                comando = `"${percorsoYtdlp}" "ytsearch1:${titoloCercaYT}" --skip-download --write-thumbnail --no-check-certificates --extractor-args "youtube:player_client=android" -o "${percorsoTempIniziale}.%(ext)s"`;
            }

            // Eseguiamo il comando di yt-dlp
            await new Promise((resolve, reject) => {
                exec(comando, (error) => {
                    if (error) return reject(error);
                    resolve();
                });
            });

            let urlImmagineCruco = '';

            if (traccia.soloCopertina === false) {
                // Cerchiamo la copertina reale appena creata insieme al video
                for (const est of estensioniPossibili) {
                    const verificaCoverFinale = path.join(cartella, `${traccia.titolo}${est}`);
                    if (fs.existsSync(verificaCoverFinale)) {
                        urlImmagineCruco = 'file:///' + verificaCoverFinale.replace(/\\/g, '/');
                        break;
                    }
                }
            } else {
                // Gestione del file temporaneo spostato per l'init
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
                    urlImmagineCruco = 'file:///' + percorsoDestinazioneFinale.replace(/\\/g, '/');
                }
            }

            // Aggiorniamo la memoria globale dell'applicazione
            const baseInMemoria = window.yto.databaseBasi.find(b => b.titolo === traccia.titolo && b.tipo === 'locale');

            if (baseInMemoria) {
                baseInMemoria.copertina = urlImmagineCruco;
                
                if (traccia.soloCopertina === false) {
                    baseInMemoria.nomeFile = `${traccia.titolo}.mp4`;
                    baseInMemoria.pathCompleto = path.join(cartella, `${traccia.titolo}.mp4`);
                }
            }

            // Rinfresca l'interfaccia
            if (typeof mostraInGriglia === "function") {
                // Se stiamo scaricando attivamente, isoliamo la card; se è l'init iniziale mostriamo tutto
                if (traccia.soloCopertina === false) {
                    mostraInGriglia([baseInMemoria].filter(Boolean));
                } else {
                    mostraInGriglia(window.yto.databaseBasi);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
            console.error(`❌ Errore nel ciclo di download per: "${traccia.titolo}"`, err);
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
        
        // Recuperiamo il nome originale ed eliminiamo l'estensione per il filtro pulito
        let txt = item.getAttribute('data-name') || '';
        txt = txt.replace(/\.mp4$/i, ''); 
        
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
                    const pattern = paroleCercate.map(p => escapeRegExp(p)).join('|');
                    const regex = new RegExp(`(${pattern})`, "gi");
                    
                    // Evidenzia i match sul testo del titolo h4
                    h4Titolo.innerHTML = txtPulito.replace(regex, "<span class='search-match'>$1</span>");
                } else {
                    // Se l'input è vuoto, ripristina il testo originale pulito senza tag
                    h4Titolo.innerText = txtPulito;
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
