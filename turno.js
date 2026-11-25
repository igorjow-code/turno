/* Turno 2. Tudo fica neste aparelho (localStorage). Nenhum pedido de rede é feito (ver CSP no index.html). */
(function () {
  'use strict';
  var M = MOTOR, K = 'turno2', RITMO = ['v', 'i', 'v', 'o', 'v', 'i', 't', 'v', 'i'];
  var TETO = { baixa: 2, media: 5, boa: 10 }, LIBCAT = { v: 'vendas', i: 'conteudo', t: 'estudo', o: 'casa' };
  var ENE = [['baixa', 'Sem energia', 'Só o essencial', '#6f6a35'], ['media', 'Mais ou menos', 'Um dia leve', '#a8532f'], ['boa', 'Bem', 'Um dia completo', '#d39a3a']];
  var SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var TIPOS = { '': 'Descanso', musculacao: 'Musculação', caminhada: 'Caminhada', leve: 'Atividade leve' };
  var tela = document.getElementById('tela'), pecas = document.getElementById('pecas'), barra = document.getElementById('nav'), torrada = document.getElementById('torrada');
  var tic = null, tt = null, desfaz = null, salvou = true;

  /* ================= memória ================= */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function novo() { return { v: 2, nome: '', hoje: '', ultimo: '', dias: {}, agenda: {}, depois: [], rotina: clone(M.ROTINA), treinos: { hora: 930, dur: 60, dias: {} }, treinosFeitos: [], ritmo: 0, vistas: [], zero: 0, seq: 1, rasc: null, exec: null, trv: null, tela: { n: 'dia' }, dicaIcone: 0 }; }
  function valido(o) { return !!(o && o.v === 2 && o.dias && typeof o.dias === 'object' && Array.isArray(o.depois) && Array.isArray(o.rotina) && Array.isArray(o.vistas) && o.treinos && o.treinos.dias && o.tela); }
  function completa(o) { var n = novo(), k; for (k in n) if (!(k in o)) o[k] = n[k]; return o; }
  function ler() {
    var chaves = [K, K + '_copia'];
    for (var i = 0; i < 2; i++) { try { var o = JSON.parse(localStorage.getItem(chaves[i])); if (valido(o)) return completa(o); } catch (e) {} }
    return migra();
  }
  /* traz o que existia na primeira versão; a chave antiga não é apagada */
  function migra() {
    var s = novo(), a; try { a = JSON.parse(localStorage.getItem('turno')); } catch (e) {}
    if (!a || !Array.isArray(a.feitas) || !Array.isArray(a.vistas)) return s;
    s.nome = typeof a.nome === 'string' ? a.nome : ''; s.vistas = a.vistas.filter(function (v) { return lib(v); }); s.ritmo = a.ritmo | 0; s.zero = a.zero | 0;
    var p = String(a.dia || '').split('-'); if (p.length === 3) { var d = p[0] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[2]).slice(-2); s.hoje = d;
      if (d === hoje() && a.feitas.length) { var n = Math.max(0, agora() - 5 * a.feitas.length); s.vindas = { d: d, itens: a.feitas.slice(0, 12).map(function (t, i) { return { id: 'i' + (s.seq++), t: String(t), cat: 'casa', dur: 5, ini: n + i * 5, st: 'feita', sug: true, passos: [], como: '' }; }) }; } }
    return s;
  }
  function salvar() {
    try { var t = JSON.stringify(S); localStorage.setItem(K, t); salvou = true; if (S.copiaDe !== S.hoje && valido(S)) { S.copiaDe = S.hoje; localStorage.setItem(K + '_copia', t); } } catch (e) { salvou = false; }
  }
  if (location.hash === '#zerar') { try { [K, K + '_copia', 'turno'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} location.hash = ''; }
  var S = ler(), mm = /[#&]n=([^&]+)/.exec(location.hash);
  if (mm) { try { S.nome = decodeURIComponent(mm[1]).slice(0, 24); } catch (e) {} }

  /* ================= datas ================= */
  /* o dia vira às 4h da manhã */
  function chave(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hoje() { return chave(new Date(Date.now() - 4 * 36e5)); }
  function data(c) { var p = c.split('-'); return new Date(+p[0], p[1] - 1, +p[2], 12); }
  function soma(c, n) { var d = data(c); d.setDate(d.getDate() + n); return chave(d); }
  function amanha() { return soma(hoje(), 1); }
  function agora() { var d = new Date(), m = d.getHours() * 60 + d.getMinutes(); return d.getHours() < 4 ? m + 1440 : m; }
  function porExtenso(c) { var d = data(c); return SEM[d.getDay()] + ', ' + d.getDate() + ' de ' + MES[d.getMonth()]; }
  function maiusc(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function nomeDia(c) { return c === hoje() ? 'hoje' : c === amanha() ? 'amanhã' : porExtenso(c); }

  function virarDia() {
    if (S.hoje === hoje()) return;
    if (S.hoje) {
      S.ultimo = S.hoje; var d = S.dias[S.hoje];
      /* o que era dela e ficou aberto vira opção na próxima agenda; nada é remarcado sozinho */
      if (d) d.itens.forEach(function (it) { if (it.st === 'aberta' && !it.ancora && !it.fixo && !it.sug && !it.treino) { it.st = 'adiada'; guarda(it, null); } });
    }
    S.hoje = hoje(); S.exec = null; S.trv = null; S.tela = { n: 'dia' };
    if (S.rasc && (S.rasc.alvo < S.hoje || S.rasc.modo !== 'novo')) S.rasc = null;
    if (S.rasc) S.rasc.fixouHoje = true;
    var lim = soma(S.hoje, -180); Object.keys(S.dias).forEach(function (k) { if (k < lim) delete S.dias[k]; }); Object.keys(S.agenda).forEach(function (k) { if (k < S.hoje) delete S.agenda[k]; });
    S.depois.forEach(function (x) { if (x.quando && x.quando < S.hoje) x.quando = null; });
    salvar();
  }

  /* ================= tarefas ================= */
  function lib(id) { for (var i = 0; i < ORDENS.length; i++) if (ORDENS[i].id === id) return ORDENS[i]; return null; }
  function sorteia(teto) {
    var area = RITMO[S.ritmo % RITMO.length]; S.ritmo++;
    var todas = ORDENS.filter(function (o) { return o.area === area && o.min <= teto; }), livres = todas.filter(function (o) { return S.vistas.indexOf(o.id) < 0; });
    if (!livres.length) { var ids = todas.map(function (o) { return o.id; }), ult = S.vistas[S.vistas.length - 1]; S.vistas = S.vistas.filter(function (v) { return ids.indexOf(v) < 0; }); livres = todas.filter(function (o) { return o.id !== ult; }); }
    var o = (teto > 2 && livres.filter(function (x) { return x.min > 2; })[0]) || livres[0] || ORDENS[0]; S.vistas.push(o.id);
    return nova({ t: o.t, cat: LIBCAT[o.area], dur: o.min <= 2 ? 10 : o.min <= 5 ? 15 : 25, prio: o.area === 'v' ? 1 : 2, como: o.como, passos: [o.passo, o.t], menor: o.menor, rascunho: o.rascunho, copia: o.copia || null, sug: true });
  }
  function nova(b) { var x = clone(b); x.id = 'i' + (S.seq++); x.st = 'aberta'; return x; }
  function autoTarefas(e, n) { var r = []; for (var i = 0; i < n; i++) r.push(sorteia(i ? TETO[e] : 2)); return r; }
  function passos(it) { return it.passos && it.passos.length ? it.passos : ['Deixe na sua frente o que você precisa.', 'Faça a parte mais fácil primeiro.']; }
  function menor(it) { return it.menor || 'Dois minutos da parte mais fácil.'; }
  function dia() { return S.dias[hoje()] || null; }
  function acha(id) { var d = dia(); return d ? d.itens.filter(function (x) { return x.id === id; })[0] || null : null; }
  function ehTarefa(it) { return !it.ancora && it.st !== 'adiada' && it.st !== 'cancelada'; }
  function treinoDe(c) { var x = S.treinos.dias[data(c).getDay()]; if (!x || !x.tipo) return null; return { t: TIPOS[x.tipo] + (x.nome ? ' ' + x.nome : ''), tipo: x.tipo, dur: x.tipo === 'musculacao' ? S.treinos.dur : Math.min(S.treinos.dur, 40), hora: S.treinos.hora }; }
  function guarda(it, quando) {
    var d = quando && S.dias[quando];
    if (d && !d.fechado) {
      var n = d.itens.filter(function (x) { return !x.ancora && !x.fixo && !x.treino && x.st === 'aberta'; }).length, v = n < M.LIM[d.energia].max ? M.proximo(d.itens, it.dur, 540, 1020) : null;
      if (v !== null) { var y = limpo(it); y.id = 'i' + (S.seq++); y.ini = v; y.st = 'aberta'; y.reag = true; d.itens.push(y); d.itens.sort(M.porHora); return 'dentro'; }
      quando = null;
    }
    var t = M.limpa(it.t); S.depois = S.depois.filter(function (x) { return M.limpa(x.t) !== t; });
    var g = limpo(it); g.quando = quando || null; g.desde = hoje(); S.depois.push(g); if (S.depois.length > 40) S.depois.shift();
    return d ? 'cheio' : 'guardada';
  }
  function limpo(it) { var r = {}; ['t', 'cat', 'dur', 'prio', 'como', 'passos', 'menor', 'rascunho', 'copia', 'urgente', 'sug'].forEach(function (k) { if (it[k] != null) r[k] = clone(it[k]); }); return r; }
  function tiraDeDepois(itens) { var ts = itens.map(function (x) { return M.limpa(x.t); }); S.depois = S.depois.filter(function (x) { return ts.indexOf(M.limpa(x.t)) < 0; }); }

  /* qual é a tarefa da vez */
  function vez() {
    var d = dia(); if (!d) return { tipo: 'porta' };
    var n = agora(), ab = d.itens.filter(function (x) { return x.st === 'aberta'; }).sort(M.porHora);
    var passou = ab.filter(function (x) { return !x.ancora && x.ini + x.dur <= n; });
    var atual = ab.filter(function (x) { return x.ini <= n && n < x.ini + x.dur && x.cat !== 'fechar'; });
    var agoraIt = atual.filter(function (x) { return x.cat !== 'pausa'; }).pop();
    var depois = ab.filter(function (x) { return x.ini > n && x.cat !== 'pausa' && x.cat !== 'fechar'; })[0];
    if (agoraIt) return { tipo: 'tarefa', it: agoraIt, passou: passou, atual: true };
    if (atual[0]) return { tipo: 'pausa', it: atual[0], prox: depois, passou: passou };
    if (depois) return { tipo: 'tarefa', it: depois, passou: passou };
    if (passou.length) return { tipo: 'passou', it: passou[passou.length - 1], passou: passou };
    return { tipo: 'fim', passou: [] };
  }

  /* ================= ações ================= */
  function fecho() { var b = S.rotina.filter(function (x) { return x.cat === 'fechar'; })[0]; b = b ? b.ini : 1020; [dia(), S.rasc].forEach(function (d, i) { if (d && d.itens.length) { M.acertaFechar(d.itens, b, (i ? d.alvo === hoje() : true) && agora() > b ? Math.min(agora(), 1500) : 0); d.itens.sort(M.porHora); } }); }
  function ir(n, extra) { esconde(); fecho(); S.tela = { n: n }; for (var k in extra || {}) S.tela[k] = extra[k]; salvar(); pintar(true); }
  function antes() { desfaz = JSON.stringify({ c: hoje(), d: S.dias[hoje()] || null, a: S.dias[amanha()] || null, dep: S.depois, tf: S.treinosFeitos, ex: S.exec, tr: S.trv, te: S.tela }); }
  function desfazer() {
    if (!desfaz) return; var u = JSON.parse(desfaz); desfaz = null; if (u.c !== hoje()) return;
    if (u.d) S.dias[u.c] = u.d; else delete S.dias[u.c];
    if (u.a) S.dias[amanha()] = u.a; else delete S.dias[amanha()];
    S.depois = u.dep; S.treinosFeitos = u.tf; S.exec = u.ex; S.trv = u.tr; S.tela = S.exec && u.te.n === 'exec' ? u.te : { n: 'dia' }; S.trv = null; esconde(); salvar(); pintar(true);
  }
  function esconde() { clearTimeout(tt); torrada.hidden = true; torrada.replaceChildren(); }
  function avisa(t, comDesfazer) {
    esconde(); torrada.appendChild(el('span', '', t)); if (comDesfazer) torrada.appendChild(botao('', 'Desfazer', desfazer)); torrada.hidden = false; tt = setTimeout(esconde, comDesfazer ? 9000 : 4500);
  }
  function parametros(alvo) {
    var h = alvo === hoje(), n = agora(); return { rotina: S.rotina, treino: treinoDe(alvo), compromissos: [], tarefas: [], energia: 'media', inicio: h ? n : 0, fim: h && n > 930 ? Math.min(1440, n + 180) : 0 };
  }
  function montaAuto(e) {
    var p = parametros(hoje()); p.energia = e; p.compromissos = clone(S.agenda[hoje()] || []); p.tarefas = autoTarefas(e, M.LIM[e].auto);
    var r = M.planejar(p), tem = r.itens.some(function (x) { return x.sug; });
    r.itens.forEach(function (x) { if (!x.id || x.ancora) x.id = 'i' + (S.seq++); });
    if (!tem) { var t = p.tarefas[0]; t.ini = Math.ceil(agora() / 5) * 5; r.itens.push(t); }
    /* a primeira ordem é sempre a de 2 minutos */
    var sg = r.itens.filter(function (x) { return x.sug; }).sort(M.porHora), p0 = p.tarefas[0];
    if (sg.length > 1 && sg[0] !== p0 && sg.indexOf(p0) > 0) { var ia = sg[0].ini, da = sg[0].dur, ib = p0.ini, db = p0.dur; if (sg[0].dur <= db) { p0.ini = ia; p0.dur = da; sg[0].ini = ib; sg[0].dur = db; } else { p0.ini = ia; sg[0].ini = M.proximo(r.itens.filter(function (x) { return x !== sg[0]; }), sg[0].dur, ia + p0.dur, 1440) || ib; } }
    r.itens = vindas().concat(r.itens); r.itens.sort(M.porHora);
    S.dias[hoje()] = { itens: r.itens, energia: e, auto: true }; S.rasc = S.rasc && S.rasc.alvo === hoje() ? null : S.rasc; persistir(); ir('dia');
  }
  /* o que já tinha sido feito hoje na primeira versão entra no dia */
  function vindas() { var v = S.vindas; S.vindas = null; return v && v.d === hoje() ? v.itens : []; }
  function persistir() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} }
  function comecar(id, durMin) {
    var it = acha(id); if (!it) return ir('dia'); var d = durMin || it.dur, a = Date.now();
    S.trv = null; S.exec = { id: id, passo: 0, ini: a, arr: a + 12e4, fim: a + Math.max(d, 2) * 6e4, tot: Math.max(d, 2) * 6e4 }; it.abriu = true; persistir(); ir('exec');
  }
  function conclui(id) {
    var it = acha(id); if (!it) return ir('dia'); antes();
    it.st = 'feita'; it.real = [S.exec && S.exec.id === id ? S.exec.ini : null, Date.now()]; if (it.treino) S.treinosFeitos.push({ d: hoje(), tipo: it.treino, t: it.t });
    S.exec = null; S.trv = null; ir('feito', { id: id });
  }
  function naoHoje(it) { S.exec = S.exec && S.exec.id === it.id ? null : S.exec; S.trv = null; }
  function acao(q, it) {
    antes(); naoHoje(it); var n = agora(), v, msg = '';
    if (q === 'quinze') { it.dur = 15; it.reag = true; it.manual = false; it.ini = Math.floor(n / 5) * 5; var l = dia().itens.slice().sort(M.porHora), e = M.encaixar(l, it, it.ini); if (e) { var m = e.filter(function (x) { return x.id === it.id; })[0]; m.ini = it.ini; dia().itens = e; } return comecar(it.id, 15); }
    if (q === 'hoje') { v = M.proximo(dia().itens, it.dur, n + 10, 1380, it); if (v !== null) { it.ini = v; it.reag = true; msg = 'Ficou para ' + M.hm(v) + '.'; } }
    if (q === 'dividir') { var a = Math.max(10, Math.round(it.dur / 10) * 5), y = clone(it); y.dur = Math.max(10, it.dur - a); y.t = it.t + ' (parte 2)'; it.t = it.t + ' (parte 1)'; it.dur = a; it.reag = true; v = M.proximo(dia().itens, a, n + 5, 1380, it); if (v !== null) it.ini = v; guarda(y, amanha()); msg = v !== null ? 'Parte 1 às ' + M.hm(v) + '. Parte 2 fica para amanhã.' : 'Parte 2 fica para amanhã.'; }
    if (q === 'amanha') { var r = guarda(it, amanha()); it.st = 'adiada'; msg = r === 'cheio' ? 'Amanhã já está cheio. Guardei para você decidir.' : 'Foi para amanhã.'; }
    if (q === 'outro') { guarda(it, null); it.st = 'adiada'; msg = 'Guardei para outro dia.'; }
    if (q === 'soltar') { it.st = 'cancelada'; msg = 'Saiu da sua lista.'; }
    if (q === 'ok') { it.st = 'feita'; it.real = [null, Date.now()]; if (it.treino) S.treinosFeitos.push({ d: hoje(), tipo: it.treino, t: it.t }); msg = 'Marcado.'; }
    if (dia()) dia().itens.sort(M.porHora);
    ir('dia'); if (msg) avisa(msg, true);
  }

  /* ================= peças da tela ================= */
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function botao(cls, txt, fn) { var b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function titulo(t, cls) { var h = el('h1', cls || '', t); h.tabIndex = -1; return h; }
  function junta(e, f) { (f || []).forEach(function (x) { if (x) e.appendChild(x); }); return e; }
  function caixa(cls, f) { return junta(el('div', cls), f); }
  function monta(e, filhos, pe) { junta(e, filhos); if (pe) e.appendChild(caixa('pe', pe)); return e; }
  function etiqueta(filhos, pe, curta) { var w = el('div', 'sombra' + (curta ? ' curta' : '')); w.appendChild(monta(el('section', 'etiqueta'), filhos, pe)); return w; }
  function fora(filhos, pe) { return monta(el('section', 'fora'), filhos, pe); }
  function dupla(a, b) { return caixa('dupla', [a, b]); }
  function opcoes(lista, cls) { return caixa(cls || 'motivos', lista.map(function (x) { var b = botao(x[2] || '', x[0], x[1]); if (x[3]) b.appendChild(el('small', '', x[3])); return b; })); }
  function swatches(fn) { return caixa('cartela', ENE.map(function (x) { var b = botao('', null, function () { fn(x[0]); }), i = el('i'), t = el('span', '', x[1]); i.style.setProperty('--c', x[3]); t.appendChild(el('small', '', x[2])); b.appendChild(i); b.appendChild(t); return b; })); }
  function campo(rot, tipo, val, attrs) { var l = el('label', 'campo'), i; l.appendChild(el('span', '', rot)); i = el('input'); i.type = tipo; i.value = val == null ? '' : val; for (var k in attrs || {}) i.setAttribute(k, attrs[k]); l.appendChild(i); l.entrada = i; return l; }
  function seletor(rot, ops, val) { var l = el('label', 'campo'), s = el('select'); if (rot) l.appendChild(el('span', '', rot)); ops.forEach(function (o) { var p = el('option', '', o[1]); p.value = o[0]; if (String(o[0]) === String(val)) p.selected = true; s.appendChild(p); }); l.appendChild(s); l.entrada = s; return l; }
  function entrada(id, dica, fn) {
    var w = el('div', 'entra'), i = el('input'), b = botao('', 'Pôr', vai); i.id = id; i.type = 'text'; i.maxLength = 300; i.placeholder = dica; i.setAttribute('aria-label', dica); i.autocomplete = 'off'; i.setAttribute('enterkeyhint', 'done');
    function vai() { var v = i.value.trim(); if (!v) { i.focus(); return; } i.value = ''; fn(v); var x = document.getElementById(id); if (x) x.focus({ preventScroll: true }); }
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); vai(); } }); junta(w, [i, b]); return w;
  }
  function caixaCopia(t) {
    var c = el('div', 'copia'); c.appendChild(el('p', '', t));
    var b = botao('', 'Copiar texto', function () {
      function ok() { b.textContent = 'Copiado. Agora é só colar.'; }
      function plano() { var a = el('textarea'), deu = false; a.value = t; a.readOnly = true; document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length); try { deu = document.execCommand('copy'); } catch (e) {} a.remove(); if (deu) ok(); else b.textContent = 'Não copiou. Segure o texto para selecionar.'; }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, plano); else plano();
    });
    c.appendChild(b); return c;
  }
  function relogio(fim, tot, aoFim) {
    var r = el('div', 'relogio'), t = el('p', 'tempo'), c = el('div', 'costura'), b = el('b'), foi = false; c.appendChild(b); junta(r, [t, c]);
    function passa() { var f = Math.max(0, fim - Date.now()), s = Math.ceil(f / 1000); t.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); b.style.width = (100 * (1 - f / tot)) + '%'; if (!f && !foi) { foi = true; aoFim(); } }
    r.passa = passa; return r;
  }
  function pulsa(fn, ms) { clearInterval(tic); tic = setInterval(fn, ms); fn(); }
  function statusDe(it, v, outroDia) {
    if (it.st === 'feita') return 'Feita'; if (it.st === 'adiada') return 'Reagendada'; if (it.st === 'cancelada') return 'Cancelada';
    if (outroDia) return it.reag ? 'Reagendada' : '';
    if (S.exec && S.exec.id === it.id) return 'Em andamento';
    if (v && v.it === it) return v.tipo === 'passou' ? 'Passou da hora' : v.atual || v.tipo === 'pausa' ? 'Agora' : 'Próxima';
    if (!it.ancora && it.ini + it.dur <= agora()) return v && v.passou && v.passou[v.passou.length - 1] === it ? 'Passou da hora' : 'Em aberto'; return it.reag ? 'Reagendada' : '';
  }
  function linha(it, v, fn, outroDia) {
    var tag = fn ? 'button' : 'div', b = el(tag, 'linha' + (it.st !== 'aberta' ? ' quieta' : '') + (v && v.it === it ? ' vez' : '') + (it.ancora ? ' rotina' : '')), m = el('span', 'meio'), st = statusDe(it, v, outroDia), c = (M.CATS[it.cat] || M.CATS.casa);
    if (fn) { b.type = 'button'; b.addEventListener('click', fn); }
    var cor = el('i'); cor.style.setProperty('--c', c.c);
    m.appendChild(el('b', '', it.t)); m.appendChild(el('small', '', [it.ancora ? '' : c.n, M.dura(it.dur), it.local].filter(Boolean).join(' · ')));
    junta(b, [el('time', '', M.hm(it.ini)), cor, m, st ? el('em', st === 'Feita' ? 'feita' : '', st) : null]); return b;
  }

  /* ================= telas ================= */
  var T = {};
  T.porta = function () {
    var h = new Date().getHours(), oi = h >= 4 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
    if (S.ultimo && soma(S.ultimo, 1) < hoje()) oi = 'Que bom te ver';
    var meio = S.rasc && S.rasc.alvo === hoje();
    return caixa('porta', [caixa('', [titulo(oi + (S.nome ? ', ' + S.nome : '') + '.'), el('p', 'fala', 'Diga como você chegou e eu monto seu dia. A primeira ordem leva 2 minutos.')]),
      caixa('', [swatches(montaAuto), caixa('fora', [botao('leve', meio ? 'Continuar a agenda que comecei' : 'Prefiro escolher minhas tarefas', function () { if (!meio) iniciaPlano(hoje()); else ir('plano'); })])])]);
  };
  function recado(d, v) {
    var f = d.itens.filter(function (x) { return x.st === 'feita' && ehTarefa(x); }).length;
    if (v.tipo === 'pausa') return 'Pausa também é trabalho bem feito.'; if (f === 0) return 'Uma coisa de cada vez. Eu cuido da ordem.'; if (v.tipo === 'fim') return 'Você fez a sua parte.'; return 'Você já começou. Seguimos.';
  }
  T.dia = function () {
    var d = dia(); if (!d) return T.porta(); if (d.fechado) return T.fechado();
    var v = vez(), it = v.it, e = ENE.filter(function (x) { return x[0] === d.energia; })[0], hora = el('span', 'hora', M.hm(agora())), topo, cart, w = el('section', 'dia');
    var bol = el('i', 'bolinha'); bol.style.setProperty('--c', e[3]);
    topo = caixa('topo', [caixa('', [el('p', 'data', maiusc(porExtenso(hoje()))), el('p', 'recado', recado(d, v))]), hora]);
    if (v.tipo === 'tarefa' || v.tipo === 'passou') {
      var fut = it.ini > agora(), falta = it.ini - agora(), quando = v.tipo === 'passou' ? 'Passou da hora. Tudo bem, a gente resolve' : v.atual ? 'Agora, até ' + M.hm(it.ini + it.dur) : 'Próxima, às ' + M.hm(it.ini) + (falta < 60 ? ' (em ' + falta + ' min)' : '');
      var meta = el('p', 'meta', (it.fixo ? 'Compromisso' : M.CATS[it.cat].n) + ', ' + M.dura(it.dur) + (it.local ? ', ' + it.local : '') + (it.desloc && fut ? '. Saia às ' + M.hm(it.ini - it.desloc) : ''));
      var pe;
      if (v.tipo === 'passou') pe = [botao('vai', 'Resolver', function () { ir('reorg', { id: it.id, fase: it.fixo ? 'fixo' : 'comecou' }); }), dupla(botao('leve', 'Já fiz', function () { conclui(it.id); }), botao('leve', 'Começar agora', function () { comecar(it.id); }))];
      else if (it.fixo) pe = [fut ? botao('vai', 'Preparar, 2 minutos', function () { comecar(it.id, 10); }) : botao('vai', 'Já aconteceu', function () { conclui(it.id); }), dupla(botao('leve', 'Preciso de ajuda', function () { travar(it.id); }), botao('leve', 'Reorganizar', function () { ir('reorg', { id: it.id, fase: 'fixo' }); }))];
      else pe = [botao('vai', 'Começar, só 2 minutos', function () { comecar(it.id); }), dupla(botao('leve', 'Preciso de ajuda para começar', function () { travar(it.id); }), botao('leve', 'Reorganizar', function () { ir('reorg', { id: it.id, fase: 'motivo' }); }))];
      cart = etiqueta([el('p', 'olho', quando), titulo(it.t), it.como ? el('p', 'como', it.como) : null, meta], pe, true);
    } else if (v.tipo === 'pausa') {
      cart = etiqueta([el('p', 'olho', 'Agora, até ' + M.hm(it.ini + it.dur)), titulo(it.t), el('p', 'como', v.prox ? 'Depois vem: ' + v.prox.t + ', às ' + M.hm(v.prox.ini) + '.' : 'Depois disso, só fechar a loja.')], v.prox && !v.prox.fixo ? [botao('leve', 'Quero adiantar a próxima', function () { comecar(v.prox.id); })] : null, true);
    } else {
      cart = etiqueta([el('p', 'olho', 'Por hoje é isso'), titulo('Turno cumprido.'), el('p', 'como', 'Feche a loja e deixe amanhã separado.')], [botao('vai', 'Fechar a loja', function () { ir('fechar', { p: 0 }); }), dupla(botao('leve', 'Quero mais uma', maisUma))], true);
    }
    var tar = d.itens.filter(ehTarefa), fe = tar.filter(function (x) { return x.st === 'feita'; }).length;
    junta(w, [topo, S.exec && acha(S.exec.id) ? botao('faixa', 'Em andamento: ' + acha(S.exec.id).t + '. Voltar', function () { ir('exec'); }) : null,
      v.tipo !== 'passou' && v.passou.length ? botao('faixa', 'Passou da hora: ' + v.passou[v.passou.length - 1].t + '. Resolver', function () { var p = v.passou[v.passou.length - 1]; ir('reorg', { id: p.id, fase: p.fixo ? 'fixo' : 'comecou' }); }) : null, cart]);
    w.appendChild(caixa('secao', [el('h2', '', 'Seu dia'), caixa('conta', [bol, el('span', '', e[1] + '. ' + fe + ' de ' + tar.length + ' feitas')])]));
    w.appendChild(caixa('agenda', d.itens.map(function (x) { return linha(x, v, function () { if (x.cat === 'fechar') ir('fechar', { p: 0 }); else if (!x.ancora || x.st === 'aberta') ir('ver', { id: x.id }); }); })));
    w.appendChild(caixa('acoes', [botao('', 'Pôr algo no dia', function () { ir('por'); }), botao('', 'Estou atrasada, reajuste', reajusta), botao('', 'Editar meu dia', function () { editaDia(hoje()); }), botao('', 'Fechar a loja', function () { ir('fechar', { p: 0 }); }), botao('', 'Meus treinos', function () { ir('treino'); }), botao('', 'Ajustes', function () { ir('ajustes'); })]));
    if (!salvou) w.appendChild(el('p', 'alerta', 'Não consegui guardar neste celular. Veja se há espaço livre.'));
    if (dicaIcone()) w.appendChild(caixa('dica', [el('p', '', 'Use sempre pelo ícone da Tela de Início. Pelo navegador, o que você marca fica guardado em outro lugar.'), botao('', 'Entendi', function () { S.dicaIcone = 1; salvar(); pintar(false, true); })]));
    var id0 = (it && it.id) + v.tipo;
    pulsa(function () { hora.textContent = M.hm(agora()); if (S.hoje !== hoje()) { pintar(false); return; } var z = vez(); if ((z.it && z.it.id) + z.tipo !== id0 && S.tela.n === 'dia') pintar(false, true); }, 15000);
    return w;
  };
  function dicaIcone() { return !S.dicaIcone && /iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone && location.protocol === 'https:'; }
  function maisUma() { antes(); var x = sorteia(TETO[dia().energia]); x.ini = M.proximo(dia().itens, x.dur, agora(), 1500) || agora(); dia().itens.push(x); dia().itens.sort(M.porHora); ir('dia'); }
  T.ver = function () {
    var it = acha(S.tela.id); if (!it) return T.dia(); var ab = it.st === 'aberta';
    return etiqueta([el('p', 'olho', M.hm(it.ini) + ' às ' + M.hm(it.ini + it.dur) + (statusDe(it) ? '. ' + statusDe(it) : '')), titulo(it.t), it.como ? el('p', 'como', it.como) : null, it.local ? el('p', 'meta', it.local) : null, it.obs ? el('p', 'meta', it.obs) : null,
      it.passos && it.passos.length && ab ? junta(el('ol', 'passos'), it.passos.map(function (p) { return el('li', '', p); })) : null],
      [ab && it.cat !== 'pausa' ? botao('vai', 'Começar, só 2 minutos', function () { comecar(it.id); }) : null,
       ab && it.cat !== 'pausa' ? dupla(botao('leve', 'Já fiz', function () { conclui(it.id); }), it.ancora ? null : botao('leve', 'Reorganizar', function () { ir('reorg', { id: it.id, fase: it.fixo ? 'fixo' : 'motivo' }); })) : null,
       !ab ? dupla(botao('leve', 'Voltar para aberta', function () { antes(); it.st = 'aberta'; if (it.treino) S.treinosFeitos = S.treinosFeitos.filter(function (x) { return !(x.d === hoje() && x.t === it.t); }); if (it.ini + it.dur <= agora() && !it.fixo) { var v = M.proximo(dia().itens, it.dur, agora(), 1500, it); if (v !== null) it.ini = v; } dia().itens.sort(M.porHora); ir('dia'); })) : null,
       dupla(botao('leve', 'Voltar', function () { ir('dia'); }), ab && it.ancora ? botao('leve', 'Tirar do dia', function () { acao('soltar', it); }) : null)]);
  };
  T.por = function () {
    return fora([titulo('O que entra hoje?'), el('p', 'fala', 'Escreva do seu jeito. Se tiver hora, pode dizer: "consulta às 15h".'), entrada('ePor', 'Ex.: responder mensagens', function (v) {
      var b = M.interpretar(v), x = nova(b); antes();
      if (b.hora != null) { x.ini = b.hora; x.fixo = true; var ch = dia().itens.filter(function (y) { return y.st === 'aberta' && y.ini < x.ini + x.dur && y.ini + y.dur > x.ini; })[0]; dia().itens.push(x); dia().itens.sort(M.porHora); ir('dia'); avisa(ch ? 'Entrou às ' + M.hm(x.ini) + ', mas bate com ' + ch.t + '. Use "reajuste".' : 'Entrou às ' + M.hm(x.ini) + '.', true); return; }
      var i = M.proximo(dia().itens, x.dur, agora(), 1320); if (i === null) { guarda(x, null); ir('dia'); avisa('Hoje não cabe mais. Guardei para outro dia.', true); return; }
      x.ini = i; dia().itens.push(x); dia().itens.sort(M.porHora); ir('dia'); avisa('Entrou às ' + M.hm(i) + '.', true);
    })], [botao('leve', 'Voltar', function () { ir('dia'); })]);
  };

  /* ---- execução: os 2 primeiros minutos já contam ---- */
  T.exec = function () {
    var x = S.exec, it = x && acha(x.id); if (!it || it.st !== 'aberta') { S.exec = null; return T.dia(); }
    var ps = passos(it), i = Math.min(x.passo, ps.length - 1), ult = i >= ps.length - 1, olho = el('p', 'olho'), mais = botao('leve', 'Mais 10 minutos', function () { x.fim = Date.now() + 6e5; x.tot = 6e5; x.arr = 0; ir('exec'); }); mais.hidden = true;
    var arranque = Date.now() < x.arr, r = arranque ? relogio(x.arr, 12e4, function () { pintar(false, true); }) : relogio(x.fim, x.tot, function () { olho.textContent = 'O tempo acabou. Parar ou seguir, os dois valem'; mais.hidden = false; });
    olho.textContent = arranque ? 'Só 2 minutos. Comece por aqui' : 'Você já está dentro. Siga no seu ritmo';
    pulsa(r.passa, 500);
    return etiqueta([olho, titulo(ps[i]), el('p', 'como', it.t + (ps.length > 1 ? '. Passo ' + (i + 1) + ' de ' + ps.length : '')), r, it.copia ? caixaCopia(it.copia) : null],
      [ult ? botao('vai', it.fixo && it.ini > agora() ? 'Tudo pronto' : 'Terminei', function () { if (it.fixo && it.ini > agora()) { S.exec = null; ir('dia'); avisa('Preparado. Agora é só ir às ' + M.hm(it.ini - (it.desloc || 0)) + '.'); } else conclui(it.id); }) : botao('vai', 'Passo feito', function () { x.passo++; ir('exec'); }),
       dupla(botao('leve', 'Travei', function () { travar(it.id); }), botao('leve', 'Parar aqui', function () { ir('parar'); })), mais.hidden ? dupla(mais) : dupla(mais)]);
  };
  T.parar = function () {
    var x = S.exec, it = x && acha(x.id); if (!it) return T.dia(); var v = M.proximo(dia().itens, it.dur, agora() + 30, 1380, it);
    return etiqueta([el('p', 'olho', 'Parar também é decisão'), titulo('E o que sobrou?'), opcoes([['Terminei tudo', function () { conclui(it.id); }], ['Já está bom assim', function () { conclui(it.id); }], v !== null ? ['Continuo hoje, às ' + M.hm(v), function () { antes(); it.ini = v; it.reag = true; naoHoje(it); dia().itens.sort(M.porHora); ir('dia'); avisa('Continua às ' + M.hm(v) + '.', true); }] : null, ['Fica para amanhã', function () { acao('amanha', it); }]].filter(Boolean))], [dupla(botao('leve', 'Voltar para a tarefa', function () { ir('exec'); }))]);
  };
  T.feito = function () {
    var d = dia(); if (!d) return T.dia(); var f = d.itens.filter(function (x) { return x.st === 'feita' && ehTarefa(x); }).length, v = vez(), px = v.it && v.tipo !== 'passou' ? (v.tipo === 'pausa' ? v.prox : v.it) : null;
    var t = f <= 1 ? 'Começou. Era a parte difícil.' : 'Feito. Mais uma na arara.';
    return fora([titulo(t), el('p', 'fala', px ? (v.tipo === 'pausa' ? 'Agora é pausa. ' : '') + 'A próxima é às ' + M.hm(px.ini) + ': ' + px.t : 'O principal de hoje está feito.')], [botao('vai', 'Ver meu dia', function () { ir('dia'); }), px && !px.fixo && px.ini - agora() > 5 ? botao('leve', 'Estou no embalo, quero a próxima', function () { comecar(px.id); }) : null, botao('leve', 'Desfazer', desfazer)]);
  };

  /* ---- estou travada ---- */
  var MOTIVOS = [['Não sei por onde começar', 'por'], ['Não entendi o que é para fazer', 'ent'], ['Parece grande demais', 'gra'], ['Ansiosa ou com medo de errar', 'ans'], ['Estou distraída', 'dis'], ['Estou cansada', 'can']];
  function travar(id) { var x = id ? acha(id) : null; if (!x) { if (S.exec) x = acha(S.exec.id); else { var v = vez(); x = v.it && v.it.cat !== 'pausa' ? v.it : v.prox || null; } } S.trv = { id: x ? x.id : null, fase: 'motivo', mot: '', p: 0, tent: 0, fim: 0 }; ir('travei'); }
  function receita(mot, it, tent) {
    var zero = ORDENS_ZERO(), p = it ? passos(it) : [zero], me = it ? menor(it) : zero, ra = it ? it.rascunho || me : zero;
    if (tent > 0 || !it) return { pre: [], olho: tent > 0 ? 'Então a ordem muda' : 'Uma coisa pequena', faz: zero };
    return { por: { pre: [], olho: 'Comece exatamente por aqui', faz: p[0] }, ent: { pre: [{ o: 'O que esta tarefa pede', t: it.como || it.t }], olho: 'Só isto já conta como feito', faz: me }, gra: { pre: [{ o: 'Primeiro', t: 'Esqueça o resto da tarefa pelos próximos 5 minutos.' }], olho: 'A tarefa agora é só esta', faz: me },
      ans: { pre: [{ o: 'Primeiro, o corpo', t: 'Respire comigo por um minuto.', resp: true }], olho: 'É só ensaio. Não precisa ficar bom', faz: ra }, dis: { pre: [{ o: 'Primeiro', t: 'Feche os outros aplicativos. Deixe só o Turno aberto.' }, { o: 'Agora', t: 'Tire da sua frente uma coisa que chama sua atenção.' }], olho: 'Só isto na sua frente', faz: p[0] }, can: { pre: [{ o: 'Primeiro, o corpo', t: 'Levante e beba um copo de água. Eu espero.' }], olho: 'A versão leve', faz: me } }[mot];
  }
  function ORDENS_ZERO() { return ZERO[S.zero % ZERO.length]; }
  T.travei = function () {
    var r = S.trv; if (!r) return T.dia(); var it = r.id ? acha(r.id) : null, sair = botao('leve', 'Outra hora', function () { if (it && !it.ancora) ir('reorg', { id: it.id, fase: it.fixo ? 'fixo' : 'opcoes', mot: 'naoconsegui' }); else { S.trv = null; ir('dia'); } });
    var voltar = botao('leve', 'Voltar', function () { S.trv = null; ir(S.exec ? 'exec' : 'dia'); });
    if (!it && r.fase === 'motivo') { r.fase = 'faz'; r.mot = 'por'; }
    if (r.fase === 'motivo') return etiqueta([el('p', 'olho', 'Sem problema. ' + (it ? it.t : '')), titulo('O que está pegando?'), opcoes(MOTIVOS.map(function (m) { return [m[0], function () { r.mot = m[1]; r.p = 0; r.fase = receita(m[1], it, 0).pre.length ? 'pre' : 'faz'; ir('travei'); }]; }))], [dupla(voltar)]);
    var rc = receita(r.mot, it, r.tent);
    if (r.fase === 'pre') {
      var q = rc.pre[r.p], ar = null, vai = botao('vai', q.resp ? 'Respirei' : 'Fiz', function () { r.p++; if (r.p >= rc.pre.length) { r.fase = 'faz'; r.p = 0; } ir('travei'); });
      if (q.resp) { var dz = el('p', '', ''), t0 = Date.now(); ar = caixa('ar', [el('i'), dz]); pulsa(function () { var s = Math.floor((Date.now() - t0) / 1000) % 10; dz.textContent = s < 4 ? 'Puxe o ar, ' + (4 - s) : 'Solte devagar, ' + (10 - s); }, 250); }
      return etiqueta([el('p', 'olho', q.o), titulo(q.t), ar], [vai, dupla(voltar, sair)]);
    }
    if (r.fase === 'faz') return etiqueta([el('p', 'olho', rc.olho), titulo(rc.faz), el('p', 'como', 'Só isso. O resto não é agora.')], [botao('vai', 'Começar, 5 minutos', function () { r.fase = 'tempo'; r.tot = 3e5; r.fim = Date.now() + 3e5; ir('travei'); }), dupla(botao('leve', '10 minutos', function () { r.fase = 'tempo'; r.tot = 6e5; r.fim = Date.now() + 6e5; ir('travei'); }), sair), dupla(voltar)]);
    if (r.fase === 'tempo') {
      var o = el('p', 'olho', 'Valendo. Eu espero aqui'), rel = relogio(r.fim, r.tot, function () { r.fase = 'conseguiu'; ir('travei'); }); pulsa(rel.passa, 500);
      return etiqueta([o, titulo(rc.faz), rel], [botao('vai', 'Consegui começar', sim), dupla(botao('leve', 'Ainda não', nao))]);
    }
    function sim() { if (!it) { S.trv = null; var d = dia(); if (d) { var y = nova({ t: rc.faz, cat: 'casa', dur: 5, sug: true, passos: [], como: '' }); y.ini = agora(); y.st = 'feita'; d.itens.push(y); d.itens.sort(M.porHora); S.zero++; return ir('feito', { id: y.id }); } return ir('dia'); } var id = it.id; if (r.tent > 0) S.zero++; if (S.exec && S.exec.id === id) { S.trv = null; S.exec.arr = 0; if (S.exec.fim < Date.now() + 3e5) { S.exec.fim = Date.now() + 6e5; S.exec.tot = 6e5; } return ir('exec'); } comecar(id); S.exec.arr = 0; ir('exec'); }
    function nao() { r.tent++; if (r.tent > 1) { S.zero++; if (it && !it.ancora) return ir('reorg', { id: it.id, fase: it.fixo ? 'fixo' : 'opcoes', mot: 'naoconsegui' }); S.trv = null; return ir('dia'); } r.fase = 'faz'; ir('travei'); }
    return etiqueta([el('p', 'olho', 'O tempo acabou'), titulo('Conseguiu começar?'), el('p', 'como', 'As duas respostas servem.')], [botao('vai', 'Consegui, vou continuar', sim), dupla(botao('leve', 'Ainda não', nao), it ? botao('leve', 'Já está bom assim', function () { conclui(it.id); }) : null)]);
  };

  /* ---- reorganizar, uma tarefa por vez ---- */
  var PORQUE = [['Falta de tempo', 'tempo'], ['Esqueci', 'esqueci'], ['Fiquei distraída', 'distraida'], ['Não consegui começar', 'naoconsegui'], ['Tive um imprevisto', 'imprevisto'], ['Era maior do que imaginei', 'maior'], ['Não era tão importante', 'menos'], ['Estava sem disposição', 'cansada'], ['Outro motivo', 'outro']];
  var SAIDAS = { tempo: ['quinze', 'hoje', 'amanha'], esqueci: ['quinze', 'hoje', 'amanha'], distraida: ['quinze', 'hoje', 'amanha'], naoconsegui: ['ajuda', 'quinze', 'amanha'], imprevisto: ['hoje', 'amanha', 'quinze'], maior: ['dividir', 'quinze', 'amanha'], menos: ['soltar', 'outro', 'amanha'], cansada: ['amanha', 'quinze', 'soltar'], outro: ['hoje', 'quinze', 'amanha'] };
  T.reorg = function () {
    var q = S.tela, it = acha(q.id); if (!it || it.st !== 'aberta') return T.dia();
    var voltar = dupla(botao('leve', 'Voltar', function () { ir(S.exec ? 'exec' : 'dia'); }));
    if (q.fase === 'fixo') return etiqueta([el('p', 'olho', it.t + ', ' + M.hm(it.ini)), titulo('O que houve com este compromisso?'), opcoes([['Aconteceu', function () { acao('ok', it); }], ['Mudou de horário', function () { ir('hora', { id: it.id }); }], ['Foi para outro dia', function () { acao('outro', it); }], ['Foi cancelado', function () { acao('soltar', it); }]])], [voltar]);
    if (q.fase === 'comecou') return etiqueta([el('p', 'olho', it.t), titulo('Você chegou a começar?'), opcoes([['Sim, um pouco', function () { it.abriu = true; ir('reorg', { id: it.id, fase: 'motivo' }); }], ['Não', function () { ir('reorg', { id: it.id, fase: 'motivo' }); }], ['Já terminei', function () { conclui(it.id); }]])], [voltar]);
    if (q.fase === 'motivo') return etiqueta([el('p', 'olho', it.t), titulo('O que aconteceu?'), opcoes(PORQUE.map(function (p) { return [p[0], function () { it.motivo = p[1]; ir('reorg', { id: it.id, fase: 'opcoes', mot: p[1] }); }]; }), 'motivos dois')], [voltar]);
    var v = M.proximo(dia().itens, it.dur, agora() + 10, 1380, it), NOMES = { quinze: ['Fazer 15 minutos agora', 'Uma parte já conta'], hoje: v !== null ? ['Hoje, às ' + M.hm(v), 'Achei esse espaço livre'] : null, amanha: ['Levar para amanhã', 'Entra na próxima agenda'], dividir: ['Dividir em duas partes', 'Metade hoje, metade amanhã'], outro: ['Guardar para outro dia', 'Sem data'], soltar: ['Deixar ir', 'Sai da lista'], ajuda: ['Me ajuda a começar', 'Um passo bem pequeno'] };
    var l = SAIDAS[q.mot] || SAIDAS.outro; if (it.treino) l = l.filter(function (x) { return x !== 'dividir'; });
    l = l.filter(function (x) { return NOMES[x]; });
    return etiqueta([el('p', 'olho', it.t), titulo('Qual destas serve?'), el('p', 'como', 'A primeira é a que eu faria.'), opcoes(l.map(function (x, i) { return [NOMES[x][0], function () { if (x === 'ajuda') travar(it.id); else acao(x, it); }, i ? '' : 'forte', NOMES[x][1]]; }))], [dupla(l.indexOf('soltar') < 0 ? botao('leve', 'Deixar ir', function () { acao('soltar', it); }) : null, botao('leve', 'Voltar', function () { ir(S.exec ? 'exec' : 'dia'); }))]);
  };
  T.hora = function () {
    var it = acha(S.tela.id); if (!it) return T.dia(); var h = campo('Novo horário', 'time', M.campo(it.ini));
    return etiqueta([el('p', 'olho', it.t), titulo('Qual é o novo horário?'), h], [botao('vai', 'Salvar', function () { var m = M.deCampo(h.entrada.value); if (m === null) return; antes(); it.ini = m; it.reag = true; dia().itens.sort(M.porHora); ir('dia'); avisa('Mudou para ' + M.hm(m) + '.', true); }), dupla(botao('leve', 'Voltar', function () { ir('dia'); }))]);
  };
  function reajusta() {
    var d = dia(), n = agora(), ab = d.itens.filter(function (x) { return x.st === 'aberta'; });
    var p = parametros(hoje()); p.energia = d.energia; p.treino = null;
    var fx = ab.filter(function (x) { return x.fixo && x.ini + x.dur > n; }), tr = ab.filter(function (x) { return x.treino; })[0];
    p.compromissos = fx.map(function (x) { var y = clone(x); y.hora = x.ini; return y; });
    if (tr) p.treino = { t: tr.t, tipo: tr.treino, dur: tr.dur, hora: Math.max(tr.ini, n) };
    p.tarefas = ab.filter(function (x) { return !x.fixo && !x.ancora && !x.treino; }).map(function (x) { var y = clone(x); y.manual = false; y.prio = y.prio || 2; return y; });
    var idsAnc = ab.filter(function (x) { return x.ancora; }).map(function (x) { return x.t; });
    var r = M.planejar(p); r.itens = r.itens.filter(function (x) { return !x.ancora || idsAnc.indexOf(x.t) >= 0; });
    r.itens.forEach(function (x) { if (!x.id || x.ancora) x.id = 'i' + (S.seq++); });
    var ficam = d.itens.filter(function (x) { return x.st !== 'aberta' || (x.fixo && x.ini + x.dur <= n); });
    S.rasc = { alvo: hoje(), passo: 3, energia: d.energia, comps: [], tars: [], itens: ficam.concat(r.itens).sort(M.porHora), cortes: r.cortes, hist: [], modo: 'reajuste' }; ir('plano');
  }
  function editaDia(c) { var d = S.dias[c]; S.rasc = { alvo: c, passo: 3, energia: d.energia, comps: [], tars: [], itens: clone(d.itens), cortes: [], hist: [], modo: 'editar' }; ir('plano'); }

  /* ---- planejar ---- */
  function iniciaPlano(alvo) {
    S.rasc = { alvo: alvo, passo: 0, energia: null, comps: clone(S.agenda[alvo] || []), tars: S.depois.filter(function (x) { return x.quando && x.quando <= alvo; }).map(nova), itens: [], cortes: [], hist: [], modo: 'novo' }; ir('plano');
  }
  function montar() {
    var R = S.rasc, p = parametros(R.alvo); p.energia = R.energia; p.compromissos = clone(R.comps); p.tarefas = clone(R.tars);
    var r = M.planejar(p); r.itens.forEach(function (x) { if (!x.id || x.ancora) x.id = 'i' + (S.seq++); delete x.hora; }); R.itens = r.itens; R.cortes = r.cortes; R.hist = []; R.passo = 3; ir('plano');
  }
  function hist() { var R = S.rasc; R.hist.push(JSON.stringify({ i: R.itens, c: R.cortes })); if (R.hist.length > 20) R.hist.shift(); }
  function passoTopo(n, t) { return el('p', 'olho claro', 'Passo ' + n + ' de 4' + (t ? ', ' + t : '')); }
  function voltaPlano() { var R = S.rasc; if (R.modo !== 'novo') { var a = R.alvo; S.rasc = null; return ir(a === hoje() ? 'dia' : 'amanha'); } if (R.passo > 0) { R.passo--; return ir('plano'); } S.rasc = null; ir(R.alvo === hoje() ? 'dia' : 'amanha'); }
  T.plano = function () {
    var R = S.rasc; if (!R) return T.dia(); return [P0, P1, P2, P3][R.passo]();
  };
  function P0() {
    var R = S.rasc, f = dia() && dia().fechado, pesou = f && R.alvo !== hoje() && (f.humor === 'pesado' || f.atrapalhou === 'excesso' || f.atrapalhou === 'cansaco');
    return fora([passoTopo(1), titulo(R.alvo === hoje() ? 'Como você chegou hoje?' : 'Como você acha que chega amanhã?'), el('p', 'fala', pesou ? 'Hoje pesou. Eu escolheria um dia leve.' : 'Isso decide quanto cabe na agenda.'), swatches(function (e) { R.energia = e; R.passo = 1; ir('plano'); })], [botao('leve', 'Sair', voltaPlano)]);
  }
  function P1() {
    var R = S.rasc, tr = treinoDe(R.alvo), pend = S.tela.pend;
    function add(v) { var b = M.interpretar(v); if (b.hora == null) return ir('plano', { pend: v }); poeComp(b); }
    function poeComp(b) { var c = nova(b); c.hora = b.hora; R.comps.push(c); R.comps.sort(function (x, y) { return x.hora - y.hora; }); ir('plano'); }
    var f = [passoTopo(2), titulo('Tem algo com hora marcada?'), el('p', 'fala', 'Cliente, consulta, reunião. Pode escrever "atendimento às 14h".')];
    if (pend) { var h = campo('A que horas?', 'time', ''); f.push(caixa('ficha', [el('b', '', pend), h, botao('mini', 'Pôr na agenda', function () { var m = M.deCampo(h.entrada.value); if (m === null) { h.entrada.focus(); return; } var b = M.interpretar(pend); b.hora = m; poeComp(b); }), botao('mini fraco', 'Cancelar', function () { ir('plano'); })])); }
    else f.push(entrada('eComp', 'Ex.: atendimento às 14h', function (v) { add(v); }));
    f.push(caixa('lista', R.comps.map(function (c, i) { return caixa('item', [botao('txt', null, function () { ir('comp', { i: i }); }), botao('x', '×', function () { R.comps.splice(i, 1); ir('plano'); })]); })));
    R.comps.forEach(function (c, i) { var b = f[f.length - 1].children[i].firstChild; b.appendChild(el('b', '', M.hm(c.hora) + '  ' + c.t)); b.appendChild(el('small', '', M.dura(c.dur) + (c.local ? ' · ' + c.local : '') + ' · tocar para detalhar')); f[f.length - 1].children[i].lastChild.setAttribute('aria-label', 'Tirar ' + c.t); });
    f.push(el('p', 'nota', tr ? 'Treino do dia: ' + tr.t + ', por volta de ' + M.hm(tr.hora) + '.' : 'Nenhum treino neste dia.'));
    f.push(botao('texto', 'Organizar meus treinos', function () { ir('treino', { volta: 'plano' }); }));
    return fora(f, [botao('vai', R.comps.length ? 'Continuar' : 'Não tenho nada marcado', function () { R.passo = 2; ir('plano'); }), botao('leve', 'Voltar', voltaPlano)]);
  }
  T.comp = function () {
    var R = S.rasc, c = R && R.comps[S.tela.i]; if (!c) return T.plano();
    var n = campo('Nome', 'text', c.t, { maxlength: 120 }), dt = campo('Data', 'date', R.alvo, { min: hoje() }), h = campo('Começa', 'time', M.campo(c.hora)), fi = campo('Termina', 'time', M.campo(c.hora + c.dur)), lo = campo('Local', 'text', c.local || '', { maxlength: 80 }), de = campo('Deslocamento, em minutos', 'number', c.desloc || '', { min: 0, max: 240, inputmode: 'numeric' }), ob = campo('Observações', 'text', c.obs || '', { maxlength: 200 }), err = el('p', 'alerta');
    return fora([titulo('Detalhes'), caixa('ficha', [n, dt, caixa('par', [h, fi]), lo, de, ob, err])], [botao('vai', 'Salvar', function () {
      var a = M.deCampo(h.entrada.value), b = M.deCampo(fi.entrada.value); if (a === null || b === null || b <= a) { err.textContent = 'O fim precisa ser depois do começo.'; return; }
      c.t = n.entrada.value.trim() || c.t; c.hora = a; c.dur = b - a; c.local = lo.entrada.value.trim(); c.desloc = Math.max(0, Math.min(240, parseInt(de.entrada.value, 10) || 0)); c.obs = ob.entrada.value.trim();
      var d = dt.entrada.value; if (d && d !== R.alvo && d >= hoje()) { R.comps.splice(R.comps.indexOf(c), 1); (S.agenda[d] = S.agenda[d] || []).push(c); ir('plano'); avisa('Guardei para ' + porExtenso(d) + '.'); return; }
      R.comps.sort(function (x, y) { return x.hora - y.hora; }); ir('plano');
    }), botao('leve', 'Voltar', function () { ir('plano'); })]);
  };
  function P2() {
    var R = S.rasc, tem = R.tars.map(function (x) { return M.limpa(x.t); });
    function add(v) { var foi = 0; M.separar(v).forEach(function (q) { var b = M.interpretar(q); if (!b) return; if (b.hora != null) { var c = nova(b); c.hora = b.hora; R.comps.push(c); foi++; } else if (R.tars.length < 25 && tem.indexOf(M.limpa(b.t)) < 0) { R.tars.push(nova(b)); tem.push(M.limpa(b.t)); } }); ir('plano'); if (foi) avisa(foi === 1 ? 'Tem hora, então foi para os compromissos.' : 'O que tem hora foi para os compromissos.'); }
    var f = [passoTopo(3), titulo('Jogue aqui o que quer fazer.'), el('p', 'fala', 'Sem ordem e sem capricho. Eu organizo.'), entrada('eTar', 'Ex.: estudar, gravar vídeo', add)];
    var l = el('div', 'lista'); R.tars.forEach(function (x, i) {
      var b = botao('txt', null, function () { ir('tarefa', { i: i }); }), u = botao('urg' + (x.urgente ? ' on' : ''), x.urgente ? 'Urgente' : 'Urgente?', function () { x.urgente = !x.urgente; salvar(); pintar(false, true); }), k = botao('x', '×', function () { R.tars.splice(i, 1); ir('plano'); });
      b.appendChild(el('b', '', x.t)); b.appendChild(el('small', '', M.CATS[x.cat].n + ' · ' + M.dura(x.dur))); u.setAttribute('aria-pressed', !!x.urgente); k.setAttribute('aria-label', 'Tirar ' + x.t); l.appendChild(caixa('item', [b, u, k]));
    }); f.push(l);
    var guard = S.depois.filter(function (x) { return tem.indexOf(M.limpa(x.t)) < 0; });
    if (guard.length) { f.push(el('p', 'nota', guard.length > 7 ? 'Guardadas de outros dias. São muitas: pode soltar o que não importa mais.' : 'Guardadas de outros dias:')); f.push(caixa('fichas', guard.slice(-7).map(function (x) { var k = botao('x', '×', function () { S.depois = S.depois.filter(function (y) { return y !== x; }); ir('plano'); }); k.setAttribute('aria-label', 'Soltar ' + x.t); return caixa('chip', [botao('', x.t, function () { R.tars.push(nova(x)); ir('plano'); }), k]); }))); }
    var sug = ['Retomar conversas com clientes', 'Criar um conteúdo', 'Estudar TikTok', 'Organizar materiais'].filter(function (x) { return tem.indexOf(M.limpa(x)) < 0 && !guard.some(function (g) { return M.limpa(g.t) === M.limpa(x); }); });
    if (sug.length) { f.push(el('p', 'nota', 'Ou toque para pôr:')); f.push(caixa('fichas', sug.map(function (x) { return caixa('chip', [botao('', x, function () { add(x); })]); }))); }
    return fora(f, [botao('vai', R.tars.length ? 'Montar minha agenda' : 'O Turno escolhe por mim', function () { if (!R.tars.length) R.tars = autoTarefas(R.energia, M.LIM[R.energia].auto); montar(); }), botao('leve', 'Voltar', voltaPlano)]);
  }
  T.tarefa = function () {
    var R = S.rasc, x = R && R.tars[S.tela.i]; if (!x) return T.plano();
    var n = campo('Nome', 'text', x.t, { maxlength: 120 }), c = seletor('Tipo', ['vendas', 'conteudo', 'estudo', 'cliente', 'casa', 'corpo', 'pessoal'].map(function (k) { return [k, M.CATS[k].n]; }), x.cat), d = seletor('Duração', duracoes(x.dur), x.dur);
    var ps = campo('Primeiro passo, bem pequeno', 'text', passos(x)[0], { maxlength: 140 });
    return fora([titulo('Ajustar tarefa'), caixa('ficha', [n, c, d, ps])], [botao('vai', 'Salvar', function () { x.t = n.entrada.value.trim() || x.t; x.cat = c.entrada.value; x.dur = +d.entrada.value; x.passos = passos(x).slice(); if (ps.entrada.value.trim()) x.passos[0] = ps.entrada.value.trim(); ir('plano'); }), botao('leve', 'Dividir em duas', function () { var m = Math.max(10, Math.round(x.dur / 10) * 5), y = nova(x); y.t = x.t + ' (parte 2)'; y.dur = Math.max(10, x.dur - m); x.t += ' (parte 1)'; x.dur = m; R.tars.splice(S.tela.i + 1, 0, y); ir('plano'); }), botao('leve', 'Voltar', function () { ir('plano'); })]);
  };
  function duracoes(v) { var l = [5, 10, 15, 20, 25, 30, 40, 45, 60, 75, 90, 120, 150, 180, 240]; if (l.indexOf(v) < 0) { l.push(v); l.sort(function (a, b) { return a - b; }); } return l.map(function (x) { return [x, M.dura(x)]; }); }
  function P3() {
    var R = S.rasc, f = [R.modo === 'novo' ? passoTopo(4) : null, titulo(R.modo === 'reajuste' ? 'O resto do seu dia ficou assim.' : 'Sua agenda de ' + nomeDia(R.alvo) + '.'), el('p', 'fala', 'Nada vale até você confirmar. Toque para editar ou arraste pela alça.')];
    var ad = R.cortes.filter(function (c) { return c.acao === 'adiar'; }), rd = R.cortes.filter(function (c) { return c.acao === 'reduzir'; }), av = R.cortes.filter(function (c) { return c.acao === 'conflito' || c.acao === 'aviso'; });
    if (ad.length || rd.length || av.length) {
      var q = caixa('naocabe', [el('h2', '', ad.length ? 'Não cabe tudo no seu dia.' : rd.length ? 'Ajustei para caber.' : 'Confira uma coisa.')]), mant = R.itens.filter(function (x) { return !x.ancora && x.st === 'aberta'; }).length;
      if (ad.length) q.appendChild(el('p', 'nota', 'Mantive ' + mant + '. O resto, eu sugiro assim:'));
      av.forEach(function (c) { q.appendChild(caixa('corte', [el('b', '', c.item.t), el('small', '', c.motivo)])); });
      rd.forEach(function (c) { q.appendChild(caixa('corte', [el('b', '', 'Reduzir: ' + c.item.t), el('small', '', 'De ' + M.dura(c.de) + ' para ' + M.dura(c.para) + '. ' + c.motivo)])); });
      var ver = S.tela.todas ? ad : ad.slice(0, 4), grupos = {}; ver.forEach(function (c) { (grupos[c.motivo] = grupos[c.motivo] || []).push(c); });
      Object.keys(grupos).forEach(function (g) { var cx = caixa('corte', [el('small', '', 'Adiar. ' + g)]); grupos[g].forEach(function (c) { var bt = botao('mini fraco', 'Pôr assim mesmo', function () { forca(c); }); bt.setAttribute('aria-label', 'Pôr assim mesmo: ' + c.item.t); cx.appendChild(caixa('cada', [el('b', '', c.item.t), bt])); }); q.appendChild(cx); });
      if (ad.length > ver.length) q.appendChild(botao('mini fraco', 'Ver as outras ' + (ad.length - ver.length), function () { S.tela.todas = true; pintar(false, true); }));
      f.push(q);
    }
    var l = el('div', 'agenda edita'); R.itens.forEach(function (x) { var ln = caixa('arrasta', [linha(x, null, x.st === 'aberta' ? function () { ir('edita', { id: x.id }); } : null, R.alvo !== hoje())]); if (x.st === 'aberta' && !x.fixo && !x.ancora) { var a = botao('alca', null, function () {}); a.setAttribute('aria-label', 'Arrastar ' + x.t); junta(a, [el('i'), el('i'), el('i')]); arrastar(a, ln, x, l); ln.appendChild(a); } l.appendChild(ln); });
    f.push(l);
    var nT = R.itens.filter(function (x) { return !x.ancora && !x.fixo && !x.treino && x.st === 'aberta'; }).length;
    f.push(caixa('acoes', [botao('', 'Pôr mais uma', function () { ir('porPlano'); }), nT < M.LIM[R.energia].auto ? botao('', 'Completar com sugestões', function () { hist(); autoTarefas(R.energia, M.LIM[R.energia].auto - nT).forEach(function (x) { encaixaNova(x); }); ir('plano'); }) : null, R.hist.length ? botao('', 'Desfazer', function () { var u = JSON.parse(R.hist.pop()); R.itens = u.i; R.cortes = u.c; ir('plano'); }) : null]));
    return fora(f, [botao('vai', 'Confirmar agenda', confirma), botao('leve', R.modo === 'novo' ? 'Voltar' : 'Sair sem mudar', voltaPlano)]);
  }
  function deR() { var R = S.rasc; return R.alvo === hoje() ? agora() : 540; }
  function encaixaNova(x) { var R = S.rasc, i = M.proximo(R.itens, x.dur, Math.max(deR(), 540), 1320); if (i === null) return false; x.ini = i; R.itens.push(x); R.itens.sort(M.porHora); return true; }
  function forca(c) { var R = S.rasc, x = nova(limpo(c.item)); if (c.item.treino) { x.treino = c.item.treino; x.manual = true; } hist(); if (!encaixaNova(x)) { x.dur = 15; if (!encaixaNova(x)) { R.hist.pop(); avisa('Não achei nenhum espaço livre.'); return; } } R.cortes.splice(R.cortes.indexOf(c), 1); ir('plano'); avisa('Entrou às ' + M.hm(x.ini) + '.'); }
  T.porPlano = function () {
    return fora([titulo('O que mais entra?'), entrada('ePP', 'Ex.: ligar para a gráfica', function (v) { var b = M.interpretar(v), x = nova(b); hist(); if (b.hora != null) { x.ini = b.hora; x.fixo = true; delete x.hora; S.rasc.itens.push(x); S.rasc.itens.sort(M.porHora); return ir('plano'); } delete x.hora; if (!encaixaNova(x)) { S.rasc.hist.pop(); avisa('Não achei espaço livre nesse dia.'); return; } ir('plano'); avisa('Entrou às ' + M.hm(x.ini) + '.'); })], [botao('leve', 'Voltar', function () { ir('plano'); })]);
  };
  function move(x, para) { var R = S.rasc, l = R.itens.slice(), i = l.indexOf(x); l.splice(i, 1); l.splice(para, 0, x); var antesManual = x.manual; x.manual = false; var r = M.encaixar(l, x, Math.max(deR(), R.alvo === hoje() ? 0 : 480)); if (!r) { x.manual = antesManual; avisa('Não coube depois disso.'); return pintar(false, true); } hist(); R.itens = r; salvar(); pintar(false, true); }
  function arrastar(alca, ln, x, l) {
    var y0 = null, dy = 0;
    alca.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; try { alca.setPointerCapture(e.pointerId); } catch (z) {} ln.classList.add('indo'); e.preventDefault(); });
    alca.addEventListener('pointermove', function (e) { if (y0 === null) return; dy = e.clientY - y0; ln.style.transform = 'translateY(' + dy + 'px)'; });
    function solta() {
      if (y0 === null) return; y0 = null; ln.classList.remove('indo'); ln.style.transform = '';
      if (Math.abs(dy) < 12) return; var c = ln.getBoundingClientRect(), meio = c.top + c.height / 2 + dy, ks = [].slice.call(l.children), eu = ks.indexOf(ln), para = 0;
      ks.forEach(function (k, i) { if (i === eu) return; var r = k.getBoundingClientRect(); if (r.top + r.height / 2 < meio) para++; });
      if (para !== eu) move(x, para);
    }
    alca.addEventListener('pointerup', solta); alca.addEventListener('pointercancel', function () { dy = 0; solta(); });
  }
  T.edita = function () {
    var R = S.rasc, x = R && R.itens.filter(function (y) { return y.id === S.tela.id; })[0]; if (!x) return T.plano();
    var n = campo('Nome', 'text', x.t, { maxlength: 120 }), h = campo('Horário', 'time', M.campo(x.ini)), d = seletor('Duração', duracoes(x.dur), x.dur), p = seletor('Prioridade', [['1', 'Urgente'], ['0', 'Normal']], x.urgente ? '1' : '0'), err = el('p', 'alerta'), i = R.itens.indexOf(x), flex = !x.fixo && !x.ancora;
    function bateCom(ini, dur) { return R.itens.filter(function (y) { return y !== x && y.st === 'aberta' && (y.fixo || y.ancora || y.manual || y.treino) && ini < M.faixa(y)[1] && ini + dur > M.faixa(y)[0]; })[0]; }
    return fora([titulo('Editar'), caixa('ficha', [n, caixa('par', [h, d]), flex ? p : null, err]),
      flex ? caixa('acoes', [botao('', 'Subir', function () { if (i > 0) { S.tela = { n: 'plano' }; move(x, i - 1); } }), botao('', 'Descer', function () { if (i < R.itens.length - 1) { S.tela = { n: 'plano' }; move(x, i + 1); } }), x.treino ? null : botao('', 'Dividir em duas', function () { hist(); var m = Math.max(10, Math.round(x.dur / 10) * 5), y = nova(limpo(x)); y.dur = Math.max(10, x.dur - m); y.t = x.t + ' (parte 2)'; x.t += ' (parte 1)'; x.dur = m; if (!encaixaNova(y)) { var u = JSON.parse(R.hist.pop()); R.itens = u.i; ir('plano'); avisa('Não achei espaço para a segunda parte.'); return; } ir('plano'); })]) : null],
      [botao('vai', 'Salvar', function () {
        var a = M.deCampo(h.entrada.value), du = +d.entrada.value; if (a === null) return; if (a < 240) a += 1440;
        if (R.alvo === hoje() && flex && a < agora() - 5 && a !== x.ini) { err.textContent = 'Esse horário já passou.'; return; }
        var ch = bateCom(a, du); if (ch) { var liv = M.proximo(R.itens.filter(function (y) { return y !== x && (y.fixo || y.ancora || y.manual || y.treino); }), du, a, 1320); err.textContent = 'Bate com ' + ch.t + ', às ' + M.hm(ch.ini) + '.' + (liv !== null ? ' O próximo livre é ' + M.hm(liv) + '. Já coloquei, é só salvar.' : ''); if (liv !== null) h.entrada.value = M.campo(liv); return; }
        hist(); var mudou = a !== x.ini || du !== x.dur; x.t = n.entrada.value.trim() || x.t; x.ini = a; x.dur = du; x.urgente = p.entrada.value === '1'; if (mudou && (flex || x.cat === 'fechar')) x.manual = true;
        R.itens.sort(M.porHora); var r = M.encaixar(R.itens, null, R.alvo === hoje() ? Math.min(agora(), a) : 0); if (r) R.itens = r; ir('plano');
      }), dupla(botao('leve', 'Excluir', function () { hist(); R.itens.splice(i, 1); ir('plano'); }), botao('leve', 'Voltar', function () { ir('plano'); }))]);
  };
  function confirma() {
    var R = S.rasc, h = R.alvo === hoje(), velho = S.dias[R.alvo]; antes();
    R.itens.sort(M.porHora); tiraDeDepois(R.itens.filter(function (x) { return !x.ancora && x.st === 'aberta'; }));
    R.cortes.filter(function (c) { return c.acao === 'adiar' && !c.item.sug && !c.item.treino; }).forEach(function (c) { guarda(c.item, null); });
    if (velho && R.modo === 'reajuste') R.cortes.filter(function (c) { return c.acao === 'adiar'; }).forEach(function (c) { var y = clone(c.item); y.st = 'adiada'; y.ini = y.ini || agora(); R.itens.push(y); });
    if (h) R.itens = vindas().concat(R.itens); R.itens.sort(M.porHora); S.dias[R.alvo] = { itens: R.itens, energia: R.energia, feitoEm: Date.now() }; if (R.modo === 'novo') S.agenda[R.alvo] = clone(R.comps); S.rasc = null;
    if (S.exec && !acha(S.exec.id)) S.exec = null; persistir(); ir(h ? 'dia' : 'amanha'); avisa(h ? 'Agenda de hoje confirmada.' : 'Amanhã está pronto. Pode descansar.', R.modo !== 'novo' && h);
  }
  T.amanha = function () {
    var a = amanha(), d = S.dias[a], f;
    if (S.rasc && S.rasc.alvo === a && !d) return fora([titulo('Preparar meu amanhã'), el('p', 'fala', 'Você parou no passo ' + (S.rasc.passo + 1) + ' de 4. Está tudo guardado.')], [botao('vai', 'Continuar', function () { ir('plano'); }), botao('leve', 'Começar de novo', function () { iniciaPlano(a); })]);
    if (!d) return fora([titulo('Preparar meu amanhã'), el('p', 'fala', 'Quatro passos curtos: sua energia, o que tem hora, o que quer fazer, e eu monto a agenda.')], [botao('vai', 'Começar', function () { iniciaPlano(a); }), botao('leve', 'Voltar para hoje', function () { ir('dia'); })]);
    f = d.itens.filter(function (x) { return !x.ancora; })[0];
    return fora([titulo('Amanhã está pronto.'), el('p', 'fala', maiusc(porExtenso(a)) + (f ? '. Começa com: ' + f.t : '') + '.'), caixa('agenda', d.itens.map(function (x) { return linha(x, null, null, true); }))], [botao('vai', 'Mudar algo', function () { editaDia(a); }), botao('leve', 'Voltar para hoje', function () { ir('dia'); })]);
  };

  /* ---- fechar a loja ---- */
  T.fechar = function () {
    var d = dia(); if (!d) return T.dia(); var q = S.tela, fe = d.itens.filter(function (x) { return x.st === 'feita' && !x.ancora; }), ab = d.itens.filter(function (x) { return x.st === 'aberta' && !x.ancora; });
    var f = q.f || (q.f = {}), sair = botao('leve', 'Ainda não, voltar', function () { ir('dia'); });
    function seg(p, extra) { ir('fechar', { p: p, f: f }); }
    if (q.p === 0) { var l = el('ul', 'caixa'); fe.forEach(function (x) { l.appendChild(el('li', '', x.t)); }); return fora([titulo('Fechar a loja'), el('p', 'fala', fe.length ? 'Isto você fez hoje:' : 'Você abriu a loja hoje. Isso conta.'), l], [botao('vai', 'Continuar', function () { seg(ab.length ? 1 : 2); }), sair]); }
    if (q.p === 1) {
      var it = ab[0]; if (!it) { q.p = 2; return T.fechar(); }
      function dest(st, g) { return function () { if (g !== undefined) guarda(it, g); it.st = st; if (st === 'feita' && it.treino) S.treinosFeitos.push({ d: hoje(), tipo: it.treino, t: it.t }); seg(ab.length > 1 ? 1 : 2); }; }
      var ops = it.fixo ? [['Aconteceu', dest('feita')], ['Foi para outro dia', dest('adiada', null)], ['Foi cancelado', dest('cancelada')]] : it.treino || it.sug ? [['Eu fiz', dest('feita')], ['Deixar ir', dest('cancelada')]] : [['Eu fiz', dest('feita')], ['Levar para amanhã', dest('adiada', amanha())], ['Guardar para outro dia', dest('adiada', null)], ['Deixar ir', dest('cancelada')]];
      return etiqueta([el('p', 'olho', ab.length === 1 ? 'Só esta ficou aberta' : 'Uma de cada vez'), titulo(it.t), el('p', 'como', it.fixo ? 'O que houve com este compromisso?' : 'O que fazemos com ela?'), opcoes(ops)], [dupla(sair.cloneNode && botao('leve', 'Ainda não, voltar', function () { ir('dia'); }))]);
    }
    if (q.p === 2) return etiqueta([el('p', 'olho', 'Quase lá'), titulo('Como foi hoje?'), opcoes([['Pesado', function () { f.humor = 'pesado'; seg(3); }], ['Normal', function () { f.humor = 'normal'; seg(3); }], ['Bom', function () { f.humor = 'bom'; seg(3); }]])], [dupla(botao('leve', 'Pular', function () { seg(3); }))]);
    if (q.p === 3) return etiqueta([el('p', 'olho', 'Isso ajuda a montar amanhã'), titulo('O que mais atrapalhou?'), opcoes([['Nada', 'nada'], ['Distração', 'distracao'], ['Cansaço', 'cansaco'], ['Imprevisto', 'imprevisto'], ['Coisa demais', 'excesso'], ['Não consegui começar', 'comecar']].map(function (x) { return [x[0], function () { f.atrapalhou = x[1]; seg(4); }]; }), 'motivos dois')], [dupla(botao('leve', 'Pular', function () { seg(4); }))]);
    var bom = campo('Uma coisa boa de hoje', 'text', '', { maxlength: 160 });
    function fim() { f.bom = bom.entrada.value.trim(); f.em = Date.now(); d.fechado = f; S.exec = null; S.trv = null; ir('dia'); }
    return etiqueta([el('p', 'olho', 'Última'), titulo('O que foi bom hoje?'), el('p', 'como', 'Pode ser pequeno. Pode deixar em branco.'), bom], [botao('vai', 'Fechar a loja', fim)]);
  };
  T.fechado = function () {
    var d = dia(), fe = d.itens.filter(function (x) { return x.st === 'feita' && !x.ancora; }), l = el('ul', 'caixa'), am = S.dias[amanha()], p = am && am.itens.filter(function (x) { return !x.ancora; })[0];
    fe.forEach(function (x) { l.appendChild(el('li', '', x.t)); }); var f = [titulo('Loja fechada.'), el('p', 'fala', fe.length ? 'Isto você fez hoje:' : 'Você abriu a loja hoje. Amanhã a gente continua.'), l];
    if (d.fechado.bom) f.push(el('p', 'amanha', 'E foi bom: ' + d.fechado.bom));
    if (p) { var q = el('p', 'amanha', 'Amanhã começa às ' + M.hm(p.ini) + ':'); q.appendChild(el('b', '', p.t)); f.push(q); }
    return fora(f, [am ? botao('vai', 'Ver amanhã', function () { ir('amanha'); }) : botao('vai', 'Preparar meu amanhã', function () { if (S.rasc && S.rasc.alvo === amanha()) ir('plano'); else iniciaPlano(amanha()); }), botao('leve', 'Reabrir a loja', function () { d.fechado = null; ir('dia'); })]);
  };

  /* ---- treinos, rotina, ajustes ---- */
  T.treino = function () {
    var t = S.treinos, volta = S.tela.volta || 'dia', l = el('div', 'ficha'), h = campo('Horário preferido', 'time', M.campo(t.hora)), du = seletor('Duração da musculação', [[30, '30 min'], [45, '45 min'], [60, '1h'], [75, '1h15'], [90, '1h30']], t.dur);
    h.entrada.addEventListener('change', function () { var m = M.deCampo(h.entrada.value); if (m !== null) { t.hora = m; salvar(); } }); du.entrada.addEventListener('change', function () { t.dur = +du.entrada.value; salvar(); });
    [1, 2, 3, 4, 5, 6, 0].forEach(function (w) {
      var x = t.dias[w] || { tipo: '', nome: '' }, s = seletor(maiusc(SEM[w]), Object.keys(TIPOS).map(function (k) { return [k, TIPOS[k]]; }), x.tipo), r = caixa('treinoDia', [s]);
      s.entrada.addEventListener('change', function () { t.dias[w] = { tipo: s.entrada.value, nome: x.nome || '' }; salvar(); pintar(false, true); });
      if (x.tipo === 'musculacao') { var n = campo('Qual treino? (ex.: A, pernas)', 'text', x.nome, { maxlength: 24 }); n.entrada.addEventListener('change', function () { t.dias[w].nome = n.entrada.value.trim(); salvar(); }); r.appendChild(n); }
      l.appendChild(r);
    });
    var seq = 0, m = 0; for (var i = 0; i < 14; i++) { var y = t.dias[i % 7]; seq = y && y.tipo === 'musculacao' ? seq + 1 : 0; m = Math.max(m, seq); }
    var rec = S.treinosFeitos.slice(-8).reverse(), f = [titulo('Meus treinos'), el('p', 'fala', 'Marque a semana uma vez. Eu encaixo na agenda.'), caixa('ficha', [caixa('par', [h, du])]), l];
    if (m >= 3) f.push(el('p', 'nota', 'São ' + (m > 7 ? 7 : m) + ' dias seguidos de musculação. Quer um descanso no meio?'));
    if (rec.length) { f.push(el('h2', '', 'Últimos treinos')); f.push(junta(el('ul', 'caixa'), rec.map(function (x) { return el('li', '', maiusc(porExtenso(x.d)) + ': ' + x.t); }))); }
    return fora(f, [botao('vai', 'Pronto', function () { ir(volta); })]);
  };
  T.rotina = function () {
    var l = el('div', 'ficha'), err = el('p', 'alerta'), cs = S.rotina.map(function (b) { var n = campo('', 'text', b.t, { maxlength: 60, 'aria-label': 'Nome' }), h = campo('', 'time', M.campo(b.ini), { 'aria-label': 'Início de ' + b.t }), d = seletor('', duracoes(b.dur), b.dur); d.entrada.setAttribute('aria-label', 'Duração de ' + b.t); l.appendChild(caixa('rot', [n, caixa('par', [h, d])])); return { b: b, n: n, h: h, d: d }; });
    return fora([titulo('Minha rotina-base'), el('p', 'fala', 'É um molde. Os compromissos do dia mandam mais.'), l, err], [botao('vai', 'Salvar', function () {
      for (var i = 0; i < cs.length; i++) if (M.deCampo(cs[i].h.entrada.value) === null) { err.textContent = 'Falta um horário.'; return; }
      cs.forEach(function (c) { c.b.t = c.n.entrada.value.trim() || c.b.t; c.b.ini = M.deCampo(c.h.entrada.value); c.b.dur = +c.d.entrada.value; }); S.rotina.sort(M.porHora); ir('ajustes'); avisa('Rotina salva. Vale da próxima agenda em diante.');
    }), botao('leve', 'Voltar ao modelo original', function () { S.rotina = clone(M.ROTINA); ir('rotina'); }), botao('leve', 'Voltar', function () { ir('ajustes'); })]);
  };
  T.ajustes = function () {
    var n = campo('Seu nome', 'text', S.nome, { maxlength: 24 }), arq = el('input'), st = el('p', 'nota'); n.entrada.addEventListener('change', function () { S.nome = n.entrada.value.trim(); salvar(); });
    arq.type = 'file'; arq.accept = '.json,application/json'; arq.hidden = true;
    arq.addEventListener('change', function () { var f = arq.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { try { var o = JSON.parse(r.result); if (!valido(o)) throw 0; S = completa(o); S.copiaDe = ''; salvar(); ir('dia'); avisa('Cópia restaurada.'); } catch (e) { st.textContent = 'Esse arquivo não é uma cópia do Turno. Nada mudou.'; } }; r.readAsText(f); });
    return fora([titulo('Ajustes'), caixa('ficha', [n]), caixa('acoes uma', [botao('', 'Minha rotina-base', function () { ir('rotina'); }), botao('', 'Meus treinos', function () { ir('treino', { volta: 'ajustes' }); }), botao('', 'Guardar cópia de segurança', copia), botao('', 'Restaurar uma cópia', function () { arq.click(); })]), arq, st,
      el('h2', '', 'Para o Turno te chamar'), el('p', 'fala', 'Por enquanto, use o Relógio do iPhone. Crie dois alarmes: um de manhã, "Abrir a loja", e um à noite, "Preparar meu amanhã".'), el('p', 'nota', 'Tudo fica só neste aparelho. Ninguém mais vê.')], [botao('leve', 'Voltar', function () { ir('dia'); })]);
  };
  function copia() {
    var nome = 'turno-copia-' + hoje() + '.json', txt = JSON.stringify(S), b = new Blob([txt], { type: 'application/json' }), f;
    function baixa() { var a = el('a'), u = URL.createObjectURL(b); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); avisa('Cópia pronta: ' + nome); }
    try { f = new File([b], nome, { type: 'application/json' }); if (/iPhone|iPad/.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).then(function () { avisa('Cópia guardada.'); }, function (e) { if (e && e.name !== 'AbortError') baixa(); }); return; } } catch (e) {}
    baixa();
  }

  /* ================= desenhar ================= */
  var COMNAV = { dia: 1, amanha: 1 };
  function pintar(foco, fica) {
    clearInterval(tic); virarDia(); var y = window.scrollY, n = S.tela.n; if (!T[n]) S.tela = { n: 'dia' }, n = 'dia';
    var no; try { no = T[n](); } catch (e) { if (window.console) console.error(e); S.tela = { n: 'dia' }; S.exec = null; S.trv = null; n = 'dia'; no = T.dia(); }
    tela.replaceChildren(no); document.body.className = 't-' + n;
    var d = dia(), q = d ? Math.min(12, d.itens.filter(function (x) { return x.st === 'feita' && !x.ancora; }).length) : 0;
    while (pecas.children.length > q) pecas.lastChild.remove(); while (pecas.children.length < q) pecas.appendChild(el('li'));
    var mostra = COMNAV[n] && d && !(n === 'dia' && d.fechado); barra.hidden = !mostra;
    if (mostra) barra.replaceChildren(botao(n === 'dia' ? 'on' : '', 'Meu dia', function () { ir('dia'); }), botao('trav', 'Estou travada', function () { travar(null); }), botao(n === 'amanha' ? 'on' : '', 'Amanhã', function () { ir('amanha'); }));
    tela.classList.toggle('semanim', !!fica); window.scrollTo(0, fica ? y : 0);
    if (foco) { var h = tela.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && (S.hoje !== hoje() || /^(dia|exec)$/.test(S.tela.n) || (S.tela.n === 'travei' && S.trv && S.trv.fase === 'tempo'))) pintar(false, true); });
  window.addEventListener('storage', function (e) { if (e.key === K && e.newValue) { try { var o = JSON.parse(e.newValue); if (valido(o)) { S = completa(o); if (S.tela.n === 'dia') pintar(false, true); } } catch (x) {} } });
  if (S.tela.n !== 'exec' && S.tela.n !== 'travei' && S.tela.n !== 'plano') S.tela = { n: 'dia' };
  virarDia(); salvar(); pintar(false);
})();
