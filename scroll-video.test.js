import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollVideo } from './scroll-video.js';

class Video extends EventTarget {
  readyState = 0;
  duration = NaN;
  currentTime = 0;
  seeking = false;
  paused = true;
  blocked = true;
  async play() {
    if (this.blocked) throw new Error('NotAllowedError');
    this.paused = false;
    this.duration = 7.04;
    this.readyState = 2;
    this.dispatchEvent(new Event('loadedmetadata'));
    this.dispatchEvent(new Event('loadeddata'));
  }
  pause() { this.paused = true; }
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a rejected preload can be initialized by the next gesture and seeks to the current scroll position', async () => {
  const video = new Video();
  const controller = createScrollVideo(video);
  controller.seek(3.5);
  controller.prime();
  await settle();
  assert.equal(controller.ready, false);
  video.blocked = false;
  controller.prime();
  await settle();
  assert.equal(controller.ready, true);
  assert.equal(video.currentTime, 3.5);
  assert.equal(video.paused, true);
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
});

test('a transient seek keeps the decoded frame visible and settles on the newest target', async () => {
  const video = new Video();
  video.blocked = false;
  const controller = createScrollVideo(video);
  controller.prime();
  await settle();
  video.seeking = true;
  video.readyState = 1;
  controller.seek(2);
  controller.seek(4);
  assert.equal(controller.ready, true);
  assert.equal(video.currentTime, 0);
  video.seeking = false;
  video.readyState = 2;
  video.dispatchEvent(new Event('seeked'));
  assert.equal(video.currentTime, 4);
  controller.seek(100);
  assert.ok(video.currentTime < video.duration);
  assert.equal(video.currentTime, controller.endpoint);
  controller.seek(1);
  assert.equal(video.currentTime, 1);
});
