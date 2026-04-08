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
    const posa = document.querySelector('input[name="pose"]:checked').value;

    document.getElementById('prof-val').innerText = p + " m";
    const idx = db[sis].sez.indexOf(s);
    const R = db[sis].r[idx];
    const Iz_base = db[sis].iz[idx];

    // 1. MATEMATICA TERMICA (IEC 60287)
    const kP = p <= 0.8 ? 1.0 : (p <= 1.2 ? 0.95 : 0.91);
    const kTemp = Math.sqrt((90 - ta) / (90 - 20));
    
    // Declassamento per Interferenza (Scenario ELEK)
    let kInt = 1.0;
    let dist_mm = 45;
    if (posa === 'batteria') { kInt = 0.78; dist_mm = 250; }
    else if (posa === 'piano') { kInt = 0.94; dist_mm = 120; }

    const iz_eff = Iz_base * kP * kTemp * kInt;

    // 2. MATEMATICA ELETTRICA
    const dV = (Math.sqrt(3) * ib * 0.1 * R); // Semplificato per tratta 100m
    const Vnom = (sis === 'LV' ? 800 : (sis === 'MV' ? 30000 : 1500));
    const dvP = (dV / Vnom) * 100;

    // 3. MATEMATICA MAGNETICA & MECCANICA
    const B_uT = ((4 * Math.PI * 1e-7 * ib * (dist_mm/1000)) / (2 * Math.PI)) * 1e6;
    const pull_daN = (s * (sis === 'DC' ? 50 : 30)) * 0.10197;

    // Aggiornamento UI
    updateStat('res-dv', dvP.toFixed(2) + "%", dvP > 1.5);
    updateStat('res-iz', iz_eff.toFixed(1) + " A", ib > iz_eff);
    updateStat('res-pull', pull_daN.toFixed(0) + " daN", false);
    updateStat('res-mag', B_uT.toFixed(2) + " µT", B_uT > 10);

    drawThermal(ta, ib / iz_eff, p, posa);
}

function updateStat(id, val, danger) {
    const el = document.getElementById(id);
    el.innerText = val;
    el.parentElement.className = danger ? 'stat-card danger' : 'stat-card active';
}

function drawThermal(tA, load, p, posa) {
    const canvas = document.getElementById('thermalMap');
    const ctx = canvas.getContext('2d');
    const cx = 400, cy = 100 + (p * 70);
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0,0,800,420);
    ctx.fillStyle = "#1c140e"; ctx.fillRect(0, 60, 800, 360);
    
    const rMax = 40 + (load * 180);
    
    // Se batteria, disegniamo due gradienti
    const offset = posa === 'batteria' ? 100 : 0;
    
    [cx - offset, cx + offset].forEach(x => {
        if(posa !== 'batteria' && x !== cx) return;
        for(let r = rMax; r > 5; r -= 8) {
            let ratio = r / rMax;
            ctx.fillStyle = `rgba(255, ${100 * (1-ratio)}, 0, ${0.25 * (1-ratio)})`;
            ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(x, cy, 10, 0, Math.PI*2); ctx.fill();
    });
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.text("CABLEONFIELD PRO - REPORT", 20, 20);
    doc.autoTable({ startY: 30, body: [['Sezione', document.getElementById('sez').value], ['Portata Iz', document.getElementById('res-iz').innerText], ['Campo B', document.getElementById('res-mag').innerText]] });
    doc.save("Report_Cableonfield.pdf");
}

updateUI();
