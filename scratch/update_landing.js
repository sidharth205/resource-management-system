const fs = require('fs');
const path = require('path');

const landingPath = path.join(__dirname, '..', 'Landing.html');
let content = fs.readFileSync(landingPath, 'utf8');

// 1. Update CSS: Eyebrow, Hero h1 accent, and Floating Chips drift animations
const oldCssTarget = `    .eyebrow { display: inline-flex; align-items: center; gap: 9px; padding: 8px 14px; border: 1px solid rgba(255, 107, 108, .3); border-radius: 999px; color: #d43b3c; background: rgba(255, 255, 251, .88); font-size: 14px; font-weight: 800; letter-spacing: .04em; }
    .eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--coral); box-shadow: 0 0 0 4px rgba(255, 107, 108, .2); animation: beat 2.2s ease-in-out infinite; }
    @keyframes beat { 50% { box-shadow: 0 0 0 8px rgba(255, 107, 108, 0); } }
    .hero h1 { margin: 25px auto 19px; font-size: clamp(56px, 8vw, 112px); font-weight: 800; letter-spacing: -.085em; line-height: .99; }
    .hero h1 .line { display: block; }
    .hero h1 .accent { color: var(--slate-indigo); background: linear-gradient(135deg, var(--slate-indigo), var(--coral)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-copy { max-width: 620px; margin: 0 auto 30px; color: var(--muted); font-size: 19px; font-weight: 500; line-height: 1.8; }
    .hero-footnote { margin-top: 18px; color: var(--muted); font-size: 14px; font-weight: 700; letter-spacing: .03em; }
    .scroll-cue { position: absolute; z-index: 2; bottom: 26px; left: 50%; display: grid; justify-items: center; gap: 8px; color: var(--muted); font-size: 13px; font-weight: 800; letter-spacing: .08em; text-decoration: none; transform: translateX(-50%); }
    .scroll-cue span { display: block; width: 1px; height: 32px; background: linear-gradient(var(--slate-indigo), transparent); transform-origin: top; animation: cue 2s ease-in-out infinite; }
    @keyframes cue { 0% { transform: scaleY(0); } 50% { transform: scaleY(1); } 100% { transform: scaleY(1); opacity: 0; } }

    .cf { position: absolute; z-index: 1; }
    .cf1 { top: 25%; left: 6%; } .cf2 { top: 64%; left: 10%; } .cf3 { top: 22%; right: 6%; } .cf4 { top: 62%; right: 9%; }
    .chip-float { display: flex; align-items: center; gap: 11px; padding: 10px 16px 10px 10px; border-radius: 16px; background: rgba(255, 255, 251, .92); backdrop-filter: blur(8px); border: 1px solid rgba(35, 38, 70, .08); box-shadow: var(--shadow); font-size: 13.5px; font-weight: 800; white-space: nowrap; }
    .chip-float .ci { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; color: var(--navy); background: var(--lavender); }
    .chip-float .ci.t { color: #fff; background: var(--coral); } .chip-float .ci.n { color: var(--navy); background: var(--amber); }
    .chip-float svg, .step-ic svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .chip-float small { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; font-weight: 600; }`;

const newCssReplacement = `    .eyebrow { display: inline-flex; align-items: center; gap: 9px; padding: 8px 16px; border: 1px solid rgba(234, 87, 87, .3); border-radius: 999px; color: #d43b3c; background: rgba(255, 255, 251, .92); font-size: 14px; font-weight: 800; letter-spacing: .04em; box-shadow: 0 4px 14px rgba(234, 87, 87, .12); }
    .eyebrow-dot { position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--coral); box-shadow: 0 0 0 0 rgba(234, 87, 87, .75); animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(234, 87, 87, .75); } 70% { box-shadow: 0 0 0 9px rgba(234, 87, 87, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 87, 87, 0); } }
    .hero h1 { margin: 25px auto 19px; font-size: clamp(56px, 8vw, 112px); font-weight: 800; letter-spacing: -.085em; line-height: .99; }
    .hero h1 .line { display: block; }
    .hero h1 .accent {
      color: var(--slate-indigo);
      background: linear-gradient(135deg, var(--slate-indigo) 0%, var(--coral) 45%, var(--amber) 80%, var(--slate-indigo) 100%);
      background-size: 250% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradientShift 6s ease-in-out infinite alternate;
    }
    @keyframes gradientShift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
    .hero-copy { max-width: 620px; margin: 0 auto 30px; color: var(--muted); font-size: 19px; font-weight: 500; line-height: 1.8; }
    .hero-footnote { margin-top: 18px; color: var(--muted); font-size: 14px; font-weight: 700; letter-spacing: .03em; }
    .scroll-cue { position: absolute; z-index: 2; bottom: 26px; left: 50%; display: grid; justify-items: center; gap: 8px; color: var(--muted); font-size: 13px; font-weight: 800; letter-spacing: .08em; text-decoration: none; transform: translateX(-50%); transition: transform .25s ease, color .2s ease; }
    .scroll-cue:hover { transform: translateX(-50%) translateY(3px); color: var(--navy); }
    .scroll-cue span { display: block; width: 1px; height: 32px; background: linear-gradient(var(--slate-indigo), transparent); transform-origin: top; animation: cue 2s ease-in-out infinite; }
    @keyframes cue { 0% { transform: scaleY(0); } 50% { transform: scaleY(1); } 100% { transform: scaleY(1); opacity: 0; } }

    /* ---------- floating chips with continuous organic drift ---------- */
    .cf { position: absolute; z-index: 3; pointer-events: auto; }
    .cf1 { top: 22%; left: 6%; }
    .cf2 { top: 62%; left: 9%; }
    .cf3 { top: 20%; right: 6%; }
    .cf4 { top: 60%; right: 9%; }

    @keyframes driftCard1 {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50% { transform: translateY(-14px) rotate(1.2deg); }
    }
    @keyframes driftCard2 {
      0%, 100% { transform: translateY(0px) rotate(2deg); }
      50% { transform: translateY(-16px) rotate(-1.5deg); }
    }
    @keyframes driftCard3 {
      0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
      50% { transform: translateY(-13px) rotate(1.5deg); }
    }
    @keyframes driftCard4 {
      0%, 100% { transform: translateY(0px) rotate(1.8deg); }
      50% { transform: translateY(-15px) rotate(-2deg); }
    }

    .cf1 .chip-float { animation: driftCard1 5.8s ease-in-out infinite; }
    .cf2 .chip-float { animation: driftCard2 6.4s ease-in-out infinite 0.8s; }
    .cf3 .chip-float { animation: driftCard3 5.4s ease-in-out infinite 1.4s; }
    .cf4 .chip-float { animation: driftCard4 6.8s ease-in-out infinite 0.4s; }

    .chip-float {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px 12px 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(67, 71, 117, 0.12);
      box-shadow: 0 16px 36px rgba(35, 38, 70, 0.1), 0 2px 6px rgba(35, 38, 70, 0.04);
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease;
      cursor: pointer;
    }
    .chip-float:hover {
      animation-play-state: paused;
      transform: translateY(-8px) scale(1.06) !important;
      box-shadow: 0 24px 50px rgba(67, 71, 117, 0.22), 0 4px 12px rgba(67, 71, 117, 0.08);
      border-color: rgba(67, 71, 117, 0.35);
    }
    .chip-float .ci {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border-radius: 12px;
      color: var(--navy);
      background: var(--lavender);
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease;
    }
    .chip-float:hover .ci {
      transform: scale(1.15) rotate(8deg);
    }
    .chip-float .ci.t { color: #fff; background: var(--coral); box-shadow: 0 4px 12px rgba(234, 87, 87, 0.3); }
    .chip-float .ci.n { color: var(--navy); background: var(--amber); box-shadow: 0 4px 12px rgba(240, 154, 26, 0.3); }
    .chip-float svg, .step-ic svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .chip-float small { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; font-weight: 600; }`;

// Normalize line endings for replacement
const norm = s => s.replace(/\r\n/g, '\n');
content = norm(content);

if (content.includes(norm(oldCssTarget))) {
  content = content.replace(norm(oldCssTarget), norm(newCssReplacement));
  console.log('Successfully updated CSS section');
} else {
  console.error('Failed to find oldCssTarget');
}

// 2. Update Feature Card hover CSS
const oldFeatureCardCss = `    .feature-card { position: relative; min-height: 220px; padding: 30px; overflow: hidden; border: 1px solid var(--line); border-radius: 22px; background: linear-gradient(145deg, #ffffff, rgba(245, 244, 251, .8)); transform-style: preserve-3d; transition: border-color .3s, box-shadow .3s; }
    .feature-card::after { content: ""; position: absolute; inset: 0; background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), rgba(184, 184, 209, .6), transparent 70%); opacity: 0; transition: opacity .3s; pointer-events: none; }
    .feature-card:hover { border-color: rgba(67, 71, 117, .32); box-shadow: var(--shadow); }
    .feature-card:hover::after { opacity: 1; }
    .feature-icon { position: relative; z-index: 1; display: grid; width: 48px; height: 48px; margin-bottom: 22px; place-items: center; border-radius: 15px; color: var(--navy); background: rgba(184, 184, 209, .45); }`;

const newFeatureCardCss = `    .feature-card { position: relative; min-height: 220px; padding: 30px; overflow: hidden; border: 1px solid var(--line); border-radius: 22px; background: linear-gradient(145deg, #ffffff, rgba(245, 244, 251, .8)); transform-style: preserve-3d; transition: border-color .3s, box-shadow .3s, transform .35s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .feature-card::after { content: ""; position: absolute; inset: 0; background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), rgba(184, 184, 209, .6), transparent 70%); opacity: 0; transition: opacity .3s; pointer-events: none; }
    .feature-card:hover { border-color: rgba(67, 71, 117, .35); box-shadow: 0 20px 48px rgba(35, 38, 70, 0.12); transform: translateY(-5px); }
    .feature-card:hover::after { opacity: 1; }
    .feature-card:hover .feature-icon { transform: scale(1.12) rotate(6deg); background: rgba(234, 87, 87, 0.15); color: var(--coral); }
    .feature-icon { position: relative; z-index: 1; display: grid; width: 48px; height: 48px; margin-bottom: 22px; place-items: center; border-radius: 15px; color: var(--navy); background: rgba(184, 184, 209, .45); transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease, color 0.3s ease; }`;

if (content.includes(norm(oldFeatureCardCss))) {
  content = content.replace(norm(oldFeatureCardCss), norm(newFeatureCardCss));
  console.log('Successfully updated Feature Card CSS');
} else {
  console.error('Failed to find oldFeatureCardCss');
}

// 3. Update HTML chips to have data-go click targets
const oldChipsHtml = `      <div class="cf cf1" data-depth="26"><div class="chip-float"><span class="ci t"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span><div>Task assigned<small>Wireframes to Mira</small></div></div></div>
      <div class="cf cf2" data-depth="-20"><div class="chip-float"><span class="ci"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><div>Timesheet approved<small>Week 41 · 37.5 h</small></div></div></div>
      <div class="cf cf3" data-depth="-24"><div class="chip-float"><span class="ci n"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span><div>Access updated<small>Role set to Manager</small></div></div></div>
      <div class="cf cf4" data-depth="22"><div class="chip-float"><span class="ci t"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></svg></span><div>Project on track<small>Website refresh · 78%</small></div></div></div>`;

const newChipsHtml = `      <div class="cf cf1" data-depth="26" data-go="1-0" title="Click to view Manager Tasks"><div class="chip-float"><span class="ci t"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span><div>Task assigned<small>Wireframes to Mira</small></div></div></div>
      <div class="cf cf2" data-depth="-20" data-go="2-2" title="Click to view Employee Timesheets"><div class="chip-float"><span class="ci"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><div>Timesheet approved<small>Week 41 · 37.5 h</small></div></div></div>
      <div class="cf cf3" data-depth="-24" data-go="0-1" title="Click to view Admin Permissions"><div class="chip-float"><span class="ci n"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span><div>Access updated<small>Role set to Manager</small></div></div></div>
      <div class="cf cf4" data-depth="22" data-go="1-1" title="Click to view Manager Projects"><div class="chip-float"><span class="ci t"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></svg></span><div>Project on track<small>Website refresh · 78%</small></div></div></div>`;

if (content.includes(norm(oldChipsHtml))) {
  content = content.replace(norm(oldChipsHtml), norm(newChipsHtml));
  console.log('Successfully updated Chips HTML');
} else {
  console.error('Failed to find oldChipsHtml');
}

// 4. Update Script loading with local fallback and remove animation-blocking conditions
const oldScripts = `  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
  <script>
  (function () {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.gsap || !window.ScrollTrigger || reduced) {
      root.classList.add("reduce"); root.classList.remove("js"); return;
    }`;

const newScripts = `  <!-- High-reliability vendor scripts with local offline copies & CDN fallback -->
  <script src="shared-assets/vendor/gsap.min.js"></script>
  <script>window.gsap || document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"><\\/script>');</script>
  <script src="shared-assets/vendor/ScrollTrigger.min.js"></script>
  <script>window.ScrollTrigger || document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"><\\/script>');</script>
  <script src="shared-assets/vendor/lenis.min.js"></script>
  <script>window.Lenis || document.write('<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"><\\/script>');</script>
  <script>
  (function () {
    const root = document.documentElement;
    // Keep animations active and resilient
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn("GSAP/ScrollTrigger not ready; pure CSS animations remain fully active.");
      return;
    }`;

if (content.includes(norm(oldScripts))) {
  content = content.replace(norm(oldScripts), norm(newScripts));
  console.log('Successfully updated Script loading');
} else {
  console.error('Failed to find oldScripts');
}

// 5. Update Network ticker to start immediately
const oldTicker = `    tick();
    nodes.forEach(n => gsap.to(n, { dx: gsap.utils.random(-16, 16), dy: gsap.utils.random(-16, 16), duration: gsap.utils.random(3, 5), repeat: -1, yoyo: true, ease: "sine.inOut" }));
    edges.forEach(e => gsap.to(e, { p: 1, duration: gsap.utils.random(2.2, 3.8), delay: gsap.utils.random(0, 3), repeat: -1, repeatDelay: gsap.utils.random(.3, 2), ease: "none" }));
    ScrollTrigger.create({ trigger: ".hero", start: "top bottom", end: "bottom top", onToggle: s => s.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick) });`;

const newTicker = `    tick();
    gsap.ticker.add(tick); // Active on initial frame so network packets and nodes flow immediately!
    nodes.forEach(n => gsap.to(n, { dx: gsap.utils.random(-16, 16), dy: gsap.utils.random(-16, 16), duration: gsap.utils.random(3, 5), repeat: -1, yoyo: true, ease: "sine.inOut" }));
    edges.forEach(e => gsap.to(e, { p: 1, duration: gsap.utils.random(2.2, 3.8), delay: gsap.utils.random(0, 3), repeat: -1, repeatDelay: gsap.utils.random(.3, 2), ease: "none" }));
    ScrollTrigger.create({ trigger: ".hero", start: "top bottom", end: "bottom top", onToggle: s => s.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick) });`;

if (content.includes(norm(oldTicker))) {
  content = content.replace(norm(oldTicker), norm(newTicker));
  console.log('Successfully updated Network ticker');
} else {
  console.error('Failed to find oldTicker');
}

// 6. Update chip-float tween so CSS continuous drift keyframes aren't overridden
const oldChipTween = `    $$(".chip-float").forEach((c, i) => gsap.to(c, { y: i % 2 ? -12 : 12, duration: gsap.utils.random(2.4, 3.6), yoyo: true, repeat: -1, ease: "sine.inOut", delay: i * .3 }));`;
const newChipTween = `    // CSS keyframes driftCard1..4 drive continuous organic bobbing & rotation; GSAP handles mouse parallax on .cf`;

if (content.includes(norm(oldChipTween))) {
  content = content.replace(norm(oldChipTween), norm(newChipTween));
  console.log('Successfully updated chip-float tween');
} else {
  console.error('Failed to find oldChipTween');
}

fs.writeFileSync(landingPath, content, 'utf8');
console.log('Landing.html update complete!');
