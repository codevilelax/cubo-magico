// Lê o cubo pintado pela pessoa e monta a solução passo a passo,
// pelo método por camadas ou pelo CFOP (2-look ou completo).
(function (raiz) {
  'use strict';
  const C = raiz.Cubo || require('./cubo.js');
  const D = raiz.Conteudo || require('./conteudo.js');

  const FACES = 'URFDLB'.split('');
  const NOME_COR = { U: 'amarelo', D: 'branco', F: 'verde', B: 'azul', R: 'laranja', L: 'vermelho' };
  const NOME_FACE = { U: 'de cima', D: 'de baixo', F: 'da frente', B: 'de trás', R: 'da direita', L: 'da esquerda' };
  const Y = ['', 'y', 'y2', "y'"];
  const UU = ['', 'U', 'U2', "U'"];
  const UINV = ['', "U'", 'U2', 'U'];
  const igual = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const copiar = C.copiar;
  const aplicar = (c, alg) => C.aplicar(c, alg);
  const sim = (c, alg) => C.aplicar(C.copiar(c), alg);

  // =====================================================================
  // Pintura <-> cubo
  // =====================================================================
  const INDICE = {};
  for (const f of FACES) {
    INDICE[f] = {};
    for (let l = 0; l < 3; l++) for (let c = 0; c < 3; c++) INDICE[f][C.POSICAO[f](l, c).join()] = l * 3 + c;
  }

  function pinturaDoCubo(cubo) {
    const p = {};
    for (const f of FACES) {
      p[f] = [];
      for (let l = 0; l < 3; l++) for (let c = 0; c < 3; c++) p[f].push(C.adesivo(cubo, f, l, c).cor);
    }
    return p;
  }

  // Cubo só para mostrar a pintura no 3D (adesivo sem cor fica cinza).
  function cuboDaPintura(pint) {
    const cubo = C.novo();
    for (const peca of cubo.pecas) {
      for (const a of peca.adesivos) {
        const f = C.faceDaNormal(a.n0);
        a.cor = pint[f][INDICE[f][peca.casa.join()]] || 'X';
      }
    }
    return cubo;
  }

  function pinturaVazia() {
    const p = {};
    for (const f of FACES) { p[f] = Array(9).fill(null); p[f][4] = f; }
    return p;
  }

  const SEM_SOLUCAO = 'As cores estão certas, mas esse cubo não tem solução do jeito que foi pintado. Quase sempre é um adesivo trocado: confira cada face com calma, segurando o cubo do jeito indicado.';

  function lerPintura(pint) {
    const conta = {};
    let faltam = 0;
    for (const f of FACES) conta[f] = 0;
    for (const f of FACES) for (let i = 0; i < 9; i++) { const v = pint[f][i]; if (!v) faltam++; else conta[v]++; }
    if (faltam) return { erro: 'Ainda falta' + (faltam > 1 ? 'm ' : ' ') + faltam + ' adesivo' + (faltam > 1 ? 's' : '') + ' para pintar.' };
    for (const f of FACES) if (pint[f][4] !== f) return { erro: 'O centro da face ' + NOME_FACE[f] + ' precisa ser ' + NOME_COR[f] + '.' };
    const errados = FACES.filter(f => conta[f] !== 9);
    if (errados.length) {
      return { erro: 'Cada cor aparece 9 vezes num cubo. Agora está assim: ' + errados.map(f => NOME_COR[f] + ' ' + conta[f]).join(', ') + '.' };
    }
    const achadas = new Map();
    for (const peca of C.novo().pecas) {
      if (peca.adesivos.length === 1) continue;
      const p = peca.casa;
      const faces = peca.adesivos.map(a => C.faceDaNormal(a.n0));
      const cores = faces.map(f => pint[f][INDICE[f][p.join()]]);
      const casa = [0, 0, 0];
      for (const c of cores) { const n = C.NORMAL[c]; casa[0] += n[0]; casa[1] += n[1]; casa[2] += n[2]; }
      const onde = 'entre as faces ' + faces.map(f => NOME_FACE[f]).join(' e ').replace(/ e (?=.* e )/, ', ');
      if (new Set(cores).size !== cores.length || casa.filter(v => v !== 0).length !== cores.length) {
        return { erro: 'A peça ' + onde + ' ficou ' + cores.map(c => NOME_COR[c]).join(' e ').replace(/ e (?=.* e )/, ', ') + ', e essa peça não existe. Confira essas faces.' };
      }
      const k = casa.join();
      if (achadas.has(k)) return { erro: 'A peça ' + nomePeca(cores) + ' aparece duas vezes. Confira as faces.' };
      const normais = {};
      cores.forEach((c, i) => { normais[c] = C.NORMAL[faces[i]].slice(); });
      achadas.set(k, { p: p.slice(), normais });
    }

    const cubo = C.novo();
    for (const peca of cubo.pecas) {
      if (peca.adesivos.length === 1) continue;
      const info = achadas.get(peca.casa.join());
      peca.p = info.p.slice();
      for (const a of peca.adesivos) a.n = info.normais[a.cor].slice();
      const eixos = [null, null, null];
      for (const a of peca.adesivos) {
        const j = a.n0.findIndex(v => v !== 0);
        eixos[j] = a.n.map(v => v * a.n0[j]);
      }
      for (let j = 0; j < 3; j++) if (!eixos[j]) eixos[j] = cruz(eixos[(j + 1) % 3], eixos[(j + 2) % 3]);
      if (ponto(cruz(eixos[0], eixos[1]), eixos[2]) !== 1) return { erro: SEM_SOLUCAO };
      peca.eixos = eixos;
    }
    if (!temSolucao(cubo)) return { erro: SEM_SOLUCAO };
    return { cubo };
  }

  // Canto torcido, aresta virada ou duas peças trocadas: nenhum giro resolve.
  function temSolucao(cubo) {
    let torcao = 0, virada = 0;
    const cantos = [], arestas = [];
    for (const peca of cubo.pecas) {
      const p = peca.p;
      if (peca.adesivos.length === 3) {
        const ud = peca.adesivos.find(a => a.cor === 'U' || a.cor === 'D').n;
        if (!ud[1]) {
          const ny = [0, p[1], 0];
          const a = [[p[0], 0, 0], [0, 0, p[2]]].find(v => ponto(cruz(ny, v), p) < 0);
          torcao += igual(ud, a) ? 1 : 2;
        }
        cantos.push(peca);
      } else if (peca.adesivos.length === 2) {
        const ref = p[1] ? [0, p[1], 0] : [0, 0, p[2]];
        const a = peca.adesivos.find(x => x.cor === 'U' || x.cor === 'D') || peca.adesivos.find(x => x.cor === 'F' || x.cor === 'B');
        if (!igual(a.n, ref)) virada++;
        arestas.push(peca);
      }
    }
    return torcao % 3 === 0 && virada % 2 === 0 && paridade(cantos) === paridade(arestas);
  }

  function paridade(pecas) {
    const pos = pecas.map(p => p.casa.join());
    const perm = pecas.map(p => pos.indexOf(p.p.join()));
    const visto = new Array(perm.length).fill(false);
    let ciclos = 0;
    for (let i = 0; i < perm.length; i++) {
      if (visto[i]) continue;
      ciclos++;
      for (let j = i; !visto[j]; j = perm[j]) visto[j] = true;
    }
    return (perm.length - ciclos) % 2;
  }

  // =====================================================================
  // Ajudantes
  // =====================================================================
  function faceDaCor(cubo) {
    const m = {};
    for (const f of FACES) m[C.adesivo(cubo, f, 1, 1).cor] = f;
    return m;
  }
  const centro = (cubo, f) => C.adesivo(cubo, f, 1, 1).cor;
  const pecaCom = (cubo, cores) => cubo.pecas.find(p => p.adesivos.length === cores.length && cores.every(c => p.adesivos.some(a => a.cor === c)));
  function certa(cubo, peca) {
    const fc = faceDaCor(cubo);
    return peca.adesivos.every(a => igual(a.n, C.NORMAL[fc[a.cor]]));
  }
  function alvo(cubo, peca) {
    const fc = faceDaCor(cubo);
    const t = [0, 0, 0];
    for (const a of peca.adesivos) { const n = C.NORMAL[fc[a.cor]]; t[0] += n[0]; t[1] += n[1]; t[2] += n[2]; }
    return t;
  }
  const noLugar = (cubo, peca) => igual(peca.p, alvo(cubo, peca));
  const resolvido = cubo => cubo.pecas.every(p => certa(cubo, p));

  function nomePeca(cores) {
    const ordem = ['D', 'U', 'F', 'R', 'B', 'L'];
    const lista = cores.slice().sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
    // cantos na ordem horária ficam mais naturais: branco-verde-laranja
    return lista.map(c => NOME_COR[c]).join('-');
  }

  function lugar(p) {
    const camada = p[1] === 1 ? 'em cima' : p[1] === -1 ? 'embaixo' : 'na camada do meio';
    const lado = [];
    if (p[2] === 1) lado.push('na frente');
    if (p[2] === -1) lado.push('atrás');
    if (p[0] === 1) lado.push('à direita');
    if (p[0] === -1) lado.push('à esquerda');
    return camada + (lado.length ? ', ' + lado.join(' e ') : '');
  }

  // Junta movimentos iguais seguidos (U U -> U2, y y' -> nada).
  function simplificar(texto) {
    const saida = [];
    for (const l of C.ler(texto)) {
      const ult = saida[saida.length - 1];
      if (ult && ult.base === l.base) {
        const v = (((ult.vezes + l.vezes) % 4) + 4) % 4;
        saida.pop();
        if (v) saida.push(C.criarLance(l.base, v === 3 ? -1 : v));
      } else saida.push(C.criarLance(l.base, l.vezes));
    }
    return C.texto(saida);
  }

  const contarMovs = alg => C.ler(alg).filter(l => !'xyz'.includes(l.base)).length;

  // Acha k (0..3) tal que, depois de y^k, a condição vale.
  function acharY(cubo, cond) {
    for (let k = 0; k < 4; k++) if (cond(sim(cubo, Y[k]), k)) return k;
    return -1;
  }
  function acharU(cubo, cond) {
    for (let k = 0; k < 4; k++) if (cond(sim(cubo, UU[k]), k)) return k;
    return -1;
  }

  function Gravador(cubo) {
    this.cubo = copiar(cubo);
    this.passos = [];
  }
  Gravador.prototype.add = function (passo) {
    passo.alg = simplificar(passo.alg || '');
    passo.inicio = copiar(this.cubo);
    aplicar(this.cubo, passo.alg);
    passo.movs = contarMovs(passo.alg);
    this.passos.push(passo);
  };

  // =====================================================================
  // Busca curta para arestas da cruz (todas as combinações até achar)
  // =====================================================================
  const MOV18 = [];
  for (const f of 'UDRLFB') for (const s of ['', "'", '2']) MOV18.push(C.ler(f + s)[0]);
  const ESTADOS_ARESTA = [];
  const IDX_ARESTA = new Map();
  for (const peca of C.novo().pecas) {
    if (peca.adesivos.length !== 2) continue;
    for (const a of peca.adesivos) {
      const k = peca.casa.join() + '|' + a.n0.join();
      IDX_ARESTA.set(k, ESTADOS_ARESTA.length);
      ESTADOS_ARESTA.push({ p: peca.casa, n: a.n0 });
    }
  }
  const TRANS_ARESTA = MOV18.map(l => ESTADOS_ARESTA.map(e => {
    let p = e.p, n = e.n;
    if (l.camadas.includes(p[l.eixo])) {
      let q = ((l.quartos % 4) + 4) % 4;
      while (q--) { p = giro90(p, l.eixo); n = giro90(n, l.eixo); }
    }
    return IDX_ARESTA.get(p.join() + '|' + n.join());
  }));
  function giro90(v, eixo) {
    const [x, y, z] = v;
    return eixo === 0 ? [x, -z, y] : eixo === 1 ? [z, y, -x] : [-y, x, z];
  }

  // Menor sequência que deixa todas as arestas pedidas certas (cada uma: [cor1, cor2]).
  function buscaArestas(cubo, lista) {
    const fc = faceDaCor(cubo);
    const ini = [], fim = [];
    for (const cores of lista) {
      const peca = pecaCom(cubo, cores);
      const a = peca.adesivos.find(x => x.cor === cores[0]);
      ini.push(IDX_ARESTA.get(peca.p.join() + '|' + a.n.join()));
      const casa = alvo(cubo, peca);
      fim.push(IDX_ARESTA.get(casa.join() + '|' + C.NORMAL[fc[cores[0]]].join()));
    }
    const k = lista.length;
    const cod = est => est.reduce((s, v, i) => s + v * Math.pow(24, i), 0);
    const alvoCod = cod(fim);
    const inicio = cod(ini);
    if (inicio === alvoCod) return '';
    const total = Math.pow(24, k);
    const pai = new Int32Array(total).fill(-1);
    const mov = new Int8Array(total);
    pai[inicio] = inicio;
    let fila = [inicio];
    while (fila.length) {
      const prox = [];
      for (const s of fila) {
        const est = [];
        let r = s;
        for (let i = 0; i < k; i++) { est.push(r % 24); r = Math.floor(r / 24); }
        for (let m = 0; m < MOV18.length; m++) {
          const t = TRANS_ARESTA[m];
          let novo = 0, mult = 1;
          for (let i = 0; i < k; i++) { novo += t[est[i]] * mult; mult *= 24; }
          if (pai[novo] !== -1) continue;
          pai[novo] = s;
          mov[novo] = m;
          if (novo === alvoCod) {
            const lances = [];
            for (let x = novo; x !== inicio; x = pai[x]) lances.push(MOV18[mov[x]].texto);
            return lances.reverse().join(' ');
          }
          prox.push(novo);
        }
      }
      fila = prox;
    }
    return null;
  }

  // =====================================================================
  // Tabelas de casos (F2L, OLL, PLL) feitas a partir dos algoritmos do app
  // =====================================================================
  function relabel(cubo) {
    const fc = faceDaCor(cubo);
    return cor => fc[cor];
  }
  const PROJ = {
    f2l(c) {
      const fF = centro(c, 'F'), fR = centro(c, 'R'), fD = centro(c, 'D');
      const canto = pecaCom(c, [fD, fF, fR]), aresta = pecaCom(c, [fF, fR]);
      const b = canto.adesivos.find(a => a.cor === fD), v = aresta.adesivos.find(a => a.cor === fF);
      return canto.p.join() + '/' + b.n.join() + '|' + aresta.p.join() + '/' + v.n.join();
    },
    oll(c) {
      const u = centro(c, 'U');
      let k = '';
      for (let l = 0; l < 3; l++) for (let j = 0; j < 3; j++) k += C.adesivo(c, 'U', l, j).cor === u ? 1 : 0;
      for (const f of 'FRBL') for (let j = 0; j < 3; j++) k += C.adesivo(c, f, 0, j).cor === u ? 1 : 0;
      return k;
    },
    eo(c) {
      const u = centro(c, 'U');
      return [[0, 1], [1, 0], [1, 2], [2, 1]].map(([l, j]) => (C.adesivo(c, 'U', l, j).cor === u ? 1 : 0)).join('');
    },
    cp(c) {
      if (PROJ.oll(c) !== '111111111000000000000') return null;
      const r = relabel(c);
      let k = '';
      for (const f of 'FRBL') for (const j of [0, 2]) k += r(C.adesivo(c, f, 0, j).cor);
      return k;
    },
    pll(c) {
      if (PROJ.oll(c) !== '111111111000000000000') return null;
      const r = relabel(c);
      let k = '';
      for (const f of 'FRBL') for (let j = 0; j < 3; j++) k += r(C.adesivo(c, f, 0, j).cor);
      return k;
    },
  };

  function criarTabela(proj, entradas, comPos) {
    const t = new Map();
    for (const e of entradas) {
      for (let b = 0; b < (comPos ? 4 : 1); b++) {
        for (let a = 0; a < 4; a++) {
          const s = C.novo();
          aplicar(s, UU[b]);
          aplicar(s, C.inverter(e.alg));
          aplicar(s, UU[a]);
          const k = proj(s);
          if (k == null) continue;
          const alg = simplificar(UINV[a] + ' ' + e.alg + ' ' + UINV[b]);
          const n = contarMovs(alg);
          if (!t.has(k) || t.get(k).n > n) t.set(k, Object.assign({}, e, { alg, n, base: e.alg }));
        }
      }
    }
    return t;
  }

  let TAB = null;
  function tabelas() {
    if (TAB) return TAB;
    const pllPor = n => D.pll.find(p => p.curto === n);
    TAB = {
      f2l: criarTabela(PROJ.f2l, D.f2l.map(alg => ({ alg }))),
      oll: criarTabela(PROJ.oll, D.oll.map(o => ({ alg: o.alg, nome: o.nome, grupo: o.grupo }))),
      eo: criarTabela(PROJ.eo, D.oll2Arestas.map(o => ({ alg: o.alg, nome: o.nome, texto: o.texto }))),
      ocll: criarTabela(PROJ.oll, D.oll2Cantos.map(n => D.oll.find(o => o.numero === n)).map(o => ({ alg: o.alg, nome: o.nome, grupo: o.grupo }))),
      cp: criarTabela(PROJ.cp, D.pll2Cantos.map(p => ({ alg: p.alg, nome: p.nome, texto: p.texto })).concat([{ alg: '', nome: 'Cantos já certos' }]), true),
      ep: criarTabela(PROJ.pll, D.pll2Arestas.map(pllPor).map(p => ({ alg: p.alg, nome: p.nome })).concat([{ alg: '', nome: 'Só ajustar' }]), true),
      pll: criarTabela(PROJ.pll, D.pll.map(p => ({ alg: p.alg, nome: p.nome, grupo: p.grupo })).concat([{ alg: '', nome: 'Só ajustar' }]), true),
    };
    return TAB;
  }

  // =====================================================================
  // Método por camadas
  // =====================================================================
  const SEXY = "R U R' U'";
  const MEIO_DIR = "U R U' R' U' F' U F";
  const MEIO_ESQ = "U' L' U L U F U' F'";
  const CRUZ_AM = "F R U R' U' F'";
  const ARESTAS_AM = "R U R' U R U2 R' U";
  const CANTOS_AM = "U R U' L' U R' U' L";
  const VIRAR = "R' D' R D";
  const vezes = n => n === 1 ? '1 vez' : n + ' vezes';

  function resolverCamadas(cubo0) {
    const g = new Gravador(cubo0);
    const BRANCO = 'D';

    // ---- 1. Cruz branca: uma aresta de cada vez, a mais rápida primeiro ----
    const feitas = [];
    let restantes = ['F', 'R', 'B', 'L'].map(c => [BRANCO, c]);
    while (restantes.length) {
      let melhor = null;
      for (const cores of restantes) {
        const alg = buscaArestas(g.cubo, feitas.concat([cores]));
        if (!melhor || C.ler(alg).length < C.ler(melhor.alg).length) melhor = { cores, alg };
      }
      const peca = pecaCom(g.cubo, melhor.cores);
      if (melhor.alg) {
        g.add({
          fase: 'cruz', titulo: 'Aresta ' + nomePeca(melhor.cores),
          texto: (peca.p[1] === -1 ? 'Ela já está embaixo, mas no lugar errado ou virada. Leve até o lugar dela' : 'Ela está ' + lugar(peca.p) + '. Leve até embaixo') + ', entre o centro branco e o ' + NOME_COR[melhor.cores[1]] + ', com o branco para baixo.',
          alg: melhor.alg, mascara: 'cruz',
        });
      }
      feitas.push(melhor.cores);
      restantes = restantes.filter(c => c !== melhor.cores);
    }

    // ---- 2. Cantos brancos ----
    for (let volta = 0; volta < 12; volta++) {
      const cantos = [['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F']].map(c => [BRANCO].concat(c));
      const pend = cantos.map(c => pecaCom(g.cubo, c)).filter(p => !certa(g.cubo, p));
      if (!pend.length) break;
      const emCima = pend.filter(p => p.p[1] === 1);
      if (!emCima.length) {
        const peca = pend[0];
        const k = acharY(g.cubo, c => igual(pecaCom(c, peca.adesivos.map(a => a.cor)).p, [1, -1, 1]));
        g.add({
          fase: 'cantos', titulo: 'Tirar o canto ' + nomePeca(peca.adesivos.map(a => a.cor)) + ' de baixo',
          texto: 'Esse canto está embaixo, mas no lugar errado ou virado. ' + (k ? 'Gire o cubo para ele ficar na frente à direita e faça ' : 'Ele está na frente à direita: faça ') + 'R U R\' U\' uma vez para levar ele para cima.',
          alg: Y[k] + ' ' + SEXY, mascara: 'camada1',
        });
        continue;
      }
      // escolhe o canto que já está mais perto
      let melhor = null;
      for (const peca of emCima) {
        const cores = peca.adesivos.map(a => a.cor);
        const k = acharY(g.cubo, c => igual(alvo(c, pecaCom(c, cores)), [1, -1, 1]));
        const c1 = sim(g.cubo, Y[k]);
        const m = acharU(c1, c => igual(pecaCom(c, cores).p, [1, 1, 1]));
        let c2 = sim(c1, UU[m]);
        let reps = 0;
        while (!certa(c2, pecaCom(c2, cores)) && reps < 6) { aplicar(c2, SEXY); reps++; }
        const custo = (k ? 1 : 0) + (m ? 1 : 0) + reps * 4;
        if (!melhor || custo < melhor.custo) melhor = { cores, k, m, reps, custo };
      }
      const { cores, k, m, reps } = melhor;
      const partes = [];
      if (k) partes.push('Gire o cubo para o lugar dele (entre o ' + NOME_COR[cores[1]] + ' e o ' + NOME_COR[cores[2]] + ') ficar na frente à direita.');
      if (m) partes.push('Gire a face de cima até o canto ficar logo acima do lugar dele.');
      partes.push(reps === 1 ? 'Faça R U R\' U\' uma vez e o canto desce certo.' : 'Repita R U R\' U\' ' + vezes(reps) + ' até o canto descer certo.');
      g.add({
        fase: 'cantos', titulo: 'Canto ' + nomePeca(cores),
        texto: partes.join(' '),
        alg: Y[k] + ' ' + UU[m] + ' ' + Array(reps).fill(SEXY).join(' '), mascara: 'camada1',
      });
    }

    // ---- 3. Segunda camada ----
    for (let volta = 0; volta < 16; volta++) {
      const meio = [['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F']];
      const pend = meio.map(c => pecaCom(g.cubo, c)).filter(p => !certa(g.cubo, p));
      if (!pend.length) break;
      const emCima = pend.filter(p => p.p[1] === 1);
      if (!emCima.length) {
        const peca = pend[0];
        const cores = peca.adesivos.map(a => a.cor);
        const k = acharY(g.cubo, c => igual(pecaCom(c, cores).p, [1, 0, 1]));
        g.add({
          fase: 'meio', titulo: 'Tirar a aresta ' + nomePeca(cores) + ' do meio',
          texto: 'Essa aresta está no meio, mas no lugar errado ou invertida. ' + (k ? 'Gire o cubo para ela ficar na frente à direita e faça ' : 'Ela está na frente à direita: faça ') + 'o algoritmo para a direita para tirar ela de lá.',
          alg: Y[k] + ' ' + MEIO_DIR, mascara: 'f2l',
        });
        continue;
      }
      let melhor = null;
      for (const peca of emCima) {
        const lado = peca.adesivos.find(a => a.n[1] !== 1).cor;
        const cima = peca.adesivos.find(a => a.n[1] === 1).cor;
        const k = acharY(g.cubo, c => centro(c, 'F') === lado);
        const c1 = sim(g.cubo, Y[k]);
        const m = acharU(c1, c => igual(pecaCom(c, [lado, cima]).p, [0, 1, 1]));
        const direita = centro(c1, 'R') === cima;
        const custo = (k ? 1 : 0) + (m ? 1 : 0);
        if (!melhor || custo < melhor.custo) melhor = { lado, cima, k, m, direita, custo };
      }
      const { lado, cima, k, m, direita } = melhor;
      const partes = [];
      if (k) partes.push('Gire o cubo para o centro ' + NOME_COR[lado] + ' ficar na frente.');
      if (m) partes.push('Gire a face de cima até a aresta ficar na frente, sobre o centro ' + NOME_COR[lado] + ' (forma um T).');
      partes.push('A cor de cima da aresta é ' + NOME_COR[cima] + ', igual ao centro da ' + (direita ? 'direita' : 'esquerda') + ': algoritmo para a ' + (direita ? 'direita' : 'esquerda') + '.');
      g.add({
        fase: 'meio', titulo: 'Aresta ' + nomePeca([lado, cima]),
        texto: partes.join(' '),
        alg: Y[k] + ' ' + UU[m] + ' ' + (direita ? MEIO_DIR : MEIO_ESQ), mascara: 'f2l',
      });
    }

    // ---- 4. Cruz amarela ----
    for (let volta = 0; volta < 4; volta++) {
      const c = g.cubo;
      const u = centro(c, 'U');
      const cima = p => C.adesivoEm(c, 'U', p).cor === u;
      const E = { B: [0, 1, -1], R: [1, 1, 0], F: [0, 1, 1], L: [-1, 1, 0] };
      const viradas = Object.keys(E).filter(k => cima(E[k]));
      if (viradas.length === 4) break;
      if (viradas.length === 0) {
        g.add({ fase: 'cruzAmarela', titulo: 'Ponto', texto: 'Só o centro está amarelo. Faça o algoritmo de qualquer jeito: vai aparecer um L ou uma linha.', alg: CRUZ_AM, mascara: 'arestasOll' });
        continue;
      }
      const oposta = (viradas.includes('B') && viradas.includes('F')) || (viradas.includes('L') && viradas.includes('R'));
      const alvoV = oposta ? ['L', 'R'] : ['B', 'L'];
      const m = acharU(c, s => { const uu = centro(s, 'U'); return alvoV.every(k => C.adesivoEm(s, 'U', E[k]).cor === uu); });
      g.add({
        fase: 'cruzAmarela', titulo: oposta ? 'Linha' : 'L',
        texto: (oposta
          ? (m ? 'Gire a face de cima para a linha ficar deitada (da esquerda para a direita). ' : 'A linha já está deitada. ')
          : (m ? 'Gire a face de cima para o L ficar atrás e à esquerda. ' : 'O L já está atrás e à esquerda. ')) + 'Faça o algoritmo.',
        alg: UU[m] + ' ' + CRUZ_AM, mascara: 'arestasOll',
      });
    }

    // ---- 5. Arestas amarelas no lugar ----
    for (let volta = 0; volta < 6; volta++) {
      const E = { B: [0, 1, -1], R: [1, 1, 0], F: [0, 1, 1], L: [-1, 1, 0] };
      const certas = s => Object.keys(E).filter(f => C.adesivoEm(s, f, E[f]).cor === centro(s, f));
      let melhorM = 0, melhorN = -1;
      for (let m = 0; m < 4; m++) { const n = certas(sim(g.cubo, UU[m])).length; if (n > melhorN) { melhorN = n; melhorM = m; } }
      if (melhorN === 4) {
        if (melhorM) g.add({ fase: 'arestas', titulo: 'Alinhar as arestas', texto: 'Gire a face de cima até as 4 arestas combinarem com os centros.', alg: UU[melhorM], mascara: 'arestasLL' });
        break;
      }
      if (melhorN < 2) {
        g.add({ fase: 'arestas', titulo: 'Trocar arestas', texto: 'Não dá para deixar duas arestas certas só girando a face de cima. Faça o algoritmo uma vez e confira de novo.', alg: ARESTAS_AM, mascara: 'arestasLL' });
        continue;
      }
      const c1 = sim(g.cubo, UU[melhorM]);
      const ok = certas(c1);
      const vizinhas = !((ok.includes('B') && ok.includes('F')) || (ok.includes('L') && ok.includes('R')));
      if (vizinhas) {
        const k = acharY(c1, s => { const o = certas(s); return o.includes('B') && o.includes('R'); });
        g.add({
          fase: 'arestas', titulo: 'Trocar arestas',
          texto: (melhorM ? 'Gire a face de cima até duas arestas vizinhas combinarem com os centros. ' : 'Duas arestas vizinhas já combinam com os centros. ') + (k ? 'Gire o cubo para elas ficarem atrás e à direita ' : 'Elas estão atrás e à direita: ') + 'e faça o algoritmo.',
          alg: UU[melhorM] + ' ' + Y[k] + ' ' + ARESTAS_AM, mascara: 'arestasLL',
        });
      } else {
        g.add({
          fase: 'arestas', titulo: 'Trocar arestas',
          texto: (melhorM ? 'Gire a face de cima até duas arestas combinarem. ' : '') + 'As duas certas estão em lados opostos. Faça o algoritmo uma vez: depois elas ficam vizinhas.',
          alg: UU[melhorM] + ' ' + ARESTAS_AM, mascara: 'arestasLL',
        });
      }
    }

    // ---- 6. Cantos amarelos no lugar ----
    for (let volta = 0; volta < 6; volta++) {
      const cantos = g.cubo.pecas.filter(p => p.adesivos.length === 3 && p.p[1] === 1);
      const certos = cantos.filter(p => noLugar(g.cubo, p));
      if (certos.length === 4) break;
      if (!certos.length) {
        g.add({ fase: 'cantosLugar', titulo: 'Nenhum canto no lugar', texto: 'Nenhum canto amarelo está no lugar certo. Faça o algoritmo uma vez de qualquer posição.', alg: CANTOS_AM, mascara: 'tudo' });
        continue;
      }
      const cores = certos[0].adesivos.map(a => a.cor);
      const k = acharY(g.cubo, c => igual(pecaCom(c, cores).p, [1, 1, 1]));
      g.add({
        fase: 'cantosLugar', titulo: 'Canto ' + nomePeca(cores) + ' no lugar',
        texto: 'Esse canto já está no lugar certo (mesmo se virado). ' + (k ? 'Gire o cubo para ele ficar na frente à direita ' : 'Ele está na frente à direita: ') + 'e faça o algoritmo.',
        alg: Y[k] + ' ' + CANTOS_AM, mascara: 'tudo',
      });
    }

    // ---- 7. Virar os cantos ----
    let pendente = '';
    const amareloCima = c => C.adesivoEm(c, 'U', [1, 1, 1]).cor === centro(c, 'U');
    for (let i = 0; i < 4; i++) {
      const c = sim(g.cubo, pendente);
      if (!amareloCima(c)) {
        let reps = 0;
        const t = copiar(c);
        while (!amareloCima(t) && reps < 6) { aplicar(t, VIRAR + ' ' + VIRAR); reps += 2; }
        g.add({
          fase: 'virar', titulo: 'Virar o canto da frente à direita',
          texto: (pendente ? 'Gire só a face de cima (sem virar o cubo) para trazer um canto virado para a frente à direita. ' : '') +
            'Repita R\' D\' R D ' + vezes(reps) + ' até o amarelo desse canto ficar para cima. As camadas de baixo bagunçam, mas voltam no fim.',
          alg: pendente + ' ' + Array(reps).fill(VIRAR).join(' '), mascara: 'tudo',
        });
        pendente = '';
      }
      if (i < 3) pendente += ' U';
    }
    const m = acharU(g.cubo, resolvido);
    if (m > 0) g.add({ fase: 'fim', titulo: 'Último ajuste', texto: 'Gire a face de cima até tudo combinar.', alg: UU[m], mascara: 'tudo' });
    return terminar(g);
  }

  // =====================================================================
  // CFOP
  // =====================================================================
  const GRUPO_F2L_TEXTO = {
    lado: 'canto e aresta em cima, com o branco para o lado',
    cima: 'canto e aresta em cima, com o branco para cima',
    canto: 'canto já no lugar, aresta em cima',
    aresta: 'aresta já no lugar, canto em cima',
    dois: 'canto e aresta no lugar, mas errados',
  };
  function grupoF2l(c) {
    const fF = centro(c, 'F'), fR = centro(c, 'R'), fD = centro(c, 'D');
    const canto = pecaCom(c, [fD, fF, fR]), aresta = pecaCom(c, [fF, fR]);
    const cantoNoLugar = igual(canto.p, [1, -1, 1]), arestaNoLugar = igual(aresta.p, [1, 0, 1]);
    if (cantoNoLugar && arestaNoLugar) return 'dois';
    if (cantoNoLugar) return 'canto';
    if (arestaNoLugar) return 'aresta';
    return canto.adesivos.find(a => a.cor === fD).n[1] === 1 ? 'cima' : 'lado';
  }

  function resolverCfop(cubo0, doisLook) {
    const T = tabelas();
    const g = new Gravador(cubo0);
    const BRANCO = 'D';

    // ---- Cruz ----
    const algCruz = buscaArestas(g.cubo, ['F', 'R', 'B', 'L'].map(c => [BRANCO, c]));
    if (algCruz) {
      g.add({ fase: 'cruz', titulo: 'Cruz branca', texto: 'Faça a cruz branca embaixo de uma vez. No CFOP você planeja ela inteira antes de começar: aqui são ' + contarMovs(algCruz) + ' movimentos.', alg: algCruz, mascara: 'cruz' });
    }

    // ---- F2L ----
    const PARES = [['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F']];
    const parCerto = (c, par) => certa(c, pecaCom(c, [BRANCO].concat(par))) && certa(c, pecaCom(c, par));
    for (let volta = 0; volta < 16; volta++) {
      const pend = PARES.filter(par => !parCerto(g.cubo, par));
      if (!pend.length) break;
      let melhor = null;
      for (const par of pend) {
        const k = acharY(g.cubo, c => centro(c, 'F') === par[0] && centro(c, 'R') === par[1]);
        const c1 = sim(g.cubo, Y[k]);
        const caso = T.f2l.get(PROJ.f2l(c1));
        if (!caso) continue;
        const custo = caso.n + (k ? 0.5 : 0);
        if (!melhor || custo < melhor.custo) melhor = { par, k, caso, custo, grupo: grupoF2l(c1) };
      }
      if (melhor) {
        const { par, k, caso, grupo } = melhor;
        g.add({
          fase: 'f2l', titulo: 'Par ' + nomePeca(par),
          texto: (k ? 'Gire o cubo para o lugar do par (entre o ' + NOME_COR[par[0]] + ' e o ' + NOME_COR[par[1]] + ') ficar na frente à direita. ' : 'O lugar do par já está na frente à direita. ') +
            'Caso: ' + GRUPO_F2L_TEXTO[grupo] + '.',
          alg: Y[k] + ' ' + caso.alg, mascara: 'f2l',
        });
        continue;
      }
      // peça presa em outro lugar: solta com R U R'
      const par = pend[0];
      const pecas = [pecaCom(g.cubo, [BRANCO].concat(par)), pecaCom(g.cubo, par)];
      // a peça que está num lugar que não é o dela (fora da camada de cima)
      const presa = pecas.find(p => p.p[1] !== 1 && !igual(p.p, alvo(g.cubo, p))) || pecas.find(p => p.p[1] !== 1);
      const coresPresa = presa.adesivos.map(a => a.cor);
      const k = acharY(g.cubo, c => { const q = pecaCom(c, coresPresa).p; return q[0] === 1 && q[2] === 1; });
      g.add({
        fase: 'f2l', titulo: 'Soltar peça presa',
        texto: 'Uma peça do par ' + nomePeca(par) + ' está presa ' + lugar(presa.p) + '. ' + (k ? 'Gire o cubo para esse lugar ficar na frente à direita e faça ' : 'Faça ') + 'R U R\' para levar ela para cima.',
        alg: Y[k] + " R U R'", mascara: 'f2l',
      });
    }

    // ---- OLL ----
    const OLL_OK = '111111111000000000000';
    if (PROJ.oll(g.cubo) !== OLL_OK) {
      if (doisLook) {
        const eo = PROJ.eo(g.cubo);
        if (eo !== '1111') {
          const caso = T.eo.get(eo);
          g.add({ fase: 'oll', titulo: 'Cruz amarela: ' + caso.nome, texto: 'Primeira parte do OLL: as arestas. ' + (caso.texto || ''), alg: caso.alg, mascara: 'arestasOll' });
        }
        if (PROJ.oll(g.cubo) !== OLL_OK) {
          const caso = T.ocll.get(PROJ.oll(g.cubo));
          g.add({ fase: 'oll', titulo: 'Cantos: ' + caso.grupo.replace(/^Cruz \((.*)\)$/, '$1').replace(/^./, l => l.toUpperCase()), texto: 'Segunda parte do OLL: os cantos. É o ' + caso.nome + '.', alg: caso.alg, mascara: 'oll' });
        }
      } else {
        const caso = T.oll.get(PROJ.oll(g.cubo));
        g.add({ fase: 'oll', titulo: caso.nome + ' · ' + caso.grupo, texto: 'Deixe a face de cima toda amarela.', alg: caso.alg, mascara: 'oll' });
      }
    }

    // ---- PLL ----
    if (!resolvido(g.cubo)) {
      if (doisLook) {
        const cp = T.cp.get(PROJ.cp(g.cubo));
        if (cp && cp.base) g.add({ fase: 'pll', titulo: 'Cantos: ' + cp.nome, texto: 'Primeira parte do PLL: os cantos. ' + (cp.texto || ''), alg: cp.alg, mascara: 'cantosLL' });
        else if (cp && cp.alg) g.add({ fase: 'pll', titulo: 'Alinhar os cantos', texto: 'Os cantos já estão certos entre si. Gire a face de cima para eles combinarem com os centros.', alg: cp.alg, mascara: 'cantosLL' });
        if (!resolvido(g.cubo)) {
          const ep = T.ep.get(PROJ.pll(g.cubo));
          g.add({ fase: 'pll', titulo: ep.base ? 'Arestas: ' + ep.nome : 'Último ajuste', texto: ep.base ? 'Segunda parte do PLL: as arestas.' : 'Gire a face de cima até tudo combinar.', alg: ep.alg, mascara: 'tudo' });
        }
      } else {
        const caso = T.pll.get(PROJ.pll(g.cubo));
        g.add({ fase: 'pll', titulo: caso.base ? caso.nome : 'Último ajuste', texto: caso.base ? 'Termine o cubo.' : 'Gire a face de cima até tudo combinar.', alg: caso.alg, mascara: 'tudo' });
      }
    }
    const m = acharU(g.cubo, resolvido);
    if (m > 0) g.add({ fase: 'fim', titulo: 'Último ajuste', texto: 'Gire a face de cima até tudo combinar.', alg: UU[m], mascara: 'tudo' });
    return terminar(g);
  }

  function terminar(g) {
    return { passos: g.passos, resolvido: resolvido(g.cubo), total: g.passos.reduce((s, p) => s + p.movs, 0) };
  }

  const FASES = {
    camadas: [['cruz', 'Cruz branca'], ['cantos', 'Cantos brancos'], ['meio', 'Segunda camada'], ['cruzAmarela', 'Cruz amarela'], ['arestas', 'Arestas amarelas'], ['cantosLugar', 'Cantos no lugar'], ['virar', 'Virar os cantos']],
    cfop: [['cruz', 'Cruz'], ['f2l', 'F2L'], ['oll', 'OLL'], ['pll', 'PLL']],
  };

  function resolver(cubo, metodo) {
    if (metodo === 'camadas') return resolverCamadas(cubo);
    return resolverCfop(cubo, metodo === 'cfop2');
  }

  const Resolver = { lerPintura, pinturaDoCubo, pinturaVazia, cuboDaPintura, resolver, temSolucao, simplificar, FASES, NOME_COR };
  if (typeof module !== 'undefined' && module.exports) module.exports = Resolver;
  else raiz.Resolver = Resolver;
})(typeof window !== 'undefined' ? window : globalThis);
