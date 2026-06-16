import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, FileText, Clock, Calendar, MapPin } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000' : window.location.origin)
    : 'http://localhost:3000')).replace(/\/$/, '');

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
}

interface ContractStatus {
  contract_title: string;
  contract_nickname: string | null;
  status: string;
  signing_url?: string;
}

export default function RegistrationStatus() {
  const { token } = useParams();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [contracts, setContracts] = useState<ContractStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) loadStatus();
  }, [token]);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/events/registration/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Nu am gasit inregistrarea');
        setLoading(false);
        return;
      }

      setRegistration(data.registration);
      setContracts(data.contracts || []);
      setLoading(false);
    } catch (err) {
      setError('Eroare la incarcarea statusului');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-page">
        <div className="card loading-card">
          <Loader2 size={32} className="spinner" />
          <p>Se incarca...</p>
        </div>
        {pageStyles}
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-page">
        <div className="card error-card">
          <AlertCircle size={48} />
          <h2>Eroare</h2>
          <p>{error}</p>
        </div>
        {pageStyles}
      </div>
    );
  }

  const allContractsCompleted = contracts.length === 0 || contracts.every(c => c.status === 'completed');
  const dateObj = registration?.event_date ? new Date((registration.event_date.split('T')[0]) + 'T12:00:00') : null;
  const formattedDate = dateObj?.toLocaleDateString('ro-RO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="public-page">
      <div className="card status-card">
        <div className="status-header">
          {allContractsCompleted ? (
            <CheckCircle size={48} className="icon-success" />
          ) : (
            <Clock size={48} className="icon-pending" />
          )}
          <h1>{allContractsCompleted ? 'Inscriere Completa!' : 'Inscriere in Curs'}</h1>
        </div>

        <div className="event-info">
          <h2>{registration?.event_title}</h2>
          <div className="event-meta">
            {formattedDate && <span><Calendar size={14} /> {formattedDate}</span>}
            {registration?.event_time && <span><Clock size={14} /> {registration.event_time}</span>}
            {registration?.event_location && <span><MapPin size={14} /> {registration.event_location}</span>}
          </div>
        </div>

        <div className="reg-info">
          <div className="info-row">
            <span className="info-label">Nume:</span>
            <span className="info-value">{registration?.full_name}</span>
          </div>
          {registration?.email && (
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{registration.email}</span>
            </div>
          )}
          {registration?.phone && (
            <div className="info-row">
              <span className="info-label">Telefon:</span>
              <span className="info-value">{registration.phone}</span>
            </div>
          )}
        </div>

        {contracts.length > 0 && (
          <div className="contracts-section">
            <h3>Contracte</h3>
            <div className="contracts-list">
              {contracts.map((c, i) => (
                <div key={i} className={`contract-item ${c.status}`}>
                  <div className="contract-info">
                    {c.status === 'completed' ? (
                      <CheckCircle size={18} className="icon-success" />
                    ) : (
                      <FileText size={18} className="icon-pending" />
                    )}
                    <div>
                      <span className="contract-name">{c.contract_nickname || c.contract_title}</span>
                      <span className={`contract-badge ${c.status}`}>
                        {c.status === 'completed' ? 'Semnat' : 'In asteptare'}
                      </span>
                    </div>
                  </div>
                  {c.status === 'pending' && c.signing_url && (
                    <a href={c.signing_url} target="_blank" rel="noopener noreferrer" className="btn-sign">
                      Semneaza
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn-refresh" onClick={loadStatus}>
          Actualizeaza Status
        </button>
      </div>
      {pageStyles}
    </div>
  );
}

const pageStyles = (
  <style>{`
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    .public-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;
    }

    .card {
      background: white; border-radius: 16px; padding: 40px; max-width: 560px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .loading-card, .error-card { text-align: center; }
    .loading-card p, .error-card p { color: #666; }
    .error-card svg { color: #f44336; margin-bottom: 16px; }

    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .status-header { text-align: center; margin-bottom: 24px; }
    .status-header h1 { margin: 12px 0 0 0; font-size: 24px; font-weight: 900; color: #1a1a2e; }
    .icon-success { color: #4CAF50; }
    .icon-pending { color: #FF9800; }

    .event-info { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .event-info h2 { margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #333; }
    .event-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: #666; }
    .event-meta span { display: flex; align-items: center; gap: 4px; }
    .event-meta svg { color: #764ba2; }

    .reg-info { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .info-row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 15px; }
    .info-label { color: #888; min-width: 80px; }
    .info-value { color: #333; font-weight: 600; }

    .contracts-section { margin-bottom: 24px; }
    .contracts-section h3 { margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #333; }
    .contracts-list { display: flex; flex-direction: column; gap: 10px; }

    .contract-item {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 10px; border: 1px solid #eee;
    }
    .contract-item.completed { background: rgba(76,175,80,0.05); border-color: rgba(76,175,80,0.2); }
    .contract-item.pending { background: rgba(255,152,0,0.05); border-color: rgba(255,152,0,0.2); }

    .contract-info { display: flex; align-items: center; gap: 12px; }
    .contract-name { display: block; font-weight: 600; font-size: 15px; color: #333; }
    .contract-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
    .contract-badge.completed { color: #4CAF50; }
    .contract-badge.pending { color: #FF9800; }

    .btn-sign {
      padding: 8px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;
      flex-shrink: 0; transition: opacity 0.2s;
    }
    .btn-sign:hover { opacity: 0.9; }

    .btn-refresh {
      width: 100%; padding: 14px; background: white; border: 1px solid #ddd;
      border-radius: 10px; color: #666; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-refresh:hover { background: #f5f5f5; color: #333; }

    @media (max-width: 600px) {
      .public-page { padding: 12px; align-items: flex-start; }
      .card { padding: 24px 20px; }
      .status-header h1 { font-size: 20px; }
      .event-meta { gap: 10px; }
      .contract-item { flex-direction: column; align-items: flex-start; }
    }
  `}</style>
);
