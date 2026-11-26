/* Turno 3. Tudo fica neste aparelho (localStorage). Nenhum pedido de rede é feito (ver CSP no index.html). */
(function () {
  'use strict';
  var M = MOTOR, K = 'turno3';
  var ENE = [['boa', 'Bem', 'Dia completo', '#c58a2e'], ['media', 'Mais ou menos', 'Dia normal, com folga', '#c2643a'], ['baixa', 'Sem energia', 'As 4 obrigações pela metade e só o que vence', '#8f7563']];
  var SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var TIPOS = { '': 'Descanso', musculacao: 'Musculação', caminhada: 'Caminhada', leve: 'Atividade leve' };
  var tela = document.getElementById('tela'), barra = document.getElementById('nav'), torrada = document.getElementById('torrada');
  var tic = null, tt = null, desfaz = null, salvou = true;

  /* ================= memória ================= */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function novo() { return { v: 3, nome: '', hoje: '', ultimo: '', dias: {}, agenda: {}, pend: [], rotina: clone(M.ROTINA), treinos: { hora: 930, dur: 60, dias: {} }, treinosFeitos: [], vistas: [], zero: 0, seq: 1, exec: null, trv: null, tela: { n: 'dia' }, dicaIcone: 0 }; }
  function valido(o) { return !!(o && o.v === 3 && o.dias && typeof o.dias === 'object' && o.agenda && typeof o.agenda === 'object' && Array.isArray(o.pend) && Array.isArray(o.rotina) && Array.isArray(o.vistas) && o.treinos && o.treinos.dias && o.tela); }
  function completa(o) { var n = novo(), k; for (k in n) if (!(k in o)) o[k] = n[k]; return o; }
  function ler() {
    var chaves = [K, K + '_copia'];
    for (var i = 0; i < 2; i++) { try { var o = JSON.parse(localStorage.getItem(chaves[i])); if (valido(o)) return completa(o); } catch (e) {} }
    var a = null; try { a = JSON.parse(localStorage.getItem('turno2')); } catch (e) {}
    return migra(a);
  }
  function pendDe(b, s) {
    return { id: 'p' + (s.seq++), t: String(b.t || 'Pendência').slice(0, 120), cat: M.CATS[b.cat] ? b.cat : 'casa', dur: Math.max(5, Math.min(600, b.dur | 0 || 30)), feito: 0, prazo: b.prazo || null, cliente: !!b.cliente, desde: hoje(),
      como: b.como || '', passos: Array.isArray(b.passos) ? b.passos.slice(0, 6) : [], menor: b.menor || '', rascunho: b.rascunho || '' };
  }
  /* traz o que existia na versão 2: nome, treinos, compromissos e o que ela tinha anotado. A chave antiga não é apagada */
  function migra(a) {
    var s = novo(), h = hoje();
    if (!a || a.v !== 2) { try { var v1 = JSON.parse(localStorage.getItem('turno')); if (v1 && typeof v1.nome === 'string') s.nome = v1.nome; } catch (e) {} return s; }
    s.nome = typeof a.nome === 'string' ? a.nome : ''; s.vistas = Array.isArray(a.vistas) ? a.vistas.filter(function (v) { return typeof v === 'string'; }) : []; s.zero = a.zero | 0; s.seq = Math.max(1, a.seq | 0); s.dicaIcone = a.dicaIcone ? 1 : 0;
    if (a.treinos && a.treinos.dias) s.treinos = a.treinos; if (Array.isArray(a.treinosFeitos)) s.treinosFeitos = a.treinosFeitos.slice(-30);
    var MAP = { cafe: 'cafe', org: 'org', vendas: 'vendas', aparecer: 'conteudo', estudo: 'estudo', almoco: 'almoco', fechar: 'fechar' };
    if (Array.isArray(a.rotina)) s.rotina.forEach(function (b) { var o = a.rotina.filter(function (x) { return x && x.id === MAP[b.id]; })[0]; if (o && typeof o.ini === 'number' && typeof o.dur === 'number') { b.ini = o.ini; b.dur = o.dur; } });
    var tem = {};
    if (a.agenda) Object.keys(a.agenda).forEach(function (k) { if (k >= h && Array.isArray(a.agenda[k])) s.agenda[k] = a.agenda[k].filter(function (c) { return c && typeof c.hora === 'number'; }).map(function (c) { return { id: 'c' + (s.seq++), t: String(c.t || 'Compromisso'), cat: c.cat || 'cliente', hora: c.hora, dur: c.dur || 60, local: c.local || '', desloc: c.desloc || 0, obs: c.obs || '' }; }); });
    function poe(x, prazo) { if (!x || !x.t) return; var k = M.limpa(String(x.t)); if (tem[k]) return; tem[k] = 1; s.pend.push(pendDe({ t: x.t, cat: x.cat, dur: x.dur, prazo: prazo, cliente: x.cat === 'cliente', como: x.como, passos: x.passos, menor: x.menor, rascunho: x.rascunho }, s)); }
    if (a.dias) Object.keys(a.dias).sort().forEach(function (k) { var d = a.dias[k]; if (k >= h && d && Array.isArray(d.itens)) d.itens.forEach(function (x) { if (x.st === 'aberta' && !x.ancora && !x.fixo && !x.sug && !x.treino) poe(x, k > h ? k : null); }); });
    if (Array.isArray(a.depois)) a.depois.forEach(function (x) { poe(x, x.quando && x.quando >= h ? x.quando : null); });
    return s;
  }
  function salvar() {
    try { var t = JSON.stringify(S); localStorage.setItem(K, t); salvou = true; if (S.copiaDe !== S.hoje && valido(S)) { S.copiaDe = S.hoje; localStorage.setItem(K + '_copia', t); } } catch (e) { salvou = false; }
  }
  if (location.hash === '#zerar') { try { [K, K + '_copia', 'turno2', 'turno2_copia', 'turno'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} location.hash = ''; }
  var S = ler(), mm = /[#&]n=([^&]+)/.exec(location.hash);
  if (mm) { try { S.nome = decodeURIComponent(mm[1]).slice(0, 24); } catch (e) {} }

  /* ================= datas ================= */
  /* o dia vira às 4h da manhã */
  function chave(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hoje() { return chave(new Date(Date.now() - 4 * 36e5)); }
  function data(c) { var p = c.split('-'); return new Date(+p[0], p[1] - 1, +p[2], 12); }
  function amanha() { return M.somaDias(hoje(), 1); }
  function agora() { var d = new Date(), m = d.getHours() * 60 + d.getMinutes(); return d.getHours() < 4 ? m + 1440 : m; }
  function porExtenso(c) { var d = data(c); return SEM[d.getDay()] + ', ' + d.getDate() + ' de ' + MES[d.getMonth()]; }
  function curta(c) { var d = data(c); return SEM[d.getDay()].slice(0, 3) + ', ' + d.getDate(); }
  function maiusc(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function nomeDia(c) { var n = M.diasEntre(hoje(), c); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n > 1 && n < 7 ? SEM[data(c).getDay()] : porExtenso(c); }
  function prazoTxt(p) { if (!p) return 'Sem prazo'; var n = M.diasEntre(hoje(), p); return n <= 0 ? 'Para hoje' : n === 1 ? 'Para amanhã' : 'Até ' + nomeDia(p); }

  function virarDia() {
    if (S.hoje === hoje()) return;
    if (S.hoje) S.ultimo = S.hoje;
    S.hoje = hoje(); S.exec = null; S.trv = null; S.tela = { n: 'dia' };
    var lim = M.somaDias(S.hoje, -14); Object.keys(S.dias).forEach(function (k) { if (k < lim) delete S.dias[k]; });
    Object.keys(S.agenda).forEach(function (k) { if (k < S.hoje) delete S.agenda[k]; });
    S.pend.forEach(function (p) { if (p.naoAntes && p.naoAntes <= S.hoje) delete p.naoAntes; });
    salvar();
  }

  /* ================= dia ================= */
  function dia() { return S.dias[hoje()] || null; }
  function comps(c) { return (S.agenda[c || hoje()] || []).slice().sort(function (a, b) { return a.hora - b.hora; }); }
  function acha(id) { var d = dia(); if (!d) return null; return d.fila.concat(d.fixos).filter(function (x) { return x.id === id; })[0] || null; }
  function pend(id) { return S.pend.filter(function (p) { return p.id === id; })[0] || null; }
  function passos(it) { return it.passos && it.passos.length ? it.passos : ['Deixe na sua frente o que você precisa.', 'Faça a parte mais fácil primeiro.']; }
  function menor(it) { return it.menor || 'Dois minutos da parte mais fácil.'; }
  function treinoDe(c) { var x = S.treinos.dias[data(c).getDay()]; if (!x || !x.tipo) return null; return { t: TIPOS[x.tipo] + (x.nome ? ' ' + x.nome : ''), tipo: x.tipo, dur: x.tipo === 'musculacao' ? S.treinos.dur : Math.min(S.treinos.dur, 40), hora: S.treinos.hora }; }
  function ordem(area) {
    var todas = ORDENS.filter(function (o) { return o.area === area; }), livres = todas.filter(function (o) { return S.vistas.indexOf(o.id) < 0; });
    if (!livres.length) { S.vistas = S.vistas.filter(function (v) { return !todas.some(function (o) { return o.id === v; }); }); livres = todas; }
    var o = livres[0]; S.vistas.push(o.id); if (S.vistas.length > 80) S.vistas.shift(); return o;
  }
  function ids(l) { l.forEach(function (x) { x.id = 'i' + (S.seq++); }); return l; }
  function montarHoje(e) {
    var h = hoje(), r = M.montarDia({ rotina: S.rotina, animo: e, pend: S.pend, base: h, comps: comps(), treino: treinoDe(h), inicio: agora(), ordens: { vendas: ordem('v'), aparecer: ordem('i') } });
    S.dias[h] = { energia: e, fila: ids(r.fila), fixos: ids(r.fixos), fim: r.fim }; persistir(); ir('dia');
  }
  /* mudou o ânimo no meio do dia: o que já foi feito fica, o resto é montado de novo */
  function refazer(e) {
    var d = dia(); antes();
    var fica = d.fila.filter(function (x) { return x.st !== 'aberta' || (S.exec && S.exec.id === x.id); }), refs = fica.map(function (x) { return x.ref; }), velhas = {};
    d.fila.forEach(function (x) { if (x.tipo === 'obrig' && x.st === 'aberta') velhas[x.ref] = x; });
    var r = M.montarDia({ rotina: S.rotina, animo: e, pend: S.pend, base: hoje(), comps: comps(), treino: null, inicio: agora(), ordens: null });
    r.fila = r.fila.filter(function (x) { return x.tipo === 'pend' ? !fica.some(function (y) { return y.ref === x.ref && y.st === 'aberta'; }) : refs.indexOf(x.ref) < 0; });
    r.fila.forEach(function (x) { var v = velhas[x.ref]; if (v) { x.passos = v.passos; x.copia = v.copia; x.menor = v.menor; x.rascunho = v.rascunho; } });
    d.fila = fica.concat(ids(r.fila)); d.energia = e; ir('dia'); avisa('Pronto. Montei o resto do dia de novo.', true);
  }
  /* pendência nova entra hoje se vence logo ou se ainda cabe; senão, fica para os próximos dias */
  function encaixa(p) {
    var d = dia(); if (!d || d.fechado) return 'depois';
    if (d.fila.some(function (x) { return x.st === 'aberta' && x.ref === p.id; })) return 'hoje';
    var x = M.partes(p, hoje()); if (!x) return 'depois';
    var e = ids([M.entradaPend(x)])[0], ab = d.fila.filter(function (y) { return y.st === 'aberta'; }), i;
    if (x.vence) { i = ab.length ? d.fila.indexOf(ab[0]) + 1 : d.fila.length; d.fila.splice(i, 0, e); return 'agora'; }
    if (x.must) { var ob = ab.filter(function (y) { return y.tipo === 'obrig'; }); i = ob.length ? d.fila.indexOf(ob[ob.length - 1]) + 1 : ab.length ? d.fila.indexOf(ab[0]) + 1 : d.fila.length; d.fila.splice(i, 0, e); return 'hoje'; }
    if (d.energia === 'baixa') return 'depois';
    d.fila.push(e); projeta(d); if (e.cabe) return 'hoje';
    d.fila.splice(d.fila.indexOf(e), 1); return 'depois';
  }
  function tiraDeHoje(p) { var d = dia(); if (d) d.fila = d.fila.filter(function (x) { return !(x.st === 'aberta' && x.ref === p.id && x.tipo === 'pend' && !(S.exec && S.exec.id === x.id)); }); }
  function bloqueios(d) { return d.fixos.filter(function (x) { return x.tipo === 'pausa' || (x.tipo === 'treino' && x.st === 'aberta'); }).concat(comps().map(function (c) { return { ini: c.hora, dur: c.dur, desloc: c.desloc }; })); }
  function projeta(d) {
    var ex = S.exec && acha(S.exec.id);
    M.projetar(d.fila, bloqueios(d), agora(), d.fim, ex && ex.tipo !== 'treino' ? { id: ex.id, ini: S.exec.m } : null);
    return d.fila.filter(function (x) { return x.st === 'aberta'; });
  }

  /* qual é a vez */
  function vez() {
    var d = dia(); if (!d) return { tipo: 'porta' };
    var n = agora(), ab = projeta(d), head = ab[0], cs = comps();
    if (S.exec && acha(S.exec.id)) return { tipo: 'tarefa', it: acha(S.exec.id), prox: ab.filter(function (x) { return x.id !== S.exec.id; })[0] };
    var c = cs.filter(function (x) { return x.hora - (x.desloc || 0) <= n && n < x.hora + x.dur; })[0]; if (c) return { tipo: 'comp', it: c, prox: head };
    var tr = d.fixos.filter(function (x) { return x.tipo === 'treino' && x.st === 'aberta' && x.ini - 10 <= n && n < x.ini + x.dur; })[0]; if (tr) return { tipo: 'treino', it: tr, prox: head };
    var pz = d.fixos.filter(function (x) { return x.tipo === 'pausa' && x.ini <= n && n < x.ini + x.dur; })[0];
    if (pz && (!head || head.ini >= pz.ini + pz.dur)) return { tipo: 'pausa', it: pz, prox: head };
    if (head && (n < d.fim || head.prazo && M.diasEntre(hoje(), head.prazo) <= 0)) return { tipo: 'tarefa', it: head, prox: ab[1] };
    if (head) return { tipo: 'hora', it: head };
    return { tipo: n < d.fim ? 'livre' : 'fim' };
  }

  /* ================= ações ================= */
  function ir(n, extra) { esconde(); S.tela = { n: n }; for (var k in extra || {}) S.tela[k] = extra[k]; salvar(); pintar(true); }
  function antes() { desfaz = JSON.stringify({ c: hoje(), d: S.dias[hoje()] || null, p: S.pend, a: S.agenda, tf: S.treinosFeitos, ex: S.exec, te: S.tela }); }
  function desfazer() {
    if (!desfaz) return; var u = JSON.parse(desfaz); desfaz = null; if (u.c !== hoje()) return;
    if (u.d) S.dias[u.c] = u.d; else delete S.dias[u.c];
    S.pend = u.p; S.agenda = u.a; S.treinosFeitos = u.tf; S.exec = u.ex; S.trv = null; S.tela = S.exec && u.te.n === 'exec' ? u.te : { n: 'dia' }; esconde(); salvar(); pintar(true);
  }
  function esconde() { clearTimeout(tt); torrada.hidden = true; torrada.replaceChildren(); }
  function avisa(t, comDesfazer) {
    esconde(); torrada.appendChild(el('span', '', t)); if (comDesfazer) torrada.appendChild(botao('', 'Desfazer', desfazer)); torrada.hidden = false; tt = setTimeout(esconde, comDesfazer ? 9000 : 4500);
  }
  function persistir() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} }
  function comecar(id, durMin) {
    var it = acha(id); if (!it) return ir('dia'); var d = durMin || it.dur, a = Date.now();
    S.trv = null; S.exec = { id: id, passo: 0, ini: a, m: agora(), arr: a + 12e4, fim: a + Math.max(d, 2) * 6e4, tot: Math.max(d, 2) * 6e4 }; persistir(); ir('exec');
  }
  function marca(it, tudo) {
    it.st = 'feita'; it.ini = S.exec && S.exec.id === it.id ? S.exec.m : Math.max(0, agora() - it.dur); it.cabe = true;
    if (it.tipo === 'treino') S.treinosFeitos.push({ d: hoje(), tipo: it.ref, t: it.t });
    if (it.tipo === 'pend') { var p = pend(it.ref); if (p) { p.feito = (p.feito || 0) + it.dur; if (tudo || p.feito >= p.dur) S.pend.splice(S.pend.indexOf(p), 1); } }
  }
  function conclui(id, tudo) { var it = acha(id); if (!it) return ir('dia'); antes(); marca(it, tudo); S.exec = null; S.trv = null; ir('feito', { id: id }); }
  function sobe(it) { var d = dia(), ab = d.fila.filter(function (x) { return x.st === 'aberta' && x !== it; }); d.fila.splice(d.fila.indexOf(it), 1); d.fila.splice(ab.length ? d.fila.indexOf(ab[0]) : d.fila.length, 0, it); }
  function acao(q, it) {
    antes(); if (S.exec && S.exec.id === it.id) S.exec = null; S.trv = null; var d = dia(), p = it.tipo === 'pend' ? pend(it.ref) : null, msg = '';
    if (q === 'quinze') { it.dur = Math.min(it.dur, 15); sobe(it); return comecar(it.id, 15); }
    if (q === 'depois') { d.fila.splice(d.fila.indexOf(it), 1); d.fila.push(it); msg = 'Foi para o fim do dia.'; }
    if (q === 'amanha') { it.st = 'pulada'; if (p) p.naoAntes = amanha(); msg = p ? 'Fica para amanhã. Eu coloco no dia certo.' : 'Hoje não. Amanhã volta no horário de sempre.'; }
    if (q === 'dividir') { it.dur = Math.max(10, Math.round(it.dur / 10) * 5); if (p) it.parte = true; msg = p ? 'Hoje só esta parte, ' + M.dura(it.dur) + '. O resto eu espalho nos próximos dias.' : 'Hoje fica com ' + M.dura(it.dur) + '.'; }
    if (q === 'soltar') { it.st = 'pulada'; if (p) { S.pend.splice(S.pend.indexOf(p), 1); msg = 'Saiu da sua lista.'; } else msg = 'Hoje não.'; }
    if (q === 'ok') { marca(it); msg = 'Marcado.'; }
    ir('dia'); if (msg) avisa(msg, true);
  }
  function adiantar() {
    var d = dia(), na = d.fila.filter(function (x) { return x.st === 'aberta'; }).map(function (x) { return x.ref; });
    var c = M.ordenar(S.pend.filter(function (p) { return na.indexOf(p.id) < 0; }), hoje()).filter(function (x) { return !x.fora; })[0];
    if (!c) { avisa('Não há pendência para adiantar. Anote em Pendências.'); return; }
    antes(); var e = ids([M.entradaPend(c)])[0]; d.fila.push(e); ir('dia'); avisa('Entrou: ' + e.t + '.', true);
  }

  /* ================= peças da tela ================= */
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function botao(cls, txt, fn) { var b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function titulo(t, cls) { var h = el('h1', cls || '', t); h.tabIndex = -1; return h; }
  function junta(e, f) { (f || []).forEach(function (x) { if (x) e.appendChild(x); }); return e; }
  function caixa(cls, f) { return junta(el('div', cls), f); }
  function monta(e, filhos, pe) { junta(e, filhos); if (pe) e.appendChild(caixa('pe', pe)); return e; }
  function cartao(filhos, pe) { return monta(el('section', 'cartao'), filhos, pe); }
  function pagina(filhos, pe) { return monta(el('section', 'pagina'), filhos, pe); }
  function dupla(a, b) { return caixa('dupla', [a, b]); }
  function opcoes(lista, cls) { return caixa(cls || 'motivos', lista.map(function (x) { var b = botao(x[2] || '', x[0], x[1]); if (x[3]) b.appendChild(el('small', '', x[3])); return b; })); }
  function animos(fn, atual) { return caixa('cartela', ENE.map(function (x) { var b = botao(x[0] === atual ? 'on' : '', null, function () { fn(x[0]); }), i = el('i'), t = el('span', '', x[1]); i.style.setProperty('--c', x[3]); t.appendChild(el('small', '', x[2])); b.appendChild(i); b.appendChild(t); return b; })); }
  function campo(rot, tipo, val, attrs) { var l = el('label', 'campo'), i; l.appendChild(el('span', '', rot)); i = el('input'); i.type = tipo; i.value = val == null ? '' : val; for (var k in attrs || {}) i.setAttribute(k, attrs[k]); l.appendChild(i); l.entrada = i; return l; }
  function seletor(rot, ops, val) { var l = el('label', 'campo'), s = el('select'); if (rot) l.appendChild(el('span', '', rot)); ops.forEach(function (o) { var p = el('option', '', o[1]); p.value = o[0]; if (String(o[0]) === String(val)) p.selected = true; s.appendChild(p); }); l.appendChild(s); l.entrada = s; return l; }
  function entrada(id, dica, fn) {
    var w = el('div', 'entra'), i = el('input'), b = botao('', 'Anotar', vai); i.id = id; i.type = 'text'; i.maxLength = 300; i.placeholder = dica; i.setAttribute('aria-label', dica); i.autocomplete = 'off'; i.setAttribute('enterkeyhint', 'done');
    function vai() { var v = i.value.trim(); if (!v) { i.focus(); return; } i.value = ''; fn(v); }
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
    var r = el('div', 'relogio'), t = el('p', 'tempo'), c = el('div', 'trilho'), b = el('b'), foi = false; c.appendChild(b); junta(r, [t, c]);
    function passa() { var f = Math.max(0, fim - Date.now()), s = Math.ceil(f / 1000); t.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); b.style.width = (100 * (1 - f / tot)) + '%'; if (!f && !foi) { foi = true; aoFim(); } }
    r.passa = passa; return r;
  }
  function pulsa(fn, ms) { clearInterval(tic); tic = setInterval(fn, ms); fn(); }
  function pedaco(it) { var p = it.tipo === 'pend' ? pend(it.ref) : null; return it.parte && p ? 'um pedaço de ' + M.dura(Math.max(it.dur, p.dur - (p.feito || 0))) : ''; }
  function meta(it) { return [it.tipo === 'pend' ? (it.cliente ? 'Cliente' : 'Pendência') : it.tipo === 'treino' ? 'Treino' : '', M.dura(it.dur), pedaco(it), it.prazo ? prazoTxt(it.prazo).toLowerCase() : ''].filter(Boolean).join(' · '); }
  function statusDe(it, v) {
    if (it.st === 'feita') return 'Feita';
    if (it.st === 'pulada') return it.tipo === 'pend' ? 'Amanhã' : 'Hoje não';
    if (S.exec && S.exec.id === it.id) return 'Agora';
    if (v && v.it === it) return v.tipo === 'tarefa' && it.ini - agora() > 5 ? 'Próxima' : 'Agora';
    if (it.cabe === false) return it.tipo === 'pend' ? 'Amanhã' : 'Não coube';
    return '';
  }
  function linha(it, v, fn) {
    var tag = fn ? 'button' : 'div', st = statusDe(it, v), fora = it.st === 'aberta' && it.cabe === false, quieta = it.st !== 'aberta' || fora || it.tipo === 'pausa' || it.passou;
    var b = el(tag, 'linha' + (quieta ? ' quieta' : '') + (v && v.it === it ? ' vez' : '') + (it.tipo === 'pausa' || it.tipo === 'fim' ? ' rotina' : '')), m = el('span', 'meio'), c = (M.CATS[it.cat] || M.CATS.casa);
    if (fn) { b.type = 'button'; b.addEventListener('click', fn); }
    var cor = el('i', it.st === 'feita' ? 'ok' : ''); cor.style.setProperty('--c', c.c);
    m.appendChild(el('b', '', it.t)); var sm = it.tipo === 'comp' ? ['Compromisso', M.dura(it.dur), it.local].filter(Boolean).join(' · ') : it.tipo === 'pausa' || it.tipo === 'fim' ? '' : meta(it); if (sm) m.appendChild(el('small', '', sm));
    junta(b, [el('time', '', fora || it.ini == null ? '' : M.hm(it.ini)), cor, m, st ? el('em', st === 'Feita' ? 'feita' : st === 'Agora' ? 'agora' : '', st) : null]); return b;
  }
  /* linhas do dia: fila (na ordem), pausas, treino, compromissos e o fim */
  function linhasDoDia(d, fila, fixos, cs, fim) {
    var n = agora(), l = [];
    fila.forEach(function (x) { if (x.st !== 'pulada' || x.tipo === 'pend') l.push(x); });
    fixos.forEach(function (x) { l.push(x); });
    cs.forEach(function (c) { l.push({ tipo: 'comp', id: c.id, t: c.t, cat: c.cat || 'cliente', ini: c.hora, dur: c.dur, local: c.local, st: 'aberta', passou: d && c.hora + c.dur <= n, c: c }); });
    l.push({ tipo: 'fim', t: 'Encerrar o dia', cat: 'fechar', ini: fim, dur: 15, st: 'aberta' });
    var dentro = l.filter(function (x) { return !(x.st === 'aberta' && x.cabe === false) && x.st !== 'pulada'; }).sort(function (a, b) { return a.ini - b.ini || (a.tipo === 'fim') - (b.tipo === 'fim'); }), fora = l.filter(function (x) { return x.st === 'aberta' && x.cabe === false || x.st === 'pulada'; });
    return dentro.concat(fora);
  }

  /* ================= telas ================= */
  var T = {};
  T.porta = function () {
    var h = new Date().getHours(), oi = h >= 4 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite', cs = comps(), np = S.pend.length;
    if (S.ultimo && M.diasEntre(S.ultimo, hoje()) > 1) oi = 'Que bom te ver';
    var f = [titulo(oi + (S.nome ? ', ' + S.nome : '') + '.'), el('p', 'fala', 'Como você chegou hoje? Eu monto o seu dia na ordem certa.')];
    var hojeTem = cs.map(function (c) { return M.hm(c.hora) + ', ' + c.t; });
    if (hojeTem.length || np) f.push(el('p', 'nota', (hojeTem.length ? 'Hoje tem: ' + hojeTem.join('; ') + '. ' : '') + (np ? np + (np === 1 ? ' pendência anotada.' : ' pendências anotadas.') : '')));
    return caixa('porta', [caixa('', f), animos(montarHoje)]);
  };
  T.dia = function () {
    var d = dia(); if (!d) return T.porta(); if (d.fechado) return T.fechado();
    var v = vez(), it = v.it, n = agora(), hora = el('span', 'hora', M.hm(n)), w = el('section', 'dia'), cart, pe;
    var fe = d.fila.filter(function (x) { return x.st === 'feita'; }).length + d.fixos.filter(function (x) { return x.st === 'feita'; }).length;
    junta(w, [caixa('topo', [caixa('', [el('p', 'data', maiusc(porExtenso(hoje()))), el('p', 'recado', fe ? 'Você já começou. Siga a ordem.' : 'Uma coisa de cada vez. Eu cuido da ordem.')]), hora])]);
    var prx = comps().filter(function (c) { var a = c.hora - (c.desloc || 0) - n; return a > 0 && a <= 60; })[0];
    if (prx) w.appendChild(el('p', 'faixa', 'Às ' + M.hm(prx.hora) + ': ' + prx.t + '.' + (prx.desloc ? ' Saia às ' + M.hm(prx.hora - prx.desloc) + '.' : '')));
    if (v.tipo === 'tarefa') {
      var ex = S.exec && S.exec.id === it.id, ja = it.ini - n <= 5;
      if (ex) pe = [botao('vai', 'Voltar para a tarefa', function () { ir('exec'); })];
      else pe = [botao('vai', 'Começar, só 2 minutos', function () { comecar(it.id); }), dupla(botao('leve', 'Preciso de ajuda para começar', function () { travar(it.id); }), botao('leve', 'Não dá agora', function () { ir('reorg', { id: it.id, fase: 'motivo' }); }))];
      cart = cartao([el('p', 'olho', ex ? 'Em andamento' : ja ? 'Agora' : 'Próxima, às ' + M.hm(it.ini) + '. Pode começar já'), titulo(it.t), it.como ? el('p', 'como', it.como) : null, el('p', 'meta', meta(it))], pe);
    } else if (v.tipo === 'comp') {
      cart = cartao([el('p', 'olho', 'Agora, até ' + M.hm(it.hora + it.dur)), titulo(it.t), it.local ? el('p', 'meta', it.local) : null, el('p', 'como', v.prox ? 'Depois: ' + v.prox.t + '.' : 'Depois disso, só encerrar o dia.')], [botao('leve', 'Ver detalhes', function () { ir('pedit', { comp: hoje(), id: it.id }); })]);
    } else if (v.tipo === 'treino') {
      cart = cartao([el('p', 'olho', 'Hora do treino, ' + M.hm(it.ini)), titulo(it.t), el('p', 'como', it.como)], [botao('vai', 'Começar, só 2 minutos', function () { comecar(it.id); }), dupla(botao('leve', 'Já fui', function () { conclui(it.id); }), botao('leve', 'Hoje não', function () { antes(); it.st = 'pulada'; ir('dia'); avisa('Tudo bem. O treino volta no próximo dia marcado.', true); }))]);
    } else if (v.tipo === 'pausa') {
      cart = cartao([el('p', 'olho', 'Agora, até ' + M.hm(it.ini + it.dur)), titulo(it.t), el('p', 'como', v.prox ? 'Depois vem: ' + v.prox.t + ', às ' + M.hm(v.prox.ini) + '.' : 'Pausa também é trabalho bem feito.')], v.prox ? [botao('leve', 'Quero adiantar a próxima', function () { comecar(v.prox.id); })] : null);
    } else if (v.tipo === 'hora') {
      cart = cartao([el('p', 'olho', 'Seu horário acabou'), titulo('Hora de encerrar.'), el('p', 'como', 'O que ficou vai sozinho para os próximos dias.')], [botao('vai', 'Encerrar o dia', function () { ir('fechar'); }), dupla(botao('leve', 'Fazer mais uma: ' + it.t, function () { comecar(it.id); }))]);
    } else if (v.tipo === 'livre') {
      cart = cartao([el('p', 'olho', 'Tudo em dia'), titulo('O que era para hoje está feito.'), el('p', 'como', 'Pode adiantar uma pendência ou encerrar mais cedo.')], [botao('vai', 'Adiantar uma pendência', adiantar), dupla(botao('leve', 'Encerrar o dia', function () { ir('fechar'); }))]);
    } else {
      cart = cartao([el('p', 'olho', 'Por hoje é isso'), titulo('Hora de encerrar.'), el('p', 'como', 'Um minuto para fechar o dia.')], [botao('vai', 'Encerrar o dia', function () { ir('fechar'); })]);
    }
    w.appendChild(cart);
    var tot = d.fila.filter(function (x) { return x.st !== 'pulada'; }).length + d.fixos.filter(function (x) { return x.tipo === 'treino' && x.st !== 'pulada'; }).length, e = ENE.filter(function (x) { return x[0] === d.energia; })[0];
    w.appendChild(caixa('secao', [el('h2', '', 'Seu dia'), el('span', 'conta', fe + ' de ' + tot + ' feitas')]));
    w.appendChild(caixa('agenda', linhasDoDia(d, d.fila, d.fixos, comps(), d.fim).map(function (x) {
      return linha(x, v, function () { if (x.tipo === 'fim') ir('fechar'); else if (x.tipo === 'comp') ir('pedit', { comp: hoje(), id: x.id }); else if (x.tipo !== 'pausa') ir('ver', { id: x.id }); });
    })));
    w.appendChild(botao('texto', 'Hoje: ' + e[1] + '. Mudar', function () { ir('animo'); }));
    w.appendChild(caixa('acoes', [botao('', 'Anotar pendência', function () { ir('pend'); }), botao('', 'Encerrar o dia', function () { ir('fechar'); }), botao('', 'Meus treinos', function () { ir('treino'); }), botao('', 'Ajustes', function () { ir('ajustes'); })]));
    if (!salvou) w.appendChild(el('p', 'alerta', 'Não consegui guardar neste celular. Veja se há espaço livre.'));
    if (dicaIcone()) w.appendChild(caixa('dica', [el('p', '', 'Use sempre pelo ícone da Tela de Início. Pelo navegador, o que você marca fica guardado em outro lugar.'), botao('', 'Entendi', function () { S.dicaIcone = 1; salvar(); pintar(false, true); })]));
    var id0 = (it && it.id) + v.tipo + (it && it.ini);
    pulsa(function () { hora.textContent = M.hm(agora()); if (S.hoje !== hoje()) { pintar(false); return; } var z = vez(); if ((z.it && z.it.id) + z.tipo + (z.it && z.it.ini) !== id0 && S.tela.n === 'dia') pintar(false, true); }, 15000);
    return w;
  };
  function dicaIcone() { return !S.dicaIcone && /iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone && location.protocol === 'https:'; }
  T.animo = function () {
    var d = dia(); if (!d) return T.dia();
    return pagina([titulo('Como você está agora?'), el('p', 'fala', 'Eu monto o resto do dia de novo. O que já foi feito fica.'), animos(function (e) { refazer(e); }, d.energia)], [botao('leve', 'Voltar', function () { ir('dia'); })]);
  };
  T.ver = function () {
    var it = acha(S.tela.id); if (!it) return T.dia(); var ab = it.st === 'aberta';
    return cartao([el('p', 'olho', (it.ini != null && it.cabe !== false ? M.hm(it.ini) + ' às ' + M.hm(it.ini + it.dur) : 'Fora do horário de hoje') + (statusDe(it) ? '. ' + statusDe(it) : '')), titulo(it.t), it.como ? el('p', 'como', it.como) : null, el('p', 'meta', meta(it)),
      ab ? junta(el('ol', 'passos'), passos(it).map(function (p) { return el('li', '', p); })) : null],
      [ab ? botao('vai', 'Começar, só 2 minutos', function () { comecar(it.id); }) : null,
       ab ? dupla(botao('leve', 'Já fiz', function () { conclui(it.id); }), it.tipo === 'treino' ? null : botao('leve', 'Não dá agora', function () { ir('reorg', { id: it.id, fase: 'motivo' }); })) : null,
       it.st === 'pulada' ? dupla(botao('leve', 'Voltar para a fila', function () { antes(); it.st = 'aberta'; var p = it.tipo === 'pend' && pend(it.ref); if (p) delete p.naoAntes; ir('dia'); })) : null,
       dupla(botao('leve', 'Voltar', function () { ir('dia'); }), ab && it.tipo === 'pend' ? botao('leve', 'Editar a pendência', function () { ir('pedit', { id: it.ref, volta: 'dia' }); }) : null)]);
  };

  /* ---- execução: os 2 primeiros minutos já contam ---- */
  T.exec = function () {
    var x = S.exec, it = x && acha(x.id); if (!it || it.st !== 'aberta') { S.exec = null; return T.dia(); }
    var ps = passos(it), i = Math.min(x.passo, ps.length - 1), ult = i >= ps.length - 1, olho = el('p', 'olho'), mais = botao('leve', 'Mais 10 minutos', function () { x.fim = Date.now() + 6e5; x.tot = 6e5; x.arr = 0; ir('exec'); }); mais.hidden = true;
    var arranque = Date.now() < x.arr, r = arranque ? relogio(x.arr, 12e4, function () { pintar(false, true); }) : relogio(x.fim, x.tot, function () { olho.textContent = 'O tempo acabou. Parar ou seguir, os dois valem'; mais.hidden = false; });
    olho.textContent = arranque ? 'Só 2 minutos. Comece por aqui' : 'Você já está dentro. Siga no seu ritmo';
    pulsa(r.passa, 500);
    return cartao([olho, titulo(ps[i]), el('p', 'como', it.t + (ps.length > 1 ? '. Passo ' + (i + 1) + ' de ' + ps.length : '')), r, it.copia ? caixaCopia(it.copia) : null],
      [ult ? botao('vai', it.parte ? 'Terminei esta parte' : 'Terminei', function () { conclui(it.id); }) : botao('vai', 'Passo feito', function () { x.passo++; ir('exec'); }),
       dupla(botao('leve', 'Travei', function () { travar(it.id); }), botao('leve', 'Parar aqui', function () { ir('parar'); })), it.parte && ult ? dupla(botao('leve', 'Terminei a tarefa toda', function () { conclui(it.id, true); })) : null, dupla(mais)]);
  };
  T.parar = function () {
    var x = S.exec, it = x && acha(x.id); if (!it) return T.dia();
    return cartao([el('p', 'olho', 'Parar também é decisão'), titulo('E o que sobrou?'), opcoes([['Terminei tudo', function () { conclui(it.id, true); }], ['Já está bom assim', function () { conclui(it.id); }], it.tipo === 'treino' ? null : ['Continuo mais tarde hoje', function () { acao('depois', it); }], it.tipo === 'treino' ? null : ['Fica para amanhã', function () { acao('amanha', it); }]].filter(Boolean))], [dupla(botao('leve', 'Voltar para a tarefa', function () { ir('exec'); }))]);
  };
  T.feito = function () {
    var d = dia(); if (!d) return T.dia(); var f = d.fila.filter(function (x) { return x.st === 'feita'; }).length, v = vez(), px = v.tipo === 'tarefa' ? v.it : null;
    var t = f <= 1 ? 'Começou. Era a parte difícil.' : 'Feito. Uma a menos.', pe = [];
    if (px) pe.push(botao('vai', 'Começar a próxima', function () { comecar(px.id); }));
    pe.push(botao(px ? 'leve' : 'vai', 'Ver meu dia', function () { ir('dia'); })); pe.push(botao('leve', 'Desfazer', desfazer));
    return pagina([titulo(t), el('p', 'fala', px ? 'A próxima é: ' + px.t + '.' : v.tipo === 'pausa' ? 'Agora é pausa, até ' + M.hm(v.it.ini + v.it.dur) + '.' : v.tipo === 'comp' ? 'Agora: ' + v.it.t + '.' : 'O que era para hoje está feito.')], pe);
  };

  /* ---- estou travada ---- */
  var MOTIVOS = [['Não sei por onde começar', 'por'], ['Não entendi o que é para fazer', 'ent'], ['Parece grande demais', 'gra'], ['Ansiosa ou com medo de errar', 'ans'], ['Estou distraída', 'dis'], ['Estou cansada', 'can']];
  function travar(id) { var x = id ? acha(id) : null; if (!x) { if (S.exec) x = acha(S.exec.id); else { var v = vez(); x = v.tipo === 'tarefa' || v.tipo === 'treino' ? v.it : v.prox || null; } } S.trv = { id: x ? x.id : null, fase: 'motivo', mot: '', p: 0, tent: 0, fim: 0 }; ir('travei'); }
  function receita(mot, it, tent) {
    var zero = ZERO[S.zero % ZERO.length], p = it ? passos(it) : [zero], me = it ? menor(it) : zero, ra = it ? it.rascunho || me : zero;
    if (tent > 0 || !it) return { pre: [], olho: tent > 0 ? 'Então a ordem muda' : 'Uma coisa pequena', faz: zero };
    return { por: { pre: [], olho: 'Comece exatamente por aqui', faz: p[0] }, ent: { pre: [{ o: 'O que esta tarefa pede', t: it.como || it.t }], olho: 'Só isto já conta como feito', faz: me }, gra: { pre: [{ o: 'Primeiro', t: 'Esqueça o resto da tarefa pelos próximos 5 minutos.' }], olho: 'A tarefa agora é só esta', faz: me },
      ans: { pre: [{ o: 'Primeiro, o corpo', t: 'Respire comigo por um minuto.', resp: true }], olho: 'É só ensaio. Não precisa ficar bom', faz: ra }, dis: { pre: [{ o: 'Primeiro', t: 'Feche os outros aplicativos. Deixe só o Turno aberto.' }, { o: 'Agora', t: 'Tire da sua frente uma coisa que chama sua atenção.' }], olho: 'Só isto na sua frente', faz: p[0] }, can: { pre: [{ o: 'Primeiro, o corpo', t: 'Levante e beba um copo de água. Eu espero.' }], olho: 'A versão leve', faz: me } }[mot];
  }
  T.travei = function () {
    var r = S.trv; if (!r) return T.dia(); var it = r.id ? acha(r.id) : null;
    if (it && it.st !== 'aberta') it = null;
    var sair = botao('leve', 'Outra hora', function () { if (it && it.tipo !== 'treino') ir('reorg', { id: it.id, fase: 'opcoes', mot: 'naoconsegui' }); else { S.trv = null; ir('dia'); } });
    var voltar = botao('leve', 'Voltar', function () { S.trv = null; ir(S.exec ? 'exec' : 'dia'); });
    if (!it && r.fase === 'motivo') { r.fase = 'faz'; r.mot = 'por'; }
    if (r.fase === 'motivo') return cartao([el('p', 'olho', 'Sem problema. ' + it.t), titulo('O que está pegando?'), opcoes(MOTIVOS.map(function (m) { return [m[0], function () { r.mot = m[1]; r.p = 0; r.fase = receita(m[1], it, 0).pre.length ? 'pre' : 'faz'; ir('travei'); }]; }))], [dupla(voltar)]);
    var rc = receita(r.mot, it, r.tent);
    if (r.fase === 'pre') {
      var q = rc.pre[r.p], ar = null, vai = botao('vai', q.resp ? 'Respirei' : 'Fiz', function () { r.p++; if (r.p >= rc.pre.length) { r.fase = 'faz'; r.p = 0; } ir('travei'); });
      if (q.resp) { var dz = el('p', '', ''), t0 = Date.now(); ar = caixa('ar', [el('i'), dz]); pulsa(function () { var s = Math.floor((Date.now() - t0) / 1000) % 10; dz.textContent = s < 4 ? 'Puxe o ar, ' + (4 - s) : 'Solte devagar, ' + (10 - s); }, 250); }
      return cartao([el('p', 'olho', q.o), titulo(q.t), ar], [vai, dupla(voltar, sair)]);
    }
    if (r.fase === 'faz') return cartao([el('p', 'olho', rc.olho), titulo(rc.faz), el('p', 'como', 'Só isso. O resto não é agora.')], [botao('vai', 'Começar, 5 minutos', function () { r.fase = 'tempo'; r.tot = 3e5; r.fim = Date.now() + 3e5; ir('travei'); }), dupla(botao('leve', '10 minutos', function () { r.fase = 'tempo'; r.tot = 6e5; r.fim = Date.now() + 6e5; ir('travei'); }), sair), dupla(voltar)]);
    if (r.fase === 'tempo') {
      var o = el('p', 'olho', 'Valendo. Eu espero aqui'), rel = relogio(r.fim, r.tot, function () { r.fase = 'conseguiu'; ir('travei'); }); pulsa(rel.passa, 500);
      return cartao([o, titulo(rc.faz), rel], [botao('vai', 'Consegui começar', sim), dupla(botao('leve', 'Ainda não', nao))]);
    }
    function sim() {
      if (!it) { S.trv = null; S.zero++; var d = dia(); if (d) { var y = ids([{ tipo: 'extra', ref: '', t: rc.faz, cat: 'casa', dur: 5, st: 'feita', ini: agora(), passos: [], como: '' }])[0]; d.fila.push(y); return ir('feito', { id: y.id }); } return ir('dia'); }
      var id = it.id; if (r.tent > 0) S.zero++;
      if (S.exec && S.exec.id === id) { S.trv = null; S.exec.arr = 0; if (S.exec.fim < Date.now() + 3e5) { S.exec.fim = Date.now() + 6e5; S.exec.tot = 6e5; } return ir('exec'); }
      comecar(id); S.exec.arr = 0; ir('exec');
    }
    function nao() { r.tent++; if (r.tent > 1) { S.zero++; if (it && it.tipo !== 'treino') return ir('reorg', { id: it.id, fase: 'opcoes', mot: 'naoconsegui' }); S.trv = null; return ir('dia'); } r.fase = 'faz'; ir('travei'); }
    return cartao([el('p', 'olho', 'O tempo acabou'), titulo('Conseguiu começar?'), el('p', 'como', 'As duas respostas servem.')], [botao('vai', 'Consegui, vou continuar', sim), dupla(botao('leve', 'Ainda não', nao), it ? botao('leve', 'Já está bom assim', function () { conclui(it.id); }) : null)]);
  };

  /* ---- não dá agora: uma tarefa por vez ---- */
  var PORQUE = [['Não tenho tempo agora', 'tempo'], ['Não consigo começar', 'naoconsegui'], ['Tive um imprevisto', 'imprevisto'], ['É maior do que parecia', 'maior'], ['Não é mais importante', 'menos'], ['Estou sem disposição', 'cansada'], ['Outro motivo', 'outro']];
  var SAIDAS = { tempo: ['quinze', 'depois', 'amanha'], naoconsegui: ['ajuda', 'quinze', 'amanha'], imprevisto: ['depois', 'amanha', 'quinze'], maior: ['dividir', 'quinze', 'amanha'], menos: ['soltar', 'amanha', 'depois'], cansada: ['quinze', 'amanha', 'soltar'], outro: ['depois', 'quinze', 'amanha'] };
  T.reorg = function () {
    var q = S.tela, it = acha(q.id); if (!it || it.st !== 'aberta' || it.tipo === 'treino') return T.dia();
    var voltar = dupla(botao('leve', 'Voltar', function () { ir(S.exec ? 'exec' : 'dia'); }));
    if (q.fase === 'motivo') return cartao([el('p', 'olho', it.t), titulo('O que aconteceu?'), opcoes(PORQUE.map(function (p) { return [p[0], function () { ir('reorg', { id: it.id, fase: 'opcoes', mot: p[1] }); }]; }), 'motivos dois')], [voltar]);
    var pd = it.tipo === 'pend', NOMES = { quinze: ['Fazer 15 minutos agora', 'Uma parte já conta'], depois: ['Mais tarde, hoje', 'Vai para o fim da fila'], amanha: ['Amanhã', pd ? 'Eu coloco no dia certo' : 'Volta no horário de sempre'], dividir: ['Hoje só metade', pd ? 'O resto eu espalho nos próximos dias' : 'Fica mais curta hoje'], soltar: [pd ? 'Tirar da lista' : 'Hoje não', pd ? 'Não precisa mais' : 'Pula só hoje'], ajuda: ['Me ajuda a começar', 'Um passo bem pequeno'] };
    var l = SAIDAS[q.mot] || SAIDAS.outro;
    return cartao([el('p', 'olho', it.t), titulo('Qual destas serve?'), el('p', 'como', 'A primeira é a que eu faria.'), opcoes(l.map(function (x, i) { return [NOMES[x][0], function () { if (x === 'ajuda') travar(it.id); else acao(x, it); }, i ? '' : 'forte', NOMES[x][1]]; }))], [dupla(l.indexOf('soltar') < 0 ? botao('leve', NOMES.soltar[0], function () { acao('soltar', it); }) : null, botao('leve', 'Voltar', function () { ir(S.exec ? 'exec' : 'dia'); }))]);
  };

  /* ---- pendências: ela anota, o Turno decide quando ---- */
  function anotar(v) {
    var foi = [], d = dia(); antes();
    M.separar(v).forEach(function (q) {
      var b = M.interpretar(q, hoje()); if (!b) return;
      if (b.hora != null) {
        var dt = b.data || (b.hora > agora() + 5 ? hoje() : amanha()), c = { id: 'c' + (S.seq++), t: b.t, cat: b.cliente ? 'cliente' : b.cat, hora: b.hora, dur: b.dur, local: '', desloc: 0, obs: '' };
        (S.agenda[dt] = S.agenda[dt] || []).push(c); foi.push({ c: c, d: dt }); return;
      }
      var p = pendDe({ t: b.t, cat: b.cliente ? 'cliente' : b.cat, dur: b.dur, prazo: b.data, cliente: b.cliente, como: b.como, passos: b.passos, menor: b.menor, rascunho: b.rascunho }, S);
      S.pend.push(p); foi.push({ p: p, r: encaixa(p) });
    });
    if (!foi.length) return;
    var u = foi[foi.length - 1], msg;
    if (foi.length > 1) msg = 'Anotei ' + foi.length + '. Eu decido quando cada uma entra.';
    else if (u.c) msg = 'Marcado: ' + nomeDia(u.d) + ', às ' + M.hm(u.c.hora) + '.';
    else { var pd = dia() && dia().fila.filter(function (x) { return x.ref === u.p.id && x.st === 'aberta'; })[0]; msg = u.r === 'agora' ? 'Anotado. Vence hoje, então é a próxima.' : u.r === 'hoje' && pd && pd.parte ? 'Anotado. Vou dividir até ' + nomeDia(u.p.prazo) + '. Hoje já entra um pedaço.' : u.r === 'hoje' ? 'Anotado. Já entrou no seu dia.' : u.p.prazo ? 'Anotado. Vou dividir até ' + nomeDia(u.p.prazo) + '.' : 'Anotado. Entra quando tiver espaço.'; }
    ir('pend', { novo: foi.length === 1 && u.p && !u.p.prazo ? u.p.id : null }); avisa(msg, true);
  }
  function poePrazo(p, k) { p.prazo = k; tiraDeHoje(p); var r = encaixa(p); return r; }
  T.pend = function () {
    var f = [titulo('Pendências'), el('p', 'fala', 'Anote tudo aqui, do seu jeito. Eu decido quando cada coisa entra.'), entrada('ePend', 'Ex.: paleta da Ana até sexta', anotar)];
    f.push(el('p', 'nota', 'Pode escrever o prazo ("até sexta", "dia 30") ou a hora ("atendimento sexta às 14h").'));
    var nv = S.tela.novo && pend(S.tela.novo);
    if (nv) {
      var dt = campo('Outra data', 'date', '', { min: hoje() });
      function diz(r, k) { return r === 'agora' ? 'Vence hoje, então é a próxima.' : r === 'hoje' ? 'Entrou no seu dia.' : k ? 'Vou dividir até ' + nomeDia(k) + '.' : 'Sem prazo. Entra quando tiver espaço.'; }
      dt.entrada.addEventListener('change', function () { var k = dt.entrada.value; if (k >= hoje()) { var r = poePrazo(nv, k); ir('pend'); avisa(diz(r, k)); } });
      function chip(t, k) { return botao('chip', t, function () { var r = poePrazo(nv, k); ir('pend'); avisa(diz(r, k)); }); }
      var cl = botao('chip' + (nv.cliente ? ' on' : ''), nv.cliente ? 'É de cliente' : 'É de cliente?', function () { nv.cliente = !nv.cliente; salvar(); pintar(false, true); }); cl.setAttribute('aria-pressed', nv.cliente);
      var sem = M.diaSemana(hoje()), sexta = M.somaDias(hoje(), (5 - sem + 7) % 7), prox = M.somaDias(sexta, 7);
      f.push(caixa('ficha novo', [el('b', '', nv.t), el('p', 'nota', 'Para quando?'), caixa('fichas', [chip('Hoje', hoje()), chip('Amanhã', amanha()), M.diasEntre(hoje(), sexta) >= 2 ? chip('Esta semana', sexta) : null, chip('Semana que vem', prox), chip('Sem prazo', null)]), dt, caixa('fichas', [cl])]));
    }
    var cs = Object.keys(S.agenda).filter(function (k) { return k >= hoje() && S.agenda[k].length; }).sort();
    if (cs.length) {
      f.push(el('h2', '', 'Com hora marcada'));
      var lc = el('div', 'lista'); cs.forEach(function (k) { comps(k).forEach(function (c) { var b = botao('txt', null, function () { ir('pedit', { comp: k, id: c.id }); }); b.appendChild(el('b', '', c.t)); b.appendChild(el('small', '', maiusc(nomeDia(k)) + ', às ' + M.hm(c.hora) + ' · ' + M.dura(c.dur))); lc.appendChild(caixa('item', [b])); }); }); f.push(lc);
    }
    f.push(el('h2', '', 'Para fazer'));
    var d = dia(), hj = d ? d.fila.filter(function (x) { return x.st === 'aberta' && x.tipo === 'pend'; }).map(function (x) { return x.ref; }) : [];
    if (!S.pend.length) f.push(el('p', 'nota', 'Nada anotado ainda.'));
    var lp = el('div', 'lista'); M.ordenar(S.pend, hoje()).forEach(function (x) {
      var p = x.p, b = botao('txt', null, function () { ir('pedit', { id: p.id }); }), rest = p.dur - (p.feito || 0);
      b.appendChild(el('b', '', p.t)); b.appendChild(el('small', '', [prazoTxt(p.prazo), p.cliente ? 'cliente' : '', p.feito ? 'falta ' + M.dura(rest) : M.dura(p.dur), hj.indexOf(p.id) >= 0 ? 'entra hoje' : p.naoAntes ? 'a partir de amanhã' : ''].filter(Boolean).join(' · ')));
      lp.appendChild(caixa('item', [b]));
    }); f.push(lp);
    return pagina(f, [botao('leve', 'Ver como fica amanhã', function () { ir('amanha'); })]);
  };
  function duracoes(v) { var l = [5, 10, 15, 20, 25, 30, 40, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480]; if (l.indexOf(v) < 0) { l.push(v); l.sort(function (a, b) { return a - b; }); } return l.map(function (x) { return [x, M.dura(x)]; }); }
  T.pedit = function () {
    var q = S.tela, volta = function () { ir(q.volta || 'pend'); }, err = el('p', 'alerta');
    if (q.comp) {
      var lst = S.agenda[q.comp] || [], c = lst.filter(function (x) { return x.id === q.id; })[0]; if (!c) return T.pend();
      var n = campo('Nome', 'text', c.t, { maxlength: 120 }), dt = campo('Data', 'date', q.comp, { min: hoje() }), h = campo('Começa', 'time', M.campo(c.hora)), fi = campo('Termina', 'time', M.campo(c.hora + c.dur)), lo = campo('Local', 'text', c.local || '', { maxlength: 80 }), de = campo('Deslocamento, em minutos', 'number', c.desloc || '', { min: 0, max: 240, inputmode: 'numeric' }), ob = campo('Observações', 'text', c.obs || '', { maxlength: 200 });
      return pagina([titulo('Compromisso'), caixa('ficha', [n, dt, caixa('par', [h, fi]), lo, de, ob, err])], [botao('vai', 'Salvar', function () {
        var a = M.deCampo(h.entrada.value), b = M.deCampo(fi.entrada.value); if (a === null || b === null || b <= a) { err.textContent = 'O fim precisa ser depois do começo.'; return; }
        antes(); c.t = n.entrada.value.trim() || c.t; c.hora = a; c.dur = b - a; c.local = lo.entrada.value.trim(); c.desloc = Math.max(0, Math.min(240, parseInt(de.entrada.value, 10) || 0)); c.obs = ob.entrada.value.trim();
        var k = dt.entrada.value; if (k && k !== q.comp && k >= hoje()) { lst.splice(lst.indexOf(c), 1); (S.agenda[k] = S.agenda[k] || []).push(c); }
        volta(); avisa('Salvo.', true);
      }), dupla(botao('leve', 'Excluir', function () { antes(); lst.splice(lst.indexOf(c), 1); volta(); avisa('Compromisso excluído.', true); }), botao('leve', 'Voltar', volta))]);
    }
    var p = pend(q.id); if (!p) return T.pend();
    var nm = campo('Nome', 'text', p.t, { maxlength: 120 }), pz = campo('Prazo (vazio = sem prazo)', 'date', p.prazo || '', {}), cl = seletor('É de cliente?', [['1', 'Sim'], ['0', 'Não']], p.cliente ? '1' : '0'), du = seletor('Quanto tempo leva, no total', duracoes(p.dur), p.dur), ps = campo('Primeiro passo, bem pequeno', 'text', passos(p)[0], { maxlength: 140 });
    var info = p.feito ? el('p', 'nota', 'Já fez ' + M.dura(p.feito) + '. Falta ' + M.dura(Math.max(0, p.dur - p.feito)) + '.') : null;
    return pagina([titulo('Pendência'), caixa('ficha', [nm, pz, cl, du, ps, info, err])], [botao('vai', 'Salvar', function () {
      antes(); p.t = nm.entrada.value.trim() || p.t; p.cliente = cl.entrada.value === '1'; if (p.cliente && p.cat !== 'cliente') p.cat = 'cliente'; p.dur = +du.entrada.value; p.passos = passos(p).slice(); if (ps.entrada.value.trim()) p.passos[0] = ps.entrada.value.trim();
      var k = pz.entrada.value || null, mudou = k !== (p.prazo || null); p.prazo = k;
      var d = dia(); if (d) d.fila.forEach(function (x) { if (x.ref === p.id && x.st === 'aberta') { x.t = p.t; x.cliente = p.cliente; x.cat = p.cat; x.prazo = p.prazo; x.passos = p.passos.slice(); } });
      if (mudou) { tiraDeHoje(p); encaixa(p); }
      volta(); avisa('Salvo.', true);
    }), dupla(botao('leve', 'Já fiz', function () { antes(); var d = dia(); if (d) d.fila.forEach(function (x) { if (x.ref === p.id && x.st === 'aberta') { x.st = 'feita'; x.ini = agora(); } }); S.pend.splice(S.pend.indexOf(p), 1); volta(); avisa('Feito. Saiu da lista.', true); }),
      botao('leve', 'Excluir', function () { antes(); tiraDeHoje(p); S.pend.splice(S.pend.indexOf(p), 1); volta(); avisa('Excluída.', true); })), dupla(botao('leve', 'Voltar', volta))]);
  };
  /* prévia de amanhã: montada como um dia normal; de manhã ela diz como chegou e eu ajusto */
  function previa() {
    var a = amanha(), p = clone(S.pend), d = dia();
    if (d) d.fila.forEach(function (x) { var y = x.tipo === 'pend' && x.st === 'aberta' && x.cabe !== false && p.filter(function (z) { return z.id === x.ref; })[0]; if (y) y.feito = (y.feito || 0) + x.dur; });
    var r = M.montarDia({ rotina: S.rotina, animo: 'media', pend: p, base: a, comps: comps(a), treino: treinoDe(a), inicio: 0, ordens: null });
    M.projetar(r.fila, r.fixos.filter(function (x) { return x.tipo === 'pausa' || x.tipo === 'treino'; }).concat(comps(a).map(function (c) { return { ini: c.hora, dur: c.dur, desloc: c.desloc }; })), 0, r.fim, null);
    return r;
  }
  T.amanha = function () {
    var a = amanha(), r = previa();
    return pagina([titulo('Amanhã'), el('p', 'fala', maiusc(porExtenso(a)) + '. Deve ficar mais ou menos assim. De manhã você me diz como chegou e eu ajusto.'), caixa('agenda', linhasDoDia(null, r.fila, r.fixos, comps(a), r.fim).map(function (x) { return linha(x, null, null); }))],
      [botao('vai', 'Anotar pendência', function () { ir('pend'); }), botao('leve', 'Voltar', function () { ir(dia() ? 'dia' : 'pend'); })]);
  };

  /* ---- encerrar o dia ---- */
  T.fechar = function () {
    var d = dia(); if (!d) return T.dia();
    var fe = d.fila.concat(d.fixos).filter(function (x) { return x.st === 'feita'; }), vai = d.fila.filter(function (x) { return x.tipo === 'pend' && (x.st === 'aberta' || x.st === 'pulada'); }), l = el('ul', 'caixa');
    fe.forEach(function (x) { l.appendChild(el('li', '', x.t)); });
    var f = [titulo('Encerrar o dia'), el('p', 'fala', fe.length ? 'Isto você fez hoje:' : 'Você abriu o Turno hoje. Isso conta.'), fe.length ? l : null];
    if (vai.length) { f.push(el('p', 'fala', 'Isto vai sozinho para os próximos dias:')); f.push(junta(el('ul', 'caixa'), vai.map(function (x) { return el('li', '', x.t); }))); }
    var bom = campo('Uma coisa boa de hoje (se quiser)', 'text', '', { maxlength: 160 }); f.push(bom);
    return pagina(f, [botao('vai', 'Encerrar o dia', function () { d.fechado = { bom: bom.entrada.value.trim(), em: Date.now() }; S.exec = null; S.trv = null; ir('dia'); }), botao('leve', 'Ainda não, voltar', function () { ir('dia'); })]);
  };
  T.fechado = function () {
    var d = dia(), fe = d.fila.concat(d.fixos).filter(function (x) { return x.st === 'feita'; }), l = el('ul', 'caixa'), a = amanha(), ca = comps(a), r = previa(), pri = r.fila[0];
    fe.forEach(function (x) { l.appendChild(el('li', '', x.t)); });
    var f = [titulo('Dia encerrado.'), el('p', 'fala', fe.length ? 'Isto você fez hoje:' : 'Você abriu o Turno hoje. Amanhã a gente continua.'), fe.length ? l : null];
    if (d.fechado.bom) f.push(el('p', 'amanha', 'E foi bom: ' + d.fechado.bom));
    if (pri) { var q = el('p', 'amanha', 'Amanhã começa às ' + M.hm(pri.ini) + ' com:'); q.appendChild(el('b', '', pri.t)); f.push(q); }
    if (ca.length) f.push(el('p', 'amanha', 'Com hora marcada: ' + ca.map(function (c) { return M.hm(c.hora) + ', ' + c.t; }).join('; ') + '.'));
    return pagina(f, [botao('vai', 'Ver como fica amanhã', function () { ir('amanha'); }), botao('leve', 'Anotar pendência', function () { ir('pend'); }), botao('leve', 'Reabrir o dia', function () { d.fechado = null; ir('dia'); })]);
  };

  /* ---- treinos, horários, ajustes ---- */
  T.treino = function () {
    var t = S.treinos, l = el('div', 'ficha'), h = campo('Horário preferido', 'time', M.campo(t.hora)), du = seletor('Duração da musculação', [[30, '30 min'], [45, '45 min'], [60, '1h'], [75, '1h15'], [90, '1h30']], t.dur);
    h.entrada.addEventListener('change', function () { var m = M.deCampo(h.entrada.value); if (m !== null) { t.hora = m; salvar(); } }); du.entrada.addEventListener('change', function () { t.dur = +du.entrada.value; salvar(); });
    [1, 2, 3, 4, 5, 6, 0].forEach(function (w) {
      var x = t.dias[w] || { tipo: '', nome: '' }, s = seletor(maiusc(SEM[w]), Object.keys(TIPOS).map(function (k) { return [k, TIPOS[k]]; }), x.tipo), r = caixa('treinoDia', [s]);
      s.entrada.addEventListener('change', function () { t.dias[w] = { tipo: s.entrada.value, nome: x.nome || '' }; salvar(); pintar(false, true); });
      if (x.tipo === 'musculacao') { var n = campo('Qual treino? (ex.: A, pernas)', 'text', x.nome, { maxlength: 24 }); n.entrada.addEventListener('change', function () { t.dias[w].nome = n.entrada.value.trim(); salvar(); }); r.appendChild(n); }
      l.appendChild(r);
    });
    var seq = 0, m = 0; for (var i = 0; i < 14; i++) { var y = t.dias[i % 7]; seq = y && y.tipo === 'musculacao' ? seq + 1 : 0; m = Math.max(m, seq); }
    var rec = S.treinosFeitos.slice(-8).reverse(), f = [titulo('Meus treinos'), el('p', 'fala', 'Marque a semana uma vez. Eu encaixo no dia. Vale a partir do próximo dia montado.'), caixa('ficha', [caixa('par', [h, du])]), l];
    if (m >= 3) f.push(el('p', 'nota', 'São ' + (m > 7 ? 7 : m) + ' dias seguidos de musculação. Quer um descanso no meio?'));
    if (rec.length) { f.push(el('h2', '', 'Últimos treinos')); f.push(junta(el('ul', 'caixa'), rec.map(function (x) { return el('li', '', maiusc(porExtenso(x.d)) + ': ' + x.t); }))); }
    return pagina(f, [botao('vai', 'Pronto', function () { ir(S.tela.volta || 'dia'); })]);
  };
  T.rotina = function () {
    var l = el('div', 'ficha'), err = el('p', 'alerta'), cs = S.rotina.map(function (b) { var n = campo('', 'text', b.t, { maxlength: 60, 'aria-label': 'Nome' }), h = campo('', 'time', M.campo(b.ini), { 'aria-label': 'Início de ' + b.t }), d = seletor('', duracoes(b.dur), b.dur); d.entrada.setAttribute('aria-label', 'Duração de ' + b.t); l.appendChild(caixa('rot', [n, caixa('par', [h, d])])); return { b: b, n: n, h: h, d: d }; });
    return pagina([titulo('Meus horários'), el('p', 'fala', 'Todo dia igual: é a repetição que tira o peso de decidir. Mudou aqui, vale a partir de amanhã.'), l, err], [botao('vai', 'Salvar', function () {
      for (var i = 0; i < cs.length; i++) if (M.deCampo(cs[i].h.entrada.value) === null) { err.textContent = 'Falta um horário.'; return; }
      cs.forEach(function (c) { c.b.t = c.n.entrada.value.trim() || c.b.t; c.b.ini = M.deCampo(c.h.entrada.value); c.b.dur = +c.d.entrada.value; }); S.rotina.sort(M.porHora); ir('ajustes'); avisa('Horários salvos. Valem a partir de amanhã.');
    }), botao('leve', 'Voltar ao modelo original', function () { S.rotina = clone(M.ROTINA); ir('rotina'); }), botao('leve', 'Voltar', function () { ir('ajustes'); })]);
  };
  T.ajustes = function () {
    var n = campo('Seu nome', 'text', S.nome, { maxlength: 24 }), arq = el('input'), st = el('p', 'nota'); n.entrada.addEventListener('change', function () { S.nome = n.entrada.value.trim(); salvar(); });
    arq.type = 'file'; arq.accept = '.json,application/json'; arq.hidden = true;
    arq.addEventListener('change', function () { var f = arq.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { try { var o = JSON.parse(r.result); if (o && o.v === 2) o = migra(o); if (!valido(o)) throw 0; S = completa(o); S.copiaDe = ''; salvar(); ir('dia'); avisa('Cópia restaurada.'); } catch (e) { st.textContent = 'Esse arquivo não é uma cópia do Turno. Nada mudou.'; } }; r.readAsText(f); });
    return pagina([titulo('Ajustes'), caixa('ficha', [n]), caixa('acoes uma', [botao('', 'Meus horários', function () { ir('rotina'); }), botao('', 'Meus treinos', function () { ir('treino', { volta: 'ajustes' }); }), botao('', 'Guardar cópia de segurança', copia), botao('', 'Restaurar uma cópia', function () { arq.click(); })]), arq, st,
      el('h2', '', 'Para o Turno te chamar'), el('p', 'fala', 'Por enquanto, use o Relógio do iPhone. Crie dois alarmes: um de manhã, "Começar o dia", e um à tarde, "Encerrar o dia".'), el('p', 'nota', 'Tudo fica só neste aparelho. Ninguém mais vê.')], [botao('leve', 'Voltar', function () { ir('dia'); })]);
  };
  function copia() {
    var nome = 'turno-copia-' + hoje() + '.json', txt = JSON.stringify(S), b = new Blob([txt], { type: 'application/json' }), f;
    function baixa() { var a = el('a'), u = URL.createObjectURL(b); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); avisa('Cópia pronta: ' + nome); }
    try { f = new File([b], nome, { type: 'application/json' }); if (/iPhone|iPad/.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).then(function () { avisa('Cópia guardada.'); }, function (e) { if (e && e.name !== 'AbortError') baixa(); }); return; } } catch (e) {}
    baixa();
  }

  /* ================= desenhar ================= */
  var COMNAV = { dia: 1, pend: 1, amanha: 1 };
  function pintar(foco, fica) {
    clearInterval(tic); virarDia(); var y = window.scrollY, n = S.tela.n; if (!T[n]) S.tela = { n: 'dia' }, n = 'dia';
    var no; try { no = T[n](); } catch (e) { if (window.console) console.error(e); S.tela = { n: 'dia' }; S.exec = null; S.trv = null; n = 'dia'; no = T.dia(); }
    tela.replaceChildren(no); document.body.className = 't-' + n;
    var d = dia(), mostra = COMNAV[n] && d, trav = d && !d.fechado; barra.hidden = !mostra;
    if (mostra) { barra.className = trav ? '' : 'dois'; barra.replaceChildren.apply(barra, [botao(n === 'dia' ? 'on' : '', 'Hoje', function () { ir('dia'); }), trav ? botao('trav', 'Estou travada', function () { travar(null); }) : null, botao(n === 'pend' ? 'on' : '', 'Pendências', function () { ir('pend'); })].filter(Boolean)); }
    document.body.classList.toggle('comnav', !!mostra);
    tela.classList.toggle('semanim', !!fica); window.scrollTo(0, fica ? y : 0);
    if (foco) { var h = tela.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && (S.hoje !== hoje() || /^(dia|exec)$/.test(S.tela.n) || (S.tela.n === 'travei' && S.trv && S.trv.fase === 'tempo'))) pintar(false, true); });
  window.addEventListener('storage', function (e) { if (e.key === K && e.newValue) { try { var o = JSON.parse(e.newValue); if (valido(o)) { S = completa(o); if (S.tela.n === 'dia') pintar(false, true); } } catch (x) {} } });
  if (S.tela.n !== 'exec' && S.tela.n !== 'travei') S.tela = { n: 'dia' };
  virarDia(); salvar(); pintar(false);
})();
