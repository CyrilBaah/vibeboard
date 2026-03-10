export default function ServiceStatus({ health }) {
  const backendOk = health.status === 'ok'
  const dbOk = health.database === 'connected'
  const allGood = backendOk && dbOk

  return (
    <div className={`service-status ${allGood ? 'status-good' : 'status-bad'}`}>
      <span
        className={`dot ${backendOk ? 'dot-green' : 'dot-red'}`}
        title="Backend"
      />
      <span
        className={`dot ${dbOk ? 'dot-green' : 'dot-red'}`}
        title="Database"
      />
      <span className="status-label">
        {allGood ? 'all systems go' : 'chaos detected 👀'}
      </span>
    </div>
  )
}
