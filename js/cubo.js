// Motor do cubo: guarda onde cada peça está e aplica os movimentos.
// Eixos: x para a direita (R), y para cima (U), z para a frente (F).
// Cores fixas: amarelo em cima, branco embaixo, verde na frente,
// azul atrás, laranja na direita e vermelho na esquerda.
(function (raiz) {
  'use strict';

  const NORMAL = {
    U: [0, 1, 0], D: [0, -1, 0],
    R: [1, 0, 0], L: [-1, 0, 0],
    F: [0, 0, 1], B: [0, 0, -1],
  };

  function faceDaNormal(n) {
    if (n[0] === 1) return 'R';
    if (n[0] === -1) return 'L';
    if (n[1] === 1) return 'U';
    if (n[1] === -1) return 'D';
    if (n[2] === 1) return 'F';
    return 'B';
  }

  // Gira um vetor 90° em torno do eixo (regra da mão direita).
  function gira90(v, eixo) {
    const x = v[0], y = v[1], z = v[2];
    if (eixo === 0) return [x, -z, y];
    if (eixo === 1) return [z, y, -x];
    return [-y, x, z];
  }

  function gira(v, eixo, quartos) {
    let q = ((quartos % 4) + 4) % 4;
    let r = v;
    while (q--) r = gira90(r, eixo);
    return r;
  }

  // [eixo, camadas que giram, sentido do movimento sem apóstrofo]
  const MOVIMENTOS = {
    R: [0, [1], -1], L: [0, [-1], 1],
    U: [1, [1], -1], D: [1, [-1], 1],
    F: [2, [1], -1], B: [2, [-1], 1],
    M: [0, [0], 1], E: [1, [0], 1], S: [2, [0], -1],
    r: [0, [0, 1], -1], l: [0, [-1, 0], 1],
    u: [1, [0, 1], -1], d: [1, [-1, 0], 1],
    f: [2, [0, 1], -1], b: [2, [-1, 0], 1],
    x: [0, [-1, 0, 1], -1], y: [1, [-1, 0, 1], -1], z: [2, [-1, 0, 1], -1],
  };

  function criarLance(base, vezes, texto) {
    const m = MOVIMENTOS[base];
    return { base, vezes, eixo: m[0], camadas: m[1], quartos: m[2] * vezes, texto: texto || nomeDoLance(base, vezes) };
  }

  function nomeDoLance(base, vezes) {
    const v = ((vezes % 4) + 4) % 4;
    if (v === 0) return '';
    if (v === 1) return base;
    if (v === 2) return base + '2';
    return base + "'";
  }

  // "R U R' U'" -> lista de lances. Aceita Rw (igual a r), R2' e parênteses.
  function ler(texto) {
    const lances = [];
    const re = /([RLUDFBMESxyzrludfb])(w?)(\d*)('?)/g;
    let m;
    while ((m = re.exec(texto))) {
      let base = m[1];
      if (m[2] && 'RLUDFB'.includes(base)) base = base.toLowerCase();
      const n = m[3] ? parseInt(m[3], 10) : 1;
      const vezes = m[4] ? -n : n;
      let mostrado = base + (n !== 1 ? n : '') + m[4];
      if (m[2]) mostrado = m[1] + 'w' + (n !== 1 ? n : '') + m[4];
      lances.push(criarLance(base, vezes, mostrado));
    }
    return lances;
  }

  function inverter(lances) {
    if (typeof lances === 'string') lances = ler(lances);
    return lances.slice().reverse().map(l => criarLance(l.base, -l.vezes));
  }

  // Espelho da direita para a esquerda (para conferir pares como Ja/Jb).
  // R vira L', U vira U'... mas M e x giram em torno do mesmo eixo do
  // espelho e continuam iguais.
  const ESPELHO = { R: 'L', L: 'R', r: 'l', l: 'r' };
  function espelhar(lances) {
    if (typeof lances === 'string') lances = ler(lances);
    return lances.map(l => criarLance(ESPELHO[l.base] || l.base, 'Mx'.includes(l.base) ? l.vezes : -l.vezes));
  }

  function texto(lances) {
    return lances.map(l => l.texto).join(' ');
  }

  function novo() {
    const pecas = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue;
          const adesivos = [];
          for (const face of Object.keys(NORMAL)) {
            const n = NORMAL[face];
            if ((n[0] && n[0] === x) || (n[1] && n[1] === y) || (n[2] && n[2] === z)) {
              adesivos.push({ cor: face, n0: n.slice(), n: n.slice() });
            }
          }
          pecas.push({
            casa: [x, y, z],
            p: [x, y, z],
            // para onde apontam os eixos da peça (usado no desenho 3D)
            eixos: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            adesivos,
          });
        }
      }
    }
    return { pecas };
  }

  function copiar(cubo) {
    return {
      pecas: cubo.pecas.map(p => ({
        casa: p.casa.slice(),
        p: p.p.slice(),
        eixos: p.eixos.map(e => e.slice()),
        adesivos: p.adesivos.map(a => ({ cor: a.cor, n0: a.n0.slice(), n: a.n.slice() })),
      })),
    };
  }

  function pecasDoLance(cubo, lance) {
    return cubo.pecas.filter(p => lance.camadas.includes(p.p[lance.eixo]));
  }

  function aplicarLance(cubo, lance) {
    for (const p of pecasDoLance(cubo, lance)) {
      p.p = gira(p.p, lance.eixo, lance.quartos);
      p.eixos = p.eixos.map(e => gira(e, lance.eixo, lance.quartos));
      for (const a of p.adesivos) a.n = gira(a.n, lance.eixo, lance.quartos);
    }
    return cubo;
  }

  function aplicar(cubo, alg) {
    const lances = typeof alg === 'string' ? ler(alg) : alg;
    for (const l of lances) aplicarLance(cubo, l);
    return cubo;
  }

  // Posição (x, y, z) de cada quadradinho de uma face, por linha e coluna,
  // olhando a face de frente (como numa planificação do cubo).
  const POSICAO = {
    U: (l, c) => [c - 1, 1, l - 1],
    D: (l, c) => [c - 1, -1, 1 - l],
    F: (l, c) => [c - 1, 1 - l, 1],
    B: (l, c) => [1 - c, 1 - l, -1],
    R: (l, c) => [1, 1 - l, 1 - c],
    L: (l, c) => [-1, 1 - l, c - 1],
  };

  function iguais(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  // Adesivo que está na face indicada, na peça da posição p.
  function adesivoEm(cubo, face, p) {
    const n = NORMAL[face];
    for (const peca of cubo.pecas) {
      if (!iguais(peca.p, p)) continue;
      for (const a of peca.adesivos) {
        if (iguais(a.n, n)) return { cor: a.cor, casa: peca.casa, peca };
      }
    }
    return null;
  }

  function adesivo(cubo, face, linha, coluna) {
    return adesivoEm(cubo, face, POSICAO[face](linha, coluna));
  }

  // 54 letras, na ordem U R F D L B, linha por linha.
  function letras(cubo) {
    let s = '';
    for (const face of 'URFDLB') {
      for (let l = 0; l < 3; l++) for (let c = 0; c < 3; c++) s += adesivo(cubo, face, l, c).cor;
    }
    return s;
  }

  // Embaralhamento de 20 movimentos sem repetir face nem eixo em seguida.
  function embaralhamento(tamanho, aleatorio) {
    const rnd = aleatorio || Math.random;
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    const eixo = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 };
    const sufixos = ['', "'", '2'];
    const lances = [];
    while (lances.length < (tamanho || 20)) {
      const f = faces[Math.floor(rnd() * 6)];
      const n = lances.length;
      if (n && lances[n - 1][0] === f) continue;
      if (n > 1 && eixo[lances[n - 1][0]] === eixo[f] && eixo[lances[n - 2][0]] === eixo[f]) continue;
      lances.push(f + sufixos[Math.floor(rnd() * 3)]);
    }
    return lances.join(' ');
  }

  const Cubo = {
    NORMAL, POSICAO, MOVIMENTOS,
    novo, copiar, ler, inverter, espelhar, texto, aplicar, aplicarLance, pecasDoLance,
    adesivo, adesivoEm, letras, faceDaNormal, embaralhamento, criarLance,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Cubo;
  else raiz.Cubo = Cubo;
})(typeof window !== 'undefined' ? window : globalThis);
