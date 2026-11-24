/* Formulário "Leve o projeto".
   O envio é feito pelo FormSubmit (formsubmit.co), do jeito clássico da documentação deles:
   o formulário vai para o endereço do FormSubmit, a pessoa passa pela verificação anti-robô
   e volta para xadrez/obrigado.html. Este script só confere os campos antes de enviar. */
(function(){
  var form = document.getElementById('form-proposta'); if(!form) return;
  var aviso = document.getElementById('aviso-form');
  function mostra(tipo, texto){ aviso.className = 'aviso-form ' + tipo; aviso.textContent = texto; }
  form.addEventListener('submit', function(e){
    var nome = form.nome.value.trim(), email = form.email.value.trim(), msg = form.mensagem.value.trim();
    var faltando = [];
    if(!nome) faltando.push('nome');
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) faltando.push('e-mail válido');
    if(!msg) faltando.push('sua proposta');
    if(faltando.length){
      e.preventDefault();
      mostra('erro', 'Falta preencher: ' + faltando.join(', ') + '.');
      (!nome ? form.nome : (faltando.indexOf('e-mail válido') > -1 ? form.email : form.mensagem)).focus();
      return;
    }
    mostra('ok', 'Enviando… Na próxima tela pode aparecer uma verificação para confirmar que você não é um robô.');
    form.querySelector('button[type=submit]').disabled = true;
  });
})();
