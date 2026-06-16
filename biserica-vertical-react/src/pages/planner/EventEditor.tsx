import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, MessageCircle, Copy, ExternalLink, Users, FileText, Check } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

interface EventType {
  id: number;
  name: string;
  whatsapp_group_name: string;
  whatsapp_group_link: string;
}

interface ContractTemplate {
  id: number;
  title: string;
  nickname: string | null;
}

interface Registration {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  registered_at: string;
  contracts: {
    contract_title: string;
    contract_nickname: string | null;
    status: string;
  }[];
}

export default function EventEditor() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'registrations'>('details');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypeName, setEventTypeName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('CEAS');
  const [status, setStatus] = useState('draft');
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<number[]>([]);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [customFields, setCustomFields] = useState<Array<{id: string; label: string; type: string; required: boolean; options: string}>>([]);

  // Data
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  // WhatsApp
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadFormData();
  }, [id]);

  const loadFormData = async () => {
    try {
      const [typesRes, templatesRes] = await Promise.all([
        api.get('/events/types'),
        api.get('/contracts/templates')
      ]);
      setEventTypes(typesRes.data.types || []);
      setContractTemplates(templatesRes.data.templates || []);

      if (isEditing) {
        const { data } = await api.get(`/events/${id}`);
        const event = data.event;
        setTitle(event.title || '');
        setDescription(event.description || '');
        setEventTypeName(event.event_type_name || '');
        setDate(event.date ? event.date.split('T')[0] : '');
        setTime(event.time || '');
        setEndTime(event.end_time || '');
        setLocation(event.location || 'CEAS');
        setStatus(event.status || 'draft');
        setRequiresRegistration(event.requires_registration || false);
        setWhatsappMessage(event.whatsapp_message || '');
        setSelectedContracts((event.contracts || []).map((c: any) => c.contract_template_id));
        const cf = event.custom_fields;
        const parsedCf = Array.isArray(cf) ? cf : (typeof cf === 'string' ? JSON.parse(cf || '[]') : []);
        setCustomFields(parsedCf.map((f: any) => ({ ...f, options: Array.isArray(f.options) ? f.options.join('\n') : (f.options || '') })));

        // Load registrations
        const regRes = await api.get(`/events/${id}/registrations`);
        setRegistrations(regRes.data.registrations || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading form data:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !date) {
      alert('Titlul si data sunt obligatorii');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title, description, event_type_name: eventTypeName || null,
        date, time, end_time: endTime, location, status,
        requires_registration: requiresRegistration,
        whatsapp_message: whatsappMessage,
        contract_template_ids: requiresRegistration ? selectedContracts : [],
        custom_fields: customFields.map(f => ({
          ...f,
          options: f.type === 'select' ? f.options.split('\n').map((o: string) => o.trim()).filter(Boolean) : undefined
        }))
      };

      if (isEditing) {
        await api.put(`/events/${id}`, body);
      } else {
        const { data } = await api.post('/events', body);
        navigate(`/planner/events/${data.event.id}`);
        return;
      }
      alert('Eveniment salvat cu succes!');
      loadFormData();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const generateMessage = async () => {
    if (!isEditing) {
      alert('Salveaza evenimentul inainte de a genera mesajul');
      return;
    }
    try {
      const { data } = await api.post(`/events/${id}/whatsapp-message`);
      setGeneratedMessage(data.message);
      setWhatsappLink(data.whatsapp_link);
      setRegistrationUrl(data.registration_url || '');
    } catch (error) {
      console.error('Error generating message:', error);
    }
  };

  const copyMessage = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { id: Date.now().toString(), label: '', type: 'text', required: false, options: '' }]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const updateCustomField = (id: string, patch: Partial<{label: string; type: string; required: boolean; options: string}>) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const toggleContract = (templateId: number) => {
    setSelectedContracts(prev =>
      prev.includes(templateId) ? prev.filter(id => id !== templateId) : [...prev, templateId]
    );
  };

  if (loading) {
    return (<><PlannerNav /><LoadingSpinner fullScreen /></>);
  }

  return (
    <>
      <PlannerNav />
      <main className="event-editor">
        <div className="editor-header">
          <button className="btn-back" onClick={() => navigate('/planner/events')}>
            <ArrowLeft size={20} /> Inapoi
          </button>
          <h1>{isEditing ? 'Editeaza Eveniment' : 'Eveniment Nou'}</h1>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Se salveaza...' : 'Salveaza'}
          </button>
        </div>

        {isEditing && (
          <div className="tabs">
            <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
              Detalii
            </button>
            <button className={`tab ${activeTab === 'registrations' ? 'active' : ''}`} onClick={() => setActiveTab('registrations')}>
              Inscrieri ({registrations.length})
            </button>
          </div>
        )}

        {activeTab === 'details' ? (
          <div className="editor-layout">
            <div className="editor-main">
              <div className="form-group">
                <label>Titlu *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Numele evenimentului" />
              </div>

              <div className="form-group">
                <label>Descriere</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrierea evenimentului" rows={4} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tip Eveniment</label>
                  <input
                    type="text"
                    value={eventTypeName}
                    onChange={e => setEventTypeName(e.target.value)}
                    placeholder="Ex: Slujba, Concerte, etc."
                    list="event-type-list"
                  />
                  <datalist id="event-type-list">
                    {eventTypes.map(t => (<option key={t.id} value={t.name} />))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="draft">Ciorna</option>
                    <option value="published">Publicat</option>
                    <option value="closed">Inchis</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ora incepere</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ora sfarsit</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Locatie</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Locatia evenimentului" />
              </div>

              <div className="form-group">
                <div className="custom-fields-header">
                  <label>Campuri personalizate inscriere</label>
                  <button type="button" className="btn-add-field" onClick={addCustomField}>+ Adauga camp</button>
                </div>
                {customFields.length > 0 && (
                  <div className="custom-fields-list">
                    {customFields.map(cf => (
                      <div key={cf.id} className="custom-field-row">
                        <input
                          type="text"
                          value={cf.label}
                          onChange={e => updateCustomField(cf.id, { label: e.target.value })}
                          placeholder="Eticheta camp (ex: Varsta, Grup)"
                          className="cf-input-label"
                        />
                        <select value={cf.type} onChange={e => updateCustomField(cf.id, { type: e.target.value })} className="cf-select-type">
                          <option value="text">Text</option>
                          <option value="number">Numar</option>
                          <option value="email">Email</option>
                          <option value="phone">Telefon</option>
                          <option value="date">Data</option>
                          <option value="select">Lista optiuni</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <label className="cf-required">
                          <input type="checkbox" checked={cf.required} onChange={e => updateCustomField(cf.id, { required: e.target.checked })} />
                          <span>Obligatoriu</span>
                        </label>
                        <button type="button" className="cf-btn-remove" onClick={() => removeCustomField(cf.id)}>✕</button>
                        {cf.type === 'select' && (
                          <div className="cf-options-wrap">
                            <textarea
                              value={cf.options}
                              onChange={e => updateCustomField(cf.id, { options: e.target.value })}
                              placeholder="O optiune pe linie"
                              rows={3}
                              className="cf-options-textarea"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group toggle-group">
                <label>
                  <input type="checkbox" checked={requiresRegistration} onChange={e => setRequiresRegistration(e.target.checked)} />
                  <span>Necesita inscriere</span>
                </label>
              </div>

              {requiresRegistration && (
                <div className="form-group">
                  <label>Contracte necesare (optional)</label>
                  <p className="form-hint">Daca nu selectezi niciun contract, inscrierea se face fara semnare de documente</p>
                  <div className="contracts-list">
                    {contractTemplates.map(ct => (
                      <label key={ct.id} className={`contract-item ${selectedContracts.includes(ct.id) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={selectedContracts.includes(ct.id)} onChange={() => toggleContract(ct.id)} />
                        <FileText size={16} />
                        <div>
                          <span className="contract-title">{ct.title}</span>
                          {ct.nickname && <span className="contract-nickname">{ct.nickname}</span>}
                        </div>
                        {selectedContracts.includes(ct.id) && <Check size={16} className="check-icon" />}
                      </label>
                    ))}
                    {contractTemplates.length === 0 && (
                      <p className="no-contracts">Niciun contract disponibil. Creeaza un contract mai intai.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="editor-sidebar">
              <div className="sidebar-panel">
                <h3><MessageCircle size={16} /> WhatsApp</h3>
                {isEditing ? (
                  <>
                    <button className="btn-generate" onClick={generateMessage}>
                      Genereaza Mesaj
                    </button>
                    {generatedMessage && (
                      <>
                        <div className="message-preview">{generatedMessage}</div>
                        <div className="message-actions">
                          <button className="btn-copy" onClick={() => copyMessage(generatedMessage)}>
                            {copied ? <><Check size={14} /> Copiat!</> : <><Copy size={14} /> Copiaza Mesaj</>}
                          </button>
                          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                            <ExternalLink size={14} /> Deschide WhatsApp
                          </a>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="panel-hint">Salveaza evenimentul pentru a genera mesajul WhatsApp</p>
                )}
              </div>

              {isEditing && requiresRegistration && (
                <div className="sidebar-panel">
                  <h3>Link Inscriere</h3>
                  {registrationUrl ? (
                    <>
                      <div className="url-box">{registrationUrl}</div>
                      <button className="btn-copy" onClick={() => copyMessage(registrationUrl)}>
                        <Copy size={14} /> Copiaza Link
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-generate" onClick={generateMessage}>
                        Genereaza Link
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="registrations-section">
            {registrations.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>Nicio inscriere</h3>
                <p>Inca nu s-a inscris nimeni la acest eveniment</p>
              </div>
            ) : (
              <div className="registrations-table-wrap">
                <table className="registrations-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nume</th>
                      <th>Email</th>
                      <th>Telefon</th>
                      <th>Contracte</th>
                      <th>Data inscriere</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg, idx) => (
                      <tr key={reg.id}>
                        <td>{idx + 1}</td>
                        <td><strong>{reg.full_name}</strong></td>
                        <td>{reg.email || '-'}</td>
                        <td>{reg.phone || '-'}</td>
                        <td>
                          <div className="contract-statuses">
                            {(reg.contracts || []).map((c, i) => (
                              <span key={i} className={`contract-status ${c.status}`} title={c.contract_title}>
                                {c.status === 'completed' ? <Check size={12} /> : <FileText size={12} />}
                                {c.contract_nickname || c.contract_title}
                              </span>
                            ))}
                            {(!reg.contracts || reg.contracts.length === 0) && '-'}
                          </div>
                        </td>
                        <td>{new Date(reg.registered_at).toLocaleDateString('ro-RO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <style>{`
          body { background: var(--bg-primary); padding-top: 80px; }
          .event-editor { max-width: 1400px; margin: 0 auto; padding: 40px 24px; }

          .editor-header { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
          .editor-header h1 { flex: 1; margin: 0; font-size: 28px; font-weight: 900; }
          .btn-back { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: var(--card-bg); border: 1px solid var(--border-primary); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
          .btn-back:hover { background: var(--hover-bg); }
          .btn-save { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; transition: all 0.2s; }
          .btn-save:hover { background: #45a049; }
          .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

          .tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border-primary); }
          .tab { padding: 12px 24px; border: none; background: none; color: var(--text-tertiary); font-weight: 600; font-size: 15px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
          .tab.active { color: var(--text-primary); border-bottom-color: #4CAF50; }
          .tab:hover { color: var(--text-primary); }

          .editor-layout { display: grid; grid-template-columns: 1fr 380px; gap: 32px; }
          .editor-main { display: flex; flex-direction: column; gap: 20px; }

          .form-group { display: flex; flex-direction: column; gap: 6px; }
          .form-group label { font-weight: 600; font-size: 14px; color: var(--text-secondary); }
          .form-group input, .form-group select, .form-group textarea {
            padding: 12px 16px; border: 1px solid var(--border-primary); border-radius: 8px;
            background: var(--card-bg); color: var(--text-primary); font-size: 15px; transition: border-color 0.2s;
          }
          .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none; border-color: #4CAF50;
          }
          .form-group textarea { resize: vertical; font-family: inherit; }
          .form-hint { margin: 0; font-size: 13px; color: var(--text-tertiary); }

          .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }

          .toggle-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; }
          .toggle-group input[type="checkbox"] { width: 20px; height: 20px; accent-color: #4CAF50; }

          .contracts-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
          .contract-item {
            display: flex; align-items: center; gap: 12px; padding: 12px 16px;
            background: var(--card-bg); border: 1px solid var(--border-primary); border-radius: 8px;
            cursor: pointer; transition: all 0.2s;
          }
          .contract-item:hover { background: var(--hover-bg); }
          .contract-item.selected { border-color: rgba(76,175,80,0.5); background: rgba(76,175,80,0.05); }
          .contract-item input[type="checkbox"] { display: none; }
          .contract-title { font-weight: 600; }
          .contract-nickname { display: block; font-size: 12px; color: var(--text-tertiary); }
          .check-icon { color: #4CAF50; margin-left: auto; }
          .no-contracts { color: var(--text-tertiary); font-style: italic; margin: 0; }

          .editor-sidebar { display: flex; flex-direction: column; gap: 20px; }
          .sidebar-panel {
            background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px;
          }
          .sidebar-panel h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
          .panel-value { margin: 0; font-weight: 600; font-size: 15px; }
          .panel-detail { margin: 8px 0 0 0; font-size: 13px; color: var(--text-tertiary); display: flex; align-items: center; gap: 6px; }
          .panel-hint { margin: 0; font-size: 13px; color: var(--text-tertiary); }

          .btn-generate { width: 100%; padding: 10px 16px; background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.3); color: #25D366; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
          .btn-generate:hover { background: rgba(37,211,102,0.2); }

          .message-preview {
            margin: 12px 0; padding: 12px; background: var(--bg-secondary); border-radius: 8px;
            font-size: 13px; line-height: 1.6; white-space: pre-wrap; max-height: 200px; overflow-y: auto;
          }
          .message-actions { display: flex; gap: 8px; }
          .btn-copy, .btn-whatsapp {
            flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
            padding: 10px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;
            text-decoration: none; transition: all 0.2s; border: 1px solid var(--border-primary);
          }
          .btn-copy { background: var(--card-bg); color: var(--text-secondary); }
          .btn-copy:hover { background: var(--hover-bg); }
          .btn-whatsapp { background: rgba(37,211,102,0.1); border-color: rgba(37,211,102,0.3); color: #25D366; }
          .btn-whatsapp:hover { background: rgba(37,211,102,0.2); }
          .group-note { margin: 12px 0 0 0; font-size: 12px; color: var(--text-tertiary); }

          .url-box { padding: 10px 12px; background: var(--bg-secondary); border-radius: 6px; font-size: 12px; word-break: break-all; margin-bottom: 8px; color: var(--text-tertiary); }

          .registrations-section { }
          .empty-state { text-align: center; padding: 60px 20px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; }
          .empty-state svg { color: var(--text-tertiary); margin-bottom: 16px; }
          .empty-state h3 { margin: 0 0 8px 0; }
          .empty-state p { margin: 0; color: var(--text-tertiary); }

          .registrations-table-wrap { overflow-x: auto; }
          .registrations-table {
            width: 100%; border-collapse: collapse; background: var(--card-bg);
            border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden;
          }
          .registrations-table th, .registrations-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--card-border); }
          .registrations-table th { font-weight: 700; font-size: 13px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-secondary); }
          .registrations-table td { font-size: 14px; }
          .registrations-table tbody tr:hover { background: var(--hover-bg); }

          .contract-statuses { display: flex; gap: 6px; flex-wrap: wrap; }
          .contract-status { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .contract-status.pending { background: rgba(255,152,0,0.1); color: #FF9800; }
          .contract-status.completed { background: rgba(76,175,80,0.1); color: #4CAF50; }

          .custom-fields-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .custom-fields-header label { font-weight: 600; font-size: 14px; color: var(--text-secondary); margin: 0; }
          .btn-add-field { padding: 6px 12px; background: rgba(76,175,80,0.1); border: 1px solid rgba(76,175,80,0.3); color: #4CAF50; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
          .btn-add-field:hover { background: rgba(76,175,80,0.2); }
          .custom-fields-list { display: flex; flex-direction: column; gap: 10px; }
          .custom-field-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 8px; }
          .cf-input-label { flex: 1; min-width: 160px; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--card-bg); color: var(--text-primary); font-size: 14px; }
          .cf-input-label:focus { outline: none; border-color: #4CAF50; }
          .cf-select-type { padding: 8px 10px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--card-bg); color: var(--text-primary); font-size: 14px; }
          .cf-select-type:focus { outline: none; border-color: #4CAF50; }
          .cf-required { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; white-space: nowrap; }
          .cf-required input { cursor: pointer; }
          .cf-btn-remove { padding: 6px 10px; background: rgba(244,67,54,0.1); border: 1px solid rgba(244,67,54,0.2); color: #f44336; border-radius: 6px; cursor: pointer; font-weight: 700; }
          .cf-btn-remove:hover { background: rgba(244,67,54,0.2); }
          .cf-options-wrap { width: 100%; }
          .cf-options-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 6px; background: var(--card-bg); color: var(--text-primary); font-size: 13px; resize: vertical; font-family: inherit; }
          .cf-options-textarea:focus { outline: none; border-color: #4CAF50; }

          @media (max-width: 1024px) { .editor-layout { grid-template-columns: 1fr; } }
          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .event-editor { padding: 24px 16px; }
            .editor-header { flex-wrap: wrap; }
            .editor-header h1 { font-size: 22px; }
            .form-row { grid-template-columns: 1fr; }
          }
        `}</style>
      </main>
    </>
  );
}
