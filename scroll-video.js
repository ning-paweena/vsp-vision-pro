// Initialize muted playback before handing the playhead over to scrolling.
export function createScrollVideo(video, onFrame = () => {}) {
  const frameStep = 1 / 24;
  let target = 0;
  let decoded = video.readyState >= 2;
  let primed = false;
  let starting = false;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;

  const endpoint = () => Number.isFinite(video.duration)
    ? Math.max(0, video.duration - frameStep) : 0;
  function flush() {
    if (starting || video.readyState < 1 || video.seeking) return;
    const time = Math.min(target, endpoint());
    if (Math.abs(video.currentTime - time) > frameStep / 2) {
      try { video.currentTime = time; } catch { /* Retry on the next media event. */ }
    }
  }
  function frameAvailable() {
    // Safari can drop readyState while seeking; never hide a previously decoded frame.
    if (video.readyState >= 2) decoded = true;
    flush();
    onFrame();
  }
  for (const event of ['loadeddata', 'canplay', 'seeked']) {
    video.addEventListener(event, frameAvailable);
  }
  video.addEventListener('loadedmetadata', flush);
  function prime() {
    if (primed || starting || video.error) return;
    starting = true;
    let playback;
    try { playback = video.play(); } catch { starting = false; return; }
    Promise.resolve(playback).then(() => {
      primed = true;
      starting = false;
      video.pause();
      frameAvailable();
    }, () => {
      // Low Power Mode may require another direct touch/click. Keep the poster meanwhile.
      starting = false;
      flush();
    });
  }
  return {
    get ready() { return decoded; },
    get endpoint() { return endpoint(); },
    seek(time) { target = Math.max(0, time); flush(); },
    prime
  };
}
