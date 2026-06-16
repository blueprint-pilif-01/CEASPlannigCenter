import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileText, Search, Filter } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api, { API_BASE_URL } from '../../utils/api';

interface Submission {
  id: number;
  template_id: number;
  template_title: string;
  template_nickname: string | null;
  invite_code: string;
  filled_fields: any;
  status: string;
  created_at: string;
  signed_at: string;
  ip_address: string;
  contract_number?: string;
}

export default function ContractSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data } = await api.get('/contracts/submissions');
      setSubmissions(data.submissions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setLoading(false);
    }
  };

  const downloadPdf = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/contracts/submissions/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Eroare la descarcarea PDF-ului');
    }
  };

  const downloadSignature = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/contracts/submissions/${id}/signature`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `semnatura_${id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Eroare la descarcarea semnaturii');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fields = s.filled_fields || {};
    return (
      s.template_title?.toLowerCase().includes(searchLower) ||
      fields.nume?.toLowerCase().includes(searchLower) ||
      fields.prenume?.toLowerCase().includes(searchLower) ||
      s.invite_code?.toLowerCase().includes(searchLower)
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
      <main className="submissions-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/planner/contracts')}>
            <ArrowLeft size={20} />
            Inapoi
          </button>
          <h1>Semnari Contracte</h1>
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Cauta dupa nume, contract..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h2>{search ? 'Niciun rezultat' : 'Nicio semnare'}</h2>
            <p>{search ? 'Incearca cu alti termeni' : 'Semanarile vor aparea aici dupa ce cineva completeaza un contract'}</p>
          </div>
        ) : (
          <div className="submissions-table">
            <table>
              <thead>
                <tr>
                  <th>Nr. Contract</th>
                  <th>Semnatar</th>
                  <th>CNP</th>
                  <th>Contract</th>
                  <th>Cod Link</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(submission => {
                  const fields = submission.filled_fields || {};
                  const name = [fields.nume, fields.prenume].filter(Boolean).join(' ') || 
                               fields.subsemnatul || 'Anonim';
                  
                  return (
                    <tr key={submission.id}>
                      <td className="id-cell">{submission.contract_number || `#${submission.id}`}</td>
                      <td className="name-cell">{name}</td>
                      <td className="cnp-cell">{fields.cnp_masked || fields.cnp || '-'}</td>
                      <td>
                        <div>{submission.template_title}</div>
                        {submission.template_nickname && <div className="nickname-sub">{submission.template_nickname}</div>}
                      </td>
                      <td className="code-cell">{submission.invite_code}</td>
                      <td>
                        <span className={`status-badge ${submission.status?.toLowerCase()}`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(submission.signed_at || submission.created_at).toLocaleDateString('ro-RO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="actions-cell">
                        <button className="btn-action" onClick={() => downloadPdf(submission.id)} title="Descarca PDF">
                          <Download size={16} />
                          PDF
                        </button>
                        <button className="btn-action" onClick={() => downloadSignature(submission.id)} title="Descarca Semnatura">
                          <FileText size={16} />
                          Semn.
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <style>{`
          body {
            background: var(--bg-primary);
            padding-top: 80px;
          }

          .submissions-page {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 24px;
          }

          .page-header {
            display: flex;
            align-items: center;
            gap: 20px;
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
            flex: 1;
            font-size: 28px;
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            min-width: 300px;
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

          .submissions-table {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            overflow: hidden;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 14px 16px;
            text-align: left;
            border-bottom: 1px solid var(--card-border);
          }

          th {
            background: var(--bg-secondary);
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            color: var(--text-tertiary);
          }

          tr:last-child td {
            border-bottom: none;
          }

          tr:hover {
            background: var(--hover-bg);
          }

          .id-cell {
            font-family: monospace;
            color: var(--text-tertiary);
          }

          .name-cell {
            font-weight: 600;
          }

          .cnp-cell, .code-cell {
            font-family: monospace;
            font-size: 13px;
          }

          .nickname-sub {
            font-size: 11px;
            color: var(--text-tertiary);
            margin-top: 2px;
          }

          .date-cell {
            font-size: 13px;
            color: var(--text-secondary);
          }

          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .status-badge.signed {
            background: rgba(76,175,80,0.1);
            color: #4CAF50;
          }

          .status-badge.draft {
            background: rgba(255,193,7,0.1);
            color: #FFC107;
          }

          .actions-cell {
            display: flex;
            gap: 8px;
          }

          .btn-action {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          }

          .btn-action:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }

          @media (max-width: 1024px) {
            .submissions-table {
              overflow-x: auto;
            }
            table {
              min-width: 800px;
            }
          }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .submissions-page { padding: 24px 16px; }
            .page-header { flex-wrap: wrap; }
            .page-header h1 { width: 100%; order: 1; margin-top: 12px; }
            .search-box { width: 100%; order: 2; min-width: auto; }
          }
        `}</style>
      </main>
    </>
  );
}
