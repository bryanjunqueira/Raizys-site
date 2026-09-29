/* ============================================================
   RAIZYS - LEAD DO WIDGET WTS -> E-MAIL
   ------------------------------------------------------------
   Quando o visitante envia o formulario que abre nos botoes de
   WhatsApp, o iframe da WTS avisa a pagina com uma mensagem
   { action: "FORM_SUBMITTED", payload: { formData } }. A propria
   WTS nao usa esse formData (a funcao dela so dispara pixels e
   redireciona), entao ele existe justamente para o site usar.
   Aqui a gente captura e manda por e-mail pelo wts_lead.php.

   ATENCAO: "FORM_SUBMITTED" e um protocolo interno da WTS, nao
   documentado. Se eles renomearem isso numa atualizacao, este
   envio para de funcionar. Por isso cada etapa loga no console
   do navegador: da para diagnosticar abrindo o F12 e enviando
   um teste pelo formulario.
   ============================================================ */
(function () {
  'use strict';

  // Guarda contra inclusao dupla: dois listeners gerariam dois e-mails.
  if (window.__raizysWtsLead) return;
  window.__raizysWtsLead = true;

  var ORIGENS_OK = /^https:\/\/([a-z0-9-]+\.)*wts\.chat$/i;
  var enviados = {};

  function achatar(dados, destino, prefixo) {
    destino = destino || {};
    prefixo = prefixo || '';
    if (dados === null || dados === undefined) return destino;

    // Formato 1: lista de campos [{ label|name|id, value }]
    if (Array.isArray(dados)) {
      dados.forEach(function (item, i) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          var rotulo = item.label || item.name || item.title || item.id;
          var temValor = ('value' in item) || ('answer' in item);

          // Item no formato de campo: usa rotulo + valor e para por aqui.
          // Se o valor vier vazio o campo e descartado inteiro — sem isso,
          // o objeto era achatado e sobrava um campo "label" solto.
          if (rotulo && temValor) {
            var valor = item.value !== undefined ? item.value : item.answer;
            if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
              destino[String(rotulo)] = String(valor);
            }
            return;
          }

          achatar(item, destino, prefixo + (rotulo ? rotulo + ' ' : ''));
        } else if (item !== undefined && item !== null && String(item).trim() !== '') {
          destino[prefixo + 'campo_' + (i + 1)] = String(item);
        }
      });
      return destino;
    }

    // Formato 2: objeto { campo: valor }
    if (typeof dados === 'object') {
      Object.keys(dados).forEach(function (k) {
        var v = dados[k];
        if (v && typeof v === 'object') {
          achatar(v, destino, prefixo + k + ' ');
        } else if (v !== undefined && v !== null && String(v).trim() !== '') {
          destino[prefixo + k] = String(v);
        }
      });
      return destino;
    }

    // Formato 3: string solta
    destino[prefixo || 'mensagem'] = String(dados);
    return destino;
  }

  window.addEventListener('message', function (e) {
    if (!e || !e.data || e.data.action !== 'FORM_SUBMITTED') return;

    if (!ORIGENS_OK.test(e.origin)) {
      console.warn('[Raizys] FORM_SUBMITTED ignorado, origem inesperada:', e.origin);
      return;
    }

    var formData = e.data.payload && e.data.payload.formData;
    var campos = achatar(formData);

    if (!Object.keys(campos).length) {
      console.warn('[Raizys] FORM_SUBMITTED sem campos aproveitaveis:', formData);
      return;
    }

    // O widget pode emitir a mensagem mais de uma vez; evita e-mail duplicado.
    var assinatura = JSON.stringify(campos);
    if (enviados[assinatura]) return;
    enviados[assinatura] = true;

    var body = new FormData();
    Object.keys(campos).forEach(function (k) { body.append(k, campos[k]); });
    body.append('_pagina', window.location.pathname);

    fetch('/wts_lead.php', { method: 'POST', body: body })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (r) {
        if (r && r.success) {
          console.log('[Raizys] Lead do widget enviado por e-mail.');
        } else {
          delete enviados[assinatura];
          console.error('[Raizys] wts_lead.php nao confirmou o envio:', r);
        }
      })
      .catch(function (err) {
        delete enviados[assinatura];
        console.error('[Raizys] Falha ao enviar o lead do widget:', err);
      });
  });
})();
