import { useState } from 'react'
import { API } from '../App.jsx'

const MAX = 140

export default function PostVibe({ user, onVibePosted, onOpenModal }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [loading, setLoading] = useState(false)

  const remaining = MAX - message.length
  const isWarning = remaining < 20

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      onOpenModal()
      return
    }
    const trimmed = message.trim()
    if (!trimmed) return

    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`${API}/vibes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, message: trimmed }),
      })
      if (!res.ok) throw new Error('Failed')
      setMessage('')
      setStatus('success')
      onVibePosted()
      setTimeout(() => setStatus(null), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="post-vibe-card">
      <h3 className="post-vibe-title">Drop a Vibe</h3>
      <form onSubmit={handleSubmit} className="post-vibe-form">
        <div className="textarea-wrapper">
          <textarea
            className="vibe-textarea"
            placeholder={user ? "What's the vibe? 👾" : 'Sign in to post vibes...'}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            rows={3}
            disabled={loading}
          />
          <span className={`char-count${isWarning ? ' char-count-warning' : ''}`}>
            {remaining}
          </span>
        </div>
        <div className="post-vibe-footer">
          <button
            type="submit"
            className="send-btn"
            disabled={loading || message.trim().length === 0}
          >
            {loading ? '...' : '🔥 Send It'}
          </button>
          {status === 'success' && (
            <span className="post-feedback post-success">Vibe dropped! 🔥</span>
          )}
          {status === 'error' && (
            <span className="post-feedback post-error">Backend unreachable 😵</span>
          )}
        </div>
      </form>
    </div>
  )
}
