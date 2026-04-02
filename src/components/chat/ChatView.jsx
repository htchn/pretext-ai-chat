import { useState, useRef, useEffect } from 'preact/hooks'
import { ArrowUp } from 'lucide-preact'
import { useChat } from '../../hooks/useChat'
import { Message } from './Message'
import styles from './ChatView.module.css'

export function ChatView({ sidebarCollapsed }) {
  const [inputValue, setInputValue] = useState('')
  const { messages, streaming, error, send } = useChat()
  const messageAreaRef = useRef(null)
  const hasContent = inputValue.trim().length > 0

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text || streaming) return
    setInputValue('')
    send(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <main className={styles.chatView}>
      <div className={styles.messageArea} ref={messageAreaRef}>
        {messages.length === 0 && !error && (
          <div className={styles.emptyState}>
            <p>Send a message to start a conversation</p>
          </div>
        )}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <Message
            key={i}
            role={msg.role}
            content={msg.content}
            streaming={streaming && i === messages.length - 1}
          />
        ))}
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
            onClick={handleSend}
            disabled={!hasContent || streaming}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </main>
  )
}
