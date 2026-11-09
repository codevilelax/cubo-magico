// Interface do app: abas, aulas, cubo 3D animado, treino e cronômetro.
(function () {
  'use strict';
  const C = window.Cubo, D = window.Conteudo, Des = window.Desenho;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço ou bloqueado */ } };
  const lerSalvo = (k, padrao) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? padrao : v; } catch (e) { return padrao; }
  };

  // =====================================================================
  // Casos (cada algoritmo que pode abrir no cubo)
  // =====================================================================
  const CASOS = new Map();
  const registrar = caso => (CASOS.set(caso.id, caso), caso);

  function estadoInicial(caso) {
    if (!caso._inicio) {
      let c;
      if (caso.inicio !== undefined) c = C.aplicar(C.novo(), caso.inicio);
      else {
        c = C.novo();
        if (caso.base) C.aplicar(c, caso.base);
        C.aplicar(c, C.inverter(caso.alg));
      }
      caso._inicio = c;
    }
    return C.copiar(caso._inicio);
  }

  function miniatura(caso) {
    if (!caso._svg) {
      let s = estadoInicial(caso);
      if (caso.mostrarFim) s = C.aplicar(s, caso.alg);
      caso._svg = caso.desenho === 'topo' ? Des.topo(s, caso.mascara, { setas: caso.setas }) : Des.iso(s, caso.mascara);
    }
    return caso._svg;
  }

  D.notacao.forEach(n => registrar({
    id: 'not-' + n.alg, nome: n.alg, alg: n.alg, inicio: '', mascara: 'tudo', desenho: 'iso', texto: n.texto, mostrarFim: true,
  }));

  D.camadas.forEach((passo, i) => passo.casos.forEach((c, j) => registrar(Object.assign({}, c, {
    id: 'cam-' + passo.id + '-' + j, mascara: c.mascara || passo.mascara, desenho: i < 3 ? 'iso' : 'topo',
    titulo: passo.titulo + ': ' + c.nome,
  }))));

  D.f2lIntro.basicos.forEach((c, j) => registrar({ id: 'f2lb-' + j, nome: c.nome, alg: c.alg, mascara: 'f2l', desenho: 'iso', titulo: 'F2L: ' + c.nome }));

  const GRUPOS_F2L = [
    ['lado', 'Canto e aresta em cima, branco para o lado'],
    ['cima', 'Canto e aresta em cima, branco para cima'],
    ['canto', 'Canto no lugar, aresta em cima'],
    ['aresta', 'Aresta no lugar, canto em cima'],
    ['dois', 'Canto e aresta no lugar, mas errados'],
  ];
  function grupoF2l(caso) {
    const s = estadoInicial(caso);
    const peca = casa => s.pecas.find(p => p.casa.join() === casa);
    const canto = peca('1,-1,1'), aresta = peca('1,0,1');
    const cantoNoLugar = canto.p.join() === '1,-1,1', arestaNoLugar = aresta.p.join() === '1,0,1';
    if (cantoNoLugar && arestaNoLugar) return 'dois';
    if (cantoNoLugar) return 'canto';
    if (arestaNoLugar) return 'aresta';
    const branco = canto.adesivos.find(a => a.cor === 'D');
    return branco.n[1] === 1 ? 'cima' : 'lado';
  }
  const F2L = D.f2l.map((alg, i) => {
    const caso = registrar({ id: 'f2l-' + i, alg, mascara: 'f2l', desenho: 'iso' });
    caso.grupo = grupoF2l(caso);
    caso.nome = 'F2L';
    caso.titulo = 'F2L: ' + GRUPOS_F2L.find(g => g[0] === caso.grupo)[1].toLowerCase();
    return caso;
  });

  const OLL2A = D.oll2Arestas.map((c, j) => registrar(Object.assign({}, c, { id: 'oll2a-' + j, mascara: 'arestasOll', desenho: 'topo', titulo: 'OLL 2-look: ' + c.nome })));
  const OLL = D.oll.map(o => registrar(Object.assign({}, o, { desenho: 'topo', titulo: o.nome + ' · ' + o.grupo })));
  const OLL2C = D.oll2Cantos.map(n => CASOS.get('oll' + n));
  const PLL2C = D.pll2Cantos.map((c, j) => registrar(Object.assign({}, c, { id: 'pll2c-' + j, mascara: 'cantosLL', desenho: 'topo', setas: true, titulo: 'PLL 2-look: ' + c.nome })));
  const PLL = D.pll.map(p => registrar(Object.assign({}, p, { desenho: 'topo', setas: true, titulo: p.nome })));
  const PLL2A = D.pll2Arestas.map(n => CASOS.get('pll-' + n));

  // =====================================================================
  // Cubo 3D
  // =====================================================================
  const S = [1, -1, 1]; // o CSS tem o y para baixo
  function rotacao(eixo, a) {
    const c = Math.cos(a), s = Math.sin(a);
    if (eixo === 0) return [[1, 0, 0], [0, c, -s], [0, s, c]];
    if (eixo === 1) return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  }
  const mult = (R, v) => [0, 1, 2].map(i => R[i][0] * v[0] + R[i][1] * v[1] + R[i][2] * v[2]);

  function matriz(peca, T, R) {
    let col = peca.eixos, t = peca.p.map(v => v * T);
    if (R) { col = col.map(v => mult(R, v)); t = mult(R, t); }
    const m = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) m.push(+(S[i] * S[j] * col[j][i]).toFixed(5));
    return 'matrix3d(' + [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, +(t[0]).toFixed(3), +(-t[1]).toFixed(3), +(t[2]).toFixed(3), 1].join(',') + ')';
  }

  const VISTA_PADRAO = { x: -27, y: -38 };

  function Visor(caixa) {
    this.caixa = caixa;
    caixa.innerHTML = '<div class="cena"><div class="cubo3d"></div></div>';
    this.raiz = $('.cubo3d', caixa);
    this.vista = Object.assign({}, VISTA_PADRAO);
    this.els = [];
    this.T = 48;
    this.mascara = 'tudo';
    this.arrastar();
    const medir = () => {
      const w = Math.min(caixa.clientWidth, caixa.clientHeight || caixa.clientWidth);
      const T = Math.max(26, Math.min(72, Math.floor(w / 5.1)));
      if (T !== this.T) { this.T = T; this.raiz.style.setProperty('--t', T + 'px'); this.posicionar(); }
    };
    this.raiz.style.setProperty('--t', this.T + 'px');
    if (window.ResizeObserver) new ResizeObserver(medir).observe(caixa);
    window.addEventListener('resize', medir);
    this.medir = medir;
    this.aplicarVista();
  }

  Visor.prototype.montar = function () {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    let html = '';
    for (const peca of this.cubo.pecas) {
      html += '<div class="peca">';
      for (const f of faces) {
        const n = C.NORMAL[f];
        const temAdesivo = peca.adesivos.some(a => a.n0[0] === n[0] && a.n0[1] === n[1] && a.n0[2] === n[2]);
        html += '<div class="face f-' + f + '">' + (temAdesivo ? '<i data-f="' + f + '"></i>' : '') + '</div>';
      }
      html += '</div>';
    }
    this.raiz.innerHTML = html;
    this.els = $$('.peca', this.raiz);
  };

  Visor.prototype.definir = function (cubo, mascara) {
    this.cubo = cubo;
    if (mascara) this.mascara = mascara;
    if (!this.els.length) this.montar();
    this.colorir();
    this.posicionar();
  };

  Visor.prototype.colorir = function () {
    this.cubo.pecas.forEach((peca, i) => {
      for (const marca of this.els[i].querySelectorAll('i')) {
        const n = C.NORMAL[marca.dataset.f];
        const a = peca.adesivos.find(x => x.n0[0] === n[0] && x.n0[1] === n[1] && x.n0[2] === n[2]);
        marca.style.background = Des.corVisivel({ casa: peca.casa, cor: a.cor }, this.mascara);
      }
    });
  };

  Visor.prototype.posicionar = function () {
    if (!this.cubo) return;
    this.cubo.pecas.forEach((peca, i) => { this.els[i].style.transform = matriz(peca, this.T); });
  };

  Visor.prototype.animar = function (lance, ms) {
    return new Promise(fim => {
      const mover = C.pecasDoLance(this.cubo, lance).map(p => this.cubo.pecas.indexOf(p));
      const angulo = lance.quartos * Math.PI / 2;
      const t0 = performance.now();
      const quadro = agora => {
        const t = Math.min(1, (agora - t0) / ms);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const R = rotacao(lance.eixo, angulo * e);
        for (const i of mover) this.els[i].style.transform = matriz(this.cubo.pecas[i], this.T, R);
        if (t < 1) requestAnimationFrame(quadro);
        else {
          C.aplicarLance(this.cubo, lance);
          for (const i of mover) this.els[i].style.transform = matriz(this.cubo.pecas[i], this.T);
          fim();
        }
      };
      requestAnimationFrame(quadro);
    });
  };

  Visor.prototype.aplicarVista = function () {
    this.raiz.style.transform = 'rotateX(' + this.vista.x + 'deg) rotateY(' + this.vista.y + 'deg)';
  };
  Visor.prototype.vistaPadrao = function () {
    this.vista = Object.assign({}, VISTA_PADRAO);
    this.aplicarVista();
  };

  Visor.prototype.arrastar = function () {
    let ini = null;
    this.caixa.addEventListener('pointerdown', e => {
      ini = { x: e.clientX, y: e.clientY, vx: this.vista.x, vy: this.vista.y };
      this.caixa.setPointerCapture(e.pointerId);
      this.caixa.classList.add('arrastando');
    });
    this.caixa.addEventListener('pointermove', e => {
      if (!ini) return;
      this.vista.y = ini.vy + (e.clientX - ini.x) * 0.5;
      this.vista.x = Math.max(-85, Math.min(85, ini.vx - (e.clientY - ini.y) * 0.5));
      this.aplicarVista();
    });
    const soltar = () => { ini = null; this.caixa.classList.remove('arrastando'); };
    this.caixa.addEventListener('pointerup', soltar);
    this.caixa.addEventListener('pointercancel', soltar);
    this.caixa.addEventListener('dblclick', () => this.vistaPadrao());
  };

  // =====================================================================
  // Explicação de cada movimento
  // =====================================================================
  const NOME_FACE = { R: 'da direita', L: 'da esquerda', U: 'de cima', D: 'de baixo', F: 'da frente', B: 'de trás' };
  function descrever(l) {
    const v = ((l.vezes % 4) + 4) % 4;
    const sentido = v === 2 ? 'meia volta' : v === 1 ? 'sentido horário' : 'sentido anti-horário';
    const b = l.base;
    if ('RLUDFB'.includes(b)) return 'Face ' + NOME_FACE[b] + ', ' + sentido;
    if ('rludfb'.includes(b)) return 'Duas camadas ' + NOME_FACE[b.toUpperCase()] + ', ' + sentido;
    if (b === 'M') return 'Camada do meio (entre esquerda e direita), ' + sentido + ' como o L';
    if (b === 'E') return 'Camada do meio (entre cima e baixo), ' + sentido + ' como o D';
    if (b === 'S') return 'Camada do meio (entre frente e trás), ' + sentido + ' como o F';
    const como = { x: 'R', y: 'U', z: 'F' }[b];
    return 'Gire o cubo inteiro como o ' + como + (v === 2 ? '2' : v === 3 ? "'" : '') + ' (nenhuma peça muda de lugar)';
  }

  // =====================================================================
  // Player (janela com o cubo e os controles)
  // =====================================================================
  const VELOCIDADES = [{ nome: '0,5×', ms: 620 }, { nome: '1×', ms: 360 }, { nome: '2×', ms: 190 }];
  const Player = (function () {
    const raiz = $('#player');
    const visor = new Visor($('#p-visor'));
    let caso = null, lances = [], i = 0, tocando = false, ocupado = false;
    let vel = lerSalvo('cubo-velocidade', 1);
    let todasCores = false;

    function abrir(id) {
      caso = CASOS.get(id);
      if (!caso) return;
      lances = C.ler(caso.alg);
      i = 0; tocando = false;
      $('#p-titulo').textContent = caso.titulo || caso.nome;
      $('#p-texto').textContent = caso.texto || '';
      $('#p-texto').hidden = !caso.texto;
      $('#p-alg').innerHTML = lances.map((l, k) => '<button type="button" class="lance" data-k="' + k + '">' + esc(l.texto) + '</button>').join('');
      todasCores = false;
      $('#p-cores').checked = false;
      $('#p-cores-linha').hidden = caso.mascara === 'tudo';
      raiz.hidden = false;
      document.body.classList.add('com-player');
      visor.vistaPadrao();
      visor.definir(estadoInicial(caso), caso.mascara);
      requestAnimationFrame(() => visor.medir());
      atualizar();
      if (!history.state || !history.state.player) history.pushState({ player: true }, '');
      $('#p-play').focus({ preventScroll: true });
    }

    function fechar(deHistorico) {
      if (raiz.hidden) return;
      tocando = false;
      raiz.hidden = true;
      document.body.classList.remove('com-player');
      if (!deHistorico && history.state && history.state.player) history.back();
    }

    function atualizar() {
      const n = lances.length;
      $$('.lance', raiz).forEach((b, k) => {
        b.classList.toggle('feito', k < i - 1);
        b.classList.toggle('atual', k === i - 1);
      });
      const atual = $('.lance.atual', raiz);
      if (atual) atual.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      $('#p-contador').textContent = i === 0 ? 'Situação inicial · ' + n + ' movimento' + (n === 1 ? '' : 's') : 'Movimento ' + i + ' de ' + n;
      $('#p-desc').textContent = i === 0 ? 'Toque em ▶ para ver o algoritmo, ou arraste o cubo para olhar de outro lado.' : descrever(lances[i - 1]) + (i === n && caso.inicio === undefined ? '. Pronto!' : '');
      $('#p-play').innerHTML = tocando ? ICONES.pausa : ICONES.play;
      $('#p-play').setAttribute('aria-label', tocando ? 'Pausar' : (i >= n ? 'Ver de novo' : 'Tocar'));
      $('#p-voltar').disabled = i === 0;
      $('#p-avancar').disabled = i >= n;
      $('#p-vel').textContent = VELOCIDADES[vel].nome;
    }

    async function passo() {
      if (i >= lances.length) return;
      const l = lances[i];
      const ms = VELOCIDADES[vel].ms * (Math.abs(l.vezes) === 2 ? 1.45 : 1);
      i++;
      atualizar();
      await visor.animar(l, ms);
    }

    async function executar(fn) {
      if (ocupado) return;
      ocupado = true;
      try { await fn(); } finally { ocupado = false; atualizar(); }
    }

    function tocar() {
      if (tocando) { tocando = false; atualizar(); return; }
      if (ocupado) return;
      if (i >= lances.length) irPara(0);
      tocando = true;
      executar(async () => {
        while (tocando && i < lances.length && !raiz.hidden) {
          await passo();
          if (tocando && i < lances.length) await new Promise(r => setTimeout(r, VELOCIDADES[vel].ms * 0.18));
        }
        tocando = false;
      });
    }

    function irPara(k) {
      tocando = false;
      const c = estadoInicial(caso);
      C.aplicar(c, lances.slice(0, k));
      i = k;
      visor.definir(c);
      atualizar();
    }

    raiz.addEventListener('click', e => {
      if (e.target === raiz || e.target.closest('[data-fechar]')) return fechar();
      const lance = e.target.closest('.lance');
      if (lance && !ocupado) {
        const k = +lance.dataset.k;
        irPara(k);
        executar(passo);
      }
    });
    $('#p-play').addEventListener('click', tocar);
    $('#p-avancar').addEventListener('click', () => { tocando = false; executar(passo); });
    $('#p-voltar').addEventListener('click', () => {
      tocando = false;
      executar(async () => {
        if (i === 0) return;
        i--;
        const l = lances[i];
        await visor.animar(C.criarLance(l.base, -l.vezes), VELOCIDADES[vel].ms * (Math.abs(l.vezes) === 2 ? 1.45 : 1));
      });
    });
    $('#p-inicio').addEventListener('click', () => { if (!ocupado) irPara(0); else tocando = false; });
    $('#p-vel').addEventListener('click', () => { vel = (vel + 1) % VELOCIDADES.length; guardar('cubo-velocidade', vel); atualizar(); });
    $('#p-vista').addEventListener('click', () => visor.vistaPadrao());
    $('#p-cores').addEventListener('change', e => {
      todasCores = e.target.checked;
      visor.mascara = todasCores ? 'tudo' : caso.mascara;
      visor.colorir();
    });
    window.addEventListener('popstate', () => fechar(true));
    document.addEventListener('keydown', e => {
      if (raiz.hidden) return;
      if (e.key === 'Escape') fechar();
      else if (e.key === 'ArrowRight') { e.preventDefault(); tocando = false; executar(passo); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); $('#p-voltar').click(); }
      else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); tocar(); }
    });

    return { abrir, fechar };
  })();

  // =====================================================================
  // Pedaços de HTML
  // =====================================================================
  const ICONES = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>',
  };

  function cartaoCaso(caso, opcoes) {
    opcoes = opcoes || {};
    return '<button type="button" class="caso" data-caso="' + caso.id + '">' +
      '<span class="mini">' + miniatura(caso) + '</span>' +
      '<span class="caso-info">' +
      (caso.nome && !opcoes.semNome ? '<strong>' + esc(caso.nome) + '</strong>' : '') +
      '<code class="alg">' + esc(caso.alg) + '</code>' +
      (caso.texto && !opcoes.semTexto ? '<span class="caso-texto">' + esc(caso.texto) + '</span>' : '') +
      '</span><span class="caso-play" aria-hidden="true">' + ICONES.play + '</span></button>';
  }

  function carta(caso, nome) {
    return '<button type="button" class="carta" data-caso="' + caso.id + '">' +
      '<span class="mini">' + miniatura(caso) + '</span>' +
      (nome ? '<strong>' + esc(nome) + '</strong>' : '') +
      '<code class="alg">' + esc(caso.alg) + '</code></button>';
  }

  const paragrafos = lista => lista.map(t => '<p>' + esc(t) + '</p>').join('');

  // =====================================================================
  // Telas
  // =====================================================================
  const CORES_PASSO = ['#f4f5f7', '#f4f5f7', '#16b35a', '#ffd60a', '#ffd60a', '#ffd60a', '#ffd60a'];

  function telaInicio() {
    return '' +
      '<section class="bloco">' +
      '<h2>Por onde começar</h2>' +
      '<div class="metodos">' +
      '<a class="metodo" href="#camadas" style="--cor:#16b35a"><span class="metodo-tag">Iniciante</span><strong>Método por camadas</strong><span>7 passos e 6 algoritmos curtos. Comece aqui se você nunca montou um cubo.</span></a>' +
      '<a class="metodo" href="#cfop" style="--cor:#ff8a1c"><span class="metodo-tag">Rápido</span><strong>CFOP</strong><span>O método dos speedcubers. Comece pelo 2-look (16 algoritmos) e depois vá para o completo.</span></a>' +
      '</div></section>' +
      '<section class="bloco">' +
      '<h2>Como ler os movimentos</h2>' +
      '<p>Cada letra é uma face do cubo. Olhe para a face e gire no sentido do relógio. O apóstrofo (\') gira ao contrário e o 2 é meia volta.</p>' +
      '<p class="nota">Nos desenhos e no cubo 3D o amarelo fica em cima e o verde na frente. Toque num movimento para ver ele no cubo.</p>' +
      '<div class="grade-notacao">' + D.notacao.map(n => {
        const caso = CASOS.get('not-' + n.alg);
        return '<button type="button" class="carta carta-notacao" data-caso="' + caso.id + '"><span class="mini">' + miniatura(caso) + '</span><strong class="letra">' + esc(n.alg) + '</strong><span class="carta-texto">' + esc(n.texto) + '</span></button>';
      }).join('') + '</div></section>' +
      '<section class="bloco">' +
      '<h2>Cores do cubo</h2>' +
      '<p>Os centros nunca saem do lugar: são eles que dizem a cor de cada face. O branco fica oposto ao amarelo, o verde ao azul e o vermelho ao laranja.</p>' +
      '<p>Se o seu cubo tiver as cores em outra ordem, tudo funciona do mesmo jeito. É só trocar as cores na cabeça.</p>' +
      '</section>';
  }

  function telaCamadas() {
    return '' +
      '<section class="bloco intro">' +
      '<h2>Método por camadas</h2>' +
      '<p>Você monta o cubo de baixo para cima: primeiro a face branca, depois a camada do meio e por último a amarela. São 7 passos.</p>' +
      '<nav class="indice" aria-label="Passos">' + D.camadas.map((p, i) => '<a href="#camadas/' + p.id + '"><span style="--cor:' + CORES_PASSO[i] + '">' + (i + 1) + '</span>' + esc(p.titulo) + '</a>').join('') + '</nav>' +
      '</section>' +
      D.camadas.map((p, i) => '' +
        '<article class="bloco passo" id="passo-' + p.id + '">' +
        '<header class="passo-topo"><span class="num" style="--cor:' + CORES_PASSO[i] + '">' + (i + 1) + '</span><div><h3>' + esc(p.titulo) + '</h3><p class="objetivo">' + esc(p.objetivo) + '</p></div></header>' +
        paragrafos(p.texto) +
        (p.algoritmo ? '<div class="alg-destaque"><span>Algoritmo</span><code class="alg">' + esc(p.algoritmo) + '</code></div>' : '') +
        '<div class="casos">' + p.casos.map((c, j) => cartaoCaso(CASOS.get('cam-' + p.id + '-' + j))).join('') + '</div>' +
        (p.dica ? '<p class="dica"><strong>Dica:</strong> ' + esc(p.dica) + '</p>' : '') +
        '</article>').join('') +
      '<section class="bloco fim"><h3>Montou?</h3><p>Agora é treinar até fazer sem olhar. Quando quiser ir mais rápido, passe para o <a href="#cfop">CFOP</a>.</p></section>';
  }

  const SUB_CFOP = [
    ['visao', 'Visão geral'], ['cruz', 'Cruz'], ['f2l', 'F2L'], ['oll2', 'OLL 2-look'], ['pll2', 'PLL 2-look'], ['oll', 'OLL completo'], ['pll', 'PLL completo'],
  ];

  function telaCfop(sub) {
    if (!SUB_CFOP.some(s => s[0] === sub)) sub = 'visao';
    const nav = '<nav class="subnav" aria-label="Partes do CFOP">' + SUB_CFOP.map(([id, nome]) => '<a href="#cfop/' + id + '"' + (id === sub ? ' aria-current="page"' : '') + '>' + nome + '</a>').join('') + '</nav>';
    return nav + ({ visao: cfopVisao, cruz: cfopCruz, f2l: cfopF2l, oll2: cfopOll2, pll2: cfopPll2, oll: cfopOll, pll: cfopPll }[sub])();
  }

  function cfopVisao() {
    const etapas = [
      ['cruz', 'C', 'Cruz', 'A cruz branca na face de baixo.', '#f4f5f7'],
      ['f2l', 'F', 'F2L', 'As duas primeiras camadas, um par de cada vez (4 pares).', '#16b35a'],
      ['oll2', 'O', 'OLL', 'Deixa a face de cima toda amarela.', '#ffd60a'],
      ['pll2', 'P', 'PLL', 'Coloca as peças de cima no lugar e termina o cubo.', '#ff8a1c'],
    ];
    return '<section class="bloco intro"><h2>CFOP</h2>' +
      '<p>CFOP (ou método Fridrich) é o método que quase todos os speedcubers usam. O nome vem das 4 etapas: Cruz, F2L, OLL e PLL.</p>' +
      '<div class="etapas">' + etapas.map(e => '<a class="etapa" href="#cfop/' + e[0] + '" style="--cor:' + e[4] + '"><span class="etapa-letra">' + e[1] + '</span><span><strong>' + e[2] + '</strong>' + esc(e[3]) + '</span></a>').join('') + '</div></section>' +
      '<section class="bloco"><h3>Qual caminho seguir</h3>' +
      '<ol class="caminho">' +
      '<li><strong>Saiba o método por camadas.</strong> O CFOP usa a mesma cruz, e o F2L é uma versão mais esperta dos passos 2 e 3.</li>' +
      '<li><strong>Aprenda o F2L intuitivo.</strong> Entenda os 4 encaixes básicos e tente levar o canto e a aresta até um deles.</li>' +
      '<li><strong>Decore o 2-look.</strong> São 10 algoritmos de OLL e 6 de PLL. Com eles você já resolve qualquer cubo pelo CFOP.</li>' +
      '<li><strong>Vá para o completo aos poucos.</strong> 57 OLL e 21 PLL fazem a última camada em 2 algoritmos. Comece pelos PLL, que são menos.</li>' +
      '</ol></section>';
  }

  function cfopCruz() {
    return '<section class="bloco"><h2>Cruz</h2>' + paragrafos(D.cruzCfop.texto) +
      '<p>Os casos da cruz são os mesmos do método por camadas:</p>' +
      '<div class="casos">' + D.camadas[0].casos.map((c, j) => cartaoCaso(CASOS.get('cam-cruz-' + j))).join('') + '</div></section>';
  }

  function cfopF2l() {
    return '<section class="bloco"><h2>F2L</h2>' + paragrafos(D.f2lIntro.texto) +
      '<h3>Os 4 encaixes básicos</h3><div class="casos">' + D.f2lIntro.basicos.map((c, j) => cartaoCaso(CASOS.get('f2lb-' + j))).join('') + '</div></section>' +
      '<section class="bloco"><h2>Os 41 casos</h2><p class="nota">Use como consulta quando travar num caso. As peças cinza (da camada de cima) não importam aqui. Procure o canto branco e a aresta do par da frente à direita.</p>' +
      GRUPOS_F2L.map(([g, nome]) => '<h3>' + esc(nome) + '</h3><div class="grade">' + F2L.filter(c => c.grupo === g).map(c => carta(c)).join('') + '</div>').join('') +
      '</section>';
  }

  function cfopOll2() {
    return '<section class="bloco"><h2>OLL em duas partes</h2>' +
      '<p>Primeiro você faz a cruz amarela (orientar as arestas). Depois vira os cantos até a face de cima ficar toda amarela.</p></section>' +
      '<section class="bloco"><h3>1. Cruz amarela</h3><p class="nota">Só as arestas importam aqui. Os cantos (cinza) podem estar de qualquer jeito.</p>' +
      '<div class="casos">' + OLL2A.map(c => cartaoCaso(c)).join('') + '</div></section>' +
      '<section class="bloco"><h3>2. Cantos amarelos</h3><p class="nota">Com a cruz pronta, sobram 7 casos. Olhe para onde aponta o amarelo dos cantos.</p>' +
      '<div class="grade">' + OLL2C.map(c => carta(c, c.grupo.replace(/^Cruz \((.*)\)$/, '$1').replace(/^./, l => l.toUpperCase()) + ' · ' + c.nome)).join('') + '</div></section>';
  }

  function cfopPll2() {
    return '<section class="bloco"><h2>PLL em duas partes</h2>' +
      '<p>Primeiro você coloca os cantos de cima no lugar, depois as arestas. As setas mostram para onde cada peça vai.</p></section>' +
      '<section class="bloco"><h3>1. Cantos</h3><p class="nota">Procure "faróis": dois cantos vizinhos com a mesma cor no mesmo lado. Se os 4 lados têm faróis, os cantos já estão certos.</p>' +
      '<div class="casos">' + PLL2C.map(c => cartaoCaso(c)).join('') + '</div></section>' +
      '<section class="bloco"><h3>2. Arestas</h3><p class="nota">Com os cantos certos, sobram 4 casos.</p>' +
      '<div class="grade">' + PLL2A.map(c => carta(c, c.nome)).join('') + '</div></section>';
  }

  function porGrupo(lista, nomeCarta) {
    const grupos = [];
    for (const c of lista) {
      let g = grupos.find(x => x.nome === c.grupo);
      if (!g) grupos.push(g = { nome: c.grupo, casos: [] });
      g.casos.push(c);
    }
    return grupos.map(g => '<h3>' + esc(g.nome) + ' <span class="conta">' + g.casos.length + '</span></h3><div class="grade">' + g.casos.map(c => carta(c, nomeCarta(c))).join('') + '</div>').join('');
  }

  function cfopOll() {
    const ordem = ['Cruz (Sune)', 'Cruz (Antisune)', 'Cruz (H)', 'Cruz (Pi)', 'Cruz (faróis)', 'Cruz (T)', 'Cruz (gravata)', 'Cantos certos', 'Ponto', 'Linha', 'L pequeno', 'Quadrado', 'Raio pequeno', 'Raio grande', 'Peixe', 'Cavalo', 'P', 'T', 'C', 'W', 'Estranho'];
    const lista = OLL.slice().sort((a, b) => ordem.indexOf(a.grupo) - ordem.indexOf(b.grupo) || a.numero - b.numero)
      .map(c => Object.assign(Object.create(c), { grupo: c.grupo.startsWith('Cruz') ? 'Cruz pronta (só cantos)' : c.grupo }));
    return '<section class="bloco"><h2>OLL completo</h2><p>Os 57 casos deixam a face de cima amarela de uma vez. O desenho mostra só o amarelo: as outras cores não importam nessa etapa.</p>' +
      porGrupo(lista, c => c.nome) + '</section>';
  }

  function cfopPll() {
    return '<section class="bloco"><h2>PLL completo</h2><p>Os 21 casos terminam o cubo de uma vez. As setas mostram para onde cada peça vai (seta dos dois lados: as peças trocam de lugar).</p>' +
      porGrupo(PLL, c => c.curto) + '</section>';
  }

  // ---------- Treino ----------
  const CONJUNTOS = [
    { id: 'oll2', nome: 'OLL 2-look', casos: () => OLL2A.concat(OLL2C) },
    { id: 'pll2', nome: 'PLL 2-look', casos: () => PLL2C.concat(PLL2A) },
    { id: 'f2l', nome: 'F2L', casos: () => F2L },
    { id: 'oll', nome: 'OLL completo', casos: () => OLL },
    { id: 'pll', nome: 'PLL completo', casos: () => PLL },
  ];
  const treino = { conj: lerSalvo('cubo-treino-conj', 'pll2'), atual: null, revelado: false, anterior: null };
  let placar = lerSalvo('cubo-treino', {});

  function sortear() {
    const conj = CONJUNTOS.find(c => c.id === treino.conj) || CONJUNTOS[0];
    const casos = conj.casos().filter(c => c.id !== treino.anterior || conj.casos().length === 1);
    const peso = c => { const p = placar[c.id] || { a: 0, e: 0 }; return Math.max(0.25, 1 + 2 * p.e - 0.5 * p.a); };
    const total = casos.reduce((s, c) => s + peso(c), 0);
    let r = Math.random() * total;
    for (const c of casos) { r -= peso(c); if (r <= 0) return c; }
    return casos[casos.length - 1];
  }

  function telaTreino() {
    if (!treino.atual || !CONJUNTOS.find(c => c.id === treino.conj).casos().includes(treino.atual)) { treino.atual = sortear(); treino.revelado = false; }
    const conj = CONJUNTOS.find(c => c.id === treino.conj);
    const c = treino.atual;
    const ids = conj.casos().map(x => x.id);
    const soma = ids.reduce((s, id) => { const p = placar[id]; if (p) { s.a += p.a; s.e += p.e; } return s; }, { a: 0, e: 0 });
    const nome = c.grupo && conj.id === 'f2l' ? GRUPOS_F2L.find(g => g[0] === c.grupo)[1] : (c.titulo || c.nome);
    return '<section class="bloco"><h2>Treino de algoritmos</h2><p>Veja o caso, tente lembrar o algoritmo e só depois confira. Os casos que você erra aparecem mais vezes.</p>' +
      '<div class="chips" role="group" aria-label="Conjunto">' + CONJUNTOS.map(x => '<button type="button" class="chip" data-conj="' + x.id + '" aria-pressed="' + (x.id === conj.id) + '">' + x.nome + '</button>').join('') + '</div></section>' +
      '<section class="bloco treino">' +
      '<div class="treino-mini">' + miniatura(c) + '</div>' +
      (treino.revelado
        ? '<div class="treino-resposta"><strong>' + esc(nome) + '</strong><code class="alg">' + esc(c.alg) + '</code></div>' +
          '<div class="treino-botoes"><button type="button" class="botao ruim" data-treino="errei">Errei</button><button type="button" class="botao bom" data-treino="acertei">Acertei</button></div>' +
          '<button type="button" class="link" data-caso="' + c.id + '">Ver no cubo</button>'
        : '<p class="treino-pergunta">Qual algoritmo resolve este caso?</p>' +
          '<div class="treino-botoes"><button type="button" class="botao" data-treino="revelar">Mostrar resposta</button></div>') +
      '</section>' +
      '<section class="bloco placar"><p><strong>' + soma.a + '</strong> acertos · <strong>' + soma.e + '</strong> erros em ' + conj.nome + '</p>' +
      (soma.a + soma.e ? '<button type="button" class="link" data-treino="zerar">Zerar este conjunto</button>' : '') + '</section>';
  }

  function acaoTreino(acao) {
    if (acao === 'revelar') treino.revelado = true;
    else if (acao === 'acertei' || acao === 'errei') {
      const p = placar[treino.atual.id] || { a: 0, e: 0 };
      if (acao === 'acertei') p.a++; else p.e++;
      placar[treino.atual.id] = p;
      guardar('cubo-treino', placar);
      treino.anterior = treino.atual.id;
      treino.atual = sortear();
      treino.revelado = false;
    } else if (acao === 'zerar') {
      if (!confirm('Zerar acertos e erros deste conjunto?')) return;
      for (const c of CONJUNTOS.find(x => x.id === treino.conj).casos()) delete placar[c.id];
      guardar('cubo-treino', placar);
    }
    desenharTela();
  }

  // ---------- Cronômetro ----------
  const crono = { estado: 'parado', inicio: 0, quadro: 0, segurar: 0, emb: C.embaralhamento(20), ignorar: false };
  let tempos = lerSalvo('cubo-tempos', []);

  function formatar(ms) {
    if (ms == null) return '—';
    const cs = Math.floor(ms / 10);
    const min = Math.floor(cs / 6000), seg = Math.floor(cs / 100) % 60, c = cs % 100;
    return (min ? min + ':' + String(seg).padStart(2, '0') : seg) + ',' + String(c).padStart(2, '0');
  }

  function media(n) {
    if (tempos.length < n) return null;
    const ult = tempos.slice(-n).map(t => t.ms).sort((a, b) => a - b).slice(1, -1);
    return ult.reduce((s, v) => s + v, 0) / ult.length;
  }

  function telaCrono() {
    const melhor = tempos.length ? Math.min(...tempos.map(t => t.ms)) : null;
    const embCubo = C.aplicar(C.novo(), 'z2 ' + crono.emb);
    return '<section class="bloco crono">' +
      '<div class="emb"><code class="alg" id="emb">' + esc(crono.emb) + '</code><button type="button" class="botao-icone" id="novo-emb" aria-label="Novo embaralhamento" title="Novo embaralhamento"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="emb-rede">' + Des.rede(embCubo) + '<p class="nota">Embaralhe com o branco em cima e o verde na frente. O desenho mostra como o cubo deve ficar.</p></div>' +
      '<button type="button" class="crono-area" id="crono-area" data-estado="parado"><span class="crono-tempo" id="crono-tempo">' + formatar(tempos.length ? tempos[tempos.length - 1].ms : 0) + '</span><span class="crono-dica" id="crono-dica">Segure até ficar verde e solte para começar</span></button>' +
      '<p class="nota centro">No computador, use a barra de espaço.</p>' +
      '</section>' +
      '<section class="bloco"><div class="medias">' +
      '<div><span>Melhor</span><strong>' + formatar(melhor) + '</strong></div>' +
      '<div><span>Média de 5</span><strong>' + formatar(media(5)) + '</strong></div>' +
      '<div><span>Média de 12</span><strong>' + formatar(media(12)) + '</strong></div>' +
      '<div><span>Tempos</span><strong>' + tempos.length + '</strong></div>' +
      '</div>' +
      (tempos.length
        ? '<ol class="tempos" reversed>' + tempos.slice().reverse().map((t, k) => '<li><span class="t">' + formatar(t.ms) + '</span><code class="emb-mini">' + esc(t.emb) + '</code><button type="button" class="apagar" data-apagar="' + (tempos.length - 1 - k) + '" aria-label="Apagar este tempo">×</button></li>').join('') + '</ol>' +
          '<button type="button" class="link" id="apagar-todos">Apagar todos os tempos</button>'
        : '<p class="nota">Seus tempos aparecem aqui. As médias de 5 e de 12 tiram o melhor e o pior tempo, como nas competições.</p>') +
      '</section>';
  }

  function cronoMostrar() {
    const el = $('#crono-tempo');
    if (el) el.textContent = formatar(performance.now() - crono.inicio);
    crono.quadro = requestAnimationFrame(cronoMostrar);
  }

  function cronoEstado(estado) {
    crono.estado = estado;
    const area = $('#crono-area');
    if (area) area.dataset.estado = estado;
    document.body.classList.toggle('cronometrando', estado === 'rodando' || estado === 'pronto' || estado === 'segurando');
    const dica = $('#crono-dica');
    if (dica) dica.textContent = { parado: 'Segure até ficar verde e solte para começar', segurando: 'Continue segurando…', pronto: 'Solte para começar', rodando: 'Toque em qualquer lugar para parar' }[estado];
  }

  function cronoApertar() {
    if (crono.estado === 'rodando') return cronoParar();
    if (crono.estado !== 'parado') return;
    cronoEstado('segurando');
    $('#crono-tempo').textContent = formatar(0);
    crono.segurar = setTimeout(() => cronoEstado('pronto'), 350);
  }

  function cronoSoltar() {
    if (crono.ignorar) { crono.ignorar = false; return; }
    clearTimeout(crono.segurar);
    if (crono.estado === 'pronto') {
      crono.inicio = performance.now();
      cronoEstado('rodando');
      cronoMostrar();
    } else if (crono.estado === 'segurando') {
      cronoEstado('parado');
      $('#crono-tempo').textContent = formatar(tempos.length ? tempos[tempos.length - 1].ms : 0);
    }
  }

  function cronoParar() {
    const ms = Math.round(performance.now() - crono.inicio);
    cancelAnimationFrame(crono.quadro);
    crono.ignorar = true;
    tempos.push({ ms, emb: crono.emb, data: new Date().toISOString() });
    guardar('cubo-tempos', tempos);
    crono.emb = C.embaralhamento(20);
    cronoEstado('parado');
    desenharTela();
  }

  document.addEventListener('pointerdown', e => {
    if (rota().tela !== 'crono' || !$('#player').hidden) return;
    if (crono.estado === 'rodando') { e.preventDefault(); cronoParar(); return; }
    if (e.target.closest('#crono-area')) { e.preventDefault(); cronoApertar(); }
  });
  document.addEventListener('pointerup', () => { if (rota().tela === 'crono') cronoSoltar(); });
  document.addEventListener('pointercancel', () => { if (rota().tela === 'crono' && crono.estado !== 'rodando') { clearTimeout(crono.segurar); cronoEstado('parado'); } });
  document.addEventListener('keydown', e => {
    if (rota().tela !== 'crono' || !$('#player').hidden) return;
    if (crono.estado === 'rodando') { e.preventDefault(); cronoParar(); return; }
    if (e.key === ' ' && !e.repeat) { e.preventDefault(); cronoApertar(); }
  });
  document.addEventListener('keyup', e => {
    if (rota().tela === 'crono' && e.key === ' ') { e.preventDefault(); cronoSoltar(); }
  });

  // =====================================================================
  // Navegação
  // =====================================================================
  const TELAS = { inicio: telaInicio, camadas: telaCamadas, cfop: telaCfop, treino: telaTreino, crono: telaCrono };
  function rota() {
    const [tela, sub] = location.hash.replace(/^#/, '').split('/');
    return { tela: TELAS[tela] ? tela : 'inicio', sub };
  }

  function desenharTela(rolarParaTopo) {
    const { tela, sub } = rota();
    const main = $('#tela');
    const y = window.scrollY;
    main.innerHTML = tela === 'cfop' ? telaCfop(sub) : TELAS[tela]();
    main.dataset.tela = tela;
    $$('.abas a').forEach(a => a.setAttribute('aria-current', a.dataset.tela === tela ? 'page' : 'false'));
    document.title = { inicio: 'Cubo Mágico', camadas: 'Método por camadas · Cubo Mágico', cfop: 'CFOP · Cubo Mágico', treino: 'Treino · Cubo Mágico', crono: 'Cronômetro · Cubo Mágico' }[tela];
    if (tela === 'camadas' && sub && rolarParaTopo) {
      const alvo = $('#passo-' + sub);
      if (alvo) { alvo.scrollIntoView({ block: 'start' }); return; }
    }
    if (rolarParaTopo) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
    if (tela === 'cfop') {
      const ativo = $('.subnav [aria-current]');
      if (ativo) ativo.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  window.addEventListener('hashchange', () => {
    Player.fechar(true);
    guardar('cubo-tela', location.hash);
    desenharTela(true);
  });

  document.addEventListener('click', e => {
    const caso = e.target.closest('[data-caso]');
    if (caso && !e.target.closest('#player')) { Player.abrir(caso.dataset.caso); return; }
    const conj = e.target.closest('[data-conj]');
    if (conj) { treino.conj = conj.dataset.conj; guardar('cubo-treino-conj', treino.conj); treino.atual = null; treino.anterior = null; desenharTela(); return; }
    const t = e.target.closest('[data-treino]');
    if (t) { acaoTreino(t.dataset.treino); return; }
    if (e.target.closest('#novo-emb')) { crono.emb = C.embaralhamento(20); desenharTela(); return; }
    const apagar = e.target.closest('[data-apagar]');
    if (apagar) {
      tempos.splice(+apagar.dataset.apagar, 1);
      guardar('cubo-tempos', tempos);
      desenharTela();
      return;
    }
    if (e.target.closest('#apagar-todos') && confirm('Apagar todos os tempos?')) { tempos = []; guardar('cubo-tempos', tempos); desenharTela(); }
  });

  $('#logo').innerHTML = Des.iso(C.aplicar(C.novo(), "R U R' U'"), 'tudo');
  if (!location.hash) {
    const salvo = lerSalvo('cubo-tela', '');
    if (salvo && salvo !== '#') history.replaceState(null, '', salvo);
  }
  desenharTela(true);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
