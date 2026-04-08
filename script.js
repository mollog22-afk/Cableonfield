let currentTab = 'LV';

const db = {
    LV: { sez: [95, 120, 150, 185, 240, 300], r: [0.410, 0.325, 0.265, 0.211, 0.162, 0.130], iz: [185, 215, 250, 285, 335, 385] },
    MV: { sez: [95, 120, 150, 185, 240], r: [0.411, 0.325, 0.265, 0.211, 0.162], iz: [220, 245, 280, 315, 365] },
    DC: { sez: [4, 6, 10, 16], r: [5.09, 3.39, 1.95, 1.24], iz: [44, 56, 78, 102] }
};

function updateUI() {
    const sis = document.getElementById('sistema').value;
    const selSez = document.getElementById('sez');
    selSez.innerHTML = db[sis].sez.map(s => `<option value="${s}">${s}</option>`).join('');
    calculate();
}

function calculate() {
    const sis = document.getElementById('sistema').value;
    const s = parseInt(document.getElementById('sez').value);
    const ib = parseFloat(document.getElementById('ib').value);
    const p = parseFloat(document.getElementById('prof').value);
    const ta = parseFloat(document.getElementById('t_amb').value);
    const layout = document.getElementById('layout').value;

    document.getElementById('prof-val').innerText = p + " m";
    const idx = db[sis].sez.indexOf(s);
    const R = db[sis].r[idx];
    const Iz_base = db[sis].iz[idx];

    // Termica IEC 60287
    const kP = p <= 0.8 ? 1.0 : (p <= 1.2 ? 0.95 : 0.91);
    const kTemp = Math.sqrt((90 - ta) / (90 - 20));
    const iz_eff = Iz_base * kP * kTemp;

    // Elettrica
    const dV = sis === 'DC' ? (2 * 100 * ib * R / 1000) : (Math.sqrt(3) * ib * 0.1 * R);
    const Vnom = (sis === 'LV' ? 800 : (sis === 'MV' ? 30000 : 1500));
    const dvP = (dV / Vnom) * 100;

    // Magnetica (Biot-Savart)
    const d_mm = layout === 'trifoglio' ? 45 : 125;
    const mu0 = 4 * Math.PI * 1e-7;
    const B_uT = ((mu0 * ib * (d_mm/1000)) / (2 * Math.PI * Math.pow(1.0, 2))) * 1e6;

    // Meccanica
    const pull_daN = (s * (sis === 'DC' ? 50 : 30)) * 0.10197;

    updateStat('res-dv', dvP.toFixed(2) + "%", dvP > 1.5);
    updateStat('res-iz', iz_eff.toFixed(1) + " A", ib > iz_eff);
    updateStat('res-pull', pull_daN.toFixed(0) + " daN", false);
    updateStat('res-mag', B_uT.toFixed(2) + " µT", B_uT > 10);

    drawThermal(ta, ib / iz_eff, p);
}

function updateStat(id, val, danger) {
    const el = document.getElementById(id);
    el.innerText = val;
    el.parentElement.className = danger ? 'stat-card danger' : 'stat-card active';
}

function drawThermal(tA, load, p) {
    const canvas = document.getElementById('thermalMap');
    const ctx = canvas.getContext('2d');
    const cx = 400, cy = 100 + (p * 70);
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0,0,800,420);
    ctx.fillStyle = "#1c140e"; ctx.fillRect(0, 60, 800, 360);
    
    const rMax = 40 + (load * 180);
    for(let r = rMax; r > 5; r -= 5) {
        let ratio = r / rMax;
        ctx.fillStyle = `rgba(255, ${100 * (1-ratio)}, 0, ${0.3 * (1-ratio)})`;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.text("RELAZIONE CABLEONFIELD PRO", 20, 20);
    doc.autoTable({ startY: 30, head: [['Parametro', 'Valore']], body: [
        ['Sezione', document.getElementById('sez').value + " mm²"],
        ['dV %', document.getElementById('res-dv').innerText],
        ['Iz Effettiva', document.getElementById('res-iz').innerText],
        ['Tiro Massimo', document.getElementById('res-pull').innerText],
        ['Campo Magnetico', document.getElementById('res-mag').innerText]
    ]});
    doc.save("Cableonfield_Report.pdf");
}
updateUI();
/* --- NUOVO SELETTORE VISIVO --- */
.pose-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 8px;
}

.pose-selector input[type="radio"] {
    display: none; /* Nasconde il pallino standard */
}

.pose-card {
    background: #0d1117;
    border: 2px solid #30363d;
    border-radius: 8px;
    padding: 12px 5px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.pose-img-placeholder {
    font-size: 24px;
    margin-bottom: 8px;
}

.pose-card span {
    font-size: 9px;
    color: #8b949e;
    font-weight: 800;
    text-transform: uppercase;
}

/* Effetto Selezione */
.pose-selector input[type="radio"]:checked + .pose-card {
    border-color: var(--primary);
    background: rgba(0, 210, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 210, 255, 0.15);
}

.pose-selector input[type="radio"]:checked + .pose-card span {
    color: var(--primary);
}

.pose-card.highlight {
    border-style: dashed;
}

