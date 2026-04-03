import { useRef, useEffect, useState, useMemo } from 'preact/hooks'
import { Sparkles } from 'lucide-preact'
import { renderMarkdown } from '../../lib/markdown'
import { measureMessageHeight, shrinkwrapMessage } from '../../lib/pretext-engine'
import styles from './Message.module.css'

// User bubble: padding 20px*2 + border 1px*2 = 42px
const BUBBLE_EXTRA = 42
// Max text content width for shrinkwrap calculation
const MAX_TEXT_WIDTH = 680

function useFontReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { document.fonts.ready.then(() => setReady(true)) }, [])
  return ready
}

export function Message({ role, content, streaming, noKey, onOpenSettings }) {
  const isUser = role === 'user'
  const fontReady = useFontReady()

  const shrinkWidth = useMemo(() => {
    if (!fontReady || !content || noKey) return null
    if (!isUser && streaming) return null
    return shrinkwrapMessage(content, MAX_TEXT_WIDTH)
  }, [fontReady, content, noKey, isUser, streaming])

  if (isUser) {
    const bubbleMax = shrinkWidth != null
      ? (shrinkWidth + BUBBLE_EXTRA) + 'px'
      : undefined

    return (
      <div className={styles.userRow}>
        <div
          className={styles.userBubble}
          style={bubbleMax ? { maxWidth: bubbleMax } : undefined}
        >
          {noKey ? (
            <div>
              <p>还没有配置 API Key，点击下方按钮前往设置。</p>
              <button className={styles.settingsLink} onClick={onOpenSettings}>
                打开设置
              </button>
            </div>
          ) : (
            content
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.assistantRow}>
      <div className={styles.avatar}>
        <Sparkles size={16} />
      </div>
      {streaming ? (
        <StreamingContent content={content} />
      ) : (
        <div
          className={styles.assistantContent}
          style={shrinkWidth != null ? { maxWidth: shrinkWidth + 'px' } : undefined}
        >
          {noKey ? (
            <div>
              <p>还没有配置 API Key，点击下方按钮前往设置。</p>
              <button className={styles.settingsLink} onClick={onOpenSettings}>
                打开设置
              </button>
            </div>
          ) : (
            <div className={styles.markdown}>
              {renderMarkdown(content)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StreamingContent({ content }) {
  const containerRef = useRef(null)
  const [minHeight, setMinHeight] = useState(0)
  const widthRef = useRef(0)

  useEffect(() => {
    if (containerRef.current && widthRef.current === 0) {
      widthRef.current = containerRef.current.offsetWidth
    }
  }, [])

  useEffect(() => {
    if (!content || widthRef.current === 0) return
    const { height } = measureMessageHeight(content, widthRef.current)
    if (height > minHeight) {
      setMinHeight(height)
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className={styles.assistantContent}
      style={{ minHeight: minHeight > 0 ? minHeight + 'px' : undefined }}
    >
      <div className={styles.markdown}>
        {renderMarkdown(content)}
      </div>
      <span className={styles.cursor} />
    </div>
  )
}
