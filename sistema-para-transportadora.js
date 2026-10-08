/* ============================================================
   RAIZYS — TRILHA
   ------------------------------------------------------------
   O traçado NÃO é um desenho fixo: o `d` do path é calculado a
   partir da posição real de cada parada, então a trilha passa
   pelo centro dos círculos em qualquer largura — inclusive
   depois de um resize ou quando as fontes terminam de carregar.

   O laço fica no vão ENTRE as linhas, nunca sobre o texto, e a
   trilha desce pela coluna da ilustração passando atrás dos
   cartões.

   A revelação acompanha o COMPRIMENTO do traçado, não a altura
   da página. É isso que permite acender a palavra certa no
   instante em que a faixa passa por ela: num trecho horizontal
   uma máscara por altura revelaria tudo de uma vez só.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('.tr-road');
  if (!root) return;

  var svg = root.querySelector('.tr-trail');
  var base = root.querySelector('.tr-trail-base');
  var fill = root.querySelector('.tr-trail-fill');
  var mascara = root.querySelector('.tr-mask-path');
  var cabeca = root.querySelector('.tr-trail-head');
  var paradas = Array.prototype.slice.call(root.querySelectorAll('[data-stop]'));
  var linhas = Array.prototype.slice.call(root.querySelectorAll('[data-row]'));
  var palavras = Array.prototype.slice.call(root.querySelectorAll('[data-acende] span'));
  var subAcende = root.querySelector('.tr-acende-sub');
  if (!svg || !base || !fill || !paradas.length) return;

  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var amostras = [];      // { x, y, L } ao longo do traçado
  var total = 0;
  var marcos = [];        // comprimento em que cada parada é alcançada
  var yUltimaParada = 0;  // altura da última parada, fim útil do avanço

  /* ---------- Traçado ---------- */

  function construir() {
    var r = root.getBoundingClientRect();
    var W = Math.round(r.width);
    var H = Math.round(r.height);
    if (!W || !H) return;

    // viewBox 1:1 com o tamanho real. Nada de preserveAspectRatio="none":
    // ele distorceria a espessura e o tracejado da faixa.
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var pts = paradas.map(function (e) {
      var b = e.getBoundingClientRect();
      return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
    });

    var caixas = linhas.map(function (e) { return e.getBoundingClientRect(); });

    // Abaixo de 640px o laço não cabe sem invadir o texto.
    var comLaco = W >= 640;

    var R = Math.max(34, Math.min(64, W * 0.045));
    var f = function (n) { return n.toFixed(1); };

    var sx = W * 0.4;
    var d = 'M ' + f(sx) + ' 0 C ' + f(sx) + ' ' + f(pts[0].y * 0.6) +
            ', ' + f(pts[0].x) + ' ' + f(pts[0].y * 0.4) +
            ', ' + f(pts[0].x) + ' ' + f(pts[0].y);

    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i];
      var b = pts[i + 1];

      if (!comLaco) {
        var k = (b.y - a.y) * 0.3;
        d += ' C ' + f(a.x) + ' ' + f(a.y + k) + ', ' + f(b.x) + ' ' + f(b.y - k) +
             ', ' + f(b.x) + ' ' + f(b.y);
        continue;
      }

      var s = Math.sign(b.x - a.x) || 1;
      // O laço fica no vão entre as linhas, onde não há texto.
      var rb = caixas[i] ? (caixas[i].bottom - r.top - 120) : (a.y + (b.y - a.y) * 0.55);
      var M = { x: (a.x + b.x) / 2, y: rb };
      var ka = (M.y - a.y) * 0.75;
      var M2x = M.x + s * R * 0.3;

      d += ' C ' + f(a.x) + ' ' + f(a.y + ka) +
           ', ' + f(M.x - s * 1.6 * R) + ' ' + f(M.y + 1.4 * R) +
           ', ' + f(M.x) + ' ' + f(M.y);
      d += ' C ' + f(M.x + s * 3 * R) + ' ' + f(M.y - 2.6 * R) +
           ', ' + f(M.x - s * 2.7 * R) + ' ' + f(M.y - 2.6 * R) +
           ', ' + f(M2x) + ' ' + f(M.y);
      d += ' C ' + f(M2x + s * 1.6 * R) + ' ' + f(M.y + 1.4 * R) +
           ', ' + f(b.x) + ' ' + f(M.y + (b.y - M.y) * 0.2) +
           ', ' + f(b.x) + ' ' + f(b.y);
    }

    var L = pts[pts.length - 1];
    var ex = W * 0.66;

    /* A trilha PARA na última parada, que fica logo acima do texto.
       Antes ela varria a manchete e as faixas cortavam as palavras —
       ficava ilegível. Agora ela chega, encosta e para; o texto
       acende em seguida, a partir dali. */

    base.setAttribute('d', d);
    fill.setAttribute('d', d);
    if (mascara) mascara.setAttribute('d', d);

    amostrar(r);
    atualizar();
  }

  function amostrar(r) {
    amostras = [];
    total = fill.getTotalLength();
    if (!total) return;

    var N = 600;
    for (var i = 0; i <= N; i++) {
      var L = (i / N) * total;
      var p = fill.getPointAtLength(L);
      amostras.push({ x: p.x, y: p.y, L: L });
    }

    if (mascara) {
      mascara.style.strokeDasharray = total;
      mascara.style.strokeDashoffset = total;
    }

    marcos = paradas.map(function (e) { return comprimentoDe(e, r); });

    var ub = paradas[paradas.length - 1].getBoundingClientRect();
    yUltimaParada = ub.top - r.top + ub.height / 2;
  }

  /* Em que ponto do traçado a faixa passa mais perto deste elemento? */
  function comprimentoDe(el, r) {
    var b = el.getBoundingClientRect();
    var cx = b.left - r.left + b.width / 2;
    var cy = b.top - r.top + b.height / 2;
    var melhor = 0;
    var menor = Infinity;
    for (var i = 0; i < amostras.length; i++) {
      var dx = amostras[i].x - cx;
      var dy = amostras[i].y - cy;
      var dist = dx * dx + dy * dy;
      if (dist < menor) { menor = dist; melhor = amostras[i].L; }
    }
    return melhor;
  }

  function pontoEm(L) {
    if (!amostras.length) return null;
    var i = Math.round((L / total) * (amostras.length - 1));
    return amostras[Math.max(0, Math.min(amostras.length - 1, i))];
  }

  /* ---------- Avanço ---------- */

  /* Quem desenha. Recebe o avanço de 0 a 1 e aplica. */
  function aplicar(p) {
    if (!total) return;

    var alturaJanela = window.innerHeight || document.documentElement.clientHeight;

    /* O avanço vai do topo da seção até a ÚLTIMA PARADA, não até o pé
       da seção. A trilha termina na parada, então medir até o fim
       deixava ela (e o texto que acende com ela) só completando
       depois do vídeo, fora da tela.
       Mapear para o comprimento — e não para a altura — mantém o
       ritmo constante também nos laços. */
    var andado = p * total;

    if (mascara) mascara.style.strokeDashoffset = total - andado;

    // Sem trilha (empilhado), a parada acende ao entrar na tela.
    var semTrilha = getComputedStyle(svg).display === 'none';

    for (var i = 0; i < paradas.length; i++) {
      var acesa = paradas[i].classList.contains('is-lit');
      var deve = semTrilha
        ? paradas[i].getBoundingClientRect().top < alturaJanela * 0.8
        : andado >= marcos[i];
      if (deve && !acesa) paradas[i].classList.add('is-lit');
      else if (!deve && acesa) paradas[i].classList.remove('is-lit');
    }

    /* O texto acende a partir da última parada: a luz chega no
       círculo e escorre para as palavras, uma a uma. O escalonamento
       é o transition-delay no CSS. */
    var ultima = paradas[paradas.length - 1];
    if (ultima) {
      var ligado = ultima.classList.contains('is-lit');
      for (var w = 0; w < palavras.length; w++) {
        palavras[w].classList.toggle('is-lit', ligado);
      }
      if (subAcende) subAcende.classList.toggle('is-lit', ligado);
    }

    if (cabeca && !semTrilha) {
      var q = pontoEm(andado);
      if (q && p > 0.004 && p < 0.996) {
        cabeca.style.transform = 'translate(' + q.x.toFixed(1) + 'px, ' + q.y.toFixed(1) + 'px)';
        cabeca.classList.add('is-on');
      } else {
        cabeca.classList.remove('is-on');
      }
    }
  }

  /* Quem decide. Mede a rolagem e entrega o alvo para o tween.

     A conta é a mesma de sempre: o avanço vai do topo da seção até a
     ÚLTIMA PARADA, não até o pé da seção — a trilha termina na parada,
     e medir até o fim deixava ela (e o texto que acende junto) só
     completando depois do vídeo, fora da tela. Mapear para o
     comprimento, e não para a altura, mantém o ritmo nos laços. */
  var estado = { p: 0 };
  var temInercia = !!(window.gsap);

  function atualizar() {
    if (!total) return;

    var r = root.getBoundingClientRect();
    var alturaJanela = window.innerHeight || document.documentElement.clientHeight;
    var fimUtil = yUltimaParada || r.height;

    var p = (alturaJanela * 0.62 - r.top) / Math.max(1, fimUtil);
    p = Math.max(0, Math.min(1, p));

    if (!temInercia) { estado.p = p; return aplicar(p); }

    /* Sem o tween a faixa anda exatamente junto com a rolagem e o
       traço parece preso ao dedo. Com ele a luz corre atrás, alcança
       e acomoda — é o que dá a sensação de a estrada estar sendo
       percorrida. Com "menos movimento" ligado o amortecimento
       encurta, mas não some: some seria a página estática. */
    window.gsap.to(estado, {
      p: p,
      duration: semMovimento ? 0.18 : 0.55,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: function () { aplicar(estado.p); }
    });
  }

  /* ---------- Entrada dos blocos ---------- */

  var pendentes = [];

  function prepararEntradas() {
    pendentes = []
      .concat(linhas)
      .concat(Array.prototype.slice.call(document.querySelectorAll('.tr-gauge, .tr-sobe')));

    Array.prototype.forEach.call(
      document.querySelectorAll('.tr-gauge, .tr-sobe'),
      function (el, i) { el.style.transitionDelay = (i % 6) * 0.07 + 's'; }
    );

    revelarVisiveis();
  }

  /* Revela tudo que já alcançou a linha de entrada — inclusive o que
     ficou ACIMA da tela. Isso importa: com IntersectionObserver, pular
     direto para o meio da página (link âncora, rolagem com inércia,
     Ctrl+End) deixava as seções saltadas presas em opacity: 0, porque
     elas nunca chegavam a cruzar o limiar. */
  function revelarVisiveis() {
    if (!pendentes.length) return;
    var alturaJanela = window.innerHeight || document.documentElement.clientHeight;
    var limite = alturaJanela * 0.88;
    var restantes = [];
    for (var i = 0; i < pendentes.length; i++) {
      if (pendentes[i].getBoundingClientRect().top < limite) pendentes[i].classList.add('is-in');
      else restantes.push(pendentes[i]);
    }
    pendentes = restantes;
  }

  /* ---------- Vídeo ----------
     O arquivo é servido pelo próprio site. O embed do YouTube
     devolvia Erro 153 em qualquer origin que não fosse um domínio
     liberado — abrir o arquivo direto, por exemplo, nunca funcionava.
     Com o player nativo ele roda em qualquer lugar.

     preload="none": o arquivo só começa a baixar quando toca, e
     daí em diante vem em streaming (o mp4 está com faststart). */

  var player = document.querySelector('.tr-player');

  if (player) {
    var jaTocou = false;

    function tocar() {
      if (jaTocou) return;
      jaTocou = true;
      player.setAttribute('preload', 'auto');
      var tentativa = player.play();
      if (tentativa && typeof tentativa.catch === 'function') {
        // Se o navegador recusar o autoplay, o pôster e os controles
        // continuam ali: o visitante dá play quando quiser.
        tentativa.catch(function () { jaTocou = false; });
      }
    }

    if ('IntersectionObserver' in window) {
      var obsPlayer = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) tocar();
          else if (!player.paused && e.intersectionRatio === 0) player.pause();
        });
      }, { threshold: [0, 0.4] });
      obsPlayer.observe(player);
    } else {
      tocar();
    }
  }

  /* ---------- Peças da composição ----------
     Clicar numa peça traz ela para a frente das irmãs daquela
     coluna. É o gesto de remexer numa pilha de fotos sobre a mesa. */

  Array.prototype.forEach.call(document.querySelectorAll('.tr-col-art'), function (coluna) {
    var pecas = coluna.querySelectorAll('.tr-peca');

    Array.prototype.forEach.call(pecas, function (peca) {
      peca.addEventListener('click', function () {
        Array.prototype.forEach.call(pecas, function (outra) {
          outra.classList.toggle('is-frente', outra === peca);
        });
      });
    });
  });

  /* ---------- Rolagem suave até o vídeo ----------
     A animação é feita à mão, quadro a quadro. O site define
     `overflow-x: clip` no <body> (style.css), e com isso o Chrome
     ignora `scroll-behavior: smooth` — até window.scrollTo com
     behavior:"smooth" salta de uma vez. Animar aqui resolve sem
     precisar mexer no overflow de todas as páginas. */

  var FOLGA = 110;   // altura do cabeçalho fixo
  // A duração acompanha a distância: percurso longo leva mais tempo,
  // senão ele cruza 3.000px num piscar e parece teletransporte.
  var VEL = 0.44;        // ms por pixel
  var MIN = 700;
  var MAX = 2400;
  var rolando = null;

  function suavizar(t) {
    // ease-in-out cúbica
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function rolarAte(el) {
    var inicio = window.pageYOffset;
    var destino = inicio + el.getBoundingClientRect().top - FOLGA;
    var limite = document.documentElement.scrollHeight - window.innerHeight;
    destino = Math.max(0, Math.min(limite, destino));

    /* Mesmo com 'reduzir movimento' ligado no sistema, aqui continua
       rolando: o deslocamento foi PEDIDO pelo visitante ao clicar no
       botao, e saltar direto desorienta mais do que rolar. O que muda
       e o ritmo — o percurso fica mais curto. */

    var distancia = Math.abs(destino - inicio);
    var vel = semMovimento ? VEL * 0.55 : VEL;
    var duracao = Math.max(semMovimento ? 450 : MIN, Math.min(MAX, distancia * vel));

    var t0 = null;
    if (rolando) cancelAnimationFrame(rolando);

    function passo(agora) {
      if (t0 === null) t0 = agora;
      var t = Math.min(1, (agora - t0) / duracao);
      window.scrollTo(0, inicio + (destino - inicio) * suavizar(t));
      if (t < 1) rolando = requestAnimationFrame(passo);
      else rolando = null;
    }
    rolando = requestAnimationFrame(passo);
  }

  var atalhos = document.querySelectorAll('a[href^="#"]');
  Array.prototype.forEach.call(atalhos, function (a) {
    a.addEventListener('click', function (e) {
      var alvoEl = document.querySelector(a.getAttribute('href'));
      if (!alvoEl) return;
      e.preventDefault();
      rolarAte(alvoEl);
    });
  });

  // Quem chega pela URL com #video também entra suave.
  if (location.hash) {
    var deLink = document.querySelector(location.hash);
    if (deLink) setTimeout(function () { rolarAte(deLink); }, 120);
  }

  /* ---------- Ligações ---------- */

  var agendado = false;
  function aoRolar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(function () {
      agendado = false;
      atualizar();
      revelarVisiveis();
    });
  }

  var tempo;
  function aoRedimensionar() {
    clearTimeout(tempo);
    tempo = setTimeout(construir, 140);
  }

  construir();
  prepararEntradas();

  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRedimensionar);
  window.addEventListener('load', construir);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(construir);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(aoRedimensionar).observe(root);
  }
})();


/* ============================================================
   RAIZYS — FORMULÁRIO DA PÁGINA DE CAMPANHA
   ------------------------------------------------------------
   O lead é o objetivo da página inteira, então este bloco roda
   isolado do script da trilha: um erro no traçado não pode
   impedir alguém de pedir a demonstração.

   A conversão do Google Ads dispara na MENSAGEM DE SUCESSO, e
   não no clique em Enviar — é o que o descritivo pede, e é a
   única leitura que não conta quem desistiu no meio.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('trForm');
  if (!form) return;

  var caixaOk = document.getElementById('trSucesso');
  var erro = document.getElementById('trErro');
  var botao = document.getElementById('trEnviar');
  var whats = document.getElementById('trWhats');

  /* ---------- Origem do lead ----------

     O comercial precisa saber de que anúncio veio cada contato.
     Os parâmetros só existem na URL de chegada; quem navega pela
     página e volta perderia tudo, por isso ficam guardados na
     sessão do navegador. */

  var CHAVE = 'raizys-origem-transportadora';

  function guardarOrigem() {
    var busca = new URLSearchParams(window.location.search);
    var achou = {};
    var mapa = {
      origem_campanha: ['utm_campaign', 'campaignid'],
      origem_grupo: ['utm_content', 'adgroupid'],
      origem_palavra: ['utm_term', 'keyword'],
      origem_gclid: ['gclid', 'gbraid', 'wbraid']
    };

    Object.keys(mapa).forEach(function (campo) {
      for (var i = 0; i < mapa[campo].length; i++) {
        var v = busca.get(mapa[campo][i]);
        if (v) { achou[campo] = v; return; }
      }
    });

    var fonte = busca.get('utm_source');
    if (fonte && !achou.origem_campanha) achou.origem_campanha = fonte;

    if (!Object.keys(achou).length) return lerOrigem();

    try { sessionStorage.setItem(CHAVE, JSON.stringify(achou)); } catch (e) { /* aba anônima */ }
    return achou;
  }

  function lerOrigem() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE) || '{}'); } catch (e) { return {}; }
  }

  var origem = guardarOrigem();
  Object.keys(origem).forEach(function (campo) {
    var el = form.querySelector('[name="' + campo + '"]');
    if (el) el.value = origem[campo];
  });

  var ref = form.querySelector('[name="origem_referencia"]');
  if (ref) ref.value = document.referrer || 'direto';

  /* ---------- Máscara do telefone ---------- */

  if (whats) {
    whats.addEventListener('input', function () {
      var d = whats.value.replace(/\D/g, '').slice(0, 11);
      if (d.length <= 2) whats.value = d;
      else if (d.length <= 6) whats.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      else if (d.length <= 10) whats.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      else whats.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    });
  }

  function avisar(msg) {
    if (!erro) return;
    erro.textContent = msg;
    erro.hidden = false;
  }

  /* ---------- Envio ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (erro) erro.hidden = true;
    form.classList.add('foi-enviado');

    // `novalidate` no HTML é de propósito: assim a mensagem do
    // navegador não aparece antes de marcarmos os campos.
    if (!form.checkValidity()) {
      var primeiro = form.querySelector(':invalid');
      if (primeiro) primeiro.focus();
      avisar('Faltou preencher um campo obrigatório.');
      return;
    }

    var digitos = (whats ? whats.value : '').replace(/\D/g, '');
    if (digitos.length < 10) {
      whats.focus();
      avisar('Informe um telefone com DDD, por exemplo (11) 99999-9999.');
      return;
    }

    var rotuloBotao = botao.innerHTML;
    botao.disabled = true;
    botao.textContent = 'Enviando...';

    var dados = new FormData(form);
    dados.append('replyto', form.querySelector('[name="email"]').value);

    fetch(form.action, { method: 'POST', body: dados })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (r) {
        if (r && (r.success === true || r.success === 'true')) return concluir();
        throw new Error((r && r.message) || 'envio não confirmado');
      })
      .catch(function () {
        botao.disabled = false;
        botao.innerHTML = rotuloBotao;
        avisar('Não conseguimos enviar agora. Tente outra vez ou fale com a gente pelo WhatsApp aqui ao lado.');
      });
  });

  function concluir() {
    form.hidden = true;
    if (caixaOk) {
      caixaOk.hidden = false;
      caixaOk.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    /* O tracking.js escuta este evento. É aqui, e não no clique em
       Enviar, que existe um lead de verdade. */
    try {
      window.dispatchEvent(new CustomEvent('raizys:lead-form', {
        detail: { formulario: 'transportadora' }
      }));
    } catch (err) {
      console.warn('[Raizys] nao deu para avisar o tracking:', err);
    }
  }
})();


/* ============================================================
   RAIZYS — EVENTOS DE DIAGNÓSTICO DA PÁGINA
   ------------------------------------------------------------
   Não são conversões: servem para o descritivo saber qual bloco
   convence e para montar público de remarketing. Só saem se a
   tag do Google estiver de pé.
   ============================================================ */
(function () {
  'use strict';

  function evento(nome, dados) {
    if (window.RaizysTracking && window.RaizysTracking.evento) {
      window.RaizysTracking.evento(nome, dados);
    }
  }

  /* Qual botão "Agendar demonstração" levou a pessoa ao formulário.
     O bloco de origem é o que diferencia um clique do outro. */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var a = e.target.closest('a[href="#agendar"]');
    if (!a) return;

    var secao = a.closest('section');
    evento('agendar_demonstracao', {
      bloco: (secao && (secao.getAttribute('aria-label') || secao.className)) || 'sem bloco'
    });
  }, true);

  /* Vídeo assistido além da metade — público de remarketing. */
  var player = document.querySelector('.tr-player');
  if (player) {
    var avisado = false;
    player.addEventListener('timeupdate', function () {
      if (avisado || !player.duration) return;
      if (player.currentTime / player.duration < 0.5) return;
      avisado = true;
      evento('video_metade', { video: 'modulo-transporte' });
    });
  }
})();


/* ============================================================
   RAIZYS — BOTÃO FLUTUANTE FORA DO CAMINHO
   ------------------------------------------------------------
   Ele fica fixo no canto, e no fim da página isso cobria o botão
   de enviar e os links de privacidade e termos. Nessas duas
   seções ele se recolhe; no resto da página continua lá.
   ============================================================ */
(function () {
  'use strict';

  var botao = document.querySelector('.tr-wa-wrapper');
  if (!botao || !('IntersectionObserver' in window)) return;

  var zonas = [document.getElementById('agendar'), document.querySelector('footer.trf')]
    .filter(Boolean);
  if (!zonas.length) return;

  var dentro = 0;

  var obs = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { dentro += e.isIntersecting ? 1 : -1; });
    if (dentro < 0) dentro = 0;
    botao.classList.toggle('is-off', dentro > 0);
  }, { threshold: 0 });

  zonas.forEach(function (z) { obs.observe(z); });
})();


/* ============================================================
   RAIZYS — O VÍDEO DO HERO TEM DE TOCAR
   ------------------------------------------------------------
   `autoplay muted playsinline` basta na maioria dos casos, mas não
   em todos: economia de bateria, "reduzir movimento" do sistema e
   algumas versões de navegador recusam o play automático. Quando
   recusam, o que sobra na tela é um retângulo parado com o botão de
   play — foi o que apareceu no ar.

   Aqui o play é pedido de novo quando a aba volta a ficar visível e
   no primeiro toque ou rolagem da pessoa, que é quando o navegador
   passa a permitir. Se mesmo assim não tocar, o pôster continua lá:
   nada quebra.
   ============================================================ */
(function () {
  'use strict';

  var video = document.querySelector('.tr-hero-video');
  if (!video) return;

  var tentando = false;

  function tocar() {
    if (tentando || !video.paused) return;
    tentando = true;
    var t = video.play();
    if (t && typeof t.catch === 'function') t.catch(function () {});
    setTimeout(function () { tentando = false; }, 400);
  }

  tocar();
  window.addEventListener('load', tocar);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tocar();
  });

  /* O primeiro gesto da pessoa libera o play em qualquer navegador. */
  ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, tocar, { once: true, passive: true });
  });
})();


/* ============================================================
   RAIZYS — BALÃO DE FALA DO WHATSAPP
   ------------------------------------------------------------
   Mesmo comportamento da gestão-web: o balão aparece sozinho e,
   se a pessoa fechar, fica fechado pelo resto da sessão. Fechar
   de novo a cada rolagem é o tipo de insistência que faz a pessoa
   sair da página.
   ============================================================ */
(function () {
  'use strict';

  var balao = document.getElementById('trWaBubble');
  var fechar = document.getElementById('trWaBubbleClose');
  if (!balao || !fechar) return;

  var CHAVE = 'raizys_wa_bubble_dismissed';

  try {
    if (sessionStorage.getItem(CHAVE) === 'true') balao.classList.add('esta-fechado');
  } catch (e) { /* aba anônima */ }

  fechar.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    balao.classList.add('esta-fechado');
    try { sessionStorage.setItem(CHAVE, 'true'); } catch (err) { /* aba anônima */ }
  });
})();


/* ============================================================
   RAIZYS — MOVIMENTO DA PÁGINA (GSAP)
   ------------------------------------------------------------
   Tudo aqui é acréscimo: a página já entrega o conteúdo sem GSAP
   (a revelação por classe continua funcionando). Se o arquivo não
   carregar, nada some — só deixa de se mexer.

   "Menos movimento" encurta as durações em vez de desligar. Quem
   tem efeitos de animação desligados no Windows cai nessa
   preferência sem pedir, e uma página congelada não é acessível,
   é quebrada.
   ============================================================ */
(function () {
  'use strict';

  var gsap = window.gsap;
  if (!gsap) {
    /* Sem GSAP não há animação nenhuma para montar, e o hero não
       pode ficar escondido esperando. O setTimeout do <head> também
       tiraria a marca, mas aqui sai na hora. */
    document.documentElement.classList.remove('tr-pre');
    return;
  }

  var curto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f = curto ? 0.45 : 1;           // fator de duração
  var temST = !!window.ScrollTrigger;
  if (temST) gsap.registerPlugin(window.ScrollTrigger);

  /* Atalho: anima quando o elemento entra na tela, uma vez só. */
  function aoEntrar(alvo, de, extras) {
    var el = typeof alvo === 'string' ? document.querySelectorAll(alvo) : alvo;
    if (!el || (el.length === 0)) return;
    var conf = Object.assign({
      duration: 0.8 * f,
      ease: 'power3.out',
      scrollTrigger: temST ? { trigger: el[0] || el, start: 'top 85%', once: true } : undefined
    }, extras || {});
    gsap.from(el, Object.assign(conf, de));
  }

  /* ---------- Hero ----------
     Entra sozinho ao carregar, de baixo para cima, na ordem da
     leitura. */
  var hero = document.querySelector('.tr-hero');
  if (hero) {
    /* A ORDEM aqui não é detalhe. O <head> marcou o <html> com
       'tr-pre' e o CSS zerou a opacidade das peças do hero, para que
       elas não aparecessem antes deste script rodar (defer, numa
       página com vídeo, é quase 2s depois). Se o gsap.from fosse
       montado com a marca ainda no lugar, o valor de CHEGADA que ele
       gravaria seria o zero do CSS — e o hero animaria de invisível
       para invisível. Então a marca sai primeiro, no mesmo quadro. */
    /* Se a rede de segurança do <head> já tirou a marca — página
       pesada, conexão ruim —, o hero JÁ ESTÁ À VISTA. Animar agora
       significaria apagá-lo e trazê-lo de volta: a piscada que esta
       marca existe para evitar. Nesse caso a animação é abandonada,
       e o hero fica como está. */
    var podeAnimar = document.documentElement.classList.contains('tr-pre');
    document.documentElement.classList.remove('tr-pre');

    var linha = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: !podeAnimar });

    if (podeAnimar) linha
      .from(hero.querySelector('h1'), { y: 36, opacity: 0, duration: 1.0 * f })
      /* O amarelo chega depois da manchete assentar: a frase se lê
         inteira e só então "lucro real" acende. */
      .fromTo(hero.querySelectorAll('.tr-hl'),
              { color: '#F7F9FF' },
              { color: '#FFD43B', duration: 0.55 * f }, '-=0.3')
      .from(hero.querySelector('.tr-hero-sub'), { y: 22, opacity: 0, duration: 0.8 * f }, '-=0.55')
      .from(hero.querySelectorAll('.tr-actions > *'),
            { y: 20, opacity: 0, duration: 0.7 * f, stagger: 0.1 * f }, '-=0.5')
      .from(hero.querySelectorAll('.tr-fx-selos li'),
            { y: 14, opacity: 0, duration: 0.55 * f, stagger: 0.09 * f }, '-=0.45');

    /* O fundo clareia junto, do preto para os 0.52 que o CSS define.
       Aqui o gsap.from é seguro: a opacidade do vídeo vem de uma
       regra fixa, não de uma classe que entra depois. */
    var fundo = hero.querySelector('.tr-hero-video');
    if (fundo && !curto && podeAnimar) linha.from(fundo, { opacity: 0, duration: 1.5 * f }, 0);

    /* Sem parallax de saída: o hero não sai mais de cena rolando, ele
       fica parado e é coberto. A faixa de rolagem que o parallax
       media deixou de existir. */
  }

  /* ---------- A frase responde ao mouse ----------
     Camadas em profundidades diferentes seguem o cursor: a manchete
     anda mais, o apoio menos, e a mancha anda ao CONTRÁRIO. É a
     diferença entre elas que o olho lê como profundidade.

     Não é 3D de verdade: são 3 graus de rotação sobre a perspectiva
     que o CSS põe no pai. Mais que isso e a letra começa a distorcer.

     Cada camada tem sua propriedade: a manchete mexe em x, y e
     rotação na .tr-cam (que a entrada da página não toca), e o resto
     só em x — porque y ali é da animação de entrada. Duas animações
     na mesma propriedade do mesmo elemento é como uma zera a outra.

     Só onde existe mouse de verdade. Com "menos movimento" a
     amplitude cai pela metade, mas não some: é um gesto conduzido
     pela pessoa, não algo que acontece sozinho.                   */
  var temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var camada = document.querySelector('.tr-hero .tr-cam');

  if (camada && temMouse && window.matchMedia('(min-width: 901px)').matches) {
    var amp = curto ? 0.45 : 1;
    var suave = { duration: 0.9, ease: 'power3' };

    function mover(alvo, prop) {
      return alvo ? gsap.quickTo(alvo, prop, suave) : function () {};
    }

    var camX = mover(camada, 'x');
    var camY = mover(camada, 'y');
    var camRY = mover(camada, 'rotationY');
    var camRX = mover(camada, 'rotationX');

    var apoio = document.querySelector('.tr-hero .tr-hero-sub');
    var botoes = document.querySelector('.tr-hero .tr-actions');
    var selos = document.querySelector('.tr-hero .tr-selos');

    var apoioX = mover(apoio, 'x');
    var botoesX = mover(botoes, 'x');
    var selosX = mover(selos, 'x');

    var borroes = Array.prototype.slice.call(document.querySelectorAll('.tr-mancha i'));
    var borroesXY = borroes.map(function (b) {
      return { x: gsap.quickTo(b, 'x', { duration: 1.4, ease: 'power3' }),
               y: gsap.quickTo(b, 'y', { duration: 1.4, ease: 'power3' }) };
    });

    var hero = document.querySelector('.tr-hero');

    /* O pincel. Ele é o único que segue o cursor de verdade — e com
       atraso maior que o resto, que é o que faz parecer tinta sendo
       passada em vez de um ponteiro. */
    var pincel = document.querySelector('.tr-pincel');
    var pinX = mover(pincel, 'x');
    var pinY = mover(pincel, 'y');
    var pinOp = pincel ? gsap.quickTo(pincel, 'opacity', { duration: 0.5, ease: 'power2' }) : function () {};
    var pincelAceso = false;

    if (pincel) {
      gsap.set(pincel, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      pinX = gsap.quickTo(pincel, 'x', { duration: 1.1, ease: 'power3' });
      pinY = gsap.quickTo(pincel, 'y', { duration: 1.1, ease: 'power3' });
    }

    function seguir(e) {
      var r = hero.getBoundingClientRect();
      // -0.5 a 0.5, medido dentro do hero
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;

      camX(nx * 40 * amp);
      camY(ny * 18 * amp);
      camRY(nx * 3.4 * amp);
      camRX(-ny * 2.6 * amp);

      apoioX(nx * 22 * amp);
      botoesX(nx * 14 * amp);
      selosX(nx * 9 * amp);

      borroesXY.forEach(function (b, k) {
        var peso = (k + 1) * 14 * amp;
        b.x(-nx * peso);
        b.y(-ny * peso * 0.6);
      });

      if (pincel) {
        // posição dentro do hero, não da janela
        pinX(e.clientX - r.left);
        pinY(e.clientY - r.top);
        if (!pincelAceso) { pincelAceso = true; pinOp(1); }
      }
    }

    function soltar() {
      camX(0); camY(0); camRY(0); camRX(0);
      apoioX(0); botoesX(0); selosX(0);
      borroesXY.forEach(function (b) { b.x(0); b.y(0); });
      if (pincel) { pincelAceso = false; pinOp(0); }
    }

    window.addEventListener('mousemove', seguir, { passive: true });
    document.addEventListener('mouseleave', soltar);
  }

  /* ---------- Títulos das seções ---------- */
  document.querySelectorAll('.tr-h2').forEach(function (h) {
    if (!temST) return;
    gsap.from(h, {
      y: 22,
      opacity: 0,
      duration: 0.7 * f,
      ease: 'power3.out',
      scrollTrigger: { trigger: h, start: 'top 88%', once: true }
    });
  });

  /* ---------- 01 · a passagem pela estrada ----------
     Sem arrastar painel nenhum. O hero fica grudado no topo (sticky
     no CSS) e a seção sobe por cima dele; a emenda entre os dois é
     uma faixa de asfalto com as marcações da pista correndo, que o
     CSS anima sozinho. O resultado é um trecho de estrada passando,
     que é o que a página inteira fala.

     Aqui o JS só cuida de quem entra em cena depois: o texto, o
     cupom, as três pistas e a faixa final.                       */
  var secaoDores = document.querySelector('.tr-dores');

  if (secaoDores && temST) {
    var topoDores = secaoDores.querySelector('.tr-dores-topo');
    var cupom = secaoDores.querySelector('.tr-cupom');

    if (topoDores) {
      var tlTopo = gsap.timeline({
        scrollTrigger: { trigger: topoDores, start: 'top 82%', once: true }
      });

      tlTopo.from(secaoDores.querySelectorAll('.tr-dores-txt > *'), {
        y: 28, opacity: 0, duration: 0.6 * f, ease: 'power3.out', stagger: 0.08 * f
      });

      /* O cupom chega da beira direita, como quem passa na pista ao
         lado. 2.5deg é a inclinação que o CSS dá a ele. */
      if (cupom) {
        tlTopo.from(cupom, {
          xPercent: 26, rotate: 8, opacity: 0,
          duration: 0.85 * f, ease: 'power3.out'
        }, '-=0.45');
      }
    }

    var selo = secaoDores.querySelector('.tr-cupom-selo');
    var vazio = secaoDores.querySelector('.tr-cupom-vazio');

    if (selo || vazio) {
      window.ScrollTrigger.create({
        trigger: cupom || secaoDores,
        start: 'top 62%',
        once: true,
        onEnter: function () {
          var tlSelo = gsap.timeline();
          /* O rotate de chegada é o que o CSS já define (-4deg no
             selo): o GSAP lê o transform atual como destino. */
          if (selo) tlSelo.from(selo, { scale: 2.6, rotate: -26, opacity: 0, duration: 0.38 * f, ease: 'back.out(2.2)' });
          if (vazio) tlSelo.from(vazio, { scale: 2.2, opacity: 0, duration: 0.42 * f, ease: 'back.out(2)' }, '-=0.14');
        }
      });
    }

    var pistas = secaoDores.querySelectorAll('.tr-dor-item');
    if (pistas.length) {
      gsap.from(pistas, {
        y: 26, opacity: 0, duration: 0.55 * f, ease: 'power3.out', stagger: 0.1 * f,
        scrollTrigger: { trigger: pistas[0], start: 'top 88%', once: true }
      });
    }

    var pilula = secaoDores.querySelector('.tr-pilula');
    if (pilula) {
      gsap.from(pilula, {
        scaleX: 0.78, opacity: 0, duration: 0.6 * f, ease: 'power3.out',
        scrollTrigger: { trigger: pilula, start: 'top 92%', once: true }
      });
    }
  }

  /* ---------- 02 · a travessia e o acendimento ----------

     A seção vem da direita, COBRINDO A TELA INTEIRA, com a trilha
     parada atrás. Uma linha do tempo presa, duas fases em ordem:

       0   → 0.42   a seção atravessa e cobre a tela
       0.5 → 1      a estrada avança e acende as notas, uma a uma

     Quem é PRESO é o palco inteiro (trilha + corredor), não a seção:
     o pin reescreve posição e apagaria o transform de quem segura;
     e prendendo o palco a trilha congela junto, sem um segundo pin.

     Isso vale em TODA tela, inclusive celular. Eu tinha deixado o
     celular de fora achando que pin em tela de toque engasga, e o
     resultado foi o defeito: sem o pin a seção não cobria nada, ela
     só deslizava de lado no lugar onde já estava, com a seção
     anterior aparecendo por cima. Pin no celular funciona; o que
     atrapalha lá é a barra do navegador aparecendo e sumindo, e
     para isso existe o ignoreMobileResize logo abaixo.           */
  var fiscal = document.querySelector('.tr-fiscal');
  var corredor = document.querySelector('.tr-corredor');
  var palco2 = document.querySelector('.tr-passagem2');
  var fx = document.querySelector('.tr-fx');
  var cheia = fx && fx.querySelector('.tr-fx-estrada-cheia');
  var colunas = fx ? Array.prototype.slice.call(fx.querySelectorAll('.tr-fx-col')) : [];

  /* Os centros das colunas são medidos UMA vez por refresh.

     Antes eu lia getBoundingClientRect() da seção e de cada coluna
     dentro do onUpdate: quatro leituras de layout por quadro, logo
     depois de o GSAP ter escrito estilo. Ler depois de escrever
     obriga o navegador a refazer o layout na hora, todo quadro —
     era daí que vinha o engasgo. Agora o onUpdate não lê nada. */
  var centros = [];
  var acesa = [];
  function medir() {
    centros = [];
    if (!fx || !colunas.length) return;
    var rf = fx.getBoundingClientRect();
    if (!rf.width || !rf.height) return;

    /* Lado a lado a ordem é da esquerda para a direita; empilhadas,
       de cima para baixo. Sem isso, no celular as três notas têm o
       mesmo centro horizontal e acendem todas no mesmo instante. */
    var empilhado = colunas.length > 1 &&
      Math.abs(colunas[1].getBoundingClientRect().left -
               colunas[0].getBoundingClientRect().left) < 2;

    colunas.forEach(function (col) {
      var r = col.getBoundingClientRect();
      centros.push(empilhado
        ? (r.top + r.height / 2 - rf.top) / rf.height
        : (r.left + r.width / 2 - rf.left) / rf.width);
    });
  }

  function acender(p) {
    for (var k = 0; k < centros.length; k++) {
      var deve = p >= centros[k];
      if (acesa[k] === deve) continue;      // só escreve quando muda
      acesa[k] = deve;
      colunas[k].classList.toggle('is-aceso', deve);
      var papel = colunas[k].querySelector('.tr-fx-papel');
      if (papel) papel.classList.toggle('is-aceso', deve);
    }
  }

  /* Um só ponto escreve o avanço da estrada: uma escrita, zero
     leituras. É isso que faz o scrub ficar liso. */
  var marcha = { p: 0 };
  function marchar() {
    if (cheia) cheia.style.width = (marcha.p * 100).toFixed(2) + '%';
    acender(marcha.p);
  }

  if (fiscal && corredor && palco2 && temST) {
    /* A barra de endereço do celular aparece e some enquanto a
       pessoa rola. Isso dispara um resize, o ScrollTrigger refaz as
       contas no meio da travessia e o conteúdo pula. */
    window.ScrollTrigger.config({ ignoreMobileResize: true });

    var estreito = window.matchMedia('(max-width: 900px)').matches;

    gsap.set(fiscal, { xPercent: 100, force3D: true });
    marchar();
    window.ScrollTrigger.addEventListener('refresh', medir);
    medir();

    var tlFiscal = gsap.timeline({
      scrollTrigger: {
        trigger: corredor,
        pin: palco2,
        start: 'top top',
        /* No celular a travessia é mais curta: o mesmo trecho pedido
           no PC viraria um arrastar longo demais no dedo. */
        end: function () {
          return '+=' + Math.round(window.innerHeight *
            (window.matchMedia('(max-width: 900px)').matches ? 1 : 1.35));
        },
        pinSpacing: true,
        anticipatePin: 1,
        fastScrollEnd: true,
        scrub: curto ? 0.2 : 0.25,
        invalidateOnRefresh: true,
        /* Avisa o navegador só enquanto a travessia acontece:
           will-change ligado o tempo todo custa memória à toa. */
        onToggle: function (s) {
          fiscal.style.willChange = s.isActive ? 'transform' : '';
        }
      }
    });

    tlFiscal.to(fiscal, { xPercent: 0, ease: 'none', duration: 0.42 }, 0);
    tlFiscal.to(marcha, { p: 1, ease: 'none', duration: 0.5, onUpdate: marchar }, 0.5);

    var selos = document.querySelectorAll('.tr-fx-selos li');
    if (selos.length) {
      gsap.from(selos, {
        y: 16, opacity: 0, duration: 0.45 * f, ease: 'power2.out', stagger: 0.045 * f,
        scrollTrigger: { trigger: selos[0], start: 'top 92%', once: true, pinnedContainer: palco2 }
      });
    }
  }

  /* ---------- 03 · como funciona ----------
     O trilho se desenha e cada ponto aparece quando a linha passa
     por ele; os números sobem atrás. */
  var tempo = document.querySelector('.tr-linha-tempo');
  if (tempo && temST) {
    var trilho = tempo.querySelector('.tr-linha-tempo-trilho');
    var tlTempo = gsap.timeline({ scrollTrigger: { trigger: tempo, start: 'top 80%', once: true } });

    if (trilho) {
      tlTempo.from(trilho, { scaleX: 0, duration: 0.95 * f, ease: 'power2.inOut' });
    }

    tlTempo.from(tempo.querySelectorAll('.tr-etapa-ponto'), {
      scale: 0, duration: 0.35 * f, ease: 'back.out(2.4)', stagger: 0.12 * f
    }, '-=0.72');

    tlTempo.from(tempo.querySelectorAll('.tr-etapa > b'), {
      y: 30, opacity: 0, duration: 0.55 * f, ease: 'power3.out', stagger: 0.11 * f
    }, '-=0.7');

    tlTempo.from(tempo.querySelectorAll('.tr-etapa > h3, .tr-etapa > p'), {
      y: 18, opacity: 0, duration: 0.45 * f, ease: 'power2.out', stagger: 0.05 * f
    }, '-=0.55');

    /* O cartão navy não mora mais no 04: ele ANDA. Começa no 01 e
       passa para o seguinte conforme a pessoa rola, como quem
       percorre as etapas uma de cada vez. */
    var etapas = Array.prototype.slice.call(tempo.querySelectorAll('.tr-etapa'));

    if (etapas.length) {
      etapas[0].classList.add('is-ativa');

      window.ScrollTrigger.create({
        trigger: tempo,
        start: 'top 72%',
        end: 'bottom 40%',
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          /* progresso 0..1 repartido entre as etapas; o Math.min
             segura o índice no último quando chega a 1 exato. */
          var i = Math.min(etapas.length - 1, Math.floor(self.progress * etapas.length));
          etapas.forEach(function (e, k) { e.classList.toggle('is-ativa', k === i); });
        }
      });
    }
  }

  /* ---------- 04 · financeiro ---------- */
  var bento = document.querySelector('.tr-bento');
  if (bento && temST) {
    gsap.from(bento.querySelectorAll('.tr-bento-cel'), {
      y: 30, opacity: 0, duration: 0.6 * f, ease: 'power3.out', stagger: 0.09 * f,
      scrollTrigger: { trigger: bento, start: 'top 82%', once: true }
    });
  }

  var conector = document.querySelector('.tr-conector-linha');
  if (conector && temST) {
    gsap.from(conector, {
      scaleX: 0, duration: 0.8 * f, ease: 'power2.inOut',
      scrollTrigger: { trigger: conector, start: 'top 92%', once: true }
    });
  }

  /* ---------- 05 · frota ----------
     A barra de óleo enche até onde o veículo está. Parada em 82% ela
     é desenho; enchendo, é a informação do bloco. */
  var painel = document.querySelector('.tr-painel');
  if (painel && temST) {
    var tlFrota = gsap.timeline({ scrollTrigger: { trigger: painel, start: 'top 82%', once: true } });

    tlFrota.from(painel, { y: 40, opacity: 0, duration: 0.7 * f, ease: 'power3.out' });

    var barra = painel.querySelector('.tr-barra i');
    if (barra) {
      var ate = barra.style.width || '82%';
      tlFrota.fromTo(barra, { width: '0%' }, { width: ate, duration: 1.0 * f, ease: 'power2.out' }, '-=0.3');
    }

    tlFrota.from(painel.querySelectorAll('.tr-painel-linha'), {
      x: -18, opacity: 0, duration: 0.45 * f, ease: 'power2.out', stagger: 0.1 * f
    }, '-=0.7');
  }

  var blocoFrota = document.querySelector('.tr-frota-bloco');
  if (blocoFrota && temST) {
    gsap.from(blocoFrota, {
      scaleX: 0.3, opacity: 0, transformOrigin: 'left center',
      duration: 0.9 * f, ease: 'power3.out',
      scrollTrigger: { trigger: blocoFrota, start: 'top 85%', once: true }
    });
  }

  /* ---------- 14 · perguntas ---------- */
  aoEntrar('.tr-faq-item', { y: 18, opacity: 0, stagger: 0.07 * f, duration: 0.5 * f });

  /* ---------- 15 · o cartão do formulário ---------- */
  var cartao = document.querySelector('.tr-form-card');
  if (cartao && temST) {
    gsap.from(cartao, {
      y: 34,
      opacity: 0,
      duration: 0.8 * f,
      ease: 'power3.out',
      scrollTrigger: { trigger: cartao, start: 'top 86%', once: true }
    });
  }

  /* A trilha é desenhada por JS depois das fontes carregarem; sem
     isso o ScrollTrigger guarda posições de antes e os gatilhos
     disparam no lugar errado. */
  if (temST) {
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
    }
  }
})();
