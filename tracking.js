/* ============================================================
   RAIZYS - GOOGLE TAG + CONVERSOES (Google Ads AW-18428599318)
   ------------------------------------------------------------
   Duas coisas moram aqui:

   1) A tag base (gtag.js). Ela sozinha NAO conta conversao
      nenhuma: so identifica o visitante e guarda o gclid do
      anuncio. E por isso que a conta ficou com 0 conversoes.

   2) O disparo da acao de conversao. Agora existe rotulo, entao
      cada clique em botao de contato e cada envio de formulario
      avisa o Google Ads.
   ============================================================ */
(function () {
  'use strict';

  var AW_ID = 'AW-18428599318';

  /* Acao "Cliques botoes no site" (categoria Contatos), do tipo
     Clique. O rotulo veio do snippet que o painel gera em
     Objetivos > Conversoes > (a acao) > Configurar tag:

       send_to: 'AW-18428599318/OxMoCM_wsI8dEJa4uNNE'

     So a parte depois da barra entra aqui. Se o cliente recriar a
     acao, o rotulo muda e esta linha e a unica coisa a mexer.

     A acao esta configurada para contar "Uma" por clique de
     anuncio, entao disparar mais de uma vez na mesma visita nao
     infla o relatorio: o Google consolida em uma conversao. */
  var CLIQUE_LABEL = 'OxMoCM_wsI8dEJa4uNNE';

  /* A outra acao do cliente ("Enviar formulario de lead") hoje e
     medida por URL visitada, que nao usa rotulo nenhum. Se um dia
     ela virar uma acao do tipo tag, o rotulo entra aqui e o envio
     de formulario passa a contar separado dos cliques. */
  var LEAD_LABEL = '';

  /* ---------- TAG BASE (gtag.js) ---------- */

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_ID;
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', AW_ID);

  /* ---------- DISPARO ----------

     Clique que leva o visitante embora (tel:, mailto:, wa.me na
     mesma aba) corre o risco de a pagina descarregar antes do
     ping sair. O proprio Google resolve isso segurando a
     navegacao ate o event_callback voltar. O setTimeout e a
     rede de seguranca: com bloqueador de anuncio ou conexao
     ruim o callback nunca chega, e ninguem pode ficar com o
     clique travado por causa de rastreamento.                 */

  function conversao(label, extras, depois) {
    if (!label) { if (depois) depois(); return; }

    var p = extras || {};
    p.send_to = AW_ID + '/' + label;

    if (depois) {
      var feito = false;
      var pronto = function () {
        if (feito) return;
        feito = true;
        depois();
      };
      p.event_callback = pronto;
      setTimeout(pronto, 900);
    }

    window.gtag('event', 'conversion', p);
  }

  /* Mesma assinatura do snippet que o painel do Google Ads entrega,
     para quem quiser chamar na mao num onclick:
       <a href="..." onclick="return gtag_report_conversion('...')"> */
  window.gtag_report_conversion = function (url) {
    conversao(CLIQUE_LABEL, { pagina: window.location.pathname },
      url ? function () { window.location = url; } : null);
    return false;
  };

  /* ---------- BOTOES DE CONTATO ----------

     Tudo que significa "quero falar com a Raizys". O widget da WTS
     cria o botao flutuante depois que a pagina carrega, por isso o
     listener fica no document e nao em cada elemento.             */

  var BOTOES = [
    '.h-widget-trigger',             // abre o formulario de WhatsApp (widget WTS)
    '.h-widget-float',               // botao flutuante criado pelo widget
    'a[href*="wa.me"]',              // links diretos de WhatsApp
    'a[href*="api.whatsapp.com"]',
    'a[href*="wshort.me"]',          // webchat do CRM (botao roxo)
    'a[href*="webchat.flw.chat"]',
    'a[href^="tel:"]',
    'a[href^="mailto:"]'
  ].join(',');

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    var alvo = e.target.closest(BOTOES);
    if (!alvo) return;

    // Um botao pode casar com mais de um seletor; conta uma vez so.
    if (e.__raizysConversao) return;
    e.__raizysConversao = true;

    var link = alvo.closest('a[href]');
    var href = link && link.getAttribute('href');

    // Abrir em outra aba (ou com Ctrl/Cmd) nao descarrega a pagina:
    // nesse caso o ping sai sozinho e o clique segue normal.
    var saiDaPagina = !!href &&
      href.charAt(0) !== '#' &&
      (!link.target || link.target === '_self') &&
      e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

    var dados = {
      pagina: window.location.pathname,
      botao: (alvo.textContent || '').trim().slice(0, 60) || 'sem texto'
    };

    if (saiDaPagina) {
      e.preventDefault();
      conversao(CLIQUE_LABEL, dados, function () { window.location.href = link.href; });
    } else {
      conversao(CLIQUE_LABEL, dados);
    }
  }, true);

  /* ---------- FORMULARIOS ----------

     O painel do Google sugere exatamente este uso para uma acao do
     tipo Clique: o botao Enviar de um formulario de lead. Aqui o
     envio e assincrono (fetch no form.js), a pagina nao descarrega,
     entao nao precisa segurar nada.                                */

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    var acao = (form.getAttribute('action') || '').toLowerCase();
    if (acao.indexOf('send_mail.php') === -1) return;

    conversao(LEAD_LABEL || CLIQUE_LABEL, {
      pagina: window.location.pathname,
      formulario: form.id || 'sem id'
    });
  }, true);

  /* O formulario que abre no botao de WhatsApp vive dentro do iframe
     da WTS: nao passa pelo submit acima. O wts-widget.js avisa aqui
     quando o lead chega de verdade. */
  window.addEventListener('raizys:lead-widget', function () {
    conversao(LEAD_LABEL || CLIQUE_LABEL, {
      pagina: window.location.pathname,
      formulario: 'widget-wts'
    });
  });

  /* ---------- HELPER PARA OUTRAS CONVERSOES ---------- */

  // Uso: RaizysTracking.conversao('ROTULO_DA_ACAO', { event_label: 'formulario' })
  window.RaizysTracking = {
    conversao: function (label, extras) { conversao(label, extras); },
    rotulos: { clique: CLIQUE_LABEL, lead: LEAD_LABEL }
  };
})();
