import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Search, Users, Edit2, Check, X } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface Template {
  id: number;
  title: string;
  nickname: string | null;
}

interface Submission {
  id: number;
  template_id: number;
  template_title: string;
  template_nickname: string | null;
  invite_code: string;
  filled_fields: Record<string, any> | string;
  signer_saved_fields?: Record<string, any> | string | null;
  status: string;
  created_at: string;
  contract_number?: string | null;
}

export default function AdminContractSubmissions() {
  const location = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Edit number state: submissionId -> current edit value
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadSubmissions(); }, [selectedTemplate]);

  const loadData = async () => {
    try {
      const { data } = await api.get('/contracts/templates');
      setTemplates(data.templates || []);
      loadSubmissions();
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      let endpoint = '/contracts/submissions?';
      if (selectedTemplate) endpoint += `template_id=${selectedTemplate}&`;
      const { data } = await api.get(endpoint);
      setSubmissions(data.submissions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setLoading(false);
    }
  };

  const getSignerInfo = (submission: Submission) => {
    try {
      // Prefer signer_saved_fields (from contract_signers table - more reliable)
      const signerFields = submission.signer_saved_fields
        ? (typeof submission.signer_saved_fields === 'string'
            ? JSON.parse(submission.signer_saved_fields || '{}')
            : (submission.signer_saved_fields || {}))
        : null;

      const filledFields = typeof submission.filled_fields === 'string'
        ? JSON.parse(submission.filled_fields || '{}')
        : (submission.filled_fields || {});

      // Try signer saved fields first (they're stored with standard keys)
      if (signerFields && Object.keys(signerFields).length > 0) {
        const sfKeys = Object.keys(signerFields);
        const emailKey = sfKeys.find(k => /email/i.test(k) && signerFields[k]);
        const phoneKey = sfKeys.find(k => /(telefon|phone)/i.test(k) && signerFields[k]);
        const nameFromSigner = extractName(signerFields);
        if (nameFromSigner !== '-') {
          return {
            name: nameFromSigner,
            email: emailKey ? signerFields[emailKey] : extractEmail(filledFields),
            phone: phoneKey ? signerFields[phoneKey] : extractPhone(filledFields),
          };
        }
      }

      // Fall back to filled_fields
      return {
        name: extractName(filledFields),
        email: extractEmail(filledFields),
        phone: extractPhone(filledFields),
      };
    } catch {
      return { name: '-', email: '-', phone: '-' };
    }
  };

  const extractName = (fields: Record<string, any>): string => {
    const keys = Object.keys(fields);
    const numeCompletKey = keys.find(k => /complet/i.test(k) && fields[k]);
    if (numeCompletKey) return fields[numeCompletKey];
    if (fields.name) return fields.name;
    const prenumeKey = keys.find(k => /prenume/i.test(k) && fields[k]);
    const numeKey = keys.find(k => /^nume/i.test(k) && !/prenume|tata/i.test(k) && fields[k]);
    if (numeKey) return prenumeKey ? `${fields[prenumeKey]} ${fields[numeKey]}` : fields[numeKey];
    const anyKey = keys.find(k => (k.toLowerCase().includes('nume') || k.toLowerCase().includes('name')) && fields[k]);
    return anyKey ? fields[anyKey] : '-';
  };

  const extractEmail = (fields: Record<string, any>): string => {
    const keys = Object.keys(fields);
    const emailKey = keys.find(k => /email/i.test(k) && fields[k]);
    return emailKey ? fields[emailKey] : '-';
  };

  const extractPhone = (fields: Record<string, any>): string => {
    const keys = Object.keys(fields);
    const phoneKey = keys.find(k => /(telefon|phone)/i.test(k) && fields[k]);
    return phoneKey ? fields[phoneKey] : '-';
  };

  const startEdit = (s: Submission) => {
    setEditingId(s.id);
    setEditValue(s.contract_number || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveNumber = async (id: number) => {
    setSavingId(id);
    try {
      await api.put(`/contracts/submissions/${id}`, { contract_number: editValue.trim() || null });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, contract_number: editValue.trim() || null } : s));
      setEditingId(null);
    } catch (error) {
      console.error('Error saving number:', error);
      alert('Eroare la salvare');
    } finally {
      setSavingId(null);
    }
  };

  const filtered = submissions.filter(s => {
    if (!search) return true;
    const info = getSignerInfo(s);
    const q = search.toLowerCase();
    return (
      info.name.toLowerCase().includes(q) ||
      info.email.toLowerCase().includes(q) ||
      (s.template_title || '').toLowerCase().includes(q) ||
      (s.contract_number || '').toLowerCase().includes(q)
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
    const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(s => s.id)));
  };

  const exportCSV = () => {
    const targets = selectedIds.size > 0 ? filtered.filter(s => selectedIds.has(s.id)) : filtered;
    const rows = [['Nr. ordine', 'Semnatar', 'Email', 'Telefon', 'Contract', 'Status', 'Data semnare']];
    targets.forEach((s, idx) => {
      const info = getSignerInfo(s);
      rows.push([
        s.contract_number || `#${idx + 1}`,
        info.name,
        info.email,
        info.phone,
        s.template_nickname || s.template_title || '',
        s.status || '',
        new Date(s.created_at).toLocaleDateString('ro-RO'),
      ]);
    });
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contracte_semnate.csv';
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
        <h1>Contracte Semnate</h1>
        <p className="subtitle">Vizualizeaza toate contractele semnate, grupate pe template</p>

        <div className="admin-layout">
          <div className="sidebar">
            <button className={`sidebar-item ${selectedTemplate === null ? 'active' : ''}`} onClick={() => setSelectedTemplate(null)}>
              <FileText size={16} />
              <div className="sidebar-item-info">
                <span className="sidebar-item-title">Toate contractele</span>
                <span className="sidebar-item-count">{submissions.length} semnaturi</span>
              </div>
            </button>
            {templates.map(t => (
              <button key={t.id} className={`sidebar-item ${selectedTemplate === t.id ? 'active' : ''}`} onClick={() => setSelectedTemplate(t.id)}>
                <FileText size={16} />
                <div className="sidebar-item-info">
                  <span className="sidebar-item-title">{t.nickname || t.title}</span>
                  <span className="sidebar-item-count">{t.title !== (t.nickname || t.title) ? t.title : ''}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="main-content">
            <div className="search-export-row">
              <div className="search-bar">
                <Search size={16} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cauta dupa nume, email, nr. contract..." />
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
                <h3>Nicio semnatura</h3>
                <p>{selectedTemplate ? 'Nicio semnatura pentru acest contract' : 'Inca nu exista semnaturi'}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input type="checkbox" checked={filtered.length > 0 && filtered.every(s => selectedIds.has(s.id))} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th>Nr.</th>
                      <th>Semnatar</th>
                      <th>Email</th>
                      <th>Telefon</th>
                      {!selectedTemplate && <th>Contract</th>}
                      <th>Status</th>
                      <th>Data semnare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, idx) => {
                      const info = getSignerInfo(s);
                      const isEditing = editingId === s.id;
                      return (
                        <tr key={s.id} className={selectedIds.has(s.id) ? 'row-selected' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="number-edit-row">
                                <input
                                  className="number-input"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveNumber(s.id); if (e.key === 'Escape') cancelEdit(); }}
                                  autoFocus
                                  placeholder="ex: 001"
                                />
                                <button className="icon-btn icon-btn-save" onClick={() => saveNumber(s.id)} disabled={savingId === s.id} title="Salveaza">
                                  <Check size={14} />
                                </button>
                                <button className="icon-btn icon-btn-cancel" onClick={cancelEdit} title="Anuleaza">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="number-display-row">
                                <span className="contract-num">{s.contract_number || `#${idx + 1}`}</span>
                                <button className="icon-btn icon-btn-edit" onClick={() => startEdit(s)} title="Editeaza numarul">
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td><strong>{info.name}</strong></td>
                          <td>{info.email}</td>
                          <td>{info.phone}</td>
                          {!selectedTemplate && (
                            <td>
                              <span className="template-badge">{s.template_title}</span>
                              {s.template_nickname && <div className="nickname-sub">{s.template_nickname}</div>}
                            </td>
                          )}
                          <td>
                            <span className={`status-badge ${s.status?.toLowerCase()}`}>
                              {s.status?.toLowerCase() === 'signed' ? 'SIGNED' : s.status}
                            </span>
                          </td>
                          <td>{new Date(s.created_at).toLocaleDateString('ro-RO')}</td>
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
          .sidebar-item-info { display: flex; flex-direction: column; }
          .sidebar-item-title { font-weight: 700; font-size: 14px; }
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
          td { padding: 12px 16px; border-bottom: 1px solid var(--card-border); font-size: 14px; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          tbody tr:hover { background: var(--hover-bg); }

          .number-display-row { display: flex; align-items: center; gap: 6px; }
          .contract-num { font-family: monospace; font-weight: 700; color: #667eea; }
          .number-edit-row { display: flex; align-items: center; gap: 4px; }
          .number-input { width: 80px; padding: 4px 8px; border: 1px solid #667eea; border-radius: 6px; background: var(--card-bg); color: var(--text-primary); font-size: 13px; font-family: monospace; outline: none; }

          .icon-btn { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; border: none; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
          .icon-btn-edit { background: transparent; color: var(--text-tertiary); opacity: 0; }
          tr:hover .icon-btn-edit { opacity: 1; }
          .icon-btn-edit:hover { background: var(--hover-bg); color: #667eea; }
          .icon-btn-save { background: rgba(76,175,80,0.1); color: #4CAF50; }
          .icon-btn-save:hover { background: rgba(76,175,80,0.2); }
          .icon-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
          .icon-btn-cancel { background: rgba(244,67,54,0.08); color: #f44336; }
          .icon-btn-cancel:hover { background: rgba(244,67,54,0.15); }

          .template-badge { padding: 4px 10px; background: rgba(33,150,243,0.1); border: 1px solid rgba(33,150,243,0.3); color: #2196F3; border-radius: 4px; font-size: 11px; font-weight: 700; }
          .nickname-sub { font-size: 11px; color: var(--text-tertiary); margin-top: 3px; }
          .status-badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .status-badge.completed, .status-badge.signed { background: rgba(76,175,80,0.1); color: #4CAF50; }
          .status-badge.pending { background: rgba(255,152,0,0.1); color: #FF9800; }

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
