// ******************************************************************************
// --- GESTIONE CANTANTI ---
// ******************************************************************************

/**
 * Toggle dello stato "done" di un cantante nella lista e aggiornamento del contatore
 * @param {number} index - L'indice del cantante nella lista da modificare
 */
function toggleCheck(index) {
    let list = JSON.parse(localStorage.getItem('karaoke_singers')) || [];
    list[index].done = !list[index].done;
    localStorage.setItem('karaoke_singers', JSON.stringify(list));
    renderSingers();
}

/**
 * Visualizza la lista dei cantanti e aggiorna il contatore
 */
function renderSingers() {
    const uiList = document.getElementById('singerList');
    const countDisplay = document.getElementById('singer-count-badge');
    const list = JSON.parse(localStorage.getItem('karaoke_singers')) || [];
    uiList.innerHTML = "";
    countDisplay.innerText = list.length;
    list.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = "singer-item";
        li.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" onchange="toggleCheck(${index})" ${item.done ? 'checked' : ''}>
            <span style="${item.done ? 'text-decoration: line-through; color: #64748b;' : ''}">${item.name}</span>
        </div>`;
        uiList.appendChild(li);
    });
    countDisplay.style.display = list.length === 0 ? 'none' : 'block';

}

/**
 * Aggiunge un nuovo cantante alla lista e aggiorna il contatore
 */
function addSinger(newName) {
    
    if (newName !== null && newName.trim() !== "") {
        const list = JSON.parse(localStorage.getItem('karaoke_singers')) || [];
        list.push({ name: newName.trim(), done: false });
        localStorage.setItem('karaoke_singers', JSON.stringify(list));
        
        renderSingers();

    // Scroll automatico DOPO il render
        setTimeout(() => {
            const panel = document.querySelector("#singer-panel .panel-scroll");
            panel.scrollTop = panel.scrollHeight;
        }, 0);
    }
}

/**
 * Rimuove un cantante dalla lista e aggiorna il contatore
 */
// function removeSinger(index) {
// 	let list = JSON.parse(localStorage.getItem('karaoke_singers')) || [];
// 	list.splice(index, 1);
// 	localStorage.setItem('karaoke_singers', JSON.stringify(list));
// 	renderSingers();
// }

/**
 * Seleziona tutti i cantanti nella lista e aggiorna il contatore
 */
function selectAll() {
    let list = JSON.parse(localStorage.getItem('karaoke_singers')) || [];
    const allDone = list.every(i => i.done);
    list.forEach(i => i.done = !allDone);
    localStorage.setItem('karaoke_singers', JSON.stringify(list));
    renderSingers();
}

/**
 * Deseleziona i cantanti selezionati nella lista e aggiorna il contatore
 */
function deleteSelected() {
    let list = JSON.parse(localStorage.getItem('karaoke_singers')) || [];
    
    // 1. Filtriamo tenendo solo chi NON è selezionato (i sopravvissuti)
    const filtered = list.filter(i => !i.done);
    
    // 2. Se la lunghezza di 'filtered' è diversa da 'list', significa che c'era qualcuno da cancellare!
    if (filtered.length < list.length) { 
        if (confirm("Cancellare i selezionati?")) {
            localStorage.setItem('karaoke_singers', JSON.stringify(filtered));
            renderSingers();
        }
    }
}
