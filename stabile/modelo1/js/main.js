/* ============================================================
   STABILE ADVOGADOS — motor de animação
   Base: site-motion-starter (Vibehub, Aula 14).
   Lenis (scroll suave) + GSAP ScrollTrigger, um loop de rAF só.
   ============================================================ */

const CONFIG = {
  frameCount: 120,                       /* ls assets/frames | wc -l (frames-m tem o mesmo número) */
  /* celular usa frames-m: recorte vertical mais leve, com a mesma animação do computador */
  framePath: (i, mobile) => `assets/${mobile ? 'frames-m' : 'frames'}/hero_${String(i).padStart(4, '0')}.jpg`,
  heroScrollLength: '+=220%',
  breakpointMobile: 768,
  breakpointGallery: 960,                /* abaixo disso a galeria vira rolagem lateral nativa */
  particleRGB: '201,164,106',
  particleCountDesktop: 60,
  particleCountMobile: 24
};

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mqMobile = window.matchMedia(`(max-width: ${CONFIG.breakpointMobile}px)`);

/* ---------- Lenis + GSAP: um loop só ---------- */
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ---------- header + barra de progresso ---------- */
const header = document.getElementById('header');
const bar = document.querySelector('.progress span');
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => {
    header.classList.toggle('scrolled', self.scroll() > 80);
    bar.style.transform = `scaleX(${self.progress})`;
  }
});

/* ============================================================
   HERO — a câmera se aproxima da estátua conforme o scroll
   ============================================================ */
const heroCanvas = document.getElementById('hero-canvas');
const heroVideo = document.getElementById('hero-video');
let sequenciaMontada = false;

/* a barra de endereço do celular aparece/some no scroll: não recalcular tudo por isso */
ScrollTrigger.config({ ignoreMobileResize: true });

function iniciarHero() {
  /* só quem pediu menos movimento fica com o vídeo; celular e computador têm o filme no scroll */
  if (reducedMotion) { document.documentElement.classList.add('rm'); tocarVideo(); return; }
  if (sequenciaMontada) return;
  sequenciaMontada = true;
  montarSequencia();
}

function tocarVideo() {
  const tentar = () => heroVideo.play().catch(() => {});
  tentar();
  heroVideo.addEventListener('canplay', tentar, { once: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tentar(); });
  document.addEventListener('touchstart', tentar, { once: true });
  document.addEventListener('click', tentar, { once: true });
}

function montarSequencia() {
  const ctx = heroCanvas.getContext('2d');
  const imgs = [];
  const mobile = mqMobile.matches;
  for (let i = 1; i <= CONFIG.frameCount; i++) {
    const im = new Image();
    im.decoding = 'async';
    im.src = CONFIG.framePath(i, mobile);
    if (i === 1) im.onload = sizeCanvas;
    imgs.push(im);
  }
  const state = { f: 0 };

  function sizeCanvas() {
    const w = heroCanvas.clientWidth, h = heroCanvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCanvas.width = w * dpr;
    heroCanvas.height = h * dpr;
    drawFrame(state.f);
  }

  function drawFrame(index) {
    /* se o frame pedido ainda não carregou, usa o mais próximo que já carregou */
    let i = Math.round(index), im = imgs[i];
    while (i > 0 && !(im && im.complete && im.naturalWidth)) im = imgs[--i];
    if (!im || !im.naturalWidth) return;
    const cw = heroCanvas.width, ch = heroCanvas.height;
    const iw = im.naturalWidth, ih = im.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale, h = ih * scale;
    let ox;
    if (mobile) {
      /* tela em pé: a "câmera" acompanha a estátua, que anda da esquerda pro centro do recorte */
      const fx = 0.36 + 0.2 * (index / (CONFIG.frameCount - 1));
      ox = cw / 2 - w * fx;
    } else {
      /* a estátua fica um pouco à direita, longe do texto */
      ox = (cw - w) / 2 + cw * 0.08;
    }
    ctx.drawImage(im, Math.max(cw - w, Math.min(0, ox)), (ch - h) / 2, w, h);
  }

  if (window.ResizeObserver) new ResizeObserver(sizeCanvas).observe(heroCanvas);
  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();

  const heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#hero', start: 'top top', end: CONFIG.heroScrollLength, scrub: 0.6, pin: true, anticipatePin: 1 }
  });
  heroTl
    .to(state, { f: CONFIG.frameCount - 1, snap: 'f', duration: 1, onUpdate: () => drawFrame(state.f) }, 0)
    .to('.scroll-hint', { opacity: 0, duration: 0.06 }, 0.02)
    .to('.hero-content', { opacity: 0, y: -70, duration: 0.25 }, 0.3)
    .fromTo('.hero-quote', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.18 }, 0.5)
    .fromTo('.hq-line', { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 0.18 }, 0.52)
    .to('.hero-quote', { opacity: 0, y: -30, duration: 0.12 }, 0.88);
}

if (heroCanvas) {                       /* só a home tem o filme do topo */
  iniciarHero();
  mqMobile.addEventListener('change', iniciarHero);
}

/* ---------- menu do celular ---------- */
const menuBtn = document.querySelector('.menu-btn');
const menuMobile = document.querySelector('.menu-mobile');
if (menuBtn && menuMobile) {
  const abrir = (sim) => {
    menuBtn.setAttribute('aria-expanded', sim);
    menuBtn.setAttribute('aria-label', sim ? 'Fechar menu' : 'Abrir menu');
    menuMobile.hidden = !sim;
    document.body.classList.toggle('menu-aberto', sim);
    if (lenis) sim ? lenis.stop() : lenis.start();
    if (sim && !reducedMotion) gsap.from(menuMobile.children, { opacity: 0, y: 24, duration: .6, stagger: .06, ease: 'power3.out' });
  };
  menuBtn.addEventListener('click', () => abrir(menuMobile.hidden));
  menuMobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => abrir(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuMobile.hidden) abrir(false); });
}

/* ---------- páginas internas: parallax das imagens ---------- */
if (!reducedMotion) {
  document.querySelectorAll('.ph-img img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.closest('section'), start: 'top top', end: 'bottom top', scrub: true } });
  });
  document.querySelectorAll('.area-img img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -12 }, { yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------- formulário Fale conosco ----------
   CONFIG_FORM.endpoint fica vazio até existir a área administrativa do site.
   Com endpoint: envia JSON por POST. Sem endpoint: abre o WhatsApp do escritório já com a mensagem
   preenchida, pra nenhum contato se perder enquanto isso. */
const CONFIG_FORM = { endpoint: '', whatsapp: '5562981618792' };
const form = document.getElementById('fale-conosco');
if (form) {
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.empresa.value) return;                         /* campo isca: robô preencheu */
    let ok = true;
    form.querySelectorAll('[required]').forEach((el) => {
      const vazio = el.type === 'checkbox' ? !el.checked : !el.value.trim();
      const alvo = el.type === 'checkbox' ? el.closest('.aceite') : el;
      alvo.classList.toggle('erro', vazio);
      if (vazio) ok = false;
    });
    const tel = form.telefone.value.replace(/\D/g, '');
    if (tel && (tel.length < 10 || tel.length > 13)) { form.telefone.classList.add('erro'); ok = false; }
    if (!ok) { status.textContent = 'Preencha os campos destacados para enviar.'; return; }

    const dados = {
      nome: form.nome.value.trim(), telefone: form.telefone.value.trim(), email: form.email.value.trim(),
      assunto: form.assunto.value, mensagem: form.mensagem.value.trim(),
      origem: location.href, enviado_em: new Date().toISOString()
    };
    const botao = form.querySelector('button[type=submit]');
    botao.disabled = true;
    if (CONFIG_FORM.endpoint) {
      try {
        const r = await fetch(CONFIG_FORM.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.textContent = 'Mensagem enviada. A equipe do escritório vai falar com você em breve.';
      } catch (err) {
        status.textContent = 'Não foi possível enviar agora. Tente pelo WhatsApp, logo abaixo.';
      }
    } else {
      const texto = `Olá! Vim pelo site (Fale conosco).\nNome: ${dados.nome}\nWhatsApp: ${dados.telefone}` +
        (dados.email ? `\nE-mail: ${dados.email}` : '') + `\nAssunto: ${dados.assunto}\nMensagem: ${dados.mensagem}`;
      window.open(`https://wa.me/${CONFIG_FORM.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      status.textContent = 'Abrimos o WhatsApp do escritório com a sua mensagem pronta. É só tocar em enviar.';
    }
    botao.disabled = false;
  });
  form.querySelectorAll('input, select, textarea').forEach((el) =>
    el.addEventListener('input', () => { el.classList.remove('erro'); el.closest('.aceite')?.classList.remove('erro'); }));
}

/* ---------- entrada do hero ---------- */
const heroIntro = gsap.timeline({ paused: true });
heroIntro.from('.reveal-hero', { opacity: 0, y: 46, duration: 1.15, stagger: 0.13, ease: 'power3.out' });

const preloader = document.getElementById('preloader');
function liberarPreloader() {
  if (preloader.classList.contains('done')) return;
  preloader.classList.add('done');
  heroIntro.play();
}
window.addEventListener('load', () => setTimeout(liberarPreloader, 900));
setTimeout(liberarPreloader, 3200);

/* ---------- títulos: palavra por palavra, por trás de uma máscara ---------- */
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part;
          w.appendChild(inner); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
}
document.querySelectorAll('.split').forEach((el) => {
  splitWords(el);
  if (reducedMotion) return;
  gsap.from(el.querySelectorAll('.w > span'), {
    yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.045,
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});

/* ---------- reveals genéricos ---------- */
if (!reducedMotion) {
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 50, duration: 1.05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none reverse' }
    });
  });
}

/* ---------- números contando ---------- */
document.querySelectorAll('.count').forEach((el) => {
  /* conta de novo toda vez que o número entra na tela (descendo ou subindo), no computador e no celular */
  const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.dec || '0', 10), suf = el.dataset.suffix || '';
  const fmt = (v) => v.toFixed(dec).replace('.', ',') + suf;
  const o = { v: 0 };
  el.textContent = fmt(0);
  const tw = gsap.to(o, { v: to, duration: 2, ease: 'power2.out', paused: true, onUpdate: () => { el.textContent = fmt(o.v); } });
  const zerar = () => { tw.pause(0); o.v = 0; el.textContent = fmt(0); };
  ScrollTrigger.create({
    trigger: el, start: 'top 92%', end: 'bottom 8%',
    onEnter: () => tw.restart(), onEnterBack: () => tw.restart(),
    onLeave: zerar, onLeaveBack: zerar
  });
});

/* ---------- galeria do escritório: rola na horizontal presa na tela ---------- */
const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const pin = document.querySelector('.esc-pin');
  const track = document.querySelector('.esc-track');
  if (!pin || !track) return;
  const dist = () => track.getBoundingClientRect().right - window.innerWidth + parseFloat(getComputedStyle(pin).paddingRight);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '#escritorio', start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
  });
  tl.to('.esc-intro', { x: () => -dist() * 0.25, opacity: 0.25, ease: 'none' }, 0)
    .to(track, { x: () => -dist(), ease: 'none' }, 0);
  document.querySelectorAll('.esc-photo img').forEach((img) => {
    tl.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none' }, 0);
  });
});

/* ---------- linha dos passos acompanha o scroll ---------- */
const linha = document.querySelector('.passos-line');
if (linha && !reducedMotion) {
  ScrollTrigger.create({
    trigger: '.passos', start: 'top 80%', end: 'bottom 60%', scrub: true,
    onUpdate: (s) => linha.style.setProperty('--p', s.progress.toFixed(3))
  });
} else if (linha) linha.style.setProperty('--p', 1);

/* ---------- foto do Henrique: leve parallax ---------- */
if (!reducedMotion && document.querySelector('#henrique')) {
  gsap.fromTo('.hen-frame img', { yPercent: -4, scale: 1.08 }, {
    yPercent: 4, scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: '#henrique', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.hen-arch', {
    clipPath: 'inset(0 0 100% 0)', duration: 2, ease: 'power2.out',
    scrollTrigger: { trigger: '#henrique', start: 'top 70%' }
  });
}

/* ---------- vidro: brilho segue o mouse ---------- */
document.querySelectorAll('.glass').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- partículas: poeira dourada na luz ---------- */
(function particles() {
  if (reducedMotion) return;
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const dots = [];
  const N = mqMobile.matches ? CONFIG.particleCountMobile : CONFIG.particleCountDesktop;
  function resize() {
    W = canvas.width = window.innerWidth || document.documentElement.clientWidth;
    H = canvas.height = window.innerHeight || document.documentElement.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  for (let i = 0; i < N; i++) {
    dots.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.1, vy: -(Math.random() * 0.16 + 0.04),
      a: Math.random() * 0.32 + 0.08, tw: Math.random() * Math.PI * 2 });
  }
  let posicionado = false;
  function tick() {
    if (!W) resize();
    if (!posicionado && W) { posicionado = true; dots.forEach((d) => { d.x *= W; d.y *= H; }); }
    ctx.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy; d.tw += 0.02;
      if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CONFIG.particleRGB},${d.a * (0.65 + 0.35 * Math.sin(d.tw))})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ---------- FAQ: abrir um fecha os outros ---------- */
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach((o) => { if (o !== item) o.open = false; });
    ScrollTrigger.refresh();
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
window.addEventListener('load', () => ScrollTrigger.refresh());
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());

/* blocos claros (19/11): esconde a vinheta escura enquanto eles estão na tela */
(() => {
  const claros = document.querySelectorAll('#prova, #situacoes, #atuacao');
  if (!claros.length || !('IntersectionObserver' in window)) return;
  const vis = new Set();
  const io = new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting ? vis.add(e.target) : vis.delete(e.target));
    document.body.classList.toggle('no-claro', vis.size > 0);
  }, { rootMargin: '-35% 0px -35% 0px' });
  claros.forEach(c => io.observe(c));
})();

/* capa com a foto do Dr. Henrique (19/11): o texto sai e a frase entra no scroll,
   e a foto se aproxima mais um pouco (o zoom leve contínuo fica no CSS) */
(() => {
  const foto = document.querySelector('#hero .hero-foto');
  if (!foto || reducedMotion) return;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=110%', scrub: 0.6, pin: true, anticipatePin: 1, refreshPriority: 10 }
  });
  tl.to(foto, { scale: 1.08, duration: 1 }, 0)
    .to('.scroll-hint', { opacity: 0, duration: 0.06 }, 0.02)
    .to('.hero-content', { opacity: 0, y: -70, duration: 0.3 }, 0.25)
    .fromTo('.hero-quote', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2 }, 0.5)
    .fromTo('.hq-line', { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 0.2 }, 0.52)
    .to('.hero-quote', { opacity: 0, y: -30, duration: 0.12 }, 0.88);
  /* esse pin foi criado depois dos outros: reordena e recalcula, senão o escritório fixa cedo demais */
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
})();
