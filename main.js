/* =========================================================
   Cristianfer Silva Portillo · Interacciones del sitio
   Script clásico (sin módulos). Cada init es independiente:
   si uno falla, el resto sigue funcionando.
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] falló:", e); }
  }

  /* ---------- Tema claro / oscuro ---------- */
  function initTheme() {
    var b = $("#theme");
    if (!b) return;
    b.addEventListener("click", function () {
      var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
      window.dispatchEvent(new Event("themechange"));
    });
  }

  function initYear() {
    var y = $("#y");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- WhatsApp y teléfono ----------
     El número se arma aquí para que no quede en texto plano en el HTML (menos spam de bots) */
  function initContact() {
    var n = ["56", "9", "3414", "4545"];
    var wa = $("#wa"), tel = $("#tel");
    if (wa) {
      var msg = encodeURIComponent("Hola Cristianfer, vi tu sitio web y me gustaría conversar sobre una oportunidad.");
      wa.href = "https://wa.me/" + n.join("") + "?text=" + msg;
    }
    if (tel) {
      tel.href = "tel:+" + n.join("");
      tel.textContent = "+" + n.join(" ");
    }
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    var btn = $("#menu-btn"), menu = $("#mobile-menu");
    if (!btn || !menu) return;
    function set(open) {
      root.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      menu.setAttribute("aria-hidden", String(!open));
      if ("inert" in menu) menu.inert = !open;
      document.body.style.overflow = open ? "hidden" : "";
    }
    set(false);
    btn.addEventListener("click", function () { set(!root.classList.contains("menu-open")); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("menu-open")) { set(false); btn.focus(); }
    });
    var mq = matchMedia("(min-width: 1100px)");
    var onChange = function (e) { if (e.matches) set(false); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
  }

  /* ---------- Barra de progreso + sección activa en el menú ---------- */
  function initScroll() {
    var bar = $("[data-progress]");
    var links = $$(".nav-links a[href^='#']");
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var ticking = false;

    function update() {
      ticking = false;
      var max = root.scrollHeight - innerHeight;
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, scrollY / max) : 0) + ")";
      if (!links.length) return;
      var line = innerHeight * 0.35, active = -1;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) active = i; });
      if (max > 0 && scrollY >= max - 4) active = sections.length - 1;
      links.forEach(function (a, i) { a.classList.toggle("is-active", i === active); });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
  }

  /* ---------- Aparición al hacer scroll ---------- */
  function initReveals() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    els.forEach(function (el) {
      var sibs = $$(":scope > [data-reveal]", el.parentElement);
      el.style.setProperty("--i", Math.min(sibs.indexOf(el), 5));
    });
    function show(el) { el.classList.add("is-revealed"); }
    if (!("IntersectionObserver" in window)) { els.forEach(show); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });
    // Red de seguridad: a los 6 s se muestra todo lo que ya esté en pantalla
    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) show(el);
      });
    }, 6000);
  }

  /* ---------- Contadores ---------- */
  function initCountUp() {
    var els = $$("[data-count]");
    if (!els.length || !("IntersectionObserver" in window)) return;
    function fmt(v, d) { return v.toFixed(d).replace(".", ","); }
    function run(el) {
      var raw = el.dataset.count, target = parseFloat(raw);
      var d = (raw.split(".")[1] || "").length, t0 = null, dur = 1500;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e, d);
        if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target, d);
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Flujo de viento en el hero (lienzo 2D liviano) ---------- */
  function initWind() {
    if (reduced) return; // efecto continuo: se respeta "reducir movimiento"
    var hero = $("[data-hero]");
    if (!hero || $(".wind", hero)) return;
    var c = document.createElement("canvas");
    c.className = "wind";
    c.setAttribute("aria-hidden", "true");
    hero.insertBefore(c, hero.firstChild);
    var ctx = c.getContext("2d");
    if (!ctx) return;
    var w = 0, h = 0, parts = [], rgb = "15,116,135", running = false, t = 0;

    function readColor() {
      var hex = getComputedStyle(root).getPropertyValue("--accent").trim().replace("#", "");
      if (hex.length === 6) rgb = [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16); }).join(",");
    }
    function spawn(anywhere) {
      return {
        x: anywhere ? Math.random() * w : -Math.random() * 120,
        y: Math.random() * h,
        len: 20 + Math.random() * 70,
        v: 0.7 + Math.random() * 1.8,
        a: 0.10 + Math.random() * 0.35,
        ph: Math.random() * 6.28
      };
    }
    function resize() {
      var r = hero.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(110, Math.round((w * h) / 9500));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn(true));
    }
    function frame() {
      if (!running) return;
      t += 0.012;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.v;
        if (p.x - p.len > w) { parts[i] = spawn(false); continue; }
        var y1 = p.y + Math.sin(t * 1.6 + p.ph + p.x * 0.006) * 7;
        var y0 = p.y + Math.sin(t * 1.6 + p.ph + (p.x - p.len) * 0.006) * 7;
        ctx.strokeStyle = "rgba(" + rgb + "," + p.a + ")";
        ctx.beginPath(); ctx.moveTo(p.x - p.len, y0); ctx.lineTo(p.x, y1); ctx.stroke();
      }
      requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
    function stop() { running = false; }

    readColor(); resize();
    addEventListener("resize", resize);
    addEventListener("themechange", readColor);
    var mq = matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", readColor);
    // Solo se anima mientras el hero está en pantalla
    new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(hero);
  }

  /* ---------- Cruz con coordenadas sobre el plano (escritorio) ---------- */
  function initCrosshair() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var hero = $("[data-hero]"), ch = hero && $(".crosshair", hero);
    if (!ch) return;
    var hl = $(".h", ch), vl = $(".v", ch), tag = $(".tag", ch);
    var x = 0, y = 0, rw = 0, pending = false;
    function pad(v) { return ("0000" + Math.max(0, Math.round(v))).slice(-4); }
    function draw() {
      pending = false;
      hl.style.transform = "translateY(" + y + "px)";
      vl.style.transform = "translateX(" + x + "px)";
      var tx = x + 14 + 130 > rw ? x - 144 : x + 14;
      tag.style.transform = "translate(" + tx + "px," + (y + 14) + "px)";
      tag.textContent = "X " + pad(x) + " · Y " + pad(y);
      ch.classList.add("is-on"); // visible solo tras el primer movimiento
    }
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top; rw = r.width;
      if (!pending) { pending = true; requestAnimationFrame(draw); }
    });
    hero.addEventListener("mouseleave", function () { ch.classList.remove("is-on"); });
  }

  /* ---------- Ampliar figuras ---------- */
  function initLightbox() {
    var links = $$("a.zoom");
    if (!links.length) return;
    var dlg = $("dialog.lightbox");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "lightbox";
      dlg.innerHTML = '<img alt=""><div class="lb-bar"><p></p><button class="icon-btn" type="button" aria-label="Cerrar">✕</button></div>';
      document.body.appendChild(dlg);
    }
    if (typeof dlg.showModal !== "function") return; // sin soporte: el enlace abre la imagen
    var img = $("img", dlg), cap = $("p", dlg);
    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var i = $("img", a), fig = a.closest("figure"), fc = fig && $("figcaption", fig);
        img.src = a.getAttribute("href");
        img.alt = i ? i.alt : "";
        cap.textContent = fc ? fc.textContent : "";
        dlg.showModal();
      });
    });
    $("button", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Secuencia animada del manipulador ---------- */
  function initSequence() {
    var box = $("[data-seq]");
    if (!box) return;
    var car = $("[data-car]", box), zg = $("[data-z]", box), rod = $("[data-rod]", box);
    var jl = $("[data-jaw-l]", box), jr = $("[data-jaw-r]", box), piece = $("[data-piece]", box);
    var btns = $$(".seq-steps button", box), now = $("[data-seq-now]", box), toggle = $("[data-seq-toggle]", box);
    if (!car || !zg || !rod || !piece) return;

    var X = 300, Z = 100, ROD_UP = 8 / 108;
    // x: 0 torno / 1 inspección · z: 0 arriba / 1 abajo · g: 1 pinza cerrada · p: posición de la pieza
    var S = [
      { x: 0, z: 0, g: 0, p: "torno" },
      { x: 0, z: 1, g: 0, p: "torno" },
      { x: 0, z: 1, g: 1, p: "held" },
      { x: 0, z: 0, g: 1, p: "held" },
      { x: 1, z: 0, g: 1, p: "held" },
      { x: 1, z: 1, g: 1, p: "held" },
      { x: 1, z: 1, g: 0, p: "insp" },
      { x: 1, z: 0, g: 0, p: "insp" },
      { x: 0, z: 0, g: 0, p: "insp" }
    ];
    var cur = 0, playing = true, visible = false, timer = null;

    function apply(i) {
      var s = S[i];
      car.style.transform = "translateX(" + s.x * X + "px)";
      zg.style.transform = "translateY(" + s.z * Z + "px)";
      rod.style.transform = "scaleY(" + (s.z ? 1 : ROD_UP) + ")";
      jl.style.transform = "translateX(" + (s.g ? 0 : -8) + "px)";
      jr.style.transform = "translateX(" + (s.g ? 0 : 8) + "px)";
      var px = s.p === "torno" ? 0 : s.p === "insp" ? X : s.x * X;
      var py = s.p === "held" && !s.z ? -Z : 0;
      piece.style.transform = "translate(" + px + "px," + py + "px)";
      btns.forEach(function (b, k) { b.classList.toggle("is-active", k === i); b.setAttribute("aria-pressed", String(k === i)); });
      if (now && btns[i]) now.textContent = $("b", btns[i]).textContent + " · " + btns[i].lastChild.textContent;
    }
    // Al cerrar el ciclo, la pieza inspeccionada se retira y aparece una nueva en el torno
    function resetPiece(done) {
      piece.style.opacity = "0";
      setTimeout(function () {
        piece.style.transition = "none";
        piece.style.transform = "translate(0px,0px)";
        void piece.getBoundingClientRect();
        piece.style.transition = "";
        piece.style.opacity = "1";
        done();
      }, 380);
    }
    function go(i) {
      if (i === 0 && cur === S.length - 1) { cur = 0; resetPiece(function () { apply(0); }); }
      else { cur = i; apply(i); }
    }
    function tick() {
      clearTimeout(timer);
      if (!playing || !visible) return;
      timer = setTimeout(function () {
        go((cur + 1) % S.length);
        tick();
      }, cur === 0 ? 1300 : 900);
    }
    function setPlaying(p) {
      playing = p;
      if (toggle) {
        toggle.textContent = p ? "❚❚" : "▶";
        toggle.setAttribute("aria-label", p ? "Pausar animación" : "Reproducir animación");
      }
      tick();
    }
    btns.forEach(function (b, k) {
      b.addEventListener("click", function () {
        setPlaying(false);
        if (k === 0 && cur !== 0) { cur = 0; resetPiece(function () { apply(0); }); }
        else { cur = k; apply(k); }
      });
    });
    if (toggle) toggle.addEventListener("click", function () { setPlaying(!playing); });
    apply(0);
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; tick(); }, { threshold: 0.05 }).observe(box);
    setPlaying(true);
  }

  function boot() {
    root.classList.add("js");
    safe(initTheme, "initTheme");
    safe(initYear, "initYear");
    safe(initContact, "initContact");
    safe(initMenu, "initMenu");
    safe(initScroll, "initScroll");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initWind, "initWind");
    safe(initCrosshair, "initCrosshair");
    safe(initLightbox, "initLightbox");
    safe(initSequence, "initSequence");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
