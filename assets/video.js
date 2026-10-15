/* CryoChain video plugin for YouTube.
   - Videos show a still image first. YouTube only loads when someone plays a video or has allowed
     videos in Cookie settings.
   - Hover previews play a few silent seconds on article cards and stop before the video ends, so
     YouTube never reaches its "watch next" screen.
   - When a video ends or is paused, a CryoChain screen covers YouTube's suggested videos.
   Settings come from the admin (Site settings, Videos), written into assets/video-settings.js. */
(function () {
  "use strict";
  var S = window.CRYO_VIDEO || {};
  var HOST = S.privacyMode === false ? "https://www.youtube.com" : "https://www.youtube-nocookie.com";
  var PREVIEW_SECONDS = Math.max(2, Math.min(15, Number(S.previewSeconds) || 6));
  var HIDE_SUGGESTIONS = S.hideSuggestions !== false;

  function allowed() { var c = window.CryoConsent && window.CryoConsent.get(); return !!(c && c.video); }
  function track(n, p) { if (window.CryoAnalytics) window.CryoAnalytics.track(n, p); }
  function canHover() {
    return S.hoverPreviews !== false && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches && !(navigator.connection && navigator.connection.saveData);
  }

  /* load YouTube's player script once, only when needed */
  var apiWaiters = null;
  function api() {
    return new Promise(function (resolve, reject) {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      if (!apiWaiters) {
        apiWaiters = [];
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} apiWaiters.forEach(function (w) { w[0](window.YT); }); apiWaiters = "done"; };
        var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.async = true;
        s.onerror = function () { var w = apiWaiters; apiWaiters = null; (w || []).forEach(function (x) { x[1](new Error("blocked")); }); };
        document.head.appendChild(s);
      }
      if (apiWaiters === "done") return resolve(window.YT);
      apiWaiters.push([resolve, reject]);
      setTimeout(function () { reject(new Error("timeout")); }, 8000);
    });
  }

  function el(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }

  /* ---------- full player ---------- */
  function play(fig) {
    var id = fig.getAttribute("data-yt"), start = parseInt(fig.getAttribute("data-start"), 10) || 0;
    var title = fig.getAttribute("data-title") || "Video";
    var stage = fig.querySelector(".video-stage");
    stopPreview(fig);
    fig.classList.add("playing");
    var slot = document.createElement("div"); slot.className = "video-frame";
    stage.appendChild(slot);
    track("video_play", { video_id: id, video_title: title });
    api().then(function (YT) {
      var cover = null;
      function showCover(kind, player) {
        if (!HIDE_SUGGESTIONS) return;
        hideCover();
        cover = el(kind === "end"
          ? '<div class="video-cover" role="group" aria-label="Video ended"><p>Thanks for watching.</p><div class="video-cover-actions"><button type="button" class="btn btn-white" data-v="again">Watch again</button><a class="btn btn-outline-white" href="insights.html">More from Insights</a></div></div>'
          : '<div class="video-cover paused" role="group" aria-label="Video paused"><button type="button" class="video-resume" data-v="resume" aria-label="Resume video"><span class="play-icon" aria-hidden="true"></span></button></div>');
        stage.appendChild(cover);
        cover.addEventListener("click", function (e) {
          var b = e.target.closest("[data-v]"); if (!b) return;
          if (b.getAttribute("data-v") === "again") { player.seekTo(start, true); player.playVideo(); }
          else player.playVideo();
          hideCover();
        });
        var f = cover.querySelector("button"); if (f) f.focus();
      }
      function hideCover() { if (cover) { cover.remove(); cover = null; } }
      var player = new YT.Player(slot, {
        host: HOST, videoId: id, width: "100%", height: "100%",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1, start: start },
        events: {
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.PLAYING) hideCover();
            else if (e.data === YT.PlayerState.PAUSED) showCover("pause", player);
            else if (e.data === YT.PlayerState.ENDED) { showCover("end", player); track("video_complete", { video_id: id, video_title: title }); }
          }
        }
      });
    }).catch(function () {
      // YouTube's player script could not load; fall back to a plain player with as few suggestions as YouTube allows
      slot.outerHTML = '<iframe class="video-frame" src="' + HOST + "/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0&playsinline=1&iv_load_policy=3&start=" + start +
        '" title="' + title.replace(/"/g, "&quot;") + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    });
  }

  /* ---------- ask before loading YouTube ---------- */
  function ask(fig) {
    if (fig.querySelector(".video-ask")) return;
    var box = el('<div class="video-ask" role="dialog" aria-label="Play YouTube video"><p>This video is hosted on YouTube. Playing it loads YouTube, which may set cookies. ' +
      '<a href="privacy.html#video">How we use YouTube</a>.</p><div class="video-cover-actions">' +
      '<button type="button" class="btn btn-white" data-a="once">Play this video</button>' +
      '<button type="button" class="btn btn-outline-white" data-a="always">Always allow videos</button>' +
      '<button type="button" class="btn btn-outline-white" data-a="no">Not now</button></div></div>');
    fig.querySelector(".video-stage").appendChild(box);
    box.querySelector("button").focus();
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a");
      box.remove();
      if (a === "always" && window.CryoConsent && window.CryoConsent.setVideo) window.CryoConsent.setVideo(true);
      if (a !== "no") play(fig);
      else fig.querySelector(".video-play").focus();
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".video-play");
    if (!b) return;
    e.preventDefault();
    var fig = b.closest(".video");
    if (allowed()) play(fig); else ask(fig);
  });

  /* ---------- hover previews ---------- */
  function previewTarget(host) { return host.querySelector(".video-stage") || host.querySelector(".post-img") || host.querySelector(".feature-img") || host; }
  function stopPreview(host) {
    clearTimeout(host._pvWait); clearTimeout(host._pvStop);
    if (host._pv) { try { host._pv.destroy(); } catch (e) {} host._pv = null; }
    var w = host.querySelector(".video-preview"); if (w) w.remove();
  }
  function startPreview(host) {
    var id = host.getAttribute("data-yt-preview") || host.getAttribute("data-yt");
    var from = parseInt(host.getAttribute("data-preview-start"), 10) || 0;
    if (!id || host.classList.contains("playing")) return;
    var wrap = el('<div class="video-preview" aria-hidden="true"><div></div></div>');
    previewTarget(host).appendChild(wrap);
    api().then(function (YT) {
      if (!wrap.isConnected) return;
      host._pv = new YT.Player(wrap.firstChild, {
        host: HOST, videoId: id, width: "100%", height: "100%",
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1, start: from },
        events: {
          onReady: function (e) { e.target.mute(); e.target.playVideo(); },
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.PLAYING && !host._pvStop) {
              wrap.classList.add("on");
              host._pvStop = setTimeout(function () { stopPreview(host); host._pvStop = null; }, PREVIEW_SECONDS * 1000);
            }
            if (e.data === YT.PlayerState.ENDED) stopPreview(host);   // never let a preview reach YouTube's end screen
          }
        }
      });
    }).catch(function () { wrap.remove(); });
  }
  function bindPreviews() {
    document.querySelectorAll("[data-yt-preview], .video[data-yt]").forEach(function (host) {
      if (host._pvBound) return; host._pvBound = true;
      host.addEventListener("mouseenter", function () {
        if (!canHover() || !allowed()) return;
        host._pvWait = setTimeout(function () { startPreview(host); }, 450);
      });
      host.addEventListener("mouseleave", function () { stopPreview(host); host._pvStop = null; });
    });
  }
  bindPreviews();
  window.CryoVideo = { play: play, bindPreviews: bindPreviews, settings: S };
})();
