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

const TITOLO = "AI: usage and impact on professional";
const SOTTOTITOLO = "The three hourglasses show how AI is used by workers and how it affects them. " +
                    "Hover over each hourglass to see which job positions were studied.";

// geometria (calcolata da calcolaMisure in base alla finestra)
let W, TOP, BASSO, MID, X0, PASSO, S, R;

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
  S = windowWidth / 1422;                     // fattore di scala
  TOP = windowHeight * 0.30;                  // fascia alta libera per titolo e legenda
  BASSO = windowHeight * 0.74;
  MID = (TOP + BASSO) / 2;
  W = min(windowWidth * 0.21, (BASSO - TOP) * 0.55);   // clessidre più piccole
  X0 = (windowWidth - 3 * W) / 4;             // 4 margini uguali
  PASSO = W + X0;
  R = 3.6 * max(S, 0.6);                        // raggio unico dei pallini
}

// ---------- COSTRUZIONE CLESSIDRE ----------
function creaClessidre() {
  calcolaMisure();
  clessidre = [];
  randomSeed(1);
  for (let i = 0; i < AREE.length; i++) {
    let x = X0 + i * PASSO;
    let membri = lavoratori.filter(l => l.area === AREE[i].csv);
    let c = { x: x, cx: x + W / 2, nome: AREE[i].nome, pallini: [], ruoli: [] };

    // ruoli unici, in ordine alfabetico
    for (let m of membri) if (!c.ruoli.includes(m.ruolo)) c.ruoli.push(m.ruolo);
    c.ruoli.sort();

    // valori validi di ogni metà, in ordine crescente
    let usi  = membri.filter(m => !isNaN(m.uso)).map(m => m.uso).sort((a, b) => a - b);
    let risp = membri.filter(m => !isNaN(m.risp)).map(m => m.risp).sort((a, b) => a - b);

    // prima i posti disponibili, poi i colori
    let postiAlto  = postiDisponibili(c, true,  usi.length);
    let postiBasso = postiDisponibili(c, false, risp.length);

    for (let k = 0; k < usi.length && k < postiAlto.length; k++)
      c.pallini.push({ x: postiAlto[k].x, y: postiAlto[k].y, col: COL_USO[fascia(usi[k], 2, 4)] });

    for (let k = 0; k < risp.length && k < postiBasso.length; k++)
      c.pallini.push({ x: postiBasso[k].x, y: postiBasso[k].y, col: COL_RISP[fascia(risp[k], 1, 2)] });

    clessidre.push(c);
  }
}

function fascia(v, s1, s2) {
  if (v < s1) return 0;
  if (v <= s2) return 1;
  return 2;
}

// Elenco dei posti liberi dentro una metà del vetro.
// I posti si raccolgono verso l'estremità lontana dal collo (come la sabbia):
// in alto si parte dall'alto e si scende, in basso si parte dal fondo e si sale.
// A parità di riga si va dall'esterno verso il centro.
// La ricerca si ferma appena ha trovato "quanti" posti.
function postiDisponibili(c, inAlto, quanti) {
  let met = (BASSO - TOP) / 2;
  let posti = [];
  let passoY = R * 1.6;      // distanza verticale tra le righe di pallini
  let passoX = R * 1.6;      // distanza orizzontale tra i pallini

  if (inAlto) {
    for (let y = MID - met * 0.92; y <= MID - met * 0.14; y += passoY) {
      let hw = mezzaLarghezza(y) - R - 4;
      if (hw < 0) continue;
      for (let x = c.cx + hw; x >= c.cx - hw; x -= passoX) {
        if (quanti && posti.length >= quanti) return posti;
        if (libero(c, x, y, posti)) posti.push({ x: x, y: y });
      }
    }
  } else {
    for (let y = BASSO - met * 0.06; y >= MID + met * 0.14; y -= passoY) {
      let hw = mezzaLarghezza(y) - R - 4;
      if (hw < 0) continue;
      for (let x = c.cx - hw; x <= c.cx + hw; x += passoX) {
        if (quanti && posti.length >= quanti) return posti;
        if (libero(c, x, y, posti)) posti.push({ x: x, y: y });
      }
    }
  }
  return posti;
}

// il posto è libero se non tocca il vetro né i pallini già messi
function libero(c, x, y, posti) {
  let ok = c.pallini.every(p => dist(p.x, p.y, x, y) > 2 * R + 3);
  if (ok) ok = posti.every(p => dist(p.x, p.y, x, y) > 2 * R + 3);
  return ok;
}

// ---------- FORMA ----------
// distanza dal centro al bordo del vetro all'altezza y.
// Collo sottile, raccordo curvo, bulbo tondo, calotta arrotondata.
function mezzaLarghezza(y) {
  let met = (BASSO - TOP) / 2;
  let u = constrain(abs(y - MID) / met, 0, 1);   // 0 = collo, 1 = estremità
  let maxW = W / 2;
  let collo = W * 0.03;                          // metà larghezza del collo
  let punto = 0.72;                              // altezza del punto più largo
  if (u <= punto) {
    let s = u / punto;
    return collo + (maxW - collo) * pow(sin(s * HALF_PI), 1.5);
  }
  let s = (u - punto) / (1 - punto);
  return maxW * pow(cos(s * HALF_PI), 0.5);      // calotta tonda
}

// ---------- DISEGNO ----------
function draw() {
  background("#132149");
  trovaSopra();
  testi();
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

function testi() {
  noStroke(); fill(255); textAlign(LEFT, TOP);
  textSize(52 * S); text(TITOLO, windowWidth * 0.07, windowHeight * 0.05);
  textSize(15 * S); fill(190, 205, 235);
  text(SOTTOTITOLO, windowWidth * 0.07, windowHeight * 0.05 + 68 * S, windowWidth * 0.5, 80 * S);
}

function legenda() {
  let xc = windowWidth * 0.78;
  let y1 = windowHeight * 0.05;
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
    circle(p.x, p.y, R * 2);
  }

  fill(255, alpha); textSize(17 * S); textAlign(CENTER, TOP);
  text(c.nome, c.cx, BASSO + 22 * S);
}

// pannello in basso con tutti i ruoli, sempre dentro la finestra
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
  text(c.ruoli.join("  ·  "), x + 15, y + 12 + 22 * S, w - 30, h - 20 - 22 * S);
}
