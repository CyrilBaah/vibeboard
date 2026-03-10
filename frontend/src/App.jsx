import { useState, useEffect, useCallback } from 'react'
import ServiceStatus from './components/ServiceStatus.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import PostVibe from './components/PostVibe.jsx'
import VibeFeed from './components/VibeFeed.jsx'
import OnboardModal from './components/OnboardModal.jsx'

export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function loadUser() {
  try {
    const raw = localStorage.getItem('vibeboard_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser] = useState(loadUser)
  const [showModal, setShowModal] = useState(() => !loadUser())
  const [health, setHealth] = useState({ status: null, database: null })
  const [leaderboard, setLeaderboard] = useState([])
  const [vibes, setVibes] = useState([])

  // ── Fetchers ────────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/health`)
      setHealth(await res.json())
    } catch {
      setHealth({ status: 'down', database: 'disconnected' })
    }
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/leaderboard`)
      setLeaderboard(await res.json())
    } catch { /* silently skip */ }
  }, [])

  const fetchVibes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/vibes`)
      setVibes(await res.json())
    } catch { /* silently skip */ }
  }, [])

  // ── Polling ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, 3000)
    return () => clearInterval(id)
  }, [fetchHealth])

  useEffect(() => {
    fetchLeaderboard()
    fetchVibes()
    const id = setInterval(() => {
      fetchLeaderboard()
      fetchVibes()
    }, 4000)
    return () => clearInterval(id)
  }, [fetchLeaderboard, fetchVibes])

  // ── Callbacks ───────────────────────────────────────────────────────────
  const handleUserSaved = (savedUser) => {
    localStorage.setItem('vibeboard_user', JSON.stringify(savedUser))
    setUser(savedUser)
    setShowModal(false)
  }

  const handleVibePosted = () => {
    fetchVibes()
    fetchLeaderboard()
  }

  const handleHyped = () => {
    fetchLeaderboard()
    fetchVibes()
  }

  return (
    <div className="app">
      {/* Animated background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <h1 className="logo">
            <span className="logo-fire">🔥</span> VibeBoard
          </h1>
          <div className="header-right">
            <ServiceStatus health={health} />
            {user && (
              <div className="current-user">
                <span className="user-avatar">{user.avatar}</span>
                <span className="user-name">@{user.username}</span>
              </div>
            )}
            {!user && (
              <button className="join-btn" onClick={() => setShowModal(true)}>
                Join 🚀
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main two-column grid */}
      <main className="app-main">
        <aside className="sidebar">
          <Leaderboard leaderboard={leaderboard} currentUser={user} />
        </aside>
        <section className="feed-section">
          <PostVibe
            user={user}
            onVibePosted={handleVibePosted}
            onOpenModal={() => setShowModal(true)}
          />
          <VibeFeed
            vibes={vibes}
            user={user}
            onHyped={handleHyped}
            onOpenModal={() => setShowModal(true)}
          />
        </section>
      </main>

      {showModal && (
        <OnboardModal
          onSave={handleUserSaved}
          onClose={user ? () => setShowModal(false) : null}
        />
      )}
    </div>
  )
}
