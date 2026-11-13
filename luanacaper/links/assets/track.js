/* ===========================================================================
   vhTrack — camada de mensuração de cliques da bio (Luh Caper / Rota Creators)
   ---------------------------------------------------------------------------
   Cada clique vira um evento. Hoje ele é gravado em 4 lugares (o que estiver
   configurado abaixo). Amanhã, quando o dashboard existir, basta preencher
   CONFIG.endpoint com a URL do coletor (Supabase Edge Function / Cloudflare
   Worker / Apps Script) e todo histórico passa a cair lá, sem mexer no HTML.

   NÃO precisa de build. É só um <script src="assets/track.js"> em cada página.
   =========================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    siteId:    "luhcaper-bio",   // identifica esta bio no dashboard futuro
    endpoint:  "",               // TODO: URL do coletor de eventos (POST JSON). Ex.: https://xxx.supabase.co/functions/v1/track
    ga4:       "",               // TODO: ID GA4 "G-XXXXXXXX"
    metaPixel: ""                // TODO: ID do Meta Pixel da Rota Creators, ex.: "1044927234792800"
  };

  /* --- GA4 (carrega só se configurado) --------------------------------- */
  if (CONFIG.ga4) {
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + CONFIG.ga4;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CONFIG.ga4);
  }

  /* --- Meta Pixel (carrega só se configurado) ------------------------- */
  if (CONFIG.metaPixel) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CONFIG.metaPixel);
    window.fbq("track", "PageView");
  }

  /* --- utilitário: UTMs da URL atual (pra saber de qual post veio) ---- */
  function utms() {
    var q = new URLSearchParams(location.search), o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      var v = q.get(k); if (v) o[k] = v;
    });
    return o;
  }

  /* --- API pública: vhTrack(event, slug) ----------------------------- */
  window.vhTrack = function (event, slug) {
    var payload = {
      site:  CONFIG.siteId,
      event: event,              // "pageview" | "click"
      slug:  slug || null,       // "bio" | "creators" | "compras" | "ofertas" | "contato"
      ts:    new Date().toISOString(),
      path:  location.pathname,
      ref:   document.referrer || null,
      lang:  navigator.language || null,
      utm:   utms()
    };

    try { console.debug("[vhTrack]", payload); } catch (e) {}

    // contador local por navegador (fallback imediato, dá pra inspecionar no console)
    try {
      var k = "vh_" + event + (slug ? "_" + slug : "");
      localStorage.setItem(k, String((parseInt(localStorage.getItem(k) || "0", 10) || 0) + 1));
    } catch (e) {}

    // GA4
    try { if (CONFIG.ga4 && window.gtag) window.gtag("event", "vh_" + event, { link_slug: slug || "" }); } catch (e) {}

    // Meta Pixel (evento custom)
    try { if (CONFIG.metaPixel && window.fbq) window.fbq("trackCustom", "vh_" + event, { slug: slug || "" }); } catch (e) {}

    // coletor próprio (o que alimenta o dashboard)
    try {
      if (CONFIG.endpoint) {
        var body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(CONFIG.endpoint, new Blob([body], { type: "application/json" }));
        } else {
          fetch(CONFIG.endpoint, {
            method: "POST", body: body, mode: "no-cors", keepalive: true,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    } catch (e) {}
  };
})();
