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
      jump, flip, shuvit, treFlip, beginManual, pause, end, update, trickPose, grindPose, spawn,
      reset(){start();nextSpawn=1e9},
      runCourse(){start()},
      releaseManual(){manualKey=false;manualTouch=false},
      scene(items,pose){obstacles=items;Object.assign(player,pose);nextSpawn=1e9},
      setPace(value){speed=value},
      setMotion(value){distance=Math.max(0,(Math.min(value,145)-83)/.025);boost=Math.max(0,value-cruiseSpeed());speed=value},
      state(){return {mode,score,pending,combo,value:comboValue(),tricks:[...comboTricks],manual,manualTime,held:manualHeld(),grinding,grindStyle,grindStyleTime,grindHeld:down,selectedGrind:selectedGrindStyle(),ground:player.ground,support:player.support?.type||null,flipTime,shuvTime,treTime,treDone,comboTime,G,x:player.x,y:player.y,vy:player.vy,speed,courseLine,nextSpawn,obstacles:obstacles.map(({type,x,w,h,line})=>({type,x,w,h,line}))}}
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
    blur() {
      window.dispatch("blur")
    },
    touch(id, type, pointer = {}) {
      elements.get(id).dispatch(type, {
        pointerId: 1,
        clientX: 100,
        preventDefault() {},
        ...pointer,
      })
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
  g.tick(0.18)
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

function approachRail(g, width = 240, type = "rail") {
  const { x, G } = g.state()
  g.scene([{ type, x: x - 8, w: width, h: 18 }], {
    y: G - 19,
    vy: 40,
    ground: false,
    support: null,
  })
}

test("boardslides and 5–0s use distinct poses and award settled style changes", () => {
  const g = game()
  approachRail(g)
  g.key("ArrowDown", true)
  g.key("ArrowLeft", true)
  g.tick(0.1)
  assert.equal(g.state().grinding, true)
  assert.equal(g.state().pending, 0)
  g.tick(0.15)
  assert.deepEqual(g.state().tricks, ["Boardslide"])
  assert.ok(g.grindPose().yaw > 1.5)
  assert.equal(g.grindPose().tilt, 0)
  const first = g.state().pending
  g.key("ArrowLeft", false)
  g.key("ArrowRight", true)
  g.tick(0.25)
  assert.deepEqual(g.state().tricks, ["Boardslide", "5–0"])
  assert.ok(g.grindPose().yaw < 0.02)
  assert.ok(g.grindPose().tilt < -0.18)
  assert.ok(g.state().pending >= first + 175)
  assert.equal(g.state().combo, 2)
})

test("repeating a style on the same rail adds time points only", () => {
  const g = game()
  approachRail(g)
  g.key("ArrowDown", true)
  g.key("ArrowLeft", true)
  g.tick(0.25)
  g.key("ArrowLeft", false)
  g.key("ArrowRight", true)
  g.tick(0.25)
  const before = g.state()
  g.key("ArrowRight", false)
  g.key("ArrowLeft", true)
  g.tick(0.25)
  assert.equal(g.state().combo, before.combo)
  assert.deepEqual(g.state().tricks, before.tricks)
  assert.ok(
    g.state().pending > before.pending &&
      g.state().pending < before.pending + 10
  )
})

test("rapid stance taps cannot earn entry bonuses or inflate a multiplier", () => {
  const g = game()
  approachRail(g)
  g.key("ArrowDown", true)
  for (let i = 0; i < 8; i++) {
    const next = i % 2 ? "ArrowRight" : "ArrowLeft"
    const previous = i % 2 ? "ArrowLeft" : "ArrowRight"
    g.key(previous, false)
    g.key(next, true)
    g.tick(0.05)
  }
  assert.equal(g.state().grinding, true)
  assert.equal(g.state().combo, 0)
  assert.equal(g.state().pending, 0)
})

test("repeated styles on a new rail earn a reduced entry bonus within the combo", () => {
  const g = game()
  approachRail(g)
  g.key("ArrowDown", true)
  g.key("ArrowLeft", true)
  g.tick(0.25)
  const first = g.state().pending
  approachRail(g)
  g.tick(0.25)
  const repeatedEntry = g.state().pending - first
  assert.ok(repeatedEntry >= 60 && repeatedEntry < 70)
  assert.equal(g.state().combo, 2)
  assert.deepEqual(g.state().tricks, ["Boardslide", "Boardslide"])
})

test("new grinds carry into air tricks and bank only after a clean exit", () => {
  const g = game()
  approachRail(g, 112)
  g.key("ArrowDown", true)
  g.key("ArrowRight", true)
  g.tick(0.55)
  const grind = g.state()
  assert.deepEqual(grind.tricks, ["5–0"])
  assert.ok(grind.score < 5)
  g.jump()
  g.shuvit()
  g.key("ArrowDown", false)
  g.key("ArrowRight", false)
  assert.equal(g.state().pending, grind.pending + 70)
  assert.equal(g.state().combo, 2)
  g.tick(1.9)
  assert.equal(g.state().mode, "playing")
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score >= (grind.pending + 70) * 2)
})

test("both new stances work on ledges as well as rails", () => {
  for (const type of ["curb", "bench", "manual-pad"]) {
    const g = game()
    approachRail(g, 112, type)
    g.key("ArrowDown", true)
    g.key("ArrowLeft", true)
    g.tick(0.25)
    assert.deepEqual(g.state().tricks, ["Boardslide"])
    g.key("ArrowLeft", false)
    g.key("ArrowRight", true)
    g.tick(0.25)
    assert.deepEqual(g.state().tricks, ["Boardslide", "5–0"])
    assert.equal(g.state().mode, "playing")
  }
})

test("long rails remain collidable until their trailing edge leaves the screen", () => {
  const g = game()
  const { G } = g.state()
  g.scene([{ type: "rail", x: -95, w: 240, h: 18 }], {
    y: G - 19,
    vy: 40,
    ground: false,
  })
  g.key("ArrowDown", true)
  g.tick(0.25)
  assert.equal(g.state().obstacles.length, 1)
  assert.equal(g.state().grinding, true)
  assert.equal(g.state().mode, "playing")
  g.tick(2)
  assert.equal(g.state().pending, 0)
  assert.equal(g.state().mode, "playing")
})

test("rail length scales with speed and leaves space for the next obstacle", () => {
  for (const speed of [83, 213]) {
    const g = game()
    g.setPace(speed)
    g.spawn()
    g.spawn()
    g.spawn()
    const rail = g.state().obstacles.find((o) => o.type === "rail")
    assert.equal(rail.type, "rail")
    assert.ok(rail.w >= Math.max(112, speed * 1.1))
    assert.ok(g.state().nextSpawn - rail.w >= speed * 1.35 + 35 - 1e-9)
  }
})

test("touch dragging selects stances and cancellation does not cancel a keyboard hold", () => {
  const g = game()
  approachRail(g)
  g.key("ArrowDown", true)
  g.touch("grind", "pointerdown")
  g.touch("grind", "pointermove", { clientX: 70 })
  g.tick(0.25)
  assert.equal(g.state().grindStyle, "boardslide")
  g.touch("grind", "pointermove", { pointerId: 2, clientX: 140 })
  assert.equal(g.state().selectedGrind, "boardslide")
  g.touch("grind", "pointermove", { clientX: 130 })
  g.tick(0.25)
  assert.equal(g.state().grindStyle, "5-0")
  g.touch("grind", "pointercancel")
  assert.equal(g.state().grindHeld, true)
  assert.equal(g.state().selectedGrind, "50-50")
  g.key("ArrowDown", false)
  assert.equal(g.state().grindHeld, false)
})

test("pause, blur and restart clear stance inputs without banking paused points", () => {
  const g = game()
  approachRail(g)
  g.key("ArrowDown", true)
  g.key("ArrowLeft", true)
  g.tick(0.25)
  g.pause()
  const paused = g.state()
  g.tick(2)
  assert.equal(g.state().pending, paused.pending)
  assert.equal(g.state().grindHeld, false)
  assert.equal(g.state().selectedGrind, "50-50")
  g.reset()
  g.touch("grind", "pointerdown")
  g.touch("grind", "pointermove", { clientX: 130 })
  g.blur()
  assert.equal(g.state().mode, "paused")
  assert.equal(g.state().grindHeld, false)
  g.reset()
  assert.equal(g.state().grindStyleTime, 0)
  assert.equal(g.grindPose().yaw, 0)
  assert.equal(g.grindPose().tilt, 0)
})

test("360 flips combine roll and yaw, then bank as one airborne trick", () => {
  const g = game()
  g.treFlip()
  assert.equal(g.state().pending, 0)
  g.jump()
  g.treFlip()
  g.flip()
  g.shuvit()
  g.treFlip()
  g.tick(0.3)
  assert.equal(g.state().pending, 190)
  assert.equal(g.state().combo, 1)
  assert.deepEqual(g.state().tricks, ["360 flip"])
  assert.ok(g.trickPose().yaw > 1 && g.trickPose().yaw < Math.PI * 2)
  assert.ok(g.trickPose().roll < -1)
  g.tick(1.45)
  assert.equal(g.state().mode, "playing")
  assert.equal(g.state().pending, 0)
  assert.ok(g.state().score >= 190 && g.state().score < 195)
})

test("a late 360 flip bails and cannot replace an already selected trick", () => {
  const g = game()
  g.jump()
  g.flip()
  g.treFlip()
  assert.equal(g.state().treTime, 0)
  assert.equal(g.state().pending, 85)
  g.reset()
  g.jump()
  g.tick(0.35)
  g.treFlip()
  g.tick(0.6)
  assert.equal(g.state().mode, "over")
  assert.equal(g.state().pending, 0)
  assert.match(g.text("overlay-copy"), /190 lost/)
  g.reset()
  assert.equal(g.state().treTime, 0)
  assert.equal(g.state().treDone, false)
})

test("keyboard and touch both trigger a 360 flip and pause freezes its animation", () => {
  const g = game()
  g.jump()
  g.key("v", true, { ctrlKey: true })
  assert.equal(g.state().treTime, 0)
  g.key("v", true)
  g.tick(0.2)
  g.pause()
  const remaining = g.state().treTime
  g.tick(3)
  assert.equal(g.state().treTime, remaining)
  g.reset()
  g.jump()
  g.touch("tre-flip", "pointerdown")
  assert.deepEqual(g.state().tricks, ["360 flip"])
})

test("raised pads support manuals, clean exits and grinds", () => {
  const g = game()
  const { x, G } = g.state()
  g.jump()
  g.beginManual("key")
  g.scene([{ type: "manual-pad", x: x + 30, w: 160, h: 10 }], {})
  g.tick(1.1)
  assert.equal(g.state().support, "manual-pad")
  assert.equal(g.state().y, G - 10)
  assert.equal(g.state().manual, true)
  assert.deepEqual(g.state().tricks, ["Ollie", "Manual"])
  g.releaseManual()
  g.tick(0.02)
  assert.equal(g.state().pending, 0)
  g.tick(1.8)
  assert.equal(g.state().ground, true)
  assert.equal(g.state().y, G)
  assert.equal(g.state().mode, "playing")
})

test("riding into a raised pad requires a jump", () => {
  const g = game()
  const { x } = g.state()
  g.scene([{ type: "manual-pad", x: x + 6, w: 140, h: 10 }], {})
  g.tick(0.05)
  assert.equal(g.state().mode, "over")
})

test("the opening ramp feeds onto a manual pad at cruise and pushing speeds", () => {
  for (const pushing of [false, true]) {
    const g = game()
    g.runCourse()
    if (pushing) g.key("ArrowRight", true)
    let reachedPad = false,
      exited = false
    for (let time = 0; time < 12; time += 1 / 60) {
      g.tick(1 / 60)
      const state = g.state()
      assert.equal(
        state.mode,
        "playing",
        `Opening line failed with pushing=${pushing}`
      )
      if (state.support === "manual-pad") reachedPad = true
      if (reachedPad && state.ground && !state.support) {
        exited = true
        break
      }
    }
    assert.equal(reachedPad, true)
    assert.equal(exited, true)
  }
})

test("plaza lines have clear separation and predictable obstacle sequences", () => {
  const g = game()
  g.spawn()
  assert.deepEqual(
    g.state().obstacles.map((o) => o.type),
    ["ramp", "manual-pad"]
  )
  g.spawn()
  const line = g.state().obstacles.filter((o) => o.line === 1)
  assert.deepEqual(
    line.map((o) => o.type),
    ["manual-pad", "rail", "ramp"]
  )
  for (let i = 1; i < line.length; i++)
    assert.ok(line[i].x - (line[i - 1].x + line[i - 1].w) >= 32)
  const span = line.at(-1).x + line.at(-1).w - line[0].x
  assert.ok(g.state().nextSpawn - span >= 180)
  g.reset()
  g.spawn()
  assert.equal(g.state().courseLine, 1)
  assert.deepEqual(
    g.state().obstacles.map((o) => o.type),
    ["ramp", "manual-pad"]
  )
})

test("the designed manual-pad to rail to ramp line supports a complete tre-flip combo", () => {
  for (const speed of [83, 213]) {
    const g = game()
    g.setPace(speed)
    g.spawn()
    g.spawn()
    const initial = g.state()
    const line = initial.obstacles.filter((o) => o.line === 1)
    const offset = line[0].x - initial.x + 10
    line.forEach((o) => {
      o.x -= offset
    })
    g.scene(line, {
      ground: true,
      support: line[0],
      y: initial.G - line[0].h,
      vy: 0,
    })
    g.setMotion(speed)
    g.beginManual("key")
    let jumped = false,
      reachedRail = false,
      tre = false,
      banked = false
    for (let time = 0; time < 12; time += 1 / 120) {
      const state = g.state()
      assert.equal(
        state.mode,
        "playing",
        `Line failed at ${speed}, ${state.tricks.join(" → ")}`
      )
      const pad = state.obstacles.find((o) => o.type === "manual-pad")
      if (!jumped && pad && pad.x + pad.w - state.x < state.speed * 0.06) {
        g.key("ArrowDown", true)
        g.key("ArrowLeft", true)
        g.jump()
        jumped = true
      }
      if (state.grinding) reachedRail = true
      if (reachedRail && !state.grinding) {
        g.key("ArrowDown", false)
        g.key("ArrowLeft", false)
      }
      if (!tre && state.tricks.at(-1) === "Ramp air" && state.vy < 0) {
        g.treFlip()
        g.releaseManual()
        tre = true
      }
      if (tre && state.pending === 0) {
        banked = true
        break
      }
      g.tick(1 / 120)
    }
    assert.equal(jumped, true)
    assert.equal(reachedRail, true)
    assert.equal(tre, true)
    assert.equal(banked, true)
    assert.ok(g.state().score > 1000)
  }
})

test("every designed transfer is reachable at cruise and boosted speed", () => {
  for (const speed of [83, 213]) {
    const catalog = game()
    catalog.setPace(speed)
    for (let i = 0; i < 4; i++) catalog.spawn()
    const all = catalog.state().obstacles
    for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
      const line = all.filter((o) => o.line === lineIndex)
      for (let i = 1; i < line.length; i++) {
        const g = game()
        const { x, G } = g.state()
        const left = { ...line[i - 1] },
          right = { ...line[i] }
        const shift = left.x + left.w - x
        left.x -= shift
        right.x -= shift
        const rail = left.type === "rail"
        g.scene([left, right], {
          ground: !rail,
          support: rail ? null : left,
          y: G - left.h + (rail ? 2 : 0),
          vy: 0,
        })
        g.setMotion(speed)
        if (right.type === "rail" || rail) g.key("ArrowDown", true)
        // Ride off raised surfaces into kickers; pop between raised landing surfaces.
        if (!rail && left.type !== "ramp" && right.type !== "ramp") g.jump()
        let reached = false
        for (let time = 0; time < 2; time += 1 / 120) {
          g.tick(1 / 120)
          const state = g.state()
          assert.equal(
            state.mode,
            "playing",
            `${left.type} → ${right.type} at ${speed}`
          )
          if (
            state.support === right.type ||
            (right.type === "rail" && state.grinding)
          ) {
            reached = true
            break
          }
        }
        assert.equal(reached, true, `${left.type} → ${right.type} at ${speed}`)
      }
    }
  }
})
