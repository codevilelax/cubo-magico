// Confere todos os algoritmos do app: cada um precisa resolver o caso que
// promete sem estragar o resto do cubo.
// Rodar: node testes/verificar.js
'use strict';
const C = require('../js/cubo.js');
const D = require('../js/conteudo.js');

let falhas = 0;
const falha = msg => { falhas++; console.log('  ERRO: ' + msg); };

const ROTACOES = [];
for (const a of ['', 'x', 'x2', "x'", 'z', "z'"]) for (const b of ['', 'y', 'y2', "y'"]) ROTACOES.push((a + ' ' + b).trim());

const centro = (c, f) => C.adesivo(c, f, 1, 1).cor;
const cor = (c, f, l, k) => C.adesivo(c, f, l, k).cor;

function normalizar(cubo) {
  for (const r of ROTACOES) {
    const c = C.aplicar(C.copiar(cubo), r);
    if (centro(c, 'U') === 'U' && centro(c, 'F') === 'F') return c;
  }
  throw new Error('sem orientação');
}

function confere(c, lista) {
  return lista.every(([f, l, k]) => cor(c, f, l, k) === centro(c, f));
}
const CRUZ = [['D', 0, 1], ['D', 1, 0], ['D', 1, 2], ['D', 2, 1], ['F', 2, 1], ['R', 2, 1], ['B', 2, 1], ['L', 2, 1]];
const SLOTS = {
  FR: [['D', 0, 2], ['F', 1, 2], ['F', 2, 2], ['R', 1, 0], ['R', 2, 0]],
  FL: [['D', 0, 0], ['F', 1, 0], ['F', 2, 0], ['L', 1, 2], ['L', 2, 2]],
  BR: [['D', 2, 2], ['R', 1, 2], ['R', 2, 2], ['B', 1, 0], ['B', 2, 0]],
  BL: [['D', 2, 0], ['L', 1, 0], ['L', 2, 0], ['B', 1, 2], ['B', 2, 2]],
};
const f2lOk = c => confere(c, CRUZ) && Object.values(SLOTS).every(s => confere(c, s));
const topoAmarelo = c => [0, 1, 2].every(l => [0, 1, 2].every(k => cor(c, 'U', l, k) === centro(c, 'U')));
const resolvido = c => 'URFDLB'.split('').every(f => [0, 1, 2].every(l => [0, 1, 2].every(k => cor(c, f, l, k) === centro(c, f))));

function inicio(caso) {
  const c = C.novo();
  if (caso.base) C.aplicar(c, caso.base);
  return C.aplicar(c, C.inverter(caso.alg));
}

function confereQueResolve(caso, meta) {
  const s = inicio(caso);
  const fim = C.aplicar(C.copiar(s), caso.alg);
  const alvo = C.novo();
  if (caso.base) C.aplicar(alvo, caso.base);
  if (C.letras(normalizar(fim)) !== C.letras(normalizar(alvo))) falha(meta + ': não chega no estado esperado');
  return s;
}

const peca = (c, casa) => c.pecas.find(p => p.p && p.casa[0] === casa[0] && p.casa[1] === casa[1] && p.casa[2] === casa[2]);
const nomePos = p => (p[1] === 1 ? 'U' : p[1] === -1 ? 'D' : '') + (p[2] === 1 ? 'F' : p[2] === -1 ? 'B' : '') + (p[0] === 1 ? 'R' : p[0] === -1 ? 'L' : '');
const ondeEsta = (pc, corAdesivo) => C.faceDaNormal(pc.adesivos.find(a => a.cor === corAdesivo).n);

// ---------- Método por camadas ----------
console.log('\n== Método por camadas ==');
for (const passo of D.camadas) {
  for (const caso of passo.casos) {
    const meta = passo.titulo + ' / ' + caso.nome;
    const s = confereQueResolve(caso, meta);
    let info = '';
    if (passo.id === 'cruz') {
      const outras = [['D', 1, 0], ['D', 1, 2], ['D', 2, 1], ['L', 2, 1], ['R', 2, 1], ['B', 2, 1]];
      if (!confere(s, outras)) falha(meta + ': mexe nas outras arestas da cruz');
      const pc = peca(s, [0, -1, 1]);
      info = 'aresta branco-verde em ' + nomePos(pc.p) + ', branco virado para ' + ondeEsta(pc, 'D') + ', verde para ' + ondeEsta(pc, 'F');
    }
    if (passo.id === 'cantos-brancos') {
      if (!confere(s, CRUZ)) falha(meta + ': estraga a cruz');
      const pc = peca(s, [1, -1, 1]);
      info = 'canto em ' + nomePos(pc.p) + ', branco para ' + ondeEsta(pc, 'D');
    }
    if (passo.id === 'segunda-camada') {
      if (!confere(s, CRUZ) || !['BR', 'BL'].every(k => confere(s, SLOTS[k]))) falha(meta + ': estraga a primeira camada');
      const alvo = caso.nome.includes('direita') ? [1, 0, 1] : [-1, 0, 1];
      const pc = peca(s, alvo);
      info = 'aresta do meio em ' + nomePos(pc.p) + ', verde para ' + ondeEsta(pc, 'F') + '; cantos de baixo ok: ' + confere(s, [['D', 0, 0], ['D', 0, 2], ['D', 2, 0], ['D', 2, 2]]);
    }
    if (['cruz-amarela', 'arestas-amarelas', 'cantos-lugar', 'virar-cantos'].includes(passo.id)) {
      if (passo.id !== 'virar-cantos' && !f2lOk(s)) falha(meta + ': começa com as duas primeiras camadas erradas');
      const arestas = { UB: [0, 1, -1], UR: [1, 1, 0], UF: [0, 1, 1], UL: [-1, 1, 0] };
      if (passo.id === 'cruz-amarela') {
        info = 'arestas com amarelo para cima: ' + Object.entries(arestas).filter(([, p]) => C.adesivoEm(s, 'U', p).cor === 'U').map(([n]) => n).join(' ');
      }
      if (passo.id === 'arestas-amarelas') {
        info = 'arestas certas: ' + Object.entries(arestas).filter(([n, p]) => {
          const pc = s.pecas.find(q => q.p.join() === p.join());
          return pc.casa.join() === p.join();
        }).map(([n]) => n).join(' ');
        const cruz = Object.values(arestas).every(p => C.adesivoEm(s, 'U', p).cor === 'U');
        if (!cruz) falha(meta + ': começa sem a cruz amarela');
      }
      if (passo.id === 'cantos-lugar' || passo.id === 'virar-cantos') {
        const cantos = { UFR: [1, 1, 1], UFL: [-1, 1, 1], UBL: [-1, 1, -1], UBR: [1, 1, -1] };
        const noLugar = Object.entries(cantos).filter(([, p]) => s.pecas.find(q => q.p.join() === p.join()).casa.join() === p.join()).map(([n]) => n);
        const virados = Object.entries(cantos).filter(([, p]) => C.adesivoEm(s, 'U', p).cor !== 'U').map(([n]) => n);
        info = 'cantos no lugar: ' + noLugar.join(' ') + ' | virados: ' + virados.join(' ');
        if (passo.id === 'virar-cantos' && !f2lOk(s)) falha(meta + ': F2L errado no começo');
      }
    }
    console.log('  ok  ' + meta + ' -> ' + info);
  }
}

// ---------- F2L ----------
console.log('\n== F2L ==');
function chaveF2l(s) {
  const op = [];
  for (let a = 0; a < 4; a++) {
    const c = C.aplicar(C.copiar(s), repetirU(a));
    const canto = peca(c, [1, -1, 1]);
    const aresta = peca(c, [1, 0, 1]);
    op.push(nomePos(canto.p) + ':' + ondeEsta(canto, 'D') + '|' + nomePos(aresta.p) + ':' + ondeEsta(aresta, 'F'));
  }
  return op.sort()[0];
}
function repetirU(a) { return ['', 'U', 'U2', "U'"][a]; }
function grupoF2l(s) {
  const canto = peca(s, [1, -1, 1]);
  const aresta = peca(s, [1, 0, 1]);
  const cantoNoSlot = canto.p.join() === '1,-1,1';
  const arestaNoSlot = aresta.p.join() === '1,0,1';
  if (cantoNoSlot && arestaNoSlot) return 'os dois no lugar';
  if (cantoNoSlot) return 'canto no lugar';
  if (arestaNoSlot) return 'aresta no lugar';
  return ondeEsta(canto, 'D') === 'U' ? 'em cima, branco para cima' : 'em cima, branco para o lado';
}
const f2lVistos = new Map();
D.f2l.forEach((alg, i) => {
  const s = C.aplicar(C.novo(), C.inverter(alg));
  const meta = 'F2L #' + (i + 1) + ' ' + alg;
  if (!confere(s, CRUZ) || !['FL', 'BL', 'BR'].every(k => confere(s, SLOTS[k]))) { falha(meta + ': estraga a cruz ou outro par'); return; }
  if (confere(s, SLOTS.FR)) { falha(meta + ': não mexe no par'); return; }
  const k = chaveF2l(s);
  if (f2lVistos.has(k)) falha(meta + ': mesmo caso que #' + f2lVistos.get(k));
  else f2lVistos.set(k, i + 1);
  console.log('  ok  ' + meta + '  [' + grupoF2l(s) + ']');
});
console.log('  casos diferentes: ' + f2lVistos.size + ' de 41');

// a lista completa dos 41 casos é conferida em testes/buscar-f2l.js

// ---------- OLL ----------
console.log('\n== OLL ==');
function desenhoOll(s) {
  const y = (f, l, k) => (cor(s, f, l, k) === 'U' ? '#' : '.');
  const t = (l, k) => y('U', l, k);
  const lin = [];
  lin.push('   ' + y('B', 0, 2) + y('B', 0, 1) + y('B', 0, 0));
  for (let l = 0; l < 3; l++) lin.push('  ' + y('L', 0, l) + t(l, 0) + t(l, 1) + t(l, 2) + y('R', 0, 2 - l));
  lin.push('   ' + y('F', 0, 0) + y('F', 0, 1) + y('F', 0, 2));
  return lin;
}
function chaveOll(s) {
  const op = [];
  for (let a = 0; a < 4; a++) {
    const c = C.aplicar(C.copiar(s), repetirU(a));
    let k = '';
    for (const [f, ls] of [['U', [0, 1, 2]], ['F', [0]], ['R', [0]], ['B', [0]], ['L', [0]]]) {
      for (const l of ls) for (let j = 0; j < 3; j++) k += cor(c, f, l, j) === 'U' ? '1' : '0';
    }
    op.push(k);
  }
  return op.sort()[0];
}
const ollVistos = new Map();
const arestasCima = s => [[0, 1], [1, 0], [1, 2], [2, 1]].filter(([l, k]) => cor(s, 'U', l, k) === 'U').length;
const cantosCima = s => [[0, 0], [0, 2], [2, 0], [2, 2]].filter(([l, k]) => cor(s, 'U', l, k) === 'U').length;
const desenhos = [];
for (const caso of D.oll) {
  const s = normalizar(C.aplicar(C.novo(), C.inverter(caso.alg)));
  const meta = caso.nome + ' (' + caso.grupo + ') ' + caso.alg;
  if (!f2lOk(s)) { falha(meta + ': estraga as duas primeiras camadas'); continue; }
  if (topoAmarelo(s)) { falha(meta + ': não mexe na orientação'); continue; }
  const k = chaveOll(s);
  if (ollVistos.has(k)) falha(meta + ': mesmo caso que OLL ' + ollVistos.get(k));
  else ollVistos.set(k, caso.numero);
  desenhos.push({ titulo: String(caso.numero).padStart(2) + ' ' + caso.grupo.slice(0, 11).padEnd(11) + ' a' + arestasCima(s) + 'c' + cantosCima(s), d: desenhoOll(s) });
}
console.log('  casos diferentes: ' + ollVistos.size + ' de 57');
for (let i = 0; i < desenhos.length; i += 6) {
  const g = desenhos.slice(i, i + 6);
  console.log('  ' + g.map(x => x.titulo.padEnd(21)).join(''));
  for (let l = 0; l < 5; l++) console.log('  ' + g.map(x => x.d[l].padEnd(21)).join(''));
}
console.log('\n  OLL em duas partes (arestas):');
for (const caso of D.oll2Arestas) {
  const s = normalizar(confereQueResolve(caso, 'OLL 2-look ' + caso.nome));
  console.log('    ' + caso.nome + ': arestas com amarelo para cima = ' + arestasCima(s) + ', F2L ok = ' + f2lOk(s));
  console.log(desenhoOll(s).map(l => '      ' + l).join('\n'));
}

// ---------- PLL ----------
console.log('\n== PLL ==');
function relativo(s) {
  // cores dos lados da camada de cima, trocadas pela face do centro com aquela cor
  const mapa = {};
  for (const f of 'URFDLB') mapa[centro(s, f)] = f;
  let k = '';
  for (const f of 'FRBL') for (let j = 0; j < 3; j++) k += mapa[cor(s, f, 0, j)];
  return k;
}
function chavePll(alg) {
  const op = [];
  for (let b = 0; b < 4; b++) {
    const base = C.aplicar(C.novo(), repetirU(b));
    const s = normalizar(C.aplicar(base, C.inverter(alg)));
    for (let a = 0; a < 4; a++) for (let r = 0; r < 4; r++) {
      const c = C.aplicar(C.copiar(s), repetirU(a) + ' ' + ['', 'y', 'y2', "y'"][r]);
      op.push(relativo(c));
    }
  }
  return op.sort()[0];
}
function movidas(s) {
  // quantos cantos e arestas da camada de cima estão fora do lugar
  const faceDaCor = {};
  for (const f of 'URFDLB') faceDaCor[centro(s, f)] = f;
  let cantos = 0, arestas = 0;
  for (const pc of s.pecas) {
    if (pc.p[1] !== 1 || pc.adesivos.length < 2) continue;
    const alvo = [0, 1, 0];
    for (const a of pc.adesivos) {
      const f = faceDaCor[a.cor];
      if (f === 'U') continue;
      const n = C.NORMAL[f];
      alvo[0] += n[0]; alvo[2] += n[2];
    }
    if (alvo.join() !== pc.p.join()) { if (pc.adesivos.length === 3) cantos++; else arestas++; }
  }
  return 'c' + cantos + 'e' + arestas;
}
const ESPERADO = { Aa: 'c3e0', Ab: 'c3e0', E: 'c4e0', Ua: 'c0e3', Ub: 'c0e3', H: 'c0e4', Z: 'c0e4', T: 'c2e2', F: 'c2e2', Ja: 'c2e2', Jb: 'c2e2', Ra: 'c2e2', Rb: 'c2e2', V: 'c2e2', Y: 'c2e2', Na: 'c2e2', Nb: 'c2e2', Ga: 'c3e3', Gb: 'c3e3', Gc: 'c3e3', Gd: 'c3e3' };
const pllVistos = new Map();
const pllChave = {};
for (const caso of D.pll) {
  const s = normalizar(C.aplicar(C.novo(), C.inverter(caso.alg)));
  const meta = caso.nome + ' ' + caso.alg;
  if (!f2lOk(s) || !topoAmarelo(s)) { falha(meta + ': estraga F2L ou a orientação'); continue; }
  const m = movidas(s);
  let aviso = '';
  if (m !== ESPERADO[caso.curto]) {
    const outros = [1, 2, 3].map(b => {
      const s2 = normalizar(C.aplicar(C.aplicar(C.novo(), repetirU(b)), C.inverter(caso.alg)));
      return repetirU(b) + '=' + movidas(s2);
    });
    aviso = '  <- esperado ' + ESPERADO[caso.curto] + ' (com AUF no fim: ' + outros.join(', ') + ')';
    falha(meta + ': peças movidas ' + m + aviso);
  }
  const k = chavePll(caso.alg);
  pllChave[caso.curto] = k;
  if (pllVistos.has(k)) falha(meta + ': mesmo caso que ' + pllVistos.get(k));
  else pllVistos.set(k, caso.curto);
  console.log('  ok  ' + caso.nome.padEnd(8) + m);
}
console.log('  casos diferentes: ' + pllVistos.size + ' de 21');
const algDe = n => D.pll.find(p => p.curto === n).alg;
for (const [a, b] of [['Aa', 'Ab'], ['Ua', 'Ub'], ['Ja', 'Jb'], ['Ra', 'Rb'], ['Na', 'Nb']]) {
  const espelho = chavePll(C.texto(C.espelhar(algDe(b))));
  if (espelho !== pllChave[a]) falha('espelho de ' + b + ' não é ' + a);
  else console.log('  ok  espelho de ' + b + ' = ' + a);
}
for (const g of ['Ga', 'Gb', 'Gc', 'Gd']) {
  const espelho = chavePll(C.texto(C.espelhar(algDe(g))));
  const nome = Object.keys(pllChave).find(n => pllChave[n] === espelho);
  console.log('  espelho de ' + g + ' = ' + nome);
}
const alternativas = { Ua: "R U' R U R U R U' R' U' R2", Ub: "R2 U R U R' U' R' U' R' U R'", Aa: "x L2 D2 L' U' L D2 L' U L' x'", Ja: "L' U' L F L' U' L U L F' L2 U L", T: "R U R' U' R' F R2 U' R' U' R U R' F'" };
for (const [n, alg] of Object.entries(alternativas)) {
  console.log('  ' + (chavePll(alg) === pllChave[n] ? 'ok ' : '?? ') + ' outro algoritmo do ' + n + ' dá o mesmo caso');
}
console.log('\n  PLL em duas partes:');
for (const caso of D.pll2Cantos) {
  const s = normalizar(confereQueResolve(caso, 'PLL 2-look ' + caso.nome));
  const farois = 'FRBL'.split('').filter(f => cor(s, f, 0, 0) === cor(s, f, 0, 2));
  console.log('    ' + caso.nome + ': ' + movidas(s) + ', faróis em: ' + (farois.join(' ') || 'nenhum lado'));
}

console.log('\n' + (falhas ? falhas + ' problema(s).' : 'Tudo certo.'));
process.exitCode = falhas ? 1 : 0;
