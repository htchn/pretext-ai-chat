import styles from './Message.module.css'

export function Message({ role, content, streaming }) {
  const isUser = role === 'user'

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && <div className={styles.avatar} />}
      <div className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}>
        {content}
        {streaming && !isUser && <span className={styles.cursor} />}
      </div>
    </div>
  )
}
