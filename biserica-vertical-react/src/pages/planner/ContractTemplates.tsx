import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Edit, Trash2, Copy, ExternalLink, Users, Send } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface Template {
  id: number;
  title: string;
  nickname: string | null;
  raw_text: string;
  fields: any[];
  signature_blocks: any[];
  invites_count: number;
  submissions_count: number;
  created_at: string;
  updated_at: string;
}

export default function ContractTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await api.get('/contracts/templates');
      setTemplates(data.templates || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading templates:', error);
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('Sigur vrei sa stergi acest contract?')) return;
    
    try {
      await api.delete(`/contracts/templates/${id}`);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Eroare la stergere');
    }
  };

  const duplicateTemplate = async (id: number) => {
    try {
      const { data } = await api.post(`/contracts/templates/${id}/duplicate`);
      navigate(`/planner/contracts/${data.template.id}`);
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Eroare la duplicare');
    }
  };

  const generateLink = async (templateId: number) => {
    try {
      const { data } = await api.post(`/contracts/templates/${templateId}/invites`);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(data.publicUrl);
      alert(`Link copiat in clipboard!\n\nLink: ${data.publicUrl}\nCod: ${data.code}`);
      
      loadTemplates();
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Eroare la generare link');
    }
  };

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
      <main className="contracts-page">
        <div className="page-header">
          <div>
            <h1>Contracte</h1>
            <p>Gestioneaza sabloanele de contracte pentru semnare</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate('/planner/contracts/submissions')}>
              <FileText size={16} />
              Semnari
            </button>
            <button className="btn-secondary" onClick={() => navigate('/planner/contracts/signers')}>
              <Users size={16} />
              Semnatari
            </button>
            <button className="btn-primary" onClick={() => navigate('/planner/contracts/new')}>
              <Plus size={16} />
              Contract nou
            </button>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h2>Niciun contract</h2>
            <p>Creeaza primul contract pentru a incepe</p>
            <button className="btn-primary" onClick={() => navigate('/planner/contracts/new')}>
              <Plus size={16} />
              Creeaza contract
            </button>
          </div>
        ) : (
          <div className="templates-grid">
            {templates.map(template => (
              <div key={template.id} className="template-card">
                <div className="card-header">
                  <FileText size={24} className="card-icon" />
                  <div>
                    <h3>{template.title}</h3>
                    {template.nickname && <span className="card-nickname">{template.nickname}</span>}
                  </div>
                </div>
                
                <div className="card-stats">
                  <div className="stat">
                    <span className="stat-value">{template.invites_count}</span>
                    <span className="stat-label">Link-uri</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{template.submissions_count}</span>
                    <span className="stat-label">Semnari</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{(template.fields || []).length}</span>
                    <span className="stat-label">Campuri</span>
                  </div>
                </div>

                <div className="card-preview">
                  {template.raw_text.substring(0, 150)}...
                </div>

                <div className="card-actions">
                  <button className="btn-action primary" onClick={() => generateLink(template.id)} title="Genereaza link si copiaza">
                    <Send size={16} />
                    Genereaza Link
                  </button>
                  <button className="btn-action" onClick={() => duplicateTemplate(template.id)} title="Duplica">
                    <Copy size={16} />
                  </button>
                  <button className="btn-action" onClick={() => navigate(`/planner/contracts/${template.id}`)} title="Editeaza">
                    <Edit size={16} />
                  </button>
                  <button className="btn-action danger" onClick={() => deleteTemplate(template.id)} title="Sterge">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <style>{`
          body {
            background: var(--bg-primary);
            padding-top: 80px;
          }

          .contracts-page {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 24px;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            gap: 20px;
          }

          .page-header h1 {
            margin: 0 0 8px 0;
            font-size: 32px;
            font-weight: 900;
          }

          .page-header p {
            margin: 0;
            color: var(--text-tertiary);
          }

          .header-actions {
            display: flex;
            gap: 12px;
          }

          .btn-primary, .btn-secondary {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .btn-primary {
            background: #4CAF50;
            color: white;
          }

          .btn-primary:hover {
            background: #45a049;
          }

          .btn-secondary {
            background: var(--card-bg);
            border: 1px solid var(--border-primary);
            color: var(--text-primary);
          }

          .btn-secondary:hover {
            background: var(--hover-bg);
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
            margin: 0 0 24px 0;
            color: var(--text-tertiary);
          }

          .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 20px;
          }

          .template-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 24px;
            transition: all 0.2s;
          }

          .template-card:hover {
            border-color: var(--border-primary);
          }

          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }

          .card-icon {
            color: #2196F3;
          }

          .card-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
          }

          .card-nickname {
            display: block;
            font-size: 12px;
            color: var(--text-tertiary);
            margin-top: 2px;
          }

          .card-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 16px;
            padding: 12px;
            background: var(--bg-secondary);
            border-radius: 8px;
          }

          .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 800;
            color: var(--text-primary);
          }

          .stat-label {
            font-size: 12px;
            color: var(--text-tertiary);
          }

          .card-preview {
            font-size: 13px;
            color: var(--text-tertiary);
            line-height: 1.5;
            margin-bottom: 16px;
            padding: 12px;
            background: var(--bg-secondary);
            border-radius: 8px;
            max-height: 80px;
            overflow: hidden;
          }

          .card-actions {
            display: flex;
            gap: 8px;
          }

          .btn-action {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 16px;
            background: var(--card-bg);
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-action:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }

          .btn-action.primary {
            flex: 1;
            background: rgba(33,150,243,0.1);
            border-color: rgba(33,150,243,0.3);
            color: #2196F3;
          }

          .btn-action.primary:hover {
            background: rgba(33,150,243,0.2);
          }

          .btn-action.danger:hover {
            background: rgba(244,67,54,0.1);
            border-color: rgba(244,67,54,0.3);
            color: #f44336;
          }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .contracts-page { padding: 24px 16px; }
            .page-header { flex-direction: column; }
            .header-actions { flex-wrap: wrap; }
            .templates-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </main>
    </>
  );
}
