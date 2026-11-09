// Acha os casos de F2L que faltam na lista e procura o algoritmo mais curto
// (só com R, U e F) para cada um.
// Rodar: node testes/buscar-f2l.js
'use strict';
const C = require('../js/cubo.js');
const D = require('../js/conteudo.js');

// Peças acompanhadas: o par da frente-direita e tudo que R e F mexem fora da camada de cima.
const CASAS = [
  [1, -1, 1], [1, 0, 1], // par FR (canto e aresta)
  [0, -1, 1], [1, -1, 0], // arestas DF e DR da cruz
  [1, -1, -1], [1, 0, -1], // par BR
  [-1, -1, 1], [-1, 0, 1], // par FL
];
// adesivo de referência: o de baixo (D) nos cantos, o da frente/trás nas arestas do meio, o de baixo na cruz
const REF = [[0, -1, 0], [0, 0, 1], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 0, -1], [0, -1, 0], [0, 0, 1]];

const MOVS = ['R', "R'", 'R2', 'U', "U'", 'U2', 'F', "F'", 'F2'].map(t => ({ t, l: C.ler(t)[0] }));

function giraPeca(pc, l) {
  if (!l.camadas.includes(pc[0][l.eixo])) return pc;
  return [rot(pc[0], l), rot(pc[1], l)];
}
function rot(v, l) {
  let q = ((l.quartos % 4) + 4) % 4, r = v;
  while (q--) { const [x, y, z] = r; r = l.eixo === 0 ? [x, -z, y] : l.eixo === 1 ? [z, y, -x] : [-y, x, z]; }
  return r;
}
const cod = pc => pc[0].join(',') + '/' + pc[1].join(',');
const inicial = () => CASAS.map((c, i) => [c.slice(), REF[i].slice()]);
const aplicar = (est, alg) => { for (const l of C.ler(alg)) est = est.map(pc => giraPeca(pc, l)); return est; };

// chave do caso: onde estão o canto e a aresta do par, sem contar giros de U
function chave(est) {
  const op = [];
  let e = est;
  for (let a = 0; a < 4; a++) {
    op.push(cod(e[0]) + '|' + cod(e[1]));
    e = aplicar(e, 'U');
  }
  return op.sort()[0];
}
const restoOk = est => est.slice(2).every((pc, i) => cod(pc) === cod([CASAS[i + 2], REF[i + 2]]));

// todos os casos possíveis: canto em 4 lugares de cima + slot, 3 jeitos; aresta em 4 + slot, 2 jeitos
const cantoLugares = [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1], [1, -1, 1]];
const arestaLugares = [[0, 1, 1], [-1, 1, 0], [0, 1, -1], [1, 1, 0], [1, 0, 1]];
const normaisDe = p => [[p[0], 0, 0], [0, p[1], 0], [0, 0, p[2]]].filter(n => n.some(Boolean));
const todos = new Map();
for (const cp of cantoLugares) for (const cn of normaisDe(cp)) for (const ap of arestaLugares) for (const an of normaisDe(ap)) {
  const est = inicial();
  est[0] = [cp, cn]; est[1] = [ap, an];
  const k = chave(est);
  if (k === chave(inicial())) continue;
  if (!todos.has(k)) todos.set(k, est);
}
console.log('casos possíveis: ' + todos.size);

const naLista = new Map();
D.f2l.forEach((alg, i) => {
  const est = aplicar(inicial(), C.texto(C.inverter(alg)));
  if (!restoOk(est)) console.log('  #' + (i + 1) + ' mexe em outras peças');
  const k = chave(est);
  if (naLista.has(k)) console.log('  #' + (i + 1) + ' repete o #' + naLista.get(k));
  else naLista.set(k, i + 1);
});
const faltam = [...todos.keys()].filter(k => !naLista.has(k));
console.log('faltam: ' + faltam.length);

// tabelas de distância para pares de peças (para podar a busca)
function tabela(i, j) {
  const t = new Map();
  let fila = [[inicial()[i], inicial()[j]]];
  t.set(cod(fila[0][0]) + '|' + cod(fila[0][1]), 0);
  for (let d = 1; fila.length; d++) {
    const prox = [];
    for (const [a, b] of fila) for (const m of MOVS) {
      const na = giraPeca(a, m.l), nb = giraPeca(b, m.l);
      const k = cod(na) + '|' + cod(nb);
      if (!t.has(k)) { t.set(k, d); prox.push([na, nb]); }
    }
    fila = prox;
  }
  return t;
}
const TABS = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 3], [1, 2]].map(([i, j]) => ({ i, j, t: tabela(i, j) }));
const h = est => Math.max(...TABS.map(({ i, j, t }) => t.get(cod(est[i]) + '|' + cod(est[j]))));

function buscar(inicio, maxProf, quantos) {
  const achados = [];
  const caminho = [];
  function dfs(est, g, limite, ultima) {
    const hh = h(est);
    if (hh === 0) { achados.push(caminho.join(' ')); return achados.length >= quantos; }
    if (g + hh > limite) return false;
    for (const m of MOVS) {
      if (m.t[0] === ultima) continue;
      caminho.push(m.t);
      if (dfs(est.map(pc => giraPeca(pc, m.l)), g + 1, limite, m.t[0])) return true;
      caminho.pop();
    }
    return false;
  }
  for (let lim = 1; lim <= maxProf && !achados.length; lim++) dfs(inicio, 0, lim, '');
  // continua mais um nível para ter opções
  return achados;
}

for (const k of faltam) {
  const est = todos.get(k);
  const desc = 'canto ' + cod(est[0]) + '  aresta ' + cod(est[1]);
  const t0 = Date.now();
  const algs = buscar(est, 13, 12);
  console.log('\n' + desc + '  (' + (Date.now() - t0) + ' ms)');
  for (const a of algs) {
    // confere no cubo completo
    const s = C.aplicar(C.novo(), C.inverter(a));
    console.log('   ' + a + '   [' + C.ler(a).length + ' movs]');
    void s;
  }
}
