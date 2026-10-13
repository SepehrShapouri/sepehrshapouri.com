import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"

const source = readFileSync(
  new URL("../../public/sepi-skate/game.js", import.meta.url),
  "utf8"
)
const markup = readFileSync(
  new URL("../../public/sepi-skate/index.html", import.meta.url),
  "utf8"
)

class Element {
  constructor() {
    this.children = []
    this.listeners = new Map()
    this.attributes = new Map()
    const classes = new Set()
    this.classList = {
      toggle(name, enabled) {
        if (enabled) classes.add(name)
        else classes.delete(name)
      },
      contains(name) {
        return classes.has(name)
      },
    }
    this.style = { setProperty() {} }
    this.clientWidth = 766
    this.clientHeight = 290
  }
  set textContent(value) {
    this.children = [String(value)]
  }
  get textContent() {
    return this.children
      .map((child) => (typeof child === "string" ? child : child.textContent))
      .join("")
  }
  append(...children) {
    this.children.push(...children)
  }
  replaceChildren(...children) {
    this.children = children
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(callback)
  }
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback(event)
  }
  setAttribute(name, value) {
    this.attributes.set(name, value)
  }
  focus() {}
  setPointerCapture() {}
  getContext() {
    return {}
  }
}

function game() {
  const elements = new Map(
    [...markup.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, new Element()])
  )
  const window = new Element()
  window.parent = window
  window.location = { origin: "http://localhost" }
  const document = new Element()
  document.body = new Element()
  document.getElementById = (id) => elements.get(id) || null
  document.createElement = () => new Element()
  const context = vm.createContext({
    window,
    document,
    localStorage: {
      getItem() {
        return null
      },
      setItem() {},
    },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    ResizeObserver: class {
      observe() {}
    },
    HTMLButtonElement: class {},
    HTMLAnchorElement: class {},
    requestAnimationFrame: () => 1,
  })
  // Expose the real game only inside this test VM; the shipped script has no test API.
  const inspect = `
    globalThis.game = {
      jump, flip, shuvit, beginManual, pause, end, update, trickPose,
      reset(){start();nextSpawn=1e9},
      releaseManual(){manualKey=false;manualTouch=false},
      scene(items,pose){obstacles=items;Object.assign(player,pose)},
      state(){return {mode,score,pending,combo,value:comboValue(),tricks:[...comboTricks],manual,manualTime,held:manualHeld(),grinding,ground:player.ground,flipTime,shuvTime,comboTime,G,x:player.x}}
    };
  `
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `${inspect}})();`), context)
  const g = context.game
  g.reset()
  return {
    ...g,
    state: () => JSON.parse(JSON.stringify(g.state())),
    text: (id) => elements.get(id).textContent,
    tick(seconds) {
      let left = seconds
      while (left > 1e-8) {
        const dt = Math.min(left, 1 / 120)
        g.update(dt)
        left -= dt
      }
    },
    key(key, pressed, modifiers = {}) {
      window.dispatch(pressed ? "keydown" : "keyup", {
        key,
        target: elements.get("game"),
        repeat: false,
        preventDefault() {},
        ...modifiers,
      })
    },
    touch(id, type) {
      elements.get(id).dispatch(type, { pointerId: 1, preventDefault() {} })
    },
  }
}

test("a shuv-it spins flat, stays at risk on landing, and banks after rolling away", () => {
  const g = game()
  g.shuvit()
  assert.equal(g.state().pending, 0)
  g.jump()
  g.shuvit()
  g.tick(0.22)
  assert.equal(g.trickPose().roll, 0)
  assert.ok(g.trickPose().yaw > 0.5 && g.trickPose().yaw < Math.PI)
  g.tick(0.65)
  assert.equal(g.state().ground, true)
  assert.equal(g.state().pending, 70)
  assert.ok(g.state().score < 5)
  g.tick(0.85)
  assert.equal(g.state().pending, 0)
  assert.equal(g.state().combo, 0)
  assert.ok(g.state().score >= 70 && g.state().score < 75)
  assert.equal(g.text("callout"), "Banked +70")
})

test("one airborne trick per jump prevents spamming or overlapping rotations", () => {
  const g = game()
  g.jump()
  g.flip()
  g.shuvit()
  g.flip()
  assert.equal(g.state().pending, 85)
  assert.equal(g.state().shuvTime, 0)
  assert.deepEqual(g.state().tricks, ["Kickflip"])
})

test("a late shuv-it bails and loses unbanked points", () => {
  const g = game()
  g.jump()
  g.tick(0.6)
  g.shuvit()
  g.tick(0.3)
  assert.equal(g.state().mode, "over")
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score < 5)
  assert.match(g.text("overlay-copy"), /70 lost/)
})

test("kickflip to manual to shuv-it carries the entire combo into a single bank", () => {
  const g = game()
  g.jump()
  g.flip()
  g.beginManual("key")
  g.tick(1.25)
  const balanced = g.state()
  assert.equal(balanced.manual, true)
  assert.deepEqual(balanced.tricks, ["Kickflip", "Manual"])
  assert.ok(balanced.pending >= 110)
  assert.ok(balanced.score < 5)
  g.jump()
  g.shuvit()
  g.releaseManual()
  g.tick(0.87)
  const landed = g.state()
  assert.equal(landed.combo, 3)
  assert.deepEqual(landed.tricks, ["Kickflip", "Manual", "Shuv-it"])
  assert.ok(landed.pending >= balanced.pending + 70)
  g.tick(0.85)
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score >= landed.value)
})

test("jumping out of a rail grind preserves its bonus and grind points", () => {
  const g = game()
  g.jump()
  g.flip()
  g.tick(0.52)
  const { x, G } = g.state()
  g.scene([{ type: "rail", x: x - 8, w: 48, h: 18 }], {
    y: G - 19,
    vy: 40,
    ground: false,
  })
  g.key("ArrowDown", true)
  g.tick(0.02)
  assert.equal(g.state().grinding, true)
  assert.deepEqual(g.state().tricks, ["Kickflip", "50–50 grind"])
  g.tick(0.15)
  assert.equal(g.state().combo, 2)
  const before = g.state()
  assert.ok(before.pending > 185)
  g.jump()
  g.shuvit()
  assert.equal(g.state().pending, before.pending + 70)
  assert.equal(g.state().score, before.score)
  assert.equal(g.state().combo, 3)
  g.end()
  assert.equal(g.state().pending, 0)
  assert.equal(g.state().score, before.score)
})

test("manuals require a real hold and releasing banks them", () => {
  const g = game()
  g.beginManual("key")
  g.tick(0.1)
  g.releaseManual()
  g.tick(0.01)
  assert.equal(g.state().pending, 0)
  g.beginManual("key")
  g.tick(0.5)
  const before = g.state()
  assert.equal(before.combo, 1)
  assert.ok(before.pending >= 25)
  g.releaseManual()
  g.tick(0.01)
  assert.equal(g.state().pending, 0)
  assert.equal(g.state().manual, false)
  assert.ok(g.state().score >= before.score + before.value)
})

test("multipliers cap at four and reset after a bank", () => {
  const g = game()
  for (let i = 0; i < 5; i++) {
    g.jump()
    g.shuvit()
    g.tick(0.87)
  }
  assert.equal(g.state().pending, 350)
  assert.equal(g.state().combo, 5)
  assert.equal(g.state().value, 1400)
  g.tick(0.85)
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score >= 1400 && g.state().score < 1412)
  g.jump()
  g.shuvit()
  assert.equal(g.state().combo, 1)
  assert.equal(g.state().value, 70)
})

test("landing on a rail mid-rotation bails instead of awarding a grind", () => {
  const g = game()
  g.jump()
  g.tick(0.5)
  g.shuvit()
  const { x, G } = g.state()
  g.scene([{ type: "rail", x: x - 8, w: 48, h: 18 }], {
    y: G - 19,
    vy: 40,
    ground: false,
  })
  g.key("ArrowDown", true)
  g.tick(0.02)
  assert.equal(g.state().mode, "over")
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score < 5)
})

test("holding a manual too long loses the combo without erasing banked points", () => {
  const g = game()
  g.jump()
  g.flip()
  g.tick(1.8)
  const banked = g.state().score
  g.beginManual("key")
  g.tick(3.1)
  assert.equal(g.state().mode, "over")
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score >= banked && g.state().score < banked + 7)
  assert.match(g.text("overlay-copy"), /lost/)
})

test("pausing freezes combo scoring and clears held inputs", () => {
  const g = game()
  g.beginManual("key")
  g.tick(0.5)
  g.pause()
  const paused = g.state()
  g.tick(5)
  assert.equal(g.state().pending, paused.pending)
  assert.equal(g.state().score, paused.score)
  assert.equal(g.state().comboTime, paused.comboTime)
  assert.equal(g.state().held, false)
  g.pause()
  g.tick(0.9)
  assert.equal(g.state().mode, "playing")
  assert.equal(g.state().pending, 0)
})

test("touch and keyboard manual holds are independent and cancellation releases touch", () => {
  const g = game()
  g.key("c", true, { ctrlKey: true })
  assert.equal(g.state().held, false)
  g.key("c", true)
  g.touch("manual", "pointerdown")
  g.tick(0.3)
  g.key("c", false)
  assert.equal(g.state().held, true)
  g.touch("manual", "pointercancel")
  g.tick(0.02)
  assert.equal(g.state().held, false)
  assert.equal(g.state().manual, false)
  g.reset()
  assert.equal(g.state().combo, 0)
  assert.equal(g.state().shuvTime, 0)
  assert.equal(g.state().manualTime, 0)
})
