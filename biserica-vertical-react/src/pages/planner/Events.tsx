import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Edit, Trash2, MessageCircle, Users, Settings, MapPin, Clock } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  location: string;
  status: string;
  requires_registration: boolean;
  event_type_name: string;
  whatsapp_group_name: string;
  registrations_count: number;
  created_by_name: string;
  created_at: string;
}

interface EventType {
  id: number;
  name: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filterType, filterStatus]);

  const loadData = async () => {
    try {
      let endpoint = '/events?';
      if (filterType) endpoint += `event_type_id=${filterType}&`;
      if (filterStatus) endpoint += `status=${filterStatus}&`;

      const [eventsRes, typesRes] = await Promise.all([
        api.get(endpoint),
        api.get('/events/types')
      ]);
      setEvents(eventsRes.data.events || []);
      setEventTypes(typesRes.data.types || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading events:', error);
      setLoading(false);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('Sigur vrei sa stergi acest eveniment?')) return;
    try {
      await api.delete(`/events/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Eroare la stergere');
    }
  };

  const shareWhatsApp = async (id: number) => {
    try {
      const { data } = await api.post(`/events/${id}/whatsapp-message`);
      await navigator.clipboard.writeText(data.message);

      const groupNote = data.whatsapp_group_name
        ? `\n\nTrimite in grupul: ${data.whatsapp_group_name}`
        : '';
      alert(`Mesaj copiat in clipboard!${groupNote}`);

      window.open(data.whatsapp_link, '_blank');
    } catch (error) {
      console.error('Error generating WhatsApp message:', error);
      alert('Eroare la generare mesaj');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; border: string; color: string }> = {
      draft: { bg: 'rgba(158,158,158,0.1)', border: 'rgba(158,158,158,0.3)', color: '#9E9E9E' },
      published: { bg: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.3)', color: '#4CAF50' },
      closed: { bg: 'rgba(244,67,54,0.1)', border: 'rgba(244,67,54,0.3)', color: '#f44336' }
    };
    const labels: Record<string, string> = { draft: 'Ciorna', published: 'Publicat', closed: 'Inchis' };
    const s = styles[status] || styles.draft;
    return (
      <span style={{
        padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', background: s.bg, border: `1px solid ${s.border}`, color: s.color
      }}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (<><PlannerNav /><LoadingSpinner fullScreen /></>);
  }

  return (
    <>
      <PlannerNav />
      <main className="events-page">
        <div className="page-header">
          <div>
            <h1>Evenimente</h1>
            <p>Gestioneaza evenimentele CEAS si inscrierea participantilor</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate('/planner/events/types')}>
              <Settings size={16} />
              Tipuri Evenimente
            </button>
            <button className="btn-primary" onClick={() => navigate('/planner/events/new')}>
              <Plus size={16} />
              Creare Eveniment
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Toate tipurile</option>
            {eventTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Toate statusurile</option>
            <option value="draft">Ciorna</option>
            <option value="published">Publicat</option>
            <option value="closed">Inchis</option>
          </select>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <Calendar size={64} />
            <h2>Niciun eveniment</h2>
            <p>Creeaza primul eveniment pentru a incepe</p>
            <button className="btn-primary" onClick={() => navigate('/planner/events/new')}>
              <Plus size={16} />
              Creeaza eveniment
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => {
              const dateStr = event.date ? event.date.split('T')[0] : '';
              const dateObj = new Date(dateStr + 'T12:00:00');
              const day = dateObj.getDate();
              const month = dateObj.toLocaleDateString('ro-RO', { month: 'short' }).toUpperCase();

              return (
                <div key={event.id} className="event-card">
                  <div className="card-top">
                    <div className="card-date-block">
                      <div className="day">{day}</div>
                      <div className="month">{month}</div>
                    </div>
                    <div className="card-info">
                      <h3>{event.title}</h3>
                      <div className="card-meta">
                        {event.event_type_name && (
                          <span className="type-badge">{event.event_type_name}</span>
                        )}
                        {getStatusBadge(event.status)}
                      </div>
                    </div>
                  </div>

                  <div className="card-details">
                    {event.time && (
                      <span className="detail"><Clock size={14} /> {event.time}{event.end_time ? ` - ${event.end_time}` : ''}</span>
                    )}
                    {event.location && (
                      <span className="detail"><MapPin size={14} /> {event.location}</span>
                    )}
                    {event.requires_registration && (
                      <span className="detail"><Users size={14} /> {event.registrations_count} inscrisi</span>
                    )}
                  </div>

                  <div className="card-actions">
                    {event.status === 'published' && (
                      <button className="btn-action whatsapp" onClick={() => shareWhatsApp(event.id)} title="Trimite pe WhatsApp">
                        <MessageCircle size={16} />
                        WhatsApp
                      </button>
                    )}
                    <button className="btn-action" onClick={() => navigate(`/planner/events/${event.id}`)} title="Editeaza">
                      <Edit size={16} />
                    </button>
                    <button className="btn-action danger" onClick={() => deleteEvent(event.id)} title="Sterge">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          body { background: var(--bg-primary); padding-top: 80px; }
          .events-page { max-width: 1400px; margin: 0 auto; padding: 40px 24px; }
          .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 20px; }
          .page-header h1 { margin: 0 0 8px 0; font-size: 32px; font-weight: 900; }
          .page-header p { margin: 0; color: var(--text-tertiary); }
          .header-actions { display: flex; gap: 12px; }

          .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; }
          .btn-primary { background: #4CAF50; color: white; }
          .btn-primary:hover { background: #45a049; }
          .btn-secondary { background: var(--card-bg); border: 1px solid var(--border-primary); color: var(--text-primary); }
          .btn-secondary:hover { background: var(--hover-bg); }

          .filters-bar { display: flex; gap: 12px; margin-bottom: 24px; }
          .filters-bar select {
            padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-primary);
            background: var(--card-bg); color: var(--text-primary); font-size: 14px; cursor: pointer;
          }

          .empty-state { text-align: center; padding: 80px 20px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; }
          .empty-state svg { color: var(--text-tertiary); margin-bottom: 24px; }
          .empty-state h2 { margin: 0 0 8px 0; color: var(--text-secondary); }
          .empty-state p { margin: 0 0 24px 0; color: var(--text-tertiary); }

          .events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }

          .event-card {
            background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px;
            padding: 24px; transition: all 0.2s;
          }
          .event-card:hover { border-color: var(--border-primary); }

          .card-top { display: flex; gap: 16px; margin-bottom: 16px; }
          .card-date-block {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: var(--bg-secondary); border-radius: 8px; padding: 12px 16px; min-width: 60px; flex-shrink: 0;
          }
          .card-date-block .day { font-size: 24px; font-weight: 900; line-height: 1; margin-bottom: 4px; }
          .card-date-block .month { font-size: 11px; color: var(--text-tertiary); letter-spacing: 0.5px; }

          .card-info { flex: 1; }
          .card-info h3 { margin: 0 0 8px 0; font-size: 18px; font-weight: 700; }
          .card-meta { display: flex; gap: 8px; flex-wrap: wrap; }

          .type-badge {
            padding: 4px 10px; background: rgba(33,150,243,0.1); border: 1px solid rgba(33,150,243,0.3);
            color: #2196F3; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;
          }

          .card-details { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; font-size: 13px; color: var(--text-tertiary); }
          .detail { display: flex; align-items: center; gap: 4px; }

          .card-actions { display: flex; gap: 8px; }
          .btn-action {
            display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px;
            background: var(--card-bg); border: 1px solid var(--border-primary); color: var(--text-secondary);
            border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600;
          }
          .btn-action:hover { background: var(--hover-bg); color: var(--text-primary); }
          .btn-action.whatsapp { flex: 1; background: rgba(37,211,102,0.1); border-color: rgba(37,211,102,0.3); color: #25D366; }
          .btn-action.whatsapp:hover { background: rgba(37,211,102,0.2); }
          .btn-action.danger:hover { background: rgba(244,67,54,0.1); border-color: rgba(244,67,54,0.3); color: #f44336; }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .events-page { padding: 24px 16px; }
            .page-header { flex-direction: column; }
            .header-actions { flex-wrap: wrap; }
            .filters-bar { flex-wrap: wrap; }
            .events-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </main>
    </>
  );
}
