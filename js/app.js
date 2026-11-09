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
    else window.addEventListener('resize', medir);
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
  Visor.prototype.olhar = function (vista, suave) {
    this.vista = Object.assign({}, vista);
    if (suave) {
      this.raiz.classList.add('suave');
      clearTimeout(this.tempoSuave);
      this.tempoSuave = setTimeout(() => this.raiz.classList.remove('suave'), 450);
    }
    this.aplicarVista();
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
  // Tocador: cubo 3D + algoritmo + controles (usado no player e no "Meu cubo")
  // =====================================================================
  const ICONES = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>',
    inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 6.2v11.6a.9.9 0 0 1-1.4.75L9.3 12.75a.9.9 0 0 1 0-1.5l8.3-5.8A.9.9 0 0 1 19 6.2z"/></svg>',
    voltar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6.2v11.6a.9.9 0 0 1-1.4.75L6.3 12.75a.9.9 0 0 1 0-1.5l8.3-5.8A.9.9 0 0 1 16 6.2z"/></svg>',
    avancar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.2v11.6a.9.9 0 0 0 1.4.75l8.3-5.8a.9.9 0 0 0 0-1.5L9.4 5.45A.9.9 0 0 0 8 6.2z"/></svg>',
  };
  const VELOCIDADES = [{ nome: '0,5×', ms: 620 }, { nome: '1×', ms: 360 }, { nome: '2×', ms: 190 }];
  let velocidade = lerSalvo('cubo-velocidade', 1);

  function Tocador(raiz) {
    this.raiz = raiz;
    raiz.classList.add('tocador');
    raiz.innerHTML =
      '<div class="visor"></div>' +
      '<div class="p-info"><p class="t-contador"></p><p class="t-desc" aria-live="polite"></p></div>' +
      '<div class="p-alg"></div>' +
      '<div class="p-controles">' +
      '<button type="button" class="ctl" data-acao="inicio" aria-label="Voltar ao início">' + ICONES.inicio + '</button>' +
      '<button type="button" class="ctl" data-acao="voltar" aria-label="Movimento anterior">' + ICONES.voltar + '</button>' +
      '<button type="button" class="ctl grande" data-acao="play" aria-label="Tocar"></button>' +
      '<button type="button" class="ctl" data-acao="avancar" aria-label="Próximo movimento">' + ICONES.avancar + '</button>' +
      '<button type="button" class="ctl texto" data-acao="vel" aria-label="Velocidade"></button>' +
      '</div>' +
      '<div class="p-extra"><label class="t-cores-linha"><input type="checkbox" class="t-cores"> Mostrar todas as cores</label>' +
      '<button type="button" class="link" data-acao="vista">Endireitar o cubo</button></div>';
    this.visor = new Visor($('.visor', raiz));
    this.lances = [];
    this.i = 0;
    this.tocando = false;
    this.ocupado = false;
    raiz.addEventListener('click', e => {
      const lance = e.target.closest('.lance');
      if (lance) {
        if (this.ocupado) return;
        this.irPara(+lance.dataset.k);
        this.executar(() => this.passo());
        return;
      }
      const b = e.target.closest('[data-acao]');
      if (!b) return;
      const acao = b.dataset.acao;
      if (acao === 'play') this.tocar();
      else if (acao === 'avancar') { this.tocando = false; this.executar(() => this.passo()); }
      else if (acao === 'voltar') this.voltar();
      else if (acao === 'inicio') { if (!this.ocupado) this.irPara(0); else this.tocando = false; }
      else if (acao === 'vel') { velocidade = (velocidade + 1) % VELOCIDADES.length; guardar('cubo-velocidade', velocidade); this.atualizar(); }
      else if (acao === 'vista') this.visor.vistaPadrao();
    });
    $('.t-cores', raiz).addEventListener('change', e => {
      this.visor.mascara = e.target.checked ? 'tudo' : this.mascara;
      this.visor.colorir();
    });
  }

  // opcoes: { inicio (cubo), alg, mascara, fimTexto }
  Tocador.prototype.carregar = function (opcoes) {
    this.tocando = false;
    this.inicio = C.copiar(opcoes.inicio);
    this.lances = C.ler(opcoes.alg || '');
    this.mascara = opcoes.mascara || 'tudo';
    this.fimTexto = opcoes.fimTexto || '';
    this.i = 0;
    $('.p-alg', this.raiz).innerHTML = this.lances.map((l, k) => '<button type="button" class="lance" data-k="' + k + '">' + esc(l.texto) + '</button>').join('');
    $('.t-cores', this.raiz).checked = !!opcoes.todasCores;
    $('.t-cores-linha', this.raiz).hidden = this.mascara === 'tudo';
    this.visor.vistaPadrao();
    this.visor.definir(C.copiar(this.inicio), opcoes.todasCores ? 'tudo' : this.mascara);
    requestAnimationFrame(() => this.visor.medir());
    this.atualizar();
  };

  Tocador.prototype.atualizar = function () {
    const n = this.lances.length, i = this.i;
    $$('.lance', this.raiz).forEach((b, k) => {
      b.classList.toggle('feito', k < i - 1);
      b.classList.toggle('atual', k === i - 1);
    });
    const atual = $('.lance.atual', this.raiz);
    if (atual && atual.parentNode.scrollHeight > atual.parentNode.clientHeight) atual.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    $('.t-contador', this.raiz).textContent = i === 0 ? 'Situação inicial · ' + n + ' movimento' + (n === 1 ? '' : 's') : 'Movimento ' + i + ' de ' + n;
    $('.t-desc', this.raiz).textContent = i === 0
      ? 'Toque em ▶ para ver os movimentos, ou arraste o cubo para olhar de outro lado.'
      : descrever(this.lances[i - 1]) + (i === n ? '.' + this.fimTexto : '');
    const play = $('[data-acao="play"]', this.raiz);
    play.innerHTML = this.tocando ? ICONES.pausa : ICONES.play;
    play.setAttribute('aria-label', this.tocando ? 'Pausar' : (i >= n ? 'Ver de novo' : 'Tocar'));
    $('[data-acao="voltar"]', this.raiz).disabled = i === 0;
    $('[data-acao="avancar"]', this.raiz).disabled = i >= n;
    $('[data-acao="vel"]', this.raiz).textContent = VELOCIDADES[velocidade].nome;
  };

  const duracao = l => VELOCIDADES[velocidade].ms * (Math.abs(l.vezes) === 2 ? 1.45 : 1);

  Tocador.prototype.passo = async function () {
    if (this.i >= this.lances.length) return;
    const l = this.lances[this.i];
    this.i++;
    this.atualizar();
    await this.visor.animar(l, duracao(l));
  };

  Tocador.prototype.voltar = function () {
    this.tocando = false;
    this.executar(async () => {
      if (this.i === 0) return;
      this.i--;
      const l = this.lances[this.i];
      await this.visor.animar(C.criarLance(l.base, -l.vezes), duracao(l));
    });
  };

  Tocador.prototype.executar = async function (fn) {
    if (this.ocupado) return;
    this.ocupado = true;
    try { await fn(); } finally { this.ocupado = false; this.atualizar(); }
  };

  Tocador.prototype.tocar = function () {
    if (this.tocando) { this.tocando = false; this.atualizar(); return; }
    if (this.ocupado) return;
    if (this.i >= this.lances.length) this.irPara(0);
    if (!this.lances.length) return;
    this.tocando = true;
    this.executar(async () => {
      while (this.tocando && this.i < this.lances.length && this.raiz.isConnected && this.raiz.offsetParent) {
        await this.passo();
        if (this.tocando && this.i < this.lances.length) await new Promise(r => setTimeout(r, VELOCIDADES[velocidade].ms * 0.18));
      }
      this.tocando = false;
    });
  };

  Tocador.prototype.irPara = function (k) {
    this.tocando = false;
    const c = C.copiar(this.inicio);
    C.aplicar(c, this.lances.slice(0, k));
    this.i = k;
    this.visor.definir(c);
    this.atualizar();
  };

  Tocador.prototype.parar = function () { this.tocando = false; };

  Tocador.prototype.tecla = function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.tocando = false; this.executar(() => this.passo()); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.voltar(); }
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); this.tocar(); }
  };

  // =====================================================================
  // Player (janela com o cubo e os controles)
  // =====================================================================
  const Player = (function () {
    const raiz = $('#player');
    const toc = new Tocador($('#p-tocador'));

    function abrir(id) {
      const caso = CASOS.get(id);
      if (!caso) return;
      $('#p-titulo').textContent = caso.titulo || caso.nome;
      $('#p-texto').textContent = caso.texto || '';
      $('#p-texto').hidden = !caso.texto;
      raiz.hidden = false;
      document.body.classList.add('com-player');
      toc.carregar({ inicio: estadoInicial(caso), alg: caso.alg, mascara: caso.mascara, fimTexto: caso.inicio === undefined ? ' Pronto!' : '' });
      if (!history.state || !history.state.player) history.pushState({ player: true }, '');
      $('[data-acao="play"]', raiz).focus({ preventScroll: true });
    }

    function fechar(deHistorico) {
      if (raiz.hidden) return;
      toc.parar();
      raiz.hidden = true;
      document.body.classList.remove('com-player');
      if (!deHistorico && history.state && history.state.player) history.back();
    }

    raiz.addEventListener('click', e => {
      if (e.target === raiz || e.target.closest('[data-fechar]')) fechar();
    });
    window.addEventListener('popstate', () => fechar(true));
    document.addEventListener('keydown', e => {
      if (raiz.hidden) return;
      if (e.key === 'Escape') fechar();
      else toc.tecla(e);
    });

    return { abrir, fechar, aberto: () => !raiz.hidden };
  })();

  // =====================================================================
  // Pedaços de HTML
  // =====================================================================


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
      '<a class="metodo" href="#meucubo" style="--cor:#2773ff"><span class="metodo-tag">Passo a passo</span><strong>Resolver o meu cubo</strong><span>Pinte as cores do seu cubo e resolva junto com o app, um passo de cada vez.</span></a>' +
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
  // Meu cubo: pintar as cores e resolver junto, passo a passo
  // =====================================================================
  const Rs = window.Resolver;
  const ORDEM_FACES = [
    ['F', 'Frente', 'Olhe para a face com o centro verde, com o amarelo em cima. Pinte do jeito que você vê.'],
    ['R', 'Direita', 'Gire o cubo para a esquerda até ver a face com o centro laranja. O amarelo continua em cima.'],
    ['B', 'Trás', 'Gire mais uma vez para a esquerda: face com o centro azul, amarelo em cima.'],
    ['L', 'Esquerda', 'Mais uma vez: face com o centro vermelho, amarelo em cima.'],
    ['U', 'Cima', 'Volte com o verde na frente e incline o cubo para ver o amarelo. O verde fica embaixo, perto de você.'],
    ['D', 'Baixo', 'Com o verde na frente, incline o cubo para ver o branco. O verde fica em cima, longe de você.'],
  ];
  const VISTA_FACE = { F: { x: -22, y: -24 }, R: { x: -22, y: -114 }, B: { x: -22, y: -204 }, L: { x: -22, y: 66 }, U: { x: -66, y: -24 }, D: { x: 62, y: -24 } };
  const CORES_PALETA = ['D', 'U', 'F', 'B', 'R', 'L'];
  const METODOS = [['camadas', 'Camadas'], ['cfop2', 'CFOP 2-look'], ['cfop', 'CFOP completo']];
  const NOME_METODO = { camadas: 'por camadas', cfop2: 'CFOP 2-look', cfop: 'CFOP completo' };

  const meu = Object.assign({ face: 'F', cor: 'D', modo: 'pintar', metodo: 'camadas', passo: 0, emb: '' }, lerSalvo('cubo-meu', {}));
  if (!meu.pintura || !'URFDLB'.split('').every(f => Array.isArray(meu.pintura[f]) && meu.pintura[f].length === 9)) meu.pintura = Rs.pinturaVazia();
  const salvarMeu = () => guardar('cubo-meu', meu);
  let meuVisor = null, guiaToc = null, solucao = null, pintando = false;

  function telaMeuCubo() {
    if (meu.modo === 'resolver' && !obterSolucao().erro) return telaGuiada();
    if (meu.modo === 'embaralhar') return telaEmbaralhar();
    meu.modo = 'pintar';
    return telaPintar();
  }

  function telaPintar() {
    return '<section class="bloco"><h2>Resolver o meu cubo</h2>' +
      '<p>Pinte aqui as cores do seu cubo e a gente resolve junto, um passo de cada vez. Você faz cada passo no seu cubo de verdade.</p>' +
      '<p class="nota">Segure o cubo com o centro <strong>amarelo em cima</strong> e o <strong>verde na frente</strong>. Os centros já vêm pintados.</p>' +
      '<button type="button" class="link" data-meu="embaralhar">Não quero pintar: me dê um embaralhamento para fazer no cubo montado</button></section>' +
      '<section class="bloco pintar">' +
      '<div class="faces-abas" role="tablist" aria-label="Faces">' + ORDEM_FACES.map(([f, nome]) => '<button type="button" class="face-aba" role="tab" data-face="' + f + '"><i style="background:' + Des.CORES[f] + '"></i>' + nome + '<small></small></button>').join('') + '</div>' +
      '<p class="como" id="m-como"></p>' +
      '<div class="pintar-area">' +
      '<div class="grade-pintar" id="m-grade">' + Array.from({ length: 9 }, (_, i) => '<button type="button" class="cel" data-i="' + i + '"' + (i === 4 ? ' disabled aria-label="Centro (fixo)"' : ' aria-label="Adesivo ' + (i + 1) + '"') + '></button>').join('') + '</div>' +
      '<div class="m-visor" id="m-visor" title="Arraste para girar"></div>' +
      '</div>' +
      '<div class="paleta" role="radiogroup" aria-label="Cor do pincel">' + CORES_PALETA.map(c => '<button type="button" class="cor" role="radio" data-cor="' + c + '"><i style="background:' + Des.CORES[c] + '"></i><span>' + Rs.NOME_COR[c] + '</span><small></small></button>').join('') + '</div>' +
      '<div class="pintar-botoes"><button type="button" class="link" data-meu="limpar-face">Limpar esta face</button><button type="button" class="link" data-meu="limpar">Limpar tudo</button><button type="button" class="botao-sec" data-meu="proxima">Próxima face</button></div>' +
      '<p class="m-erro" id="m-erro" role="alert" hidden></p>' +
      '<button type="button" class="botao largo" data-meu="resolver">Pronto, vamos resolver</button>' +
      '</section>';
  }

  function montarPintar() {
    meuVisor = new Visor($('#m-visor'));
    meuVisor.olhar(VISTA_FACE[meu.face]);
    const grade = $('#m-grade');
    const pintarEm = alvo => {
      const cel = alvo && alvo.closest && alvo.closest('#m-grade .cel');
      if (!cel || cel.disabled) return;
      const i = +cel.dataset.i;
      if (meu.pintura[meu.face][i] === meu.cor) return;
      meu.pintura[meu.face][i] = meu.cor;
      salvarMeu();
      atualizarPintura(false);
    };
    grade.addEventListener('pointerdown', e => {
      pintando = true;
      if (grade.releasePointerCapture) try { grade.releasePointerCapture(e.pointerId); } catch (x) { /* nada */ }
      pintarEm(e.target);
      e.preventDefault();
    });
    grade.addEventListener('pointermove', e => { if (pintando) pintarEm(document.elementFromPoint(e.clientX, e.clientY)); });
    window.addEventListener('pointerup', () => { pintando = false; });
    atualizarPintura(true);
  }

  function contarCores() {
    const conta = {};
    CORES_PALETA.forEach(c => { conta[c] = 0; });
    for (const f of 'URFDLB') for (const v of meu.pintura[f]) if (v) conta[v]++;
    return conta;
  }

  function atualizarPintura(girar) {
    const p = meu.pintura;
    $$('.face-aba').forEach(b => {
      const f = b.dataset.face, feitos = p[f].filter(Boolean).length;
      b.setAttribute('aria-selected', String(f === meu.face));
      b.classList.toggle('completa', feitos === 9);
      $('small', b).textContent = feitos === 9 ? '✓' : (feitos - 1) + '/8';
    });
    $('#m-como').textContent = ORDEM_FACES.find(x => x[0] === meu.face)[2];
    $$('#m-grade .cel').forEach(b => {
      const v = p[meu.face][+b.dataset.i];
      b.style.background = v ? Des.CORES[v] : '';
      b.classList.toggle('vazia', !v);
    });
    const conta = contarCores();
    $$('.paleta .cor').forEach(b => {
      const c = b.dataset.cor;
      b.setAttribute('aria-checked', String(c === meu.cor));
      $('small', b).textContent = conta[c] + '/9';
      b.classList.toggle('demais', conta[c] > 9);
    });
    $('#m-erro').hidden = true;
    if (meuVisor) {
      meuVisor.definir(Rs.cuboDaPintura(p), 'tudo');
      if (girar) meuVisor.olhar(VISTA_FACE[meu.face], true);
    }
  }

  function telaEmbaralhar() {
    registrar({ id: 'meu-emb', nome: 'Embaralhamento', titulo: 'Embaralhamento', alg: meu.emb, inicio: '', mascara: 'tudo', texto: 'Faça estes movimentos no cubo montado, com o amarelo em cima e o verde na frente.' });
    return '<section class="bloco"><h2>Embaralhar o cubo</h2>' +
      '<p>Comece com o cubo montado. Segure com o <strong>amarelo em cima</strong> e o <strong>verde na frente</strong> e faça estes movimentos:</p>' +
      '<p class="emb-grande alg">' + esc(meu.emb) + '</p>' +
      '<div class="emb-rede">' + Des.rede(C.aplicar(C.novo(), meu.emb)) + '<p class="nota">No fim, seu cubo fica assim (amarelo em cima, verde na frente).</p></div>' +
      '<div class="pintar-botoes"><button type="button" class="link" data-caso="meu-emb">Ver no cubo 3D</button><button type="button" class="link" data-meu="emb-outro">Outro embaralhamento</button></div>' +
      '<button type="button" class="botao largo" data-meu="emb-pronto">Fiz, vamos resolver</button>' +
      '<p class="centro"><button type="button" class="link" data-meu="pintar">Prefiro pintar o meu cubo</button></p></section>';
  }

  function obterSolucao() {
    const chave = JSON.stringify(meu.pintura) + '|' + meu.metodo;
    if (solucao && solucao.chave === chave) return solucao;
    const lido = Rs.lerPintura(meu.pintura);
    if (lido.erro) return { erro: lido.erro };
    solucao = { chave, r: Rs.resolver(lido.cubo, meu.metodo), cubo: lido.cubo };
    return solucao;
  }

  const fasesDoMetodo = () => Rs.FASES[meu.metodo === 'camadas' ? 'camadas' : 'cfop'];

  function telaGuiada() {
    return '<section class="bloco"><div class="titulo-linha"><h2>Vamos resolver</h2><button type="button" class="link" data-meu="editar">Editar cores</button></div>' +
      '<div class="chips" role="group" aria-label="Método">' + METODOS.map(([id, nome]) => '<button type="button" class="chip" data-metodo="' + id + '" aria-pressed="' + (id === meu.metodo) + '">' + nome + '</button>').join('') + '</div>' +
      '<ol class="fases" id="g-fases">' + fasesDoMetodo().map(([id, nome]) => '<li data-fase="' + id + '">' + esc(nome) + '</li>').join('') + '</ol>' +
      '<p class="nota" id="g-resumo"></p></section>' +
      '<section class="bloco guiado" id="g-passo">' +
      '<p class="g-fase" id="g-fase"></p><h3 id="g-titulo"></h3><p id="g-texto"></p>' +
      '<div id="g-tocador"></div>' +
      '<div class="g-nav"><button type="button" class="botao-sec" data-meu="anterior">Voltar</button><button type="button" class="botao" data-meu="proximo" id="g-proximo">Fiz! Próximo passo</button></div>' +
      '</section>' +
      '<section class="bloco fim-guiado" id="g-fim" hidden><span class="fim-cubo" aria-hidden="true">' + Des.iso(C.novo(), 'tudo') + '</span><h2>Cubo resolvido!</h2><p id="g-fim-texto"></p>' +
      '<div class="pintar-botoes"><button type="button" class="botao" data-meu="novo">Resolver outro cubo</button><button type="button" class="link" data-meu="recomecar">Ver do começo</button></div></section>';
  }

  function montarGuiada() {
    guiaToc = new Tocador($('#g-tocador'));
    atualizarGuiada();
  }

  function atualizarGuiada(rolar) {
    const s = obterSolucao();
    const passos = s.r.passos;
    meu.passo = Math.max(0, Math.min(meu.passo, passos.length));
    const fim = meu.passo >= passos.length;
    $('#g-passo').hidden = fim;
    $('#g-fim').hidden = !fim;
    const fases = fasesDoMetodo().map(f => f[0]);
    const faseAtual = fim ? fases.length : Math.max(0, fases.indexOf(passos[meu.passo].fase === 'fim' ? fases[fases.length - 1] : passos[meu.passo].fase));
    $$('#g-fases li').forEach((li, k) => {
      li.className = k < faseAtual ? 'feita' : k === faseAtual ? 'atual' : '';
    });
    $('#g-resumo').textContent = passos.length
      ? passos.length + ' passos · ' + s.r.total + ' movimentos pelo método ' + NOME_METODO[meu.metodo]
      : 'Seu cubo já está montado.';
    if (!fim) {
      const p = passos[meu.passo];
      const nomeFase = (fasesDoMetodo().find(f => f[0] === p.fase) || [0, 'Último ajuste'])[1];
      $('#g-fase').textContent = 'Passo ' + (meu.passo + 1) + ' de ' + passos.length + ' · ' + nomeFase;
      $('#g-titulo').textContent = p.titulo;
      $('#g-texto').textContent = p.texto;
      guiaToc.carregar({ inicio: p.inicio, alg: p.alg, mascara: p.mascara, todasCores: true, fimTexto: ' Agora faça no seu cubo e toque em "Fiz!".' });
      $('[data-meu="anterior"]').disabled = meu.passo === 0;
      $('#g-proximo').textContent = meu.passo === passos.length - 1 ? 'Fiz! Terminar' : 'Fiz! Próximo passo';
      if (rolar) $('#g-passo').scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else {
      $('#g-fim-texto').textContent = passos.length
        ? 'Foram ' + passos.length + ' passos e ' + s.r.total + ' movimentos pelo método ' + NOME_METODO[meu.metodo] + '. Que tal embaralhar e tentar sozinho agora?'
        : 'Seu cubo já estava montado. Embaralhe e pinte de novo para resolver junto.';
      if (rolar) $('#g-fim').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    salvarMeu();
  }

  function acaoMeu(acao) {
    if (acao === 'resolver') {
      const lido = Rs.lerPintura(meu.pintura);
      if (lido.erro) {
        const el = $('#m-erro');
        el.textContent = lido.erro;
        el.hidden = false;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      meu.modo = 'resolver';
      meu.passo = 0;
    } else if (acao === 'limpar-face') {
      meu.pintura[meu.face] = meu.pintura[meu.face].map((v, i) => (i === 4 ? v : null));
      salvarMeu();
      return atualizarPintura(false);
    } else if (acao === 'limpar') {
      if (!confirm('Apagar todas as cores pintadas?')) return;
      meu.pintura = Rs.pinturaVazia();
      salvarMeu();
      return atualizarPintura(false);
    } else if (acao === 'proxima') {
      const i = ORDEM_FACES.findIndex(x => x[0] === meu.face);
      meu.face = ORDEM_FACES[(i + 1) % ORDEM_FACES.length][0];
      salvarMeu();
      return atualizarPintura(true);
    } else if (acao === 'embaralhar' || acao === 'emb-outro') {
      meu.emb = C.embaralhamento(20);
      meu.modo = 'embaralhar';
    } else if (acao === 'emb-pronto') {
      meu.pintura = Rs.pinturaDoCubo(C.aplicar(C.novo(), meu.emb));
      meu.modo = 'resolver';
      meu.passo = 0;
    } else if (acao === 'pintar' || acao === 'editar') {
      meu.modo = 'pintar';
    } else if (acao === 'anterior' || acao === 'proximo') {
      meu.passo += acao === 'proximo' ? 1 : -1;
      return atualizarGuiada(true);
    } else if (acao === 'recomecar') {
      meu.passo = 0;
      return atualizarGuiada(true);
    } else if (acao === 'novo') {
      meu.pintura = Rs.pinturaVazia();
      meu.face = 'F';
      meu.modo = 'pintar';
      meu.passo = 0;
    }
    salvarMeu();
    desenharTela(true);
  }

  function montarTela(tela) {
    meuVisor = null;
    guiaToc = null;
    if (tela !== 'meucubo') return;
    if ($('#m-grade')) montarPintar();
    else if ($('#g-tocador')) montarGuiada();
  }

  // =====================================================================
  // Navegação
  // =====================================================================
  const TELAS = { inicio: telaInicio, camadas: telaCamadas, cfop: telaCfop, meucubo: telaMeuCubo, treino: telaTreino, crono: telaCrono };
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
    document.title = { inicio: 'Cubo Mágico', camadas: 'Método por camadas · Cubo Mágico', cfop: 'CFOP · Cubo Mágico', meucubo: 'Meu cubo · Cubo Mágico', treino: 'Treino · Cubo Mágico', crono: 'Cronômetro · Cubo Mágico' }[tela];
    montarTela(tela);
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
    if (e.target.closest('#apagar-todos') && confirm('Apagar todos os tempos?')) { tempos = []; guardar('cubo-tempos', tempos); desenharTela(); return; }
    const face = e.target.closest('[data-face]');
    if (face) { meu.face = face.dataset.face; salvarMeu(); atualizarPintura(true); return; }
    const cor = e.target.closest('[data-cor]');
    if (cor) { meu.cor = cor.dataset.cor; salvarMeu(); atualizarPintura(false); return; }
    const metodo = e.target.closest('[data-metodo]');
    if (metodo) { meu.metodo = metodo.dataset.metodo; meu.passo = 0; salvarMeu(); desenharTela(); return; }
    const m = e.target.closest('[data-meu]');
    if (m) acaoMeu(m.dataset.meu);
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
