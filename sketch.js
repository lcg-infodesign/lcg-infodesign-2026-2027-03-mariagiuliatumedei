//Variabili
let data;                    //dataset caricato
let rivers = [];             //fiume
let hovered = null;          //fiume sotto il cursore

const CSV_URL = 'assets/data.csv';   

const COL_BG        = '#12234a';   
const COL_HOVER     = '#ffffff';   
const COL_ASSI      = 'rgba(255,255,255,0.10)';
const COL_TESTI     = '#ffffff';
const COL_TESTI_2   = '#bec8e1';   //sottotitolo

const TEMP_MIN = -22;              
const TEMP_MAX = 32;

//layout
let margin = 40;
let marginTop = 110;               //spazio sopra per il titolo
let marginBottom = 120;            //spazio sotto per la legenda
let gutter = 2;                    //spazio tra le barre

//4 classi di colore 
const SOGLIE = [8, 14, 20];
const COLORI_CLASSI = ['#2f6fd0', '#f2e02a', '#e8892b', '#e0342b']; //freddo → caldo

async function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Helvetica, Arial, sans-serif');

  data = await loadTable(CSV_URL, ",", "header");
  if (!data) {
    console.error('CSV non trovato in ' + CSV_URL);
    return;
  }

  for (let rowNumber = 0; rowNumber < data.getRowCount(); rowNumber++) {
    let min = data.getNum(rowNumber, "min_temp");
    let max = data.getNum(rowNumber, "max_temp");

    //info per ogni fiume
    rivers.push({
      nome: data.getString(rowNumber, "name"),
      continente: data.getString(rowNumber, "continent"),
      min: min,
      max: max,
      media: (min + max) / 2
    });
  }

  // Ordina dal fiume più freddo al più caldo: la sequenza racconta un pattern.
  rivers.sort((a, b) => a.media - b.media);

  console.log('fiumi caricati:', rivers.length);   // deve dire 100
}

// ─────────────────────────────────────────────────────────────
//  2. Disegno
// ─────────────────────────────────────────────────────────────
function draw() {
  background(COL_BG);

  // Se i dati non sono ancora pronti, esci senza disegnare.
  if (rivers.length === 0) return;

  // Sottrae margini e gutter dalla larghezza per mantenere tutto il grafico dentro il canvas.
  let areaX = margin;
  let areaY = marginTop;
  let areaW = width - 2 * margin;
  let areaH = height - marginTop - marginBottom;

  disegnaTitolo();
  calcolaBarre(areaX, areaY, areaW, areaH);
  aggiornaFiumeSottoCursore();
  disegnaBarre();
  disegnaRiferimenti(areaX, areaY, areaW, areaH);
  disegnaLegenda(areaX, areaY, areaW, areaH);
  disegnaTooltip();
}

function disegnaTitolo() {
  noStroke();
  textAlign(LEFT, TOP);

  fill(COL_TESTI);
  textSize(34);
  textStyle(BOLD);
  text('Temperatura dei fiumi nel mondo', margin, 34);

  textSize(15);
  textStyle(NORMAL);
  fill(COL_TESTI_2);
  text('Ogni barra va dalla temperatura minima alla massima del bacino; il colore indica la fascia climatica della media.',
       margin, 78);
}

// map() trasforma i dati in dimensioni visive: qui temperatura → coordinata Y.
function tempToY(t, areaY, areaH) {
  return map(t, TEMP_MIN, TEMP_MAX, areaY + areaH, areaY);
}

// Calcola posizione, altezza e colore di ogni barra (nessun disegno qui).
function calcolaBarre(areaX, areaY, areaW, areaH) {
  // Sottrae i gutter: una barra per fiume, uno spazio tra ogni coppia.
  let numberOfGutters = rivers.length - 1;
  let barsWidth = areaW - numberOfGutters * gutter;
  let barWidth = barsWidth / rivers.length;

  let xPos = areaX;

  // Ogni riga del CSV diventa una barra del grafico.
  for (let i = 0; i < rivers.length; i++) {
    let r = rivers[i];
    r.x = xPos;
    r.w = barWidth;
    r.yTop = tempToY(r.max, areaY, areaH);      // la barra parte dalla temperatura massima
    r.yBottom = tempToY(r.min, areaY, areaH);   // e finisce alla minima
    r.h = r.yBottom - r.yTop;
    r.colore = colorePerMedia(r.media);

    // Sposta la prossima barra dopo quella corrente, lasciando il gutter tra le due.
    xPos += barWidth + gutter;
  }
}

// Associa una temperatura media a una delle 4 classi di colore.
function colorePerMedia(media) {
  let indice = 0;
  for (let i = 0; i < SOGLIE.length; i++) {
    if (media > SOGLIE[i]) indice = i + 1;
  }
  return COLORI_CLASSI[indice];
}

function disegnaBarre() {
  noStroke();

  for (let r of rivers) {
    fill(r.colore);
    rect(r.x, r.yTop, r.w, r.h);
  }

  // Evidenzia con un bordo bianco la barra sotto il cursore.
  if (hovered) {
    noFill();
    stroke(COL_HOVER);
    strokeWeight(2);
    rect(hovered.x, hovered.yTop, hovered.w, hovered.h);
    noStroke();
  }
}

// Qualche linea di riferimento: rende leggibili le altezze senza appesantire il grafico.
function disegnaRiferimenti(areaX, areaY, areaW, areaH) {
  let valori = [-20, -10, 0, 10, 20, 30];

  textSize(12);
  textAlign(RIGHT, CENTER);

  for (let v of valori) {
    let y = tempToY(v, areaY, areaH);
    if (y < areaY - 1 || y > areaY + areaH + 1) continue;

    stroke(COL_ASSI);
    strokeWeight(1);
    line(areaX, y, areaX + areaW, y);
    noStroke();

    fill(COL_TESTI_2);
    text(v + '°', areaX - 10, y);
  }
}

// ─────────────────────────────────────────────────────────────
//  3. Legenda a gradiente
// ─────────────────────────────────────────────────────────────
function disegnaLegenda(areaX, areaY, areaW, areaH) {
  let larghezza = min(420, areaW * 0.5);
  let altezza = 14;
  let x = areaX;
  let y = areaY + areaH + 46;

  // Barra sfumata: una linea per ogni pixel, colorata secondo la temperatura.
  let inizio = -20;
  let fine = 30;

  for (let i = 0; i < larghezza; i++) {
    let t = map(i, 0, larghezza, inizio, fine);
    stroke(colorePerMedia(t));
    line(x + i, y, x + i, y + altezza);
  }
  noStroke();

  // Tacche e valori delle soglie.
  textSize(12);
  textAlign(CENTER, TOP);

  for (let s of SOGLIE) {
    let px = map(s, inizio, fine, x, x + larghezza);

    stroke(COL_BG);
    strokeWeight(2);
    line(px, y, px, y + altezza + 5);
    noStroke();

    fill(COL_TESTI_2);
    text(s + '°', px, y + altezza + 8);
  }

  // Etichette estreme.
  textAlign(LEFT, TOP);
  text(inizio + '°', x, y + altezza + 8);
  textAlign(RIGHT, TOP);
  text(fine + '°', x + larghezza, y + altezza + 8);

  textAlign(LEFT, TOP);
  fill(COL_TESTI);
  textSize(13);
  text('Temperatura media del bacino', x, y - 22);
}

// ─────────────────────────────────────────────────────────────
//  4. Interazione: hover
// ─────────────────────────────────────────────────────────────
function aggiornaFiumeSottoCursore() {
  hovered = null;

  // Il puntatore deve trovarsi dentro l'area del grafico, non sopra il titolo o la legenda.
  if (mouseY < marginTop || mouseY > height - marginBottom) return;

  for (let r of rivers) {
    // Verifica se il puntatore si trova dentro questa barra.
    if (
      mouseX >= r.x &&
      mouseX <= r.x + r.w &&
      mouseY >= r.yTop &&
      mouseY <= r.yTop + r.h
    ) {
      hovered = r;
      return;   // una sola barra alla volta: inutile continuare a cercare
    }
  }
}

// Etichetta ancorata al cursore: sigue sempre il mouse.
function disegnaTooltip() {
  if (!hovered) return;

  let righe = [
    hovered.nome,
    hovered.continente,
    'min ' + hovered.min + '°   max ' + hovered.max + '°',
    'media ' + hovered.media.toFixed(1) + '°'
  ];

  textSize(13);
  let padding = 10;
  let larghezza = 0;

  for (let r of righe) {
    larghezza = max(larghezza, textWidth(r));
  }
  larghezza += padding * 2;

  let altezza = 18 * righe.length + padding * 2 - 4;

  // Offset dal puntatore, che si ribalta se l'etichetta uscirebbe dalla finestra.
  let x = mouseX + 16;
  let y = mouseY + 16;
  if (x + larghezza > width - 8) x = mouseX - larghezza - 16;
  if (y + altezza > height - 8) y = mouseY - altezza - 16;

  noStroke();
  fill(8, 18, 42, 235);
  rect(x, y, larghezza, altezza, 6);

  stroke(hovered.colore);
  strokeWeight(2);
  noFill();
  rect(x, y, larghezza, altezza, 6);
  noStroke();

  textAlign(LEFT, TOP);
  for (let i = 0; i < righe.length; i++) {
    fill(COL_TESTI);
    textStyle(i === 0 ? BOLD : NORMAL);
    text(righe[i], x + padding, y + padding + i * 18);
  }
  textStyle(NORMAL);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
