import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { X } from 'lucide-preact'
import { prepare, layout, prepareWithSegments, walkLineRanges } from '@chenglou/pretext'
import { FONT, LINE_HEIGHT } from '../../lib/pretext-engine'
import styles from './LabView.module.css'

const DEFAULT_TEXT = '你好 Hello，这是一段用于验证 Pretext 引擎的测试文本。Pretext 可以在不触发 DOM reflow 的情况下精确预测文本高度，这对于流式输出、虚拟列表和智能气泡宽度计算都至关重要。The quick brown fox jumps over the lazy dog. 中英文混排和 emoji 🚀 都需要正确处理。测试不同宽度下的换行行为是否与实际渲染一致。'

const STREAMING_TEXT = '人工智能正在深刻改变我们的生活方式。从自然语言处理到计算机视觉，从自动驾驶到医疗诊断，AI 技术已经渗透到各个领域。在文本渲染这个看似简单的场景中，传统的 DOM reflow 机制会导致页面在流式输出时不断抖动。Pretext 通过纯 JavaScript 实现文本测量和排版，完全绕过 DOM reflow，在文本写入之前就精确预测渲染高度。这意味着容器可以提前设置好正确的高度，文本写入时不会触发任何 layout shift，实现真正的零抖动流式输出体验。'

const SHRINKWRAP_MESSAGES = [
  { label: '短消息', text: '你好，世界！Hello World 🌍' },
  { label: '中消息', text: 'Pretext 可以找到最窄的气泡宽度，同时保持行数不变。这对于聊天界面的用户体验非常重要。' },
  { label: '长消息', text: '人工智能正在深刻改变我们的生活方式。从自然语言处理到计算机视觉，从自动驾驶到医疗诊断，AI 技术已经渗透到各个领域。Pretext 通过纯 JavaScript 实现文本测量和排版，完全绕过 DOM reflow，实现零抖动的流式输出体验。' },
]

const TABS = [
  { id: 'accuracy', label: '精度测试' },
  { id: 'streaming', label: '流式测试' },
  { id: 'shrinkwrap', label: 'Shrinkwrap' },
  { id: 'batch', label: '批量测试' },
]

export function LabView({ onClose }) {
  const [activeTab, setActiveTab] = useState('accuracy')

  return (
    <div className={styles.lab}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.active : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'accuracy' && <AccuracyTest />}
        {activeTab === 'streaming' && <StreamingTest />}
        {activeTab === 'shrinkwrap' && <ShrinkwrapTest />}
        {activeTab === 'batch' && <BatchTest />}
      </div>
    </div>
  )
}

// ============================================================
// Tab 1: 精度测试
// ============================================================

function AccuracyTest() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [results, setResults] = useState(null)
  const [fontReady, setFontReady] = useState(false)
  const canvasRef = useRef(null)
  const measureRef = useRef(null)

  useEffect(() => {
    document.fonts.ready.then(() => setFontReady(true))
  }, [])

  const runTest = useCallback(() => {
    if (!fontReady || !text || !measureRef.current) return

    const el = measureRef.current
    const widths = []
    for (let w = 200; w <= 900; w += 50) widths.push(w)

    const data = widths.map(w => {
      const prepared = prepare(text, FONT)
      const predicted = layout(prepared, w, LINE_HEIGHT).height

      el.style.width = w + 'px'
      el.textContent = text
      const actual = el.offsetHeight

      return { width: w, predicted, actual, diff: predicted - actual }
    })

    setResults(data)
  }, [text, fontReady])

  // Draw chart when results change
  useEffect(() => {
    if (!results || !canvasRef.current) return

    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height
    const pad = { top: 24, right: 24, bottom: 40, left: 56 }
    const cw = W - pad.left - pad.right
    const ch = H - pad.top - pad.bottom

    // Clear
    ctx.clearRect(0, 0, W, H)

    // Compute Y range
    const diffs = results.map(d => d.diff)
    const maxAbs = Math.max(Math.ceil(Math.max(...diffs.map(Math.abs))), 4)
    const yMin = -maxAbs
    const yMax = maxAbs

    const xScale = (w) => pad.left + ((w - 200) / 700) * cw
    const yScale = (v) => pad.top + ((yMax - v) / (yMax - yMin)) * ch

    // Get colors from CSS variables
    const cs = getComputedStyle(document.documentElement)
    const textSecondary = cs.getPropertyValue('--text-secondary').trim() || '#888'
    const textTertiary = cs.getPropertyValue('--text-tertiary').trim() || '#666'
    const borderColor = cs.getPropertyValue('--border').trim() || '#333'
    const textPrimary = cs.getPropertyValue('--text-primary').trim() || '#fff'

    // Grid lines
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 0.5
    for (let v = yMin; v <= yMax; v++) {
      const y = yScale(v)
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + cw, y)
      ctx.stroke()
    }

    // Zero line (bold)
    ctx.strokeStyle = textSecondary
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad.left, yScale(0))
    ctx.lineTo(pad.left + cw, yScale(0))
    ctx.stroke()

    // ±2px dashed lines
    ctx.strokeStyle = textTertiary
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    for (const v of [2, -2]) {
      if (v >= yMin && v <= yMax) {
        const y = yScale(v)
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(pad.left + cw, y)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])

    // Data line
    ctx.strokeStyle = textPrimary
    ctx.lineWidth = 2
    ctx.beginPath()
    results.forEach((d, i) => {
      const x = xScale(d.width)
      const y = yScale(d.diff)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Data points
    results.forEach(d => {
      const x = xScale(d.width)
      const y = yScale(d.diff)
      const inRange = Math.abs(d.diff) <= 2
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = inRange ? '#22c55e' : '#ef4444'
      ctx.fill()
    })

    // X axis labels
    ctx.fillStyle = textTertiary
    ctx.font = '11px Inter'
    ctx.textAlign = 'center'
    results.forEach(d => {
      ctx.fillText(d.width + '', xScale(d.width), pad.top + ch + 20)
    })
    ctx.fillText('容器宽度 (px)', pad.left + cw / 2, pad.top + ch + 36)

    // Y axis labels
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let v = yMin; v <= yMax; v++) {
      ctx.fillText(v + '', pad.left - 8, yScale(v))
    }
    ctx.save()
    ctx.translate(12, pad.top + ch / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillText('高度差值 (px)', 0, 0)
    ctx.restore()

    // ±2 labels
    ctx.textAlign = 'left'
    ctx.fillStyle = textTertiary
    ctx.font = '10px Inter'
    if (2 <= yMax) ctx.fillText('+2px', pad.left + cw + 4, yScale(2))
    if (-2 >= yMin) ctx.fillText('-2px', pad.left + cw + 4, yScale(-2))
  }, [results])

  const inRangeCount = results ? results.filter(d => Math.abs(d.diff) <= 2).length : 0
  const total = results ? results.length : 0
  const allPassed = inRangeCount === total

  return (
    <div className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>测试文本（{text.length} 字符）</label>
        <textarea
          className={styles.textarea}
          value={text}
          onInput={(e) => setText(e.target.value)}
          rows={4}
        />
      </div>

      <button className={styles.actionButton} onClick={runTest} disabled={!fontReady}>
        {fontReady ? '运行测试' : '字体加载中...'}
      </button>

      <canvas ref={canvasRef} className={styles.chartCanvas} />

      {results && (
        <div className={styles.summary}>
          <span className={allPassed ? styles.match : styles.mismatch}>
            {allPassed
              ? `全部 ${total} 个测试点均在 ±2px 内 ✓`
              : `${total - inRangeCount}/${total} 个点超出 ±2px ✗`}
          </span>
        </div>
      )}

      {/* Hidden measure element */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          fontFamily: 'Inter',
          fontSize: '14px',
          lineHeight: '1.6',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      />
    </div>
  )
}

// ============================================================
// Tab 2: 流式测试
// ============================================================

function StreamingTest() {
  const [text, setText] = useState(STREAMING_TEXT)
  const [containerWidth, setContainerWidth] = useState(600)
  const [speed, setSpeed] = useState(30)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [nativeJumps, setNativeJumps] = useState(0)
  const [pretextJumps, setPretextJumps] = useState(0)
  const nativeRef = useRef(null)
  const pretextRef = useRef(null)
  const intervalRef = useRef(null)
  const nativeJumpsRef = useRef(0)
  const pretextJumpsRef = useRef(0)
  const textRef = useRef(text)
  textRef.current = text

  const intervalMs = Math.round(1000 / speed)

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
    setDone(false)
    nativeJumpsRef.current = 0
    pretextJumpsRef.current = 0
    setNativeJumps(0)
    setPretextJumps(0)
    if (nativeRef.current) { nativeRef.current.style.height = ''; nativeRef.current.textContent = '' }
    if (pretextRef.current) { pretextRef.current.style.height = ''; pretextRef.current.textContent = '' }
  }, [])

  const start = useCallback(() => {
    reset()
    const nEl = nativeRef.current
    const pEl = pretextRef.current
    if (!nEl || !pEl) return

    const w = containerWidth
    const src = textRef.current
    nativeJumpsRef.current = 0
    pretextJumpsRef.current = 0

    setRunning(true)
    setDone(false)

    let idx = 0

    intervalRef.current = setInterval(() => {
      idx++
      if (idx > src.length) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setRunning(false)
        setDone(true)
        return
      }

      const slice = src.slice(0, idx)

      // Native: just write text, measure jump
      const nh1 = nEl.offsetHeight
      nEl.textContent = slice
      const nh2 = nEl.offsetHeight
      if (nh1 !== nh2) nativeJumpsRef.current++

      // Pretext: predict height first, then write
      const prepared = prepare(slice, FONT)
      const predicted = Math.ceil(layout(prepared, w, LINE_HEIGHT).height)
      pEl.style.height = predicted + 'px'
      const ph1 = pEl.offsetHeight
      pEl.textContent = slice
      const ph2 = pEl.offsetHeight
      if (ph1 !== ph2) pretextJumpsRef.current++

      setNativeJumps(nativeJumpsRef.current)
      setPretextJumps(pretextJumpsRef.current)
    }, intervalMs)
  }, [containerWidth, intervalMs, reset])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const reduction = nativeJumps === 0 ? '—' : `↓${Math.round((1 - pretextJumps / nativeJumps) * 100)}%`

  return (
    <div className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>测试文本</label>
        <textarea
          className={styles.textarea}
          value={text}
          onInput={(e) => setText(e.target.value)}
          rows={3}
          disabled={running}
        />
      </div>

      <div className={styles.controlsRow}>
        <button className={styles.actionButton} onClick={running ? reset : start}>
          {running ? '停止' : done ? '重新开始' : '开始模拟'}
        </button>
        <div className={styles.field}>
          <label className={styles.label}>速度：{speed} char/s</label>
          <input
            type="range" min={20} max={100} value={speed}
            onInput={(e) => setSpeed(Number(e.target.value))}
            className={styles.slider} disabled={running}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>容器宽度：{containerWidth}px</label>
          <input
            type="range" min={200} max={900} value={containerWidth}
            onInput={(e) => setContainerWidth(Number(e.target.value))}
            className={styles.slider} disabled={running}
          />
        </div>
      </div>

      <div className={styles.dualPanel}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>原生模式</span>
            <span className={styles.panelMetric}>
              高度跳变 <strong className={nativeJumps > 0 ? styles.mismatch : undefined}>{nativeJumps}</strong> 次
            </span>
          </div>
          <div className={styles.panelRender} ref={nativeRef} style={{ width: containerWidth + 'px' }} />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Pretext 模式</span>
            <span className={styles.panelMetric}>
              高度跳变 <strong className={pretextJumps === 0 ? styles.match : styles.mismatch}>{pretextJumps}</strong> 次
            </span>
          </div>
          <div className={styles.panelRender} ref={pretextRef} style={{ width: containerWidth + 'px' }} />
        </div>
      </div>

      {done && (
        <div className={styles.summary}>
          高度跳变：原生 {nativeJumps} 次 → Pretext {pretextJumps} 次
          <span className={styles.match}>（{reduction}）</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tab 3: Shrinkwrap 测试
// ============================================================

function ShrinkwrapTest() {
  const [text, setText] = useState(SHRINKWRAP_MESSAGES[0].text)
  const [activeMsg, setActiveMsg] = useState(0)
  const [result, setResult] = useState(null)
  const [fontReady, setFontReady] = useState(false)
  const nativeRef = useRef(null)
  const shrinkRef = useRef(null)

  useEffect(() => {
    document.fonts.ready.then(() => setFontReady(true))
  }, [])

  const switchMessage = (idx) => {
    setActiveMsg(idx)
    setText(SHRINKWRAP_MESSAGES[idx].text)
    setResult(null)
  }

  const runTest = useCallback(() => {
    if (!fontReady || !text) return

    const maxWidth = 680
    const prepared = prepareWithSegments(text, FONT)

    // Line count at max width
    let lineCountAtMax = 0
    walkLineRanges(prepared, maxWidth, () => { lineCountAtMax++ })

    if (lineCountAtMax <= 0) return

    // Single line: find actual width
    if (lineCountAtMax === 1) {
      let lineWidth = 0
      walkLineRanges(prepared, maxWidth, (line) => { lineWidth = line.width })
      const sw = Math.ceil(lineWidth)
      setResult({ nativeWidth: maxWidth, shrinkWidth: sw, lineCount: 1 })
      return
    }

    // Binary search
    let lo = 0
    let hi = maxWidth
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2
      let lines = 0
      walkLineRanges(prepared, mid, () => { lines++ })
      if (lines <= lineCountAtMax) hi = mid
      else lo = mid
    }

    setResult({ nativeWidth: maxWidth, shrinkWidth: Math.ceil(hi), lineCount: lineCountAtMax })
  }, [text, fontReady])

  // Auto-run when text or font ready changes
  useEffect(() => {
    if (fontReady && text) runTest()
  }, [text, fontReady, runTest])

  const saving = result
    ? `${result.nativeWidth}px → ${result.shrinkWidth}px（↓${Math.round((1 - result.shrinkWidth / result.nativeWidth) * 100)}%）`
    : ''

  return (
    <div className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>测试文本</label>
        <textarea
          className={styles.textarea}
          value={text}
          onInput={(e) => { setText(e.target.value); setResult(null) }}
          rows={3}
        />
      </div>

      <div className={styles.messageTabs}>
        {SHRINKWRAP_MESSAGES.map((m, i) => (
          <button
            key={i}
            className={`${styles.messageTab} ${activeMsg === i ? styles.active : ''}`}
            onClick={() => switchMessage(i)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={styles.dualPanel}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>原生宽度</span>
            <span className={styles.panelMetric}>
              <strong>{result ? result.nativeWidth : 680}px</strong>
            </span>
          </div>
          <div
            ref={nativeRef}
            className={styles.panelRender}
            style={{ width: '680px' }}
          >
            {text}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Shrinkwrap 宽度</span>
            <span className={styles.panelMetric}>
              <strong className={styles.match}>{result ? result.shrinkWidth : '—'}px</strong>
            </span>
          </div>
          <div
            ref={shrinkRef}
            className={styles.panelRender}
            style={{ width: result ? result.shrinkWidth + 'px' : '680px' }}
          >
            {text}
          </div>
        </div>
      </div>

      {result && (
        <div className={styles.summary}>
          宽度节省：{saving}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tab 4: 批量测试
// ============================================================

function generateMessages(count) {
  const phrases = [
    '你好世界 Hello World',
    '这是一段测试文本，用于验证批量计算性能。',
    'The quick brown fox jumps over the lazy dog.',
    'Pretext 可以在不创建 DOM 节点的情况下计算文本高度。',
    '人工智能正在改变我们的生活方式，从自然语言处理到计算机视觉。',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    '中英文混排 mixed content with emoji 🚀 and special chars!',
    'React, Vue, Svelte, Preact — modern frameworks for modern web.',
  ]
  const msgs = []
  for (let i = 0; i < count; i++) {
    // 1-5 phrases concatenated for varied length
    const n = 1 + (i % 5)
    let t = ''
    for (let j = 0; j < n; j++) {
      t += phrases[(i + j) % phrases.length] + ' '
    }
    msgs.push(t.trim())
  }
  return msgs
}

function BatchTest() {
  const [count, setCount] = useState(1000)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const runTest = useCallback(() => {
    setRunning(true)
    setResult(null)

    // Use setTimeout so the UI updates before blocking
    setTimeout(() => {
      const msgs = generateMessages(count)
      const containerWidth = 680

      // Pretext measurement
      const t0 = performance.now()
      for (const msg of msgs) {
        const prepared = prepare(msg, FONT)
        layout(prepared, containerWidth, LINE_HEIGHT)
      }
      const t1 = performance.now()
      const pretextMs = t1 - t0

      // DOM measurement
      const container = document.createElement('div')
      container.style.cssText = `position:absolute;visibility:hidden;width:${containerWidth}px;font:400 14px/1.6 Inter;word-wrap:break-word;overflow-wrap:break-word;`
      document.body.appendChild(container)

      const t2 = performance.now()
      for (const msg of msgs) {
        container.textContent = msg
        container.offsetHeight // force reflow
      }
      const t3 = performance.now()
      const domMs = t3 - t2

      document.body.removeChild(container)

      const speedup = domMs / pretextMs

      setResult({ pretextMs, domMs, speedup, count: msgs.length })
      setRunning(false)
    }, 50)
  }, [count])

  return (
    <div className={styles.section}>
      <div className={styles.controlsRow}>
        <div className={styles.field}>
          <label className={styles.label}>消息条数</label>
          <input
            type="number"
            className={styles.numberInput}
            value={count}
            min={10}
            max={10000}
            onInput={(e) => setCount(Math.max(10, Number(e.target.value) || 10))}
            disabled={running}
          />
        </div>
        <button className={styles.actionButton} onClick={runTest} disabled={running}>
          {running ? '测试中...' : '运行测试'}
        </button>
      </div>

      {result && (
        <div className={styles.batchResults}>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Pretext</span>
            <span className={styles.batchValue}>
              {result.pretextMs.toFixed(1)} ms（0 个 DOM 节点）
            </span>
          </div>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>原生 DOM</span>
            <span className={styles.batchValue}>
              {result.domMs.toFixed(1)} ms（{result.count} 个 DOM 节点）
            </span>
          </div>
          <div className={styles.summary}>
            <span className={styles.match}>
              Pretext 快 {result.speedup.toFixed(1)} 倍
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
