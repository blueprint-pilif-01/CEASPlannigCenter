import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, Users, ChevronRight } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import { apiCall, getUser } from '../../utils/api';
import { useMinimumLoadingTime } from '../../hooks/useMinimumLoadingTime';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  event_type_name: string;
  registrations_count: number;
}

export default function Dashboard() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const displayLoading = useMinimumLoadingTime(loading, 400);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    loadDashboard();
  }, [navigate]);

  const loadDashboard = async () => {
    try {
      const eventsData = await apiCall('/events?upcoming=true&status=published&limit=5');
      setUpcomingEvents(eventsData.events || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  if (displayLoading) {
    return (
      <>
        <PlannerNav />
        <LoadingSpinner fullScreen />
      </>
    );
  }

  return (
    <>
      <PlannerNav />
      <main className="dashboard">
        {/* Welcome Header */}
        <div className="dashboard-header">
          <div>
            <h1>Bun venit, {user?.full_name || user?.username}!</h1>
            <p>Planning Center - Gestionare Evenimente și Contracte</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card" onClick={() => navigate('/planner/events')}>
            <div className="stat-icon" style={{ background: 'rgba(76,175,80,0.1)' }}>
              <Calendar size={24} style={{ color: '#4CAF50' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{upcomingEvents.length}</div>
              <div className="stat-label">Evenimente viitoare</div>
            </div>
            <button className="stat-action">
              Vezi evenimente <ChevronRight size={14} />
            </button>
          </div>

          <div className="stat-card" onClick={() => navigate('/planner/contracts')}>
            <div className="stat-icon" style={{ background: 'rgba(33,150,243,0.1)' }}>
              <FileText size={24} style={{ color: '#2196F3' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">Contracte</div>
              <div className="stat-label">Gestionare șabloane și semnături</div>
            </div>
            <button className="stat-action">
              Deschide <ChevronRight size={14} />
            </button>
          </div>

          <div className="stat-card" onClick={() => navigate('/planner/admin/users')}>
            <div className="stat-icon" style={{ background: 'rgba(156,39,176,0.1)' }}>
              <Users size={24} style={{ color: '#9C27B0' }} />
            </div>
            <div className="stat-content">
              <div className="stat-value">Utilizatori</div>
              <div className="stat-label">Administrare conturi</div>
            </div>
            <button className="stat-action">
              Administrare <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2>Evenimente viitoare</h2>
              <button onClick={() => navigate('/planner/events')} className="btn-link">
                Vezi toate →
              </button>
            </div>

            <div className="services-grid">
              {upcomingEvents.map((event) => {
                const dateStr = event.date ? event.date.split('T')[0] : '';
                const date = new Date(dateStr + 'T12:00:00');
                const day = date.getDate();
                const month = date.toLocaleDateString('ro-RO', { month: 'short' }).toUpperCase();

                return (
                  <div
                    key={event.id}
                    className="service-card"
                    onClick={() => navigate(`/planner/events/${event.id}`)}
                  >
                    <div className="card-date">
                      <div className="day">{day}</div>
                      <div className="month">{month}</div>
                    </div>
                    <div className="card-content">
                      <h3>{event.title}</h3>
                      <div className="meta">
                        {event.time && <span>{event.time}</span>}
                        {event.event_type_name && <span className="type-badge">{event.event_type_name}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <style>{`
          body {
            background: var(--bg-primary);
            color: var(--text-primary);
            padding-top: 80px;
          }
          
          .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 24px;
          }
          
          .dashboard-header {
            margin-bottom: 32px;
          }
          
          .dashboard-header h1 {
            margin: 0 0 8px 0;
            font-size: 32px;
            font-weight: 900;
            color: var(--text-primary);
          }
          
          .dashboard-header p {
            margin: 0;
            color: var(--text-tertiary);
            font-size: 16px;
          }

          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }

          .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .stat-card:hover {
            background: var(--hover-bg);
            border-color: var(--border-primary);
          }
          
          .stat-card > div:first-child {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          
          .stat-content {
            flex: 1;
          }
          
          .stat-value {
            font-size: 28px;
            font-weight: 900;
            line-height: 1;
            margin-bottom: 4px;
          }
          
          .stat-label {
            font-size: 13px;
            color: var(--text-tertiary);
            line-height: 1.3;
          }

          .stat-action {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            background: var(--card-bg);
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            justify-content: center;
          }

          .stat-action:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
          
          /* Section */
          .section {
            margin-bottom: 40px;
          }
          
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .section-header h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
          }
          
          .btn-link {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 16px;
            background: none;
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-link:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
          
          /* Services Grid */
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
          }
          
          .service-card {
            display: flex;
            gap: 16px;
            padding: 20px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .service-card:hover {
            background: var(--hover-bg);
            border-color: var(--border-primary);
          }
          
          .card-date {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 12px 16px;
            min-width: 60px;
            flex-shrink: 0;
          }
          
          .card-date .day {
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
            margin-bottom: 4px;
          }
          
          .card-date .month {
            font-size: 11px;
            color: var(--text-tertiary);
            letter-spacing: 0.5px;
          }
          
          .card-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .card-content h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
          }
          
          .meta {
            display: flex;
            gap: 12px;
            font-size: 13px;
            color: var(--text-tertiary);
            flex-wrap: wrap;
            align-items: center;
          }

          .type-badge {
            padding: 4px 8px;
            background: rgba(76,175,80,0.1);
            border: 1px solid rgba(76,175,80,0.3);
            color: #4CAF50;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          /* Mobile responsiveness */
          @media (max-width: 1024px) {
            body { padding-top: 70px; }
            .dashboard { padding: 32px 20px; }
            .dashboard-header h1 { font-size: 28px; }
          }
          
          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .dashboard { padding: 24px 16px; }
            .dashboard-header h1 { font-size: 24px; }
            .dashboard-header p { font-size: 15px; }
            
            .stats-grid { grid-template-columns: 1fr; gap: 12px; }
            .stat-card { padding: 16px; }
            .stat-icon { width: 40px; height: 40px; }
            .stat-value { font-size: 24px; }
            
            .services-grid { grid-template-columns: 1fr; }
            
            .section-header { flex-direction: column; align-items: flex-start; gap: 10px; }
            .section-header h2 { font-size: 20px; }
          }
          
          @media (max-width: 480px) {
            body { padding-top: 56px; }
            .dashboard { padding: 20px 12px; }
            .dashboard-header h1 { font-size: 22px; }
            .dashboard-header p { font-size: 14px; }
            
            .stat-card { padding: 14px; }
            .stat-value { font-size: 22px; }
            .stat-label { font-size: 13px; }
            
            .service-card { padding: 16px; }
            .card-date { width: 50px; }
            .card-date .day { font-size: 20px; }
            .card-content h3 { font-size: 15px; }
            
            .section-header h2 { font-size: 18px; }
          }
        `}</style>
      </main>
    </>
  );
}
