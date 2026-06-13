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

    const files = Array.from(input.files).filter(f => f.name.toLowerCase().endsWith('.mp4'));

    if (files.length === 0) {
        alert("Nella cartella non ci sono video .mp4 validi per il karaoke!");
        return;
    }

    const ul = document.getElementById('myUL');
    ul.innerHTML = '';

    files.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
        const li = document.createElement('li');
        const url = URL.createObjectURL(f);
        li.setAttribute('data-name', f.name);
        li.onclick = function () { play(url, this); };

        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "space-between";

        const titolo = document.createElement("span");
        titolo.innerText = f.name;

        wrapper.appendChild(titolo);
        li.appendChild(wrapper);
        ul.appendChild(li);
    });

    updateStat();
    filter();
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
