/* Xadrez acessível do Circula Xadrez Acessível (código próprio; regras pela chess.js). */
import { Chess } from './lib/chess.js';

var jogo = new Chess();
var el = function(id){ return document.getElementById(id); };
var tabEl = el('tabuleiro'), statusEl = el('status');
var COLUNAS = 'abcdefgh';
var GLIFO = {k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟'};
var NOME = {k:'rei', q:'dama', r:'torre', b:'bispo', n:'cavalo', p:'peão'};
var NOME_CAP = {k:'Rei', q:'Dama', r:'Torre', b:'Bispo', n:'Cavalo', p:'Peão'};
var COR = {w:'brancas', b:'pretas'};
var LETRA_PT = {K:'R', Q:'D', R:'T', B:'B', N:'C'};

/* ---------- estado ---------- */
var CHAVE = 'cla-xadrez-v1';
var pref = {narrar:true, confirmar:false, casa:false, grandes:false, contraste:false, modo:'maquina', nivel:2, cor:'w'};
try{ Object.assign(pref, JSON.parse(localStorage.getItem(CHAVE) || '{}')); }catch(e){}
function salvarPref(){ try{ localStorage.setItem(CHAVE, JSON.stringify(pref)); }catch(e){} }
var modo = pref.modo, nivel = pref.nivel, corHumano = 'w', virado = false;
var selecionada = null, pendente = null, pensando = false, focoSq = 'e2', partidaIniciada = false;

/* ---------- voz ---------- */
var falaOk = 'speechSynthesis' in window, voz = null;
function escolherVoz(){ if(!falaOk) return; var vs = speechSynthesis.getVoices(); voz = vs.filter(function(v){ return /pt[-_]BR/i.test(v.lang); })[0] || vs.filter(function(v){ return /^pt/i.test(v.lang); })[0] || null; }
if(falaOk){ escolherVoz(); speechSynthesis.onvoiceschanged = escolherVoz; }
function falar(t, interromper){
  if(!falaOk || !t) return;
  if(interromper !== false) speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(t); u.lang = 'pt-BR'; if(voz) u.voice = voz; u.rate = 1;
  speechSynthesis.speak(u);
}
function status(t){ statusEl.textContent = t; }

/* ---------- descrições ---------- */
function descreverCasa(sq){
  var p = jogo.get(sq);
  return sq + (p ? ', ' + NOME[p.type] + ' ' + (p.color === 'w' ? 'branco' : 'preto').replace(/o$/, p.type === 'q' || p.type === 'r' ? 'a' : 'o') : ', vazia');
}
function descreverLance(m){
  var quem = m.color === 'w' ? 'Brancas' : 'Pretas', t;
  if(m.san.indexOf('O-O-O') === 0) t = quem + ': roque grande';
  else if(m.san.indexOf('O-O') === 0) t = quem + ': roque pequeno';
  else {
    t = quem + ': ' + NOME[m.piece] + ' de ' + m.from + ' para ' + m.to;
    if(m.captured) t += ', captura ' + NOME[m.captured] + ' em ' + m.to;
    if(m.promotion) t += ', e promove a ' + NOME[m.promotion];
  }
  if(jogo.isCheckmate()) t += '. Xeque-mate! Vitória das ' + COR[m.color] + '.';
  else if(jogo.inCheck()) t += '. Xeque!';
  return t;
}
function descreverEscolha(m){
  if(m.san && m.san.indexOf('O-O-O') === 0) return 'Roque grande';
  if(m.san && m.san.indexOf('O-O') === 0) return 'Roque pequeno';
  var t = NOME_CAP[m.piece] + ' de ' + m.from + ' para ' + m.to;
  if(m.captured) t += ', capturando ' + NOME[m.captured];
  if(m.promotion) t += ', promovendo a ' + NOME[m.promotion];
  return t;
}
function sanPT(san){ return san.replace(/[KQRBN]/g, function(l){ return LETRA_PT[l]; }); }
function lerTabuleiro(){
  var b = {w:[], b:[]}, ordem = 'kqrbnp';
  jogo.board().forEach(function(l){ l.forEach(function(c){ if(c) b[c.color].push(c); }); });
  function lista(cs){ return cs.sort(function(x, y){ return ordem.indexOf(x.type) - ordem.indexOf(y.type); }).map(function(c){ return NOME[c.type] + ' em ' + c.square; }).join(', '); }
  var t = 'Brancas: ' + lista(b.w) + '. Pretas: ' + lista(b.b) + '. ' + textoVez();
  status(t); falar(t);
}
function textoVez(){
  if(jogo.isGameOver()) return textoFim();
  var cor = jogo.turn(), sua = modo === 'maquina' ? (cor === corHumano ? ' (sua vez)' : ' (computador pensando)') : '';
  return 'Vez das ' + COR[cor] + sua + (jogo.inCheck() ? '. Xeque!' : '.');
}
function textoFim(){
  if(jogo.isCheckmate()){ var venc = jogo.turn() === 'w' ? 'b' : 'w'; return 'Xeque-mate! Vitória das ' + COR[venc] + (modo === 'maquina' ? (venc === corHumano ? '. Parabéns, você venceu!' : '. O computador venceu desta vez.') : '.'); }
  if(jogo.isStalemate()) return 'Empate por afogamento: o rei não está em xeque, mas não há lance possível.';
  if(jogo.isThreefoldRepetition()) return 'Empate pela repetição da mesma posição três vezes.';
  if(jogo.isInsufficientMaterial()) return 'Empate: não há peças suficientes para dar mate.';
  if(jogo.isDraw()) return 'Empate pela regra dos 50 lances.';
  return 'Fim de jogo.';
}

/* ---------- tabuleiro ---------- */
function ordemCasas(){
  var casas = [];
  for(var i = 0; i < 8; i++) for(var j = 0; j < 8; j++){
    var lin = virado ? i + 1 : 8 - i, col = virado ? 7 - j : j;
    casas.push(COLUNAS[col] + lin);
  }
  return casas;
}
function desenhar(){
  var casas = ordemCasas(), alvos = {}, hist = jogo.history({verbose:true}), ultimo = hist[hist.length - 1];
  if(selecionada) jogo.moves({square:selecionada, verbose:true}).forEach(function(m){ alvos[m.to] = true; });
  var reiXeque = null;
  if(jogo.inCheck()) jogo.board().forEach(function(l){ l.forEach(function(c){ if(c && c.type === 'k' && c.color === jogo.turn()) reiXeque = c.square; }); });
  tabEl.innerHTML = '';
  casas.forEach(function(sq, idx){
    var b = document.createElement('button'), p = jogo.get(sq), col = COLUNAS.indexOf(sq[0]), lin = +sq[1];
    b.type = 'button'; b.className = 'casa-j ' + ((col + lin) % 2 === 1 ? 'escura' : 'clara'); // a1 é escura
    b.dataset.sq = sq; b.setAttribute('role','gridcell'); b.tabIndex = sq === focoSq ? 0 : -1;
    if(ultimo && (sq === ultimo.from || sq === ultimo.to)) b.classList.add('ultimo');
    if(sq === selecionada) b.classList.add('selecionada');
    if(alvos[sq]){ b.classList.add('alvo'); if(p) b.classList.add('tem-peca'); }
    if(sq === reiXeque) b.classList.add('xeque');
    if(p){ var s = document.createElement('span'); s.className = 'peca ' + (p.color === 'w' ? 'b' : 'p'); s.textContent = GLIFO[p.type] + '︎'; s.setAttribute('aria-hidden','true'); b.appendChild(s); }
    if(idx % 8 === 0){ var rl = document.createElement('span'); rl.className = 'rot lin'; rl.textContent = lin; rl.setAttribute('aria-hidden','true'); b.appendChild(rl); }
    if(idx >= 56){ var rc = document.createElement('span'); rc.className = 'rot col'; rc.textContent = sq[0]; rc.setAttribute('aria-hidden','true'); b.appendChild(rc); }
    var rotulo = descreverCasa(sq) + (sq === selecionada ? ', selecionada' : '') + (alvos[sq] ? ', destino possível' : '') + (sq === reiXeque ? ', em xeque' : '');
    b.setAttribute('aria-label', rotulo);
    tabEl.appendChild(b);
  });
  tabEl.classList.toggle('pecas-grandes', pref.grandes);
  el('moldura').classList.toggle('mostrar-coord-grandes', pref.grandes);
  tabEl.classList.toggle('contraste', pref.contraste);
  desenharLista();
  el('bt-desfazer').disabled = !hist.length || pensando;
}
function desenharLista(){
  var h = jogo.history(), ol = el('lista-lances'); ol.innerHTML = '';
  for(var i = 0; i < h.length; i += 2){
    var n = document.createElement('li'); n.className = 'n'; n.textContent = (i/2 + 1) + '.'; ol.appendChild(n);
    var a = document.createElement('li'); a.textContent = sanPT(h[i]); ol.appendChild(a);
    var b = document.createElement('li'); b.textContent = h[i+1] ? sanPT(h[i+1]) : ''; ol.appendChild(b);
  }
  ol.scrollTop = ol.scrollHeight;
}
function focar(sq){ focoSq = sq; var b = tabEl.querySelector('[data-sq="' + sq + '"]'); if(b){ tabEl.querySelectorAll('.casa-j').forEach(function(x){ x.tabIndex = -1; }); b.tabIndex = 0; b.focus(); } }

/* ---------- interação ---------- */
function vezDoHumano(){ return !jogo.isGameOver() && !pensando && !pendente && (modo === 'dois' || jogo.turn() === corHumano); }
tabEl.addEventListener('click', function(e){
  var b = e.target.closest('.casa-j'); if(!b) return;
  focoSq = b.dataset.sq; tocarCasa(b.dataset.sq);
});
function tocarCasa(sq){
  if(!partidaIniciada){ status('Escolha como quer jogar e clique em Começar.'); return; }
  if(jogo.isGameOver()){ status(textoFim() + ' Para jogar de novo, clique em Começar.'); return; }
  if(!vezDoHumano()){ if(pendente) status('Confirme ou cancele o lance escolhido.'); return; }
  var p = jogo.get(sq);
  if(selecionada){
    var opcoes = jogo.moves({square:selecionada, verbose:true}).filter(function(m){ return m.to === sq; });
    if(opcoes.length){ escolher(opcoes, false); return; }
  }
  if(p && p.color === jogo.turn()){
    selecionada = sq; desenhar(); focar(sq);
    var n = jogo.moves({square:sq, verbose:true}).length;
    var t = NOME_CAP[p.type] + ' em ' + sq + ' selecionado. ' + (n ? n + (n > 1 ? ' casas possíveis.' : ' casa possível.') : 'Esta peça não tem lance agora.');
    status(t); if(pref.casa || pref.narrar) falar(t);
  } else if(selecionada){
    selecionada = null; desenhar(); focar(sq); status('Seleção cancelada. ' + textoVez());
  }
}
tabEl.addEventListener('keydown', function(e){
  var b = e.target.closest('.casa-j'); if(!b) return;
  var sq = b.dataset.sq, c = COLUNAS.indexOf(sq[0]), l = +sq[1], dc = 0, dl = 0;
  if(e.key === 'ArrowUp') dl = 1; else if(e.key === 'ArrowDown') dl = -1; else if(e.key === 'ArrowLeft') dc = -1; else if(e.key === 'ArrowRight') dc = 1;
  else if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); tocarCasa(sq); return; }
  else if(e.key === 'Escape'){ if(selecionada){ selecionada = null; desenhar(); focar(sq); status('Seleção cancelada.'); } return; }
  else return;
  e.preventDefault();
  if(virado){ dl = -dl; dc = -dc; }
  var nc = Math.max(0, Math.min(7, c + dc)), nl = Math.max(1, Math.min(8, l + dl)), novo = COLUNAS[nc] + nl;
  focar(novo); if(pref.casa) falar(descreverCasa(novo));
});

function escolher(opcoes, forcarConfirmacao){
  // várias opções só acontecem na promoção do peão
  if(opcoes.length > 1 && opcoes[0].promotion){ pedirPromocao(opcoes, forcarConfirmacao); return; }
  var m = opcoes[0];
  if(pref.confirmar || forcarConfirmacao) pedirConfirmacao(m);
  else jogar(m);
}
function pedirPromocao(opcoes, forcar){
  pendente = {promo:opcoes, forcar:forcar};
  el('confirma-texto').textContent = 'O peão chegou ao fim do tabuleiro. Ele vira qual peça?';
  el('confirma-acoes').hidden = true;
  var box = el('promo'); box.hidden = false; box.innerHTML = '';
  ['q','r','b','n'].forEach(function(t){
    var m = opcoes.filter(function(o){ return o.promotion === t; })[0]; if(!m) return;
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'bt amarelo';
    bt.textContent = GLIFO[t] + '︎ ' + NOME_CAP[t];
    bt.addEventListener('click', function(){ fecharConfirma(); if(pref.confirmar || forcar) pedirConfirmacao(m); else jogar(m); });
    box.appendChild(bt);
  });
  el('confirma').classList.add('aberta'); box.querySelector('button').focus();
  falar('O peão chegou ao fim do tabuleiro. Escolha: dama, torre, bispo ou cavalo.');
}
function pedirConfirmacao(m){
  pendente = {lance:m};
  var t = descreverEscolha(m) + '. Confirmar?';
  el('confirma-texto').textContent = t; el('confirma-acoes').hidden = false; el('promo').hidden = true;
  el('confirma').classList.add('aberta'); el('bt-confirmar').focus();
  status(t); falar(t);
}
function fecharConfirma(){ pendente = null; el('confirma').classList.remove('aberta'); el('promo').hidden = true; el('confirma-acoes').hidden = false; }
el('bt-confirmar').addEventListener('click', function(){ var m = pendente && pendente.lance; fecharConfirma(); if(m) jogar(m); });
el('bt-cancelar').addEventListener('click', function(){ fecharConfirma(); selecionada = null; desenhar(); focar(focoSq); status('Lance cancelado. ' + textoVez()); if(pref.narrar) falar('Lance cancelado.'); });

function jogar(m){
  var feito;
  try{ feito = jogo.move({from:m.from, to:m.to, promotion:m.promotion}); }catch(e){ status('Esse lance não é permitido.'); falar('Esse lance não é permitido.'); return; }
  selecionada = null; focoSq = feito.to; desenhar(); focar(feito.to);
  var t = descreverLance(feito);
  if(jogo.isGameOver()){ status(textoFim()); falar(t + (jogo.isCheckmate() ? '' : ' ' + textoFim())); return; }
  status(t + '. ' + textoVez());
  if(pref.narrar) falar(t);
  if(modo === 'maquina' && jogo.turn() !== corHumano) vezDaMaquina();
}

/* ---------- computador ---------- */
var motor = null, pedidoId = 0;
function iniciarMotor(){
  if(motor) return;
  try{ motor = new Worker(new URL('./motor.js', import.meta.url), {type:'module'}); }
  catch(e){ motor = null; }
  if(motor) motor.onmessage = function(e){
    if(e.data.id !== pedidoId) return; // resposta de uma partida antiga
    pensando = false;
    if(!e.data.lance) return;
    var feito = jogo.move(e.data.lance); focoSq = feito.to;
    desenhar(); focar(feito.to);
    var t = descreverLance(feito);
    status(jogo.isGameOver() ? textoFim() : t + '. ' + textoVez());
    if(pref.narrar || jogo.isGameOver()) falar(jogo.isGameOver() && !jogo.isCheckmate() ? t + ' ' + textoFim() : t);
  };
}
function vezDaMaquina(){
  iniciarMotor();
  if(!motor){ status('Não foi possível ligar o computador neste navegador. Jogue no modo duas pessoas.'); return; }
  pensando = true; desenhar(); focar(focoSq);
  pedidoId++;
  var id = pedidoId, fen = jogo.fen();
  setTimeout(function(){ if(id === pedidoId) motor.postMessage({id:id, fen:fen, nivel:nivel}); }, 350);
}

/* ---------- escrever ou falar o lance ---------- */
var NUM = {um:'1', uma:'1', dois:'2', duas:'2', tres:'3', quatro:'4', cinco:'5', seis:'6', sete:'7', oito:'8'};
var LETRA = {a:'a', ah:'a', be:'b', bee:'b', ce:'c', se:'c', de:'d', e:'e', eh:'e', efe:'f', fe:'f', ge:'g', je:'g', gue:'g', aga:'h', aca:'h', ha:'h'};
var PECA = {rei:'k', dama:'q', rainha:'q', torre:'r', bispo:'b', cavalo:'n', peao:'p'};
function semAcento(t){ return t.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function interpretar(texto){
  var bruto = texto.trim(); if(!bruto) return {erro:'Escreva ou fale um lance.'};
  var legais = jogo.moves({verbose:true});
  // 1) notação de xadrez em português ou inglês (Cf3, e4, Dxd5, O-O, Nf3)
  var san = bruto.replace(/0/g, 'O').replace(/\s+/g, '');
  var sanEN = san.replace(/^([RDTBC])/, function(l){ return {R:'K', D:'Q', T:'R', B:'B', C:'N'}[l]; }).replace(/=([DTBC])/, function(x, l){ return '=' + {D:'Q', T:'R', B:'B', C:'N'}[l]; });
  var porSan = legais.filter(function(m){ var s = m.san.replace(/[+#]/g, ''); return s === sanEN.replace(/[+#]/g, '') || s === san.replace(/[+#]/g, ''); });
  if(porSan.length === 1) return {opcoes:porSan};
  // 2) frase falada ou escrita: "cavalo f3", "peão e quatro", "e2 e4", "roque pequeno"
  var t = semAcento(bruto.toLowerCase()).replace(/[^a-z0-9 ]/g, ' ').replace(/([a-h][1-8])(?=[a-h][1-8])/g, '$1 ');
  if(/roque/.test(t)){
    var grande = /grande|longo|dama/.test(t);
    var r = legais.filter(function(m){ return grande ? m.san.indexOf('O-O-O') === 0 : (m.san.indexOf('O-O') === 0 && m.san.indexOf('O-O-O') !== 0); });
    return r.length ? {opcoes:r} : {erro:'O roque ' + (grande ? 'grande' : 'pequeno') + ' não é possível agora.'};
  }
  var tokens = t.split(/\s+/).filter(Boolean).map(function(w){ return NUM[w] || w; });
  var peca = null, promo = null;
  tokens.forEach(function(w, i){ if(PECA[w]){ if(i > 0 && /^(promove|vira|para|em|a)$/.test(tokens[i-1]) && peca) promo = PECA[w]; else if(!peca) peca = PECA[w]; else promo = PECA[w]; } });
  // junta letra e número: "e 4", "efe 3", "e4"
  var compacto = tokens.map(function(w){ return /^[1-8]$/.test(w) ? w : (LETRA[w] || (/^[a-h][1-8]$/.test(w) ? w : (/^[a-h]$/.test(w) ? w : ' '))); }).join(' ');
  var casas = []; compacto.replace(/([a-h])\s?([1-8])/g, function(x, c, l){ casas.push(c + l); return x; });
  if(!casas.length) return {erro:'Não entendi a casa de destino. Exemplo: "cavalo f3" ou "e2 e4".'};
  var de = casas.length > 1 ? casas[0] : null, para = casas[casas.length - 1];
  var opcoes = legais.filter(function(m){ return m.to === para && (!de || m.from === de) && (!peca || m.piece === peca); });
  if(promo) opcoes = opcoes.filter(function(m){ return !m.promotion || m.promotion === promo; });
  if(!opcoes.length) return {erro:'Não há lance possível para ' + (peca ? NOME[peca] + ' ' : '') + 'em ' + para + '.'};
  var origens = {}; opcoes.forEach(function(m){ origens[m.from] = true; });
  if(Object.keys(origens).length > 1) return {erro:'Mais de uma peça pode ir para ' + para + ' (' + Object.keys(origens).join(' e ') + '). Diga também a casa de saída, por exemplo: ' + Object.keys(origens)[0] + ' ' + para + '.'};
  return {opcoes:opcoes};
}
function usarTexto(texto, falado){
  if(!partidaIniciada){ status('Escolha como quer jogar e clique em Começar.'); return; }
  if(jogo.isGameOver()){ status(textoFim() + ' Para jogar de novo, clique em Começar.'); return; }
  if(!vezDoHumano()){ status(pendente ? 'Confirme ou cancele o lance escolhido.' : 'Aguarde a sua vez.'); return; }
  var r = interpretar(texto);
  if(r.erro){ status(r.erro); falar(r.erro); return; }
  el('entrada-lance').value = '';
  escolher(r.opcoes, falado);
}
el('form-lance').addEventListener('submit', function(e){ e.preventDefault(); usarTexto(el('entrada-lance').value, false); });
var Reconhecer = window.SpeechRecognition || window.webkitSpeechRecognition;
el('bt-voz').addEventListener('click', function(){
  if(!Reconhecer){ var m = 'Este navegador não reconhece voz. No computador, use o Google Chrome ou o Microsoft Edge; ou escreva o lance.'; status(m); falar(m); return; }
  var rec = new Reconhecer(); rec.lang = 'pt-BR'; rec.interimResults = false; rec.maxAlternatives = 3;
  var bt = el('bt-voz'); bt.classList.add('amarelo'); status('Pode falar o lance…');
  rec.onresult = function(e){
    var alts = [].slice.call(e.results[0]).map(function(a){ return a.transcript; }), usado = null;
    for(var i = 0; i < alts.length; i++){ if(!interpretar(alts[i]).erro){ usado = alts[i]; break; } }
    el('entrada-lance').value = usado || alts[0];
    usarTexto(usado || alts[0], true);
  };
  rec.onerror = function(e){ status(e.error === 'not-allowed' ? 'O microfone não foi autorizado.' : 'Não consegui ouvir. Tente de novo ou escreva o lance.'); };
  rec.onend = function(){ bt.classList.remove('amarelo'); };
  try{ rec.start(); }catch(e){ bt.classList.remove('amarelo'); }
});

/* ---------- botões e preferências ---------- */
function novaPartida(){
  var f = el('form-config');
  modo = f.modo.value; nivel = +f.nivel.value;
  var c = f.cor.value; corHumano = c === 's' ? (Math.random() < .5 ? 'w' : 'b') : c;
  pref.modo = modo; pref.nivel = nivel; pref.cor = c; salvarPref();
  pedidoId++; pensando = false; fecharConfirma();
  jogo.reset(); selecionada = null; partidaIniciada = true;
  virado = modo === 'maquina' && corHumano === 'b';
  focoSq = virado ? 'e7' : 'e2';
  desenhar(); focar(focoSq);
  var t = modo === 'maquina' ? 'Nova partida contra o computador, nível ' + nivel + '. Você joga com as ' + COR[corHumano] + '.' : 'Nova partida entre duas pessoas. As brancas começam.';
  status(t + ' ' + textoVez()); falar(t);
  if(modo === 'maquina' && corHumano === 'b') vezDaMaquina();
}
el('form-config').addEventListener('submit', function(e){ e.preventDefault(); novaPartida(); });
el('form-config').addEventListener('change', function(){ var maq = el('form-config').modo.value === 'maquina'; el('grupo-nivel').hidden = !maq; el('grupo-cor').hidden = !maq; });
el('bt-nova').addEventListener('click', function(){ el('cartao-config').scrollIntoView({behavior:'smooth', block:'center'}); el('form-config').querySelector('input:checked').focus(); });
el('bt-desfazer').addEventListener('click', function(){
  if(pensando) return; fecharConfirma();
  var volta = modo === 'maquina' && jogo.turn() === corHumano ? 2 : 1;
  for(var i = 0; i < volta; i++) jogo.undo();
  selecionada = null; desenhar(); focar(focoSq);
  var t = 'Lance desfeito. ' + textoVez(); status(t); if(pref.narrar) falar(t);
});
el('bt-virar').addEventListener('click', function(){ virado = !virado; desenhar(); focar(focoSq); status('Tabuleiro virado: ' + (virado ? 'pretas' : 'brancas') + ' embaixo.'); });
el('bt-ler').addEventListener('click', lerTabuleiro);
el('bt-ultimo').addEventListener('click', function(){
  var h = jogo.history({verbose:true}); if(!h.length){ status('Nenhum lance ainda.'); falar('Nenhum lance ainda.'); return; }
  var m = h[h.length - 1], t = 'Último lance: ' + (m.color === 'w' ? 'brancas' : 'pretas') + ', ' + descreverEscolha(m) + '.'; status(t); falar(t);
});
[['op-narrar','narrar'],['op-confirmar','confirmar'],['op-casa','casa'],['op-grandes','grandes'],['op-contraste','contraste']].forEach(function(par){
  var c = el(par[0]); c.checked = !!pref[par[1]];
  c.addEventListener('change', function(){ pref[par[1]] = c.checked; salvarPref(); desenhar(); });
});

/* ---------- início ---------- */
(function(){
  var f = el('form-config');
  [].forEach.call(f.modo, function(r){ r.checked = r.value === pref.modo; });
  [].forEach.call(f.nivel, function(r){ r.checked = +r.value === +pref.nivel; });
  [].forEach.call(f.cor, function(r){ r.checked = r.value === pref.cor; });
  f.dispatchEvent(new Event('change'));
  // abrir uma posição pelo endereço: jogar.html?fen=... (para aulas e exercícios), sempre entre duas pessoas
  var fen = new URLSearchParams(location.search).get('fen');
  if(fen){
    try{ jogo.load(fen); modo = 'dois'; partidaIniciada = true; virado = jogo.turn() === 'b'; desenhar(); status('Posição carregada. ' + textoVez()); return; }
    catch(e){ jogo.reset(); }
  }
  desenhar();
  status('Escolha como quer jogar e clique em Começar. Depois, clique nas peças ou use as setas e o Enter.');
})();
