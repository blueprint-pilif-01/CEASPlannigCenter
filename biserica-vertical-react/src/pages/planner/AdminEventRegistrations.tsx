import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Search, Users, Check, FileText } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface Event {
  id: number;
  title: string;
  date: string;
  status: string;
  registrations_count: number;
}

interface Registration {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  registered_at: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  contracts: {
    contract_title: string;
    contract_nickname: string | null;
    status: string;
  }[];
}

export default function AdminEventRegistrations() {
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadRegistrations(); }, [selectedEvent]);

  const loadData = async () => {
    try {
      const { data } = await api.get('/events?');
      setEvents(data.events || []);
      loadRegistrations();
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    try {
      let endpoint = '/events/registrations/all?';
      if (selectedEvent) endpoint += `event_id=${selectedEvent}&`;
      const { data } = await api.get(endpoint);
      setRegistrations(data.registrations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading registrations:', error);
      setLoading(false);
    }
  };

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.event_title?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(r => r.id)));
  };

  const exportCSV = () => {
    const targets = selectedIds.size > 0 ? filtered.filter(r => selectedIds.has(r.id)) : filtered;
    const hasEventCol = !selectedEvent;
    const headers = ['#', 'Nume', 'Email', 'Telefon'];
    if (hasEventCol) headers.push('Eveniment', 'Data eveniment');
    headers.push('Contracte', 'Data inscriere');

    const rows = [headers];
    targets.forEach((r, idx) => {
      const contractsSummary = (r.contracts || [])
        .map(c => `${c.contract_nickname || c.contract_title}: ${c.status}`)
        .join(' | ') || '-';

      const row = [
        String(idx + 1),
        r.full_name || '-',
        r.email || '-',
        r.phone || '-',
      ];
      if (hasEventCol) {
        row.push(r.event_title || '-');
        row.push(r.event_date ? new Date((r.event_date.split('T')[0]) + 'T12:00:00').toLocaleDateString('ro-RO') : '-');
      }
      row.push(contractsSummary);
      row.push(new Date(r.registered_at).toLocaleDateString('ro-RO'));
      rows.push(row);
    });

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const selectedEventObj = events.find(e => e.id === selectedEvent);
    a.download = selectedEventObj
      ? `inscrieri_${selectedEventObj.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
      : 'inscrieri_evenimente.csv';
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  if (loading) return (<><PlannerNav /><LoadingSpinner fullScreen /></>);

  return (
    <>
      <PlannerNav />
      <div className="admin-tabs">
        <Link to="/planner/admin/users" className={`admin-tab ${location.pathname === '/planner/admin/users' ? 'active' : ''}`}>Utilizatori</Link>
        <Link to="/planner/admin/contracts" className={`admin-tab ${location.pathname === '/planner/admin/contracts' ? 'active' : ''}`}>Contracte Semnate</Link>
        <Link to="/planner/admin/registrations" className={`admin-tab ${location.pathname === '/planner/admin/registrations' ? 'active' : ''}`}>Inscrieri Evenimente</Link>
      </div>

      <main className="admin-page">
        <h1>Inscrieri Evenimente</h1>
        <p className="subtitle">Vizualizeaza toti participantii inscrisi la evenimente</p>

        <div className="admin-layout">
          <div className="sidebar">
            <button className={`sidebar-item ${selectedEvent === null ? 'active' : ''}`} onClick={() => setSelectedEvent(null)}>
              <Calendar size={16} />
              <div className="sidebar-item-info">
                <span className="sidebar-item-title">Toate evenimentele</span>
                <span className="sidebar-item-count">{registrations.length} inscrisi</span>
              </div>
            </button>
            {events.map(e => {
              const dStr = e.date ? e.date.split('T')[0] : '';
              const dateObj = new Date(dStr + 'T12:00:00');
              const dateStr = dateObj.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
              return (
                <button key={e.id} className={`sidebar-item ${selectedEvent === e.id ? 'active' : ''}`} onClick={() => setSelectedEvent(e.id)}>
                  <Calendar size={16} />
                  <div className="sidebar-item-info">
                    <span className="sidebar-item-title">{e.title}</span>
                    <span className="sidebar-item-count">{dateStr} &middot; {e.registrations_count} inscrisi</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="main-content">
            <div className="search-export-row">
              <div className="search-bar">
                <Search size={16} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cauta dupa nume, email sau eveniment..." />
              </div>
              {filtered.length > 0 && (
                <button className="btn-export-csv" onClick={exportCSV}>
                  ↓ Export CSV{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>Nicio inscriere</h3>
                <p>{selectedEvent ? 'Nicio inscriere pentru acest eveniment' : 'Inca nu exista inscrieri'}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input type="checkbox" checked={filtered.length > 0 && filtered.every(r => selectedIds.has(r.id))} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th>#</th>
                      <th>Nume</th>
                      <th>Email</th>
                      <th>Telefon</th>
                      {!selectedEvent && <th>Eveniment</th>}
                      <th>Contracte</th>
                      <th>Data inscriere</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const totalContracts = r.contracts?.length || 0;
                      const signedContracts = r.contracts?.filter(c => c.status === 'completed').length || 0;

                      return (
                        <tr key={r.id} className={selectedIds.has(r.id) ? 'row-selected' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td>{idx + 1}</td>
                          <td><strong>{r.full_name}</strong></td>
                          <td>{r.email || '-'}</td>
                          <td>{r.phone || '-'}</td>
                          {!selectedEvent && (
                            <td>
                              <span className="event-badge">{r.event_title}</span>
                              <span className="event-date">
                                {r.event_date ? new Date((r.event_date.split('T')[0]) + 'T12:00:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : ''}
                              </span>
                            </td>
                          )}
                          <td>
                            {totalContracts > 0 ? (
                              <div className="contract-statuses">
                                {r.contracts.map((c, i) => (
                                  <span key={i} className={`contract-status ${c.status}`} title={c.contract_title}>
                                    {c.status === 'completed' ? <Check size={12} /> : <FileText size={12} />}
                                    {c.contract_nickname || c.contract_title}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="no-contracts-text">-</span>
                            )}
                          </td>
                          <td>{new Date(r.registered_at).toLocaleDateString('ro-RO')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <style>{`
          body { background: var(--bg-primary); padding-top: 80px; }

          .admin-tabs { max-width: 1400px; margin: 0 auto; padding: 20px 24px 0; display: flex; gap: 4px; border-bottom: 1px solid var(--card-border); }
          .admin-tab { padding: 10px 20px; text-decoration: none; color: var(--text-secondary); font-weight: 700; font-size: 14px; border-bottom: 3px solid transparent; transition: all 0.2s; }
          .admin-tab:hover { color: var(--text-primary); background: var(--hover-bg); }
          .admin-tab.active { color: #4CAF50; border-bottom-color: #4CAF50; }

          .admin-page { max-width: 1400px; margin: 0 auto; padding: 24px; }
          .admin-page h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: 900; }
          .subtitle { margin: 0 0 24px 0; color: var(--text-tertiary); }

          .admin-layout { display: grid; grid-template-columns: 280px 1fr; gap: 24px; }

          .sidebar { display: flex; flex-direction: column; gap: 4px; }
          .sidebar-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; cursor: pointer; text-align: left; transition: all 0.2s; color: var(--text-primary); }
          .sidebar-item:hover { border-color: var(--border-primary); }
          .sidebar-item.active { border-color: #4CAF50; background: rgba(76,175,80,0.05); }
          .sidebar-item-info { display: flex; flex-direction: column; min-width: 0; }
          .sidebar-item-title { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sidebar-item-count { font-size: 12px; color: var(--text-tertiary); }

          .main-content { min-width: 0; }
          .search-export-row { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; }
          .search-bar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; flex: 1; }
          .search-bar input { flex: 1; border: none; background: transparent; color: var(--text-primary); font-size: 14px; outline: none; }
          .btn-export-csv { padding: 10px 16px; background: var(--card-bg); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; white-space: nowrap; }
          .btn-export-csv:hover { background: var(--hover-bg); }

          tr.row-selected { background: rgba(76,175,80,0.05) !important; }
          .table-wrap { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden; }
          th { text-align: left; padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--card-border); font-weight: 700; font-size: 13px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 12px 16px; border-bottom: 1px solid var(--card-border); font-size: 14px; }
          tr:last-child td { border-bottom: none; }
          tbody tr:hover { background: var(--hover-bg); }

          .event-badge { display: inline-block; font-weight: 600; font-size: 13px; }
          .event-date { display: block; font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }

          .contract-statuses { display: flex; gap: 6px; flex-wrap: wrap; }
          .contract-status { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .contract-status.pending { background: rgba(255,152,0,0.1); color: #FF9800; }
          .contract-status.completed { background: rgba(76,175,80,0.1); color: #4CAF50; }
          .no-contracts-text { color: var(--text-tertiary); }

          .empty-state { text-align: center; padding: 60px 20px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; }
          .empty-state svg { color: var(--text-tertiary); margin-bottom: 16px; }
          .empty-state h3 { margin: 0 0 8px 0; }
          .empty-state p { margin: 0; color: var(--text-tertiary); }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .admin-tabs { padding: 12px 16px 0; overflow-x: auto; }
            .admin-page { padding: 16px; }
            .admin-layout { grid-template-columns: 1fr; }
            .sidebar { flex-direction: row; overflow-x: auto; gap: 8px; }
            .sidebar-item { min-width: 200px; }
          }
        `}</style>
      </main>
    </>
  );
}
