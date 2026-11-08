let righe = [];          // righe grezze del CSV
let lavoratori = [];     // un oggetto per lavoratore
let clessidre = [];      // 3 clessidre con i loro pallini
let sopra = -1;          // clessidra sotto il mouse (-1 = nessuna)

// nomi come nel CSV + etichetta mostrata
const AREE = [
  { csv: "Tech, sviluppo & data",                          nome: "Tech, Sviluppo & Data" },
  { csv: "Marketing, Comunicazione & Content Creation",     nome: "Marketing, Comunicazione\n& Content Creation" },
  { csv: "Customer Support, Operazioni & Amministrazione",  nome: "Customer Support, Operazioni\n& Amministrazione" }
];

const COL_USO  = ["#ffffff", "#f0e6a0", "#f7e03c"]; // <2h, 2-4h, >4h
const COL_RISP = ["#e8c94f", "#eeb26a", "#ff8a1f"]; // <1h, 1-2h, >2h

// geometria (calcolata da calcolaMisure in base alla finestra)
let W, TOP, BASSO, MID, X0, PASSO, S;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  righe = await loadStrings("assets/dati.csv");
  leggiDati();
  creaClessidre();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  creaClessidre();
}

// ---------- DATI ----------
function leggiDati() {
  // riga 0 = titolo, riga 1 = intestazione, dati dalla riga 2
  for (let i = 2; i < righe.length; i++) {
    let c = righe[i].split(";");
    if (c.length < 8) continue;
    lavoratori.push({
      ruolo: c[1].trim(),
      uso:   parseFloat(c[3].replace(",", ".")),  // può essere NaN
      risp:  parseFloat(c[6].replace(",", ".")),
      area:  c[7].trim()
    });
  }
}

function calcolaMisure() {
  S = windowWidth / 1422;                 // fattore di scala per testi e pallini
  W = windowWidth * 0.26;                 // larghezza clessidra
  X0 = windowWidth * 0.07;
  PASSO = (windowWidth - 2 * X0 - W) / 2; // distanza tra le clessidre
  TOP = windowHeight * 0.24;
  BASSO = windowHeight * 0.72;
  MID = (TOP + BASSO) / 2;
}

function creaClessidre() {
  calcolaMisure();
  clessidre = [];
  randomSeed(1);
  for (let i = 0; i < AREE.length; i++) {
    let x = X0 + i * PASSO;
    let membri = lavoratori.filter(l => l.area === AREE[i].csv);
    let c = { x: x, cx: x + W / 2, nome: AREE[i].nome, pallini: [], ruoli: [] };

    for (let m of membri) if (!c.ruoli.includes(m.ruolo)) c.ruoli.push(m.ruolo);
    c.ruoli.sort();

    for (let m of membri) {
      if (!isNaN(m.uso))  nuovoPallino(c, m.uso,  COL_USO[fascia(m.uso, 2, 4)], true);
      if (!isNaN(m.risp)) nuovoPallino(c, m.risp, COL_RISP[fascia(m.risp, 1, 2)], false);
    }
    clessidre.push(c);
  }
}

function fascia(v, s1, s2) {
  if (v < s1) return 0;
  if (v <= s2) return 1;
  return 2;
}

// cerca un punto libero dentro il vetro; se non lo trova, il pallino viene saltato
function nuovoPallino(c, valore, colore, inAlto) {
  let r = (2.5 + valore * 0.25) * max(S, 0.6);
  let met = (BASSO - TOP) / 2;
  for (let t = 0; t < 300; t++) {
    let y = inAlto
      ? random(TOP + met * 0.30, MID - met * 0.10)
      : random(MID + met * 0.55, BASSO - met * 0.06);
    let hw = mezzaLarghezza(y) - r - 4;
    if (hw < 0) continue;
    let x = c.cx + random(-hw, hw);
    if (c.pallini.every(p => dist(p.x, p.y, x, y) > p.r + r + 1)) {
      c.pallini.push({ x: x, y: y, r: r, col: colore });
      return;
    }
  }
}

// ---------- FORMA SINUOSA ----------
// distanza dal centro al bordo del vetro all'altezza y.
// Collo sottile, bulbo tondo a goccia, calotta arrotondata.
function mezzaLarghezza(y) {
  let met = (BASSO - TOP) / 2;
  let u = constrain(abs(y - MID) / met, 0, 1);   // 0 = collo, 1 = estremità
  let maxW = W / 2;
  let collo = W * 0.025;
  let punto = 0.68;                               // dove il bulbo è più largo
  if (u <= punto) {
    let s = u / punto;
    // potenza > 1: la curva parte tangente al collo, senza spigolo
    return collo + (maxW - collo) * pow(sin(s * HALF_PI), 1.7);
  }
  let s = (u - punto) / (1 - punto);
  return maxW * pow(cos(s * HALF_PI), 0.55);      // calotta tonda
}

// ---------- DISEGNO ----------
function draw() {
  background("#132149");
  trovaSopra();
  titolo();
  legenda();
  for (let i = 0; i < clessidre.length; i++) disegnaClessidra(clessidre[i], i);
  if (sopra >= 0) pannelloRuoli(clessidre[sopra]);
}

// il mouse è "sopra" se è sulla clessidra o sulla sua etichetta
function trovaSopra() {
  sopra = -1;
  for (let i = 0; i < clessidre.length; i++) {
    let x = clessidre[i].x;
    if (mouseX > x && mouseX < x + W && mouseY > TOP - 10 && mouseY < BASSO + 70 * S) sopra = i;
  }
}

function titolo() {
  noStroke(); fill(255); textAlign(LEFT, TOP);
  textSize(52 * S); text("AI", windowWidth * 0.07, windowHeight * 0.06);
  textSize(34 * S); text("usage and impact on professional", windowWidth * 0.07, windowHeight * 0.06 + 55 * S);
}

function legenda() {
  let xc = windowWidth * 0.78;            // x dei cerchi
  let y1 = windowHeight * 0.06;
  let y2 = y1 + 106 * S;
  let passo = 21 * S;
  textSize(17 * S); noStroke(); fill(255);
  textAlign(RIGHT, CENTER);
  text("AI usage per day", xc - 28 * S, y1 + passo);
  text("Time saved per day", xc - 18 * S, y2 + passo);
  let etU = ["<2h", "2-4h", ">4h"], etR = ["<1h", "1-2h", ">2h"];
  textAlign(LEFT, CENTER);
  for (let i = 0; i < 3; i++) {
    fill(COL_USO[i]);  circle(xc, y1 + i * passo, 18 * S);
    fill(255);         text(etU[i], xc + 27 * S, y1 + i * passo);
    fill(COL_RISP[i]); circle(xc, y2 + i * passo, 18 * S);
    fill(255);         text(etR[i], xc + 27 * S, y2 + i * passo);
  }
}

function disegnaClessidra(c, i) {
  // le altre clessidre si attenuano quando una è sotto il mouse
  let alpha = (sopra === -1 || sopra === i) ? 255 : 60;

  // contorno chiuso: lato destro dall'alto al basso, poi lato sinistro dal basso all'alto
  noFill(); stroke(255, alpha); strokeWeight(3 * max(S, 0.6));
  beginShape();
  for (let y = TOP; y <= BASSO; y += 3) vertex(c.cx + mezzaLarghezza(y), y);
  for (let y = BASSO; y >= TOP; y -= 3) vertex(c.cx - mezzaLarghezza(y), y);
  endShape(CLOSE);

  noStroke();
  for (let p of c.pallini) {
    let col = color(p.col);
    col.setAlpha(alpha);
    fill(col);
    circle(p.x, p.y, p.r * 2);
  }

  fill(255, alpha); textSize(17 * S); textAlign(CENTER, TOP);
  text(c.nome, c.cx, BASSO + 22 * S);
}

// pannello fisso in basso con tutti i ruoli, sempre dentro la finestra
function pannelloRuoli(c) {
  let x = X0;
  let w = windowWidth - 2 * X0;
  let y = BASSO + 85 * S;
  let h = windowHeight - y - 15;
  if (h < 60) { h = 60; y = windowHeight - h - 5; }

  fill(10, 20, 50); stroke(255, 120); strokeWeight(1);
  rect(x, y, w, h, 8);

  noStroke(); fill(255); textAlign(LEFT, TOP);
  textSize(15 * S); textStyle(BOLD);
  text(c.nome.replace("\n", " ") + " – " + c.ruoli.length + " ruoli", x + 15, y + 10);

  textStyle(NORMAL); textSize(13 * S); fill(210, 220, 245);
  // con 4 argomenti il testo va a capo dentro il rettangolo
  text(c.ruoli.join("  ·  "), x + 15, y + 12 + 22 * S, w - 30, h - 20 - 22 * S);
}
