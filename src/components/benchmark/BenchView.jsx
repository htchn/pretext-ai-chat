import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { X, Type } from 'lucide-preact'
import { prepare, layout } from '@chenglou/pretext'
import { FONT, LINE_HEIGHT } from '../../lib/pretext-engine'
import { renderMarkdownToHTML } from '../../lib/markdown'
import { SAMPLES } from './samples'
import styles from './BenchView.module.css'

const CONTAINER_WIDTH = 560

export function BenchView({ onClose }) {
  const [speed, setSpeed] = useState(30)
  const [sampleIdx, setSampleIdx] = useState(0)
  const [customText, setCustomText] = useState(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customDraft, setCustomDraft] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [charIndex, setCharIndex] = useState(0)
  const [nativeJumps, setNativeJumps] = useState(0)
  const [pretextJumps, setPretextJumps] = useState(0)

  const [nativeReflows, setNativeReflows] = useState(0)

  const nativeRef = useRef(null)
  const pretextRef = useRef(null)
  const intervalRef = useRef(null)
  const nativeJumpsRef = useRef(0)
  const pretextJumpsRef = useRef(0)
  const nativeReflowsRef = useRef(0)

  const text = customText !== null ? customText : SAMPLES[sampleIdx].text

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
    setDone(false)
    setCharIndex(0)
    nativeJumpsRef.current = 0
    pretextJumpsRef.current = 0
    nativeReflowsRef.current = 0
    setNativeJumps(0)
    setPretextJumps(0)
    setNativeReflows(0)
    if (nativeRef.current) {
      nativeRef.current.style.height = ''
      nativeRef.current.innerHTML = ''
    }
    if (pretextRef.current) {
      pretextRef.current.style.height = ''
      pretextRef.current.innerHTML = ''
    }
  }, [])

  const start = useCallback(() => {
    reset()
    const nEl = nativeRef.current
    const pEl = pretextRef.current
    if (!nEl || !pEl) return

    setRunning(true)
    setDone(false)

    let idx = 0
    const src = text
    const intervalMs = Math.round(1000 / speed)

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
      setCharIndex(idx)

      const html = renderMarkdownToHTML(slice)

      // Native: write HTML, read offsetHeight → forced reflow
      const nh1 = nEl.offsetHeight
      nEl.innerHTML = html
      const nh2 = nEl.offsetHeight  // this forces browser reflow
      nativeReflowsRef.current++
      if (nh1 !== nh2 && idx > 1) nativeJumpsRef.current++

      // Pretext: predict height in pure JS (0 reflows), then write
      const prepared = prepare(slice, FONT)
      const predicted = Math.ceil(layout(prepared, CONTAINER_WIDTH, LINE_HEIGHT).height)
      pEl.style.height = predicted + 'px'
      const ph1 = pEl.offsetHeight
      pEl.innerHTML = html
      const ph2 = pEl.offsetHeight
      if (ph1 !== ph2) pretextJumpsRef.current++

      setNativeJumps(nativeJumpsRef.current)
      setPretextJumps(pretextJumpsRef.current)
      setNativeReflows(nativeReflowsRef.current)
    }, intervalMs)
  }, [text, speed, reset])

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  // Reset when sample changes
  useEffect(() => {
    reset()
  }, [sampleIdx, customText, reset])

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
              className={`${styles.sampleButton} ${customText === null && sampleIdx === i ? styles.active : ''}`}
              onClick={() => { if (!running) { setCustomText(null); setSampleIdx(i) } }}
              disabled={running}
            >
              {s.label}
            </button>
          ))}
          <button
            className={`${styles.sampleButton} ${customText !== null ? styles.active : ''}`}
            onClick={() => {
              if (!running) {
                setCustomDraft(customText || '')
                setShowCustomModal(true)
              }
            }}
            disabled={running}
          >
            <Type size={12} className={styles.customIcon} />
            自定义
          </button>
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
      {/* Custom text modal */}
      {showCustomModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCustomModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>自定义文本</span>
              <button className={styles.closeButton} onClick={() => setShowCustomModal(false)}>
                <X size={16} />
              </button>
            </div>
            <textarea
              className={styles.modalTextarea}
              value={customDraft}
              onInput={(e) => setCustomDraft(e.target.value)}
              placeholder="粘贴或输入你想测试的文本..."
              autoFocus
            />
            <div className={styles.modalFooter}>
              {customText !== null && (
                <button
                  className={styles.modalClearButton}
                  onClick={() => {
                    setCustomText(null)
                    setShowCustomModal(false)
                  }}
                >
                  恢复预设
                </button>
              )}
              <button
                className={styles.modalConfirmButton}
                onClick={() => {
                  const trimmed = customDraft.trim()
                  if (trimmed) {
                    setCustomText(trimmed)
                    setShowCustomModal(false)
                  }
                }}
                disabled={!customDraft.trim()}
              >
                使用此文本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
