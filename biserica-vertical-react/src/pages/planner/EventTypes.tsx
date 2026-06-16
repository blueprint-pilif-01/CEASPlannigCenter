import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, MessageCircle, FolderTree } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface EventType {
  id: number;
  name: string;
  description: string | null;
  whatsapp_group_link: string | null;
  whatsapp_group_name: string | null;
  parent_type_id: number | null;
  parent_name: string | null;
  sort_order: number;
  is_active: boolean;
  events_count: number;
}

export default function EventTypes() {
  const [types, setTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWhatsappLink, setFormWhatsappLink] = useState('');
  const [formWhatsappName, setFormWhatsappName] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');

  useEffect(() => { loadTypes(); }, []);

  const loadTypes = async () => {
    try {
      const { data } = await api.get('/events/types');
      setTypes(data.types || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading types:', error);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormWhatsappLink('');
    setFormWhatsappName(''); setFormParentId(''); setFormSortOrder('0');
  };

  const startEdit = (type: EventType) => {
    setEditingId(type.id);
    setFormName(type.name);
    setFormDescription(type.description || '');
    setFormWhatsappLink(type.whatsapp_group_link || '');
    setFormWhatsappName(type.whatsapp_group_name || '');
    setFormParentId(type.parent_type_id ? String(type.parent_type_id) : '');
    setFormSortOrder(String(type.sort_order));
    setShowCreate(false);
  };

  const startCreate = (parentId?: number) => {
    resetForm();
    if (parentId) setFormParentId(String(parentId));
    setShowCreate(true);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formName.trim()) { alert('Numele este obligatoriu'); return; }
    try {
      const body = {
        name: formName.trim(),
        description: formDescription || null,
        whatsapp_group_link: formWhatsappLink || null,
        whatsapp_group_name: formWhatsappName || null,
        parent_type_id: formParentId ? parseInt(formParentId) : null,
        sort_order: parseInt(formSortOrder) || 0
      };

      if (editingId) {
        await api.put(`/events/types/${editingId}`, body);
      } else {
        await api.post('/events/types', body);
      }
      cancelEdit();
      loadTypes();
    } catch (error) {
      console.error('Error saving type:', error);
      alert('Eroare la salvare');
    }
  };

  const deleteType = async (id: number) => {
    if (!confirm('Sigur vrei sa stergi acest tip de eveniment?')) return;
    try {
      await api.delete(`/events/types/${id}`);
      loadTypes();
    } catch (error: any) {
      alert(error?.message || 'Nu poti sterge un tip cu evenimente asociate');
    }
  };

  // Separate parent types and subgroups
  const parentTypes = types.filter(t => !t.parent_type_id);
  const getSubgroups = (parentId: number) => types.filter(t => t.parent_type_id === parentId);

  if (loading) {
    return (<><PlannerNav /><LoadingSpinner fullScreen /></>);
  }

  const renderForm = () => (
    <div className="type-form">
      <div className="form-row">
        <div className="form-group">
          <label>Nume *</label>
          <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Numele tipului" />
        </div>
        <div className="form-group">
          <label>Ordine</label>
          <input type="number" value={formSortOrder} onChange={e => setFormSortOrder(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Descriere</label>
        <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descriere optionala" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Nume Grup WhatsApp</label>
          <input type="text" value={formWhatsappName} onChange={e => setFormWhatsappName(e.target.value)} placeholder="Ex: CEAS - Anunturi Tip 1" />
        </div>
        <div className="form-group">
          <label>Link Grup WhatsApp</label>
          <input type="text" value={formWhatsappLink} onChange={e => setFormWhatsappLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
        </div>
      </div>
      {!formParentId && (
        <div className="form-group">
          <label>Grup Parinte (optional - pentru subgrupuri)</label>
          <select value={formParentId} onChange={e => setFormParentId(e.target.value)}>
            <option value="">Niciun parinte (tip principal)</option>
            {parentTypes.filter(t => t.id !== editingId).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="form-actions">
        <button className="btn-save" onClick={handleSave}><Save size={16} /> Salveaza</button>
        <button className="btn-cancel" onClick={cancelEdit}><X size={16} /> Anuleaza</button>
      </div>
    </div>
  );

  return (
    <>
      <PlannerNav />
      <main className="event-types-page">
        <div className="page-header">
          <div>
            <button className="btn-back" onClick={() => navigate('/planner/events')}>
              <ArrowLeft size={20} /> Inapoi la Evenimente
            </button>
            <h1>Tipuri Evenimente</h1>
            <p>Configureaza tipurile de evenimente si asocierea cu grupurile WhatsApp</p>
          </div>
          <button className="btn-primary" onClick={() => startCreate()}>
            <Plus size={16} /> Adauga Tip
          </button>
        </div>

        {showCreate && renderForm()}

        <div className="types-list">
          {parentTypes.map(type => (
            <div key={type.id} className="type-group">
              <div className="type-card">
                <div className="type-info">
                  <h3>{type.name}</h3>
                  {type.description && <p className="type-desc">{type.description}</p>}
                  <div className="type-meta">
                    {type.whatsapp_group_name && (
                      <span className="meta-item"><MessageCircle size={14} /> {type.whatsapp_group_name}</span>
                    )}
                    <span className="meta-item">{type.events_count} evenimente</span>
                  </div>
                </div>
                <div className="type-actions">
                  <button className="btn-sub" onClick={() => startCreate(type.id)} title="Adauga sub-grup">
                    <FolderTree size={14} /> Sub-grup
                  </button>
                  <button className="btn-edit" onClick={() => startEdit(type)} title="Editeaza">
                    <Edit size={14} />
                  </button>
                  <button className="btn-delete" onClick={() => deleteType(type.id)} title="Sterge">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {editingId === type.id && renderForm()}

              {getSubgroups(type.id).map(sub => (
                <div key={sub.id} className="type-card subgroup">
                  <div className="type-info">
                    <h3>{sub.name}</h3>
                    {sub.description && <p className="type-desc">{sub.description}</p>}
                    <div className="type-meta">
                      {sub.whatsapp_group_name && (
                        <span className="meta-item"><MessageCircle size={14} /> {sub.whatsapp_group_name}</span>
                      )}
                      <span className="meta-item">{sub.events_count} evenimente</span>
                    </div>
                  </div>
                  <div className="type-actions">
                    <button className="btn-edit" onClick={() => startEdit(sub)}><Edit size={14} /></button>
                    <button className="btn-delete" onClick={() => deleteType(sub.id)}><Trash2 size={14} /></button>
                  </div>
                  {editingId === sub.id && renderForm()}
                </div>
              ))}
            </div>
          ))}

          {types.length === 0 && (
            <div className="empty-state">
              <FolderTree size={48} />
              <h3>Niciun tip de eveniment</h3>
              <p>Adauga tipuri de eveniment pentru a incepe</p>
            </div>
          )}
        </div>

        <style>{`
          body { background: var(--bg-primary); padding-top: 80px; }
          .event-types-page { max-width: 900px; margin: 0 auto; padding: 40px 24px; }

          .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; gap: 20px; }
          .page-header h1 { margin: 12px 0 8px 0; font-size: 28px; font-weight: 900; }
          .page-header p { margin: 0; color: var(--text-tertiary); }
          .btn-back { display: flex; align-items: center; gap: 6px; padding: 0; background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-weight: 600; font-size: 14px; }
          .btn-back:hover { color: var(--text-primary); }
          .btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; }
          .btn-primary:hover { background: #45a049; }

          .type-form {
            background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px;
            padding: 24px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 16px;
          }
          .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .form-group { display: flex; flex-direction: column; gap: 6px; }
          .form-group label { font-weight: 600; font-size: 14px; color: var(--text-secondary); }
          .form-group input, .form-group select {
            padding: 10px 14px; border: 1px solid var(--border-primary); border-radius: 8px;
            background: var(--card-bg); color: var(--text-primary); font-size: 14px;
          }
          .form-group input:focus, .form-group select:focus { outline: none; border-color: #4CAF50; }
          .form-actions { display: flex; gap: 12px; }
          .btn-save { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
          .btn-cancel { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: var(--card-bg); border: 1px solid var(--border-primary); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-weight: 600; }

          .types-list { display: flex; flex-direction: column; gap: 12px; }
          .type-group { display: flex; flex-direction: column; gap: 4px; }
          .type-card {
            display: flex; justify-content: space-between; align-items: center; gap: 16px;
            background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px;
            transition: all 0.2s;
          }
          .type-card:hover { border-color: var(--border-primary); }
          .type-card.subgroup { margin-left: 32px; border-left: 3px solid rgba(33,150,243,0.3); }
          .type-info h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: 700; }
          .type-desc { margin: 0 0 8px 0; font-size: 13px; color: var(--text-tertiary); }
          .type-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-tertiary); }
          .meta-item { display: flex; align-items: center; gap: 4px; }

          .type-actions { display: flex; gap: 8px; flex-shrink: 0; }
          .btn-sub, .btn-edit, .btn-delete {
            display: flex; align-items: center; gap: 4px; padding: 8px 12px;
            background: var(--card-bg); border: 1px solid var(--border-primary); color: var(--text-secondary);
            border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;
          }
          .btn-sub:hover { background: rgba(33,150,243,0.1); border-color: rgba(33,150,243,0.3); color: #2196F3; }
          .btn-edit:hover { background: var(--hover-bg); color: var(--text-primary); }
          .btn-delete:hover { background: rgba(244,67,54,0.1); border-color: rgba(244,67,54,0.3); color: #f44336; }

          .empty-state { text-align: center; padding: 60px 20px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; }
          .empty-state svg { color: var(--text-tertiary); margin-bottom: 16px; }
          .empty-state h3 { margin: 0 0 8px 0; }
          .empty-state p { margin: 0; color: var(--text-tertiary); }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .event-types-page { padding: 24px 16px; }
            .page-header { flex-direction: column; }
            .form-row { grid-template-columns: 1fr; }
            .type-card { flex-direction: column; align-items: flex-start; }
            .type-card.subgroup { margin-left: 16px; }
          }
        `}</style>
      </main>
    </>
  );
}
