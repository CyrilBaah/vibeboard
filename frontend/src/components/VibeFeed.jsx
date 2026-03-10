import { useState } from 'react'
import { API } from '../App.jsx'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function VibeFeed({ vibes, user, onHyped, onOpenModal }) {
  const [hyped, setHyped] = useState({})   // vibe_id → true after clicking
  const [counts, setCounts] = useState({}) // vibe_id → optimistic count

  const handleHype = async (vibe) => {
    if (!user) {
      onOpenModal()
      return
    }
    if (hyped[vibe.id]) return

    // Optimistic update
    setHyped((prev) => ({ ...prev, [vibe.id]: true }))
    setCounts((prev) => ({ ...prev, [vibe.id]: (prev[vibe.id] ?? vibe.hype_count) + 1 }))

    try {
      const res = await fetch(`${API}/vibes/${vibe.id}/hype`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_username: user.username }),
      })
      if (res.status === 409) {
        // Already voted — keep button filled, revert count increment
        setCounts((prev) => ({ ...prev, [vibe.id]: vibe.hype_count }))
        return
      }
      if (!res.ok) {
        // Revert on other errors
        setHyped((prev) => ({ ...prev, [vibe.id]: false }))
        setCounts((prev) => ({ ...prev, [vibe.id]: vibe.hype_count }))
        return
      }
      onHyped()
    } catch {
      setHyped((prev) => ({ ...prev, [vibe.id]: false }))
      setCounts((prev) => ({ ...prev, [vibe.id]: vibe.hype_count }))
    }
  }

  return (
    <div className="vibe-feed-card">
      <h3 className="feed-title">Live Vibes</h3>
      {vibes.length === 0 ? (
        <p className="empty-state">No vibes yet. Be the first! 🔥</p>
      ) : (
        <ul className="vibe-list">
          {vibes.map((vibe, i) => {
            const isHyped = hyped[vibe.id]
            const displayCount = counts[vibe.id] ?? vibe.hype_count
            return (
              <li
                key={vibe.id}
                className="vibe-item"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="vibe-header">
                  <span className="vibe-avatar">{vibe.avatar}</span>
                  <div className="vibe-meta">
                    <span className="vibe-username">@{vibe.username}</span>
                    <span className="vibe-time">{timeAgo(vibe.created_at)}</span>
                  </div>
                  <button
                    className={`hype-btn${isHyped ? ' hype-btn-active' : ''}`}
                    onClick={() => handleHype(vibe)}
                    title="Hype this vibe"
                  >
                    🔥 {displayCount}
                  </button>
                </div>
                <p className="vibe-message">{vibe.message}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
