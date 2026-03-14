"use strict";

class SoundSystem {
  constructor() {
    this._bite = new Howl({ src: ['sfx/zombie-moan.mp3'] });
    this._shot = new Howl({ src: ['sfx/pistol-gunshot.mp3'], volume: 0.5 });
    this._muted = false;
  }

  toggleMute() {
    this._muted = !this._muted;
    Howler.mute(this._muted);
  }

  playBite() {
    this._bite.play();
  }

  playShot() {
    this._shot.play();
  }
}
