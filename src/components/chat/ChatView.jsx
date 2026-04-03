import { useState, useRef, useEffect, useCallback, useMemo } from 'preact/hooks'
import { ArrowUp } from 'lucide-preact'
import { useChat } from '../../hooks/useChat'
import { loadSettings } from '../../lib/api'
import { measureMessageHeight } from '../../lib/pretext-engine'
import { Message } from './Message'
import styles from './ChatView.module.css'

const PROMPTS = [
  '帮我写一封邮件',
  '解释量子计算',
  '写一段 Python 代码'
]

// Virtual list constants
const MSG_WIDTH = 680           // width for Pretext height estimation
const USER_EXTRA_HEIGHT = 26    // user bubble vertical padding (12*2) + border (1*2)
const BUFFER = 5                // extra messages above/below viewport
const TOP_PADDING = 24          // space above first message
const BOTTOM_PADDING = 80       // space for fixed input bar
const DEFAULT_HEIGHT = 80       // fallback before font loads

export function ChatView({ sidebarCollapsed, onOpenSettings, conversation, onUpdateMessages, onEnsureConversation }) {
  const [inputValue, setInputValue] = useState('')
  const messages = conversation?.messages || []
  const messageAreaRef = useRef(null)
  const hasContent = inputValue.trim().length > 0
  const hasApiKey = loadSettings().apiKey

  const handleMessagesChange = useCallback((msgs) => {
    onUpdateMessages(msgs)
  }, [onUpdateMessages])

  const { streaming, send } = useChat(messages, handleMessagesChange)

  // Font readiness for Pretext measurement
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => { document.fonts.ready.then(() => setFontReady(true)) }, [])

  // Height cache: index → measured DOM height (overrides Pretext estimate)
  const heightCache = useRef(new Map())
  const [heightVersion, setHeightVersion] = useState(0)

  // Clear cache when conversation changes
  const convId = conversation?.id
  useEffect(() => { heightCache.current.clear() }, [convId])

  // Get height for a message: use measured cache if available, else Pretext estimate
  const getHeight = useCallback((msg, index) => {
    const isStreamingMsg = streaming && index === messages.length - 1
    if (!isStreamingMsg && heightCache.current.has(index)) {
      return heightCache.current.get(index)
    }
    if (!fontReady || !msg.content) return DEFAULT_HEIGHT
    const { height } = measureMessageHeight(msg.content, MSG_WIDTH)
    return height + (msg.role === 'user' ? USER_EXTRA_HEIGHT : 0)
  }, [fontReady, streaming, messages.length])

  // Compute cumulative offsets for all messages
  const { offsets, totalHeight } = useMemo(() => {
    const o = [TOP_PADDING]
    for (let i = 0; i < messages.length; i++) {
      const margin = i === 0 ? 0 : (messages[i - 1].role === messages[i].role ? 32 : 48)
      o.push(o[i] + margin + getHeight(messages[i], i))
    }
    return {
      offsets: o,
      totalHeight: (o[o.length - 1] || TOP_PADDING) + BOTTOM_PADDING,
    }
  }, [messages, getHeight, heightVersion])

  // Scroll tracking
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(800)
  const shouldAutoScroll = useRef(true)

  const handleScroll = useCallback(() => {
    const el = messageAreaRef.current
    if (!el) return
    setScrollTop(el.scrollTop)
    setViewportHeight(el.clientHeight)
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  // Track viewport size (resize, sidebar toggle)
  useEffect(() => {
    const el = messageAreaRef.current
    if (!el) return
    setViewportHeight(el.clientHeight)
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Determine visible message range via binary search
  const { startIndex, endIndex } = useMemo(() => {
    if (messages.length === 0) return { startIndex: 0, endIndex: 0 }

    // Find first message whose bottom extends past viewport top
    let lo = 0
    let hi = messages.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (offsets[mid + 1] < scrollTop) lo = mid + 1
      else hi = mid
    }
    const start = Math.max(0, lo - BUFFER)

    // Find last message whose top is above viewport bottom
    const bottom = scrollTop + viewportHeight
    let end = lo
    while (end < messages.length && offsets[end] < bottom) end++
    end = Math.min(messages.length, end + BUFFER)

    return { startIndex: start, endIndex: end }
  }, [messages.length, offsets, scrollTop, viewportHeight])

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (messageAreaRef.current && shouldAutoScroll.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight
    }
  }, [messages, totalHeight])

  // Measure actual DOM heights of visible items, correct cache if needed
  useEffect(() => {
    let changed = false
    for (let i = startIndex; i < endIndex; i++) {
      // Skip streaming message (height changes constantly)
      if (streaming && i === messages.length - 1) continue
      const el = document.getElementById(`msg-${i}`)
      if (!el) continue
      const actual = el.offsetHeight
      const prev = heightCache.current.get(i)
      if (prev == null || Math.abs(prev - actual) > 2) {
        heightCache.current.set(i, actual)
        changed = true
      }
    }
    if (changed) setHeightVersion(v => v + 1)
  })

  const handleSend = (text) => {
    const value = (text || inputValue).trim()
    if (!value || streaming) return
    setInputValue('')
    onEnsureConversation(value)
    send(value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <main className={styles.chatView}>
      <div className={styles.messageArea} ref={messageAreaRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            {hasApiKey ? (
              <div className={styles.emptyContent}>
                <p className={styles.emptyTitle}>新对话已就绪</p>
                <div className={styles.prompts}>
                  {PROMPTS.map(p => (
                    <button
                      key={p}
                      className={styles.promptButton}
                      onClick={() => handleSend(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyContent}>
                <p className={styles.emptyTitle}>配置 API Key 即可开始对话</p>
                <button className={styles.goSettings} onClick={onOpenSettings}>
                  前往设置
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ height: totalHeight + 'px', position: 'relative' }}>
            {messages.slice(startIndex, endIndex).map((msg, i) => {
              const index = startIndex + i
              return (
                <div
                  key={index}
                  id={`msg-${index}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    transform: `translateY(${offsets[index]}px)`,
                    willChange: 'transform',
                  }}
                >
                  <Message
                    role={msg.role}
                    content={msg.content}
                    streaming={streaming && index === messages.length - 1}
                    noKey={msg.noKey}
                    onOpenSettings={onOpenSettings}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={styles.inputBar} style={{ left: sidebarCollapsed ? 0 : 260 }}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.input}
            placeholder="Type a message..."
            rows={1}
            value={inputValue}
            onInput={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`${styles.sendButton} ${hasContent ? styles.active : ''}`}
            onClick={() => handleSend()}
            disabled={!hasContent || streaming}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </main>
  )
}
