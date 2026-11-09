// Desenhos dos casos em SVG: cubo em 3D (isométrico), vista de cima e
// planificação. Também decide quais adesivos aparecem coloridos (máscaras).
(function (raiz) {
  'use strict';
  const C = raiz.Cubo || (typeof require !== 'undefined' ? require('./cubo.js') : null);

  const CORES = {
    U: '#ffd60a', // amarelo
    D: '#f4f5f7', // branco
    F: '#16b35a', // verde
    B: '#2773ff', // azul
    R: '#ff8a1c', // laranja
    L: '#e8323f', // vermelho
    X: '#4a505d', // cinza (adesivo escondido)
  };

  const zeros = casa => casa.filter(v => v === 0).length;
  const eCentro = casa => zeros(casa) === 2;
  const eCanto = casa => zeros(casa) === 0;
  const eAresta = casa => zeros(casa) === 1;

  // Cada máscara diz se um adesivo aparece colorido, pela casa da peça e pela cor.
  const MASCARAS = {
    tudo: () => true,
    cruz: casa => eCentro(casa) || (eAresta(casa) && casa[1] === -1),
    camada1: casa => eCentro(casa) || casa[1] === -1,
    f2l: casa => eCentro(casa) || casa[1] <= 0,
    oll: (casa, cor) => casa[1] <= 0 || cor === 'U',
    arestasOll: (casa, cor) => casa[1] <= 0 || (cor === 'U' && !eCanto(casa)),
    arestasLL: casa => casa[1] <= 0 || !eCanto(casa),
    cantosLL: (casa, cor) => casa[1] <= 0 || eCanto(casa) || cor === 'U',
  };

  function corVisivel(info, mascara) {
    if (!info) return CORES.X;
    const m = MASCARAS[mascara] || MASCARAS.tudo;
    return m(info.casa, info.cor) ? CORES[info.cor] : CORES.X;
  }

  const r2 = n => Math.round(n * 100) / 100;
  const pts = lista => lista.map(p => r2(p[0]) + ',' + r2(p[1])).join(' ');

  // ---------- Cubo isométrico (faces de cima, da frente e da direita) ----------
  function iso(cubo, mascara) {
    const k = 20, c30 = Math.cos(Math.PI / 6);
    const proj = (x, y, z) => [(x - z) * c30 * k, ((x + z) * 0.5 - y) * k];
    const h = 1.5, m = 0.44;
    const partes = [];
    // corpo preto
    const corpo = [proj(-h, h, -h), proj(h, h, -h), proj(h, -h, -h), proj(h, -h, h), proj(-h, -h, h), proj(-h, h, h)];
    partes.push('<polygon points="' + pts(corpo) + '" fill="#0b0c10" stroke="#0b0c10" stroke-width="3" stroke-linejoin="round"/>');
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        // cima: x = a, z = b
        const cu = corVisivel(C.adesivoEm(cubo, 'U', [a, 1, b]), mascara);
        partes.push(poly([proj(a - m, h, b - m), proj(a + m, h, b - m), proj(a + m, h, b + m), proj(a - m, h, b + m)], cu));
        // frente: x = a, y = b
        const cf = corVisivel(C.adesivoEm(cubo, 'F', [a, b, 1]), mascara);
        partes.push(poly([proj(a - m, b + m, h), proj(a + m, b + m, h), proj(a + m, b - m, h), proj(a - m, b - m, h)], cf));
        // direita: z = a, y = b
        const cr = corVisivel(C.adesivoEm(cubo, 'R', [1, b, a]), mascara);
        partes.push(poly([proj(h, b + m, a - m), proj(h, b + m, a + m), proj(h, b - m, a + m), proj(h, b - m, a - m)], cr));
      }
    }
    const w = 3 * c30 * k + 4;
    const vb = [-w, -3 * k - 2, 2 * w, 6 * k + 4].map(r2).join(' ');
    return '<svg class="desenho iso" viewBox="' + vb + '" aria-hidden="true">' + partes.join('') + '</svg>';
  }

  function poly(p, cor) {
    return '<polygon points="' + pts(p) + '" fill="' + cor + '" stroke="rgba(0,0,0,.35)" stroke-width=".6" stroke-linejoin="round"/>';
  }

  // ---------- Vista de cima (OLL e PLL) ----------
  // A face de cima no meio e os adesivos dos lados em volta.
  function topo(cubo, mascara, opcoes) {
    opcoes = opcoes || {};
    const s = 30, g = 3, borda = 12, faixa = 9;
    const tam = 3 * s + 2 * (borda + g);
    const partes = [];
    const o = borda + g; // início da grade
    partes.push('<rect x="' + (o - 3) + '" y="' + (o - 3) + '" width="' + (3 * s + 6) + '" height="' + (3 * s + 6) + '" rx="7" fill="#0b0c10"/>');
    for (let l = 0; l < 3; l++) {
      for (let c = 0; c < 3; c++) {
        const cor = corVisivel(C.adesivoEm(cubo, 'U', [c - 1, 1, l - 1]), mascara);
        partes.push(ret(o + c * s + 1.5, o + l * s + 1.5, s - 3, s - 3, cor, 4));
      }
    }
    for (let i = 0; i < 3; i++) {
      const p = o + i * s + 3;
      // trás (em cima no desenho), frente (embaixo), esquerda e direita
      partes.push(ret(p, o - g - faixa, s - 6, faixa, corVisivel(C.adesivoEm(cubo, 'B', [i - 1, 1, -1]), mascara), 2.5));
      partes.push(ret(p, o + 3 * s + g, s - 6, faixa, corVisivel(C.adesivoEm(cubo, 'F', [i - 1, 1, 1]), mascara), 2.5));
      partes.push(ret(o - g - faixa, p, faixa, s - 6, corVisivel(C.adesivoEm(cubo, 'L', [-1, 1, i - 1]), mascara), 2.5));
      partes.push(ret(o + 3 * s + g, p, faixa, s - 6, corVisivel(C.adesivoEm(cubo, 'R', [1, 1, i - 1]), mascara), 2.5));
    }
    if (opcoes.setas) partes.push(setas(cubo, o, s));
    return '<svg class="desenho topo" viewBox="0 0 ' + tam + ' ' + tam + '" aria-hidden="true">' + partes.join('') + '</svg>';
  }

  function ret(x, y, w, h, cor, rx) {
    return '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(w) + '" height="' + r2(h) + '" rx="' + rx + '" fill="' + cor + '"/>';
  }

  // Para onde cada peça da camada de cima precisa ir (pelas cores dos centros).
  function destinos(cubo) {
    const faceDaCor = {};
    for (const f of 'URFDLB') faceDaCor[C.adesivo(cubo, f, 1, 1).cor] = f;
    const lista = [];
    for (const pc of cubo.pecas) {
      if (pc.p[1] !== 1 || pc.adesivos.length < 2) continue;
      const alvo = [0, 1, 0];
      for (const a of pc.adesivos) {
        const f = faceDaCor[a.cor];
        if (f === 'U') continue;
        const n = C.NORMAL[f];
        alvo[0] += n[0];
        alvo[2] += n[2];
      }
      if (alvo[0] !== pc.p[0] || alvo[2] !== pc.p[2]) lista.push({ de: pc.p, para: alvo });
    }
    return lista;
  }

  function setas(cubo, o, s) {
    const lista = destinos(cubo);
    const centro = p => [o + (p[0] + 1) * s + s / 2, o + (p[2] + 1) * s + s / 2];
    const chave = p => p[0] + ',' + p[2];
    const feitos = new Set();
    let svg = '<defs><marker id="ponta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#111"/></marker></defs>';
    for (const m of lista) {
      const k = chave(m.de) + '>' + chave(m.para);
      if (feitos.has(k)) continue;
      const volta = lista.some(n => chave(n.de) === chave(m.para) && chave(n.para) === chave(m.de));
      feitos.add(k);
      if (volta) feitos.add(chave(m.para) + '>' + chave(m.de));
      let [x1, y1] = centro(m.de), [x2, y2] = centro(m.para);
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), recuo = 7;
      x1 += dx / d * recuo; y1 += dy / d * recuo; x2 -= dx / d * recuo; y2 -= dy / d * recuo;
      svg += '<line x1="' + r2(x1) + '" y1="' + r2(y1) + '" x2="' + r2(x2) + '" y2="' + r2(y2) + '" stroke="#111" stroke-width="2.6" stroke-linecap="round" marker-end="url(#ponta)"' + (volta ? ' marker-start="url(#ponta)"' : '') + '/>';
    }
    return svg;
  }

  // ---------- Planificação (para o embaralhamento) ----------
  function rede(cubo) {
    const s = 14, g = 4;
    const lugar = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] };
    const lado = 3 * s + g;
    const partes = [];
    for (const f of Object.keys(lugar)) {
      const [cx, cy] = lugar[f];
      for (let l = 0; l < 3; l++) {
        for (let c = 0; c < 3; c++) {
          const info = C.adesivo(cubo, f, l, c);
          partes.push(ret(cx * lado + c * s + 0.75, cy * lado + l * s + 0.75, s - 1.5, s - 1.5, CORES[info.cor], 2));
        }
      }
    }
    return '<svg class="desenho rede" viewBox="0 0 ' + (4 * lado - g) + ' ' + (3 * lado - g) + '" aria-hidden="true">' + partes.join('') + '</svg>';
  }

  const Desenho = { CORES, MASCARAS, corVisivel, iso, topo, rede, destinos };
  if (typeof module !== 'undefined' && module.exports) module.exports = Desenho;
  else raiz.Desenho = Desenho;
})(typeof window !== 'undefined' ? window : globalThis);
