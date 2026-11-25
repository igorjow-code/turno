/* Tudo fica neste aparelho (localStorage). Nenhum pedido de rede é feito (ver CSP no index.html). */
(function () {
  'use strict';
  var CHAVE = 'turno', RITMO = ['v', 'i', 'v', 'o', 'v', 'i', 't', 'v', 'i'];
  var META = { baixa: 1, media: 3, boa: 5 }, TETO = { baixa: 2, media: 5, boa: 10 };
  var tela = document.getElementById('tela'), pecas = document.getElementById('pecas'), tic = null;

  if (location.hash === '#zerar') { try { localStorage.removeItem(CHAVE); } catch (e) {} location.hash = ''; }
  var s = ler();
  var m = /[#&]n=([^&]+)/.exec(location.hash);
  if (m) { try { s.nome = decodeURIComponent(m[1]).slice(0, 24); } catch (e) {} }

  function novo() { return { dia: '', ultimo: '', fase: 'porta', energia: null, id: null, vr: null, zero: 0, fim: 0, dur: 0, feitas: [], trocas: 0, travas: 0, vistas: [], ritmo: 0, amanha: null, nome: '' }; }
  function ler() { try { var o = JSON.parse(localStorage.getItem(CHAVE)); return o && Array.isArray(o.feitas) && Array.isArray(o.vistas) && typeof o.fase === 'string' ? o : novo(); } catch (e) { return novo(); } }
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) {} }

  /* o dia vira às 4h da manhã */
  function hoje() { var d = new Date(Date.now() - 4 * 36e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function diasDesde(x) { if (!x) return 0; var p = x.split('-'), q = hoje().split('-'); return Math.round((Date.UTC(q[0], q[1] - 1, q[2]) - Date.UTC(p[0], p[1] - 1, p[2])) / 864e5); }
  function virarDia() {
    if (s.dia === hoje()) return;
    if (s.dia) s.ultimo = s.dia;
    s.dia = hoje(); s.fase = 'porta'; s.energia = null; s.id = null; s.vr = null; s.fim = 0; s.feitas = []; s.trocas = 0; s.travas = 0;
    salvar();
  }

  function ordem(id) { for (var i = 0; i < ORDENS.length; i++) if (ORDENS[i].id === id) return ORDENS[i]; return null; }
  function sorteia(teto, fora) {
    var area = RITMO[s.ritmo % RITMO.length]; s.ritmo++;
    var todas = ORDENS.filter(function (o) { return o.area === area && o.min <= teto && o.id !== fora; });
    var livres = todas.filter(function (o) { return s.vistas.indexOf(o.id) < 0; });
    if (!livres.length) { var ids = todas.map(function (o) { return o.id; }); s.vistas = s.vistas.filter(function (v) { return ids.indexOf(v) < 0; }); livres = todas; }
    /* com energia, guarda as de 2 minutos para as primeiras ordens dos dias */
    var o = (teto > 2 && livres.filter(function (x) { return x.min > 2; })[0]) || livres[0] || ORDENS[0]; s.vistas.push(o.id); return o.id;
  }
  function texto() { return s.vr === 'zero' ? ZERO[s.zero % ZERO.length] : ordem(s.id)[s.vr || 't']; }
  function minutos() { return s.vr ? 2 : ordem(s.id).min; }

  /* ---- ações ---- */
  function abrir(e) { s.energia = e; s.id = ordem(s.amanha) ? s.amanha : sorteia(2); s.amanha = null; s.vr = null; s.trocas = 0; s.travas = 0; ir('ordem'); }
  function proxima() { s.id = sorteia(TETO[s.energia] || 2, s.id); s.vr = null; s.trocas = 0; s.travas = 0; ir('ordem'); }
  function trocar() { s.trocas++; s.id = sorteia(2, s.id); s.vr = s.trocas >= 2 ? 'passo' : null; s.travas = 0; ir('ordem'); }
  function comecar() { s.dur = minutos() * 6e4; s.fim = Date.now() + s.dur; ir('fazendo'); }
  function maisTempo() { s.dur = 3e5; s.fim = Date.now() + s.dur; ir('fazendo'); }
  function feito() { s.feitas.push(texto()); s.fim = 0; ir('feito'); }
  function travou(tipo) { s.travas++; if (tipo === 'zero' || s.travas > 2) { s.vr = 'zero'; s.zero++; } else s.vr = tipo; s.fim = 0; ir('ordem'); }
  function inteira() { s.vr = null; s.travas = 0; s.trocas = 2; ir('ordem'); }
  function fechar() { s.fim = 0; if (!ordem(s.amanha)) s.amanha = sorteia(2, s.id); ir('fechado'); }
  function reabrir() { s.id = s.amanha; s.amanha = null; s.vr = null; s.trocas = 0; s.travas = 0; ir('ordem'); }
  function ir(f) { s.fase = f; salvar(); pintar(true); }

  /* ---- peças da tela ---- */
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function botao(cls, txt, fn) { var b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function titulo(t) { var h = el('h1', '', t); h.tabIndex = -1; return h; }
  function monta(e, filhos, pe) { var p = el('div', 'pe'); filhos.forEach(function (f) { if (f) e.appendChild(f); }); pe.forEach(function (f) { if (f) p.appendChild(f); }); e.appendChild(p); return e; }
  function etiqueta(filhos, pe) { var w = el('div', 'sombra'); w.appendChild(monta(el('section', 'etiqueta'), filhos, pe)); return w; }
  function fora(filhos, pe) { return monta(el('section', 'fora'), filhos, pe); }
  function dupla(a, b) { var d = el('div', 'dupla'); if (a) d.appendChild(a); if (b) d.appendChild(b); return d; }
  function voc(t) { return s.nome ? s.nome + ', ' + t : t.charAt(0).toUpperCase() + t.slice(1); }

  function caixaCopia(t) {
    var c = el('div', 'copia'); c.appendChild(el('p', '', t));
    var b = botao('', 'Copiar texto', function () {
      function ok() { b.textContent = 'Copiado. Agora é só colar.'; }
      function plano() {
        var a = el('textarea'), deu = false; a.value = t; a.readOnly = true; document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length);
        try { deu = document.execCommand('copy'); } catch (e) {}
        a.remove(); if (deu) ok(); else b.textContent = 'Não copiou. Segure o texto para selecionar.';
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, plano); else plano();
    });
    c.appendChild(b); return c;
  }

  var TELAS = {
    porta: function () {
      var h = new Date().getHours(), oi = h >= 4 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
      if (diasDesde(s.ultimo) > 1) oi = 'Que bom te ver';
      var w = el('section', 'porta'), a = el('div'), c = el('div', 'cartela');
      a.appendChild(titulo(oi + (s.nome ? ', ' + s.nome : '') + '.'));
      a.appendChild(el('p', 'fala', 'Sua primeira ordem já está separada e leva 2 minutos. Como você chegou hoje?'));
      [['baixa', 'Sem energia', 'Uma ordem e acabou', '#6f6a35'], ['media', 'Mais ou menos', 'Até três ordens', '#a8532f'], ['boa', 'Bem', 'Até cinco ordens', '#d39a3a']].forEach(function (x) {
        var b = botao('', null, function () { abrir(x[0]); }), i = el('i'), t = el('span', '', x[1]);
        i.style.setProperty('--c', x[3]); t.appendChild(el('small', '', x[2])); b.appendChild(i); b.appendChild(t); c.appendChild(b);
      });
      w.appendChild(a); w.appendChild(c); return w;
    },
    ordem: function () {
      var o = ordem(s.id), olho = 'Ordem de agora', como = o.como;
      if (s.vr === 'zero') olho = 'Então a ordem muda';
      else if (s.vr === 'passo' && s.trocas >= 2 && !s.travas) olho = 'Já troquei duas vezes. Faz esta comigo';
      else if (s.vr) olho = 'Diminuí para você';
      if (s.vr) como = s.vr === 'rascunho' ? 'É só ensaio. Não precisa ficar bom.' : 'Só isso. O resto não é agora.';
      return etiqueta([el('p', 'olho', olho), titulo(texto()), el('p', 'como', como)],
        [botao('vai', 'Começar, ' + minutos() + ' minutos', comecar),
         dupla(botao('leve', 'Travei', function () { ir('travei'); }), s.trocas < 2 && !s.vr ? botao('leve', 'Trocar', trocar) : botao('leve', 'Fechar a loja', fechar))]);
    },
    fazendo: function () {
      var o = ordem(s.id), r = el('div', 'relogio'), t = el('p', 'tempo'), c = el('div', 'costura'), b = el('b');
      c.appendChild(b); r.appendChild(t); r.appendChild(c);
      var olho = el('p', 'olho', 'Valendo. Eu espero aqui'), mais = botao('leve', 'Mais 5 minutos', maisTempo); mais.hidden = true;
      function passa() {
        var falta = Math.max(0, s.fim - Date.now()), seg = Math.ceil(falta / 1000);
        t.textContent = Math.floor(seg / 60) + ':' + ('0' + seg % 60).slice(-2);
        b.style.width = (100 * (1 - falta / s.dur)) + '%';
        if (!falta) { olho.textContent = 'O tempo acabou. Parar ou seguir, os dois valem'; mais.hidden = false; clearInterval(tic); }
      }
      tic = setInterval(passa, 500); passa();
      return etiqueta([olho, titulo(texto()), r, !s.vr && o.copia ? caixaCopia(o.copia) : null],
        [botao('vai', 'Feito', feito), dupla(botao('leve', 'Travei', function () { ir('travei'); }), mais)]);
    },
    travei: function () {
      var g = el('div', 'motivos');
      [['Não sei por onde começar', 'passo'], ['Está grande demais', 'menor'], ['Medo de ficar ruim', 'rascunho'], ['Estou sem energia', 'zero']].forEach(function (x) { g.appendChild(botao('', x[0], function () { travou(x[1]); })); });
      return etiqueta([el('p', 'olho', 'Sem problema'), titulo('O que está pegando?'), el('p', 'como', 'Toque em um. Eu diminuo a ordem.'), g],
        [dupla(botao('leve', 'Voltar', function () { ir(s.fim > 0 ? 'fazendo' : 'ordem'); }))]);
    },
    feito: function () {
      var n = s.feitas.length, acabou = n >= (META[s.energia] || 1);
      var t = n === 1 ? 'Começou. Era a parte difícil.' : acabou ? 'Feito. Turno cumprido.' : 'Feito. Mais uma na arara.';
      var segue = s.vr ? inteira : proxima, pe;
      if (acabou) pe = [botao('vai', 'Fechar a loja', fechar), botao('leve', s.vr ? 'Quero fazer a ordem inteira' : 'Quero mais uma', segue)];
      else pe = [botao('vai', s.vr ? 'Agora a ordem inteira' : 'Próxima ordem', segue), botao('leve', 'Fechar a loja', fechar)];
      return fora([titulo(t), el('p', 'fala', voc(acabou ? 'por hoje está bom. Pode fechar.' : 'aproveite que você já está em movimento.'))], pe);
    },
    fechado: function () {
      var itens = [titulo('Loja fechada.'), el('p', 'fala', s.feitas.length ? 'Isto você fez hoje:' : 'Você abriu a loja hoje. Amanhã a gente continua.')];
      if (s.feitas.length) { var l = el('ul', 'caixa'); s.feitas.forEach(function (f) { l.appendChild(el('li', '', f)); }); itens.push(l); }
      var a = ordem(s.amanha);
      if (a) { var p = el('p', 'amanha', 'Primeira ordem de amanhã, já separada:'); p.appendChild(el('b', '', a.t)); itens.push(p); }
      return fora(itens, [botao('leve', 'Reabrir a loja', reabrir)]);
    }
  };

  function pintar(foco) {
    clearInterval(tic); virarDia();
    if (!TELAS[s.fase] || (s.fase !== 'porta' && s.fase !== 'fechado' && !ordem(s.id))) s.fase = 'porta';
    tela.replaceChildren(TELAS[s.fase]());
    var qtd = Math.min(s.feitas.length, 12);
    while (pecas.children.length > qtd) pecas.lastChild.remove();
    while (pecas.children.length < qtd) pecas.appendChild(el('li'));
    window.scrollTo(0, 0);
    if (foco) { var h = tela.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && (s.dia !== hoje() || s.fase === 'fazendo')) pintar(false); });
  salvar(); pintar(false);
})();
