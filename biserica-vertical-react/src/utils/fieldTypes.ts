export interface FieldTypeDefinition {
  key: string;
  label: string;
  type: string;
  inputType: string;
  maxLength?: number;
}

export const FIELD_TYPES: FieldTypeDefinition[] = [
  { key: 'nume_complet', label: 'Nume complet', type: 'name', inputType: 'text' },
  { key: 'cnp', label: 'CNP', type: 'cnp', inputType: 'text', maxLength: 13 },
  { key: 'seria_ci', label: 'Seria CI', type: 'id_series', inputType: 'text' },
  { key: 'numar_ci', label: 'Numarul CI', type: 'id_number', inputType: 'text' },
  { key: 'telefon', label: 'Telefon', type: 'phone', inputType: 'tel' },
  { key: 'email', label: 'Email', type: 'email', inputType: 'email' },
  { key: 'adresa', label: 'Adresa', type: 'address', inputType: 'text' },
  { key: 'localitate', label: 'Localitate', type: 'text', inputType: 'text' },
  { key: 'judet', label: 'Judet', type: 'text', inputType: 'text' },
  { key: 'data_nasterii', label: 'Data nasterii', type: 'date', inputType: 'date' },
  { key: 'data', label: 'Data', type: 'date', inputType: 'date' },
  { key: 'nume_tata', label: 'Numele tatalui', type: 'name', inputType: 'text' },
  { key: 'cetatenie', label: 'Cetatenie', type: 'text', inputType: 'text' },
  { key: 'functie', label: 'Functia', type: 'text', inputType: 'text' },
  { key: 'text', label: 'Alt camp (text)', type: 'text', inputType: 'text' },
];

export function getFieldTypeByKey(key: string): FieldTypeDefinition | undefined {
  return FIELD_TYPES.find(ft => ft.key === key);
}
