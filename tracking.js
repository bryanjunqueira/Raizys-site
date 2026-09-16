/* ============================================================
   RAIZYS - GOOGLE TAG (Google Ads)
   ------------------------------------------------------------
   Tag base da conta AW-18428599318, conforme o painel do Google
   Ads ("Instalar manualmente"): uma unica tag do Google por
   pagina, carregada logo apos a abertura do <head>.
   ============================================================ */
(function () {
  'use strict';

  var AW_ID = 'AW-18428599318';

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

  /* ---------- CONVERSAO (opcional, desligada por padrao) ----------

     Hoje o lead e registrado pelo widget da WTS Chat, que captura a
     origem do trafego por conta propria. Se no futuro o cliente criar
     uma acao de conversao no Google Ads para "abriu o atendimento",
     basta colar o rotulo abaixo: a conversao passa a disparar quando
     o visitante abre o widget (elementos .h-widget-trigger).

     Onde achar o rotulo: Google Ads > Objetivos > Conversoes >
     (a acao) > Configurar tag > Instalar manualmente. No snippet de
     la aparece send_to: 'AW-18428599318/AbC-D_efGhIjK' — cole aqui
     somente a parte depois da barra.

     Enquanto estiver vazio, nada e disparado.                        */

  var CONVERSION_LABEL = '';

  if (CONVERSION_LABEL) {
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      if (!e.target.closest('.h-widget-trigger')) return;

      window.gtag('event', 'conversion', {
        send_to: AW_ID + '/' + CONVERSION_LABEL,
        pagina: window.location.pathname
      });
    }, true);
  }

  /* ---------- HELPER PARA OUTRAS CONVERSOES ---------- */

  // Uso: RaizysTracking.conversao('ROTULO_DA_ACAO', { event_label: 'formulario' })
  window.RaizysTracking = {
    conversao: function (label, extras) {
      if (!label) return;
      var p = extras || {};
      p.send_to = AW_ID + '/' + label;
      window.gtag('event', 'conversion', p);
    }
  };
})();
