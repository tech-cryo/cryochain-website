/* CryoChain Google Analytics plugin.
   Google Analytics 4 loads only after a visitor accepts analytics cookies in the cookie notice.
   The Measurement ID is set in the admin under Site settings (the build writes it into
   assets/analytics-settings.js). If you are not using the admin, edit that file by hand. */
(function () {
  "use strict";
  var S = window.CRYO_ANALYTICS || {};
  var id = String(S.measurementId || "").trim().toUpperCase();
  var ready = S.enabled !== false && /^G-[A-Z0-9]+$/.test(id);
  var started = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function start() {
    if (!ready) return;
    window["ga-disable-" + id] = false;
    if (started) return;
    started = true;
    window.gtag = gtag;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", id);
  }

  // turn tracking off and remove Google Analytics cookies from this browser
  function stop() {
    if (!ready) return;
    window["ga-disable-" + id] = true;
    var host = location.hostname, bare = host.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (!/^_ga/.test(name)) return;
      ["", host, "." + bare].forEach(function (d) {
        document.cookie = name + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "");
      });
    });
  }

  function track(name, params) {
    if (started && S.trackEvents !== false && !window["ga-disable-" + id]) gtag("event", name, params || {});
  }

  window.CryoAnalytics = { start: start, stop: stop, track: track, ready: ready };

  // key actions
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a, button");
    if (!el) return;
    if (el.hasAttribute("data-wa")) track("whatsapp_click", { page: location.pathname });
    else if (el.classList.contains("store")) track("app_store_click", { store: el.getAttribute("data-store") });
    else if (el.getAttribute("data-link") === "calendarUrl") track("book_call_click", { page: location.pathname });
    else if (el.classList.contains("copy-link")) track("share", { method: "copy_link", content_type: "article", item_id: location.pathname });
    else if (el.closest(".share") && el.tagName === "A") track("share", { method: el.textContent.trim(), content_type: "article", item_id: location.pathname });
    else if (el.matches("a.feature, a.post")) track("select_content", { content_type: "article", item_id: el.getAttribute("href") });
    else if (el.classList.contains("filter")) track("filter_topic", { topic: el.getAttribute("data-filter") });
  }, true);
  document.addEventListener("cryochain:form", function (e) {
    track("generate_lead", { form_name: e.detail && e.detail.form, method: e.detail && e.detail.method });
  });
})();
