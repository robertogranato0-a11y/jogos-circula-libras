/* Motor de xadrez do Circula Xadrez Acessível (código próprio).
   Roda em um Web Worker para a tela não travar. Usa a chess.js para as regras.
   Níveis: 1 aleatório com preferência por capturas, 2 a 5 busca alfa-beta com profundidade crescente. */
import { Chess } from './lib/chess.js';

var VALOR = {p:100, n:320, b:330, r:500, q:900, k:0};
// tabelas de posição (do ponto de vista das brancas, linha 0 = 8ª fileira)
var TAB = {
  p:[0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n:[-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b:[-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r:[0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q:[-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k:[-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
};
var MATE = 100000;

function avaliar(jogo){
  // pontuação do ponto de vista de quem joga agora
  var t = 0, b = jogo.board();
  for(var i = 0; i < 8; i++) for(var j = 0; j < 8; j++){
    var c = b[i][j]; if(!c) continue;
    var idx = c.color === 'w' ? i*8 + j : (7-i)*8 + j;
    var v = VALOR[c.type] + TAB[c.type][idx];
    t += c.color === 'w' ? v : -v;
  }
  return jogo.turn() === 'w' ? t : -t;
}
function ordenar(lances){
  return lances.sort(function(a, b){
    var va = (a.captured ? 10*VALOR[a.captured] - VALOR[a.piece] : 0) + (a.promotion ? 800 : 0);
    var vb = (b.captured ? 10*VALOR[b.captured] - VALOR[b.piece] : 0) + (b.promotion ? 800 : 0);
    return vb - va;
  });
}
var prazo = 0, nos = 0;
function tempoAcabou(){ if((++nos & 63) === 0 && Date.now() > prazo) throw 'tempo'; }

function quiescencia(jogo, alfa, beta, prof){
  tempoAcabou();
  var parado = avaliar(jogo);
  if(prof === 0) return parado;
  if(parado >= beta) return beta;
  if(parado > alfa) alfa = parado;
  var caps = ordenar(jogo.moves({verbose:true}).filter(function(m){ return m.captured || m.promotion; }));
  for(var i = 0; i < caps.length; i++){
    jogo.move(caps[i]);
    var s = -quiescencia(jogo, -beta, -alfa, prof - 1);
    jogo.undo();
    if(s >= beta) return beta;
    if(s > alfa) alfa = s;
  }
  return alfa;
}
function busca(jogo, prof, alfa, beta, ply, qprof){
  tempoAcabou();
  if(jogo.isCheckmate()) return -MATE + ply;
  if(jogo.isDraw() || jogo.isStalemate() || jogo.isThreefoldRepetition()) return 0;
  if(prof === 0) return qprof ? quiescencia(jogo, alfa, beta, qprof) : avaliar(jogo);
  var lances = ordenar(jogo.moves({verbose:true}));
  for(var i = 0; i < lances.length; i++){
    jogo.move(lances[i]);
    var s = -busca(jogo, prof - 1, -beta, -alfa, ply + 1, qprof);
    jogo.undo();
    if(s >= beta) return beta;
    if(s > alfa) alfa = s;
  }
  return alfa;
}
function raiz(jogo, prof, ruido, qprof){
  var lances = ordenar(jogo.moves({verbose:true})), melhor = null, melhorNota = -Infinity;
  for(var i = 0; i < lances.length; i++){
    jogo.move(lances[i]);
    var s = -busca(jogo, prof - 1, -MATE*2, MATE*2, 1, qprof) + (ruido ? (Math.random()*2 - 1) * ruido : 0);
    jogo.undo();
    if(s > melhorNota){ melhorNota = s; melhor = lances[i]; }
  }
  return melhor ? {lance:melhor, nota:melhorNota} : null;
}
var NIVEIS = {
  2:{prof:1, ruido:70, q:0, ms:1500},
  3:{prof:2, ruido:25, q:2, ms:2500},
  4:{prof:3, ruido:8, q:3, ms:2500},
  5:{prof:4, ruido:0, q:4, ms:4000}
};
function escolher(fen, nivel){
  var jogo = new Chess(fen), lances = jogo.moves({verbose:true});
  if(!lances.length) return null;
  if(nivel <= 1){
    var caps = lances.filter(function(m){ return m.captured; });
    if(caps.length && Math.random() < .5) return ordenar(caps)[0];
    return lances[Math.floor(Math.random() * lances.length)];
  }
  var cfg = NIVEIS[nivel] || NIVEIS[3], melhor = lances[0];
  prazo = Date.now() + cfg.ms; nos = 0;
  // aprofundamento iterativo: guarda o melhor lance da última profundidade completa
  for(var p = 1; p <= cfg.prof; p++){
    try{ var r = raiz(jogo, p, cfg.ruido, cfg.q); if(r){ melhor = r.lance; if(r.nota > MATE/2) break; } }catch(e){ if(e === 'tempo') break; throw e; }
  }
  return melhor;
}
self.onmessage = function(e){
  var d = e.data, m = escolher(d.fen, d.nivel);
  self.postMessage({id:d.id, lance: m ? {from:m.from, to:m.to, promotion:m.promotion} : null});
};
