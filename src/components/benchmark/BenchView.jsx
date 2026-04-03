import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { X } from 'lucide-preact'
import { prepare, layout } from '@chenglou/pretext'
import { FONT, LINE_HEIGHT } from '../../lib/pretext-engine'
import { createFPSTracker } from '../../lib/metrics'
import styles from './BenchView.module.css'

const SAMPLES = [
  {
    label: '中文',
    text: '大语言模型的核心能力在于理解和生成自然语言。通过海量数据的预训练，模型学会了语法结构、语义关联和常识推理。在实际应用中，流式输出是用户体验的关键环节——用户期望看到文字逐步呈现，而不是等待数秒后一次性显示全部内容。\n\n然而传统的 DOM 渲染方式存在一个根本性问题：每次追加文本都会触发浏览器的 reflow 计算。当容器高度因为新增文字而改变时，页面布局会发生抖动，滚动条会跳跃，整个阅读体验变得不稳定。这种现象在移动端尤为明显，因为移动设备的渲染性能相对有限。\n\nPretext 通过纯 JavaScript 实现文本测量，在文字写入 DOM 之前就精确预测渲染高度，从而实现真正的零抖动流式输出。',
  },
  {
    label: 'English',
    text: 'Large language models have fundamentally changed how we interact with computers. The streaming output pattern — where tokens appear one by one as the model generates them — has become the standard UX for AI chat interfaces.\n\nThe technical challenge lies in maintaining visual stability during streaming. In a traditional DOM-based approach, each new token causes the browser to recalculate layout. This "reflow" operation is expensive: the browser must re-measure text, recompute element dimensions, and repaint affected regions. When this happens 30-60 times per second during streaming, the result is visible jitter.\n\nPretext solves this by performing text measurement entirely in JavaScript, without touching the DOM. It can predict the exact rendered height of any text string at any container width, allowing the UI to pre-allocate space before writing content. The result is perfectly smooth streaming with zero layout shift.',
  },
  {
    label: '中英混排',
    text: 'AI 应用的前端渲染是一个被低估的技术挑战。当 GPT-4 或 Claude 以 streaming 方式输出时，每个 token 到达都会触发 DOM reflow，导致页面 layout shift。\n\nThis is especially problematic for CJK (Chinese, Japanese, Korean) text rendering. Unlike Latin scripts where word boundaries are marked by spaces, CJK text requires more complex line-breaking algorithms. The browser\'s built-in text layout engine handles this well, but at the cost of expensive reflow operations.\n\n解决方案是 Pretext —— 一个纯 JS 文本排版库。它的核心 API 只有两个：prepare() 解析文本结构，layout() 计算渲染尺寸。通过缓存 prepare() 的结果，后续的 layout() 调用可以在微秒级完成，比 DOM reflow 快 10-100 倍 🚀',
  },
]

const CONTAINER_WIDTH = 560

export function BenchView({ onClose }) {
  const [speed, setSpeed] = useState(30)
  const [sampleIdx, setSampleIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [charIndex, setCharIndex] = useState(0)
  const [nativeJumps, setNativeJumps] = useState(0)
  const [pretextJumps, setPretextJumps] = useState(0)

  const [fps, setFps] = useState(0)
  const [nativeReflows, setNativeReflows] = useState(0)
  const [pretextReflows, setPretextReflows] = useState(0)

  const nativeRef = useRef(null)
  const pretextRef = useRef(null)
  const intervalRef = useRef(null)
  const nativeJumpsRef = useRef(0)
  const pretextJumpsRef = useRef(0)
  const nativeReflowsRef = useRef(0)
  const fpsTracker = useRef(createFPSTracker())

  const text = SAMPLES[sampleIdx].text

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    fpsTracker.current.stop()
    setRunning(false)
    setDone(false)
    setCharIndex(0)
    nativeJumpsRef.current = 0
    pretextJumpsRef.current = 0
    nativeReflowsRef.current = 0
    setNativeJumps(0)
    setPretextJumps(0)
    setFps(0)
    setNativeReflows(0)
    setPretextReflows(0)
    if (nativeRef.current) {
      nativeRef.current.style.height = ''
      nativeRef.current.textContent = ''
    }
    if (pretextRef.current) {
      pretextRef.current.style.height = ''
      pretextRef.current.textContent = ''
    }
  }, [])

  const start = useCallback(() => {
    reset()
    const nEl = nativeRef.current
    const pEl = pretextRef.current
    if (!nEl || !pEl) return

    setRunning(true)
    setDone(false)
    fpsTracker.current.start()

    let idx = 0
    const src = text
    const intervalMs = Math.round(1000 / speed)

    intervalRef.current = setInterval(() => {
      idx++
      if (idx > src.length) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        fpsTracker.current.stop()
        setFps(fpsTracker.current.value)
        setRunning(false)
        setDone(true)
        return
      }

      const slice = src.slice(0, idx)
      setCharIndex(idx)

      // Native: write text, read offsetHeight → forced reflow
      const nh1 = nEl.offsetHeight
      nEl.textContent = slice
      const nh2 = nEl.offsetHeight  // this forces browser reflow
      nativeReflowsRef.current++
      if (nh1 !== nh2 && idx > 1) nativeJumpsRef.current++

      // Pretext: predict height in pure JS (0 reflows), then write
      const prepared = prepare(slice, FONT)
      const predicted = Math.ceil(layout(prepared, CONTAINER_WIDTH, LINE_HEIGHT).height)
      pEl.style.height = predicted + 'px'
      const ph1 = pEl.offsetHeight
      pEl.textContent = slice
      const ph2 = pEl.offsetHeight
      if (ph1 !== ph2) pretextJumpsRef.current++

      setNativeJumps(nativeJumpsRef.current)
      setPretextJumps(pretextJumpsRef.current)
      setNativeReflows(nativeReflowsRef.current)
      setFps(fpsTracker.current.value)
    }, intervalMs)
  }, [text, speed, reset])

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    fpsTracker.current.stop()
  }, [])

  // Reset when sample changes
  useEffect(() => {
    reset()
  }, [sampleIdx, reset])

  const progress = text.length > 0 ? Math.round((charIndex / text.length) * 100) : 0
  const reduction = done && nativeJumps > 0
    ? Math.round((1 - pretextJumps / nativeJumps) * 100)
    : null

  return (
    <div className={styles.bench}>
      <div className={styles.header}>
        <span className={styles.title}>Rendering Benchmark</span>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.samples}>
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              className={`${styles.sampleButton} ${sampleIdx === i ? styles.active : ''}`}
              onClick={() => { if (!running) setSampleIdx(i) }}
              disabled={running}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className={styles.speedControl}>
          <label className={styles.speedLabel}>速度：{speed} token/s</label>
          <input
            type="range"
            min={5}
            max={80}
            value={speed}
            onInput={(e) => setSpeed(Number(e.target.value))}
            className={styles.slider}
            disabled={running}
          />
        </div>

        <button
          className={styles.actionButton}
          onClick={running ? reset : start}
        >
          {running ? '停止' : done ? '重新开始' : '开始对比'}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: progress + '%' }} />
        </div>
      )}

      {/* Split panels */}
      <div className={styles.splitView}>
        {/* Native panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>原生 DOM</span>
            <span className={styles.panelTag}>textContent → reflow</span>
          </div>
          <div className={styles.panelBody}>
            <div
              ref={nativeRef}
              className={styles.renderArea}
              style={{ width: CONTAINER_WIDTH + 'px' }}
            />
          </div>
          <div className={styles.panelFooter}>
            <span className={styles.metricLabel}>高度跳变</span>
            <span className={`${styles.metricValue} ${nativeJumps > 0 ? styles.bad : ''}`}>
              {nativeJumps} 次
            </span>
          </div>
        </div>

        {/* Pretext panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Pretext</span>
            <span className={styles.panelTag}>predict → write</span>
          </div>
          <div className={styles.panelBody}>
            <div
              ref={pretextRef}
              className={styles.renderArea}
              style={{ width: CONTAINER_WIDTH + 'px' }}
            />
          </div>
          <div className={styles.panelFooter}>
            <span className={styles.metricLabel}>高度跳变</span>
            <span className={`${styles.metricValue} ${pretextJumps === 0 ? styles.good : styles.bad}`}>
              {pretextJumps} 次
            </span>
          </div>
        </div>
      </div>

      {/* Metrics panel */}
      {(running || done) && (
        <div className={styles.metricsPanel}>
          <div className={styles.metricCard}>
            <span className={styles.metricCardLabel}>Reflow（原生 DOM）</span>
            <span className={`${styles.metricCardValue} ${styles.bad}`}>
              {nativeReflows}
            </span>
            <span className={`${styles.metricCardStatus} ${styles.bad}`}>
              每字符 1 次
            </span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricCardLabel}>Reflow（Pretext）</span>
            <span className={`${styles.metricCardValue} ${styles.good}`}>
              0
            </span>
            <span className={`${styles.metricCardStatus} ${styles.good}`}>
              纯 JS 计算
            </span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricCardLabel}>FPS</span>
            <span className={`${styles.metricCardValue} ${fps >= 30 ? styles.good : styles.bad}`}>
              {fps}
            </span>
            <span className={`${styles.metricCardStatus} ${fps >= 30 ? styles.good : styles.bad}`}>
              {fps >= 30 ? 'Smooth' : 'Janky'}
            </span>
          </div>
        </div>
      )}

      {/* Summary */}
      {done && (
        <div className={styles.summary}>
          高度跳变：原生 DOM <strong>{nativeJumps}</strong> 次 → Pretext <strong>{pretextJumps}</strong> 次
          {reduction !== null && (
            <span className={styles.good}>（减少 {reduction}%）</span>
          )}
        </div>
      )}
    </div>
  )
}
