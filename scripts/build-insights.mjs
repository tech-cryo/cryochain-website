// CryoChain Insights build.
// Runs on the web host after every change made in the admin (npm run build).
// 1. Copies the site into dist/
// 2. Turns every article in content/posts into a finished page (insights-<slug>.html)
// 3. Fills the Insights page and the home page with the main and latest articles
// 4. Crops every article image to the brand sizes around its focus point
// 5. Writes the RSS feed and the sitemap
// Publish times are clock times in the article's time zone (or the default in Insights settings).
// Articles with a future publish time stay hidden; scheduled.json lists those times so the
// 15 minute check on Netlify can rebuild the site when one is due.

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sharp from "sharp";
import { DEFAULT_TZ, validZone, toMoment, showDate } from "./time.mjs";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist");
const SITE = (process.env.SITE_URL || "https://www.cryochain.co").replace(/\/$/, "");
const NOW = new Date();
const SKIP = new Set(["dist", "netlify", "node_modules", "content", "scripts", ".git", ".github", ".netlify",
  "package.json", "package-lock.json", "netlify.toml", "insights-post-template.html"]);

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const exists = (p) => fs.access(p).then(() => true, () => false);

async function copySite(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    if (src === ROOT && (SKIP.has(e.name) || (e.isFile() && e.name.endsWith(".md")))) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) await copySite(s, d); else await fs.copyFile(s, d);
  }
}

async function readJsonDir(dir) {
  if (!(await exists(dir))) return [];
  const out = [];
  for (const f of await fs.readdir(dir)) if (f.endsWith(".json")) out.push(JSON.parse(await fs.readFile(path.join(dir, f), "utf8")));
  return out;
}

// ---------- images: crop around the focus point, strip metadata, make phone sizes ----------
const SIZES = {
  hero: [[1600, 900], [800, 450]],    // article banner 16:9
  card: [[1200, 800], [800, 533]],    // cards 3:2
  feature: [[1200, 900], [800, 600]], // featured box 4:3
  og: [[1200, 630]],                  // link previews on WhatsApp, LinkedIn, X and Facebook
};
const imageCache = new Map();
async function cropSet(srcRel, slug, focus) {
  const key = srcRel + "|" + focus;
  if (imageCache.has(key)) return imageCache.get(key);
  const src = path.join(ROOT, srcRel.replace(/^\//, ""));
  if (!srcRel || !(await exists(src))) { console.warn(`  ! image not found for ${slug}: ${srcRel}`); return null; }
  const [fx, fy] = String(focus || "50,50").split(",").map((n) => Math.max(0, Math.min(100, Number(n) || 50)));
  const base = await sharp(src).rotate().toBuffer();
  const meta = await sharp(base).metadata();
  if (meta.width < 1600) console.warn(`  ! ${slug}: main image is ${meta.width}px wide. 1600px or more looks sharpest.`);
  const dir = path.join(OUT, "images", "insights", slug);
  await fs.mkdir(dir, { recursive: true });
  const out = {};
  for (const [name, list] of Object.entries(SIZES)) {
    out[name] = [];
    for (const [w, h] of list) {
      const scale = Math.max(w / meta.width, h / meta.height);
      const sw = Math.round(meta.width * scale), sh = Math.round(meta.height * scale);
      const left = Math.min(Math.max(Math.round((sw * fx) / 100 - w / 2), 0), sw - w);
      const top = Math.min(Math.max(Math.round((sh * fy) / 100 - h / 2), 0), sh - h);
      const pipe = sharp(base).resize(sw, sh).extract({ left, top, width: w, height: h });
      const file = `${name}-${w}x${h}`;
      await pipe.clone().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(dir, file + ".jpg"));
      await pipe.clone().webp({ quality: 78 }).toFile(path.join(dir, file + ".webp"));
      out[name].push({ w, h, jpg: `images/insights/${slug}/${file}.jpg`, webp: `images/insights/${slug}/${file}.webp` });
    }
  }
  imageCache.set(key, out);
  return out;
}

// ---------- YouTube ----------
export function ytId(url) {
  const m = String(url || "").match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
// download the video's still image once, so readers do not contact YouTube just by opening the page
const thumbCache = new Map();
async function videoPoster(id, slug) {
  if (thumbCache.has(id)) return thumbCache.get(id);
  let buf = null;
  for (const q of ["maxresdefault", "sddefault", "hqdefault"]) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/${q}.jpg`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      if ((await sharp(b).metadata()).width >= 320) { buf = b; break; }
    } catch { /* offline or blocked: fall back to the article image */ }
  }
  let out = null;
  if (buf) {
    const dir = path.join(OUT, "images", "insights", slug);
    await fs.mkdir(dir, { recursive: true });
    const meta = await sharp(buf).metadata();
    // YouTube's smaller stills have black bars top and bottom; cut to the 16:9 picture
    const h = Math.min(meta.height, Math.round(meta.width * 9 / 16)), top = Math.round((meta.height - h) / 2);
    const base = await sharp(buf).extract({ left: 0, top, width: meta.width, height: h }).toBuffer();
    out = [];
    for (const [w, hh] of [[1280, 720], [800, 450]]) {
      const p = sharp(base).resize(w, hh, { fit: "cover" });
      const f = `video-${id}-${w}`;
      await p.clone().jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(dir, f + ".jpg"));
      await p.clone().webp({ quality: 78 }).toFile(path.join(dir, f + ".webp"));
      out.push({ w, h: hh, jpg: `images/insights/${slug}/${f}.jpg`, webp: `images/insights/${slug}/${f}.webp` });
    }
  } else console.warn(`  ! could not fetch the YouTube still for ${id}; the article image is used instead`);
  thumbCache.set(id, out);
  return out;
}
function videoBlock({ id, title, start = 0, previewStart = 0, caption = "", poster = null, hero = false }) {
  const img = poster ? picture(poster, "", "(max-width: 1200px) 100vw, 1160px", "16/9", hero) : '<span class="video-ph"></span>';
  return `<figure class="video${hero ? " video-hero" : ""}" data-yt="${esc(id)}" data-start="${Number(start) || 0}" data-preview-start="${Number(previewStart) || 0}" data-title="${esc(title)}">` +
    `<div class="video-stage"><button type="button" class="video-play" aria-label="Play video: ${esc(title)}">${img}<span class="play-icon" aria-hidden="true"></span><span class="video-label">${esc(title)}</span></button></div>` +
    (caption ? `<figcaption>${esc(caption)}</figcaption>` : "") + `</figure>`;
}

function picture(set, alt, sizes, ratio, eager = false) {
  if (!set) return "";
  const s = (t) => set.map((v) => `${v[t]} ${v.w}w`).join(", ");
  return `<picture><source type="image/webp" srcset="${s("webp")}" sizes="${sizes}">` +
    `<img class="cover" src="${set[0].jpg}" srcset="${s("jpg")}" sizes="${sizes}" alt="${esc(alt)}" style="aspect-ratio:${ratio}" loading="${eager ? "eager" : "lazy"}" width="${set[0].w}" height="${set[0].h}"></picture>`;
}

// inline images inside the article body: resize to the article width, keep their shape
async function bodyImage(srcRel, slug, n) {
  const src = path.join(ROOT, srcRel.replace(/^\//, ""));
  if (!(await exists(src))) return null;
  const dir = path.join(OUT, "images", "insights", slug);
  await fs.mkdir(dir, { recursive: true });
  const buf = await sharp(src).rotate().resize({ width: 1440, withoutEnlargement: true }).toBuffer();
  const m = await sharp(buf).metadata();
  await sharp(buf).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(path.join(dir, `body-${n}.jpg`));
  await sharp(buf).webp({ quality: 78 }).toFile(path.join(dir, `body-${n}.webp`));
  return { jpg: `images/insights/${slug}/body-${n}.jpg`, webp: `images/insights/${slug}/body-${n}.webp`, w: m.width, h: m.height };
}

// ---------- markdown ----------
async function renderBody(md, slug) {
  const imgs = [];
  const tokens = marked.lexer(md || "");
  marked.walkTokens(tokens, (t) => { if (t.type === "image") imgs.push(t); });
  let n = 0;
  for (const t of imgs) { t._out = await bodyImage(t.href, slug, ++n); }
  // a paragraph that is only a YouTube link becomes a video
  const vids = [];
  for (const t of tokens) {
    if (t.type !== "paragraph") continue;
    const id = /^\s*<?(https?:\/\/\S+)>?\s*$/.test(t.text) ? ytId(t.text) : null;
    if (id) { t._yt = id; vids.push(t); }
  }
  for (const t of vids) t._poster = await videoPoster(t._yt, slug);
  const renderer = new marked.Renderer();
  renderer.image = function (t) {
    const o = t._out, cap = t.title ? `<figcaption>${esc(t.title)}</figcaption>` : "";
    if (!o) return `<figure class="article-figure"><img src="${esc(t.href)}" alt="${esc(t.text)}" loading="lazy">${cap}</figure>`;
    return `<figure class="article-figure"><picture><source type="image/webp" srcset="${o.webp}"><img src="${o.jpg}" alt="${esc(t.text)}" width="${o.w}" height="${o.h}" loading="lazy"></picture>${cap}</figure>`;
  };
  renderer.paragraph = function (t) {
    if (t._yt) return videoBlock({ id: t._yt, title: "Video", poster: t._poster });
    return `<p>${this.parser.parseInline(t.tokens)}</p>\n`;
  };
  renderer.blockquote = function (t) { return `<p class="pull">${this.parser.parseInline(t.tokens[0]?.tokens || [])}</p>\n`; };
  renderer.heading = function (t) {
    const text = this.parser.parseInline(t.tokens), id = t.text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `<h${t.depth} id="${id}">${text}</h${t.depth}>\n`;
  };
  renderer.list = function (t) {
    const items = t.items.map((i) => `<li>${this.parser.parse(i.tokens, !!i.loose)}</li>`).join("");
    return t.ordered ? `<ol>${items}</ol>\n` : `<ul class="ticks">${items}</ul>\n`;
  };
  return marked.parser(tokens, { renderer });
}

// ---------- page pieces ----------
const CTAS = {
  farmers: '<a class="btn btn-primary" href="farmers.html#farmers-join">Sign up as a farmer</a>',
  buyers: '<a class="btn btn-ghost" href="buyers.html#buyers-access">Request buyer access</a>',
  trucks: '<a class="btn btn-ghost" href="logistics.html#logistics-quote">Book a cold truck</a>',
};
function ctaBox(kind) {
  if (kind === "none") return "";
  const keys = kind === "all" || !CTAS[kind] ? ["farmers", "buyers", "trucks"] : [kind];
  const btns = keys.map((k, i) => (i === 0 ? CTAS[k].replace("btn-ghost", "btn-primary") : CTAS[k])).join("");
  return `<div class="article-cta"><h3>Grow, buy or move food that has to stay cold?</h3><div class="btn-row" style="margin-top:14px">${btns}</div></div>`;
}
function share(p) {
  const url = encodeURIComponent(`${SITE}/insights-${p.slug}.html`), t = encodeURIComponent(p.title);
  return `<div class="share"><span>Share this article:</span>` +
    `<a href="https://wa.me/?text=${t}%20${url}" target="_blank" rel="noopener">WhatsApp</a>` +
    `<a href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener">LinkedIn</a>` +
    `<a href="https://x.com/intent/post?text=${t}&url=${url}" target="_blank" rel="noopener">X</a>` +
    `<a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener">Facebook</a>` +
    `<button type="button" class="copy-link" data-url="${SITE}/insights-${p.slug}.html">Copy link</button></div>`;
}
function catTag(c) { return c ? `<span class="cat cat-${esc(c.color || "blue")}">${esc(c.name)}</span>` : ""; }
function metaLine(p) { return `${esc(p.authorObj?.name || "CryoChain team")} &middot; ${showDate(p.dateObj, p.tz)} &middot; ${p.readMins} min read`; }

const videoAttrs = (p) => (p.videoId ? ` data-yt-preview="${esc(p.videoId)}" data-preview-start="${Number(p.video?.preview_start) || 0}"` : "");
const videoBadge = (p) => (p.videoId ? '<span class="video-badge">Video</span>' : "");
function card(p) {
  const img = picture(p.images?.card, p.image_alt, "(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 380px", "3/2") + videoBadge(p);
  const search = esc([p.title, p.excerpt, ...(p.tags || []), p.catObj?.name].join(" ").toLowerCase());
  const inner = `<div class="post-img">${img}${p.coming_soon ? '<span class="soon">Coming soon</span>' : ""}</div>` +
    `<div class="pb">${catTag(p.catObj)}<h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p>` +
    `<p class="meta">${p.coming_soon ? esc(p.authorObj?.name || "CryoChain team") : metaLine(p)}</p></div>`;
  return p.coming_soon
    ? `<article class="post" data-cat="${esc(p.category)}" data-search="${search}">${inner}</article>`
    : `<a class="post" href="insights-${p.slug}.html" data-cat="${esc(p.category)}" data-search="${search}"${videoAttrs(p)}>${inner}</a>`;
}
function feature(p, kicker) {
  return `<a class="feature" href="insights-${p.slug}.html"${videoAttrs(p)}><div class="feature-img">` +
    picture(p.images?.feature, p.image_alt, "(max-width: 900px) 100vw, 55vw", "4/3") + videoBadge(p) +
    `</div><div class="feature-body"><span class="kicker">${esc(kicker)}</span>${catTag(p.catObj)}` +
    `<h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p><p class="meta">${metaLine(p)}</p>` +
    `<span class="btn btn-primary">Read the article</span></div></a>`;
}
const between = (html, name, content) => {
  const re = new RegExp(`(<!--CMS:${name}-->)[\\s\\S]*?(<!--/CMS:${name}-->)`);
  if (!re.test(html)) { console.warn(`  ! marker CMS:${name} not found`); return html; }
  return html.replace(re, `$1${content}$2`);
};

// ---------- main ----------
async function main() {
  console.log("CryoChain Insights build");
  await fs.rm(OUT, { recursive: true, force: true });
  await copySite(ROOT, OUT);

  const cats = (await readJsonDir(path.join(ROOT, "content/categories"))).sort((a, b) => (a.order ?? 10) - (b.order ?? 10));
  const authors = await readJsonDir(path.join(ROOT, "content/authors"));
  const settingsPath = path.join(ROOT, "content/settings/insights.json");
  const settings = (await exists(settingsPath)) ? JSON.parse(await fs.readFile(settingsPath, "utf8")) : {};

  const defaultTz = validZone(settings.default_timezone || DEFAULT_TZ);
  const posts = [], upcoming = [];
  for (const f of await fs.readdir(path.join(ROOT, "content/posts"))) {
    if (!f.endsWith(".md")) continue;
    const { data, content } = matter(await fs.readFile(path.join(ROOT, "content/posts", f), "utf8"));
    const p = { ...data, body: content, slug: data.slug || f.replace(/\.md$/, "") };
    p.tz = validZone(p.timezone || defaultTz, defaultTz);
    if (p.timezone && p.tz !== p.timezone) console.warn(`  ! ${p.slug}: unknown time zone "${p.timezone}", using ${p.tz}`);
    p.dateObj = toMoment(p.date || "1970-01-01", p.tz);
    if (isNaN(p.dateObj)) { console.warn(`  ! ${p.slug}: publish time "${p.date}" could not be read, so it is held back`); continue; }
    p.updatedObj = p.updated ? toMoment(p.updated, p.tz) : null;
    if (p.draft) { console.log(`  - hidden: ${p.slug}`); continue; }
    if (p.dateObj > NOW) {
      console.log(`  - scheduled: ${p.slug} at ${p.date} ${p.tz} (${p.dateObj.toISOString()})`);
      if (!p.coming_soon) upcoming.push(p.dateObj.toISOString());
      continue;
    }
    p.catObj = cats.find((c) => c.slug === p.category);
    p.authorObj = authors.find((a) => a.slug === p.author) || authors.find((a) => a.slug === "cryochain-team");
    p.readMins = Math.max(1, Math.ceil((content.split(/\s+/).filter(Boolean).length) / 200));
    p.images = p.image ? await cropSet(p.image, p.slug, p.focus) : null;
    p.videoId = ytId(p.video?.url);
    if (p.video?.url && !p.videoId) console.warn(`  ! ${p.slug}: the video link is not a YouTube link, so it is skipped`);
    posts.push(p);
  }
  posts.sort((a, b) => b.dateObj - a.dateObj);
  const live = posts.filter((p) => !p.coming_soon);
  const main = live.find((p) => p.slug === settings.featured_post) || live[0];
  console.log(`  ${live.length} published, ${posts.length - live.length} coming soon. Main article: ${main ? main.slug : "none"}`);

  // remove any article page the build did not publish (for example a sample page, or an article now hidden or rescheduled)
  const keep = new Set(live.map((p) => `insights-${p.slug}.html`));
  for (const f of await fs.readdir(OUT)) {
    if (/^insights-.+\.html$/.test(f) && !keep.has(f)) { await fs.rm(path.join(OUT, f)); console.log(`  - removed unpublished page ${f}`); }
  }

  // article pages
  const tpl = await fs.readFile(path.join(ROOT, "insights-post-template.html"), "utf8");
  for (const [i, p] of live.entries()) {
    const body = await renderBody(p.body, p.slug);
    let heroVideo = "", videoLd = null;
    if (p.videoId) {
      const poster = (await videoPoster(p.videoId, p.slug)) || p.images?.hero || null;
      const vtitle = p.video.title || p.title;
      heroVideo = videoBlock({ id: p.videoId, title: vtitle, start: p.video.start, previewStart: p.video.preview_start, caption: p.video.caption, poster, hero: (p.video.position || "banner") === "banner" });
      videoLd = { "@type": "VideoObject", name: vtitle, description: p.excerpt || vtitle, uploadDate: p.dateObj.toISOString(),
        thumbnailUrl: poster ? `${SITE}/${poster[0].jpg}` : undefined, embedUrl: `https://www.youtube-nocookie.com/embed/${p.videoId}`,
        contentUrl: `https://www.youtube.com/watch?v=${p.videoId}` };
    }
    const related = live.filter((o) => o !== p && o.category === p.category).concat(live.filter((o) => o !== p && o.category !== p.category)).slice(0, 3);
    const newer = live[i - 1], older = live[i + 1];
    const desc = p.seo?.description || p.excerpt || "";
    const url = `${SITE}/insights-${p.slug}.html`;
    const og = p.images?.og?.[0] ? `${SITE}/${p.images.og[0].jpg}` : `${SITE}/assets/logo-stacked.png`;
    const jsonld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, description: desc, image: og,
      datePublished: p.dateObj.toISOString(), dateModified: (p.updatedObj || p.dateObj).toISOString(),
      author: { "@type": p.author === "cryochain-team" ? "Organization" : "Person", name: p.authorObj?.name || "CryoChain team" },
      publisher: { "@type": "Organization", name: "CryoChain", logo: { "@type": "ImageObject", url: `${SITE}/assets/logo-stacked.png` } },
      mainEntityOfPage: url };
    if (videoLd) jsonld.video = videoLd;
    const head = `<link rel="canonical" href="${url}">` +
      `<meta property="og:type" content="article"><meta property="og:title" content="${esc(p.seo?.title || p.title)}">` +
      `<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${og}">` +
      `<meta name="twitter:card" content="summary_large_image"><meta property="article:published_time" content="${p.dateObj.toISOString()}">` +
      (p.updatedObj ? `<meta property="article:modified_time" content="${p.updatedObj.toISOString()}">` : "") +
      `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;
    const a = p.authorObj || {};
    const avatar = a.photo ? `<img src="${esc(a.photo.replace(/^\//, ""))}" alt="" width="64" height="64">` : `<span class="avatar">${esc((a.name || "C").slice(0, 1))}</span>`;
    const map = {
      SEO_TITLE: esc((p.seo?.title || p.title) + " | CryoChain Insights"), DESCRIPTION: esc(desc), HEAD_EXTRA: head,
      CATEGORY: catTag(p.catObj), TITLE: esc(p.title), EXCERPT: esc(p.excerpt), META: metaLine(p) + (p.updatedObj ? ` &middot; Updated ${showDate(p.updatedObj, p.tz)}` : ""),
      HERO: p.videoId && (p.video.position || "banner") === "banner" ? heroVideo : picture(p.images?.hero, p.image_alt, "(max-width: 1200px) 100vw, 1160px", "16/9", true),
      VIDEO: p.videoId && p.video.position === "below" ? heroVideo : "",
      CAPTION: p.image_caption ? `<p class="hero-caption">${esc(p.image_caption)}</p>` : "",
      BODY: body, CTA: ctaBox(p.cta || "all"), SHARE: share(p),
      TAGS: (p.tags || []).length ? `<p class="tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : "",
      AUTHOR: `<div class="author-box">${avatar}<div><strong>${esc(a.name || "CryoChain team")}</strong>${a.role ? `<span>${esc(a.role)}</span>` : ""}${a.bio ? `<p>${esc(a.bio)}</p>` : ""}</div></div>`,
      PREVNEXT: `<nav class="prevnext" aria-label="More articles">${older ? `<a href="insights-${older.slug}.html"><small>Older</small>${esc(older.title)}</a>` : "<span></span>"}${newer ? `<a class="next" href="insights-${newer.slug}.html"><small>Newer</small>${esc(newer.title)}</a>` : ""}</nav>`,
      RELATED: related.length ? related.map(card).join("") : "",
    };
    const html = tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
    await fs.writeFile(path.join(OUT, `insights-${p.slug}.html`), html);
  }

  // Insights page and home page
  const usedCats = cats.filter((c) => posts.some((p) => p.category === c.slug));
  const filters = `<button type="button" class="filter on" data-filter="all" aria-pressed="true">All</button>` +
    usedCats.map((c) => `<button type="button" class="filter" data-filter="${esc(c.slug)}" aria-pressed="false">${esc(c.name)}</button>`).join("");
  const listed = posts.filter((p) => p !== main);
  let ins = await fs.readFile(path.join(OUT, "insights.html"), "utf8");
  const emptyNote = '<div class="empty-note"><h2>New articles are on the way</h2><p>The first Insights articles are being written. Sign up below to get them by email.</p></div>';
  ins = between(ins, "FEATURED", main ? feature(main, "Main article") : emptyNote);
  ins = between(ins, "FILTERS", filters);
  ins = between(ins, "LIST", listed.map(card).join(""));
  ins = between(ins, "PAGE_TITLE", esc(settings.page_title || "Insights from the cold chain."));
  ins = between(ins, "PAGE_INTRO", esc(settings.page_intro || ""));
  ins = ins.replace(/data-per-page="\d+"/, `data-per-page="${Number(settings.posts_per_page) || 9}"`);
  await fs.writeFile(path.join(OUT, "insights.html"), ins);

  let home = await fs.readFile(path.join(OUT, "index.html"), "utf8");
  home = between(home, "LATEST", main ? feature(main, settings.featured_post && main.slug === settings.featured_post ? "Featured article" : "New article")
    : '<div class="empty-note"><h2>New articles are on the way</h2><p>Check back soon for field notes and plain guides from CryoChain.</p></div>');
  home = between(home, "HOME_TITLE", esc(settings.home_title || "Latest from Insights"));
  await fs.writeFile(path.join(OUT, "index.html"), home);

  // RSS feed and sitemap
  const items = live.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/insights-${p.slug}.html</link>` +
    `<guid>${SITE}/insights-${p.slug}.html</guid><pubDate>${p.dateObj.toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join("");
  await fs.writeFile(path.join(OUT, "insights-feed.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>` +
    `<title>CryoChain Insights</title><link>${SITE}/insights.html</link><description>Field notes, plain guides and company news from CryoChain.</description>` +
    `<language>en</language>${items}</channel></rss>`);
  const pages = ["index.html", "farmers.html", "buyers.html", "logistics.html", "app.html", "insights.html", "contact.html", "privacy.html", "terms.html"];
  const urls = pages.map((u) => `<url><loc>${SITE}/${u === "index.html" ? "" : u}</loc></url>`)
    .concat(live.map((p) => `<url><loc>${SITE}/insights-${p.slug}.html</loc><lastmod>${(p.updatedObj || p.dateObj).toISOString().slice(0, 10)}</lastmod></url>`));
  await fs.writeFile(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  // Google Analytics settings from the admin (Site settings)
  const sitePath = path.join(ROOT, "content/settings/site.json");
  const ga = (await exists(sitePath)) ? (JSON.parse(await fs.readFile(sitePath, "utf8")).analytics || {}) : {};
  const gaId = String(ga.measurement_id || "").trim().toUpperCase();
  if (gaId && !/^G-[A-Z0-9]+$/.test(gaId)) console.warn(`  ! Google Analytics ID "${gaId}" does not look right, so analytics stays off`);
  await fs.writeFile(path.join(OUT, "assets", "analytics-settings.js"),
    `/* Written by the build from the admin, Site settings. */\nwindow.CRYO_ANALYTICS = ${JSON.stringify({ enabled: ga.enabled !== false, measurementId: /^G-[A-Z0-9]+$/.test(gaId) ? gaId : "", trackEvents: ga.track_events !== false })};\n`);
  const vs = (await exists(sitePath)) ? (JSON.parse(await fs.readFile(sitePath, "utf8")).video || {}) : {};
  await fs.writeFile(path.join(OUT, "assets", "video-settings.js"),
    `/* Written by the build from the admin, Site settings, Videos. */\nwindow.CRYO_VIDEO = ${JSON.stringify({ hoverPreviews: vs.hover_previews !== false,
      previewSeconds: Math.max(2, Math.min(15, Number(vs.preview_seconds) || 6)), hideSuggestions: vs.hide_suggestions !== false, privacyMode: vs.privacy_mode !== false })};\n`);
  console.log(`  Google Analytics: ${ga.enabled !== false && /^G-[A-Z0-9]+$/.test(gaId) ? gaId + " (after consent)" : "off"}`);

  upcoming.sort();
  await fs.writeFile(path.join(OUT, "scheduled.json"), JSON.stringify({ built: NOW.toISOString(), next: upcoming }));
  if (upcoming.length) console.log(`  next scheduled publish: ${upcoming[0]}`);
  await fs.writeFile(path.join(OUT, "robots.txt"), `User-agent: *\nDisallow: /admin/\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
