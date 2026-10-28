/* ==========================================================================
   Juan Pablo Montalva Peroni — comportamiento del sitio
   Requiere (en este orden, ver index.html): jQuery, Magnific Popup, WOW,
   Vimeo Player, lightGallery y su plugin de video.

   1. Precarga
   2. Animación de entrada al hacer scroll
   3. Portada: cambio de imagen al pasar el mouse (en pantallas táctiles,
      las imágenes cambian solas)
   4. Fotos: visor Magnific Popup (y carrusel en 4b)
   5. Videos: visor lightGallery
   6. Videos de la página: se pausan cuando no están en pantalla
   ========================================================================== */

(function ($) {
  'use strict';

  /* 1. Precarga: se oculta cuando terminó de cargar la página */
  $(window).on('load', function () {
    $('.preloader').fadeOut(1000);
  });


  /* 2. Animación de entrada (WOW.js + animate.css, clases "wow fadeInUp") */
  new WOW({ mobile: false }).init();


  /* 3. Portada: cada franja muestra su imagen (atributo data-bg) */
  var cover = document.querySelector('.cover');
  var ACTIVE = 'cover-active';
  var slices = Array.prototype.slice.call(document.querySelectorAll('.cover button'));
  var isTouch = window.matchMedia('(hover: none)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function preload(src) {
    var img = new Image();
    img.src = src;
  }

  if (!isTouch) {
    slices.forEach(function (slice) {
      preload(slice.dataset.bg);   // para que el cambio sea inmediato

      slice.addEventListener('mouseenter', function () {
        cover.style.backgroundImage = 'url(' + slice.dataset.bg + ')';
        document.body.classList.add(ACTIVE);
      });

      slice.addEventListener('mouseleave', function () {
        document.body.classList.remove(ACTIVE);
      });
    });
  } else if (!reduceMotion && slices.length > 1) {
    // Sin mouse no hay "pasar por encima": las imágenes cambian solas.
    // Se precarga sólo la siguiente, para no bajar las 29 de una vez.
    var COVER_MS = 2500;
    var current = 0;
    preload(slices[1].dataset.bg);

    setInterval(function () {
      current = (current + 1) % slices.length;
      cover.style.backgroundImage = 'url(' + slices[current].dataset.bg + ')';
      preload(slices[(current + 1) % slices.length].dataset.bg);
    }, COVER_MS);
  }


  /* 4. Fotos: todas las fotos del sitio forman una sola galería navegable */
  // Al abrirse, el visor lleva la página arriba; al cerrarse se vuelve al
  // punto de partida sin la animación de scroll suave.
  var photoScrollY = 0;

  $('.image-popup').magnificPopup({
    callbacks: {
      beforeOpen: function () {
        photoScrollY = window.scrollY;
      },
      afterClose: function () {
        window.scrollTo({ top: photoScrollY, behavior: 'instant' });
      }
    },
    type: 'image',
    removalDelay: 0,
    mainClass: 'mfp-with-zoom',
    closeMarkup: '<button title="%title%" type="button" class="mfp-close">Close</button>',
    gallery: { enabled: true },
    image: {
      // En los retratos el título es el pie de foto (con la profesión en cursiva)
      titleSrc: function (item) {
        var caption = item.el.siblings('.portrait-caption');
        return caption.length ? caption.html() : item.el.attr('title');
      }
    },
    zoom: {
      enabled: true,
      duration: 0,
      easing: 'fade-in',
      opener: function (openerElement) {
        return openerElement.is('img') ? openerElement : openerElement.find('img');
      }
    }
  });

  // Deslizar con el dedo para pasar de foto (el visor no lo trae).
  // Si hubo deslizamiento, se cancela el toque para que no cierre el visor.
  var swipeStartX = null;

  $(document).on('touchstart', '.mfp-container', function (e) {
    swipeStartX = e.originalEvent.touches[0].clientX;
  });

  $(document).on('touchend', '.mfp-container', function (e) {
    if (swipeStartX === null) return;
    var dx = e.originalEvent.changedTouches[0].clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(dx) > 50) {
      e.preventDefault();
      if (dx < 0) $.magnificPopup.instance.next();
      else $.magnificPopup.instance.prev();
    }
  });


  /* 4b. Carrusel (Yeta System): una foto a la vez, infinito. Se agrega una
     copia de la última foto al inicio y de la primera al final; al llegar a
     una copia se salta sin animación a la foto real. Clic en la foto: visor. */
  document.querySelectorAll('.js-carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel__track');
    var originals = Array.prototype.slice.call(track.children);
    var firstCopy = originals[0].cloneNode(true);
    var lastCopy = originals[originals.length - 1].cloneNode(true);

    [firstCopy, lastCopy].forEach(function (copy) {
      copy.classList.remove('image-popup');   // las copias no entran al visor
      copy.removeAttribute('href');
      copy.setAttribute('aria-hidden', 'true');
    });
    track.appendChild(firstCopy);
    track.insertBefore(lastCopy, originals[0]);

    var slides = Array.prototype.slice.call(track.children);
    var index = 1;
    var moving = false;

    var SLIDE_MS = 500;   // igual a la transición de .carousel__track > * (main.css)

    function goTo(n, animate) {
      index = n;
      slides.forEach(function (slide) {
        slide.style.transition = animate ? '' : 'none';
        slide.style.transform = 'translateX(' + (-index * 100) + '%)';
      });
      if (!animate) track.offsetWidth;   // aplica el salto antes de la próxima animación
    }

    function step(dir) {
      if (moving) return;
      moving = true;
      goTo(index + dir, true);
      setTimeout(function () {
        moving = false;
        if (index === 0) goTo(slides.length - 2, false);
        if (index === slides.length - 1) goTo(1, false);
      }, SLIDE_MS);
    }

    goTo(1, false);

    carousel.querySelector('.carousel__arrow--prev').addEventListener('click', function () { step(-1); });
    carousel.querySelector('.carousel__arrow--next').addEventListener('click', function () { step(1); });

    // Deslizar con el dedo o arrastrar con el mouse; si hubo arrastre,
    // el clic no abre el visor.
    var startX = null;
    var dragged = false;

    track.addEventListener('pointerdown', function (e) {
      startX = e.clientX;
      dragged = false;
    });

    track.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) {
        dragged = true;
        step(dx < 0 ? 1 : -1);
      }
    });

    track.addEventListener('click', function (e) {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      }
    }, true);

    // Las fotos se cargan cuando el carrusel se acerca a la pantalla, para
    // que al deslizar ya estén listas.
    new IntersectionObserver(function (entries, observer) {
      if (!entries[0].isIntersecting) return;
      track.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
      observer.disconnect();
    }, { rootMargin: '800px' }).observe(carousel);
  });


  /* 5. Videos: cada bloque .js-video-gallery abre sus videos de Vimeo */
  document.querySelectorAll('.js-video-gallery').forEach(function (gallery) {
    lightGallery(gallery, {
      plugins: [lgVideo],
      selector: 'a',
      download: false,
      counter: false,
      // En celulares lightGallery oculta por defecto el botón de cerrar y las flechas
      mobileSettings: { controls: true, showCloseIcon: true, download: false },
      // Si el video arranca solo, el navegador obliga a Vimeo a silenciarlo;
      // esperando a que se presione play, siempre suena.
      autoplayFirstVideo: false
    });

    // lightGallery abre Vimeo siempre en silencio (muted=1); en el visor
    // se activa el sonido con la API de Vimeo apenas se inserta el video.
    gallery.addEventListener('lgHasVideo', function () {
      setTimeout(function () {
        document.querySelectorAll('.lg-outer iframe.lg-vimeo:not([data-sound])').forEach(function (iframe) {
          iframe.setAttribute('data-sound', '');
          var player = new Vimeo.Player(iframe);
          player.setMuted(false);
          player.setVolume(1);
        });
      }, 0);
    });
  });


  /* 6. Los videos de fondo de la página (Vimeo en modo background) siguen
     reproduciéndose aunque no se vean; se pausan al salir de la pantalla y
     se reanudan al volver, para ahorrar datos, batería y procesador. */
  var playerFor = new Map();

  function vimeoPlayer(iframe) {
    if (!playerFor.has(iframe)) playerFor.set(iframe, new Vimeo.Player(iframe));
    return playerFor.get(iframe);
  }

  var videoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var player = vimeoPlayer(entry.target);
      if (entry.isIntersecting) {
        player.play().catch(function () {});
      } else {
        player.pause().catch(function () {});
      }
    });
  });

  document.querySelectorAll('iframe[src*="background=1"]').forEach(function (iframe) {
    videoObserver.observe(iframe);
  });

})(jQuery);
