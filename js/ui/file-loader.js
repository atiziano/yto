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
 */
function filter() {
    const val = document.getElementById('myInput').value.toUpperCase();
    const li = document.getElementById('myUL').getElementsByTagName('li');
    for (let i = 0; i < li.length; i++) {
        const txt = li[i].getAttribute('data-name') || '';
        if (txt.toUpperCase().indexOf(val) > -1) {
            li[i].style.display = "";
            const regex = new RegExp("(" + val + ")", "gi");
            li[i].innerHTML = val.length > 0 ? txt.replace(regex, "<span class='search-match'>$1</span>") : txt;            
        } else { li[i].style.display = "none"; }
    }
    updateStat();
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
