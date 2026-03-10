import { useState } from 'react'
import { API } from '../App.jsx'

const AVATARS = [
  '🔥', '👾', '🧙', '🕺',
  '🦄', '🚀', '😈', '🌊',
  '⚡', '🎸', '🦊', '🐉',
  '🌈', '💥', '🎯', '🏆',
]

export default function OnboardModal({ onSave, onClose }) {
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('🔥')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUsernameChange = (e) => {
    // lowercase, allow letters/numbers/underscores only, no spaces
    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please pick a username!')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          avatar,
          bio: bio.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      const savedUser = await res.json()
      onSave(savedUser)
    } catch {
      setError('Could not reach backend. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose || undefined}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Join the Vibe 🔥</h2>
        <p className="modal-subtitle">Pick your identity. No accounts, no emails.</p>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Username */}
          <div className="input-group">
            <label className="input-label">username</label>
            <div className="username-input-wrapper">
              <span className="at-prefix">@</span>
              <input
                className="text-input"
                type="text"
                placeholder="chaoslord"
                value={username}
                onChange={handleUsernameChange}
                maxLength={30}
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          {/* Avatar picker */}
          <div className="input-group">
            <label className="input-label">pick your avatar</label>
            <div className="avatar-grid">
              {AVATARS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`avatar-btn${avatar === em ? ' avatar-btn-selected' : ''}`}
                  onClick={() => setAvatar(em)}
                  aria-label={em}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="input-group">
            <label className="input-label">
              bio <span className="optional">(optional)</span>
            </label>
            <input
              className="text-input bio-input"
              type="text"
              placeholder="chaos is my love language"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 80))}
              maxLength={80}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}

          <button type="submit" className="modal-submit-btn" disabled={loading}>
            {loading ? 'Joining...' : "Let's Vibe! 🚀"}
          </button>
        </form>
      </div>
    </div>
  )
}
