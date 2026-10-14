;(() => {
  "use strict"

  const FILES = [
    "rolling",
    "grind-metal",
    "grind-slide",
    "pop",
    "flip",
    "shuvit",
    "land",
    "bail",
  ]

  class SkateAudio {
    constructor() {
      this.status = "idle"
      this.context = null
      this.master = null
      this.buffers = new Map()
      this.loops = new Map()
      this.voices = new Set()
      this.loading = null
      this.request = null
      this.destroyed = false
      this.state = { playing: false }
    }

    async unlock() {
      if (this.destroyed) return
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) {
        this.status = "unavailable"
        return
      }
      try {
        if (!this.context) {
          this.context = new AudioContext()
          this.master = this.context.createGain()
          this.master.gain.value = 0.55
          this.master.connect(this.context.destination)
        }
        if (this.context.state !== "running") await this.context.resume()
        if (this.destroyed) return
        if (this.buffers.size < FILES.length) await this.load()
        if (!this.destroyed) this.update(this.state)
      } catch {
        if (!this.destroyed) {
          this.status = "error"
        }
      }
    }

    load() {
      if (this.loading) return this.loading
      this.status = "loading"
      this.request = new AbortController()
      const context = this.context
      const signal = this.request.signal
      this.loading = Promise.allSettled(
        FILES.filter((name) => !this.buffers.has(name)).map(async (name) => {
          const response = await fetch(`audio/${name}.wav`, { signal })
          if (!response.ok) throw new Error(`Audio ${response.status}`)
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer()
          )
          if (!this.destroyed) this.buffers.set(name, buffer)
        })
      )
        .then(() => {
          if (!this.destroyed) {
            this.status =
              this.buffers.size === FILES.length
                ? "ready"
                : this.buffers.size
                  ? "partial"
                  : "error"
          }
        })
        .finally(() => {
          this.loading = null
        })
      return this.loading
    }

    createVoice(name, volume, rate, loop = false) {
      const context = this.context
      const buffer = this.buffers.get(name)
      if (this.destroyed || context?.state !== "running" || !buffer) return null
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      source.loop = loop
      source.playbackRate.value = rate
      gain.gain.value = loop ? 0 : volume
      source.connect(gain)
      gain.connect(this.master)
      const voice = { source, gain, volume, rate, stopping: false }
      this.voices.add(voice)
      source.onended = () => this.releaseVoice(voice)
      source.start()
      if (loop) gain.gain.setTargetAtTime(volume, context.currentTime, 0.035)
      return voice
    }

    releaseVoice(voice) {
      voice.source.onended = null
      voice.source.disconnect()
      voice.gain.disconnect()
      this.voices.delete(voice)
    }

    stopVoice(voice, fade = 0) {
      const now = this.context.currentTime
      if (voice.stopping && fade) return
      voice.stopping = true
      voice.gain.gain.cancelScheduledValues(now)
      if (fade) voice.gain.gain.setTargetAtTime(0, now, fade / 3)
      else voice.gain.gain.setValueAtTime(0, now)
      try {
        voice.source.stop(now + fade)
      } catch {}
      if (!fade) this.releaseVoice(voice)
    }

    play(name, volume = 0.7, rate = 1) {
      // Late-loaded effects are skipped instead of sounding after the action is over.
      if (this.voices.size >= 16) return
      this.createVoice(name, volume, rate)
    }

    setLoop(name, volume, rate = 1) {
      const voice = this.loops.get(name)
      if (!volume) {
        if (voice) {
          this.loops.delete(name)
          this.stopVoice(voice, 0.045)
        }
        return
      }
      if (!voice) {
        const started = this.createVoice(name, volume, rate, true)
        if (started) this.loops.set(name, started)
        return
      }
      const now = this.context.currentTime
      if (Math.abs(voice.volume - volume) > 0.005) {
        voice.gain.gain.setTargetAtTime(volume, now, 0.04)
        voice.volume = volume
      }
      if (Math.abs(voice.rate - rate) > 0.01) {
        voice.source.playbackRate.setTargetAtTime(rate, now, 0.08)
        voice.rate = rate
      }
    }

    update(state) {
      this.state = { ...state }
      if (this.destroyed || !this.context) return
      const pace = Math.max(0, Math.min(1, ((state.speed || 83) - 83) / 130))
      const rolling = state.playing && state.grounded && !state.grinding
      const grinding = state.playing && state.grinding
      const slide = state.style === "boardslide" || state.surface !== "rail"
      this.setLoop(
        "rolling",
        rolling ? (0.29 + pace * 0.12) * (state.manual ? 0.7 : 1) : 0,
        0.9 + pace * 0.5
      )
      this.setLoop(
        "grind-metal",
        grinding && !slide ? 0.46 : 0,
        0.95 + pace * 0.2
      )
      this.setLoop(
        "grind-slide",
        grinding && slide ? 0.43 : 0,
        0.9 + pace * 0.2
      )
    }

    stop() {
      this.state = { playing: false }
      this.loops.clear()
      for (const voice of [...this.voices]) this.stopVoice(voice)
    }

    destroy() {
      if (this.destroyed) return
      this.destroyed = true
      this.request?.abort()
      this.stop()
      this.buffers.clear()
      if (this.context && this.context.state !== "closed")
        void this.context.close().catch(() => {})
    }
  }

  window.SkateAudio = SkateAudio
})()
