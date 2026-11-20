/* ============================================================
   LPs Stabile — motor comum (quiz, UTMs, animações)
   Cada página define window.LP = { assunto, marcadorWA, webhook }
   ============================================================ */
const LP = Object.assign({
  assunto: 'BPC/LOAS',
  whatsapp: '5562981618792',
  marcadorWA: '(LC)',      /* o atendimento identifica pelo (LC) que o lead veio dos anúncios da Luana */
  webhook: ''              /* VAZIO DE PROPÓSITO: ligar ao Zap/CRM só quando a Luana pedir */
}, window.LP || {});

const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- UTMs: guarda o que veio do anúncio (não muda nada no rastreio) ---------- */
const utm = {};
try {
  const q = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'].forEach((k) => { if (q.get(k)) utm[k] = q.get(k); });
  if (Object.keys(utm).length) sessionStorage.setItem('lp_utm', JSON.stringify(utm));
  else Object.assign(utm, JSON.parse(sessionStorage.getItem('lp_utm') || '{}'));
} catch (e) {}

/* ---------- link de WhatsApp com a mensagem padrão do anúncio ---------- */
const msgBase = `Olá! Vim pelo anúncio e quero saber sobre o ${LP.assunto} ${LP.marcadorWA}`;
const linkWA = (extra) => `https://wa.me/${LP.whatsapp}?text=${encodeURIComponent(msgBase + (extra ? '\n' + extra : ''))}`;
document.querySelectorAll('[data-wa]').forEach((a) => { a.href = linkWA(); a.target = '_blank'; a.rel = 'noopener'; });

/* ============================================================
   QUIZ: perguntas de um toque + contato no final
   ============================================================ */
const quiz = document.getElementById('quiz');
if (quiz) {
  const passos = [...quiz.querySelectorAll('.passo')];
  const barra = quiz.querySelector('.quiz-barra span');
  const contador = quiz.querySelector('.quiz-cont');
  const respostas = {};
  let atual = 0;
  const total = passos.filter((p) => !p.classList.contains('quiz-fim')).length;

  const mostra = (i) => {
    passos.forEach((p, k) => p.classList.toggle('ativo', k === i));
    atual = i;
    const n = Math.min(i + 1, total);
    if (barra) barra.style.width = `${(n / total) * 100}%`;
    if (contador) contador.textContent = i < total ? `Pergunta ${n} de ${total}` : 'Pronto';
  };

  quiz.querySelectorAll('.opcao').forEach((b) => {
    b.addEventListener('click', () => {
      const passo = b.closest('.passo');
      passo.querySelectorAll('.opcao').forEach((o) => o.classList.remove('marcada'));
      b.classList.add('marcada');
      respostas[passo.dataset.chave] = b.dataset.valor || b.textContent.trim();
      setTimeout(() => mostra(atual + 1), 260);
    });
  });
  quiz.querySelectorAll('.voltar').forEach((b) => b.addEventListener('click', () => mostra(Math.max(0, atual - 1))));

  const form = quiz.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.empresa && form.empresa.value) return;            /* isca de robô */
    const nome = form.nome, tel = form.telefone, aceite = form.aceite;
    const digitos = tel.value.replace(/\D/g, '');
    let ok = true;
    nome.classList.toggle('erro', nome.value.trim().length < 2); if (nome.value.trim().length < 2) ok = false;
    const telOk = digitos.length >= 10 && digitos.length <= 13;
    tel.classList.toggle('erro', !telOk); if (!telOk) ok = false;
    aceite.closest('.aceite').classList.toggle('erro', !aceite.checked); if (!aceite.checked) ok = false;
    if (!ok) return;

    const resumo = Object.entries(respostas).map(([k, v]) => `${k}: ${v}`).join('\n');
    const dados = {
      pagina: LP.assunto, nome: nome.value.trim(), telefone: tel.value.trim(), email: form.email ? form.email.value.trim() : '',
      ...respostas, ...utm, url: location.href, enviado_em: new Date().toISOString()
    };
    /* WhatsApp abre na hora (dentro do clique, senão o celular bloqueia a janela) */
    const wa = linkWA(`Nome: ${dados.nome}\n${resumo}`);
    window.open(wa, '_blank', 'noopener');
    quiz.querySelector('.quiz-fim .btn').href = wa;
    if (LP.webhook) {
      fetch(LP.webhook, { method: 'POST', body: JSON.stringify(dados), keepalive: true }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('lp:lead', { detail: dados }));   /* ponto para o pixel, quando for ligado */
    mostra(passos.length - 1);
    passos[passos.length - 1].classList.add('vis');
  });
  form.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { i.classList.remove('erro'); i.closest('.aceite')?.classList.remove('erro'); }));
  /* máscara simples de telefone */
  form.telefone.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    e.target.value = v;
  });
  /* qualquer botão "ver se tenho direito" rola até o quiz */
  document.querySelectorAll('[data-quiz]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const y = quiz.getBoundingClientRect().top + scrollY - 20;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: 'smooth' });
  }));
  mostra(0);
}

/* ---------- barra fixa do celular: aparece depois que o quiz sai da tela ---------- */
const barraFixa = document.querySelector('.barra-fixa');
if (barraFixa && quiz && 'IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => barraFixa.classList.toggle('vis', !en.isIntersecting && en.boundingClientRect.top < 0), { threshold: 0 }).observe(quiz);
}

/* ============================================================
   MOTION (GSAP + Lenis), opcional se a CDN falhar
   ============================================================ */
if (window.gsap && !reduz) {
  gsap.registerPlugin(ScrollTrigger);
  if (window.Lenis) {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  /* entrada da capa: a foto se aproxima devagar e o formulário sobe */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.capa-foto img', { scale: 1.12, duration: 2.2, ease: 'expo.out' }, 0)
    .from('.quiz', { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out' }, .2)
    .from('.quiz-cab h1, .quiz-cab p', { y: 18, opacity: 0, duration: .8, stagger: .1 }, .5)
    .from('.capa .selo', { x: -20, opacity: 0, duration: .8 }, .8);
  gsap.to('.capa-foto img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.capa', start: 'top top', end: 'bottom top', scrub: true } });

  /* tudo que tem .rv sobe ao aparecer; grupos .rv-g sobem em sequência */
  gsap.utils.toArray('.rv').forEach((el) => gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } }));
  gsap.utils.toArray('.rv-g').forEach((g) => gsap.from(g.children, { y: 46, opacity: 0, duration: .9, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 84%' } }));
  gsap.utils.toArray('.check li').forEach((li, i) => gsap.from(li, { x: -40, opacity: 0, duration: .8, delay: i * .05, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 90%' } }));
  gsap.utils.toArray('.foto img').forEach((img) => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  /* linha pontilhada dos passos vai se desenhando */
  const linhaP = document.querySelector('.passos');
  if (linhaP) gsap.from('.passo-c .num', { scale: 0, duration: .7, stagger: .2, ease: 'back.out(2)', scrollTrigger: { trigger: linhaP, start: 'top 80%' } });
}
/* contadores */
document.querySelectorAll('[data-conta]').forEach((el) => {
  const alvo = parseFloat(el.dataset.conta), dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
  const fmt = (v) => pre + v.toFixed(dec).replace('.', ',') + suf;
  if (!window.gsap || reduz) { el.textContent = fmt(alvo); return; }
  const o = { v: 0 }; el.textContent = fmt(0);
  gsap.to(o, { v: alvo, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => { el.textContent = fmt(o.v); } });
});
/* FAQ: abrir um fecha os outros */
const faqs = document.querySelectorAll('.faq details');
faqs.forEach((d) => d.addEventListener('toggle', () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); window.ScrollTrigger && ScrollTrigger.refresh(); }));
const ano = document.getElementById('ano'); if (ano) ano.textContent = new Date().getFullYear();
