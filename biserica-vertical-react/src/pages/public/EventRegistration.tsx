import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, CheckCircle, AlertCircle, Loader2, FileText, Search } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000' : window.location.origin)
    : 'http://localhost:3000')).replace(/\/$/, '');

interface CustomField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface EventInfo {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  location: string;
  event_type_name: string;
  custom_fields?: CustomField[];
}

interface ContractInfo {
  id: number;
  title: string;
  nickname: string | null;
}

interface ContractSigningUrl {
  contract_title: string;
  signing_url: string;
}

export default function EventRegistration() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Custom fields values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Auto-fill
  const [showAutoFill, setShowAutoFill] = useState(false);
  const [autoFillValue, setAutoFillValue] = useState('');
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [autoFillSuccess, setAutoFillSuccess] = useState(false);

  // Post-registration
  const [contractSigningUrls, setContractSigningUrls] = useState<ContractSigningUrl[]>([]);
  const [statusUrl, setStatusUrl] = useState('');

  useEffect(() => {
    if (eventId) loadEvent();
  }, [eventId]);

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE_URL}/api/public${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    return res.json();
  };

  const loadEvent = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/events/${eventId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Evenimentul nu este disponibil');
        setLoading(false);
        return;
      }

      setEvent(data.event);
      setContracts(data.contracts || []);
      setLoading(false);
    } catch (err) {
      setError('Eroare la incarcarea evenimentului');
      setLoading(false);
    }
  };

  const handleAutoFill = async () => {
    if (!autoFillValue.trim()) return;
    setAutoFillLoading(true);
    setAutoFillError(null);

    try {
      const isEmail = autoFillValue.includes('@');
      const body = isEmail ? { email: autoFillValue.trim() } : { phone: autoFillValue.trim() };

      const res = await fetch(`${API_BASE_URL}/api/public/events/${eventId}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        setAutoFillError(data.error || 'Nu am gasit date');
        setAutoFillLoading(false);
        return;
      }

      if (data.saved_fields) {
        setFullName(data.saved_fields.full_name || '');
        setEmail(data.saved_fields.email || '');
        setPhone(data.saved_fields.phone || '');
        setAutoFillSuccess(true);
      }
    } catch (err) {
      setAutoFillError('Eroare la cautare');
    } finally {
      setAutoFillLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { alert('Numele complet este obligatoriu'); return; }

    // Validate required custom fields
    const customFieldDefs = event?.custom_fields || [];
    for (const cf of customFieldDefs) {
      if (cf.required && !customFieldValues[cf.id]) {
        alert(`Campul "${cf.label}" este obligatoriu`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          additional_data: customFieldValues
        })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Eroare la inscriere');
        setSubmitting(false);
        return;
      }

      setContractSigningUrls(data.contracts || []);
      setStatusUrl(data.status_url || '');
      setSuccess(true);
    } catch (err) {
      alert('Eroare la inscriere');
    } finally {
      setSubmitting(false);
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
          <h2>Eveniment Indisponibil</h2>
          <p>{error}</p>
        </div>
        {pageStyles}
      </div>
    );
  }

  if (success) {
    return (
      <div className="public-page">
        <div className="card success-card">
          <CheckCircle size={48} className="success-icon" />
          <h2>Inscriere Realizata!</h2>
          <p>Te-ai inscris cu succes la <strong>{event?.title}</strong>.</p>

          {contractSigningUrls.length > 0 && (
            <div className="contracts-section">
              <h3>Contracte de Semnat</h3>
              <p className="contracts-hint">Trebuie sa semnezi urmatoarele contracte:</p>
              <div className="contracts-links">
                {contractSigningUrls.map((c, i) => (
                  <a key={i} href={c.signing_url} target="_blank" rel="noopener noreferrer" className="contract-link">
                    <FileText size={16} />
                    {c.contract_title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        {pageStyles}
      </div>
    );
  }

  const dateObj = event ? new Date((event.date?.split('T')[0] || '') + 'T12:00:00') : null;
  const formattedDate = dateObj?.toLocaleDateString('ro-RO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="public-page">
      <div className="card registration-card">
        <div className="event-header">
          <h1>{event?.title}</h1>
          {event?.event_type_name && <span className="type-badge">{event.event_type_name}</span>}
        </div>

        <div className="event-details">
          {formattedDate && <div className="detail"><Calendar size={16} /> {formattedDate}</div>}
          {event?.time && (
            <div className="detail">
              <Clock size={16} /> {event.time}{event.end_time ? ` - ${event.end_time}` : ''}
            </div>
          )}
          {event?.location && <div className="detail"><MapPin size={16} /> {event.location}</div>}
        </div>

        {event?.description && <p className="event-description">{event.description}</p>}

        <hr className="divider" />

        <h2>Formular de Inscriere</h2>

        <div className="autofill-section">
          <button type="button" className="btn-autofill" onClick={() => setShowAutoFill(!showAutoFill)}>
            <Search size={14} /> Am mai participat - completare rapida
          </button>
          {showAutoFill && (
            <div className="autofill-box">
              <input
                type="text" value={autoFillValue}
                onChange={e => { setAutoFillValue(e.target.value); setAutoFillError(null); setAutoFillSuccess(false); }}
                placeholder="Introdu email-ul sau numarul de telefon"
              />
              <button onClick={handleAutoFill} disabled={autoFillLoading}>
                {autoFillLoading ? <Loader2 size={14} className="spinner" /> : 'Cauta'}
              </button>
              {autoFillError && <p className="autofill-error">{autoFillError}</p>}
              {autoFillSuccess && <p className="autofill-success">Date gasite! Verifica mai jos.</p>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nume complet *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Numele si prenumele" required />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="adresa@email.com" />
          </div>

          <div className="form-group">
            <label>Telefon</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xx xxx xxx" />
          </div>

          {(event?.custom_fields || []).map(cf => (
            <div key={cf.id} className="form-group">
              {cf.type !== 'checkbox' && <label>{cf.label}{cf.required && <span style={{ color: '#f44336' }}> *</span>}</label>}
              {cf.type === 'select' && cf.options && cf.options.length > 0 ? (
                <select
                  value={customFieldValues[cf.id] || ''}
                  onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                  required={cf.required}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px' }}
                >
                  <option value="">-- Alege --</option>
                  {cf.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : cf.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={!!customFieldValues[cf.id]}
                    onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.id]: e.target.checked }))}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>{cf.label}</span>
                </label>
              ) : (
                <input
                  type={cf.type === 'phone' ? 'tel' : cf.type}
                  value={customFieldValues[cf.id] || ''}
                  onChange={e => setCustomFieldValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                  required={cf.required}
                  placeholder={cf.label}
                />
              )}
            </div>
          ))}

          {contracts.length > 0 && (
            <div className="contracts-notice">
              <FileText size={16} />
              <span>Dupa inscriere, vei fi redirectionat sa completezi {contracts.length} contract{contracts.length > 1 ? 'e' : ''}.</span>
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? (
              <><Loader2 size={16} className="spinner" /> Se trimite...</>
            ) : (
              <><CheckCircle size={16} /> Inscrie-te</>
            )}
          </button>
        </form>
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
      background: white; border-radius: 16px; padding: 40px; max-width: 600px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .loading-card, .error-card, .success-card { text-align: center; }
    .loading-card p, .error-card p { color: #666; }
    .error-card svg { color: #f44336; margin-bottom: 16px; }
    .success-icon { color: #4CAF50; margin-bottom: 16px; }
    .success-card h2 { color: #333; margin: 0 0 8px 0; }
    .success-card p { color: #666; margin: 0 0 24px 0; }

    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .event-header { margin-bottom: 20px; }
    .event-header h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: 900; color: #1a1a2e; }
    .type-badge {
      display: inline-block; padding: 4px 12px; background: rgba(33,150,243,0.1);
      border: 1px solid rgba(33,150,243,0.3); color: #2196F3; border-radius: 4px;
      font-size: 12px; font-weight: 700; text-transform: uppercase;
    }

    .event-details { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .detail { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #555; }
    .detail svg { color: #764ba2; }

    .event-description { color: #666; line-height: 1.6; font-size: 15px; }

    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }

    h2 { font-size: 22px; font-weight: 800; color: #1a1a2e; margin: 0 0 20px 0; }

    .autofill-section { margin-bottom: 24px; }
    .btn-autofill {
      display: flex; align-items: center; gap: 6px; padding: 10px 16px;
      background: rgba(103,126,234,0.1); border: 1px solid rgba(103,126,234,0.3);
      color: #667eea; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;
      transition: all 0.2s;
    }
    .btn-autofill:hover { background: rgba(103,126,234,0.2); }

    .autofill-box { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; align-items: center; }
    .autofill-box input {
      flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px;
    }
    .autofill-box input:focus { outline: none; border-color: #667eea; }
    .autofill-box button {
      padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px;
      cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px;
    }
    .autofill-box button:disabled { opacity: 0.6; }
    .autofill-error { width: 100%; margin: 4px 0 0 0; color: #f44336; font-size: 13px; }
    .autofill-success { width: 100%; margin: 4px 0 0 0; color: #4CAF50; font-size: 13px; }

    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #333; }
    .form-group input {
      width: 100%; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 15px; transition: border-color 0.2s;
    }
    .form-group input:focus { outline: none; border-color: #667eea; }

    .contracts-notice {
      display: flex; align-items: center; gap: 8px; padding: 14px 16px;
      background: rgba(255,152,0,0.1); border: 1px solid rgba(255,152,0,0.3);
      border-radius: 8px; color: #e65100; font-size: 14px; margin-bottom: 24px;
    }

    .btn-submit {
      width: 100%; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.2s;
    }
    .btn-submit:hover { opacity: 0.9; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .contracts-section { text-align: left; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; }
    .contracts-section h3 { margin: 0 0 8px 0; font-size: 18px; color: #333; }
    .contracts-hint { margin: 0 0 16px 0; color: #666; font-size: 14px; }
    .contracts-links { display: flex; flex-direction: column; gap: 8px; }
    .contract-link {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      background: rgba(103,126,234,0.05); border: 1px solid rgba(103,126,234,0.2);
      border-radius: 8px; color: #667eea; text-decoration: none; font-weight: 600;
      font-size: 15px; transition: all 0.2s;
    }
    .contract-link:hover { background: rgba(103,126,234,0.1); }

    @media (max-width: 600px) {
      .public-page { padding: 12px; align-items: flex-start; }
      .card { padding: 24px 20px; border-radius: 12px; }
      .event-header h1 { font-size: 22px; }
      .event-details { gap: 12px; }
    }
  `}</style>
);
