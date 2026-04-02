import { useState } from 'preact/hooks'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatView } from './components/chat/ChatView'
import { useTheme } from './hooks/useTheme'
import styles from './app.module.css'

export function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        dark={dark}
        onToggleTheme={toggleTheme}
      />
      <ChatView sidebarCollapsed={sidebarCollapsed} />
    </div>
  )
}
