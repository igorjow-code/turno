/* Motor do Turno: entende o que foi escrito, escolhe o que entra no dia e calcula a fila. Sem tela, sem rede, sem memória própria. */
var MOTOR = (function () {
  'use strict';
  var CATS = {
    cliente: { n: 'Cliente', c: '#a83f58' }, vendas: { n: 'Vender', c: '#c58a2e' }, conteudo: { n: 'Aparecer', c: '#c2643a' },
    estudo: { n: 'Estudar', c: '#7f7b3e' }, casa: { n: 'Organizar', c: '#8f7563' }, corpo: { n: 'Corpo', c: '#4f8270' },
    pessoal: { n: 'Pessoal', c: '#8f72a0' }, pausa: { n: 'Pausa', c: '#b9aa9c' }, fechar: { n: 'Encerrar', c: '#b9aa9c' }
  };
  /* o que o ânimo da manhã muda: quanto do tempo livre vai para pendências e o tamanho das 4 obrigações */
  var ANIMO = { boa: { uso: 0.85, obrig: 1 }, media: { uso: 0.6, obrig: 1 }, baixa: { uso: 0, obrig: 0.5 } };

  function hm(m) { m = ((m % 1440) + 1440) % 1440; return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); }
  function campo(m) { var t = hm(m); return t.length < 5 ? '0' + t : t; }
  function deCampo(s) { var p = /^(\d{1,2}):(\d{2})/.exec(s || ''); return p ? (+p[1]) * 60 + (+p[2]) : null; }
  function dura(d) { if (d < 60) return d + ' min'; var h = Math.floor(d / 60), m = d % 60; return h + 'h' + (m ? ('0' + m).slice(-2) : ''); }
  function limpa(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function arred(m) { return Math.ceil(m / 5) * 5; }

  /* ---------- datas no formato 2026-11-26 ---------- */
  function ms(k) { var p = k.split('-'); return Date.UTC(+p[0], p[1] - 1, +p[2]); }
  function chave(t) { var d = new Date(t); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function somaDias(k, n) { return chave(ms(k) + n * 864e5); }
  function diasEntre(a, b) { return Math.round((ms(b) - ms(a)) / 864e5); }
  function diaSemana(k) { return new Date(ms(k)).getUTCDay(); }

  /* a rotina que se repete todo dia: as 4 obrigações sempre no mesmo horário */
  var ROTINA = [
    { id: 'cafe', t: 'Café da manhã', cat: 'pausa', ini: 510, dur: 30, tipo: 'pausa' },
    { id: 'org', t: 'Organizar', cat: 'casa', ini: 540, dur: 20, tipo: 'obrig' },
    { id: 'vendas', t: 'Vender', cat: 'vendas', ini: 560, dur: 70, tipo: 'obrig' },
    { id: 'aparecer', t: 'Aparecer', cat: 'conteudo', ini: 630, dur: 45, tipo: 'obrig' },
    { id: 'estudo', t: 'Estudar', cat: 'estudo', ini: 675, dur: 30, tipo: 'obrig' },
    { id: 'almoco', t: 'Almoço e pausa', cat: 'pausa', ini: 705, dur: 105, tipo: 'pausa' },
    { id: 'fechar', t: 'Encerrar o dia', cat: 'fechar', ini: 1020, dur: 15, tipo: 'fim' }
  ];
  var OBRIG = {
    org: { como: 'Olhe o dia e deixe tudo pronto para começar.', passos: ['Leia o seu dia até o fim.', 'Confira atendimentos e contatos pendentes.', 'Arrume a mesa onde você trabalha.'], menor: 'Só leia o seu dia.', rascunho: 'Leia o seu dia em voz alta.' },
    vendas: { como: 'Pelo menos três acompanhamentos e uma conversa até o agendamento.', passos: ['Retome uma conversa com uma possível cliente.', 'Faça três acompanhamentos.', 'Responda quem mostrou interesse.', 'Divulgue seus serviços.', 'Leve uma conversa até o agendamento.'], menor: 'Uma pessoa. Uma mensagem.', rascunho: 'Escreva a mensagem no bloco de notas, sem enviar.' },
    aparecer: { como: 'Não precisa ser um Reels elaborado. É só não desaparecer.', passos: ['Publique um story.', 'Mostre algo que você sabe de moda, ou um bastidor.', 'Fale dos seus serviços.'], menor: 'Um story. Pode ser uma foto.', rascunho: 'Grave um story e salve sem publicar.' },
    estudo: { como: 'Uma aula por vez.', passos: ['Abra a próxima aula do curso.', 'Assista à aula.', 'Anote três aprendizados.'], menor: 'Assista a cinco minutos, sem anotar nada.', rascunho: 'Deixe a aula tocando enquanto arruma algo perto.' }
  };

  /* ---------- entender o que foi escrito ---------- */
  var REGRAS = [
    { re: /estud|\bcurso|\baula|aprender|\bler\b|assistir/, cat: 'estudo', dur: 30, como: 'Uma aula ou um trecho. Sem precisar anotar tudo.',
      passos: ['Abra a aula e deixe na tela.', 'Assista aos primeiros minutos.', 'Escreva uma ideia que dá para usar.'], menor: 'Assista a cinco minutos, sem anotar nada.', rascunho: 'Deixe a aula tocando enquanto arruma algo perto.' },
    { re: /retom|convers|follow|propost|orcament|vend[ae]|divulg|oferec|indica|mensage|whats|prospec|responder|captar|clientes/, cat: 'vendas', dur: 30, como: 'Uma pessoa de cada vez. Mensagem curta vale.',
      passos: ['Abra o WhatsApp e escolha um nome.', 'Mande uma mensagem curta para essa pessoa.', 'Escolha o próximo nome e repita.'], menor: 'Uma pessoa. Uma mensagem.', rascunho: 'Escreva a mensagem no bloco de notas, sem enviar.' },
    { re: /roteiro|legenda/, cat: 'conteudo', dur: 25, como: 'Três frases: o que é, por que funciona, um convite.',
      passos: ['Abra o bloco de notas e escreva o assunto.', 'Escreva a primeira frase.', 'Complete as outras duas.'], menor: 'Escreva só a primeira frase.', rascunho: 'Escreva a pior versão possível. Depois mude uma palavra.' },
    { re: /\blives?\b/, cat: 'conteudo', dur: 45, como: 'Um assunto só e começo combinado.',
      passos: ['Escreva o assunto em uma frase.', 'Apoie o celular e olhe o enquadramento.', 'Comece e fale a primeira frase.'], menor: 'Fale o assunto em voz alta, sem ligar a live.', rascunho: 'Grave um ensaio de um minuto. Pode apagar.' },
    { re: /grav|video|reel|tiktok/, cat: 'conteudo', dur: 45, como: 'Uma ideia, uma tomada. Não precisa publicar hoje.',
      passos: ['Escreva a ideia em uma frase.', 'Apoie o celular e ligue a câmera.', 'Grave 20 segundos.', 'Assista uma vez e guarde.'], menor: 'Grave cinco segundos dizendo "oi".', rascunho: 'Grave sabendo que vai apagar.' },
    { re: /conteudo|\bpost|stor(y|ies)|\bfoto|editar|edicao|instagram|\barte\b/, cat: 'conteudo', dur: 40, como: 'Uma peça de conteúdo, do começo ao fim.',
      passos: ['Escolha uma foto ou ideia que já existe.', 'Escreva a primeira frase.', 'Monte e deixe pronto.'], menor: 'Só escolha a foto.', rascunho: 'Monte e salve sem publicar.' },
    { re: /atend|colorac|visagis|consultoria|styl|closet|cliente|paleta|cartela|dossie|analise/, cat: 'cliente', dur: 90, como: 'Material separado e cada parte de uma vez.',
      passos: ['Separe o material que vai usar.', 'Faça a primeira parte.', 'Confira o que falta.'], menor: 'Só separe o material.', rascunho: 'Escreva num papel a ordem do que vai fazer.' },
    { re: /academia|trein|muscula|caminh|corrida|correr|pilates|\byoga|alonga|danca/, cat: 'corpo', dur: 60, como: 'Vestir a roupa já é começar.',
      passos: ['Vista a roupa.', 'Pegue água e saia.', 'Faça o primeiro exercício.'], menor: 'Dez minutos de movimento leve.', rascunho: 'Vista a roupa. Depois você decide.' },
    { re: /consulta|medic|dentista|exame|reuni|cabeleir|salao|manicure/, cat: 'pessoal', dur: 60, como: 'Confirme hora e lugar.',
      passos: ['Confirme hora e lugar.', 'Separe o que precisa levar.', 'Saia com folga.'], menor: 'Só confirme o horário.', rascunho: 'Anote a hora num papel.' },
    { re: /pagar|boleto|conta|banco|imposto|nota fiscal/, cat: 'casa', dur: 15, como: 'Uma conta de cada vez.',
      passos: ['Abra o aplicativo do banco.', 'Resolva a primeira conta.', 'Anote o que ficou feito.'], menor: 'Só abra e olhe qual vence primeiro.', rascunho: 'Escreva a lista do que falta, sem pagar nada.' },
    { re: /mercado|compra|farmacia|buscar|correio/, cat: 'pessoal', dur: 45, como: 'Lista curta e ida direta.',
      passos: ['Escreva a lista.', 'Pegue bolsa e chave.', 'Vá.'], menor: 'Só escreva a lista.', rascunho: 'Escreva três itens.' },
    { re: /ligar|telefon/, cat: 'casa', dur: 10, como: 'Diga o motivo na primeira frase.',
      passos: ['Escreva o que vai dizer em uma frase.', 'Abra o contato.', 'Toque em ligar.'], menor: 'Só escreva a frase.', rascunho: 'Mande mensagem no lugar da ligação.' },
    { re: /organiz|arrum|limp|separ|material|lavar|guarda|mala|planej|agenda/, cat: 'casa', dur: 25, como: 'Uma parte só. Quando o tempo acabar, pare.',
      passos: ['Tire uma coisa do lugar errado.', 'Faça uma parte só.', 'Pare quando o tempo acabar.'], menor: 'Três objetos.', rascunho: 'Empurre tudo para um lado. Vale.' }
  ];
  var PADRAO = { cat: 'casa', dur: 30, como: 'Comece pela parte mais fácil.',
    passos: ['Deixe na sua frente o que você precisa.', 'Faça a parte mais fácil primeiro.', 'Faça mais um pedaço.'], menor: 'Dois minutos da parte mais fácil.', rascunho: 'Faça mal feito de propósito. Depois melhora.' };
  var CLIENTE = /cliente|atend|colorac|visagis|consultoria|closet|paleta|cartela|dossie|styl|mala intelig/;

  /* "até sexta", "amanhã", "dia 28", "28/11": devolve a data e o texto sem ela */
  function dataDoTexto(txt, base) {
    var s = limpa(txt), P = '\\b(?:(?:para|pra|ate|no|na|nesta|nessa|neste|nesse|esta|essa|este|esse|de|o|a)\\s+)*', SEMS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'], wd = diaSemana(base), m, d = null;
    var tenta = [
      [P + 'depois de amanha\\b', function () { return somaDias(base, 2); }],
      [P + 'amanha\\b', function () { return somaDias(base, 1); }],
      [P + 'hoje\\b', function () { return base; }],
      [P + '(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:[- ]feira)?\\b(?! (?:parte|vez|opcao|etapa))', function (r) { return somaDias(base, (SEMS.indexOf(r[1]) - wd + 7) % 7); }],
      [P + '(?:dia\\s+)?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\b', function (r) {
        var a = +base.slice(0, 4), mm = +r[2], dd = +r[1]; if (r[3]) a = r[3].length === 2 ? 2000 + +r[3] : +r[3]; if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
        var k = a + '-' + ('0' + mm).slice(-2) + '-' + ('0' + dd).slice(-2); if (chave(ms(k)) !== k) return null; if (!r[3] && k < base) k = (a + 1) + k.slice(4); return k; }],
      [P + 'dia\\s+(\\d{1,2})\\b(?!\\s*(?:h\\b|:|horas?|\\/))', function (r) {
        var dd = +r[1], a = +base.slice(0, 4), mm = +base.slice(5, 7); if (dd < 1 || dd > 31) return null; if (dd < +base.slice(8)) { mm++; if (mm > 12) { mm = 1; a++; } }
        var k = a + '-' + ('0' + mm).slice(-2) + '-' + ('0' + dd).slice(-2); return chave(ms(k)) === k ? k : null; }],
      ['\\b(?:(?:para|pra|ate|na|da)\\s+)*(?:semana que vem|proxima semana)\\b', function () { return somaDias(base, ((8 - wd) % 7 || 7) + 4); }],
      ['\\b(?:(?:ate o fim d[ae]|ate|para|pra|nesta|nessa|esta|essa)\\s+)+semana\\b', function () { return somaDias(base, wd === 6 ? 1 : wd === 0 ? 0 : 5 - wd); }]
    ];
    for (var i = 0; i < tenta.length && d === null; i++) {
      if ((m = new RegExp(tenta[i][0]).exec(s))) { var v = tenta[i][1](m); if (v) { d = v; txt = txt.slice(0, m.index) + m[0].replace(/./g, ' ') + txt.slice(m.index + m[0].length); } }
    }
    return { data: d, txt: txt };
  }
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
  function interpretar(txt, base) {
    /* NFC garante que os índices do texto sem acento batem com os do original */
    txt = String(txt || '').normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 120); if (!txt) return null;
    var dd = base ? dataDoTexto(txt, base) : { data: null, txt: txt }, q = tempoDoTexto(dd.txt), s = limpa(txt), regra = PADRAO;
    for (var i = 0; i < REGRAS.length; i++) if (REGRAS[i].re.test(s)) { regra = REGRAS[i]; break; }
    var t = q.resto.replace(/^(tenho|preciso|quero|vou)\s+(um |uma |de )?/i, '').trim();
    for (var k = 0; k < 3; k++) t = t.replace(/\s+(?:para|pra|até|ate|no|na|de|do|da|em|o|a)$/i, '').replace(/\s*[,.;:-]\s*$/, '');
    t = t || txt; t = t.charAt(0).toUpperCase() + t.slice(1);
    return { t: t, cat: regra.cat, dur: q.dur || regra.dur, como: regra.como, passos: regra.passos.slice(), menor: regra.menor, rascunho: regra.rascunho, hora: q.hora, data: dd.data, cliente: CLIENTE.test(s) };
  }
  function separar(txt) { return String(txt || '').split(/[\n;]+|,(?!\d)/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20); }

  /* ---------- pendências: quanto de cada uma entra em um dia ---------- */
  /* com prazo, a pendência é dividida pelos dias até a véspera; vence hoje ou amanhã, entra inteira */
  function partes(p, base) {
    var rest = Math.max(0, (p.dur || 0) - (p.feito || 0)); if (!rest) return null;
    if (p.naoAntes && p.naoAntes > base) return null;
    var d = p.prazo ? diasEntre(base, p.prazo) : null, dur, must = false;
    if (d === null) dur = rest <= 90 ? rest : 60;
    else if (d <= 1) { dur = rest; must = true; }
    else dur = Math.min(rest, Math.max(15, arred(rest / d)));
    return { p: p, dur: dur, must: must, vence: d !== null && d <= 0, d: d, parte: dur < rest, rest: rest };
  }
  /* ordem de importância: vence antes primeiro; no empate, cliente; sem prazo, a mais antiga */
  function chaveRank(x) { return [x.must ? 0 : 1, x.d === null ? 1 : 0, x.d === null ? 0 : x.d, x.p.cliente ? 0 : 1, x.p.desde || '', x.i || 0]; }
  function compara(a, b) { var ka = chaveRank(a), kb = chaveRank(b); for (var i = 0; i < ka.length; i++) { if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; } return 0; }
  function ordenar(pend, base) {
    return pend.map(function (p, i) { var x = partes(p, base) || { p: p, dur: 0, must: false, d: p.prazo ? diasEntre(base, p.prazo) : null, fora: true }; x.i = i; return x; }).sort(compara);
  }
  function escolher(pend, base, animo, cap) {
    var c = pend.map(function (p, i) { var x = partes(p, base); if (x) x.i = i; return x; }).filter(Boolean).sort(compara), out = [], usado = 0;
    c.forEach(function (x) {
      if (x.must) { out.push(x); usado += x.dur; return; }
      if (animo === 'baixa') return;
      if (usado + x.dur <= cap) { out.push(x); usado += x.dur; return; }
      var sobra = Math.floor((cap - usado) / 5) * 5;
      if (sobra >= 20) { x.dur = sobra; x.parte = true; out.push(x); usado += sobra; }
    });
    return out;
  }
  function entradaPend(x) {
    var p = x.p; return { tipo: 'pend', ref: p.id, t: p.t, cat: p.cat, dur: x.dur, alvo: 0, parte: x.parte, prazo: p.prazo || null, cliente: !!p.cliente, como: p.como || '', passos: (p.passos || []).slice(), menor: p.menor || '', rascunho: p.rascunho || '', st: 'aberta' };
  }

  /* ---------- tempo livre ---------- */
  function livres(ocup, a, b) {
    var o = ocup.slice().sort(function (x, y) { return x[0] - y[0]; }), r = [], c = a;
    o.forEach(function (x) { if (x[0] > c) r.push([c, Math.min(x[0], b)]); c = Math.max(c, x[1]); });
    if (c < b) r.push([c, b]);
    return r.filter(function (x) { return x[1] - x[0] >= 5; });
  }
  function bate(ocup, i, f) { return ocup.some(function (x) { return i < x[1] && f > x[0]; }); }
  function faixa(it) { var d = it.desloc || 0, i = it.hora != null ? it.hora : it.ini; return [i - d, i + it.dur + d]; }
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

  /* ---------- a fila: cada tarefa começa quando a anterior acaba, pulando o que tem hora marcada ---------- */
  function projetar(fila, bloqueios, agora, fim, emCurso) {
    /* pausa é mole: uma tarefa pode avançar até 15 minutos nela */
    var ocup = bloqueios.map(function (b) { var f = faixa(b); if (b.mole) f[0] = Math.min(f[1], f[0] + b.mole); return f; }), cur = agora, ex = null;
    if (emCurso) fila.forEach(function (e) { if (e.id === emCurso.id && e.st === 'aberta') ex = e; });
    if (ex) { ex.ini = emCurso.ini; ex.cabe = true; cur = Math.max(agora, ex.ini + ex.dur); }
    fila.forEach(function (e) {
      if (e.st !== 'aberta' || e === ex) return;
      var s = arred(Math.max(cur, e.alvo || 0)), g = 0, b;
      while ((b = ocup.filter(function (f) { return s < f[1] && s + e.dur > f[0]; })).length && g++ < 60) s = arred(Math.max.apply(null, b.map(function (f) { return f[1]; })));
      e.ini = s; e.cabe = s + e.dur <= fim + 5; cur = s + e.dur;
    });
    return fila;
  }

  /* o = {rotina, animo, pend, base, comps, treino, inicio, ordens} */
  function montarDia(o) {
    var A = ANIMO[o.animo] || ANIMO.media, inicio = arred(o.inicio || 0), fixos = [], obr = [], comps = o.comps || [];
    var fr = o.rotina.filter(function (b) { return b.tipo === 'fim'; })[0], fim = fr ? fr.ini : 1020;
    if (inicio > fim - 60) fim = Math.min(1440, inicio + 180);
    o.rotina.forEach(function (b) {
      if (b.tipo === 'pausa' && b.ini + b.dur > inicio) fixos.push({ tipo: 'pausa', ref: b.id, t: b.t, cat: 'pausa', ini: b.ini, dur: b.dur, mole: 15 });
      if (b.tipo === 'obrig') {
        var x = OBRIG[b.id] || PADRAO, e = { tipo: 'obrig', ref: b.id, t: b.t, cat: b.cat, dur: Math.max(10, arred(b.dur * A.obrig)), alvo: b.ini, como: x.como, passos: x.passos.slice(), menor: x.menor, rascunho: x.rascunho, st: 'aberta' }, od = o.ordens && o.ordens[b.id];
        if (od) { e.passos[0] = od.t; e.copia = od.copia || null; e.menor = od.menor || e.menor; e.rascunho = od.rascunho || e.rascunho; }
        obr.push(e);
      }
    });
    var ocup = fixos.map(faixa).concat(comps.map(faixa));
    if (o.treino) {
      var tr = o.treino, v = perto(ocup, Math.max(tr.hora, inicio), tr.dur, Math.min(tr.dur, 20), Math.max(inicio, 360), 1290);
      if (v) { var tf = { tipo: 'treino', ref: tr.tipo, t: tr.t, cat: 'corpo', ini: v.ini, dur: v.dur, st: 'aberta', como: 'Vestir a roupa já é começar.', passos: ['Vista a roupa.', 'Pegue água e saia.', 'Faça o primeiro exercício.'], menor: 'Dez minutos de movimento leve.', rascunho: 'Vista a roupa. Depois você decide.' }; fixos.push(tf); ocup.push(faixa(tf)); }
    }
    /* quanto sobra depois das obrigações, até a hora de encerrar */
    var bl = fixos.concat(comps), prova = projetar(obr.map(function (e) { var y = {}; for (var k in e) y[k] = e[k]; return y; }), bl, inicio, fim, null);
    var depois = prova.reduce(function (m, e) { return Math.max(m, e.ini + e.dur); }, inicio);
    var livre = livres(ocup, Math.min(depois, fim), fim).reduce(function (s, w) { return s + w[1] - w[0]; }, 0), cap = Math.floor(livre * A.uso);
    var sel = escolher(o.pend || [], o.base, o.animo, cap), vence = [], resto = [];
    sel.forEach(function (x) { (x.vence ? vence : resto).push(entradaPend(x)); });
    var org = obr.filter(function (e) { return e.ref === 'org'; }), outras = obr.filter(function (e) { return e.ref !== 'org'; });
    return { fila: org.concat(vence, outras, resto), fixos: fixos, fim: fim, cap: cap };
  }
  function porHora(a, b) { return a.ini - b.ini || a.dur - b.dur; }

  return { CATS: CATS, ANIMO: ANIMO, ROTINA: ROTINA, OBRIG: OBRIG, hm: hm, campo: campo, deCampo: deCampo, dura: dura, limpa: limpa, arred: arred,
    somaDias: somaDias, diasEntre: diasEntre, diaSemana: diaSemana, dataDoTexto: dataDoTexto, interpretar: interpretar, separar: separar,
    partes: partes, ordenar: ordenar, escolher: escolher, entradaPend: entradaPend, livres: livres, faixa: faixa, projetar: projetar, montarDia: montarDia, porHora: porHora };
})();
if (typeof module !== 'undefined') module.exports = MOTOR;
