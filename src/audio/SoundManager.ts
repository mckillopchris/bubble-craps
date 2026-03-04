// ============================================================
// Sound Manager - Web Audio API sound effects
// Synthesized sounds (no external audio files needed)
// ============================================================

type SoundName = 'diceRattle' | 'diceSettle' | 'chipPlace' | 'chipRemove' | 'winChime' | 'loseSound' | 'buttonClick' | 'timerTick' | 'timerExpire';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  play(sound: SoundName): void {
    if (!this.enabled) return;

    try {
      switch (sound) {
        case 'diceRattle': this.playDiceRattle(); break;
        case 'diceSettle': this.playDiceSettle(); break;
        case 'chipPlace': this.playChipPlace(); break;
        case 'chipRemove': this.playChipRemove(); break;
        case 'winChime': this.playWinChime(); break;
        case 'loseSound': this.playLoseSound(); break;
        case 'buttonClick': this.playButtonClick(); break;
        case 'timerTick': this.playTimerTick(); break;
        case 'timerExpire': this.playTimerExpire(); break;
      }
    } catch {
      // Silently ignore audio errors
    }
  }

  private createGain(volume: number = 1): GainNode {
    const ctx = this.getContext();
    const gain = ctx.createGain();
    gain.gain.value = this.volume * volume;
    gain.connect(ctx.destination);
    return gain;
  }

  // Dice rattling in dome - series of short noise bursts
  private playDiceRattle(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 6; i++) {
      const gain = this.createGain(0.15);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 800 + Math.random() * 2000;
      filter.Q.value = 2;

      osc.type = 'sawtooth';
      osc.frequency.value = 200 + Math.random() * 400;

      osc.connect(filter);
      filter.connect(gain);

      const t = now + i * 0.08 + Math.random() * 0.03;
      gain.gain.setValueAtTime(this.volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  // Dice settle - soft thud
  private playDiceSettle(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gain = this.createGain(0.3);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    const noise = ctx.createOscillator();
    noise.type = 'triangle';
    noise.frequency.value = 100;
    const noiseGain = this.createGain(0.1);

    osc.connect(gain);
    noise.connect(noiseGain);

    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noiseGain.gain.setValueAtTime(this.volume * 0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.25);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  // Chip placement - crisp click
  private playChipPlace(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gain = this.createGain(0.25);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    osc.connect(gain);
    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Chip removal - lower click
  private playChipRemove(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gain = this.createGain(0.2);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

    osc.connect(gain);
    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Win chime - ascending major chord arpeggio
  private playWinChime(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const gain = this.createGain(0.2);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const t = now + i * 0.1;
      osc.connect(gain);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // Lose sound - descending minor tone
  private playLoseSound(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gain = this.createGain(0.15);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.3);

    osc.connect(gain);
    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // UI button click
  private playButtonClick(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gain = this.createGain(0.15);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1500;

    osc.connect(gain);
    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Timer tick
  private playTimerTick(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gain = this.createGain(0.08);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1000;

    osc.connect(gain);
    gain.gain.setValueAtTime(this.volume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Timer expire warning
  private playTimerExpire(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const gain = this.createGain(0.2);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 880;

      const t = now + i * 0.15;
      osc.connect(gain);
      gain.gain.setValueAtTime(this.volume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.start(t);
      osc.stop(t + 0.1);
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();
