import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Eraser, Send, Loader2, FileText, X, Check } from 'lucide-react';
import api from '../../utils/api';
import { getFieldTypeByKey } from '../../utils/fieldTypes';

interface Field {
  id: number;
  key: string;
  label: string;
  type: string;
  required: boolean;
  groupKey?: string;
  displayLabel?: string;
  displayType?: string;
}

interface SignatureBlock {
  id: number;
  roleLabel: string;
  type: 'digital' | 'physical';
}

interface Template {
  id: number;
  title: string;
  raw_text: string;
  fields: Field[];
  signature_blocks: SignatureBlock[];
}

interface InviteInfo {
  id: number;
  code: string;
  expires_at: string | null;
  remaining_uses: number | null;
}

export default function SignContract() {
  const { token } = useParams();

  const [template, setTemplate] = useState<Template | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [fieldGroups, setFieldGroups] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [contractNumber, setContractNumber] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Compute display fields: one per group (the first field in each group)
  const displayFields = useMemo(() => {
    if (!template?.fields) return [];
    const seen = new Set<string>();
    const result: Field[] = [];
    for (const field of template.fields) {
      const gk = field.groupKey || field.key;
      if (!seen.has(gk)) {
        seen.add(gk);
        result.push(field);
      }
    }
    return result;
  }, [template?.fields]);

  // Get group size for a field's groupKey
  const getGroupSize = (field: Field): number => {
    const gk = field.groupKey || field.key;
    return fieldGroups[gk]?.length || 1;
  };

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [cnpLast4, setCnpLast4] = useState('');
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);
  const [autocompleteSuccess, setAutocompleteSuccess] = useState(false);

  // Signature state
  const [showSignaturePopup, setShowSignaturePopup] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  
  // Canvas for popup
  const popupCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (token) {
      loadContract();
    }
  }, [token]);

  const loadContract = async () => {
    try {
      const { data } = await api.get(`/public/sign/${token}`);
      setTemplate(data.template);
      setInviteInfo(data.invite);
      setFieldGroups(data.fieldGroups || {});

      // Initialize form data - only for primary fields (first in each group)
      const initialData: Record<string, string> = {};
      const seen = new Set<string>();
      (data.template.fields || []).forEach((field: Field) => {
        const gk = field.groupKey || field.key;
        if (!seen.has(gk)) {
          seen.add(gk);
          initialData[field.key] = '';
        }
      });
      setFormData(initialData);

      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Eroare la incarcarea contractului');
      setLoading(false);
    }
  };

  // Autocomplete by CNP last 4 digits
  const lookupByCNP = async () => {
    if (cnpLast4.length !== 4 || !/^\d{4}$/.test(cnpLast4)) {
      setAutocompleteError('Introduceti exact 4 cifre');
      return;
    }

    setAutocompleteLoading(true);
    setAutocompleteError(null);

    try {
      const { data } = await api.post(`/public/sign/${token}/lookup-cnp`, {
        cnp_last4: cnpLast4
      });

      // Fill form with saved fields
      const savedFields = data.saved_fields || {};
      setFormData(prev => ({
        ...prev,
        ...savedFields
      }));

      setAutocompleteSuccess(true);
      setShowAutocomplete(false);
      setCnpLast4('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Eroare la cautare';
      setAutocompleteError(errorMsg);
    }

    setAutocompleteLoading(false);
  };

  // Canvas drawing functions for popup
  const setupCanvas = () => {
    const canvas = popupCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  };

  useEffect(() => {
    if (showSignaturePopup) {
      setTimeout(setupCanvas, 100);
    }
  }, [showSignaturePopup]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = popupCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = popupCanvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = popupCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearPopupSignature = () => {
    setupCanvas();
  };

  const confirmSignature = () => {
    const canvas = popupCanvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setHasSignature(true);
    setShowSignaturePopup(false);
  };

  // Expand formData: copy primary field values to all linked fields in the group
  const expandFormData = (): Record<string, string> => {
    const expanded: Record<string, string> = {};
    const allFields = template?.fields || [];

    for (const field of allFields) {
      const gk = field.groupKey || field.key;
      // Find the primary field for this group (first one with this groupKey)
      const primaryField = allFields.find(f => (f.groupKey || f.key) === gk);
      if (primaryField && formData[primaryField.key] !== undefined) {
        expanded[field.key] = formData[primaryField.key];
      } else {
        expanded[field.key] = formData[field.key] || '';
      }
    }
    return expanded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields (only display fields - one per group)
    const missingFields = displayFields
      .filter(f => f.required && !formData[f.key]?.trim())
      .map(f => f.label);

    if (missingFields.length > 0) {
      alert(`Campuri obligatorii necompletate:\n${missingFields.join('\n')}`);
      return;
    }

    // Validate CNP fields (must have exactly 13 digits)
    const cnpFields = displayFields.filter(f =>
      f.key.toLowerCase().includes('cnp') ||
      f.label.toLowerCase().includes('cnp') ||
      f.type === 'cnp' ||
      f.displayType === 'cnp'
    );

    for (const cnpField of cnpFields) {
      const cnpValue = formData[cnpField.key]?.replace(/\D/g, '');
      if (cnpValue && cnpValue.length !== 13) {
        alert(`Campul "${cnpField.label}" trebuie sa contina exact 13 cifre (CNP valid). Ai introdus ${cnpValue.length} cifre.`);
        return;
      }
    }

    // Check if digital signatures are required
    const digitalSigs = (template?.signature_blocks || []).filter(s => s.type === 'digital' || !s.type);
    const requiresDigitalSignature = digitalSigs.length > 0;

    if (requiresDigitalSignature && (!hasSignature || !signatureDataUrl)) {
      alert('Te rugam sa semnezi inainte de a trimite');
      return;
    }

    setSubmitting(true);

    try {
      // Expand form data to fill all linked fields before submitting
      const expandedData = expandFormData();

      const { data: submitResult } = await api.post(`/public/sign/${token}/submit`, {
        filled_fields: expandedData,
        signature_image: requiresDigitalSignature ? signatureDataUrl : null,
        save_for_later: false
      });

      if (submitResult.contract_number) {
        setContractNumber(submitResult.contract_number);
      }
      setSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Eroare la trimiterea contractului');
    }

    setSubmitting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="sign-page loading">
        <Loader2 className="spinner" size={48} />
        <p>Se incarca contractul...</p>
        <style>{styles}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="sign-page error">
        <AlertCircle size={64} />
        <h1>Link Invalid</h1>
        <p>{error}</p>
        <style>{styles}</style>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="sign-page success">
        <CheckCircle size={80} className="success-icon" />
        <h1>Multumim!</h1>
        <p>Contractul a fost semnat cu succes.</p>
        {contractNumber && (
          <p className="contract-number-display">Numarul contractului: <strong>{contractNumber}</strong></p>
        )}
        <p className="success-hint">Poti inchide aceasta pagina.</p>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="sign-page">
      <div className="sign-container">
        <header className="sign-header">
          <FileText size={32} className="header-icon" />
          <h1>{template?.title}</h1>
          {inviteInfo?.remaining_uses !== null && inviteInfo?.remaining_uses !== undefined && (
            <span className="uses-badge">
              {inviteInfo?.remaining_uses} {inviteInfo?.remaining_uses === 1 ? 'utilizare ramasa' : 'utilizari ramase'}
            </span>
          )}
        </header>

        {/* Contract preview */}
        <div className="contract-preview">
          <h3>Previzualizare Contract</h3>
          <pre>{template?.raw_text}</pre>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Autocomplete Section */}
          {!autocompleteSuccess && (
            <div className="autocomplete-section">
              {!showAutocomplete ? (
                <button 
                  type="button" 
                  className="btn-autocomplete-toggle"
                  onClick={() => setShowAutocomplete(true)}
                >
                  Am mai semnat un contract - Completare rapida
                </button>
              ) : (
                <div className="autocomplete-form">
                  <p className="autocomplete-label">Introdu ultimele 4 cifre din CNP pentru a incarca datele salvate:</p>
                  <div className="autocomplete-input-row">
                    <input
                      type="text"
                      value={cnpLast4}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCnpLast4(val);
                        setAutocompleteError(null);
                      }}
                      placeholder="1234"
                      maxLength={4}
                      className="cnp-input"
                    />
                    <button 
                      type="button" 
                      onClick={lookupByCNP} 
                      disabled={autocompleteLoading || cnpLast4.length !== 4}
                      className="btn-autocomplete-search"
                    >
                      {autocompleteLoading ? <Loader2 className="spinner" size={16} /> : 'Cauta'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAutocomplete(false);
                        setCnpLast4('');
                        setAutocompleteError(null);
                      }}
                      className="btn-autocomplete-cancel"
                    >
                      Anuleaza
                    </button>
                  </div>
                  {autocompleteError && (
                    <p className="autocomplete-error">{autocompleteError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {autocompleteSuccess && (
            <div className="autocomplete-success">
              <CheckCircle size={18} />
              <span>Datele au fost incarcate! Verifica si completeaza ce lipseste.</span>
            </div>
          )}

          <div className="form-section">
            <h3>Completeaza datele</h3>
            <div className="fields-grid">
              {displayFields.map(field => {
                const groupSize = getGroupSize(field);
                const ftConfig = field.displayType ? getFieldTypeByKey(field.displayType) : undefined;
                const labelText = field.displayLabel || field.label;
                const inputType = ftConfig?.inputType || (field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'date' ? 'date' : 'text');
                const maxLen = ftConfig?.maxLength || (field.type === 'cnp' ? 13 : undefined);
                const isFullWidth = (ftConfig?.type || field.type) === 'address';
                const isCnp = ftConfig?.type === 'cnp' || field.type === 'cnp';

                return (
                  <div key={field.key} className={`form-group ${isFullWidth ? 'full-width' : ''}`}>
                    <label>
                      {labelText}
                      {field.required && <span className="required">*</span>}
                      {groupSize > 1 && (
                        <span className="linked-badge" title={`Acest camp apare de ${groupSize} ori in contract`}>
                          x{groupSize}
                        </span>
                      )}
                    </label>
                    <input
                      type={inputType}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      placeholder={isCnp ? '1234567890123' : ''}
                      maxLength={maxLen}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signature section - only for digital signatures */}
          {(() => {
            const digitalSigs = (template?.signature_blocks || []).filter(s => s.type === 'digital' || !s.type);
            const physicalSigs = (template?.signature_blocks || []).filter(s => s.type === 'physical');
            
            return (
              <>
                {digitalSigs.length > 0 && (
                  <div className="signature-section">
                    <h3>Semnatura digitala</h3>
                    {digitalSigs.length > 1 && (
                      <p className="sig-info">Aceasta semnatura va fi aplicata pentru: {digitalSigs.map(s => s.roleLabel).join(', ')}</p>
                    )}
                    {digitalSigs.length === 1 && digitalSigs[0].roleLabel && (
                      <p className="sig-info">{digitalSigs[0].roleLabel}</p>
                    )}
                    
                    {!hasSignature ? (
                      <div className="signature-placeholder" onClick={() => setShowSignaturePopup(true)}>
                        <div className="finger-icon">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                            <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 15h-4v-1h4v1zm0-2h-4v-1h4v1zm.85-4H13v3h-2v-3H9.15C8.45 13.15 8 12.14 8 11c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.14-.45 2.15-1.15 3z"/>
                          </svg>
                        </div>
                        <p className="tap-text">Apasa aici pentru a semna</p>
                      </div>
                    ) : (
                      <div className="signature-preview" onClick={() => setShowSignaturePopup(true)}>
                        <img src={signatureDataUrl!} alt="Semnatura ta" />
                        <p className="change-text">Apasa pentru a modifica semnatura</p>
                      </div>
                    )}
                  </div>
                )}

                {physicalSigs.length > 0 && (
                  <div className="physical-sig-notice">
                    <h4>Semnaturi fizice necesare</h4>
                    <p>Urmatoarele campuri vor fi semnate fizic dupa printare:</p>
                    <ul>
                      {physicalSigs.map(sig => (
                        <li key={sig.id}>{sig.roleLabel}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}

          {/* Submit button */}
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="spinner" size={20} />
                Se trimite...
              </>
            ) : (
              <>
                <Send size={20} />
                Semneaza si trimite
              </>
            )}
          </button>
        </form>
      </div>

      {/* Signature Popup */}
      {showSignaturePopup && (
        <div className="signature-popup-overlay">
          <div className="signature-popup">
            <div className="popup-header">
              <h3>Deseneaza semnatura</h3>
              <button className="btn-close" onClick={() => setShowSignaturePopup(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="popup-canvas-container">
              <canvas
                ref={popupCanvasRef}
                width={600}
                height={300}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="popup-actions">
              <button type="button" className="btn-clear-popup" onClick={clearPopupSignature}>
                <Eraser size={18} />
                Sterge
              </button>
              <button type="button" className="btn-confirm" onClick={confirmSignature}>
                <Check size={18} />
                Confirma semnatura
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .sign-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
  }

  .sign-page.loading,
  .sign-page.error,
  .sign-page.success {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    text-align: center;
  }

  .sign-page.loading .spinner,
  .sign-page .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .sign-page.error svg {
    color: #ff6b6b;
    margin-bottom: 20px;
  }

  .sign-page.success .success-icon {
    color: #4CAF50;
    margin-bottom: 20px;
  }

  .contract-number-display {
    margin-top: 16px;
    padding: 12px 24px;
    background: rgba(255,255,255,0.15);
    border-radius: 12px;
    font-size: 18px;
    letter-spacing: 1px;
  }

  .contract-number-display strong {
    font-size: 22px;
    font-weight: 900;
  }

  .success-hint {
    font-size: 14px;
    opacity: 0.8;
    margin-top: 16px;
  }

  .sign-container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    overflow: hidden;
  }

  .sign-header {
    padding: 32px;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
  }

  .header-icon {
    color: #667eea;
  }

  .sign-header h1 {
    margin: 0;
    flex: 1;
    font-size: 24px;
    color: #333;
  }

  .uses-badge {
    padding: 6px 12px;
    background: rgba(102,126,234,0.1);
    color: #667eea;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
  }

  .contract-preview {
    padding: 32px;
    border-bottom: 1px solid #eee;
  }

  .contract-preview h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #666;
  }

  .contract-preview pre {
    margin: 0;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 300px;
    overflow-y: auto;
    color: #333;
  }

  form {
    padding: 32px;
  }

  .autocomplete-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px dashed #ddd;
  }

  .btn-autocomplete-toggle {
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
    border: 2px dashed #667eea;
    border-radius: 12px;
    color: #667eea;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-autocomplete-toggle:hover {
    background: linear-gradient(135deg, #e8f0fe 0%, #dbe4fc 100%);
    border-color: #5a6fd6;
  }

  .autocomplete-form {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
  }

  .autocomplete-label {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #555;
  }

  .autocomplete-input-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .cnp-input {
    width: 100px;
    padding: 12px 16px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 18px;
    font-family: monospace;
    text-align: center;
    letter-spacing: 4px;
  }

  .cnp-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .btn-autocomplete-search {
    padding: 12px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-autocomplete-search:hover:not(:disabled) {
    background: #5a6fd6;
  }

  .btn-autocomplete-search:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-autocomplete-cancel {
    padding: 12px 16px;
    background: transparent;
    color: #666;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-autocomplete-cancel:hover {
    background: #f0f0f0;
  }

  .autocomplete-error {
    margin: 12px 0 0 0;
    color: #f44336;
    font-size: 14px;
  }

  .autocomplete-success {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 12px;
    color: #2e7d32;
    font-size: 14px;
    margin-bottom: 24px;
  }

  .form-section {
    margin-bottom: 32px;
  }

  .form-section h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #333;
  }

  .fields-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group.full-width {
    grid-column: span 2;
  }

  .form-group label {
    font-weight: 600;
    font-size: 14px;
    color: #555;
  }

  .form-group label .required {
    color: #f44336;
    margin-left: 4px;
  }

  .linked-badge {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 6px;
    background: rgba(102,126,234,0.15);
    color: #667eea;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
  }

  .form-group input {
    padding: 12px 14px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 15px;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
  }

  .signature-section {
    margin-bottom: 32px;
  }

  .signature-section h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #333;
  }

  .signature-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    border: 3px dashed #ddd;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
    background: #fafafa;
  }

  .signature-placeholder:hover {
    border-color: #667eea;
    background: #f0f4ff;
  }

  .finger-icon {
    color: #667eea;
    margin-bottom: 16px;
  }

  .tap-text {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #667eea;
  }

  .signature-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border: 2px solid #4CAF50;
    border-radius: 16px;
    cursor: pointer;
    background: #f9fff9;
  }

  .signature-preview img {
    max-width: 100%;
    max-height: 150px;
    border-radius: 8px;
  }

  .change-text {
    margin: 12px 0 0 0;
    font-size: 13px;
    color: #666;
  }

  .sig-info {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #666;
    font-style: italic;
  }

  .physical-sig-notice {
    margin-bottom: 32px;
    padding: 20px;
    background: #fff8e1;
    border: 1px solid #ffcc80;
    border-radius: 12px;
  }

  .physical-sig-notice h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #e65100;
  }

  .physical-sig-notice p {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #666;
  }

  .physical-sig-notice ul {
    margin: 0;
    padding-left: 20px;
  }

  .physical-sig-notice li {
    font-size: 14px;
    color: #333;
    margin-bottom: 4px;
  }

  .btn-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102,126,234,0.4);
  }

  .btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Signature Popup */
  .signature-popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .signature-popup {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 650px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #eee;
  }

  .popup-header h3 {
    margin: 0;
    font-size: 20px;
  }

  .btn-close {
    padding: 8px;
    background: #f5f5f5;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: #666;
  }

  .btn-close:hover {
    background: #eee;
  }

  .popup-canvas-container {
    padding: 20px;
    background: #f8f9fa;
  }

  .popup-canvas-container canvas {
    display: block;
    width: 100%;
    height: auto;
    background: white;
    border: 2px solid #ddd;
    border-radius: 12px;
    cursor: crosshair;
    touch-action: none;
  }

  .popup-actions {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #eee;
  }

  .btn-clear-popup {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 24px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    color: #666;
  }

  .btn-clear-popup:hover {
    background: #eee;
  }

  .btn-confirm {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    background: #4CAF50;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    color: white;
  }

  .btn-confirm:hover {
    background: #45a049;
  }

  @media (max-width: 600px) {
    .sign-page {
      padding: 16px 12px;
    }

    .sign-header {
      padding: 24px 20px;
    }

    .sign-header h1 {
      font-size: 18px;
    }

    .contract-preview,
    form {
      padding: 20px;
    }

    .autocomplete-input-row {
      flex-wrap: wrap;
    }

    .cnp-input {
      flex: 1;
      min-width: 80px;
    }

    .btn-autocomplete-search,
    .btn-autocomplete-cancel {
      flex: 1;
    }

    .fields-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full-width {
      grid-column: span 1;
    }

    .signature-popup {
      margin: 10px;
      max-height: 95vh;
    }

    .popup-header {
      padding: 16px 20px;
    }

    .popup-header h3 {
      font-size: 18px;
    }

    .popup-canvas-container {
      padding: 16px;
    }

    .popup-actions {
      flex-direction: column;
      padding: 16px 20px;
    }

    .btn-clear-popup,
    .btn-confirm {
      width: 100%;
      justify-content: center;
    }
  }
`;
