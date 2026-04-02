import { useState, useCallback, useRef } from 'preact/hooks'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatView } from './components/chat/ChatView'
import { Settings } from './components/sidebar/Settings'
import { useTheme } from './hooks/useTheme'
import { useConversations } from './hooks/useConversations'
import styles from './app.module.css'

export function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()
  const {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    ensureConversation,
    setActiveConversation,
    updateMessages,
    renameConversation,
    deleteConversation
  } = useConversations()

  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const handleUpdateMessages = useCallback((msgs) => {
    const id = activeIdRef.current
    if (id) updateMessages(id, msgs)
  }, [updateMessages])

  const handleEnsureConversation = useCallback(() => {
    const id = ensureConversation()
    activeIdRef.current = id
    return id
  }, [ensureConversation])

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        dark={dark}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        conversations={conversations}
        activeId={activeId}
        onSelectChat={setActiveConversation}
        onNewChat={createConversation}
        onRenameChat={renameConversation}
        onDeleteChat={deleteConversation}
      />
      <ChatView
        sidebarCollapsed={sidebarCollapsed}
        onOpenSettings={() => setSettingsOpen(true)}
        conversation={activeConversation}
        onUpdateMessages={handleUpdateMessages}
        onEnsureConversation={handleEnsureConversation}
      />
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
