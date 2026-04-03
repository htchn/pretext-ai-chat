// FPS tracker via requestAnimationFrame
export function createFPSTracker() {
  let frames = 0
  let fps = 0
  let lastTime = 0
  let rafId = null
  let active = false

  function tick(now) {
    if (!active) return
    frames++
    const elapsed = now - lastTime
    if (elapsed >= 500) {
      fps = Math.round(frames / (elapsed / 1000))
      frames = 0
      lastTime = now
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    start() {
      active = true
      frames = 0
      fps = 0
      lastTime = performance.now()
      rafId = requestAnimationFrame(tick)
    },
    stop() {
      active = false
      if (rafId) cancelAnimationFrame(rafId)
      rafId = null
    },
    get value() { return fps },
  }
}
