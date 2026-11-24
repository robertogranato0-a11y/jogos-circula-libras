/* Desenha diagramas de xadrez a partir de uma posição FEN.
   Uso: <figure class="diagrama" data-fen="6rk/5Npp/8/8/8/8/8/6K1" data-destaque="f7 h8" data-descricao="..."></figure>
   Cada diagrama ganha uma descrição em texto para leitores de tela. */
(function(){
  var GLIFO = {k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟'};
  var NOME = {k:'rei', q:'dama', r:'torre', b:'bispo', n:'cavalo', p:'peão'};
  var COLUNAS = 'abcdefgh';
  function desenhar(fig){
    var linhas = fig.dataset.fen.split(' ')[0].split('/');
    var destaque = (fig.dataset.destaque || '').split(/\s+/);
    var tab = document.createElement('div'); tab.className = 'tab'; tab.setAttribute('role','img');
    var brancas = [], pretas = [];
    linhas.forEach(function(linha, i){
      var col = 0;
      for(var c = 0; c < linha.length; c++){
        var ch = linha[c];
        if(/\d/.test(ch)){ for(var v = 0; v < +ch; v++){ tab.appendChild(casa(i, col)); col++; } continue; }
        var el = casa(i, col), tipo = ch.toLowerCase(), cor = ch === tipo ? 'p' : 'b';
        var s = document.createElement('span'); s.className = 'peca ' + cor; s.textContent = GLIFO[tipo] + '︎'; s.setAttribute('aria-hidden','true');
        el.appendChild(s); tab.appendChild(el);
        (cor === 'b' ? brancas : pretas).push(NOME[tipo] + ' em ' + COLUNAS[col] + (8 - i));
        col++;
      }
    });
    function casa(i, col){
      var d = document.createElement('div'), nome = COLUNAS[col] + (8 - i);
      d.className = 'casa ' + ((i + col) % 2 ? 'escura' : 'clara') + (destaque.indexOf(nome) > -1 ? ' destaque' : '');
      return d;
    }
    tab.setAttribute('aria-label', 'Diagrama. Brancas: ' + (brancas.join(', ') || 'nenhuma peça') + '. Pretas: ' + (pretas.join(', ') || 'nenhuma peça') + '.' + (fig.dataset.descricao ? ' ' + fig.dataset.descricao : ''));
    var coord = document.createElement('div'); coord.className = 'coord'; coord.setAttribute('aria-hidden','true');
    COLUNAS.split('').forEach(function(l){ var s = document.createElement('span'); s.textContent = l; coord.appendChild(s); });
    fig.insertBefore(coord, fig.firstChild); fig.insertBefore(tab, fig.firstChild);
  }
  function tudo(){ document.querySelectorAll('.diagrama[data-fen]').forEach(function(f){ if(!f.querySelector('.tab')) desenhar(f); }); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tudo); else tudo();
  window.desenharDiagramas = tudo;
})();
