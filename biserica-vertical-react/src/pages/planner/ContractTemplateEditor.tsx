import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Copy, Link2, Download, FileText, User, Unlink, Info, ChevronDown, ChevronUp } from 'lucide-react';
import PlannerNav from '../../components/PlannerNav';
import LoadingSpinner from '../../components/LoadingSpinner';
import api, { API_BASE_URL } from '../../utils/api';
import { FIELD_TYPES, getFieldTypeByKey } from '../../utils/fieldTypes';

interface Field {
  id: number;
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  groupKey?: string;
  displayLabel?: string;
  displayType?: string;
}

interface SignatureBlock {
  id: number;
  roleLabel: string;
  anchorText?: string;
}

interface Invite {
  id: number;
  token: string;
  code: string;
  publicUrl: string;
  uses_count: number;
  max_uses: number;
  is_disabled: boolean;
  created_at: string;
}

interface Submission {
  id: number;
  template_id: number;
  filled_fields: any;
  status: string;
  created_at: string;
  signed_at: string;
  invite_code?: string;
  contract_number?: string;
}

export default function ContractTemplateEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [nickname, setNickname] = useState('');
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [numberStart, setNumberStart] = useState(1);
  const [activeTab, setActiveTab] = useState<'editor' | 'submissions'>('editor');
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<string>>(new Set());
  const [linkingMode, setLinkingMode] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [pendingLinkKeys, setPendingLinkKeys] = useState<string[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [showLegend, setShowLegend] = useState(false);
  const [editingNrId, setEditingNrId] = useState<number | null>(null);
  const [editingNrValue, setEditingNrValue] = useState('');

  // Group fields by groupKey for display
  const fieldGroupsMap = useMemo(() => {
    const groups: Record<string, Field[]> = {};
    for (const field of fields) {
      const gk = field.groupKey || field.key;
      if (!groups[gk]) groups[gk] = [];
      groups[gk].push(field);
    }
    return groups;
  }, [fields]);

  // Get unique group keys that have more than 1 field
  const linkedGroups = useMemo(() => {
    return Object.entries(fieldGroupsMap).filter(([, flds]) => flds.length > 1);
  }, [fieldGroupsMap]);

  // Color palette for groups
  const GROUP_COLORS = ['#667eea', '#e91e63', '#ff9800', '#009688', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

  const getGroupColor = (groupKey: string): string | null => {
    const idx = linkedGroups.findIndex(([gk]) => gk === groupKey);
    if (idx === -1) return null;
    return GROUP_COLORS[idx % GROUP_COLORS.length];
  };

  const toggleFieldSelection = (key: string) => {
    setSelectedFieldKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const linkSelectedFields = () => {
    if (selectedFieldKeys.size < 1) return;
    setPendingLinkKeys(Array.from(selectedFieldKeys));
    setShowTypePicker(true);
    setCustomLabel('');
  };

  const confirmLinkWithType = (fieldTypeKey: string) => {
    const fieldType = getFieldTypeByKey(fieldTypeKey);
    if (!fieldType || pendingLinkKeys.length < 1) return;

    // Generate groupKey, add counter if this type already exists as a group
    let baseGroupKey = fieldType.key + '__' + fieldType.type;
    const existingGroupKeys = new Set(fields.map(f => f.groupKey || f.key));
    // Check if any field NOT in pendingLinkKeys already has this groupKey
    const conflicting = fields.some(f => !pendingLinkKeys.includes(f.key) && (f.groupKey || f.key) === baseGroupKey);
    if (conflicting) {
      let counter = 2;
      while (existingGroupKeys.has(baseGroupKey + '__' + counter)) counter++;
      baseGroupKey = baseGroupKey + '__' + counter;
    }

    setFields(prev => prev.map(f =>
      pendingLinkKeys.includes(f.key)
        ? { ...f, groupKey: baseGroupKey, displayLabel: fieldType.label, displayType: fieldType.key }
        : f
    ));
    setShowTypePicker(false);
    setPendingLinkKeys([]);
    setSelectedFieldKeys(new Set());
    setLinkingMode(false);
  };

  const confirmLinkCustom = () => {
    if (!customLabel.trim() || pendingLinkKeys.length < 1) return;
    const baseGroupKey = 'custom__' + customLabel.trim().toLowerCase().replace(/\s+/g, '_');

    setFields(prev => prev.map(f =>
      pendingLinkKeys.includes(f.key)
        ? { ...f, groupKey: baseGroupKey, displayLabel: customLabel.trim(), displayType: 'custom' }
        : f
    ));
    setShowTypePicker(false);
    setPendingLinkKeys([]);
    setSelectedFieldKeys(new Set());
    setLinkingMode(false);
    setCustomLabel('');
  };

  const unlinkGroup = (groupKey: string) => {
    setFields(prev => prev.map(f =>
      (f.groupKey || f.key) === groupKey ? { ...f, groupKey: f.key, displayLabel: undefined, displayType: undefined } : f
    ));
  };

  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const { data } = await api.get(`/contracts/templates/${id}`);
      
      if (!data || !data.template) {
        alert('Eroare: Sablonul nu a fost gasit');
        setLoading(false);
        return;
      }
      
      const template = data.template;
      setTitle(template.title || '');
      setNickname(template.nickname || '');
      setNumberPrefix(template.number_prefix || '');
      setNumberStart(template.number_start || 1);
      setRawText(template.raw_text || '');
      
      let parsedFields = template.fields;
      if (typeof parsedFields === 'string') {
        try { parsedFields = JSON.parse(parsedFields); } catch (e) { parsedFields = []; }
      }
      setFields(parsedFields || []);
      
      let parsedSignatures = template.signature_blocks;
      if (typeof parsedSignatures === 'string') {
        try { parsedSignatures = JSON.parse(parsedSignatures); } catch (e) { parsedSignatures = []; }
      }
      setSignatureBlocks(parsedSignatures || []);
      
      // Load invites
      try {
        const invitesResponse = await api.get(`/contracts/templates/${id}/invites`);
        setInvites(invitesResponse.data.invites || []);
      } catch (e) {
        setInvites([]);
      }
      
      // Load submissions for this template
      try {
        const submissionsResponse = await api.get(`/contracts/submissions?template_id=${id}`);
        setSubmissions(submissionsResponse.data.submissions || []);
      } catch (e) {
        setSubmissions([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Eroare la incarcarea sablonului');
      setLoading(false);
    }
  };


  const saveTemplate = async () => {
    if (!title.trim() || !rawText.trim()) {
      alert('Titlul si textul sunt obligatorii');
      return;
    }

    setSaving(true);
    try {
      // Auto-detect fields before saving
      let detectedFields = fields;
      let detectedSignatures = signatureBlocks;
      
      try {
        const parseResponse = await api.post('/contracts/parse-fields', { text: rawText });
        detectedFields = parseResponse.data.fields || [];
        detectedSignatures = parseResponse.data.signatureBlocks || [];

        // Preserve manually-set overrides from existing fields
        const existingOverrides: Record<string, { groupKey?: string; displayLabel?: string; displayType?: string }> = {};
        for (const f of fields) {
          if (f.groupKey && f.groupKey !== (f.key.replace(/_\d+$/, '') + '__' + f.type)) {
            existingOverrides[f.key] = {
              groupKey: f.groupKey,
              displayLabel: f.displayLabel,
              displayType: f.displayType,
            };
          }
        }
        // Apply preserved overrides to matching re-parsed fields
        detectedFields = detectedFields.map((f: Field) => {
          if (existingOverrides[f.key]) {
            return { ...f, ...existingOverrides[f.key] };
          }
          return f;
        });

        setFields(detectedFields);
        setSignatureBlocks(detectedSignatures);
      } catch (parseError) {
        console.error('Error parsing fields:', parseError);
      }

      if (isNew) {
        const { data } = await api.post('/contracts/templates', {
          title,
          nickname: nickname || null,
          number_prefix: numberPrefix || null,
          number_start: numberStart || 1,
          raw_text: rawText,
          fields: detectedFields,
          signature_blocks: detectedSignatures
        });
        navigate(`/planner/contracts/${data.template.id}`);
      } else {
        await api.put(`/contracts/templates/${id}`, {
          title,
          nickname: nickname || null,
          number_prefix: numberPrefix || null,
          number_start: numberStart || 1,
          raw_text: rawText,
          fields: detectedFields,
          signature_blocks: detectedSignatures
        });
        alert('Salvat cu succes!');
        loadTemplate();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Eroare la salvare');
    }
    setSaving(false);
  };

  const generateLink = async () => {
    if (!id || id === 'new') {
      alert('Salvează mai întâi șablonul!');
      return;
    }
    
    try {
      const { data } = await api.post(`/contracts/templates/${id}/invites`, {});
      
      if (data.publicUrl) {
        await navigator.clipboard.writeText(data.publicUrl);
        alert(`Link copiat!\n\nURL: ${data.publicUrl}\nCod: ${data.code}`);
        loadTemplate();
      } else {
        alert('Eroare: Nu s-a generat URL-ul');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Eroare la generare link');
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert('Copiat in clipboard!');
  };

  const downloadPdf = async (submissionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/contracts/submissions/${submissionId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${submissionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Eroare la descarcarea PDF-ului');
    }
  };

  const downloadSignature = async (submissionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/contracts/submissions/${submissionId}/signature`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `semnatura_${submissionId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Eroare la descarcarea semnaturii');
    }
  };

  const startEditingNr = (submission: Submission) => {
    setEditingNrId(submission.id);
    setEditingNrValue(submission.contract_number || '');
  };

  const saveContractNumber = async (submissionId: number) => {
    try {
      await api.put(`/contracts/submissions/${submissionId}`, {
        contract_number: editingNrValue.trim() || null
      });
      setSubmissions(prev =>
        prev.map(s => s.id === submissionId ? { ...s, contract_number: editingNrValue.trim() || undefined } : s)
      );
      setEditingNrId(null);
    } catch (err) {
      console.error('Error updating contract number:', err);
      alert('Eroare la salvarea numarului');
    }
  };

  const getSignerName = (submission: Submission) => {
    const fields = submission.filled_fields;
    if (!fields) return 'Necunoscut';

    const keys = Object.keys(fields);

    // Prefer "nume_complet*" style keys
    const numeCompletKey = keys.find(k => /complet/i.test(k) && fields[k]);
    if (numeCompletKey) return fields[numeCompletKey];

    // Standalone "name" field
    if (fields.name) return fields.name;

    // Find a "prenume" key and a "nume" key (not prenume, not tata)
    const prenumeKey = keys.find(k => /prenume/i.test(k) && fields[k]);
    const numeKey = keys.find(k => /^nume/i.test(k) && !/prenume|tata/i.test(k) && fields[k]);
    if (numeKey) {
      return prenumeKey ? `${fields[prenumeKey]} ${fields[numeKey]}` : fields[numeKey];
    }

    // Fallback: any key containing "nume" or "name"
    const anyNameKey = keys.find(k => (k.toLowerCase().includes('nume') || k.toLowerCase().includes('name')) && fields[k]);
    if (anyNameKey) return fields[anyNameKey];

    return 'Anonim';
  };

  const maskCNP = (cnp: string) => {
    if (!cnp || cnp.length < 6) return cnp;
    return cnp.substring(0, 3) + '*'.repeat(cnp.length - 5) + cnp.substring(cnp.length - 2);
  };

  const getCNP = (submission: Submission) => {
    const fields = submission.filled_fields;
    if (!fields) return '';
    const cnp = fields.cnp_4 || fields.cnp || fields.CNP || '';
    return maskCNP(cnp);
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
      <main className="editor-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate('/planner/contracts')}>
            <ArrowLeft size={20} />
            Inapoi
          </button>
          <h1>{isNew ? 'Contract Nou' : title}</h1>
          <div className="header-actions">
            {!isNew && (
              <button className="btn-generate" onClick={generateLink}>
                <Send size={16} />
                Genereaza & Copiaza Link
              </button>
            )}
            <button className="btn-save" onClick={saveTemplate} disabled={saving}>
              <Save size={16} />
              {saving ? 'Salvez...' : 'Salveaza'}
            </button>
          </div>
        </div>

        {/* Tabs - only show if not new */}
        {!isNew && (
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <FileText size={16} />
              Editor Contract
            </button>
            <button 
              className={`tab ${activeTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('submissions')}
            >
              <User size={16} />
              Semnari ({submissions.length})
            </button>
          </div>
        )}

        {/* Editor Tab */}
        {(isNew || activeTab === 'editor') && (
          <div className="editor-grid">
            <div className="editor-main">
              <div className="form-group">
                <label>Titlu contract</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contract Voluntariat 2024"
                />
              </div>

              <div className="form-group">
                <label>Nickname intern <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px' }}>(vizibil doar admin)</span></label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Contract voluntariat vara 2025"
                />
              </div>

              <div className="numbering-row">
                <div className="form-group">
                  <label>Prefix numar <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px' }}>(ex: VOL, CTR)</span></label>
                  <input
                    type="text"
                    value={numberPrefix}
                    onChange={(e) => setNumberPrefix(e.target.value.toUpperCase().slice(0, 20))}
                    placeholder="VOL"
                    maxLength={20}
                  />
                </div>
                <div className="form-group">
                  <label>Numar de start</label>
                  <input
                    type="number"
                    value={numberStart}
                    onChange={(e) => setNumberStart(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Text contract (paste)</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Lipeste textul contractului aici..."
                  rows={20}
                />
              </div>

              <div className="legend-panel">
                <button className="legend-toggle" onClick={() => setShowLegend(!showLegend)}>
                  <Info size={16} />
                  <span>Legenda campuri & semnaturi</span>
                  {showLegend ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showLegend && (
                  <div className="legend-content">
                    <div className="legend-section">
                      <h4>Campuri de completat</h4>
                      <div className="legend-item">
                        <code className="legend-code">______</code>
                        <span>Camp de completat (detectat automat dupa context)</span>
                      </div>
                    </div>
                    <div className="legend-section">
                      <h4>Tipuri detectate automat</h4>
                      <div className="legend-types-grid">
                        <div className="legend-type-item"><span className="legend-type-badge name">name</span>Nume complet</div>
                        <div className="legend-type-item"><span className="legend-type-badge cnp">cnp</span>CNP</div>
                        <div className="legend-type-item"><span className="legend-type-badge id_series">id_series</span>Seria CI</div>
                        <div className="legend-type-item"><span className="legend-type-badge id_number">id_number</span>Numarul CI</div>
                        <div className="legend-type-item"><span className="legend-type-badge phone">phone</span>Telefon</div>
                        <div className="legend-type-item"><span className="legend-type-badge email">email</span>Email</div>
                        <div className="legend-type-item"><span className="legend-type-badge address">address</span>Adresa</div>
                        <div className="legend-type-item"><span className="legend-type-badge date">date</span>Data</div>
                        <div className="legend-type-item"><span className="legend-type-badge text">text</span>Camp generic</div>
                      </div>
                    </div>
                    <div className="legend-section">
                      <h4>Zone de semnatura</h4>
                      <div className="legend-item">
                        <code className="legend-code">............</code>
                        <span>Semnatura digitala (desenata pe ecran)</span>
                      </div>
                      <div className="legend-item">
                        <code className="legend-code">::::::::::::</code>
                        <span>Semnatura fizica (ramas gol, se semneaza pe hartie)</span>
                      </div>
                      <div className="legend-item">
                        <code className="legend-code">------------</code>
                        <span>Semnatura fixa (imagine predefinita)</span>
                      </div>
                    </div>
                    <div className="legend-section">
                      <h4>Exemplu</h4>
                      <pre className="legend-example">Subsemnatul ______, legitimat cu seria ______ nr. ______, avand CNP ______{'\n\n'}Directorul ............{'\n'}Voluntarul :::::::::::{'\n'}Presedintele ------------</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="editor-sidebar">
              <div className="panel">
                <h3>
                  Campuri detectate ({fields.length})
                  {fields.length >= 2 && (
                    <button
                      className="btn-small"
                      onClick={() => { setLinkingMode(!linkingMode); setSelectedFieldKeys(new Set()); }}
                      style={linkingMode ? { background: 'rgba(244,67,54,0.1)', borderColor: 'rgba(244,67,54,0.3)', color: '#f44336' } : {}}
                    >
                      <Link2 size={14} />
                      {linkingMode ? 'Anuleaza' : 'Leaga campuri'}
                    </button>
                  )}
                </h3>
                {fields.length === 0 ? (
                  <p className="empty-text">Niciun camp detectat.</p>
                ) : (
                  <>
                    {linkingMode && !showTypePicker && (
                      <div className="linking-bar">
                        <span>{selectedFieldKeys.size} selectate</span>
                        <button
                          className="btn-link-action"
                          disabled={selectedFieldKeys.size < 1}
                          onClick={linkSelectedFields}
                        >
                          Leaga selectia
                        </button>
                      </div>
                    )}
                    {showTypePicker && (
                      <div className="type-picker">
                        <p className="type-picker-title">Alege tipul campului:</p>
                        <div className="type-picker-list">
                          {FIELD_TYPES.map(ft => (
                            <button
                              key={ft.key}
                              className="type-picker-item"
                              onClick={() => confirmLinkWithType(ft.key)}
                            >
                              <span className="type-picker-label">{ft.label}</span>
                              <span className="type-picker-hint">{ft.type}</span>
                            </button>
                          ))}
                          <div className="type-picker-custom">
                            <input
                              type="text"
                              value={customLabel}
                              onChange={(e) => setCustomLabel(e.target.value)}
                              placeholder="Personalizat..."
                              className="type-picker-custom-input"
                              onKeyDown={(e) => e.key === 'Enter' && confirmLinkCustom()}
                            />
                            <button
                              className="btn-link-action"
                              disabled={!customLabel.trim()}
                              onClick={confirmLinkCustom}
                            >
                              OK
                            </button>
                          </div>
                        </div>
                        <button
                          className="type-picker-cancel"
                          onClick={() => { setShowTypePicker(false); setPendingLinkKeys([]); }}
                        >
                          Anuleaza
                        </button>
                      </div>
                    )}
                    <div className="fields-list">
                      {fields.map((field, index) => {
                        const gk = field.groupKey || field.key;
                        const groupColor = getGroupColor(gk);
                        const groupSize = fieldGroupsMap[gk]?.length || 1;
                        const isSelected = selectedFieldKeys.has(field.key);

                        return (
                          <div
                            key={field.id || index}
                            className={`field-item ${linkingMode ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`}
                            style={groupColor ? { borderLeft: `3px solid ${groupColor}` } : {}}
                            onClick={linkingMode ? () => toggleFieldSelection(field.key) : undefined}
                          >
                            {linkingMode && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFieldSelection(field.key)}
                                className="field-checkbox"
                              />
                            )}
                            <div style={{ flex: 1 }}>
                              <div className="field-label">
                                {field.displayLabel || field.label}
                                {field.displayLabel && field.displayLabel !== field.label && (
                                  <span className="original-label-hint">({field.label})</span>
                                )}
                                {groupSize > 1 && (
                                  <span className="group-badge" style={{ background: `${groupColor}20`, color: groupColor || '#667eea' }}>
                                    x{groupSize}
                                  </span>
                                )}
                              </div>
                              <div className="field-meta">
                                <span className="field-type">{field.type}</span>
                                <span className="field-key-hint">{field.key}</span>
                              </div>
                            </div>
                            {!linkingMode && groupSize > 1 && (
                              <button
                                className="btn-unlink"
                                onClick={(e) => { e.stopPropagation(); unlinkGroup(gk); }}
                                title="Degrupeaza"
                              >
                                <Unlink size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="panel">
                <h3>Zone semnatura ({signatureBlocks.length})</h3>
                {signatureBlocks.length === 0 ? (
                  <p className="empty-text">Nicio zona de semnatura.</p>
                ) : (
                  <div className="fields-list">
                    {signatureBlocks.map((block, index) => (
                      <div key={block.id || index} className="field-item signature">
                        <div className="field-label">{block.roleLabel}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isNew && (
                <div className="panel">
                  <h3>
                    Link-uri ({invites.length})
                    <button className="btn-small" onClick={generateLink}>
                      <Link2 size={14} />
                      Nou
                    </button>
                  </h3>
                  {invites.length === 0 ? (
                    <p className="empty-text">Niciun link generat.</p>
                  ) : (
                    <div className="invites-list">
                      {invites.slice(0, 5).map(invite => (
                        <div key={invite.id} className={`invite-item ${invite.is_disabled ? 'disabled' : ''}`}>
                          <div className="invite-code">{invite.code}</div>
                          <div className="invite-meta">{invite.uses_count}/{invite.max_uses}</div>
                          <button className="btn-copy" onClick={() => copyToClipboard(invite.publicUrl)}>
                            <Copy size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {!isNew && activeTab === 'submissions' && (
          <div className="submissions-section">
            {submissions.length === 0 ? (
              <div className="empty-state">
                <User size={48} />
                <h3>Nicio semnare inca</h3>
                <p>Genereaza un link si trimite-l pentru a primi semnari.</p>
                <button className="btn-generate" onClick={generateLink}>
                  <Send size={16} />
                  Genereaza Link
                </button>
              </div>
            ) : (
              <div className="submissions-table">
                <div className="table-header">
                  <div className="col-nr">Nr.</div>
                  <div className="col-name">Nume</div>
                  <div className="col-cnp">CNP</div>
                  <div className="col-date">Data semnarii</div>
                  <div className="col-actions">Actiuni</div>
                </div>
                {submissions.map(submission => (
                  <div key={submission.id} className="table-row">
                    <div className="col-nr">
                      {editingNrId === submission.id ? (
                        <input
                          type="text"
                          className="nr-input"
                          value={editingNrValue}
                          onChange={e => setEditingNrValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveContractNumber(submission.id);
                            if (e.key === 'Escape') setEditingNrId(null);
                          }}
                          onBlur={() => saveContractNumber(submission.id)}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="nr-editable"
                          onClick={() => startEditingNr(submission)}
                          title="Click pentru a edita numarul"
                        >
                          {submission.contract_number || '-'}
                        </span>
                      )}
                    </div>
                    <div className="col-name">
                      <User size={16} />
                      {getSignerName(submission)}
                    </div>
                    <div className="col-cnp">{getCNP(submission)}</div>
                    <div className="col-date">
                      {new Date(submission.signed_at || submission.created_at).toLocaleDateString('ro-RO', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="col-actions">
                      <button className="btn-download" onClick={() => downloadPdf(submission.id)} title="Descarca PDF">
                        <Download size={16} />
                        PDF
                      </button>
                      <button className="btn-download secondary" onClick={() => downloadSignature(submission.id)} title="Descarca semnatura">
                        <Download size={16} />
                        Semnatura
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <style>{`
          body {
            background: var(--bg-primary);
            padding-top: 80px;
          }

          .editor-page {
            max-width: 1600px;
            margin: 0 auto;
            padding: 24px;
          }

          .page-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
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
            font-size: 24px;
          }

          .header-actions {
            display: flex;
            gap: 12px;
          }

          .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border-primary);
            padding-bottom: 8px;
          }

          .tab {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-weight: 600;
            cursor: pointer;
            border-radius: 8px 8px 0 0;
            transition: all 0.2s;
          }

          .tab:hover {
            background: var(--hover-bg);
          }

          .tab.active {
            background: var(--card-bg);
            color: #4CAF50;
            border: 1px solid var(--border-primary);
            border-bottom: none;
          }

          .btn-generate, .btn-save {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            border: none;
          }

          .btn-generate {
            background: rgba(33,150,243,0.1);
            border: 1px solid rgba(33,150,243,0.3);
            color: #2196F3;
          }

          .btn-save {
            background: #4CAF50;
            color: white;
          }

          .btn-save:disabled {
            opacity: 0.6;
          }

          .editor-grid {
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 24px;
          }

          .editor-main {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .form-group label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
            color: var(--text-secondary);
          }

          .form-group input, .form-group textarea {
            padding: 14px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 15px;
          }

          .form-group textarea {
            font-family: 'Monaco', 'Consolas', monospace;
            resize: vertical;
            min-height: 400px;
          }


          .legend-panel {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 10px;
            overflow: hidden;
          }

          .legend-toggle {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 16px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.15s;
          }

          .legend-toggle:hover {
            background: var(--hover-bg);
          }

          .legend-toggle span {
            flex: 1;
            text-align: left;
          }

          .legend-content {
            padding: 0 16px 16px 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            border-top: 1px solid var(--border-primary);
            padding-top: 16px;
          }

          .legend-section h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            color: var(--text-primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 0;
            font-size: 13px;
            color: var(--text-secondary);
          }

          .legend-code {
            display: inline-block;
            padding: 3px 8px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            color: #667eea;
            white-space: nowrap;
            min-width: 100px;
            text-align: center;
          }

          .legend-types-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }

          .legend-type-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--text-secondary);
            padding: 4px 0;
          }

          .legend-type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            font-weight: 600;
            min-width: 70px;
            text-align: center;
          }

          .legend-type-badge.name { background: rgba(76,175,80,0.12); color: #4CAF50; }
          .legend-type-badge.cnp { background: rgba(233,30,99,0.12); color: #e91e63; }
          .legend-type-badge.id_series { background: rgba(255,152,0,0.12); color: #ff9800; }
          .legend-type-badge.id_number { background: rgba(255,152,0,0.12); color: #ff9800; }
          .legend-type-badge.phone { background: rgba(0,150,136,0.12); color: #009688; }
          .legend-type-badge.email { background: rgba(33,150,243,0.12); color: #2196F3; }
          .legend-type-badge.address { background: rgba(156,39,176,0.12); color: #9c27b0; }
          .legend-type-badge.date { background: rgba(121,85,72,0.12); color: #795548; }
          .legend-type-badge.text { background: rgba(96,125,139,0.12); color: #607d8b; }

          .legend-example {
            margin: 0;
            padding: 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            color: var(--text-secondary);
            white-space: pre-wrap;
            line-height: 1.6;
          }

          .numbering-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .col-nr {
            font-family: monospace;
            font-weight: 700;
            color: #667eea;
            font-size: 13px;
          }

          .nr-editable {
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background 0.15s;
          }

          .nr-editable:hover {
            background: var(--bg-secondary);
            outline: 1px dashed var(--border-primary);
          }

          .nr-input {
            width: 80px;
            padding: 4px 8px;
            border: 1px solid #667eea;
            border-radius: 4px;
            font-family: monospace;
            font-weight: 700;
            font-size: 13px;
            color: #667eea;
            background: var(--card-bg);
            outline: none;
          }

          .editor-sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .panel {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 20px;
          }

          .panel h3 {
            margin: 0 0 16px 0;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .btn-small {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 10px;
            background: rgba(33,150,243,0.1);
            border: 1px solid rgba(33,150,243,0.3);
            color: #2196F3;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          }

          .empty-text {
            color: var(--text-tertiary);
            font-size: 13px;
            margin: 0;
          }

          .fields-list, .invites-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .linking-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: rgba(102,126,234,0.08);
            border: 1px solid rgba(102,126,234,0.2);
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 13px;
            color: #667eea;
            font-weight: 600;
          }

          .btn-link-action {
            padding: 6px 14px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-link-action:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .type-picker {
            background: var(--card-bg);
            border: 2px solid #667eea;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 12px;
          }

          .type-picker-title {
            margin: 0 0 10px 0;
            font-size: 13px;
            font-weight: 700;
            color: #667eea;
          }

          .type-picker-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 320px;
            overflow-y: auto;
          }

          .type-picker-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: var(--bg-secondary);
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s;
            color: var(--text-primary);
          }

          .type-picker-item:hover {
            background: rgba(102,126,234,0.1);
            border-color: rgba(102,126,234,0.3);
          }

          .type-picker-label {
            font-weight: 600;
            font-size: 13px;
          }

          .type-picker-hint {
            font-size: 11px;
            color: var(--text-tertiary);
            font-family: monospace;
          }

          .type-picker-custom {
            display: flex;
            gap: 6px;
            margin-top: 4px;
            padding-top: 8px;
            border-top: 1px dashed var(--border-primary);
          }

          .type-picker-custom-input {
            flex: 1;
            padding: 6px 10px;
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            font-size: 13px;
            background: var(--bg-secondary);
            color: var(--text-primary);
          }

          .type-picker-custom-input:focus {
            outline: none;
            border-color: #667eea;
          }

          .type-picker-cancel {
            width: 100%;
            margin-top: 8px;
            padding: 8px;
            background: transparent;
            border: 1px solid var(--border-primary);
            border-radius: 6px;
            color: var(--text-tertiary);
            font-size: 12px;
            cursor: pointer;
          }

          .type-picker-cancel:hover {
            background: var(--hover-bg);
          }

          .original-label-hint {
            font-size: 10px;
            font-weight: 400;
            color: var(--text-tertiary);
            margin-left: 4px;
          }

          .field-item {
            padding: 12px;
            background: var(--bg-secondary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.15s;
          }

          .field-item.selectable {
            cursor: pointer;
          }

          .field-item.selectable:hover {
            background: rgba(102,126,234,0.08);
          }

          .field-item.selected {
            background: rgba(102,126,234,0.12);
            outline: 2px solid rgba(102,126,234,0.4);
          }

          .field-checkbox {
            width: 18px;
            height: 18px;
            accent-color: #667eea;
            flex-shrink: 0;
          }

          .field-item.signature {
            border-left: 3px solid #9C27B0;
          }

          .field-label {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .group-badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
          }

          .field-meta {
            display: flex;
            gap: 8px;
            margin-top: 4px;
            align-items: center;
          }

          .field-type {
            font-size: 11px;
            padding: 2px 6px;
            background: rgba(33,150,243,0.1);
            color: #2196F3;
            border-radius: 4px;
          }

          .field-key-hint {
            font-size: 10px;
            color: var(--text-tertiary);
            font-family: monospace;
          }

          .btn-unlink {
            padding: 4px;
            background: transparent;
            border: 1px solid var(--border-primary);
            border-radius: 4px;
            color: var(--text-tertiary);
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.15s;
          }

          .btn-unlink:hover {
            background: rgba(244,67,54,0.1);
            border-color: rgba(244,67,54,0.3);
            color: #f44336;
          }

          .invite-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            background: var(--bg-secondary);
            border-radius: 6px;
          }

          .invite-item.disabled { opacity: 0.5; }

          .invite-code {
            font-family: monospace;
            font-weight: 700;
            color: #4CAF50;
          }

          .invite-meta {
            flex: 1;
            font-size: 12px;
            color: var(--text-tertiary);
          }

          .btn-copy {
            padding: 6px;
            background: transparent;
            border: 1px solid var(--border-primary);
            color: var(--text-secondary);
            border-radius: 4px;
            cursor: pointer;
          }

          /* Submissions Section */
          .submissions-section {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 24px;
          }

          .empty-state {
            text-align: center;
            padding: 60px 20px;
          }

          .empty-state svg {
            color: var(--text-tertiary);
            margin-bottom: 16px;
          }

          .empty-state h3 {
            margin: 0 0 8px 0;
          }

          .empty-state p {
            color: var(--text-tertiary);
            margin: 0 0 20px 0;
          }

          .submissions-table {
            display: flex;
            flex-direction: column;
          }

          .table-header {
            display: grid;
            grid-template-columns: 120px 1fr 150px 180px 200px;
            gap: 16px;
            padding: 12px 16px;
            background: var(--bg-secondary);
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 8px;
          }

          .table-row {
            display: grid;
            grid-template-columns: 120px 1fr 150px 180px 200px;
            gap: 16px;
            padding: 16px;
            border-bottom: 1px solid var(--border-primary);
            align-items: center;
          }

          .table-row:last-child {
            border-bottom: none;
          }

          .col-name {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
          }

          .col-cnp {
            font-family: monospace;
            color: var(--text-secondary);
          }

          .col-date {
            color: var(--text-tertiary);
            font-size: 14px;
          }

          .col-actions {
            display: flex;
            gap: 8px;
          }

          .btn-download {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .btn-download.secondary {
            background: var(--bg-secondary);
            color: var(--text-secondary);
            border: 1px solid var(--border-primary);
          }

          .btn-download:hover {
            opacity: 0.9;
          }

          @media (max-width: 1024px) {
            .editor-grid {
              grid-template-columns: 1fr;
            }
            .table-header, .table-row {
              grid-template-columns: 100px 1fr 1fr;
            }
            .col-cnp, .col-date { display: none; }
          }

          @media (max-width: 768px) {
            body { padding-top: 64px; }
            .editor-page { padding: 16px; }
            .page-header { flex-wrap: wrap; }
            .page-header h1 { width: 100%; order: 1; margin-top: 12px; }
          }
        `}</style>
      </main>
    </>
  );
}
