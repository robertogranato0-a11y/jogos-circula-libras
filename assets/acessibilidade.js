/* Painel de acessibilidade do Instituto Circula Libras
   Código próprio. Funciona sem servidor: as escolhas ficam salvas só no navegador da pessoa.
   Atalho: Alt + A abre e fecha o painel. */
(function(){
  'use strict';
  var CHAVE = 'cla-acessibilidade-v1';
  var raiz = document.documentElement;
  var falaOk = 'speechSynthesis' in window;
  // pasta dos arquivos do painel (funciona na página inicial e nas subpastas, como /xadrez/)
  var BASE = ((document.currentScript && document.currentScript.src) || 'assets/acessibilidade.js').replace(/acessibilidade.js[^/]*$/, '');

  var PADRAO = {perfis:[], tam:0, lh:0, ls:0, ws:0, fonte:false, esquerda:false, contraste:'', cor:'', dalt:'',
    links:false, titulos:false, cursor:false, guia:false, mascara:false, pausa:false, semImg:false, teclado:false,
    leitor:false, velocidade:1};
  var TAMANHOS = [1, 1.15, 1.3, 1.5, 1.75];
  var LH = [0, 1.8, 2.2], LS = [0, .06, .12], WS = [0, .16, .32];

  var PERFIS = {
    cego:      {nome:'Pessoa cega', icone:'eye-closed', ajustes:{leitor:true, teclado:true}},
    baixa:     {nome:'Baixa visão', icone:'magnifying-glass-plus', ajustes:{tam:2, lh:1, fonte:true, links:true, titulos:true, cursor:true}},
    motor:     {nome:'Habilidade motora', icone:'hand-pointing', ajustes:{teclado:true, cursor:true, pausa:true}},
    dalt:      {nome:'Daltonismo', icone:'palette', ajustes:{dalt:'deutan', links:true}},
    epilepsia: {nome:'Epilepsia', icone:'lightning-slash', ajustes:{pausa:true, cor:'baixa'}},
    tdah:      {nome:'TDAH', icone:'brain', ajustes:{mascara:true, pausa:true, titulos:true}},
    dislexia:  {nome:'Dislexia', icone:'book-open-text', ajustes:{fonte:true, lh:1, ls:1, ws:1, esquerda:true}}
  };

  var est = carregar();
  function carregar(){
    var s = {};
    try{ s = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; }catch(e){}
    var o = {}; for(var k in PADRAO){ o[k] = (k in s) ? s[k] : (Array.isArray(PADRAO[k]) ? [] : PADRAO[k]); }
    return o;
  }
  function salvar(){ try{ localStorage.setItem(CHAVE, JSON.stringify(est)); }catch(e){} }

  /* ---------- montar o painel ---------- */
  var SIMBOLO = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><circle cx="16" cy="5.5" r="3.2"/><path d="M5 10.2c-.9-.2-1.6.4-1.7 1.2-.1.8.4 1.5 1.2 1.7l7.3 1.6v4.6l-2.6 8.2c-.3.8.2 1.7 1 2 .8.3 1.7-.2 2-1l2.8-7.9h2l2.8 7.9c.3.8 1.2 1.3 2 1 .8-.3 1.3-1.2 1-2l-2.6-8.2v-4.6l7.3-1.6c.8-.2 1.3-.9 1.2-1.7-.1-.8-.8-1.4-1.7-1.2-3.6.7-7.2 1.2-11 1.2S8.6 10.9 5 10.2z"/></svg>';
  function cartao(id, icone, nome, extra){
    return '<button type="button" class="cla-cartao" data-acao="'+id+'" aria-pressed="false"><i class="ph ph-'+icone+'" aria-hidden="true"></i><span>'+nome+(extra?'<small>'+extra+'</small>':'')+'</span></button>';
  }
  function ajuste(id, nome, dica){
    return '<div class="cla-ajuste"><div><span id="cla-r-'+id+'">'+nome+'</span><small>'+dica+'</small></div>'+
      '<div class="cla-passos" role="group" aria-labelledby="cla-r-'+id+'"><button type="button" data-passo="'+id+'" data-dir="-1" aria-label="Diminuir '+nome.toLowerCase()+'"><i class="ph ph-minus" aria-hidden="true"></i></button>'+
      '<output id="cla-v-'+id+'" aria-live="polite">Normal</output>'+
      '<button type="button" data-passo="'+id+'" data-dir="1" aria-label="Aumentar '+nome.toLowerCase()+'"><i class="ph ph-plus" aria-hidden="true"></i></button></div></div>';
  }
  var perfisHtml = Object.keys(PERFIS).map(function(k){ return cartao('perfil:'+k, PERFIS[k].icone, PERFIS[k].nome); }).join('');

  var caixa = document.createElement('div');
  caixa.id = 'cla';
  caixa.innerHTML =
    '<div class="cla-lancador" id="cla-lancador">'+
      '<div class="cla-rapido" id="cla-rapido">'+
        '<button type="button" data-rapido="painel">Acessibilidade <kbd>Alt+A</kbd><i class="ph ph-sliders-horizontal" aria-hidden="true"></i></button>'+
        '<button type="button" data-rapido="libras">Libras<i class="ph ph-hand-waving" aria-hidden="true"></i></button>'+
        '<button type="button" data-rapido="face">Navegação por face<i class="ph ph-smiley" aria-hidden="true"></i></button>'+
      '</div>'+
      '<button type="button" class="cla-botao" id="cla-botao" aria-expanded="false" aria-controls="cla-rapido" aria-label="Opções de acessibilidade">'+SIMBOLO+'</button>'+
    '</div>'+
    '<section class="cla-painel" id="cla-painel" role="dialog" aria-modal="false" aria-labelledby="cla-titulo" tabindex="-1">'+
      '<div class="cla-topo"><img src="'+BASE+'mao-branca.png" alt=""><h2 id="cla-titulo">Acessibilidade</h2><button type="button" data-acao="fechar">Fechar</button></div>'+
      '<div class="cla-barra"><button type="button" data-acao="restaurar"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i> Restaurar tudo</button><button type="button" data-rapido="libras"><i class="ph ph-hand-waving" aria-hidden="true"></i> Traduzir em Libras</button></div>'+
      '<div class="cla-corpo">'+
        '<div class="cla-secao"><h3><i class="ph ph-user-focus" aria-hidden="true"></i>Perfis de acessibilidade</h3><div class="cla-grade">'+perfisHtml+'</div>'+
          '<p class="cla-nota">Cada perfil liga um conjunto de ajustes. Você pode combinar perfis e mudar os ajustes abaixo.</p></div>'+
        '<div class="cla-secao"><h3><i class="ph ph-text-aa" aria-hidden="true"></i>Ajustes de texto</h3>'+
          ajuste('tam','Tamanho do texto','Aumenta as letras do site')+
          ajuste('lh','Espaço entre linhas','Mais ar entre as linhas')+
          ajuste('ls','Espaço entre letras','Letras mais separadas')+
          ajuste('ws','Espaço entre palavras','Palavras mais separadas')+
          '<div class="cla-grade">'+cartao('fonte','text-t','Fonte legível')+cartao('esquerda','text-align-left','Alinhar à esquerda')+cartao('titulos','text-h','Destacar títulos')+'</div></div>'+
        '<div class="cla-secao"><h3><i class="ph ph-drop" aria-hidden="true"></i>Ajustes de cor</h3><div class="cla-grade">'+
          cartao('contraste:escuro','moon','Contraste escuro')+cartao('contraste:claro','sun','Contraste claro')+cartao('cor:mono','circle-half','Monocromático')+
          cartao('cor:baixa','drop','Pouca saturação')+cartao('cor:alta','palette','Muita saturação')+cartao('links','link','Destacar links')+
          cartao('dalt:protan','eye','Daltonismo','vermelho (protan)')+cartao('dalt:deutan','eye','Daltonismo','verde (deutan)')+cartao('dalt:tritan','eye','Daltonismo','azul (tritan)')+
        '</div><p class="cla-nota">Os ajustes para daltonismo realçam as diferenças entre as cores. São aproximados e podem não servir para todas as pessoas.</p></div>'+
        '<div class="cla-secao"><h3><i class="ph ph-compass" aria-hidden="true"></i>Navegação</h3><div class="cla-grade">'+
          cartao('face','smiley','Navegação por face','câmera')+cartao('teclado','keyboard','Navegação pelo teclado','setas')+cartao('cursor','cursor','Cursor grande')+
          cartao('guia','ruler','Guia de leitura')+cartao('mascara','frame-corners','Máscara de leitura')+cartao('pausa','pause-circle','Parar animações')+
          cartao('semImg','image','Esconder imagens')+
        '</div><p class="cla-nota" id="cla-nota-teclado"><b>Pelo teclado:</b> com a navegação ligada, as setas ↓ e ↑ pulam entre títulos, links e botões; Enter abre; Esc fecha este painel.</p></div>'+
        '<div class="cla-secao"><h3><i class="ph ph-speaker-high" aria-hidden="true"></i>Som</h3><div class="cla-grade">'+cartao('leitor','speaker-high','Leitor de texto','clique e ouça')+'</div>'+
          '<div class="cla-leitor"><button type="button" data-acao="ler"><i class="ph ph-play" aria-hidden="true"></i> Ler a página</button><button type="button" data-acao="parar"><i class="ph ph-stop" aria-hidden="true"></i> Parar</button>'+
          '<label>Velocidade <input type="range" id="cla-velocidade" min="0.6" max="1.6" step="0.1" aria-label="Velocidade da leitura"></label></div>'+
          '<p class="cla-nota">Com o leitor ligado, clique em qualquer texto para ouvir. Quem usa leitor de tela no computador ou no celular (NVDA, VoiceOver, TalkBack) pode continuar com ele: o site também funciona com eles.</p></div>'+
      '</div>'+
      '<div class="cla-rodape">Ajustes do Instituto Circula Libras. Suas escolhas ficam salvas só neste aparelho.</div>'+
    '</section>'+
    '<div class="cla-guia" id="cla-guia" aria-hidden="true"></div>'+
    '<div class="cla-mascara" id="cla-masc-cima" aria-hidden="true"></div><div class="cla-mascara" id="cla-masc-baixo" aria-hidden="true"></div>'+
    '<div class="cla-mira" id="cla-mira" aria-hidden="true"></div>'+
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'+
      '<filter id="cla-f-protan"><feColorMatrix type="matrix" values=""/></filter>'+
      '<filter id="cla-f-deutan"><feColorMatrix type="matrix" values=""/></filter>'+
      '<filter id="cla-f-tritan"><feColorMatrix type="matrix" values=""/></filter>'+
    '</defs></svg>'+
    '<div aria-live="polite" class="cla-anuncio" id="cla-anuncio" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>';
  document.body.appendChild(caixa);

  var painel = document.getElementById('cla-painel');
  var lancador = document.getElementById('cla-lancador');
  var botao = document.getElementById('cla-botao');
  var estiloDinamico = document.createElement('style'); estiloDinamico.id = 'cla-dinamico';
  document.head.appendChild(estiloDinamico);

  /* ---------- daltonismo: realce das cores (método de daltonização) ---------- */
  // matrizes de simulação em RGB e matriz que desloca o erro para canais que a pessoa enxerga
  var SIM = {
    protan:[[.567,.433,0],[.558,.442,0],[0,.242,.758]],
    deutan:[[.625,.375,0],[.7,.3,0],[0,.3,.7]],
    tritan:[[.95,.05,0],[0,.433,.567],[0,.475,.525]]
  };
  var DESLOCA = [[0,0,0],[.7,1,0],[.7,0,1]];
  function mult(a,b){ var r=[[0,0,0],[0,0,0],[0,0,0]]; for(var i=0;i<3;i++)for(var j=0;j<3;j++)for(var k=0;k<3;k++) r[i][j]+=a[i][k]*b[k][j]; return r; }
  Object.keys(SIM).forEach(function(t){
    var s = SIM[t], dif = [[1-s[0][0],-s[0][1],-s[0][2]],[-s[1][0],1-s[1][1],-s[1][2]],[-s[2][0],-s[2][1],1-s[2][2]]];
    var e = mult(DESLOCA, dif), m = [[1+e[0][0],e[0][1],e[0][2]],[e[1][0],1+e[1][1],e[1][2]],[e[2][0],e[2][1],1+e[2][2]]];
    var v = m.map(function(l){ return l.map(function(x){ return x.toFixed(4); }).join(' ')+' 0 0'; }).join(' ')+' 0 0 0 1 0';
    document.querySelector('#cla-f-'+t+' feColorMatrix').setAttribute('values', v);
  });

  /* ---------- aplicar ---------- */
  var SEL_TEXTO = 'h1,h2,h3,h4,h5,h6,p,li,a,span,dt,dd,label,button,small,strong,b,em,figcaption,code,blockquote,td,th,output';
  function foraDoPainel(el){ return !el.closest('#cla') && !el.closest('[vw]') && !el.closest('#vlibras-access-wrapper'); }
  function aplicarTamanho(){
    var f = TAMANHOS[est.tam] || 1;
    document.querySelectorAll(SEL_TEXTO).forEach(function(el){
      if(!foraDoPainel(el)) return;
      if(f === 1){ if(el.dataset.claFs){ el.style.fontSize = ''; delete el.dataset.claFs; } return; }
      if(!el.dataset.claFs) el.dataset.claFs = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (el.dataset.claFs * f).toFixed(1) + 'px';
    });
  }
  var fonteCarregada = false;
  function carregarFonte(){
    if(fonteCarregada) return; fonteCarregada = true;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
    document.head.appendChild(l);
  }
  function aplicar(){
    var c = raiz.classList;
    c.toggle('cla-lh', est.lh > 0); raiz.style.setProperty('--cla-lh', LH[est.lh] || '');
    c.toggle('cla-ls', est.ls > 0); raiz.style.setProperty('--cla-ls', (LS[est.ls] || 0) + 'em');
    c.toggle('cla-ws', est.ws > 0); raiz.style.setProperty('--cla-ws', (WS[est.ws] || 0) + 'em');
    c.toggle('cla-fonte', est.fonte); if(est.fonte) carregarFonte();
    c.toggle('cla-esquerda', est.esquerda);
    c.toggle('cla-escuro', est.contraste === 'escuro');
    c.toggle('cla-claro', est.contraste === 'claro');
    ['links','titulos','cursor','guia','mascara','pausa','teclado'].forEach(function(k){ c.toggle('cla-'+k, !!est[k]); });
    c.toggle('cla-sem-img', est.semImg);
    // filtros de cor: aplicados a cada bloco do site, nunca ao painel
    var f = [];
    if(est.cor === 'mono') f.push('grayscale(1)');
    if(est.cor === 'baixa') f.push('saturate(.45)');
    if(est.cor === 'alta') f.push('saturate(1.8)');
    if(est.dalt) f.push('url(#cla-f-'+est.dalt+')');
    estiloDinamico.textContent = f.length ? 'body > :not(#cla):not([vw]):not(#vlibras-access-wrapper):not(script):not(style){filter:'+f.join(' ')+'!important}' : '';
    aplicarTamanho();
    atualizarBotoes();
    salvar();
  }

  function atualizarBotoes(){
    painel.querySelectorAll('[data-acao]').forEach(function(b){
      var a = b.dataset.acao, ligado = null;
      if(a.indexOf('perfil:') === 0) ligado = est.perfis.indexOf(a.slice(7)) > -1;
      else if(a.indexOf(':') > -1){ var p = a.split(':'); ligado = est[p[0]] === p[1]; }
      else if(a === 'face') ligado = !!face.ativo;
      else if(a in PADRAO && typeof PADRAO[a] === 'boolean') ligado = !!est[a];
      if(ligado !== null) b.setAttribute('aria-pressed', ligado ? 'true' : 'false');
    });
    var rot = {tam: TAMANHOS.map(function(x){ return x === 1 ? 'Normal' : Math.round(x*100)+'%'; }), lh:['Normal','Médio','Grande'], ls:['Normal','Médio','Grande'], ws:['Normal','Médio','Grande']};
    Object.keys(rot).forEach(function(k){ document.getElementById('cla-v-'+k).textContent = rot[k][est[k]]; });
    document.getElementById('cla-velocidade').value = est.velocidade;
  }

  function anunciar(t){ var a = document.getElementById('cla-anuncio'); a.textContent = ''; setTimeout(function(){ a.textContent = t; }, 50); }
  function aviso(t){
    var v = document.createElement('div'); v.className = 'cla-aviso'; v.setAttribute('role','status'); v.textContent = t;
    caixa.appendChild(v); setTimeout(function(){ v.remove(); }, 4000);
  }

  /* ---------- ações ---------- */
  function alternarPerfil(id){
    var p = PERFIS[id], i = est.perfis.indexOf(id);
    if(i > -1){
      est.perfis.splice(i,1);
      Object.keys(p.ajustes).forEach(function(k){ est[k] = Array.isArray(PADRAO[k]) ? [] : PADRAO[k]; });
      // reaplica os outros perfis que continuam ligados
      est.perfis.forEach(function(o){ Object.keys(PERFIS[o].ajustes).forEach(function(k){ est[k] = PERFIS[o].ajustes[k]; }); });
      anunciar('Perfil '+p.nome+' desligado');
    } else {
      est.perfis.push(id);
      Object.keys(p.ajustes).forEach(function(k){ est[k] = p.ajustes[k]; });
      anunciar('Perfil '+p.nome+' ligado');
      if(id === 'cego') falar('Leitor ligado. Use a tecla Tab ou as setas para navegar. Cada item será lido em voz alta. Para ouvir a página inteira, use o botão Ler a página.');
    }
    if(est.leitor) ligarLeitor(); else desligarLeitor();
    aplicar();
  }
  function executar(acao){
    if(acao === 'fechar') return fecharPainel();
    if(acao === 'restaurar'){
      pararFala(); if(face.ativo) pararFace();
      est = JSON.parse(JSON.stringify(PADRAO)); desligarLeitor(); aplicar(); anunciar('Ajustes restaurados'); return;
    }
    if(acao === 'ler') return lerPagina();
    if(acao === 'parar') return pararFala();
    if(acao === 'face') return face.ativo ? pararFace() : iniciarFace();
    if(acao.indexOf('perfil:') === 0) return alternarPerfil(acao.slice(7));
    if(acao.indexOf(':') > -1){ var p = acao.split(':'); est[p[0]] = est[p[0]] === p[1] ? '' : p[1]; aplicar(); return; }
    if(acao in PADRAO){
      est[acao] = !est[acao];
      if(acao === 'leitor'){ est.leitor ? ligarLeitor() : desligarLeitor(); }
      aplicar();
    }
  }
  painel.addEventListener('click', function(e){
    var b = e.target.closest('[data-acao]'); if(b) executar(b.dataset.acao);
    var s = e.target.closest('[data-passo]');
    if(s){ var k = s.dataset.passo, max = k === 'tam' ? TAMANHOS.length-1 : 2; est[k] = Math.max(0, Math.min(max, est[k] + (+s.dataset.dir))); aplicar(); }
  });
  document.getElementById('cla-velocidade').addEventListener('input', function(){ est.velocidade = +this.value; salvar(); });

  /* ---------- abrir e fechar ---------- */
  var ultimoFoco = null;
  function abrirPainel(){ ultimoFoco = document.activeElement; fecharRapido(); painel.classList.add('aberto'); raiz.classList.add('cla-painel-aberto'); setTimeout(function(){ painel.focus(); }, 50); }
  function fecharPainel(){ painel.classList.remove('aberto'); raiz.classList.remove('cla-painel-aberto'); if(ultimoFoco && ultimoFoco.focus) ultimoFoco.focus(); }
  function abrirRapido(){ lancador.classList.add('aberto'); botao.setAttribute('aria-expanded','true'); }
  function fecharRapido(){ lancador.classList.remove('aberto'); botao.setAttribute('aria-expanded','false'); }
  var toque = window.matchMedia('(hover: none)').matches;
  lancador.addEventListener('mouseenter', function(){ if(!toque) abrirRapido(); });
  lancador.addEventListener('mouseleave', function(){ if(!toque) fecharRapido(); });
  botao.addEventListener('click', function(){ lancador.classList.contains('aberto') && toque ? fecharRapido() : (toque ? abrirRapido() : abrirPainel()); });
  caixa.addEventListener('click', function(e){
    var r = e.target.closest('[data-rapido]'); if(!r) return;
    var q = r.dataset.rapido; fecharRapido();
    if(q === 'painel') abrirPainel();
    if(q === 'libras'){ fecharPainel(); abrirLibras(); }
    if(q === 'face') face.ativo ? pararFace() : iniciarFace();
  });
  document.addEventListener('keydown', function(e){
    if(e.altKey && (e.key === 'a' || e.key === 'A')){ e.preventDefault(); painel.classList.contains('aberto') ? fecharPainel() : abrirPainel(); }
    if(e.key === 'Escape'){ if(painel.classList.contains('aberto')) fecharPainel(); fecharRapido(); }
  });
  // O bonequinho do VLibras fica escondido (CSS). O VLibras abre pelo botão oficial
  // que o próprio widget expõe em window.VLibrasWidget.initBtn (documentação do VLibras 7).
  function abrirLibras(){
    var w = window.VLibrasWidget, vl = (w && w.initBtn) || document.querySelector('[vw-access-button]');
    if(!vl){ aviso('O tradutor de Libras (VLibras) ainda está carregando. Tente de novo em alguns segundos.'); return; }
    vl.click(); anunciar('Tradutor de Libras aberto'); mostrarBoasVindas();
  }
  // O VLibras traduz o texto em que a pessoa clica. Esta frase fica na tela para quem quiser ver as boas-vindas em Libras.
  function mostrarBoasVindas(){
    if(document.getElementById('cla-boas')) return;
    var c = document.createElement('div'); c.className = 'cla-boas'; c.id = 'cla-boas'; c.setAttribute('role','note');
    c.innerHTML = '<p tabindex="0">Olá, tudo bem? Bem-vindo ao site do Instituto Circula Libras.</p>'+
      '<small>Quando o VLibras terminar de carregar, clique na frase acima para vê-la em Libras.</small>'+
      '<button type="button" aria-label="Fechar mensagem de boas-vindas"><i class="ph ph-x" aria-hidden="true"></i></button>';
    caixa.appendChild(c);
    c.querySelector('button').addEventListener('click', function(){ c.remove(); });
  }

  /* ---------- guia e máscara de leitura ---------- */
  var guia = document.getElementById('cla-guia'), mc = document.getElementById('cla-masc-cima'), mb = document.getElementById('cla-masc-baixo');
  function moverFerramentas(y){
    if(est.guia) guia.style.top = (y - 7) + 'px';
    if(est.mascara){ var j = 70; mc.style.top = '0'; mc.style.height = Math.max(0, y - j) + 'px'; mb.style.top = (y + j) + 'px'; mb.style.bottom = '0'; }
  }
  document.addEventListener('mousemove', function(e){ moverFerramentas(e.clientY); }, {passive:true});
  document.addEventListener('touchmove', function(e){ if(e.touches[0]) moverFerramentas(e.touches[0].clientY); }, {passive:true});
  moverFerramentas(window.innerHeight / 2);

  /* ---------- navegação pelo teclado (setas) ---------- */
  var SEL_NAV = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"]),h1,h2,h3';
  function itensNavegaveis(){
    return [].slice.call(document.querySelectorAll(SEL_NAV)).filter(function(el){
      if(!foraDoPainel(el) || el.closest('[aria-hidden="true"]')) return false;
      var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    });
  }
  document.addEventListener('keydown', function(e){
    if(!est.teclado || e.altKey || e.ctrlKey || e.metaKey) return;
    if(e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var t = e.target; if(t.closest && (t.closest('#cla') || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))) return;
    var itens = itensNavegaveis(); if(!itens.length) return;
    e.preventDefault();
    var i = itens.indexOf(document.activeElement);
    var prox = e.key === 'ArrowDown' ? itens[Math.min(itens.length-1, i+1)] : itens[Math.max(0, i-1)];
    if(/^H[1-6]$/.test(prox.tagName) && !prox.hasAttribute('tabindex')) prox.setAttribute('tabindex','-1');
    prox.focus({preventScroll:true}); prox.scrollIntoView({block:'center', behavior: est.pausa ? 'auto' : 'smooth'});
  });

  /* ---------- leitor de texto (voz do navegador) ---------- */
  var voz = null;
  function escolherVoz(){
    if(!falaOk) return;
    var vs = speechSynthesis.getVoices();
    voz = vs.filter(function(v){ return /pt[-_]BR/i.test(v.lang); })[0] || vs.filter(function(v){ return /^pt/i.test(v.lang); })[0] || null;
  }
  if(falaOk){ escolherVoz(); speechSynthesis.onvoiceschanged = escolherVoz; }
  var lendoEl = null;
  function marcar(el){ if(lendoEl) lendoEl.classList.remove('cla-lendo'); lendoEl = el; if(el) el.classList.add('cla-lendo'); }
  function falar(texto, el, depois){
    if(!falaOk){ aviso('Este navegador não tem leitura em voz alta.'); return; }
    texto = (texto || '').replace(/\s+/g,' ').trim(); if(!texto) { if(depois) depois(); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; if(voz) u.voice = voz; u.rate = est.velocidade || 1;
    marcar(el || null);
    u.onend = function(){ marcar(null); if(depois) depois(); };
    u.onerror = function(){ marcar(null); };
    speechSynthesis.speak(u);
  }
  var filaLeitura = null;
  function pararFala(){ filaLeitura = null; if(falaOk) speechSynthesis.cancel(); marcar(null); }
  function nomeAcessivel(el){
    if(el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if(el.tagName === 'IMG') return el.alt ? 'Imagem: ' + el.alt : '';
    var t = (el.innerText || el.textContent || '').trim();
    if(el.tagName === 'A') t = 'Link: ' + t; else if(el.tagName === 'BUTTON') t = 'Botão: ' + t; else if(/^H[1-6]$/.test(el.tagName)) t = 'Título: ' + t;
    return t;
  }
  function aoClicarLeitor(e){
    var el = e.target.closest('p,li,h1,h2,h3,h4,dt,dd,figcaption,a,button,img,span,strong,label');
    if(!el || !foraDoPainel(el) || el.closest("[data-cla-silencio]")) return; // áreas com narração própria (ex.: tabuleiro do xadrez)
    falar(nomeAcessivel(el), el);
  }
  function aoFocarLeitor(e){ var el = e.target; if(el && el.nodeType === 1 && foraDoPainel(el) && !el.closest('[data-cla-silencio]')) falar(nomeAcessivel(el), el); }
  var leitorLigado = false;
  function ligarLeitor(){ if(leitorLigado) return; leitorLigado = true; document.addEventListener('click', aoClicarLeitor, true); document.addEventListener('focusin', aoFocarLeitor); }
  function desligarLeitor(){ if(!leitorLigado) return; leitorLigado = false; document.removeEventListener('click', aoClicarLeitor, true); document.removeEventListener('focusin', aoFocarLeitor); pararFala(); }
  function lerPagina(){
    var blocos = [].slice.call(document.querySelectorAll('main h1, main h2, main h3, main p, main li, main figcaption, main dt, main dd')).filter(function(el){
      var r = el.getBoundingClientRect(); return r.height > 0 && foraDoPainel(el) && !el.closest('[aria-hidden="true"]') && !el.closest('li li');
    });
    // começa do primeiro bloco visível na tela
    var ini = 0; for(var k=0;k<blocos.length;k++){ if(blocos[k].getBoundingClientRect().bottom > 80){ ini = k; break; } }
    filaLeitura = blocos.slice(ini);
    fecharPainel();
    (function proximo(){
      if(!filaLeitura || !filaLeitura.length) return;
      var el = filaLeitura.shift();
      el.scrollIntoView({block:'center', behavior: est.pausa ? 'auto' : 'smooth'});
      falar(nomeAcessivel(el), el, proximo);
    })();
  }

  /* ---------- navegação por face (câmera, tudo processado no aparelho) ---------- */
  var face = {ativo:false};
  var MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  var MODELO = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  function iniciarFace(){
    if(face.ativo || face.carregando) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ aviso('Este navegador não permite usar a câmera.'); return; }
    face.carregando = true; fecharPainel();
    var quadro = document.createElement('div'); quadro.className = 'cla-face'; quadro.setAttribute('role','region'); quadro.setAttribute('aria-label','Navegação por face');
    quadro.innerHTML = '<video playsinline muted></video><p id="cla-face-status">Carregando… autorize a câmera.</p><p>Mexa a cabeça para mover o círculo. Abra a boca para clicar. Leve o círculo ao alto ou ao pé da tela para rolar.</p><button type="button">Desligar câmera</button>';
    caixa.appendChild(quadro); face.quadro = quadro;
    quadro.querySelector('button').addEventListener('click', pararFace);
    var status = quadro.querySelector('#cla-face-status'), video = quadro.querySelector('video');
    navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:640, height:480}, audio:false}).then(function(stream){
      face.stream = stream; video.srcObject = stream; return video.play();
    }).then(function(){
      return import(MP + '/vision_bundle.mjs');
    }).then(function(mp){
      return mp.FilesetResolver.forVisionTasks(MP + '/wasm').then(function(fs){
        return mp.FaceLandmarker.createFromOptions(fs, {baseOptions:{modelAssetPath:MODELO, delegate:'GPU'}, runningMode:'VIDEO', numFaces:1, outputFaceBlendshapes:true});
      });
    }).then(function(det){
      face.det = det; face.ativo = true; face.carregando = false; face.centro = null; face.amostras = [];
      status.textContent = 'Olhe para a tela por um instante para calibrar…';
      document.getElementById('cla-mira').style.display = 'block';
      atualizarBotoes(); anunciar('Navegação por face ligada');
      laco(video, status);
    }).catch(function(err){
      face.carregando = false;
      var msg = (err && err.name === 'NotAllowedError') ? 'A câmera não foi autorizada.' : 'Não foi possível ligar a navegação por face.';
      aviso(msg); pararFace();
    });
  }
  function laco(video, status){
    if(!face.ativo) return;
    var agora = performance.now();
    if(video.readyState >= 2 && agora - (face.ultimo || 0) > 33){
      face.ultimo = agora;
      var r = face.det.detectForVideo(video, agora);
      if(r && r.faceLandmarks && r.faceLandmarks[0]){
        var nariz = r.faceLandmarks[0][1];
        var x = 1 - nariz.x, y = nariz.y; // espelhado, como um espelho
        if(!face.centro){
          face.amostras.push([x,y]);
          if(face.amostras.length >= 25){
            var sx=0, sy=0; face.amostras.forEach(function(a){ sx+=a[0]; sy+=a[1]; });
            face.centro = [sx/face.amostras.length, sy/face.amostras.length];
            face.px = window.innerWidth/2; face.py = window.innerHeight/2;
            status.textContent = 'Pronto! Mexa a cabeça devagar.';
          }
        } else {
          var ganho = 4.2;
          var alvoX = window.innerWidth/2 + (x - face.centro[0]) * window.innerWidth * ganho;
          var alvoY = window.innerHeight/2 + (y - face.centro[1]) * window.innerHeight * ganho;
          face.px += (alvoX - face.px) * .25; face.py += (alvoY - face.py) * .25; // suaviza o tremor
          face.px = Math.max(8, Math.min(window.innerWidth-8, face.px)); face.py = Math.max(8, Math.min(window.innerHeight-8, face.py));
          var mira = document.getElementById('cla-mira'); mira.style.left = face.px + 'px'; mira.style.top = face.py + 'px';
          moverFerramentas(face.py);
          var faixa = window.innerHeight * .12;
          if(face.py < faixa) window.scrollBy(0, -14); else if(face.py > window.innerHeight - faixa) window.scrollBy(0, 14);
          var boca = 0; (r.faceBlendshapes && r.faceBlendshapes[0] ? r.faceBlendshapes[0].categories : []).forEach(function(c){ if(c.categoryName === 'jawOpen') boca = c.score; });
          if(boca > .5 && agora - (face.ultimoClique || 0) > 1200){
            face.ultimoClique = agora; clicarEm(face.px, face.py, mira);
          }
        }
      }
    }
    face.raf = requestAnimationFrame(function(){ laco(video, status); });
  }
  function clicarEm(x, y, mira){
    mira.style.display = 'none'; var alvo = document.elementFromPoint(x, y); mira.style.display = 'block';
    mira.classList.add('clicou'); setTimeout(function(){ mira.classList.remove('clicou'); }, 250);
    if(!alvo) return;
    var clicavel = alvo.closest('a,button,[role=button],input,label,summary,[tabindex]') || alvo;
    if(clicavel.focus) clicavel.focus({preventScroll:true});
    clicavel.click();
  }
  function pararFace(){
    face.ativo = false; face.carregando = false; cancelAnimationFrame(face.raf);
    if(face.stream) face.stream.getTracks().forEach(function(t){ t.stop(); });
    if(face.det && face.det.close) try{ face.det.close(); }catch(e){}
    if(face.quadro) face.quadro.remove();
    face.stream = face.det = face.quadro = null;
    document.getElementById('cla-mira').style.display = 'none';
    atualizarBotoes();
  }

  /* ---------- início ---------- */
  if(est.leitor) ligarLeitor();
  aplicar();
  window.addEventListener('resize', function(){ if(est.tam){ var t = est.tam; est.tam = 0; aplicarTamanho(); est.tam = t; aplicarTamanho(); } });
})();
