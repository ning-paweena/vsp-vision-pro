const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const eye = $('#eye');
const eyeSecond = $('#eye-second');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches;
try { if (localStorage.getItem('nova-motion')) reduced = localStorage.getItem('nova-motion') === 'reduced'; } catch {}
let progress = 0, duration = 5, requestedTime = 0, secondDuration = 5, secondRequestedTime = 0;
let eyeEndpoint = 5, timingData = null;
function updateEyeDuration() {
  if (!timingData) return;
  const ratio = innerWidth / document.querySelector('.stage').clientHeight;
  const stops = timingData.viewports || [];
  let endpoint = timingData.endpoint;
  if(stops.length) {
    if(ratio <= stops[0].aspect) endpoint = stops[0].endpoint;
    else if(ratio >= stops.at(-1).aspect) endpoint = stops.at(-1).endpoint;
    else {const i=stops.findIndex(s=>s.aspect>=ratio),a=stops[i-1],b=stops[i]; endpoint=a.endpoint+(b.endpoint-a.endpoint)*(ratio-a.aspect)/(b.aspect-a.aspect);}
  }
  eyeEndpoint=endpoint;duration=Math.min(Number.isFinite(eye.duration)?eye.duration-1/(timingData.fps || 24):endpoint,endpoint);
}
fetch('/assets/kling-hero-timing.json').then(r => r.json()).then(data => { timingData = data; updateEyeDuration(); update(progress); }).catch(() => {});
const set = (s, values) => gsap.set(s, values);
function seekEye(time) {
  requestedTime = clamp(time, 0, duration);
  if (eye.readyState >= 1 && !eye.seeking && Math.abs(eye.currentTime - requestedTime) > 0.001) eye.currentTime = requestedTime;
}
eye.addEventListener('loadedmetadata', () => { updateEyeDuration(); seekEye(requestedTime); });
eye.addEventListener('seeked', () => { if (Math.abs(eye.currentTime - requestedTime) > .001) seekEye(requestedTime); });
eye.addEventListener('play', () => eye.pause());
eyeSecond.addEventListener('loadedmetadata', () => { secondDuration = Number.isFinite(eyeSecond.duration) ? eyeSecond.duration : 5; seekSecond(secondRequestedTime); });
eyeSecond.addEventListener('seeked', () => { if (Math.abs(eyeSecond.currentTime - secondRequestedTime) > .001) seekSecond(secondRequestedTime); });
eyeSecond.addEventListener('play', () => eyeSecond.pause());
eye.pause();
eyeSecond.pause();
function seekSecond(time) { secondRequestedTime = clamp(time, 0, secondDuration); if (eyeSecond.readyState >= 1 && !eyeSecond.seeking && Math.abs(eyeSecond.currentTime - secondRequestedTime) > .001) eyeSecond.currentTime = secondRequestedTime; }

// One scroll coordinate owns all three acts. The next visual enters on the
// exact eye endpoint, rather than after a second pin or a blank spacer.
function update(p) {
  progress = p;
  // Hold the full-eye photograph, blend to the first video frame, then scrub.
  const eyeProgress = clamp((p - .07) / .29);
  // Give the final camera-facing frame a longer hold before section two.
  const secondProgress = clamp((p - .285) / .365);
  const sceneBlend = smooth((p - .285) / .055);
  set('.eye-opening', {autoAlpha: reduced ? 1 : 1 - smooth((p - .02) / .05)});
  const hardwareIn = smooth((p - .65) / .065);
  const hardwareOut = smooth((p - .80) / .055);
  const portalIn = smooth((p - .84) / .055);
  const lensProgress = smooth((p - .90) / .10);
  if (!reduced) seekEye(eyeProgress * duration);
  else seekEye(0);
  if (!reduced) seekSecond(secondProgress * secondDuration);
  else seekSecond(0);
  // Let the forest shot settle before fading into the physical product.
  set('.eye-scene', {autoAlpha: 1 - smooth((p - .60) / .065)});
  set('#eye', {opacity: 1 - sceneBlend});
  set('#eye-second', {opacity: sceneBlend});
  set('.hero-copy', {autoAlpha: 1 - smooth((p - .025) / .10), y: reduced ? 0 : -90 * smooth(p / .13)});
  set('.hardware-scene', {autoAlpha: hardwareIn * (1 - hardwareOut)});
  set('.hardware-visual', {scale: 1, xPercent: 0, opacity: 1});
  set('.hardware-copy', {autoAlpha: 1, y: reduced ? 0 : 16 * (1 - hardwareIn)});
  set('.hardware-caption', {opacity: 1});
  set('.portal-scene', {autoAlpha: portalIn});
  set('.portal-copy', {opacity: 1, y: reduced ? 0 : -12 * lensProgress});
  set('.progress-track div', {scaleX: p});
  $('.act-label').textContent = p < .665 ? '01 — HUMAN PERCEPTION' : p < .82 ? '02 — PHYSICAL FORM' : '03 — PRODUCT DESIGN';
  $('.scene-count').textContent = p < .665 ? '01 / 03' : p < .82 ? '02 / 03' : '03 / 03';
  $('.scroll-hint').firstChild.textContent = p > .97 ? 'KEEP EXPLORING ' : 'SCROLL TO SEE BEYOND ';
  window.novaState = {progress: p, videoTime: eye.currentTime, requestedTime, duration, paused: eye.paused, reduced, portalProgress: lensProgress, webgl: false};
}
gsap.registerPlugin(ScrollTrigger);
// Allocate additional travel only to the design act, preserving earlier pacing.
function designTravel() { return reduced ? 0 : innerHeight * 2.4; }
function sceneProgress(self) {
  const total = self.end - self.start, extra = designTravel(), original = total - extra;
  const distance = self.progress * total, boundary = original * .84;
  return distance <= boundary ? distance / original : .84 + (distance - boundary) / (original * .16 + extra) * .16;
}
function scenePosition(p) {
  const total = journeyTrigger.end - journeyTrigger.start, extra = designTravel(), original = total - extra;
  return journeyTrigger.start + (p <= .84 ? p * original : original * .84 + (p - .84) / .16 * (original * .16 + extra));
}
const journeyTrigger = ScrollTrigger.create({trigger: '.journey', start: 'top top', end: 'bottom bottom', onUpdate: self => update(sceneProgress(self)), onRefresh: self => update(sceneProgress(self))});

function applyMotion() {
  document.body.classList.toggle('reduced', reduced);
  $('#motion-toggle').setAttribute('aria-pressed', String(reduced));
  $('#motion-toggle').textContent = reduced ? 'Enable scroll motion' : 'Reduce motion';
  ScrollTrigger.refresh(); update(progress);
}
$('#motion-toggle').addEventListener('click', () => { reduced = !reduced; try {localStorage.setItem('nova-motion', reduced ? 'reduced' : 'full');} catch {} applyMotion(); });
motionPreference.addEventListener('change', e => { reduced = e.matches; applyMotion(); });
applyMotion();

// Carry the same reveal language into the content sections after the product scene.
const contentSections = $$('.section:not(.journey)');
contentSections.forEach(section => {
  const items = $$(':scope > .section-top, :scope > .intro-grid, :scope > .detail-heading, :scope > .detail-grid, :scope > .profile, :scope > .space-heading, :scope > .space-tabs, :scope > .space-panel, :scope > .human-picture, :scope > .human-copy', section);
  if (!items.length) return;
  gsap.fromTo(items, {autoAlpha: reduced ? 1 : 0, y: reduced ? 0 : 34}, {autoAlpha: 1, y: 0, duration: reduced ? 0 : .85, ease: 'power2.out', stagger: .1, scrollTrigger: {trigger: section, start: 'top 78%', once: true}});
});

// Anchor positions are derived from the same timeline and remain valid after
// responsive or reduced-motion scroll distances change.
$$('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const hash = link.getAttribute('href');
    const marks = {'#top': 0, '#hardware': .68, '#spatial': .86};
  if (hash in marks) {
    event.preventDefault();
    window.scrollTo({top: scenePosition(marks[hash]), behavior: reduced ? 'instant' : 'smooth'});
    history.replaceState(null, '', hash);
  }
  $('.nav').classList.remove('menu-open'); $('.menu-toggle').setAttribute('aria-expanded', 'false');
}));
$('.menu-toggle').addEventListener('click', () => {const open = $('.nav').classList.toggle('menu-open'); $('.menu-toggle').setAttribute('aria-expanded', String(open));});
document.addEventListener('keydown', e => {if(e.key === 'Escape') { $('.nav').classList.remove('menu-open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); }});

const spaces = [{"src": "/assets/apple/theater-odyssey.png", "alt": "A man wearing VSP watching an Odyssey-inspired scene on a large virtual cinema screen", "eyebrow": "YOUR PERSONAL THEATER", "title": "A bigger way to watch.", "text": "Settle into your favorite seat. Let a sweeping screen turn an ordinary evening into a cinematic escape."}, {"src": "/assets/apple/workspace-experience.png", "alt": "A woman wearing VSP working at a desk with floating design and document windows", "eyebrow": "SPACE FOR YOUR IDEAS", "title": "Room to do more.", "text": "Bring your documents, designs, and ideas into view. Arrange your workspace around the way you think."}, {"src": "/assets/apple/family-experience.png", "alt": "A woman wearing VSP waving to her parents on a large virtual video call", "eyebrow": "CLOSER TO YOUR PEOPLE", "title": "Share the everyday.", "text": "A familiar smile. A story from home. Make room for the people you love, wherever they are."}];
function selectSpace(index, focus = false) {
  const data = spaces[index], panel = $('#space-panel');
  $$('[data-space]').forEach((button, i) => {button.setAttribute('aria-selected', String(i === index));button.tabIndex = i === index ? 0 : -1;});
  const selected = $(`[data-space="${index}"]`);
  panel.setAttribute('aria-labelledby', selected.id);
  $('img', panel).src = data.src; $('img', panel).alt = data.alt;
  $('.eyebrow', panel).textContent = data.eyebrow; $('h3', panel).textContent = data.title; $('p', panel).textContent = data.text;
  if (focus) selected.focus();
}
$$('[data-space]').forEach((button, index) => {
  button.addEventListener('click', () => selectSpace(index));
  button.addEventListener('keydown', e => {let next = index;if(e.key === 'ArrowRight') next = (index + 1) % 3;else if(e.key === 'ArrowLeft') next = (index + 2) % 3;else if(e.key === 'Home') next = 0;else if(e.key === 'End') next = 2;else return;e.preventDefault();selectSpace(next, true);});
});
// Product photographs remain stationary and fully framed during scrolling.
window.addEventListener('resize', () => {updateEyeDuration();ScrollTrigger.refresh();update(progress);});
document.addEventListener('visibilitychange', () => {if(!document.hidden) update(progress);});
update(sceneProgress(journeyTrigger));
