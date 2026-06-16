import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, RefreshCw, Trash2, Search } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface Signer {
  id: number;
  signer_code: string;
  saved_fields: any;
  submissions_count: number;
  created_at: string;
  updated_at: string;
}

export default function ContractSigners() {
  const [signers, setSigners] = useState<Signer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSigners();
  }, []);

  const loadSigners = async () => {
    try {
      const { data } = await api.get('/contracts/signers');
      setSigners(data.signers || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading signers:', error);
      setLoading(false);
    }
  };

  const regenerateCode = async (id: number) => {
    if (!confirm('Sigur vrei sa regenerezi codul? Codul vechi nu va mai functiona.')) return;
    
    try {
      const { data } = await api.post(`/contracts/signers/${id}/regenerate-code`);
      alert(`Cod nou: ${data.signer_code}`);
      loadSigners();
    } catch (error) {
      console.error('Error regenerating code:', error);
      alert('Eroare la regenerare');
    }
  };

  const deleteSigner = async (id: number) => {
    if (!confirm('Sigur vrei sa stergi datele acestui semnatar? Aceasta actiune este ireversibila (GDPR).')) return;
    
    try {
      await api.delete(`/contracts/signers/${id}`);
      loadSigners();
    } catch (error) {
      console.error('Error deleting signer:', error);
      alert('Eroare la stergere');
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    alert('Cod copiat!');
  };

  const filteredSigners = signers.filter(s => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fields = s.saved_fields || {};
    return (
      s.signer_code?.toLowerCase().includes(searchLower) ||
      fields.nume?.toLowerCase().includes(searchLower) ||
      fields.prenume?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
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
      <main className="signers-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/planner/contracts')}>
            <ArrowLeft size={20} />
            Inapoi
          </button>
          <h1>Semnatari</h1>
          <p className="header-description">Persoanele care au semnat si au codul pentru autocompletare</p>
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Cauta dupa nume, cod..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredSigners.length === 0 ? (
          <div className="empty-state">
            <Users size={64} />
            <h2>{search ? 'Niciun rezultat' : 'Niciun semnatar'}</h2>
            <p>{search ? 'Incearca cu alti termeni' : 'Semnatarii vor aparea aici dupa ce completeaza un contract'}</p>
          </div>
        ) : (
          <div className="signers-grid">
            {filteredSigners.map(signer => {
              const fields = signer.saved_fields || {};
              const name = [fields.nume, fields.prenume].filter(Boolean).join(' ') || 'Anonim';
              
              return (
                <div key={signer.id} className="signer-card">
                  <div className="card-header">
                    <div className="avatar">{name.charAt(0).toUpperCase()}</div>
                    <div className="card-info">
                      <h3>{name}</h3>
                      <p className="cnp">{fields.cnp || '-'}</p>
                    </div>
                  </div>

                  <div className="code-section">
                    <label>Cod autocompletare</label>
                    <div className="code-box">
                      <span className="code">{signer.signer_code}</span>
                      <button className="btn-icon" onClick={() => copyCode(signer.signer_code)} title="Copiaza">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="stats">
                    <div className="stat">
                      <span className="stat-value">{signer.submissions_count}</span>
                      <span className="stat-label">Semnari</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">
                        {new Date(signer.updated_at).toLocaleDateString('ro-RO', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </span>
                      <span className="stat-label">Ultima activitate</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button className="btn-action" onClick={() => regenerateCode(signer.id)} title="Regenereaza cod">
                      <RefreshCw size={16} />
                      Regenereaza cod
                    </button>
                    <button className="btn-action danger" onClick={() => deleteSigner(signer.id)} title="Sterge date (GDPR)">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          body {
            background: var(--bg-primary);
            padding-top: 80px;
          }

          .signers-page {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 24px;
          }

          .page-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;
          }

          .btn-back {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: var(--card-bg);
            border: 1px solid var(--border-primary);
            color: var(--text-primary);
            border-radius: 8px;
            cursor: pointer;
          }

          .page-header h1 {
            margin: 0;
            font-size: 28px;
          }

          .header-description {
            flex: 1;
            margin: 0;
            color: var(--text-tertiary);
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            min-width: 280px;
          }

          .search-box svg {
            color: var(--text-tertiary);
          }

          .search-box input {
            flex: 1;
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 15px;
          }

          .search-box input:focus {
            outline: none;
          }

          .empty-state {
            text-align: center;
            padding: 80px 20px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
          }

          .empty-state svg {
            color: var(--text-tertiary);
            margin-bottom: 24px;
          }

          .empty-state h2 {
            margin: 0 0 8px 0;
            color: var(--text-secondary);
          }

          .empty-state p {
            margin: 0;
            color: var(--text-tertiary);
          }

          .signers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 20px;
          }

          .signer-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 24px;
          }

          .card-header {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
          }

          .avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 800;
            color: white;
          }

          .card-info h3 {
            margin: 0 0 4px 0;
            font-size: 18px;
          }

          .card-info .cnp {
            margin: 0;
            font-family: monospace;
            color: var(--text-tertiary);
            font-size: 13px;
          }

          .code-section {
            margin-bottom: 20px;
          }

          .code-section label {
            display: block;
            font-size: 12px;
            color: var(--text-tertiary);
            margin-bottom: 8px;
          }

          .code-box {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: var(--bg-secondary);
            border-radius: 8px;
          }

          .code {
            flex: 1;
            font-family: monospace;
            font-size: 18px;
            font-weight: 700;
            color: #4CAF50;
            letter-spacing: 2px;
          }

          .btn-icon {
            padding: 8px;
            background: transparent;
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 6px;
            cursor: pointer;
          }

          .btn-icon:hover {
            background: var(--hover-bg);
          }

          .stats {
            display: flex;
            gap: 24px;
            margin-bottom: 20px;
            padding: 16px;
            background: var(--bg-secondary);
            border-radius: 8px;
          }

          .stat {
            display: flex;
            flex-direction: column;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 800;
          }

          .stat-label {
            font-size: 12px;
            color: var(--text-tertiary);
          }

          .card-actions {
            display: flex;
            gap: 8px;
          }

          .btn-action {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            justify-content: center;
            padding: 10px 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
          }

          .btn-action:hover {
            background: var(--hover-bg);
          }

          .btn-action.danger {
            flex: none;
            width: 44px;
          }

          .btn-action.danger:hover {
            background: rgba(244,67,54,0.1);
            border-color: rgba(244,67,54,0.3);
            color: #f44336;
          }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .signers-page { padding: 24px 16px; }
            .page-header { flex-direction: column; align-items: stretch; }
            .header-description { display: none; }
            .search-box { min-width: auto; }
            .signers-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </main>
    </>
  );
}
