// Testa o "Meu cubo": leitura da pintura e as soluções guiadas.
// Rodar: node testes/resolver.js [quantidade]
'use strict';
const C = require('../js/cubo.js');
const R = require('../js/resolver.js');

const N = parseInt(process.argv[2] || '400', 10);
let falhas = 0;
const falha = msg => { falhas++; if (falhas < 15) console.log('  ERRO: ' + msg); };

// gerador com semente, para repetir o mesmo teste
let semente = 12345;
const rnd = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------- pintura ----------
console.log('== Pintura ==');
for (let i = 0; i < 200; i++) {
  const emb = C.embaralhamento(25, rnd);
  const cubo = C.aplicar(C.novo(), emb);
  const r = R.lerPintura(R.pinturaDoCubo(cubo));
  if (r.erro) { falha('pintura válida recusada: ' + r.erro + ' (' + emb + ')'); continue; }
  if (C.letras(r.cubo) !== C.letras(cubo)) falha('pintura lida diferente (' + emb + ')');
  // os eixos precisam bater para o desenho 3D
  const a = C.letras(C.aplicar(C.copiar(r.cubo), "R U F' L2 D")), b = C.letras(C.aplicar(C.copiar(cubo), "R U F' L2 D"));
  if (a !== b) falha('cubo lido se mexe diferente (' + emb + ')');
  for (let j = 0; j < r.cubo.pecas.length; j++) {
    if (r.cubo.pecas[j].adesivos.length === 1) continue; // centro só gira no lugar
    if (JSON.stringify(r.cubo.pecas[j].eixos) !== JSON.stringify(cubo.pecas[j].eixos)) { falha('eixos diferentes (' + emb + ')'); break; }
  }
}
console.log('  200 pinturas válidas lidas certo');

// pinturas impossíveis
const base = R.pinturaDoCubo(C.aplicar(C.novo(), "R U R' F2 D L'"));
const casos = {
  'canto torcido': p => { const t = p.U[8]; p.U[8] = p.F[2]; p.F[2] = p.R[0]; p.R[0] = t; },
  'aresta virada': p => { const t = p.U[7]; p.U[7] = p.F[1]; p.F[1] = t; },
  'duas arestas trocadas': () => null,
  'cor a mais': p => { p.U[0] = p.U[0] === 'D' ? 'U' : 'D'; },
  'faltando': p => { p.L[3] = null; },
};
for (const [nome, mexer] of Object.entries(casos)) {
  let p = JSON.parse(JSON.stringify(base));
  if (nome === 'duas arestas trocadas') {
    const c = C.aplicar(C.novo(), "R U R' F2 D L'");
    const a = c.pecas.find(x => x.casa.join() === '0,1,1'), b = c.pecas.find(x => x.casa.join() === '1,1,0');
    // troca as cores das duas arestas sem mexer no resto
    const pa = a.p, pb = b.p, na = a.adesivos.map(x => x.n), nb = b.adesivos.map(x => x.n);
    a.p = pb; b.p = pa;
    a.adesivos.forEach((x, i) => { x.n = nb[i]; });
    b.adesivos.forEach((x, i) => { x.n = na[i]; });
    p = R.pinturaDoCubo(c);
  } else mexer(p);
  const r = R.lerPintura(p);
  if (!r.erro) falha('aceitou pintura impossível: ' + nome);
  else console.log('  ok  ' + nome.padEnd(22) + ' -> ' + r.erro.slice(0, 90));
}

// ---------- soluções ----------
for (const metodo of ['camadas', 'cfop2', 'cfop']) {
  console.log('\n== ' + metodo + ' ==');
  let total = 0, maior = 0, passos = 0, tempo = 0, maiorPassos = 0;
  for (let i = 0; i < N; i++) {
    const emb = C.embaralhamento(25, rnd);
    const cubo = C.aplicar(C.novo(), emb);
    const t0 = Date.now();
    let r;
    try { r = R.resolver(cubo, metodo); } catch (e) { falha(metodo + ' quebrou: ' + e.message + ' (' + emb + ')'); continue; }
    tempo += Date.now() - t0;
    if (!r.resolvido) { falha(metodo + ' não resolveu (' + emb + ')'); continue; }
    // refaz os passos do zero para conferir
    const c = C.copiar(cubo);
    for (const p of r.passos) C.aplicar(c, p.alg);
    if (!c.pecas.every(p => p.adesivos.every(a => {
      const f = C.faceDaNormal(a.n);
      return C.adesivo(c, f, 1, 1).cor === a.cor;
    }))) falha(metodo + ': refazer os passos não resolve (' + emb + ')');
    if (r.passos.some(p => !p.alg)) falha(metodo + ': passo sem movimento (' + emb + ')');
    total += r.total; maior = Math.max(maior, r.total); passos += r.passos.length; maiorPassos = Math.max(maiorPassos, r.passos.length);
  }
  console.log('  ' + N + ' cubos | média ' + (total / N).toFixed(1) + ' movimentos (maior ' + maior + ') | média ' + (passos / N).toFixed(1) + ' passos (maior ' + maiorPassos + ') | ' + (tempo / N).toFixed(1) + ' ms por cubo');
}

// exemplo de passos
console.log('\n== Exemplo (camadas) ==');
const ex = R.resolver(C.aplicar(C.novo(), "F R' U2 L D' B2 R U' F2 L' D R2 U B' L2"), 'camadas');
for (const p of ex.passos) console.log('  [' + p.fase + '] ' + p.titulo + ': ' + p.alg + '\n      ' + p.texto);
console.log('\n== Exemplo (cfop 2-look) ==');
const ex2 = R.resolver(C.aplicar(C.novo(), "F R' U2 L D' B2 R U' F2 L' D R2 U B' L2"), 'cfop2');
for (const p of ex2.passos) console.log('  [' + p.fase + '] ' + p.titulo + ': ' + p.alg + '\n      ' + p.texto);

console.log('\n' + (falhas ? falhas + ' problema(s).' : 'Tudo certo.'));
process.exitCode = falhas ? 1 : 0;
