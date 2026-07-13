export type SoundName = 'wall' | 'paddle' | 'brick' | 'explosion' | 'powerup' | 'lose' | 'win'

const soundMap: Record<SoundName, number[]> = {
  wall: [180, 220],
  paddle: [260, 520],
  brick: [720, 920],
  explosion: [160, 90, 55],
  powerup: [520, 720, 980],
  lose: [220, 150, 90],
  win: [520, 660, 880, 1320],
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

export class SynthAudio {
  private audioContext: AudioContext | null = null
  private muted = false
  private isInitialized = false
  private lastErrorTime = 0
  private readonly errorCooldownMs = 5000

  public async resume(): Promise<void> {
    if (this.isInitialized && this.audioContext?.state === 'running') {
      return
    }

    try {
      if (!this.audioContext) {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext

        if (!AudioContextConstructor) {
          return
        }

        this.audioContext = new AudioContextConstructor()
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      this.isInitialized = true
    } catch (error) {
      this.handleAudioError(error)
      throw error
    }
  }

  public toggleMuted(): boolean {
    this.muted = !this.muted
    return this.muted
  }

  public play(soundName: SoundName, intensity = 1): void {
    if (this.muted) {
      return
    }

    void this.resume()
      .then(() => this.playSound(soundName, intensity))
      .catch((error) => this.handleAudioError(error))
  }

  public dispose(): void {
    const audioContext = this.audioContext

    if (!audioContext || audioContext.state === 'closed') {
      this.audioContext = null
      return
    }

    this.audioContext = null
    void audioContext.close().catch((error) => this.handleAudioError(error))
  }

  private playSound(soundName: SoundName, intensity: number): void {
    const audioContext = this.audioContext

    if (!audioContext) {
      return
    }

    try {
      const now = audioContext.currentTime
      const frequencies = soundMap[soundName]

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        const filter = audioContext.createBiquadFilter()
        const startTime = now + index * 0.038
        const duration = soundName === 'explosion' || soundName === 'lose' ? 0.16 : 0.09

        oscillator.type = soundName === 'explosion' ? 'sawtooth' : 'square'
        oscillator.frequency.setValueAtTime(frequency, startTime)
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.72), startTime + duration)
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2200 + intensity * 800, startTime)
        gain.gain.setValueAtTime(0.0001, startTime)
        gain.gain.exponentialRampToValueAtTime(0.045 * intensity, startTime + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
        oscillator.connect(filter)
        filter.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start(startTime)
        oscillator.stop(startTime + duration + 0.02)
      })
    } catch (error) {
      this.handleAudioError(error)
    }
  }

  private handleAudioError(error: unknown): void {
    const now = Date.now()
    if (now - this.lastErrorTime < this.errorCooldownMs) {
      return
    }

    this.lastErrorTime = now
    console.warn('音频系统暂时不可用，将在 5 秒后重试。', error)
  }
}
