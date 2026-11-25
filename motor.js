/* Motor do Turno: entende tarefas e monta a agenda. Sem tela, sem rede, sem memória própria. */
var MOTOR = (function () {
  'use strict';
  var CATS = {
    cliente: { n: 'Cliente', c: '#b3455c' }, vendas: { n: 'Vendas', c: '#d39a3a' }, conteudo: { n: 'Conteúdo', c: '#c9683c' },
    estudo: { n: 'Estudo', c: '#8e8a4c' }, casa: { n: 'Organização', c: '#9c8270' }, corpo: { n: 'Corpo', c: '#5f8a78' },
    pessoal: { n: 'Pessoal', c: '#a58ab0' }, pausa: { n: 'Pausa', c: '#7c6459' }, fechar: { n: 'Fechamento', c: '#7c6459' }
  };
  /* máximo de tarefas, quantas o Turno sugere sozinho e quanto do tempo livre pode ser usado (o resto é folga) */
  var LIM = { baixa: { max: 2, auto: 1, uso: 0.35 }, media: { max: 4, auto: 3, uso: 0.6 }, boa: { max: 6, auto: 4, uso: 0.75 } };
  var FOLGA = 10;

  function hm(m) { m = ((m % 1440) + 1440) % 1440; return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); }
  function campo(m) { var t = hm(m); return t.length < 5 ? '0' + t : t; }
  function deCampo(s) { var p = /^(\d{1,2}):(\d{2})/.exec(s || ''); return p ? (+p[1]) * 60 + (+p[2]) : null; }
  function dura(d) { if (d < 60) return d + ' min'; var h = Math.floor(d / 60), m = d % 60; return h + 'h' + (m ? ('0' + m).slice(-2) : ''); }
  function limpa(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  var ROTINA = [
    { id: 'cafe', t: 'Despertar e café da manhã', cat: 'pausa', ini: 510, dur: 30, tipo: 'ancora' },
    { id: 'org', t: 'Organização', cat: 'casa', ini: 540, dur: 20, tipo: 'ancora', como: 'Olhe o dia e separe o que vai usar.' },
    { id: 'vendas', t: 'Vendas e comercial', cat: 'vendas', ini: 560, dur: 70, tipo: 'bloco' },
    { id: 'conteudo', t: 'Conteúdo e presença digital', cat: 'conteudo', ini: 630, dur: 45, tipo: 'bloco' },
    { id: 'estudo', t: 'Estudos', cat: 'estudo', ini: 675, dur: 30, tipo: 'bloco' },
    { id: 'almoco', t: 'Almoço e pausa', cat: 'pausa', ini: 705, dur: 105, tipo: 'ancora' },
    { id: 'exec', t: 'Execução profissional', cat: 'casa', ini: 810, dur: 120, tipo: 'bloco' },
    { id: 'fechar', t: 'Fechar a loja', cat: 'fechar', ini: 1020, dur: 15, tipo: 'ancora', como: 'Três minutos para encerrar e preparar amanhã.' }
  ];

  /* ---------- entender o que foi escrito ---------- */
  var REGRAS = [
    { re: /estud|\bcurso|\baula|aprender|\bler\b|assistir/, cat: 'estudo', dur: 30, prio: 3, como: 'Uma aula ou um trecho. Sem precisar anotar tudo.',
      passos: ['Abra a aula e deixe na tela.', 'Assista aos primeiros minutos.', 'Escreva uma ideia que dá para usar.'], menor: 'Assista a cinco minutos, sem anotar nada.', rascunho: 'Deixe a aula tocando enquanto arruma algo perto.' },
    { re: /retom|convers|follow|propost|orcament|vend[ae]|divulg|oferec|indica|mensage|whats|prospec|responder|captar|clientes/, cat: 'vendas', dur: 30, prio: 1, como: 'Uma pessoa de cada vez. Mensagem curta vale.',
      passos: ['Abra o WhatsApp e escolha um nome.', 'Mande uma mensagem curta para essa pessoa.', 'Escolha o próximo nome e repita.'], menor: 'Uma pessoa. Uma mensagem.', rascunho: 'Escreva a mensagem no bloco de notas, sem enviar.' },
    { re: /roteiro|legenda/, cat: 'conteudo', dur: 25, prio: 2, como: 'Três frases: o que é, por que funciona, um convite.',
      passos: ['Abra o bloco de notas e escreva o assunto.', 'Escreva a primeira frase.', 'Complete as outras duas.'], menor: 'Escreva só a primeira frase.', rascunho: 'Escreva a pior versão possível. Depois mude uma palavra.' },
    { re: /\blives?\b/, cat: 'conteudo', dur: 45, prio: 2, como: 'Um assunto só e começo combinado.',
      passos: ['Escreva o assunto em uma frase.', 'Apoie o celular e olhe o enquadramento.', 'Comece e fale a primeira frase.'], menor: 'Fale o assunto em voz alta, sem ligar a live.', rascunho: 'Grave um ensaio de um minuto. Pode apagar.' },
    { re: /grav|video|reel|tiktok/, cat: 'conteudo', dur: 45, prio: 2, como: 'Uma ideia, uma tomada. Não precisa publicar hoje.',
      passos: ['Escreva a ideia em uma frase.', 'Apoie o celular e ligue a câmera.', 'Grave 20 segundos.', 'Assista uma vez e guarde.'], menor: 'Grave cinco segundos dizendo "oi".', rascunho: 'Grave sabendo que vai apagar.' },
    { re: /conteudo|\bpost|stor(y|ies)|\bfoto|editar|edicao|instagram|\barte\b/, cat: 'conteudo', dur: 40, prio: 2, como: 'Uma peça de conteúdo, do começo ao fim.',
      passos: ['Escolha uma foto ou ideia que já existe.', 'Escreva a primeira frase.', 'Monte e deixe pronto.'], menor: 'Só escolha a foto.', rascunho: 'Monte e salve sem publicar.' },
    { re: /atend|colorac|visagis|consultoria|styl|closet|cliente/, cat: 'cliente', dur: 120, prio: 0, como: 'Material separado e horário confirmado.',
      passos: ['Separe o material que vai usar.', 'Confirme horário e lugar.', 'Atenda com calma.'], menor: 'Só separe o material.', rascunho: 'Escreva num papel a ordem do atendimento.' },
    { re: /academia|trein|muscula|caminh|corrida|correr|pilates|\byoga|alonga|danca/, cat: 'corpo', dur: 60, prio: 3, como: 'Vestir a roupa já é começar.',
      passos: ['Vista a roupa.', 'Pegue água e saia.', 'Faça o primeiro exercício.'], menor: 'Dez minutos de movimento leve.', rascunho: 'Vista a roupa. Depois você decide.' },
    { re: /consulta|medic|dentista|exame|reuni|cabeleir|salao|manicure/, cat: 'pessoal', dur: 60, prio: 1, como: 'Confirme hora e lugar.',
      passos: ['Confirme hora e lugar.', 'Separe o que precisa levar.', 'Saia com folga.'], menor: 'Só confirme o horário.', rascunho: 'Anote a hora num papel.' },
    { re: /pagar|boleto|conta|banco|imposto|nota fiscal/, cat: 'casa', dur: 15, prio: 1, como: 'Uma conta de cada vez.',
      passos: ['Abra o aplicativo do banco.', 'Resolva a primeira conta.', 'Anote o que ficou feito.'], menor: 'Só abra e olhe qual vence primeiro.', rascunho: 'Escreva a lista do que falta, sem pagar nada.' },
    { re: /mercado|compra|farmacia|buscar|correio/, cat: 'pessoal', dur: 45, prio: 3, como: 'Lista curta e ida direta.',
      passos: ['Escreva a lista.', 'Pegue bolsa e chave.', 'Vá.'], menor: 'Só escreva a lista.', rascunho: 'Escreva três itens.' },
    { re: /ligar|telefon/, cat: 'casa', dur: 10, prio: 2, como: 'Diga o motivo na primeira frase.',
      passos: ['Escreva o que vai dizer em uma frase.', 'Abra o contato.', 'Toque em ligar.'], menor: 'Só escreva a frase.', rascunho: 'Mande mensagem no lugar da ligação.' },
    { re: /organiz|arrum|limp|separ|material|lavar|guarda|mala|planej|agenda/, cat: 'casa', dur: 25, prio: 3, como: 'Uma parte só. Quando o tempo acabar, pare.',
      passos: ['Tire uma coisa do lugar errado.', 'Faça uma parte só.', 'Pare quando o tempo acabar.'], menor: 'Três objetos.', rascunho: 'Empurre tudo para um lado. Vale.' }
  ];
  var PADRAO = { cat: 'casa', dur: 25, prio: 2, como: 'Comece pela parte mais fácil.',
    passos: ['Deixe na sua frente o que você precisa.', 'Faça a parte mais fácil primeiro.', 'Faça mais um pedaço.'], menor: 'Dois minutos da parte mais fácil.', rascunho: 'Faça mal feito de propósito. Depois melhora.' };

  function tempoDoTexto(txt) {
    var s = limpa(txt), hora = null, d = null, cortes = [], m;
    function pega(re) { var r = re.exec(s); if (r) { cortes.push([r.index, r.index + r[0].length]); s = s.slice(0, r.index) + r[0].replace(/./g, ' ') + s.slice(r.index + r[0].length); } return r; }
    if ((m = pega(/\b(?:por |durante |de )?(\d{1,3})\s*(?:min\b|minutos?\b)/))) d = +m[1];
    else if ((m = pega(/\b(?:por |durante |de )?meia hora\b/))) d = 30;
    else if ((m = pega(/\b(?:por |durante |de )?(uma|duas|tres)\s+horas?\b(?: e meia\b)?/))) d = { uma: 60, duas: 120, tres: 180 }[m[1]] + (/meia/.test(m[0]) ? 30 : 0);
    else if ((m = pega(/\b(?:por |durante |de )([1-9])\s*(?:h|horas?)(\d{2})?\b/))) d = +m[1] * 60 + (+m[2] || 0);
    /* "às 3" é hora; "as 3" sem acento só vale com h, minutos ou "da tarde" */
    var cra = /(^|\s)às\s/i.test(txt);
    if ((m = pega(/\b(?:as|a partir das|das)\s+(\d{1,2})\s*(?:horas?|h|:)\s*(\d{2})?(?:\s+e meia)?(\s+da (?:manha|tarde|noite))?(?![\w\/])/)) || (m = pega(/\b(?:as|das)\s+(\d{1,2})()(?:\s+e meia)?(\s+da (?:manha|tarde|noite))/)) || (cra && (m = pega(/\bas\s+(\d{1,2})()(?:\s+e meia)?()(?![\w\/:])/))) || (m = pega(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})\b(\s+da (?:manha|tarde|noite))?/)) || (m = pega(/\b([7-9]|1\d|2[0-3])\s*(?:horas|h)\b()(\s+da (?:manha|tarde|noite))?/))) {
      var h = +m[1], mi = +m[2] || (/e meia/.test(m[0]) ? 30 : 0);
      if (h < 24 && mi < 60) {
        if (/tarde|noite/.test(m[3] || '') && h < 12) h += 12;
        else if (!/manha/.test(m[3] || '') && h >= 1 && h <= 6) h += 12;
        hora = h * 60 + mi;
      }
    } else if (d === null && (m = pega(/\b([1-6])\s*(?:h|horas?)\b/))) d = +m[1] * 60;
    var r = txt.split(''); cortes.forEach(function (c) { for (var i = c[0]; i < c[1]; i++) r[i] = ' '; });
    return { hora: hora, dur: d && d >= 5 && d <= 480 ? d : null, resto: r.join('').replace(/\s+/g, ' ').replace(/\s*[,.;:-]\s*$/, '').trim() };
  }
  function interpretar(txt) {
    /* NFC garante que os índices do texto sem acento batem com os do original */
    txt = String(txt || '').normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 120); if (!txt) return null;
    var q = tempoDoTexto(txt), s = limpa(txt), regra = PADRAO;
    for (var i = 0; i < REGRAS.length; i++) if (REGRAS[i].re.test(s)) { regra = REGRAS[i]; break; }
    var t = q.resto.replace(/^(tenho|preciso|quero|vou)\s+(um |uma |de )?/i, '').trim() || txt;
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return { t: t, cat: regra.cat, dur: q.dur || regra.dur, prio: regra.prio, como: regra.como, passos: regra.passos.slice(), menor: regra.menor, rascunho: regra.rascunho, hora: q.hora, urgente: /urgent|prazo|hoje sem falta/.test(s) };
  }
  function separar(txt) { return String(txt || '').split(/[\n;]+|,(?!\d)/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20); }

  /* ---------- tempo livre ---------- */
  function livres(ocup, a, b) {
    var o = ocup.slice().sort(function (x, y) { return x[0] - y[0]; }), r = [], c = a;
    o.forEach(function (x) { if (x[0] > c) r.push([c, Math.min(x[0], b)]); c = Math.max(c, x[1]); });
    if (c < b) r.push([c, b]);
    return r.filter(function (x) { return x[1] - x[0] >= 5; });
  }
  function bate(ocup, i, f) { return ocup.some(function (x) { return i < x[1] && f > x[0]; }); }
  function faixa(it) { var d = it.desloc || 0; return [it.ini - d, it.ini + it.dur + d]; }
  function arred(m) { return Math.ceil(m / 5) * 5; }
  function perto(ocup, alvo, dur, min, a, b) {
    if (alvo >= a && alvo + dur <= b && !bate(ocup, alvo, alvo + dur)) return { ini: alvo, dur: dur };
    var melhor = null;
    livres(ocup, a, b).forEach(function (w) {
      var i0 = arred(w[0]), d = Math.min(dur, Math.floor((w[1] - i0) / 5) * 5); if (d < min) return;
      var i = Math.max(i0, Math.min(alvo, w[1] - d)); i = i - i % 5 < i0 ? i0 : i - i % 5;
      var custo = Math.abs(i - alvo) + (dur - d) * 2; if (!melhor || custo < melhor.custo) melhor = { ini: i, dur: d, custo: custo };
    });
    return melhor;
  }

  /* p = {rotina, treino, compromissos, tarefas, energia, inicio, fim} */
  function planejar(p) {
    var L = LIM[p.energia] || LIM.media, itens = [], cortes = [], ocup = [], inicio = arred(p.inicio || 0), n = 0, usado = 0;
    function poe(base, ini, dur, extra) { var it = {}, k; for (k in base) it[k] = base[k]; it.ini = ini; it.dur = dur; it.st = it.st || 'aberta'; for (k in extra || {}) it[k] = extra[k]; itens.push(it); ocup.push(faixa(it)); return it; }
    function corta(base, acao, motivo, de, para) { cortes.push({ item: base, acao: acao, motivo: motivo, de: de, para: para }); }

    p.compromissos.slice().sort(function (a, b) { return a.hora - b.hora; }).forEach(function (c) {
      var f = [c.hora - (c.desloc || 0), c.hora + c.dur + (c.desloc || 0)], choque = null;
      itens.forEach(function (x) { var g = faixa(x); if (f[0] < g[1] && f[1] > g[0]) choque = x; });
      poe(c, c.hora, c.dur, { fixo: true });
      if (choque) corta(c, 'conflito', 'Bate com "' + choque.t + '", às ' + hm(choque.ini) + '. Confira os horários.');
    });
    var fecha = null, blocos = [];
    p.rotina.forEach(function (b) {
      if (b.tipo === 'bloco') { blocos.push(b); return; }
      if (b.cat === 'fechar') { fecha = b; return; }
      if (b.id === 'org' && p.energia === 'baixa') return;
      if (b.ini + b.dur <= inicio) return;
      var ini = Math.max(b.ini, inicio), dur = b.ini + b.dur - ini; if (dur < 10) return;
      var v = perto(ocup, ini, dur, b.id === 'almoco' ? Math.min(40, dur) : Math.min(10, dur), Math.max(inicio, b.ini - 150), b.ini + b.dur + 150);
      if (v) poe({ id: b.id, t: b.t, cat: b.cat, como: b.como || '', passos: b.id === 'org' ? ['Leia o seu dia até o fim.', 'Separe o que vai usar na primeira tarefa.'] : [] }, v.ini, v.dur, { ancora: true });
      else if (b.id === 'almoco') corta(b, 'aviso', 'Não achei espaço para o almoço. Guarde pelo menos 30 minutos.');
    });
    var fimDia = arred(p.fim || (fecha ? fecha.ini : 1020));
    if (p.treino) {
      var tr = p.treino, d = tr.dur, leve = p.energia === 'baixa' && tr.tipo === 'musculacao';
      var base = { t: tr.t, cat: 'corpo', como: 'Vestir a roupa já é começar.', passos: ['Vista a roupa.', 'Pegue água e saia.', 'Faça o primeiro exercício.'], menor: 'Dez minutos de movimento leve.', rascunho: 'Vista a roupa. Depois você decide.', treino: tr.tipo, treinoNome: tr.t };
      if (leve) { base.t = 'Caminhada leve'; base.treino = 'caminhada'; base.treinoNome = base.t; d = 20; }
      var vt = perto(ocup, Math.max(tr.hora, inicio), d, Math.min(d, 20), Math.max(inicio, 360), 1290);
      if (vt) { poe(base, vt.ini, vt.dur, { ancora: false, fixo: false, manual: true }); if (leve) corta({ t: tr.t }, 'reduzir', 'Sem energia, o treino vira caminhada leve.', tr.dur, d); }
      else corta(base, 'adiar', 'Não sobrou horário para o treino.', d);
    }
    if (fecha) { var vf = perto(ocup, Math.max(fimDia, inicio), fecha.dur, 5, Math.max(fimDia, inicio), 1430); if (vf) poe({ id: 'fechar', t: fecha.t, cat: 'fechar', como: fecha.como }, vf.ini, vf.dur, { ancora: true }); }

    var comeco = Math.max(inicio, Math.min.apply(null, p.rotina.filter(function (b) { return b.cat !== 'pausa' && b.cat !== 'fechar'; }).map(function (b) { return b.ini; }).concat([1440])));
    if (comeco >= fimDia) comeco = inicio;
    var cap = Math.floor(livres(ocup, comeco, fimDia).reduce(function (s, w) { return s + w[1] - w[0]; }, 0) * L.uso);
    function vaga(dur, cat) {
      var ws = livres(ocup, comeco, fimDia), i;
      for (var b = 0; b < blocos.length; b++) if (blocos[b].cat === cat) for (i = 0; i < ws.length; i++) {
        var s = arred(Math.max(ws[i][0], blocos[b].ini)); if (s < blocos[b].ini + blocos[b].dur && s + dur <= ws[i][1]) return s;
      }
      for (i = 0; i < ws.length; i++) if (arred(ws[i][0]) + dur <= ws[i][1]) return arred(ws[i][0]);
      return null;
    }
    function maior() { return livres(ocup, comeco, fimDia).reduce(function (m, w) { return Math.max(m, Math.floor((w[1] - arred(w[0])) / 5) * 5); }, 0); }
    var fila = p.tarefas.map(function (t, i) { return { t: t, i: i }; }).sort(function (a, b) { return (b.t.urgente ? 1 : 0) - (a.t.urgente ? 1 : 0) || a.t.prio - b.t.prio || a.i - b.i; });
    fila.forEach(function (f) {
      var t = f.t, orig = t.dur, dur = t.dur, motivo = '';
      if (n >= L.max) { corta(t, 'adiar', 'Já são ' + n + ' tarefas. Mais que isso vira peso.', orig); return; }
      if (p.energia === 'baixa' && dur > 20) { dur = 20; motivo = 'Sem energia, uma parte já vale.'; }
      if (usado + dur > cap) { var r = Math.floor((cap - usado) / 5) * 5; if (r >= 10 && (r >= dur * 0.4 || t.urgente || t.prio <= 1)) { dur = Math.min(dur, r); motivo = 'Assim sobra folga para imprevistos.'; } else { corta(t, 'adiar', 'O tempo livre já está tomado, e você precisa de folga.', orig); return; } }
      var ini = vaga(dur, t.cat);
      if (ini === null) { var g = maior(); if (g >= 10 && (g >= dur * 0.4 || t.urgente || t.prio <= 1)) { dur = Math.min(dur, g); ini = vaga(dur, t.cat); motivo = 'Foi o maior espaço livre que achei.'; } }
      if (ini === null) { corta(t, 'adiar', 'Não sobrou horário livre.', orig); return; }
      poe(t, ini, dur, {}); ocup.push([ini, ini + dur + FOLGA]); n++; usado += dur;
      if (dur < orig) corta(t, 'reduzir', motivo, orig, dur);
    });
    if (p.fim) acertaFechar(itens, fecha ? fecha.ini : 1020, inicio);
    itens.sort(porHora);
    return { itens: itens, cortes: cortes, capacidade: cap, usado: usado };
  }
  function acertaFechar(itens, base, de) {
    var f = itens.filter(function (x) { return x.cat === 'fechar' && x.st === 'aberta'; })[0]; if (!f || f.manual) return;
    var fim = itens.reduce(function (m, x) { return x !== f && x.st === 'aberta' && !x.fixo && !x.ancora ? Math.max(m, x.ini + x.dur) : m; }, Math.max(base, de || 0)), v = proximo(itens, f.dur, fim, 1560, f);
    if (v !== null) f.ini = v;
  }
  function porHora(a, b) { return a.ini - b.ini || a.dur - b.dur; }
  function preso(it) { return it.fixo || it.ancora || it.manual || it.st !== 'aberta'; }

  /* próximo horário que cabe, sem bater em nada que já está na lista */
  function proximo(itens, dur, de, ate, fora) {
    var ocup = itens.filter(function (x) { return x !== fora && x.st === 'aberta'; }).map(faixa), i = arred(de), guarda = 0;
    while (i + dur <= ate && guarda++ < 400) { if (!bate(ocup, i, i + dur)) return i; i += 5; }
    return null;
  }
  /* respeita a ordem da lista: o item movido entra logo depois do anterior; os outros só andam se precisar */
  function encaixar(lista, movido, de) {
    var copia = lista.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; return y; }), im = lista.indexOf(movido), cur = de, ok = true;
    var presos = copia.filter(function (x, i) { return preso(x) && i !== im && x.st === 'aberta'; }).map(faixa);
    copia.forEach(function (it, i) {
      if (it.st !== 'aberta') return;
      if (preso(it) && i !== im) { cur = Math.max(cur, faixa(it)[1]); return; }
      var s = arred(i === im ? cur : Math.max(cur, it.ini)), g = 0;
      while (bate(presos, s, s + it.dur) && g++ < 400) s += 5;
      if (s + it.dur > 1440) ok = false;
      it.ini = s; cur = s + it.dur;
    });
    copia.sort(porHora);
    return ok ? copia : null;
  }
  return { CATS: CATS, LIM: LIM, ROTINA: ROTINA, hm: hm, campo: campo, deCampo: deCampo, dura: dura, interpretar: interpretar, separar: separar, planejar: planejar, proximo: proximo, encaixar: encaixar, faixa: faixa, acertaFechar: acertaFechar, porHora: porHora, preso: preso, livres: livres, limpa: limpa };
})();
if (typeof module !== 'undefined') module.exports = MOTOR;
