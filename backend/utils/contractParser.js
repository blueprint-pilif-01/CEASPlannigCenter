/**
 * Contract Parser Utility
 * Auto-detects fields and signature blocks from Romanian contract text
 * 
 * Reguli:
 * - ___ (underscore) = câmp de completat
 * - ... (puncte) = câmp de semnătură digitală (label-ul e textul dinaintea punctelor)
 * - ::: (două puncte) = spațiu pentru semnătură fizică (rămâne gol)
 */

// Map detected field types to friendly display labels
const TYPE_DISPLAY_LABELS = {
  name: 'Nume complet',
  cnp: 'CNP',
  id_series: 'Seria CI',
  id_number: 'Numarul CI',
  phone: 'Telefon',
  email: 'Email',
  address: 'Adresa',
  date: 'Data',
};

// Map detected field types to FIELD_TYPES keys (from frontend fieldTypes.ts)
const TYPE_TO_FIELD_TYPE_KEY = {
  name: 'nume_complet',
  cnp: 'cnp',
  id_series: 'seria_ci',
  id_number: 'numar_ci',
  phone: 'telefon',
  email: 'email',
  address: 'adresa',
  date: 'data',
};

/**
 * Parse contract text to detect fillable fields and signature blocks
 * @param {string} text - Raw contract text
 * @returns {{ fields: Array, signatureBlocks: Array }}
 */
function parseContractText(text) {
  const fields = [];
  const signatureBlocks = [];
  let fieldId = 1;
  let sigId = 1;

  // ============================================
  // DETECT FIELDS - Orice ___ devine câmp de completat
  // ============================================
  
  const underscoreRegex = /_{3,}/g;
  let match;
  
  while ((match = underscoreRegex.exec(text)) !== null) {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    // Extrage contextul din fața underscore-urilor
    const contextStart = Math.max(0, startIndex - 80);
    const precedingText = text.substring(contextStart, startIndex);
    
    const { label, type } = extractLabelAndType(precedingText);
    
    fields.push({
      id: fieldId,
      key: generateFieldKey(label) + '_' + fieldId,
      label,
      type,
      required: true,
      placeholder: match[0],
      startIndex,
      endIndex,
      originalMatch: match[0],
      groupKey: generateFieldKey(label) + '__' + type,
      displayLabel: TYPE_DISPLAY_LABELS[type] || null,
      displayType: TYPE_TO_FIELD_TYPE_KEY[type] || null
    });
    
    fieldId++;
  }

  // ============================================
  // DETECT INLINE SIGNATURES - text ----------
  // Liniuțe consecutive = câmp pentru semnătură inline (în text)
  // Tot ce e pe linia respectivă înainte de liniuțe = label
  // ============================================
  
  // Captează tot de la început de linie (sau după newline) până la liniuțe
  const dashesRegex = /(?:^|\n)([^\n]*?)-{5,}/g;
  
  while ((match = dashesRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const labelText = match[1].trim();
    
    // Calculează indexul corect (exclude newline-ul dacă există)
    const hasNewline = match[0].startsWith('\n');
    const startIndex = match.index + (hasNewline ? 1 : 0);
    const endIndex = match.index + fullMatch.length;
    
    // Folosește tot textul ca label, sau "Semnătură" dacă e gol
    const label = labelText || 'Semnatura';
    
    signatureBlocks.push({
      id: sigId++,
      roleLabel: label, // Păstrează capitalizarea originală
      type: 'inline', // Semnătură inline (în text)
      anchorText: fullMatch.replace(/^\n/, ''),
      startIndex,
      endIndex,
      placeholder: fullMatch.replace(/^\n/, '')
    });
  }

  // ============================================
  // DETECT DIGITAL SIGNATURES - text ............
  // Puncte consecutive = câmp pentru semnătură digitală
  // Tot ce e pe linia respectivă înainte de puncte = label
  // ============================================
  
  // Captează tot de la început de linie (sau după newline) până la puncte
  const dotsRegex = /(?:^|\n)([^\n]*?)\.{5,}/g;
  
  while ((match = dotsRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const labelText = match[1].trim();
    
    // Calculează indexul corect (exclude newline-ul dacă există)
    const hasNewline = match[0].startsWith('\n');
    const startIndex = match.index + (hasNewline ? 1 : 0);
    const endIndex = match.index + fullMatch.length;
    
    // Folosește tot textul ca label, sau "Semnătură" dacă e gol
    const label = labelText || 'Semnătură';
    
    signatureBlocks.push({
      id: sigId++,
      roleLabel: label, // Păstrează capitalizarea originală
      type: 'digital', // Semnătură digitală
      anchorText: fullMatch.replace(/^\n/, ''),
      startIndex,
      endIndex,
      placeholder: fullMatch.replace(/^\n/, '')
    });
  }

  // ============================================
  // DETECT PHYSICAL SIGNATURES - text :::::::::::
  // Două puncte consecutive = spațiu pentru semnătură fizică (rămâne gol)
  // Tot ce e pe linia respectivă înainte de coloane = label
  // ============================================
  
  // Captează tot de la început de linie (sau după newline) până la coloane
  const colonsRegex = /(?:^|\n)([^\n]*?):{5,}/g;
  
  while ((match = colonsRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const labelText = match[1].trim();
    
    // Calculează indexul corect (exclude newline-ul dacă există)
    const hasNewline = match[0].startsWith('\n');
    const startIndex = match.index + (hasNewline ? 1 : 0);
    const endIndex = match.index + fullMatch.length;
    
    // Folosește tot textul ca label, sau "Semnătură" dacă e gol
    const label = labelText || 'Semnătură';
    
    signatureBlocks.push({
      id: sigId++,
      roleLabel: label, // Păstrează capitalizarea originală
      type: 'physical', // Semnătură fizică (rămâne gol)
      anchorText: fullMatch.replace(/^\n/, ''),
      startIndex,
      endIndex,
      placeholder: fullMatch.replace(/^\n/, '')
    });
  }

  // ============================================
  // FALLBACK - Detectare tradițională (Semnat, Semnătura, etc.)
  // ============================================
  
  // Doar dacă nu am găsit deja signature blocks
  if (signatureBlocks.length === 0) {
    const signatureRegex = /(^|\n)\s*(Semnat|Semnătura|Semnatura)\s*[,:]?\s*($|\n)/gmi;
    
    while ((match = signatureRegex.exec(text)) !== null) {
      signatureBlocks.push({
        id: sigId++,
        roleLabel: 'Semnatar',
        type: 'digital',
        anchorText: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // Roluri specifice
    const roleRegex = /\b(Voluntar(?:ul)?|Director(?:ul)?|Reprezentant(?:ul)?|Părinte(?:le)?|Tutore(?:le)?|Angajat(?:ul)?|Beneficiar(?:ul)?)\s*:/gi;
    
    while ((match = roleRegex.exec(text)) !== null) {
      const isDuplicate = signatureBlocks.some(s => Math.abs(s.startIndex - match.index) < 50);
      
      if (!isDuplicate) {
        const roleName = match[1].replace(/ul$|le$/, '');
        signatureBlocks.push({
          id: sigId++,
          roleLabel: capitalizeFirst(roleName),
          type: 'digital',
          anchorText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
  }

  // Sortează după poziție
  fields.sort((a, b) => a.startIndex - b.startIndex);
  signatureBlocks.sort((a, b) => a.startIndex - b.startIndex);

  // Re-numerotează
  fields.forEach((f, i) => { f.id = i + 1; });
  signatureBlocks.forEach((s, i) => { s.id = i + 1; });

  return { fields, signatureBlocks };
}

// Keywords that indicate a NAME field (person identifier)
const NAME_KEYWORDS = [
  'persoană', 'persoana', 'persoană fizică', 'persoana fizica',
  'parte', 'parte contractantă', 'parte contractanta', 'parte semnatară', 'parte semnatara',
  'semnatar', 'co-semnatar', 'cosemnatar',
  'contractant', 'cocontractant',
  'colaborator', 'colaborator intern', 'colaborator extern',
  'participant', 'participant înscris', 'participant inscris', 'participant înregistrat', 'participant inregistrat',
  'participant activ', 'participant eligibil', 'participant desemnat', 'participant selectat', 'participant confirmat',
  'participant în proiect', 'participant in proiect', 'participant în program', 'participant in program',
  'participant în activitate', 'participant in activitate', 'participant în campanie', 'participant in campanie',
  'participant în acțiune', 'participant in actiune', 'participant la eveniment', 'participant la training',
  'participant la workshop', 'participant la sesiune', 'participant la întâlnire', 'participant la intalnire',
  'participant la intervenție', 'participant la interventie',
  'membru', 'membru activ', 'membru înscris', 'membru inscris', 'membru participant',
  'membru al echipei', 'membru al grupului', 'membru al comunității', 'membru al comunitatii',
  'membru asociat', 'membru afiliat', 'membru aderent', 'membru cotizant',
  'aderent', 'afiliat', 'asociat', 'reprezentant',
  'persoană autorizată', 'persoana autorizata', 'persoană împuternicită', 'persoana imputernicita',
  'persoană desemnată', 'persoana desemnata', 'persoană nominalizată', 'persoana nominalizata',
  'persoană responsabilă', 'persoana responsabila', 'persoană coordonată', 'persoana coordonata',
  'persoană implicată', 'persoana implicata', 'persoană participantă', 'persoana participanta',
  'persoană de contact', 'persoana de contact',
  'titular', 'utilizator', 'utilizator final', 'utilizator autorizat',
  'beneficiar', 'beneficiar direct', 'beneficiar indirect',
  'beneficiar al programului', 'beneficiar al proiectului', 'beneficiar al activității', 'beneficiar al activitatii',
  'sprijinitor', 'susținător', 'sustinator', 'contributor', 'contribuabil', 'cooptat',
  'voluntar', 'voluntarul',
  'delegat', 'persoană delegată', 'persoana delegata',
  'persoană resursă', 'persoana resursa', 'resursă umană', 'resursa umana',
  'personal de suport', 'personal auxiliar',
  'executant', 'prestator', 'operator', 'asistent',
  'facilitator', 'mentor', 'instructor', 'formator', 'supervizor', 'coordonator',
  'monitor', 'observator', 'însoțitor', 'insotitor', 'ghid', 'organizator',
  'solicitant', 'aplicant', 'candidat', 'înscris', 'inscris', 'înregistrat', 'inregistrat',
  'subsemnatul', 'subsemnata', 'subsemnatul/subsemnata'
];

/**
 * Check if context contains a name keyword
 */
function containsNameKeyword(context) {
  const lowerContext = context.toLowerCase();
  for (const keyword of NAME_KEYWORDS) {
    // Check if keyword appears at the end of context (before the field)
    const keywordLower = keyword.toLowerCase();
    if (lowerContext.includes(keywordLower)) {
      return { found: true, keyword };
    }
  }
  return { found: false, keyword: null };
}

/**
 * Extrage eticheta și tipul din contextul precedent
 */
function extractLabelAndType(context) {
  const cleanContext = context.trim();
  
  // Specific patterns take priority (CI, CNP, phone, email, etc.)
  const knownPatterns = [
    { pattern: /(CNP|C\.N\.P\.)\s*$/i, label: 'CNP', type: 'cnp' },
    { pattern: /având\s+CNP\s*$/i, label: 'CNP', type: 'cnp' },
    { pattern: /seria\s*$/i, label: 'Seria CI', type: 'id_series' },
    { pattern: /legitimat[ăa]?\s+cu\s+seria\s*$/i, label: 'Seria CI', type: 'id_series' },
    { pattern: /\bnr\.\s*$/i, label: 'Număr CI', type: 'id_number' },
    { pattern: /număr(ul)?\s*$/i, label: 'Număr CI', type: 'id_number' },
    { pattern: /(Subsemnatul\/Subsemnata|Subsemnatul|Subsemnata)\s*$/i, label: 'Nume complet', type: 'name' },
    { pattern: /\b(numele|prenumele|nume|prenume)\s*:?\s*$/i, label: 'Nume', type: 'name' },
    { pattern: /\b(fiul|fiica)\s+(lui)?\s*$/i, label: 'Nume tată', type: 'name' },
    { pattern: /(e-?mail|adresa\s+de\s+e-?mail)\s*:?\s*$/i, label: 'Email', type: 'email' },
    { pattern: /(telefon|tel\.|nr\.\s*tel(efon)?|mobil)\s*:?\s*$/i, label: 'Telefon', type: 'phone' },
    { pattern: /(domiciliat[ăa]?\s+în|cu\s+domiciliul\s+în|adresa|str\.)\s*$/i, label: 'Adresa', type: 'address' },
    { pattern: /(localitatea|orașul|comuna|satul)\s*$/i, label: 'Localitate', type: 'text' },
    { pattern: /(județul|jud\.)\s*$/i, label: 'Județ', type: 'text' },
    { pattern: /(născut[ăa]?\s+(la|în|pe)|data\s+nașterii)\s*$/i, label: 'Data nașterii', type: 'date' },
    { pattern: /\b(data|Data)\s*:?\s*$/i, label: 'Data', type: 'date' },
    { pattern: /\b(din\s+data\s+de)\s*$/i, label: 'Data', type: 'date' },
    { pattern: /(pașaport|pasaport)\s*(nr\.?)?\s*$/i, label: 'Pașaport', type: 'text' },
    { pattern: /(permis|permisul)\s*(nr\.?)?\s*$/i, label: 'Permis', type: 'text' },
    { pattern: /([A-ZĂÂÎȘȚ][a-zăâîșț]+)\s*:\s*$/i, label: null, type: 'text', captureLabel: 1 },
  ];
  
  for (const { pattern, label, type, captureLabel } of knownPatterns) {
    const match = cleanContext.match(pattern);
    if (match) {
      const finalLabel = captureLabel ? match[captureLabel] : label;
      return { label: finalLabel, type };
    }
  }
  
  // Then check for name keywords in context (fallback for generic person fields)
  const nameCheck = containsNameKeyword(cleanContext);
  if (nameCheck.found) {
    const lastPart = cleanContext.split(/[,;:]/).pop()?.trim() || 'Nume complet';
    return { label: capitalizeFirst(lastPart) || 'Nume complet', type: 'name' };
  }
  
  const lastWords = cleanContext.match(/([A-Za-zĂÂÎȘȚăâîșț]+)\s*$/);
  if (lastWords) {
    const word = lastWords[1];
    const type = detectFieldType(word);
    if (type !== 'text' || word.length >= 4) {
      return { label: capitalizeFirst(word), type };
    }
  }
  
  return { label: 'Câmp', type: 'text' };
}

/**
 * Detect field type based on label
 */
function detectFieldType(label) {
  const lower = label.toLowerCase();
  
  if (lower.includes('cnp') || lower === 'c.n.p') return 'cnp';
  if (lower.includes('seria') || lower.includes('serie')) return 'id_series';
  if (lower.match(/num[aă]r/) && (lower.includes('ci') || lower.includes('identitate'))) return 'id_number';
  if (lower.includes('telefon') || lower.includes('mobil') || lower === 'tel') return 'phone';
  if (lower.includes('email') || lower.includes('e-mail')) return 'email';
  if (lower.includes('dat') || lower.includes('născut') || lower.includes('nascut')) return 'date';
  if (lower.includes('adres') || lower.includes('domiciliu') || lower.includes('str.')) return 'address';
  if (lower.includes('nume') || lower.includes('prenume')) return 'name';
  
  // Check if label matches any name keywords
  if (containsNameKeyword(lower).found) return 'name';
  
  return 'text';
}

/**
 * Generate a key from label
 */
function generateFieldKey(label) {
  return label
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[îî]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 25);
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Compute field groups from fields array
 * Returns { groupKey: [fieldKey1, fieldKey2, ...], ... }
 */
function computeFieldGroups(fields) {
  const groups = {};
  for (const field of (fields || [])) {
    const gk = field.groupKey || field.key;
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(field.key);
  }
  return groups;
}

/**
 * Expand filled fields so all grouped fields get the same value
 */
function expandGroupedFields(fields, filledFields) {
  const expanded = { ...filledFields };
  const groups = computeFieldGroups(fields);

  for (const fieldKeys of Object.values(groups)) {
    // Find the first key in the group that has a value
    const valueKey = fieldKeys.find(k => expanded[k] && expanded[k].trim());
    if (valueKey) {
      for (const k of fieldKeys) {
        if (!expanded[k] || !expanded[k].trim()) {
          expanded[k] = expanded[valueKey];
        }
      }
    }
  }
  return expanded;
}

/**
 * Render contract text by replacing placeholders with filled values
 */
function renderContract(template, filledFields, signatures = {}) {
  let rendered = template.raw_text;

  // Expand grouped fields so linked fields share values
  const expandedFields = expandGroupedFields(template.fields, filledFields);

  // Sort fields by position (descending) to replace from end to start
  const sortedFields = [...(template.fields || [])].sort((a, b) => b.startIndex - a.startIndex);

  for (const field of sortedFields) {
    const value = expandedFields[field.key] || field.placeholder;
    
    if (field.startIndex !== undefined && field.endIndex !== undefined) {
      const before = rendered.substring(0, field.startIndex);
      const after = rendered.substring(field.endIndex);
      rendered = before + value + after;
    }
  }
  
  // Handle signature blocks - replace dots/colons with appropriate content
  const sortedSigs = [...(template.signature_blocks || [])].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const sig of sortedSigs) {
    if (sig.startIndex !== undefined && sig.endIndex !== undefined && sig.placeholder) {
      const before = rendered.substring(0, sig.startIndex);
      const after = rendered.substring(sig.endIndex);
      
      if (sig.type === 'physical') {
        // Semnătură fizică - lasă spațiu gol cu linie
        rendered = before + sig.roleLabel + ': _____________________' + after;
      } else {
        // Semnătură digitală - va fi înlocuită cu imaginea semnăturii
        const sigKey = `sig_${sig.id}`;
        if (signatures[sigKey]) {
          rendered = before + sig.roleLabel + ': [SEMNĂTURĂ DIGITALĂ]' + after;
        } else {
          rendered = before + sig.placeholder + after;
        }
      }
    }
  }
  
  return rendered;
}

module.exports = {
  parseContractText,
  renderContract,
  detectFieldType,
  generateFieldKey,
  computeFieldGroups,
  expandGroupedFields
};
