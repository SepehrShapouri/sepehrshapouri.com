import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"

const source = readFileSync(
  new URL("../../public/sepi-skate/audio.js", import.meta.url),
  "utf8"
)

class Parameter {
  value = 0
  setValueAtTime(value) {
    this.value = value
  }
  setTargetAtTime(value) {
    this.value = value
  }
  cancelScheduledValues() {}
}

class Node {
  connect(target) {
    this.target = target
    return target
  }
  disconnect() {
    this.disconnected = true
  }
}

function audio({ deferred = false, unsupported = false } = {}) {
  const contexts = [],
    requests = [],
    failures = new Set()
  let finish
  const gate = new Promise((resolve) => {
    finish = resolve
  })
  class Context {
    state = "suspended"
    currentTime = 0
    destination = new Node()
    sources = []
    constructor() {
      contexts.push(this)
    }
    async resume() {
      this.state = "running"
    }
    async close() {
      this.state = "closed"
    }
    createGain() {
      return Object.assign(new Node(), { gain: new Parameter() })
    }
    createBufferSource() {
      const node = Object.assign(new Node(), {
        playbackRate: new Parameter(),
        start() {
          this.started = true
        },
        stop(at) {
          this.stopped = true
          this.stopAt = at
        },
      })
      this.sources.push(node)
      return node
    }
    async decodeAudioData(data) {
      return { name: data.name, duration: 1 }
    }
  }
  const window = { AudioContext: unsupported ? undefined : Context }
  vm.runInNewContext(source, {
    window,
    AbortController,
    async fetch(url, { signal }) {
      const name = url.split("/").pop().replace(".wav", "")
      requests.push(name)
      if (deferred) await gate
      if (signal.aborted) throw new Error("Aborted")
      return {
        ok: !failures.has(name) && !failures.has("*"),
        status: 404,
        async arrayBuffer() {
          return { name }
        },
      }
    },
  })
  return {
    sound: new window.SkateAudio(),
    contexts,
    requests,
    failures,
    finish,
  }
}

const rolling = {
  playing: true,
  grounded: true,
  grinding: false,
  manual: false,
  speed: 83,
}
const settle = () => new Promise(setImmediate)

test("audio is lazy and starts automatically only when gameplay unlocks it", async () => {
  const { sound, contexts, requests } = audio()
  sound.update({ playing: false })
  assert.equal(contexts.length, 0)
  assert.equal(requests.length, 0)
  sound.update(rolling)
  assert.equal(contexts.length, 0)
  await sound.unlock()
  assert.equal(sound.status, "ready")
  assert.equal(contexts.length, 1)
  assert.equal(requests.length, 8)
  assert.deepEqual([...sound.loops.keys()], ["rolling"])
  await sound.unlock()
  assert.equal(contexts.length, 1)
  assert.equal(requests.length, 8)
})

test("rolling follows speed, softens during manuals, and stops in the air", async () => {
  const { sound } = audio()
  await sound.unlock()
  sound.update(rolling)
  const voice = sound.loops.get("rolling")
  const slowRate = voice.rate
  sound.update({ ...rolling, speed: 213 })
  assert.equal(sound.loops.get("rolling"), voice)
  assert.ok(voice.rate > slowRate)
  const cruisingVolume = voice.volume
  sound.update({ ...rolling, speed: 213, manual: true })
  assert.ok(voice.volume < cruisingVolume)
  sound.update({ ...rolling, grounded: false })
  assert.equal(sound.loops.size, 0)
  assert.equal(voice.source.stopped, true)
})

test("metal grinds and boardslides use different loops without rolling underneath", async () => {
  const { sound } = audio()
  await sound.unlock()
  const grind = {
    ...rolling,
    grounded: false,
    grinding: true,
    surface: "rail",
    style: "50-50",
  }
  sound.update(grind)
  assert.deepEqual([...sound.loops.keys()], ["grind-metal"])
  const metal = sound.loops.get("grind-metal")
  sound.update({ ...grind, style: "boardslide" })
  assert.equal(metal.source.stopped, true)
  assert.deepEqual([...sound.loops.keys()], ["grind-slide"])
  sound.update({ ...grind, surface: "curb" })
  assert.deepEqual([...sound.loops.keys()], ["grind-slide"])
  sound.update({ ...grind, style: "5-0" })
  assert.deepEqual([...sound.loops.keys()], ["grind-metal"])
})

test("trick effects are not queued while loading, and pause stops every voice", async () => {
  const { sound, contexts } = audio()
  sound.play("pop")
  await sound.unlock()
  assert.equal(contexts[0].sources.length, 0)
  sound.update(rolling)
  for (const name of ["pop", "flip", "shuvit", "land"]) sound.play(name)
  assert.equal(sound.voices.size, 5)
  sound.stop()
  assert.equal(sound.loops.size, 0)
  assert.equal(sound.voices.size, 0)
  assert.ok(
    contexts[0].sources.every((node) => node.stopped && node.disconnected)
  )
  sound.play("bail")
  sound.update({ playing: false })
  assert.equal(sound.voices.size, 1)
  const bail = [...sound.voices][0]
  assert.equal(bail.source.buffer.name, "bail")
  bail.source.onended()
  assert.equal(sound.voices.size, 0)
})

test("finishing a download after pause does not restart sound", async () => {
  const { sound, finish, requests } = audio({ deferred: true })
  sound.update(rolling)
  const loading = sound.unlock()
  await settle()
  assert.equal(requests.length, 8)
  sound.stop()
  finish()
  await loading
  assert.equal(sound.status, "ready")
  assert.equal(sound.loops.size, 0)
  assert.equal(sound.voices.size, 0)
})

test("missing recordings fail gracefully and retry on the next start", async () => {
  const { sound, failures } = audio()
  failures.add("*")
  await sound.unlock()
  assert.equal(sound.status, "error")
  sound.update(rolling)
  sound.play("land")
  assert.equal(sound.voices.size, 0)
  failures.clear()
  await sound.unlock()
  assert.equal(sound.status, "ready")
  assert.equal(sound.loops.has("rolling"), true)
})

test("partial downloads keep available effects usable", async () => {
  const { sound, failures, requests } = audio()
  failures.add("rolling")
  await sound.unlock()
  assert.equal(sound.status, "partial")
  sound.update(rolling)
  assert.equal(sound.loops.size, 0)
  sound.play("pop")
  assert.equal(sound.voices.size, 1)
  failures.clear()
  await sound.unlock()
  assert.equal(sound.status, "ready")
  assert.equal(requests.length, 9)
})

test("unsupported audio does not throw or start any requests", async () => {
  const { sound, requests } = audio({ unsupported: true })
  await sound.unlock()
  sound.update(rolling)
  sound.play("pop")
  sound.stop()
  assert.equal(sound.status, "unavailable")
  assert.equal(requests.length, 0)
})

test("closing the game stops sources, aborts loading, and closes the audio context", async () => {
  const { sound, contexts } = audio()
  await sound.unlock()
  sound.update(rolling)
  sound.play("land")
  sound.destroy()
  assert.equal(contexts[0].state, "closed")
  assert.equal(sound.voices.size, 0)
  assert.equal(sound.buffers.size, 0)
  sound.update(rolling)
  sound.play("pop")
  await sound.unlock()
  assert.equal(sound.voices.size, 0)
  const pending = audio({ deferred: true })
  const loading = pending.sound.unlock()
  await settle()
  pending.sound.destroy()
  pending.finish()
  await loading
  assert.equal(pending.sound.buffers.size, 0)
  assert.equal(pending.contexts[0].state, "closed")
})
