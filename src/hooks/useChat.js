import { useState, useRef, useCallback } from 'preact/hooks'
import { loadSettings } from '../lib/api'
import { getDefaultBaseUrl } from '../lib/api'
import { streamChat } from '../lib/stream'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const send = useCallback(async (text) => {
    const settings = loadSettings()
    if (!settings.apiKey) {
      setError('Please set your API key in Settings first.')
      return
    }
    if (!settings.model) {
      setError('Please select a model in Settings first.')
      return
    }

    setError('')
    const userMessage = { role: 'user', content: text }
    const assistantMessage = { role: 'assistant', content: '' }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setStreaming(true)

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const baseUrl = settings.baseUrl || getDefaultBaseUrl(settings.provider)
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }))

      const stream = streamChat(settings.apiKey, baseUrl, settings.model, apiMessages)

      for await (const token of stream) {
        if (abortController.signal.aborted) break
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = { ...last, content: last.content + token }
          return updated
        })
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError(err.message)
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages])

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [])

  return { messages, streaming, error, send, stop }
}
