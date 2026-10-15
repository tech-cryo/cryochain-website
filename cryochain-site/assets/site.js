/* CryoChain site script.
   Edit CONFIG below. Everything else works as is. */
var CONFIG = {
  appStoreUrl: "",      // paste the Apple App Store link when the app is live
  playStoreUrl: "",     // paste the Google Play link when the app is live
  formEmail: "fresh@cryochain.co",   // every form is delivered here, except investor and partner enquiries
  investorEmail: "ir@cryochain.co",   // investor and partner enquiries (investor page form, or "Partner or investor" chosen in any form)
  formEndpoint: "https://formsubmit.co/ajax/",   // FormSubmit forwards each form to the address added to this link. Each address must be activated once from FormSubmit's confirmation email
  whatsapp: "12028789298",   // digits only, with country code
  ghanaPhone: "",       // Ghana phone number shown on the contact pages
  launchDate: "November 1, 2026",
  calendarUrl: "https://calendar.app.google/WrN4hzNk8DwqBT9W7",   // founders' call booking link
  linkedinWill: "",     // paste each founder's LinkedIn link; the button stays hidden until it is set
  linkedinMaabena: "",
  linkedinBaffour: ""
};

(function () {
  "use strict";
  var $ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* mobile menu */
  var btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* values from CONFIG */
  $("[data-config]").forEach(function (el) {
    var v = CONFIG[el.getAttribute("data-config")];
    if (v) { el.textContent = v; el.classList.remove("todo"); }
    else { el.classList.add("todo"); }
  });
  $("a[data-wa]").forEach(function (a) {
    a.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(a.getAttribute("data-wa"));
    a.target = "_blank"; a.rel = "noopener";
  });
  /* links set in CONFIG; hidden until a link is filled in */
  $("a[data-link]").forEach(function (a) {
    var v = CONFIG[a.getAttribute("data-link")];
    if (v) { a.href = v; a.target = "_blank"; a.rel = "noopener"; a.hidden = false; } else { a.hidden = true; }
  });

  /* store buttons: live links once the URLs are set, otherwise "coming soon" */
  $("a.store").forEach(function (a) {
    var url = a.getAttribute("data-store") === "ios" ? CONFIG.appStoreUrl : CONFIG.playStoreUrl;
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; a.classList.remove("soon"); }
    else {
      a.classList.add("soon");
      var em = a.querySelector("em"); if (em) em.textContent = "Coming " + CONFIG.launchDate;
    }
  });

  /* image placeholders: look for images/LABEL.jpg, then .png, .jpeg, .webp; show it and hide the prompt */
  $(".ph").forEach(function (fig) {
    var img = fig.querySelector("img");
    if (!img) return;
    var base = img.getAttribute("src").replace(/\.jpg$/, ""), exts = [".png", ".jpeg", ".webp"], i = 0;
    function ok() { fig.classList.add("has-img"); }
    function bad() { if (i < exts.length) { img.src = base + exts[i++]; } else { img.remove(); } }
    img.addEventListener("load", ok); img.addEventListener("error", bad);
    if (img.complete) { img.naturalWidth > 0 ? ok() : bad(); }
  });

  /* copy an image prompt to the clipboard */
  $(".ph-copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var box = btn.closest(".ph-ui").querySelector(".ph-prompt"), text = box.textContent.trim();
      function done() { btn.textContent = "Copied"; btn.classList.add("done"); setTimeout(function () { btn.textContent = "Copy prompt"; btn.classList.remove("done"); }, 1800); }
      function fallback() {
        var r = document.createRange(); r.selectNodeContents(box); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        try { document.execCommand("copy"); done(); } catch (e) { btn.textContent = "Press Ctrl+C"; }
      }
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    });
  });

  /* insights: topic filter, search and Load more work together */
  var list = document.querySelector(".posts[data-per-page]");
  if (list) {
    var per = parseInt(list.getAttribute("data-per-page"), 10) || 9, shownMax = per, topic = "all", query = "";
    var cards = $(".post", list), more = document.querySelector(".load-more"), none = document.querySelector(".none");
    var input = document.querySelector(".search input");
    function apply() {
      var match = cards.filter(function (c) {
        var okTopic = topic === "all" || c.getAttribute("data-cat") === topic;
        var okText = !query || (c.getAttribute("data-search") || c.textContent.toLowerCase()).indexOf(query) > -1;
        return okTopic && okText;
      });
      cards.forEach(function (c) { c.hidden = true; });
      match.slice(0, shownMax).forEach(function (c) { c.hidden = false; });
      if (more) more.hidden = match.length <= shownMax;
      if (none) none.hidden = match.length > 0;
    }
    $(".filter").forEach(function (b) {
      b.addEventListener("click", function () {
        topic = b.getAttribute("data-filter"); shownMax = per;
        $(".filter").forEach(function (o) { var on = o === b; o.classList.toggle("on", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        apply();
      });
    });
    if (input) input.addEventListener("input", function () { query = input.value.trim().toLowerCase(); shownMax = per; apply(); });
    if (more) more.addEventListener("click", function () { shownMax += per; apply(); });
    apply();
  }

  /* copy the article link */
  $(".copy-link").forEach(function (b) {
    b.addEventListener("click", function () {
      var url = b.getAttribute("data-url") || location.href;
      function ok() { b.textContent = "Link copied"; setTimeout(function () { b.textContent = "Copy link"; }, 1800); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(ok, function () { prompt("Copy this link:", url); });
      else prompt("Copy this link:", url);
    });
  });

  /* route line draws once when it scrolls into view */
  var routes = $(".route");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove("pre"); en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.35 });
    routes.forEach(function (r) { r.classList.add("pre"); io.observe(r); });
  }

  /* forms: send to formEndpoint if set, otherwise open the visitor's email with the message filled in */
  $("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var label = form.getAttribute("data-form");
      var data = new FormData(form), lines = [], seen = {};
      data.forEach(function (v, k) {
        if (seen[k]) return; seen[k] = true;
        var all = data.getAll(k).filter(Boolean).join(", ");
        if (all) lines.push(k + ": " + all);
      });
      var status = form.querySelector(".form-status");
      function say(msg, err) { status.textContent = msg; status.className = "form-status show" + (err ? " err" : ""); }
      if (CONFIG.formEndpoint) {
        var who = data.get("Business name") || data.get("Company name") || data.get("Full name") || "";
        var body = { _subject: "CryoChain website: " + label + (who ? " from " + who : ""), _template: "table", _captcha: "false", Form: label };
        lines.forEach(function (l) { var i = l.indexOf(": "); body[l.slice(0, i)] = l.slice(i + 2); });
        var investor = form.getAttribute("data-to") === "investors" || data.get("I am a") === "Partner or investor";
        fetch(CONFIG.formEndpoint + (investor ? CONFIG.investorEmail : CONFIG.formEmail), { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body) })
          .then(function (r) {
            if (!r.ok) throw new Error("bad");
            say("Thank you. We received your details and will contact you soon."); form.reset();
            document.dispatchEvent(new CustomEvent("cryochain:form", { detail: { form: label, method: "form" } }));
          })
          .catch(function () {
            /* if the form service cannot be reached, hand the details to WhatsApp instead */
            window.open("https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(label + "\n" + lines.join("\n")), "_blank", "noopener");
            document.dispatchEvent(new CustomEvent("cryochain:form", { detail: { form: label, method: "whatsapp" } }));
            say("We could not send the form just now, so WhatsApp should open with your details filled in. Press send there to reach us.", true);
          });
      } else {
        /* no form service set yet: open WhatsApp with the details filled in */
        var text = label + "\n" + lines.join("\n");
        window.open("https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text), "_blank", "noopener");
        say("WhatsApp should open with your details filled in. Press send there to reach us.");
      }
    });
  });
})();

/* Cookie notice.
   Choices are saved in this browser. Necessary storage is always on. YouTube previews only run
   for visitors who allow videos; everyone else is asked before a video plays. Google Analytics only loads
   after the visitor agrees (see assets/analytics.js and the Site settings screen in the admin). */
var COOKIES = {
  version: 2,                 // raise this number when the cookie policy changes, so everyone is asked again
  policyPage: "privacy.html#cookies"
};
(function () {
  "use strict";
  var KEY = "cryochain-cookie-choice";
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY)); return v && v.version === COOKIES.version ? v : null; } catch (e) { return null; } }
  function save(analytics, video) {
    var v = { version: COOKIES.version, necessary: true, analytics: !!analytics, video: !!video, date: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
    apply(v); hideBanner(); closePanel();
    document.dispatchEvent(new CustomEvent("cryochain:consent", { detail: v }));
  }
  function apply(v) {
    // Google Analytics is handled by assets/analytics.js; it only ever starts after consent
    if (!window.CryoAnalytics) return;
    if (v && v.analytics) window.CryoAnalytics.start(); else window.CryoAnalytics.stop();
  }
  window.CryoConsent = {
    get: read,
    open: function () { openPanel(); },
    setVideo: function (on) { var c = read() || { analytics: false }; save(c.analytics, on); }
  };

  var banner, panel;
  function el(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
  function showBanner() {
    if (banner) return;
    banner = el('<section class="cookie-bar" role="region" aria-label="Cookie notice">' +
      '<div class="cookie-text"><strong>We use cookies</strong><p>We use necessary cookies to make this site work. With your permission, we also use Google Analytics cookies to see how the site is used, and show YouTube videos, which may set their own cookies. You can change your choice at any time under Cookie settings. <a href="' + COOKIES.policyPage + '">Read our cookie policy</a>.</p></div>' +
      '<div class="cookie-actions"><button type="button" class="btn btn-primary" data-cc="all">Accept all</button>' +
      '<button type="button" class="btn btn-ghost" data-cc="none">Reject non essential</button>' +
      '<button type="button" class="btn btn-ghost" data-cc="manage">Manage choices</button></div></section>');
    document.body.appendChild(banner);
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cc]"); if (!b) return;
      var k = b.getAttribute("data-cc");
      if (k === "all") save(true, true); else if (k === "none") save(false, false); else openPanel();
    });
  }
  function hideBanner() { if (banner) { banner.remove(); banner = null; } }
  var lastFocus;
  function openPanel() {
    closePanel(); lastFocus = document.activeElement;
    var v = read() || { analytics: false, video: false };
    panel = el('<div class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cc-title"><div class="cookie-box">' +
      '<h2 id="cc-title">Cookie settings</h2><p>Choose which cookies you allow. Necessary cookies are always on because the site needs them to work.</p>' +
      '<label class="cc-row"><span><strong>Necessary</strong><small>Remember your cookie choice and keep forms working.</small></span><input type="checkbox" checked disabled></label>' +
      '<label class="cc-row"><span><strong>Analytics</strong><small>Google Analytics counts visits and shows which pages help people most. No advertising profiles.</small></span><input type="checkbox" data-cat="analytics"' + (v.analytics ? " checked" : "") + '></label>' +
      '<label class="cc-row"><span><strong>Videos</strong><small>Show YouTube videos and short hover previews without asking first. YouTube may set its own cookies.</small></span><input type="checkbox" data-cat="video"' + (v.video ? " checked" : "") + '></label>' +
      '<div class="cookie-actions"><button type="button" class="btn btn-primary" data-cc="save">Save my choices</button>' +
      '<button type="button" class="btn btn-ghost" data-cc="all">Accept all</button>' +
      '<button type="button" class="btn btn-ghost" data-cc="close">Close</button></div></div></div>');
    document.body.appendChild(panel);
    panel.querySelector("input[data-cat=analytics]").focus();
    panel.addEventListener("click", function (e) {
      if (e.target === panel) return closePanel();
      var b = e.target.closest("[data-cc]"); if (!b) return;
      var k = b.getAttribute("data-cc");
      if (k === "save") save(panel.querySelector("[data-cat=analytics]").checked, panel.querySelector("[data-cat=video]").checked);
      else if (k === "all") save(true, true); else closePanel();
    });
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
      if (e.key === "Tab") {
        var f = panel.querySelectorAll("button, input:not([disabled])"), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  function closePanel() { if (panel) { panel.remove(); panel = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); } }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-cookie-settings]")) { e.preventDefault(); openPanel(); }
  });
  var current = read();
  if (current) apply(current); else showBanner();
})();
