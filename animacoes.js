/* ============================================================
   RAIZYS — CAMADA DE MOVIMENTO (GSAP)
   ------------------------------------------------------------
   O site já revelava os blocos ao rolar: o style.css esconde
   `.reveal-item` e o script.js adiciona `.reveal` quando o
   elemento entra na tela. O problema é que tudo entrava ao
   mesmo tempo e voltava a sumir quando a pessoa subia.

   Aqui o GSAP assume só o CRONÔMETRO: ele continua adicionando
   a MESMA classe, mas em cascata e uma vez só. A opacidade
   continua sendo do CSS — dois donos para a mesma propriedade é
   o jeito mais rápido de deixar conteúdo invisível no ar.

   Se o GSAP não carregar, este arquivo sai pela porta logo na
   primeira linha e o script.js liga o observador de sempre.
   Nada deixa de aparecer.
   ============================================================ */
(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  /* O script.js lê isto antes de ligar o observador antigo. Só é
     marcado aqui, depois de confirmar que o GSAP existe. */
  window.RaizysAnimacoes = true;

  var curto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var passo = curto ? 0.035 : 0.085;

  function ligar() {
    var alvos = Array.prototype.slice.call(
      document.querySelectorAll('.reveal-item, .pillar-card')
    );
    if (!alvos.length) return;

    window.ScrollTrigger.batch(alvos, {
      start: 'top 88%',
      once: true,
      onEnter: function (els) {
        els.forEach(function (el, i) {
          gsap.delayedCall(i * passo, function () { el.classList.add('reveal'); });
        });
      }
    });

    /* Rede de segurança. Se um gatilho ficar com a medida errada —
       imagem que carregou depois, fonte que mudou a altura, aba que
       ficou em segundo plano — o bloco apareceria vazio para sempre.
       Passado o tempo, o que estiver na tela aparece de qualquer
       jeito: sem animação é bem melhor que invisível. */
    setTimeout(function () {
      var altura = window.innerHeight || document.documentElement.clientHeight;
      alvos.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < altura && r.bottom > 0) el.classList.add('reveal');
      });
      window.ScrollTrigger.refresh();
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ligar);
  } else {
    ligar();
  }

  /* Imagens que chegam depois mudam a altura da página e deixam os
     gatilhos no lugar errado. */
  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
})();
