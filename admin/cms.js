/* CryoChain admin: focus point picker and an article preview that looks like the site. */
(function () {
  var CMS = window.CMS, h = window.h, createClass = window.createClass;
  if (!CMS) return;

  /* Focus point widget: click the main image where the subject is.
     Saved as "x,y" in percent. The build crops every size around this point. */
  function parse(v) {
    var p = String(v || "50,50").split(",").map(Number);
    return { x: isFinite(p[0]) ? p[0] : 50, y: isFinite(p[1]) ? p[1] : 50 };
  }
  function assetUrl(a, fallback) {
    if (!a) return fallback;
    var u = a.url || (a.toString && a.toString());
    return u && u !== "[object Object]" ? String(u) : fallback;
  }

  var FocalControl = createClass({
    getInitialState: function () { return { url: null }; },
    componentDidMount: function () { this.resolve(); },
    componentDidUpdate: function () { this.resolve(); },
    resolve: function () {
      var field = this.props.field, imgField = (field && field.get && field.get("image_field")) || "image";
      var path = this.props.entry && this.props.entry.getIn(["data", imgField]);
      if (!path) { this._path = null; if (this.state.url) this.setState({ url: null }); return; }
      if (path === this._path) return;
      this._path = path;
      var self = this, done = function (a) {
        var u = assetUrl(a, path);
        if (u !== self.state.url) self.setState({ url: u });
      };
      try {
        var r = this.props.getAsset ? this.props.getAsset(path, field) : null;
        if (r && typeof r.then === "function") r.then(done, function () { done(null); }); else done(r);
      } catch (e) { done(null); }
    },
    pick: function (e) {
      var b = e.currentTarget.getBoundingClientRect();
      var x = Math.round(((e.clientX - b.left) / b.width) * 100), y = Math.round(((e.clientY - b.top) / b.height) * 100);
      x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y));
      this.props.onChange(x + "," + y);
    },
    render: function () {
      var f = parse(this.props.value), url = this.state.url;
      if (!url) return h("div", { className: "cc-focal cc-focal-empty" }, "Choose the main image first, then click on it here to set the focus point.");
      var pos = f.x + "% " + f.y + "%";
      var crop = function (label, w, hgt) {
        return h("figure", { key: label }, h("div", { style: { width: w + "px", height: hgt + "px", backgroundImage: "url(" + url + ")", backgroundPosition: pos } }), label);
      };
      return h("div", { className: "cc-focal" },
        h("p", { className: "cc-focal-help" }, "Click the most important part of the photo, such as a face or the produce. Every size on the site is cropped around this point."),
        h("div", { className: "cc-focal-frame", onClick: this.pick },
          h("img", { src: url, alt: "" }),
          h("span", { className: "cc-focal-dot", style: { left: f.x + "%", top: f.y + "%" } })),
        h("p", { className: "cc-focal-help" }, "How it will be cropped on the site:"),
        h("div", { className: "cc-focal-crops" },
          crop("Article banner", 192, 108), crop("Card", 144, 96), crop("Featured", 128, 96), crop("Phone", 96, 96)));
    }
  });
  var FocalPreview = function (props) { return h("span", null, "Focus point: " + (props.value || "50,50")); };
  CMS.registerWidget("focalpoint", FocalControl, FocalPreview);

  /* Article preview that uses the site's own styles. */
  CMS.registerPreviewStyle("/assets/site.css");
  var PostPreview = createClass({
    render: function () {
      var entry = this.props.entry, get = function (k) { return entry.getIn(["data", k]); };
      var f = parse(get("focus")), src = get("image") ? assetUrl(this.props.getAsset(get("image")), get("image")) : "";
      return h("article", { className: "article" },
        h("header", { className: "article-head wrap" },
          h("span", { className: "cat cat-blue" }, get("category") || "Topic"),
          h("h1", null, get("title") || "Article title"),
          h("p", { className: "article-lead" }, get("excerpt") || ""),
          get("coming_soon") ? h("p", { className: "meta" }, "Shown on the site as a Coming soon card") : null),
        src ? h("div", { className: "wrap article-hero" },
          h("img", { className: "cover", src: src, alt: get("image_alt") || "", style: { aspectRatio: "16/9", objectPosition: f.x + "% " + f.y + "%", borderRadius: "20px" } })) : null,
        h("div", { className: "article-body wrap" }, this.props.widgetFor("body")));
    }
  });
  CMS.registerPreviewTemplate("posts", PostPreview);
})();
