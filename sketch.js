// ─────────────────────────────────────────────────────────────
//  Temperatura dei fiumi nel mondo
//  Ogni barra va da min_temp a max_temp; il colore = fascia della media.
//  Dataset: assets/data.csv  (100 fiumi)
// ─────────────────────────────────────────────────────────────

// ---- Costanti di configurazione -------------------------------------
const CSV_URL = 'assets/data.csv';   // il CSV è nella cartella assets

const COL_BG        = '#12234a';   // blu notte
const COL_TESTI     = '#ffffff';
const COL_BARRA_HOV = '#ffffff';   // bordo bianco della barra sotto il cursore

const TEMP_MIN_SCALA = -22;        // estremi dell'asse Y, con un po' di margine
const TEMP_MAX_SCALA = 32;

const MARGINE_SOPRA    = 110;  // spazio per il titolo
const MARGINE_SOTTO    = 120;  // spazio per la legenda
const MARGINE_LATERALE = 40;

// Soglie delle 4 classi di colore (sulla temperatura media)
const SOGLIE = [8, 14, 20];
const COLORI_CLASSI = ['#2f6fd0', '#f2e02a', '#e8892b', '#e0342b']; // freddo → caldo

// ---- Stato globale --------------------------------------------------
let tabella = null;      // la tabella caricata dal CSV
let fiumi = [];          // array di oggetti, uno per fiume
let barraSottoCursore = null;

// ─────────────────────────────────────────────────────────────
//  1. Caricamento del dataset
// ─────────────────────────────────────────────────────────────
function preload() {
  tabella = loadTable(CSV_URL, 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Helvetica, Arial, sans-serif');
  preparaDati();
}

// Trasforma la tabella CSV in un array di oggetti puliti e ordinati.
function preparaDati() {
  fiumi = [];

  if (!tabella) {
    console.error('CSV non caricato: controlla che il file esista in ' + CSV_URL);
    return;
  }

  for (let i = 0; i < tabella.getRowCount(); i++) {
    const riga = tabella.getRow(i);
    const min = Number(riga.get('min_temp'));
    const max = Number(riga.get('max_temp'));

    // righe incomplete o non numeriche vengono scartate in sicurezza
    if (isNaN(min) || isNaN(max)) continue;

    fiumi.push({
      nome:       riga.get('name'),
      continente: riga.get('continent'),
      min:        min,
      max:        max,
      media:      (min + max) / 2
    });
  }

  // ordina dal fiume più freddo al più caldo: la griglia racconta un pattern
  fiumi.sort((a, b) => a.media - b.media);

  console.log('fiumi caricati:', fiumi.length);   // deve dire 100
}

// ─────────────────────────────────────────────────────────────
//  2. Disegno
// ─────────────────────────────────────────────────────────────
function draw() {
  background(COL_BG);

  const area = {
    x: MARGINE_LATERALE,
    y: MARGINE_SOPRA,
    w: width - MARGINE_LATERALE * 2,
    h: height - MARGINE_SOPRA - MARGINE_SOTTO
  };

  disegnaTitolo();
  calcolaBarre(area);
  aggiornaBarraSottoCursore();
  disegnaBarre();
  disegnaEtichetteAsse(area);
  disegnaLegenda(area);
  disegnaTooltip();
}

function disegnaTitolo() {
  noStroke();
  fill(COL_TESTI);
  textAlign(LEFT, TOP);

  textSize(34);
  textStyle(BOLD);
  text('Temperatura dei fiumi nel mondo', MARGINE_LATERALE, 34);

  textSize(15);
  textStyle(NORMAL);
  fill(190, 200, 225);
  text('Ogni barra va dalla temperatura minima alla massima del bacino; il colore indica la fascia climatica della media.',
       MARGINE_LATERALE, 78);
}

// Converte una temperatura in una coordinata Y dello schermo.
function tempToY(t, area) {
  return map(t, TEMP_MIN_SCALA, TEMP_MAX_SCALA, area.y + area.h, area.y);
}

// Calcola posizione e larghezza di ogni barra (nessun disegno qui).
function calcolaBarre(area) {
  const passo = area.w / fiumi.length;   // 100 fiumi → barre sottili e regolari
  const larghezza = passo * 0.6;         // 60% del passo lascia aria tra le barre

  fiumi.forEach((fiume, i) => {
    const centro = area.x + passo * (i + 0.5);
    fiume.x = centro - larghezza / 2;
    fiume.larghezza = larghezza;
    fiume.yAlto = tempToY(fiume.max, area);
    fiume.yBasso = tempToY(fiume.min, area);
    fiume.altezza = fiume.yBasso - fiume.yAlto;
    fiume.colore = colorePerMedia(fiume.media);
  });
}

// Restituisce il colore della classe di appartenenza della media.
function colorePerMedia(media) {
  let indice = 0;
  for (let i = 0; i < SOGLIE.length; i++) {
    if (media > SOGLIE[i]) indice = i + 1;
  }
  return COLORI_CLASSI[indice];
}

function disegnaBarre() {
  noStroke();
  fiumi.forEach(fiume => {
    fill(fiume.colore);
    rect(fiume.x, fiume.yAlto, fiume.larghezza, fiume.altezza);
  });

  // evidenzia la barra sotto il cursore
  if (barraSottoCursore) {
    noFill();
    stroke(COL_BARRA_HOV);
    strokeWeight(2);
    rect(barraSottoCursore.x, barraSottoCursore.yAlto,
         barraSottoCursore.larghezza, barraSottoCursore.altezza);
    noStroke();
  }
}

// Alcune tacche di riferimento sulla sinistra: rendono leggibili le altezze.
function disegnaEtichetteAsse(area) {
  const valori = [-20, -10, 0, 10, 20, 30];
  textSize(12);
  textAlign(RIGHT, CENTER);

  valori.forEach(v => {
    const y = tempToY(v, area);
    if (y < area.y - 1 || y > area.y + area.h + 1) return;

    stroke(255, 255, 255, 25);
    strokeWeight(1);
    line(area.x, y, area.x + area.w, y);
    noStroke();

    fill(190, 200, 225);
    text(v + '°', area.x - 10, y);
  });
  noStroke();
}

// ─────────────────────────────────────────────────────────────
//  3. Legenda a gradiente
// ─────────────────────────────────────────────────────────────
function disegnaLegenda(area) {
  const larghezza = min(420, area.w * 0.5);
  const altezza = 14;
  const x = area.x;
  const y = area.y + area.h + 46;

  // barra sfumata: interpola i 4 colori sulle soglie
  const inizio = -20, fine = 30;
  for (let i = 0; i < larghezza; i++) {
    const t = map(i, 0, larghezza, inizio, fine);
    stroke(colorePerMedia(t));
    line(x + i, y, x + i, y + altezza);
  }
  noStroke();

  // tacche e valori delle soglie
  textSize(12);
  textAlign(CENTER, TOP);
  SOGLIE.forEach(s => {
    const px = map(s, inizio, fine, x, x + larghezza);
    stroke(COL_BG);
    strokeWeight(2);
    line(px, y, px, y + altezza + 5);
    noStroke();
    fill(190, 200, 225);
    text(s + '°', px, y + altezza + 8);
  });

  // etichette estreme
  textAlign(LEFT, TOP);
  text(inizio + '°', x, y + altezza + 8);
  textAlign(RIGHT, TOP);
  text(fine + '°', x + larghezza, y + altezza + 8);

  textAlign(LEFT, TOP);
  fill(255);
  textSize(13);
  text('Temperatura media del bacino', x, y - 22);
}

// ─────────────────────────────────────────────────────────────
//  4. Interazione: hover
// ─────────────────────────────────────────────────────────────
function aggiornaBarraSottoCursore() {
  barraSottoCursore = null;

  const dentroArea = mouseY > MARGINE_SOPRA && mouseY < height - MARGINE_SOTTO;
  if (!dentroArea) return;

  fiumi.forEach(fiume => {
    const dentroY = mouseY >= fiume.yAlto && mouseY <= fiume.yBasso;
    const dentroX = mouseX >= fiume.x && mouseX <= fiume.x + fiume.larghezza;
    if (dentroY && dentroX) barraSottoCursore = fiume;
  });
}

// Etichetta ancorata al cursore: segue sempre il mouse.
function disegnaTooltip() {
  if (!barraSottoCursore) return;

  const f = barraSottoCursore;
  const righe = [
    f.nome,
    f.continente,
    'min ' + f.min + '°   max ' + f.max + '°',
    'media ' + f.media.toFixed(1) + '°'
  ];

  textSize(13);
  const padding = 10;
  let larghezza = 0;
  righe.forEach(r => larghezza = max(larghezza, textWidth(r)));
  larghezza += padding * 2;
  const altezza = 18 * righe.length + padding * 2 - 4;

  // tiene l'etichetta dentro la finestra
  let x = mouseX + 16;
  let y = mouseY + 16;
  if (x + larghezza > width - 8) x = mouseX - larghezza - 16;
  if (y + altezza > height - 8) y = mouseY - altezza - 16;

  noStroke();
  fill(8, 18, 42, 235);
  rect(x, y, larghezza, altezza, 6);

  stroke(f.colore);
  strokeWeight(2);
  noFill();
  rect(x, y, larghezza, altezza, 6);
  noStroke();

  textAlign(LEFT, TOP);
  righe.forEach((r, i) => {
    fill(255, 255, 255);
    textStyle(i === 0 ? BOLD : NORMAL);
    text(r, x + padding, y + padding + i * 18);
  });
  textStyle(NORMAL);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
