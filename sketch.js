//variabili
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
const COLORI_CLASSI = [
  '#6a9fd8',   
  '#f2c879',   
  '#f08a6c',   
  '#c2456f'    
];

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

  //funzione di confronto per ordine fiumi: dal più freddo al più caldo
  rivers.sort((a, b) => a.media - b.media);

  console.log('fiumi caricati:', rivers.length); //per controllare che siano 100
}

function draw() {
  background(COL_BG);
  
  //area di lavoro
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
  text('Temperatures of the World\'s Rivers', margin, 34);

  textSize(15);
  textStyle(NORMAL);
  fill(COL_TESTI_2);
  text('Each bar spans a river\'s minimum to maximum temperature. Color shows the average; rivers are sorted from coldest to warmest.', margin, 78);
}

//map() per trasforma i dati in dimensioni visive (la temperatura diventa la coordinata Y).
function tempToY(t, areaY, areaH) {
  return map(t, TEMP_MIN, TEMP_MAX, areaY + areaH, areaY);
}

//posizione, altezza e colore di ogni barra 
function calcolaBarre(areaX, areaY, areaW, areaH) {
  let numberOfGutters = rivers.length - 1;
  let barsWidth = areaW - numberOfGutters * gutter;
  let barWidth = barsWidth / rivers.length;

  let xPos = areaX;

  for (let i = 0; i < rivers.length; i++) {
    let r = rivers[i];
    r.x = xPos;
    r.w = barWidth;
    r.yTop = tempToY(r.max, areaY, areaH);      //la barra parte dalla temperatura massima
    r.yBottom = tempToY(r.min, areaY, areaH);   //finisce alla minima
    r.h = r.yBottom - r.yTop;
    r.colore = colorePerMedia(r.media);
    xPos += barWidth + gutter;
  }
}

//associare una temperatura media a una delle 4 classi di colore.
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

  if (hovered) {
    noFill();
    stroke(COL_HOVER);
    strokeWeight(2);
    rect(hovered.x, hovered.yTop, hovered.w, hovered.h);
    noStroke();
  }
}

//linee laterali di riferimento
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

//legenda
function disegnaLegenda(areaX, areaY, areaW, areaH) {
  let larghezza = min(420, areaW * 0.5);
  let altezza = 14;
  let x = areaX;
  let y = areaY + areaH + 46;
  let inizio = -20;
  let fine = 30;

  for (let i = 0; i < larghezza; i++) {
    let t = map(i, 0, larghezza, inizio, fine);
    stroke(colorePerMedia(t));
    line(x + i, y, x + i, y + altezza);
  }
  noStroke();

  //tacche e valori
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

  //etichette
  textAlign(LEFT, TOP);
  text(inizio + '°', x, y + altezza + 8);
  textAlign(RIGHT, TOP);
  text(fine + '°', x + larghezza, y + altezza + 8);

  textAlign(LEFT, TOP);
  fill(COL_TESTI);
  textSize(13);
  text('Average temperature', x, y - 22);
}

//hover
function aggiornaFiumeSottoCursore() {
  hovered = null;

  if (mouseY < marginTop || mouseY > height - marginBottom) return;
   for (let r of rivers) {
    if ( //verifica che il puntatore sia dentro la barra
      mouseX >= r.x &&
      mouseX <= r.x + r.w &&
      mouseY >= r.yTop &&
      mouseY <= r.yTop + r.h
    ) {
      hovered = r;
      return;  
    }
  }
}

//etichetta ancorata al cursore
function disegnaTooltip() {
  if (!hovered) return;

  let righe = [
    hovered.nome,
    hovered.continente,
    'min ' + hovered.min + '°   max ' + hovered.max + '°',
    'avg ' + hovered.media.toFixed(1) + '°'
  ];

  textSize(13);
  let padding = 10;
  let larghezza = 0;

  for (let r of righe) {
    larghezza = max(larghezza, textWidth(r));
  }
  larghezza += padding * 2;

  let altezza = 18 * righe.length + padding * 2 - 4;

  //etichetta sotto il puntatore, centrata
  let x = constrain(mouseX - larghezza / 2, margin, width - margin - larghezza);
  let y = mouseY + 24;

  noStroke();
  fill(8, 18, 42, 235);
  rect(x, y, larghezza, altezza, 6);

  fill(COL_TESTI);
  textAlign(LEFT, TOP);
  for (let i = 0; i < righe.length; i++) {
    textStyle(i === 0 ? BOLD : NORMAL);
    text(righe[i], x + padding, y + padding + i * 18);
  }
  textStyle(NORMAL);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}