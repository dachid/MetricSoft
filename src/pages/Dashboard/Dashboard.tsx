import { useAuth } from '../../contexts/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    const result = await signOut()
    if (result.error) {
      console.error('Error signing out:', result.error)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>MetricSoft Dashboard</h1>
          <div className="user-menu">
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email}</span>
              {user?.roles && user.roles.length > 0 && (
                <span className="user-role">{user.roles[0].name}</span>
              )}
            </div>
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="welcome-card">
            <h2>Welcome to MetricSoft</h2>
            <p>✅ Phase 1, Week 1-2: Project Setup & Authentication Complete!</p>
            <p>🔄 Migrated from Supabase to Prisma ORM - No vendor lock-in!</p>
            
            <div className="user-details">
              <h3>Your Account Details:</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <strong>Email:</strong> {user?.email}
                </div>
                <div className="detail-item">
                  <strong>Name:</strong> {user?.name || 'Not provided'}
                </div>
                <div className="detail-item">
                  <strong>User ID:</strong> {user?.id}
                </div>
                {user?.tenantId && (
                  <div className="detail-item">
                    <strong>Tenant ID:</strong> {user.tenantId}
                  </div>
                )}
                <div className="detail-item">
                  <strong>Roles:</strong> {user?.roles?.map(role => role.name).join(', ') || 'No roles assigned'}
                </div>
              </div>
            </div>
            
            <div className="features-grid">
              <div className="feature-card">
                <h3>🎯 KPI Management</h3>
                <p>Create and manage Key Performance Indicators</p>
              </div>
              <div className="feature-card">
                <h3>🏢 Multi-Tenant</h3>
                <p>Secure organization-level data isolation</p>
              </div>
              <div className="feature-card">
                <h3>📊 Cascading</h3>
                <p>Align goals from organization to individual</p>
              </div>
              <div className="feature-card">
                <h3>� No Vendor Lock-in</h3>
                <p>Prisma ORM with any PostgreSQL database</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
