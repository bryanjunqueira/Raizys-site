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

  function atualizar() {
    if (!total) return;

    var r = root.getBoundingClientRect();
    var alturaJanela = window.innerHeight || document.documentElement.clientHeight;

    /* O avanço vai do topo da seção até a ÚLTIMA PARADA, não até o pé
       da seção. A trilha termina na parada, então medir até o fim
       deixava ela (e o texto que acende com ela) só completando
       depois do vídeo, fora da tela.
       Mapear para o comprimento — e não para a altura — mantém o
       ritmo constante também nos laços. */
    var fimUtil = yUltimaParada || r.height;
    var p = (alturaJanela * 0.62 - r.top) / Math.max(1, fimUtil);
    p = Math.max(0, Math.min(1, p));
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

  /* ---------- Entrada dos blocos ---------- */

  var pendentes = [];

  function prepararEntradas() {
    pendentes = []
      .concat(linhas)
      .concat(Array.prototype.slice.call(document.querySelectorAll('.tr-gauge, .tr-placa')));

    Array.prototype.forEach.call(
      document.querySelectorAll('.tr-gauge, .tr-placa'),
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
