/* SPA Undangan Premium — Vanilla JS, JSON-driven */

const APP_VERSION = "1.0.0";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowISO() {
  return new Date().toISOString();
}

function safeText(s, fallback = "") {
  if (typeof s === "string" && s.trim()) return s;
  return fallback;
}

function formatDateID(dateISO) {
  // dateISO: YYYY-MM-DD
  const d = new Date(`${dateISO}T00:00:00+07:00`);
  const fmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return fmt.format(d);
}

function getGuestName() {
  const qs = new URLSearchParams(location.search);
  const to = qs.get("to");
  if (!to) return null;
  const cleaned = to.replace(/\+/g, " ").trim();
  return cleaned ? cleaned : null;
}

function setTheme(theme) {
  const root = document.documentElement;
  const c = theme?.colors || {};
  const map = {
    "--bg": c.bg,
    "--surface": c.surface,
    "--text": c.text,
    "--muted": c.muted,
    "--accent": c.accent,
    "--accent-soft": c.accentSoft
  };
  for (const [k, v] of Object.entries(map)) {
    if (v) root.style.setProperty(k, v);
  }
  const max = theme?.spacing?.maxWidth;
  if (typeof max === "number") root.style.setProperty("--max", `${max}px`);
  const space = theme?.spacing?.page;
  if (typeof space === "number") root.style.setProperty("--space", `${space}px`);
  const r = theme?.radius?.md;
  if (typeof r === "number") root.style.setProperty("--radius", `${r}px`);
  const rs = theme?.radius?.sm;
  if (typeof rs === "number") root.style.setProperty("--radius-sm", `${rs}px`);
}

function applyMeta(data) {
  const meta = data?.meta || {};
  const title = safeText(meta?.title, document.title || "Undangan");
  const desc = safeText(meta?.description, "");
  const url = safeText(meta?.url, "") || location.href;
  const ogImage = safeText(meta?.ogImage, "./assets/images/og.jpg");

  document.title = title;

  const set = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.setAttribute(attr, value);
  };

  set('meta[name="description"]', "content", desc);

  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", desc);
  set('meta[property="og:url"]', "content", url);
  set('meta[property="og:image"]', "content", ogImage);
  set('meta[property="og:site_name"]', "content", safeText(meta?.siteName, "Undangan Digital"));

  set('meta[name="twitter:title"]', "content", title);
  set('meta[name="twitter:description"]', "content", desc);
  set('meta[name="twitter:image"]', "content", ogImage);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", url);
}

function injectLDJSON(data) {
  const el = $("#ldjson-event");
  if (!el) return;

  const e = data?.event || {};
  const couple = data?.couple || {};
  const groom = couple?.groom || {};
  const bride = couple?.bride || {};
  const venue = e?.venue || {};
  const startTime24 = safeText(e?.startTime24, "09:00");
  const start = e?.dateISO ? `${e.dateISO}T${startTime24}:00+07:00` : null;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: safeText(data?.meta?.title, "Undangan"),
    description: safeText(data?.meta?.description, ""),
    startDate: start,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: safeText(venue?.name, ""),
      address: safeText(venue?.address, ""),
      url: safeText(venue?.mapsUrl, "")
    },
    organizer: {
      "@type": "Organization",
      name: `${safeText(groom?.nickname, "Mempelai")} & ${safeText(bride?.nickname, "Mempelai")}`
    }
  };

  el.textContent = JSON.stringify(ld);
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined) continue;
    if (k === "style" && typeof v === "object") {
      Object.assign(el.style, v);
      continue;
    }
    if (k === "dataset" && typeof v === "object") {
      for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = String(dv);
      continue;
    }
    if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2), v, { passive: k === "onscroll" || k === "ontouchmove" });
      continue;
    }
    if (k === "class") {
      el.className = v;
      continue;
    }
    if (k === "text") {
      el.textContent = v;
      continue;
    }
    el.setAttribute(k, String(v));
  }
  for (const ch of children) {
    if (ch === null || ch === undefined) continue;
    if (typeof ch === "string") el.appendChild(document.createTextNode(ch));
    else el.appendChild(ch);
  }
  return el;
}

function icon(name, size = 20) {
  // Icon CDN via Iconify web component (registered in index.html)
  const map = {
    chevRight: "mdi:chevron-right",
    volume: "mdi:volume-high",
    muted: "mdi:volume-mute",
    copy: "mdi:content-copy",
    close: "mdi:close",
    map: "mdi:map",
    up: "mdi:chevron-up"
  };
  const iconName = map[name];
  if (!iconName) return h("span", { class: "sr-only", text: name });

  return h("iconify-icon", {
    icon: iconName,
    width: String(size),
    height: String(size),
    "aria-hidden": "true",
    style: { display: "inline-block", verticalAlign: "-0.125em" }
  });
}

function toast(root, message) {
  const node = h(
    "div",
    {
      role: "status",
      "aria-live": "polite",
      style: {
        position: "fixed",
        left: "50%",
        bottom: "calc(16px + var(--safe-bot))",
        transform: "translate3d(-50%, 0, 0)",
        zIndex: 1200,
        padding: "12px 14px",
        borderRadius: "999px",
        background: "rgba(255,253,249,.88)",
        border: "1px solid rgba(182,139,106,.22)",
        boxShadow: "0 18px 40px rgba(0,0,0,.18)",
        backdropFilter: "blur(10px)",
        color: "var(--text)",
        fontSize: "13px",
        letterSpacing: ".01em",
        maxWidth: "min(92vw, 420px)"
      },
      text: message
    },
    []
  );
  root.appendChild(node);
  requestAnimationFrame(() => {
    node.animate(
      [
        { opacity: 0, transform: "translate3d(-50%, 10px, 0)" },
        { opacity: 1, transform: "translate3d(-50%, 0, 0)" }
      ],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
    );
  });
  window.setTimeout(() => {
    node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease", fill: "both" });
    window.setTimeout(() => node.remove(), 260);
  }, 2200);
}

function createSectionFrame({ id, kicker, title, subtitle }) {
  const wrap = h("section", {
    id,
    style: {
      padding: "calc(var(--space) * 2) var(--space)",
      position: "relative"
    }
  });

  const inner = h("div", {
    style: {
      maxWidth: "var(--max)",
      margin: "0 auto"
    }
  });

  const head = h("div", { dataset: { reveal: "1" } });
  head.appendChild(
    h("div", {
      style: {
        fontSize: "12px",
        letterSpacing: ".22em",
        textTransform: "uppercase",
        color: "var(--muted)"
      },
      text: safeText(kicker, "")
    })
  );
  head.appendChild(
    h("h2", {
      style: {
        margin: "10px 0 0 0",
        fontFamily: "Display, serif",
        fontWeight: "600",
        fontSize: "28px",
        lineHeight: "1.15",
        letterSpacing: "var(--displayTracking, .02em)"
      },
      text: safeText(title, "")
    })
  );
  if (subtitle) {
    head.appendChild(
      h("p", {
        style: { margin: "10px 0 0 0", color: "var(--muted)", maxWidth: "62ch" },
        text: subtitle
      })
    );
  }

  inner.appendChild(head);
  wrap.appendChild(inner);
  return { wrap, inner };
}

function createOrnamentCorner(pos = "tl") {
  const base = {
    position: "absolute",
    width: "180px",
    height: "180px",
    opacity: ".22",
    pointerEvents: "none",
    filter: "drop-shadow(0 24px 70px rgba(182,139,106,.12))"
  };
  const style = { ...base };
  if (pos === "tl") Object.assign(style, { top: "-56px", left: "-56px" });
  if (pos === "tr") Object.assign(style, { top: "-56px", right: "-56px", transform: "scaleX(-1)" });
  if (pos === "bl") Object.assign(style, { bottom: "-56px", left: "-56px", transform: "scaleY(-1)" });
  if (pos === "br") Object.assign(style, { bottom: "-56px", right: "-56px", transform: "scale(-1)" });

  // Minimal mandala-ish line art in SVG (no external dependency)
  return h(
    "svg",
    { width: "180", height: "180", viewBox: "0 0 180 180", style, "aria-hidden": "true" },
    [
      h("circle", { cx: "90", cy: "90", r: "62", stroke: "var(--accent)", "stroke-width": "1.1", fill: "none" }),
      h("circle", { cx: "90", cy: "90", r: "42", stroke: "var(--accent)", "stroke-width": "1.1", fill: "none", opacity: ".7" }),
      h("path", { d: "M90 18v18M90 144v18M18 90h18M144 90h18", stroke: "var(--accent)", "stroke-width": "1.1", "stroke-linecap": "round", opacity: ".6" }),
      h("path", { d: "M45 45l10 10M125 125l10 10M135 45l-10 10M55 125l-10 10", stroke: "var(--accent)", "stroke-width": "1.1", "stroke-linecap": "round", opacity: ".55" })
    ]
  );
}

function buildPreloader(data) {
  const enabled = !!data?.sections?.preloader;
  if (!enabled) return { node: null, done: async () => {} };

  const layer = h("div", {
    id: "preloader",
    "aria-hidden": "true",
    style: {
      position: "fixed",
      inset: "0",
      zIndex: "2000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)"
    }
  });

  const card = h("div", {
    style: {
      width: "min(520px, 86vw)",
      padding: "18px",
      borderRadius: "18px",
      background: "rgba(255,253,249,.72)",
      border: "1px solid rgba(182,139,106,.18)",
      backdropFilter: "blur(14px)",
      boxShadow: "0 28px 80px rgba(45,42,38,.10)"
    }
  });

  const line = h("div", {
    style: {
      height: "2px",
      borderRadius: "999px",
      background: "rgba(182,139,106,.22)",
      overflow: "hidden"
    }
  });
  const bar = h("div", {
    style: {
      height: "100%",
      width: "42%",
      borderRadius: "999px",
      background: "linear-gradient(90deg, rgba(182,139,106,0), rgba(182,139,106,.95), rgba(182,139,106,0))",
      transform: "translate3d(-60%,0,0)"
    }
  });
  line.appendChild(bar);

  const label = h("div", {
    style: { marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }
  });
  label.appendChild(
    h("div", {
      style: { fontFamily: "Display, serif", letterSpacing: ".12em", textTransform: "uppercase", fontSize: "12px", color: "var(--muted)" },
      text: "Loading"
    })
  );
  label.appendChild(h("div", { style: { fontSize: "12px", color: "var(--muted)" }, text: `v${APP_VERSION}` }));

  card.appendChild(line);
  card.appendChild(label);
  layer.appendChild(card);

  const anim = bar.animate(
    [
      { transform: "translate3d(-80%,0,0)" },
      { transform: "translate3d(260%,0,0)" }
    ],
    { duration: 1200, iterations: Infinity, easing: "cubic-bezier(.2,.8,.2,1)" }
  );

  async function done() {
    anim.cancel();
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease", fill: "both" });
    await sleep(440);
    layer.remove();
  }

  return { node: layer, done };
}

function buildCover(data, guestName, onOpen) {
  const enabled = !!data?.sections?.cover;
  if (!enabled) return null;

  const cover = h("div", {
    id: "cover",
    style: {
      position: "fixed",
      inset: "0",
      zIndex: "1500",
      background: "var(--bg)",
      display: "grid",
      placeItems: "center",
      padding: "calc(18px + var(--safe-top)) 18px calc(18px + var(--safe-bot))"
    }
  });

  const bg = h("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: "0",
      backgroundImage: `radial-gradient(1200px 500px at 50% 10%, rgba(182,139,106,.18), transparent 60%), radial-gradient(900px 420px at 30% 90%, rgba(215,183,157,.22), transparent 62%)`,
      filter: "saturate(1.05)"
    }
  });
  cover.appendChild(bg);

  cover.appendChild(createOrnamentCorner("tl"));
  cover.appendChild(createOrnamentCorner("br"));

  const card = h("div", {
    style: {
      position: "relative",
      width: "min(760px, 92vw)",
      borderRadius: "24px",
      background: "rgba(255,253,249,.78)",
      border: "1px solid rgba(182,139,106,.22)",
      boxShadow: "0 40px 120px rgba(45,42,38,.12)",
      backdropFilter: "blur(16px)",
      overflow: "hidden"
    }
  });

  const heroImg = data?.assets?.images?.hero;
  const heroAlt = data?.assets?.images?.heroAlt || "Cover";

  const media = h("div", {
    style: {
      position: "relative",
      aspectRatio: "16/10",
      overflow: "hidden",
      borderBottom: "1px solid rgba(182,139,106,.16)"
    }
  });
  media.appendChild(
    h("img", {
      src: heroImg,
      alt: heroAlt,
      loading: "eager",
      decoding: "async",
      fetchpriority: "high",
      width: "1600",
      height: "1000",
      style: { width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.02)" }
    })
  );
  media.appendChild(
    h("div", {
      "aria-hidden": "true",
      style: { position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(45,42,38,.08), rgba(45,42,38,.52))" }
    })
  );
  card.appendChild(media);

  const pad = h("div", { style: { padding: "18px 18px 20px" } });
  pad.appendChild(
    h("div", {
      style: {
        fontSize: "12px",
        letterSpacing: ".24em",
        textTransform: "uppercase",
        color: "var(--muted)"
      },
      text: safeText(data?.cover?.kicker, "Ngunduh Mantu")
    })
  );

  const names = h("div", { style: { marginTop: "12px" } });
  names.appendChild(
    h("div", {
      style: { fontFamily: "Script, cursive", fontSize: "46px", lineHeight: "1", color: "var(--surface)", textShadow: "0 16px 50px rgba(0,0,0,.32)" },
      text: safeText(data?.cover?.headline, "Asep & Lian")
    })
  );
  names.appendChild(
    h("div", {
      style: {
        marginTop: "10px",
        fontFamily: "Display, serif",
        fontSize: "14px",
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: "rgba(255,253,249,.92)"
      },
      text: safeText(data?.cover?.dateText, formatDateID(data?.event?.dateISO || "2026-06-07"))
    })
  );
  media.appendChild(
    h("div", { style: { position: "absolute", left: "18px", right: "18px", bottom: "18px" } }, [names])
  );

  const toLabel = safeText(data?.cover?.toLabel, "Kepada Yth");
  const toName = guestName || safeText(data?.cover?.toFallback, "Tamu Undangan");
  const to = h("div", { style: { marginTop: "14px", display: "grid", gap: "6px" } });
  to.appendChild(h("div", { style: { fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)" }, text: toLabel }));
  to.appendChild(h("div", { style: { fontFamily: "Display, serif", fontSize: "20px" }, text: toName }));
  pad.appendChild(to);

  const cta = h(
    "button",
    {
      class: "btn btn-primary",
      style: { marginTop: "16px", width: "100%" },
      type: "button",
      "aria-label": "Buka undangan",
      onclick: () => onOpen()
    },
    [h("span", { text: safeText(data?.cover?.cta, "Open Invitation") }), icon("chevRight", 18)]
  );
  pad.appendChild(cta);

  pad.appendChild(
    h("div", {
      style: { marginTop: "12px", fontSize: "12px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }
    }, [
      h("span", { text: "Scroll cerita setelah dibuka." }),
      h("span", { text: "Tap untuk audio." })
    ])
  );

  card.appendChild(pad);
  cover.appendChild(card);

  // cinematic entrance
  card.animate(
    [
      { opacity: 0, transform: "translate3d(0,10px,0) scale(.992)" },
      { opacity: 1, transform: "translate3d(0,0,0) scale(1)" }
    ],
    { duration: 720, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
  );

  return cover;
}

function buildNav(data) {
  const nav = h("nav", {
    "aria-label": "Navigasi",
    style: {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "1100",
      paddingTop: "var(--safe-top)",
      pointerEvents: "none"
    }
  });

  const bar = h("div", {
    style: {
      pointerEvents: "auto",
      margin: "10px auto 0",
      width: "min(var(--max), calc(100% - 2*var(--space)))",
      borderRadius: "999px",
      background: "rgba(255,253,249,.70)",
      border: "1px solid rgba(182,139,106,.18)",
      backdropFilter: "blur(14px)",
      boxShadow: "0 18px 50px rgba(45,42,38,.10)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 10px"
    }
  });

  const left = h("div", { style: { display: "flex", alignItems: "center", gap: "10px", paddingLeft: "8px" } });
  left.appendChild(
    h("div", {
      style: { fontFamily: "Display, serif", fontSize: "13px", letterSpacing: ".08em", textTransform: "uppercase" },
      text: safeText(data?.event?.type, "Undangan")
    })
  );
  const activePill = h("div", {
    style: {
      color: "var(--muted)",
      fontSize: "12px",
      padding: "6px 10px",
      borderRadius: "999px",
      background: "rgba(247,244,239,.66)",
      border: "1px solid rgba(182,139,106,.14)",
      maxWidth: "46vw",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    text: safeText(data?.event?.time, "")
  });
  activePill.dataset.active = "pill";
  left.appendChild(activePill);

  const right = h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } });

  const progress = h("div", {
    "aria-hidden": "true",
    style: { width: "92px", height: "2px", borderRadius: "999px", background: "rgba(182,139,106,.20)", overflow: "hidden", marginRight: "4px" }
  });
  const progressBar = h("div", { style: { height: "100%", width: "0%", background: "rgba(182,139,106,.92)" } });
  progress.appendChild(progressBar);

  const musicBtn = h(
    "button",
    { class: "btn btn-ghost", type: "button", "aria-label": "Toggle musik", style: { width: "44px", height: "44px" } },
    [icon("muted", 20)]
  );
  musicBtn.dataset.music = "btn";

  const topBtn = h(
    "button",
    { class: "btn btn-ghost", type: "button", "aria-label": "Kembali ke atas", style: { width: "44px", height: "44px" }, onclick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    [icon("up", 20)]
  );

  right.appendChild(progress);
  right.appendChild(musicBtn);
  right.appendChild(topBtn);

  bar.appendChild(left);
  bar.appendChild(right);
  nav.appendChild(bar);

  function setProgress(p) {
    progressBar.style.width = `${clamp(p, 0, 1) * 100}%`;
  }

  function setActive(label) {
    activePill.textContent = safeText(label, safeText(data?.event?.time, ""));
  }

  return { nav, bar, setProgress, musicBtn, setActive };
}

function setupReveal(data) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return { observe: () => {}, destroy: () => {} };

  const rootMargin = data?.motion?.reveal?.rootMargin || "0px 0px -12% 0px";
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { root: null, threshold: 0.12, rootMargin }
  );

  function observe(root = document) {
    for (const el of $$("[data-reveal]", root)) io.observe(el);
  }

  function destroy() {
    io.disconnect();
  }

  return { observe, destroy };
}

function setupScrollProgress(setProgress) {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress(window.scrollY / max);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  return () => window.removeEventListener("scroll", onScroll);
}

function setupNavBlur(bar, data) {
  if (!bar) return () => {};
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return () => {};

  let ticking = false;
  function tick() {
    ticking = false;
    const y = window.scrollY || 0;
    const t = clamp(y / 420, 0, 1);
    const alpha = 0.68 + t * 0.22; // 0.68 -> 0.90
    const borderA = 0.16 + t * 0.12;
    const blur = 14 + t * 6;
    bar.style.background = `rgba(255,253,249,${alpha.toFixed(3)})`;
    bar.style.borderColor = `rgba(182,139,106,${borderA.toFixed(3)})`;
    bar.style.backdropFilter = `blur(${blur.toFixed(1)}px)`;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

function setupMagneticButtons() {
  const fine = window.matchMedia?.("(pointer: fine)")?.matches;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (!fine || reduce) return () => {};

  const nodes = $$(".btn-primary, .btn-ghost");
  if (!nodes.length) return () => {};

  const max = 8;
  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
    const y = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
    el.style.transform = `translate3d(${(x * max).toFixed(2)}px, ${(y * max).toFixed(2)}px, 0)`;
  };
  const onLeave = (e) => {
    const el = e.currentTarget;
    el.style.transform = "translate3d(0,0,0)";
  };

  for (const el of nodes) {
    el.style.willChange = "transform";
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
  }

  return () => {
    for (const el of nodes) {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.willChange = "";
      el.style.transform = "";
    }
  };
}

function setupSoftParallax(data) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return () => {};
  if (!data?.motion?.parallax?.enabled) return () => {};

  const maxPx = clamp(Number(data?.motion?.parallax?.maxPx || 16), 0, 32);
  const nodes = $$("[data-parallax]");
  if (!nodes.length) return () => {};

  let ticking = false;
  function tick() {
    ticking = false;
    const y = window.scrollY || 0;
    const vh = window.innerHeight || 1;
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const t = (center - vh / 2) / (vh / 2);
      const px = clamp(-t * maxPx, -maxPx, maxPx);
      el.style.transform = `translate3d(0, ${px.toFixed(2)}px, 0)`;
    }
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

function maybeEnableSnap(data) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return;
  const enabled = !!data?.motion?.snap?.enabled;
  const minWidth = Number(data?.motion?.snap?.minWidth || 980);
  if (!enabled) return;
  if ((window.innerWidth || 0) < minWidth) return;

  document.documentElement.style.scrollSnapType = "y proximity";
  for (const sec of $$("section")) {
    sec.style.scrollSnapAlign = "start";
    sec.style.scrollMarginTop = "88px";
  }
}

function storageKey(data) {
  return `wedding:${data?.id || "event"}:wishes:v1`;
}

function loadWishes(data) {
  const key = storageKey(data);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.isArray(data?.wishes?.seed) ? data.wishes.seed.slice() : [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return Array.isArray(data?.wishes?.seed) ? data.wishes.seed.slice() : [];
  }
}

function saveWishes(data, wishes) {
  const key = storageKey(data);
  try {
    localStorage.setItem(key, JSON.stringify(wishes));
  } catch {
    // ignore
  }
}

function buildMain(data, guestName) {
  const main = h("main", { id: "main" });
  return main;
}

function renderHero(main, data, guestName) {
  if (!data?.sections?.hero) return;

  const hero = h("section", {
    id: "hero",
    style: {
      padding: "calc(108px + var(--safe-top)) var(--space) 54px",
      position: "relative"
    }
  });

  const bg = h("div", {
    "aria-hidden": "true",
    dataset: { parallax: "1" },
    style: {
      position: "absolute",
      inset: "0",
      backgroundImage: "radial-gradient(900px 380px at 50% 0%, rgba(182,139,106,.18), transparent 60%), radial-gradient(900px 420px at 15% 100%, rgba(215,183,157,.22), transparent 62%)",
      opacity: ".9",
      transform: "translate3d(0,0,0)"
    }
  });
  hero.appendChild(bg);
  hero.appendChild(createOrnamentCorner("tr"));

  const inner = h("div", { style: { maxWidth: "var(--max)", margin: "0 auto", position: "relative" } });
  const grid = h("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "18px",
      alignItems: "end"
    }
  });

  const left = h("div", { dataset: { reveal: "1" } });
  left.appendChild(
    h("div", {
      style: { fontSize: "12px", letterSpacing: ".24em", textTransform: "uppercase", color: "var(--muted)" },
      text: safeText(data?.opening?.greeting, "Assalamu'alaikum Warahmatullahi Wabarakatuh")
    })
  );
  left.appendChild(
    h("h1", {
      style: { margin: "12px 0 0", fontFamily: "Display, serif", fontWeight: "600", fontSize: "38px", lineHeight: "1.08", letterSpacing: "var(--displayTracking, .02em)" },
      text: safeText(data?.event?.type, "Ngunduh Mantu")
    })
  );
  left.appendChild(
    h("p", {
      style: { margin: "12px 0 0", color: "var(--muted)", maxWidth: "62ch" },
      text: safeText(data?.opening?.verse, "")
    })
  );

  const toWrap = h("div", {
    style: {
      marginTop: "16px",
      display: "inline-flex",
      alignItems: "baseline",
      gap: "10px",
      padding: "10px 14px",
      borderRadius: "999px",
      background: "rgba(255,253,249,.72)",
      border: "1px solid rgba(182,139,106,.18)",
      backdropFilter: "blur(12px)"
    }
  });
  toWrap.appendChild(h("span", { style: { fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)" }, text: safeText(data?.cover?.toLabel, "Kepada Yth") }));
  toWrap.appendChild(h("span", { style: { fontFamily: "Display, serif", fontSize: "14px" }, text: guestName || safeText(data?.cover?.toFallback, "Tamu Undangan") }));
  left.appendChild(toWrap);

  const right = h("div", { dataset: { reveal: "1" } });
  const card = h("div", {
    style: {
      borderRadius: "24px",
      background: "rgba(255,253,249,.78)",
      border: "1px solid rgba(182,139,106,.20)",
      boxShadow: "0 28px 90px rgba(45,42,38,.10)",
      overflow: "hidden"
    }
  });
  const heroImg = h("img", {
    src: data?.assets?.images?.hero,
    alt: safeText(data?.assets?.images?.heroAlt, "Foto"),
    loading: "lazy",
    decoding: "async",
    width: "1600",
    height: "1000",
    style: { width: "100%", height: "auto", display: "block" }
  });
  card.appendChild(heroImg);
  const meta = h("div", { style: { padding: "14px 14px 16px" } });
  meta.appendChild(h("div", { style: { fontFamily: "Script, cursive", fontSize: "34px", lineHeight: "1", color: "var(--text)" }, text: safeText(data?.cover?.headline, "Asep & Lian") }));
  meta.appendChild(h("div", { style: { marginTop: "8px", color: "var(--muted)", fontSize: "13px" }, text: formatDateID(data?.event?.dateISO || "2026-06-07") }));
  card.appendChild(meta);
  right.appendChild(card);

  grid.appendChild(left);
  grid.appendChild(right);
  inner.appendChild(grid);
  hero.appendChild(inner);

  // responsive upgrade
  const mq = window.matchMedia("(min-width: 900px)");
  function apply() {
    grid.style.gridTemplateColumns = mq.matches ? "1.15fr .85fr" : "1fr";
    left.querySelector("h1").style.fontSize = mq.matches ? "54px" : "38px";
  }
  apply();
  mq.addEventListener?.("change", apply);

  main.appendChild(hero);
}

function renderCountdown(main, data) {
  if (!data?.sections?.countdown) return;

  const { wrap, inner } = createSectionFrame({ id: "countdown", kicker: "Countdown", title: "Menuju Hari Bahagia", subtitle: "Kami menanti kehadiran dan doa restu Anda." });

  const box = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      borderRadius: "22px",
      background: "rgba(255,253,249,.76)",
      border: "1px solid rgba(182,139,106,.18)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 18px 60px rgba(45,42,38,.10)",
      padding: "18px"
    }
  });

  const grid = h("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" } });
  const items = [
    { k: "days", label: "Hari" },
    { k: "hours", label: "Jam" },
    { k: "mins", label: "Menit" },
    { k: "secs", label: "Detik" }
  ];
  const nodes = {};
  for (const it of items) {
    const cell = h("div", { style: { padding: "14px 10px", borderRadius: "16px", background: "rgba(247,244,239,.62)", border: "1px solid rgba(182,139,106,.14)", textAlign: "center" } });
    const num = h("div", { style: { fontFamily: "Display, serif", fontSize: "26px", lineHeight: "1.0" }, text: "—" });
    const lab = h("div", { style: { marginTop: "8px", fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)" }, text: it.label });
    cell.appendChild(num);
    cell.appendChild(lab);
    grid.appendChild(cell);
    nodes[it.k] = num;
  }
  box.appendChild(grid);

  const hint = h("div", { style: { marginTop: "12px", fontSize: "12px", color: "var(--muted)" }, text: safeText(data?.event?.time, "") + " • " + safeText(data?.event?.venue?.name, "") });
  box.appendChild(hint);

  inner.appendChild(box);
  wrap.appendChild(inner);
  main.appendChild(wrap);

  const targetISO = data?.event?.dateISO ? `${data.event.dateISO}T09:00:00+07:00` : null;
  if (!targetISO) return;

  function setDigit(el, value) {
    const t = String(value).padStart(2, "0");
    if (el.textContent === t) return;
    el.textContent = t;
    el.animate([{ transform: "translate3d(0, -2px, 0)", opacity: 0.7 }, { transform: "translate3d(0, 0, 0)", opacity: 1 }], { duration: 240, easing: "ease-out" });
  }

  function tick() {
    const t = new Date(targetISO).getTime();
    const ms = t - Date.now();
    const s = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(s / (3600 * 24));
    const hours = Math.floor((s % (3600 * 24)) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    setDigit(nodes.days, days);
    setDigit(nodes.hours, hours);
    setDigit(nodes.mins, mins);
    setDigit(nodes.secs, secs);
  }
  tick();
  const id = window.setInterval(tick, 1000);
  window.addEventListener("pagehide", () => window.clearInterval(id), { once: true });
}

function renderCouple(main, data) {
  if (!data?.sections?.couple) return;
  const { wrap, inner } = createSectionFrame({
    id: "couple",
    kicker: "Couple",
    title: "Mempelai",
    subtitle: "Dengan hormat, kami memperkenalkan putra-putri kami."
  });

  const grid = h("div", {
    style: { marginTop: "18px", display: "grid", gridTemplateColumns: "1fr", gap: "14px" }
  });

  const mkCard = (person, side) => {
    const card = h("div", {
      dataset: { reveal: "1" },
      style: {
        borderRadius: "24px",
        background: "rgba(255,253,249,.80)",
        border: "1px solid rgba(182,139,106,.18)",
        boxShadow: "0 18px 60px rgba(45,42,38,.09)",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "center"
      }
    });

    const media = h("div", { style: { position: "relative", aspectRatio: "4/5", overflow: "hidden" } });
    media.appendChild(
      h("img", {
        src: person?.photo,
        alt: `Foto ${safeText(person?.nickname, "mempelai")}`,
        loading: "lazy",
        decoding: "async",
        width: "1200",
        height: "1500",
        style: { width: "100%", height: "100%", objectFit: "cover" }
      })
    );
    media.appendChild(h("div", { "aria-hidden": "true", style: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(45,42,38,.0), rgba(45,42,38,.26))" } }));

    const body = h("div", { style: { padding: "16px 16px 18px" } });
    body.appendChild(h("div", { style: { fontFamily: "Script, cursive", fontSize: "34px", lineHeight: "1", color: "var(--accent)" }, text: safeText(person?.nickname, "") }));
    body.appendChild(h("div", { style: { marginTop: "8px", fontFamily: "Display, serif", fontSize: "22px" }, text: safeText(person?.name, "") }));
    body.appendChild(h("div", { style: { marginTop: "8px", color: "var(--muted)" }, text: safeText(person?.childOrder, "") }));
    body.appendChild(h("div", { style: { marginTop: "6px" }, text: safeText(person?.parents, "") }));

    card.appendChild(media);
    card.appendChild(body);

    const mq = window.matchMedia("(min-width: 820px)");
    function apply() {
      card.style.gridTemplateColumns = mq.matches ? (side === "left" ? "1fr 1.1fr" : "1.1fr 1fr") : "1fr";
      if (mq.matches && side === "right") {
        card.insertBefore(body, media);
      } else if (!mq.matches && card.firstChild !== media) {
        card.insertBefore(media, body);
      }
    }
    apply();
    mq.addEventListener?.("change", apply);
    return card;
  };

  grid.appendChild(mkCard(data?.couple?.groom, "left"));
  grid.appendChild(mkCard(data?.couple?.bride, "right"));

  inner.appendChild(grid);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderEvent(main, data, modal) {
  if (!data?.sections?.event) return;
  const e = data?.event || {};
  const v = e?.venue || {};
  const { wrap, inner } = createSectionFrame({ id: "event", kicker: "Event", title: "Detail Acara", subtitle: "Waktu dan lokasi acara." });

  const card = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      borderRadius: "24px",
      background: "rgba(255,253,249,.82)",
      border: "1px solid rgba(182,139,106,.18)",
      boxShadow: "0 18px 60px rgba(45,42,38,.10)",
      overflow: "hidden"
    }
  });

  const top = h("div", { style: { padding: "16px" } });
  top.appendChild(h("div", { style: { fontFamily: "Display, serif", fontSize: "22px" }, text: safeText(e?.title, "Resepsi") }));
  top.appendChild(h("div", { style: { marginTop: "8px", color: "var(--muted)" }, text: `${formatDateID(e?.dateISO || "2026-06-07")} • ${safeText(e?.time, "")}` }));
  top.appendChild(h("div", { style: { marginTop: "10px" }, text: safeText(v?.name, "") }));
  top.appendChild(h("div", { style: { marginTop: "4px", color: "var(--muted)" }, text: safeText(v?.address, "") }));

  const actions = h("div", { style: { padding: "0 16px 16px", display: "flex", flexWrap: "wrap", gap: "10px" } });
  const maps = safeText(v?.mapsUrl, "");
  if (maps) {
    actions.appendChild(
      h("a", { class: "btn btn-primary", href: maps, target: "_blank", rel: "noreferrer", style: { padding: "12px 16px" }, "aria-label": "Buka Google Maps" }, [
        icon("map", 18),
        h("span", { text: safeText(data?.copy?.openMaps, "Open Maps") })
      ])
    );
  }
  card.appendChild(top);
  card.appendChild(actions);

  inner.appendChild(card);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderStory(main, data) {
  if (!data?.sections?.story) return;
  const s = data?.story || {};
  const { wrap, inner } = createSectionFrame({ id: "story", kicker: "Story", title: safeText(s?.title, "Our Story"), subtitle: safeText(s?.subtitle, "") });

  const items = Array.isArray(s?.timeline) ? s.timeline : [];
  const rail = h("div", { style: { marginTop: "18px", display: "grid", gap: "12px" } });

  for (const it of items) {
    const row = h("div", {
      dataset: { reveal: "1" },
      style: {
        borderRadius: "20px",
        background: "rgba(255,253,249,.80)",
        border: "1px solid rgba(182,139,106,.16)",
        padding: "14px 14px",
        boxShadow: "0 14px 44px rgba(45,42,38,.08)"
      }
    });
    const top = h("div", { style: { display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "baseline" } });
    top.appendChild(h("div", { style: { fontFamily: "Display, serif", fontSize: "16px" }, text: safeText(it?.title, "") }));
    top.appendChild(h("div", { style: { fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)" }, text: safeText(it?.date, "") }));
    row.appendChild(top);
    row.appendChild(h("div", { style: { marginTop: "8px", color: "var(--muted)" }, text: safeText(it?.desc, "") }));
    rail.appendChild(row);
  }

  inner.appendChild(rail);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderFamily(main, data) {
  if (!data?.sections?.family) return;
  const f = data?.family || {};
  const { wrap, inner } = createSectionFrame({ id: "family", kicker: "Family", title: safeText(f?.title, "Family"), subtitle: "Keluarga besar yang turut berbahagia." });

  function listCard(title, items) {
    const card = h("div", {
      dataset: { reveal: "1" },
      style: {
        borderRadius: "22px",
        background: "rgba(255,253,249,.80)",
        border: "1px solid rgba(182,139,106,.16)",
        boxShadow: "0 14px 44px rgba(45,42,38,.08)",
        padding: "14px 14px"
      }
    });
    card.appendChild(h("div", { style: { fontFamily: "Display, serif", fontSize: "16px" }, text: safeText(title, "") }));
    const ul = h("ul", { style: { margin: "10px 0 0", padding: "0 0 0 18px", color: "var(--muted)" } });
    for (const it of items || []) ul.appendChild(h("li", { style: { margin: "6px 0" }, text: safeText(it, "") }));
    card.appendChild(ul);
    return card;
  }

  const grid = h("div", { style: { marginTop: "18px", display: "grid", gridTemplateColumns: "1fr", gap: "12px" } });
  grid.appendChild(listCard(f?.groomSideTitle, f?.groomSide));
  grid.appendChild(listCard(f?.brideSideTitle, f?.brideSide));
  grid.appendChild(listCard(f?.alsoInviteTitle, f?.alsoInvite));

  const mq = window.matchMedia("(min-width: 900px)");
  function apply() {
    grid.style.gridTemplateColumns = mq.matches ? "1fr 1fr" : "1fr";
    if (mq.matches) grid.lastChild.style.gridColumn = "1 / -1";
    else grid.lastChild.style.gridColumn = "auto";
  }
  apply();
  mq.addEventListener?.("change", apply);

  inner.appendChild(grid);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderGallery(main, data, openLightbox) {
  if (!data?.sections?.gallery) return;
  const g = data?.gallery || {};
  const { wrap, inner } = createSectionFrame({ id: "gallery", kicker: "Gallery", title: safeText(g?.title, "Gallery"), subtitle: safeText(g?.subtitle, "") });

  const groups = Array.isArray(g?.groups) ? g.groups : [];
  const all = [];
  for (const gr of groups) {
    for (const img of gr?.images || []) all.push({ ...img, group: gr?.label || "" });
  }

  const grid = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      columnCount: "2",
      columnGap: "10px"
    }
  });

  const mq = window.matchMedia("(min-width: 900px)");
  function apply() {
    grid.style.columnCount = mq.matches ? "3" : "2";
  }
  apply();
  mq.addEventListener?.("change", apply);

  all.forEach((img, idx) => {
    const btn = h("button", {
      class: "btn",
      type: "button",
      "aria-label": `Buka foto ${idx + 1}`,
      style: {
        width: "100%",
        display: "inline-block",
        margin: "0 0 10px",
        padding: "0",
        borderRadius: "18px",
        overflow: "hidden",
        border: "1px solid rgba(182,139,106,.14)",
        boxShadow: "0 14px 44px rgba(45,42,38,.06)",
        background: "rgba(255,253,249,.60)"
      },
      onclick: () => openLightbox(idx)
    });
    const im = h("img", {
      "data-src": img.src,
      alt: safeText(img.alt, "Gallery"),
      loading: "lazy",
      decoding: "async",
      width: String(img.w || 1200),
      height: String(img.h || 900),
      style: { width: "100%", height: "auto", display: "block" }
    });
    btn.appendChild(im);
    grid.appendChild(btn);
  });

  inner.appendChild(grid);
  wrap.appendChild(inner);
  main.appendChild(wrap);

  // lazy swap data-src -> src (avoid network before IO)
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const img = e.target;
        const ds = img.getAttribute("data-src");
        if (ds) img.setAttribute("src", ds);
        img.removeAttribute("data-src");
        io.unobserve(img);
      }
    },
    { root: null, threshold: 0.12, rootMargin: "120px" }
  );
  $$("img[data-src]", grid).forEach((img) => io.observe(img));
  window.addEventListener("pagehide", () => io.disconnect(), { once: true });

  return all;
}

function renderGift(main, data, modal) {
  if (!data?.sections?.gift) return;
  const gift = data?.gift || {};
  const { wrap, inner } = createSectionFrame({ id: "gift", kicker: "Gift", title: safeText(gift?.title, "Digital Gift"), subtitle: safeText(gift?.subtitle, "") });

  const box = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      borderRadius: "24px",
      background: "rgba(255,253,249,.82)",
      border: "1px solid rgba(182,139,106,.18)",
      boxShadow: "0 18px 60px rgba(45,42,38,.10)",
      overflow: "hidden",
      padding: "14px"
    }
  });

  const accs = Array.isArray(gift?.accounts) ? gift.accounts : [];
  for (const a of accs) {
    const row = h("div", {
      style: {
        padding: "12px 12px",
        borderRadius: "18px",
        background: "rgba(247,244,239,.62)",
        border: "1px solid rgba(182,139,106,.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        marginBottom: "10px"
      }
    });
    const left = h("div");
    left.appendChild(h("div", { style: { fontFamily: "Display, serif" }, text: safeText(a?.bank, "") }));
    left.appendChild(h("div", { style: { color: "var(--muted)", fontSize: "13px" }, text: `${safeText(a?.name, "")} • ${safeText(a?.number, "")}` }));

    const copyBtn = h(
      "button",
      { class: "btn btn-ghost", type: "button", "aria-label": `Copy ${safeText(a?.bank, "")}`, onclick: async () => {
        const num = safeText(a?.number, "");
        if (!num) return;
        try {
          await navigator.clipboard.writeText(num);
          toast(document.body, safeText(data?.copy?.toastCopied, "Nomor rekening tersalin."));
        } catch {
          toast(document.body, safeText(data?.copy?.toastCopyFail, "Gagal menyalin. Silakan salin manual."));
        }
      } },
      [icon("copy", 18)]
    );
    row.appendChild(left);
    row.appendChild(copyBtn);
    box.appendChild(row);
  }

  if (gift?.qris?.enabled && gift?.qris?.image) {
    const q = h("button", {
      class: "btn btn-primary",
      type: "button",
      style: { width: "100%", marginTop: "6px" },
      onclick: () => modal.open({ title: "QRIS", kind: "image", src: gift.qris.image, alt: "QRIS" })
    }, [h("span", { text: safeText(data?.copy?.viewQRIS, "Lihat QRIS") }), icon("chevRight", 18)]);
    box.appendChild(q);
  }

  inner.appendChild(box);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderRSVP(main, data, wishesState) {
  if (!data?.sections?.rsvp) return;
  const r = data?.rsvp || {};
  const { wrap, inner } = createSectionFrame({ id: "rsvp", kicker: "RSVP", title: safeText(r?.title, "RSVP"), subtitle: safeText(r?.subtitle, "") });

  const card = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      borderRadius: "24px",
      background: "rgba(255,253,249,.82)",
      border: "1px solid rgba(182,139,106,.18)",
      boxShadow: "0 18px 60px rgba(45,42,38,.10)",
      overflow: "hidden",
      padding: "16px"
    }
  });

  const form = h("form", { "aria-label": "Form RSVP" });
  const field = (label, input) => {
    const w = h("label", { style: { display: "grid", gap: "6px", marginBottom: "12px" } });
    w.appendChild(h("span", { style: { fontSize: "12px", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)" }, text: label }));
    w.appendChild(input);
    return w;
  };
  const inputStyle = {
    width: "100%",
    padding: "12px 12px",
    borderRadius: "14px",
    border: "1px solid rgba(182,139,106,.18)",
    background: "rgba(247,244,239,.62)",
    outline: "none"
  };

  const name = h("input", { required: true, name: "name", autocomplete: "name", placeholder: "Nama Anda", style: inputStyle });
  const attendance = h("select", { name: "attendance", required: true, style: inputStyle });
  const opts = Array.isArray(r?.attendanceOptions) ? r.attendanceOptions : [{ value: "hadir", label: "Hadir" }, { value: "tidak_hadir", label: "Tidak Hadir" }];
  attendance.appendChild(h("option", { value: "", disabled: true, selected: true, text: "Pilih..." }));
  for (const o of opts) attendance.appendChild(h("option", { value: safeText(o?.value, ""), text: safeText(o?.label, "") }));

  const maxGuests = clamp(Number(r?.maxGuests || 5), 1, 10);
  const guests = h("input", { name: "guests", type: "number", inputmode: "numeric", min: "1", max: String(maxGuests), value: "1", style: inputStyle });
  const msg = h("textarea", { name: "message", rows: "3", placeholder: "Ucapan & doa", style: { ...inputStyle, resize: "vertical" } });

  form.appendChild(field("Nama", name));
  form.appendChild(field("Kehadiran", attendance));
  form.appendChild(field("Jumlah tamu", guests));
  form.appendChild(field("Ucapan (opsional)", msg));

  const row = h("div", { style: { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between" } });
  const submit = h("button", { class: "btn btn-primary", type: "submit", style: { padding: "12px 16px" } }, [h("span", { text: "Kirim RSVP" }), icon("chevRight", 18)]);
  const note = h("div", { style: { color: "var(--muted)", fontSize: "12px" }, text: safeText(r?.noteLocalOnly, "Tersimpan di perangkat ini.") });
  row.appendChild(submit);
  row.appendChild(note);
  form.appendChild(row);

  const status = h("div", { role: "status", "aria-live": "polite", style: { marginTop: "10px", color: "var(--muted)", fontSize: "12px", minHeight: "16px" } });
  form.appendChild(status);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    status.textContent = "";

    const payload = {
      name: safeText(name.value, "").trim(),
      attendance: safeText(attendance.value, ""),
      guests: clamp(parseInt(guests.value || "1", 10) || 1, 1, maxGuests),
      message: safeText(msg.value, "").trim(),
      timeISO: nowISO()
    };
    if (!payload.name) {
      status.textContent = "Nama wajib diisi.";
      name.focus();
      return;
    }
    if (!payload.attendance) {
      status.textContent = "Silakan pilih kehadiran.";
      attendance.focus();
      return;
    }

    submit.disabled = true;
    submit.style.filter = "grayscale(.1) brightness(.98)";
    status.textContent = "Mengirim...";
    await sleep(600 + Math.round(Math.random() * 300));

    wishesState.add(payload);
    status.textContent = "Terkirim. Terima kasih.";
    submit.disabled = false;
    submit.style.filter = "none";

    // tiny premium “sparkle”
    const spark = h("div", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        inset: "0",
        pointerEvents: "none"
      }
    });
    card.style.position = "relative";
    card.appendChild(spark);
    const dot = h("div", { style: { position: "absolute", left: "50%", top: "50%", width: "10px", height: "10px", borderRadius: "999px", background: "rgba(182,139,106,.9)", transform: "translate(-50%,-50%)" } });
    spark.appendChild(dot);
    dot.animate(
      [
        { opacity: 0, transform: "translate(-50%,-50%) scale(.6)" },
        { opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
        { opacity: 0, transform: "translate(-50%,-50%) scale(2.6)" }
      ],
      { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
    );
    window.setTimeout(() => spark.remove(), 560);

    form.reset();
  });

  card.appendChild(form);
  inner.appendChild(card);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderWishes(main, data, wishesState) {
  if (!data?.sections?.wishes) return;
  const w = data?.wishes || {};
  const { wrap, inner } = createSectionFrame({ id: "wishes", kicker: "Wishes", title: safeText(w?.title, "Wishes"), subtitle: safeText(w?.subtitle, "") });

  const list = h("div", { style: { marginTop: "18px", display: "grid", gap: "10px" } });

  function chip(att) {
    const isHadir = att === "hadir";
    return h("span", {
      style: {
        fontSize: "11px",
        letterSpacing: ".16em",
        textTransform: "uppercase",
        padding: "6px 10px",
        borderRadius: "999px",
        background: isHadir ? "rgba(182,139,106,.12)" : "rgba(122,116,109,.10)",
        border: `1px solid ${isHadir ? "rgba(182,139,106,.24)" : "rgba(122,116,109,.16)"}`,
        color: isHadir ? "var(--accent)" : "var(--muted)"
      },
      text: isHadir ? "Hadir" : "Tidak hadir"
    });
  }

  function card(it) {
    const c = h("div", {
      dataset: { reveal: "1" },
      style: {
        borderRadius: "22px",
        background: "rgba(255,253,249,.82)",
        border: "1px solid rgba(182,139,106,.16)",
        boxShadow: "0 14px 44px rgba(45,42,38,.08)",
        padding: "14px 14px"
      }
    });
    const top = h("div", { style: { display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "baseline" } });
    top.appendChild(h("div", { style: { fontFamily: "Display, serif" }, text: safeText(it?.name, "Tamu") }));
    top.appendChild(chip(it?.attendance));
    c.appendChild(top);
    c.appendChild(h("div", { style: { marginTop: "8px", color: "var(--muted)", fontSize: "13px" }, text: `${clamp(Number(it?.guests || 1), 1, 10)} tamu • ${new Date(it?.timeISO || Date.now()).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}` }));
    if (safeText(it?.message, "")) c.appendChild(h("div", { style: { marginTop: "10px" }, text: it.message }));
    return c;
  }

  function render() {
    list.innerHTML = "";
    const items = wishesState.items();
    if (!items.length) {
      list.appendChild(h("div", { style: { color: "var(--muted)" }, text: "Belum ada ucapan." }));
      return;
    }
    for (const it of items.slice(0, 40)) list.appendChild(card(it));
  }

  wishesState.onChange(render);
  render();

  inner.appendChild(list);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderLocation(main, data) {
  if (!data?.sections?.location) return;
  const e = data?.event || {};
  const v = e?.venue || {};
  const loc = data?.location || {};
  const { wrap, inner } = createSectionFrame({ id: "location", kicker: "Location", title: safeText(loc?.title, "Location"), subtitle: safeText(loc?.subtitle, "") });

  const card = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      borderRadius: "24px",
      background: "rgba(255,253,249,.82)",
      border: "1px solid rgba(182,139,106,.18)",
      boxShadow: "0 18px 60px rgba(45,42,38,.10)",
      overflow: "hidden"
    }
  });

  const embed = safeText(v?.embedUrl, "");
  if (embed) {
    card.appendChild(
      h("iframe", {
        title: "Peta lokasi",
        src: embed,
        loading: "lazy",
        referrerpolicy: "no-referrer-when-downgrade",
        style: { width: "100%", height: "320px", border: "0" }
      })
    );
  } else {
    card.appendChild(h("div", { style: { padding: "16px", color: "var(--muted)" }, text: "Embed maps belum diisi." }));
  }

  const actions = h("div", { style: { padding: "14px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between" } });
  actions.appendChild(h("div", { style: { fontFamily: "Display, serif" }, text: safeText(v?.name, "") }));
  if (v?.mapsUrl) actions.appendChild(h("a", { class: "btn btn-primary", href: v.mapsUrl, target: "_blank", rel: "noreferrer" }, [icon("map", 18), h("span", { text: safeText(loc?.buttonLabel, "Open Maps") })]));
  card.appendChild(actions);

  inner.appendChild(card);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function renderFooter(main, data) {
  if (!data?.sections?.footer) return;
  const f = data?.footer || {};
  const couple = data?.couple || {};
  const { wrap, inner } = createSectionFrame({ id: "footer", kicker: "Closing", title: safeText(f?.title, "Thank You"), subtitle: "" });
  const card = h("div", {
    dataset: { reveal: "1" },
    style: {
      marginTop: "18px",
      borderRadius: "24px",
      background: "rgba(255,253,249,.82)",
      border: "1px solid rgba(182,139,106,.18)",
      boxShadow: "0 18px 60px rgba(45,42,38,.10)",
      overflow: "hidden",
      padding: "16px"
    }
  });
  card.appendChild(h("div", { style: { fontFamily: "Display, serif", fontSize: "18px" }, text: safeText(f?.prayer, "") }));
  card.appendChild(h("div", { style: { marginTop: "10px", color: "var(--muted)" }, text: safeText(f?.closing, "") }));
  card.appendChild(h("div", { style: { marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } }, [
    h("div", { style: { fontFamily: "Script, cursive", fontSize: "28px", color: "var(--accent)" }, text: safeText(couple?.initials, "A • L") }),
    h("div", { style: { color: "var(--muted)", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase" }, text: safeText(f?.credit, "") })
  ]));
  inner.appendChild(card);
  wrap.appendChild(inner);
  main.appendChild(wrap);
}

function createModal() {
  const modal = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-hidden": "true" });
  const backdrop = h("div", { class: "modal__backdrop" });
  const card = h("div", { class: "modal__card" });
  const top = h("div", { class: "modal__top" });
  const title = h("div", { class: "modal__title", text: "Preview" });
  const closeBtn = h("button", { class: "btn btn-ghost", type: "button", "aria-label": "Tutup", style: { width: "44px", height: "44px" } }, [icon("close", 18)]);
  top.appendChild(title);
  top.appendChild(closeBtn);
  const body = h("div", { class: "modal__body" });
  card.appendChild(top);
  card.appendChild(body);
  modal.appendChild(backdrop);
  modal.appendChild(card);

  let lastFocus = null;

  function open(payload) {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    title.textContent = payload?.title || "Preview";
    body.innerHTML = "";

    if (payload?.kind === "image") {
      body.appendChild(
        h("img", {
          src: payload.src,
          alt: payload.alt || payload.title || "Image",
          loading: "eager",
          decoding: "async",
          style: { width: "100%", height: "auto", borderRadius: "16px" }
        })
      );
    }
    closeBtn.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    body.innerHTML = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown", onKey);

  return { node: modal, open, close, titleEl: title, bodyEl: body };
}

function createLightbox(data) {
  const modal = createModal();
  let images = [];
  let idx = 0;

  const nav = h("div", { style: { marginTop: "10px", display: "flex", justifyContent: "space-between", gap: "10px" } });
  const prev = h("button", { class: "btn btn-ghost", type: "button", style: { flex: "1" } }, [h("span", { text: safeText(data?.copy?.prev, "Prev") })]);
  const next = h("button", { class: "btn btn-ghost", type: "button", style: { flex: "1" } }, [h("span", { text: safeText(data?.copy?.next, "Next") })]);
  nav.appendChild(prev);
  nav.appendChild(next);

  function render() {
    const it = images[idx];
    if (!it) return;
    modal.titleEl.textContent = it.group ? `${it.group} • ${idx + 1}/${images.length}` : `${idx + 1}/${images.length}`;
    modal.bodyEl.innerHTML = "";
    const img = h("img", {
      src: it.src,
      alt: it.alt || "Gallery",
      loading: "eager",
      decoding: "async",
      style: { width: "100%", height: "auto", borderRadius: "16px" }
    });
    modal.bodyEl.appendChild(img);
    if (safeText(it.alt, "")) {
      modal.bodyEl.appendChild(
        h("div", {
          style: { marginTop: "10px", color: "var(--muted)", fontSize: "12px", letterSpacing: ".02em" },
          text: it.alt
        })
      );
    }
    modal.bodyEl.appendChild(nav);

    requestAnimationFrame(() => {
      img.animate(
        [
          { opacity: 0, transform: "translate3d(0, 6px, 0) scale(0.992)" },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
        ],
        { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
      );
    });
  }

  function openAt(i) {
    idx = clamp(i, 0, Math.max(0, images.length - 1));
    modal.open({ title: "Gallery", kind: "image", src: images[idx]?.src, alt: images[idx]?.alt || "Gallery" });
    render();
  }

  prev.addEventListener("click", () => {
    idx = (idx - 1 + images.length) % images.length;
    render();
  });
  next.addEventListener("click", () => {
    idx = (idx + 1) % images.length;
    render();
  });

  // keyboard + touch swipe
  window.addEventListener("keydown", (e) => {
    if (!modal.node.classList.contains("is-open")) return;
    if (e.key === "ArrowLeft") prev.click();
    if (e.key === "ArrowRight") next.click();
  });

  let startX = null;
  modal.bodyEl.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      startX = t.clientX;
    },
    { passive: true }
  );
  modal.bodyEl.addEventListener(
    "touchend",
    (e) => {
      if (startX === null) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - startX;
      startX = null;
      if (Math.abs(dx) < 34) return;
      if (dx > 0) prev.click();
      else next.click();
    },
    { passive: true }
  );

  return { node: modal.node, setImages: (arr) => (images = arr || []), openAt };
}

function createWishesState(data) {
  let list = loadWishes(data);
  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn();
  }

  function items() {
    // newest first
    return list.slice().sort((a, b) => (b.timeISO || "").localeCompare(a.timeISO || ""));
  }

  function add(payload) {
    list.push(payload);
    saveWishes(data, list);
    notify();
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { items, add, onChange };
}

function createMusicSystem(data, musicBtn) {
  const enabled = !!data?.music?.enabled;
  if (!enabled) return { start: async () => {}, toggle: async () => {}, setMuted: () => {}, isMuted: () => true };

  const src = data?.assets?.music?.src;
  const key = `wedding:${data?.id || "event"}:music:muted`;

  const audio = new Audio();
  audio.src = src || "";
  audio.loop = true;
  audio.preload = "none";

  let muted = true;
  try {
    const saved = localStorage.getItem(key);
    if (saved === "0") muted = false;
    if (saved === "1") muted = true;
  } catch {
    // ignore
  }
  if (data?.music?.defaultMuted === false) muted = false;

  function reflect() {
    const ico = muted ? icon("muted", 20) : icon("volume", 20);
    musicBtn.innerHTML = "";
    musicBtn.appendChild(ico);
    musicBtn.setAttribute("aria-label", muted ? "Unmute musik" : "Mute musik");
  }

  function persist() {
    try {
      localStorage.setItem(key, muted ? "1" : "0");
    } catch {
      // ignore
    }
  }

  async function start() {
    if (!src) return;
    audio.muted = muted;
    audio.volume = 0.9;
    // must be after user gesture
    try {
      audio.preload = "auto";
      await audio.play();
    } catch {
      // autoplay blocked or missing file; ignore
    }
    reflect();
  }

  async function toggle() {
    muted = !muted;
    audio.muted = muted;
    persist();
    reflect();
    if (!muted) {
      try {
        await audio.play();
      } catch {
        // ignore
      }
    }
  }

  function setMuted(nextMuted) {
    muted = !!nextMuted;
    audio.muted = muted;
    persist();
    reflect();
  }

  function isMuted() {
    return muted;
  }

  reflect();
  musicBtn.addEventListener("click", () => toggle());
  window.addEventListener("pagehide", () => audio.pause(), { once: true });

  return { start, toggle, setMuted, isMuted };
}

function setupActiveSectionIndicator(setActive) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const secs = $$("main section[id]");
  if (!secs.length) return () => {};

  const labels = {};
  return (customLabels) => {
    Object.assign(labels, customLabels || {});

    if (reduce) {
      setActive(labels[secs[0].id] || secs[0].id);
      return () => {};
    }

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!vis.length) return;
        const id = vis[0].target.id;
        setActive(labels[id] || id);
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65], rootMargin: "-20% 0px -55% 0px" }
    );

    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  };
}

function setupSoftParticles(data) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return () => {};

  // ultra-light: 2 layers of tiny radial dots via CSS, moved with rAF (transform only)
  const layer = h("div", {
    "aria-hidden": "true",
    style: {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "0",
      opacity: ".28",
      mixBlendMode: "multiply",
      transform: "translate3d(0,0,0)"
    }
  });
  const a = h("div", {
    style: {
      position: "absolute",
      inset: "-10%",
      backgroundImage:
        "radial-gradient(circle at 10px 10px, rgba(182,139,106,.18) 1px, transparent 1.6px), radial-gradient(circle at 16px 18px, rgba(122,116,109,.14) 1px, transparent 1.7px)",
      backgroundSize: "28px 28px, 36px 36px",
      filter: "blur(.2px)"
    }
  });
  const b = h("div", {
    style: {
      position: "absolute",
      inset: "-10%",
      backgroundImage: "radial-gradient(circle at 12px 12px, rgba(215,183,157,.18) 1px, transparent 1.7px)",
      backgroundSize: "44px 44px",
      opacity: ".7"
    }
  });
  layer.appendChild(a);
  layer.appendChild(b);
  document.body.appendChild(layer);

  let ticking = false;
  function tick() {
    ticking = false;
    const y = window.scrollY || 0;
    const x = (window.innerWidth || 360) * 0.002;
    const t1x = (x + (y * 0.006)) % 40;
    const t1y = (y * 0.016) % 80;
    const t2x = (-x + (y * 0.004)) % 60;
    const t2y = (y * 0.012) % 90;
    a.style.transform = `translate3d(${t1x.toFixed(2)}px, ${t1y.toFixed(2)}px, 0)`;
    b.style.transform = `translate3d(${t2x.toFixed(2)}px, ${t2y.toFixed(2)}px, 0)`;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    layer.remove();
  };
}

async function boot() {
  const app = $("#app");
  if (!app) return;

  const guestName = getGuestName();

  // Dev-friendly: avoid stale `data.json` when toggling sections.
  // Prod: allow browser cache for speed.
  const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "0.0.0.0";
  const dataUrl = isLocal ? `./data.json?v=${encodeURIComponent(APP_VERSION)}` : "./data.json";
  const res = await fetch(dataUrl, { cache: isLocal ? "no-store" : "force-cache" });
  if (!res.ok) throw new Error(`Failed to load data.json (${res.status})`);
  const data = await res.json();

  applyMeta(data);
  setTheme(data?.theme);
  injectLDJSON(data);

  const pre = buildPreloader(data);
  if (pre.node) document.body.appendChild(pre.node);

  // App structure
  const modal = createModal();
  const lightbox = createLightbox(data);
  document.body.appendChild(modal.node);
  document.body.appendChild(lightbox.node);

  const wishesState = createWishesState(data);

  const { nav, bar, setProgress, musicBtn, setActive } = buildNav(data);
  document.body.appendChild(nav);
  const music = createMusicSystem(data, musicBtn);

  const main = buildMain(data, guestName);
  app.appendChild(main);

  // lock scroll until open (cinematic)
  document.body.style.overflow = "hidden";

  const cover = buildCover(data, guestName, async () => {
    cover?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: "ease", fill: "both" });
    await sleep(540);
    cover?.remove();
    document.body.style.overflow = "";
    await music.start();
    toast(document.body, safeText(data?.copy?.toastWelcome, "Selamat menikmati undangan."));
  });
  if (cover) document.body.appendChild(cover);
  else document.body.style.overflow = "";

  renderHero(main, data, guestName);
  renderCountdown(main, data);
  renderCouple(main, data);
  renderEvent(main, data, modal);
  renderStory(main, data);
  renderFamily(main, data);

  let galleryImages = [];
  const openLightbox = (i) => lightbox.openAt(i);
  const g = renderGallery(main, data, openLightbox);
  if (Array.isArray(g)) galleryImages = g;
  lightbox.setImages(galleryImages);

  renderGift(main, data, modal);
  renderRSVP(main, data, wishesState);
  renderWishes(main, data, wishesState);
  renderLocation(main, data);
  renderFooter(main, data);

  maybeEnableSnap(data);

  const reveal = setupReveal(data);
  reveal.observe(document);

  const stopParticles = setupSoftParticles(data);
  const stopProgress = setupScrollProgress(setProgress);
  const stopNavBlur = setupNavBlur(bar, data);
  const stopMagnetic = setupMagneticButtons();
  const startActive = setupActiveSectionIndicator(setActive);
  const stopActive = startActive(data?.nav?.activeSectionLabels);
  const stopParallax = setupSoftParallax(data);

  // finish loader after first paint-ish
  await sleep(200);
  await pre.done();

  window.addEventListener(
    "pagehide",
    () => {
      reveal.destroy();
      stopParticles();
      stopProgress();
      stopNavBlur();
      stopMagnetic();
      stopActive();
      stopParallax();
    },
    { once: true }
  );
}

boot().catch((err) => {
  console.error("Boot failed", err);
  const app = $("#app");
  if (app) {
    app.innerHTML = "";
    app.appendChild(
      h("div", { style: { padding: "18px", maxWidth: "720px", margin: "24px auto", background: "var(--surface)", border: "1px solid rgba(182,139,106,.22)", borderRadius: "16px" } }, [
        h("div", { style: { fontFamily: "Display, serif", fontSize: "18px" }, text: "Gagal memuat undangan." }),
        h("div", { style: { marginTop: "8px", color: "var(--muted)" }, text: "Pastikan dibuka lewat static server (bukan file://) dan `data.json` dapat diakses." })
      ])
    );
  }
});

