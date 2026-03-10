const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ leaderboard, currentUser }) {
  return (
    <div className="leaderboard-card">
      <h2 className="leaderboard-title">Leaderboard</h2>
      {leaderboard.length === 0 ? (
        <p className="empty-state">No vibers yet...</p>
      ) : (
        <ul className="leaderboard-list">
          {leaderboard.map((entry, i) => {
            const isYou = currentUser && entry.username === currentUser.username
            return (
              <li
                key={entry.username}
                className={`leaderboard-row${isYou ? ' leaderboard-row-you' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="lb-rank">
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </span>
                <span className="lb-avatar">{entry.avatar}</span>
                <div className="lb-info">
                  <span className="lb-username">
                    @{entry.username}
                    {isYou && <span className="you-tag">you</span>}
                  </span>
                  {entry.bio && (
                    <span className="lb-bio">
                      {entry.bio.length > 40
                        ? entry.bio.slice(0, 40) + '…'
                        : entry.bio}
                    </span>
                  )}
                </div>
                <span className="lb-points">{entry.hype_points} 🔥</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
