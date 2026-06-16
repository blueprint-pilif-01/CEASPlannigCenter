/**
 * Chord Parser Utility - IMPROVED VERSION
 * Supports multiple formats:
 * - [Am]text here (inline brackets)
 * - Chords on line above with spacing
 * - INTRO: Am G F G (section with colon)
 * - INTRO Am G F G (section without colon)
 * - Multi-line sections
 * - Complex notation: |Gsus4-G-|D---|
 * - Nashville numbers: 1, 4m, 5, b7
 */

export interface ChordLine {
  type: 'section' | 'lyrics' | 'empty' | 'section_with_chords' | 'chords_only';
  content: string;
  sectionName?: string;
  sectionChords?: string[]; // For lines like "INTRO: Am G F G"
  originalChordText?: string; // Original text after section name
  chords?: Array<{
    chord: string;
    position: number;
  }>;
  isNashville?: boolean; // If original uses Nashville numbers
}

// Nashville number pattern - matches 1m, 2m, b3, #4, 5/7, b7sus4, etc.
// BUT NOT single digits alone (those are likely verse numbers)
const NASHVILLE_PATTERN = /^[b#]?[1-7](?:m|maj|min|dim|aug|sus|add)[0-9]?(?:\/[b#]?[1-7])?$|^[b#][1-7](?:\/[b#]?[1-7])?$/;

// Section header keywords (case insensitive)
const SECTION_KEYWORDS = [
  'INTRO', 'VERSE', 'CHORUS', 'BRIDGE', 'OUTRO', 'PRECHORUS', 'PRE-CHORUS', 'PRE CHORUS',
  'INTERLUDE', 'INSTRUMENTAL', 'SOLO', 'TAG', 'ENDING', 'VAMP', 'REFRAIN', 'CODA',
  'BUILD', 'BREAKDOWN', 'HOOK', 'TURNAROUND', 'TRANSITION',
  // Romanian
  'STROFA', 'REFREN', 'PUNTE', 'INTRODUCERE', 'FINAL', 'VERS'
];

/**
 * Check if a word is a valid chord
 * Recognizes: C, Am, F#, Bb, G/B, Dm7, F2, Csus4, Cadd9, |Gsus4-G-|, etc.
 */
function isChord(word: string): boolean {
  // Clean up any timing notation, bars, and trailing punctuation
  let cleanWord = word
    .replace(/^\|+/, '')      // Remove leading bars
    .replace(/\|+$/, '')      // Remove trailing bars
    .replace(/[,;.()[\]]/g, '') // Remove punctuation
    .trim();

  // Remove trailing dashes ONLY (for timing notation like G- or Am-)
  // Keep internal dashes for complex chords like G/B-C
  cleanWord = cleanWord.replace(/-+$/, '');
  
  if (!cleanWord) return false;
  
  // Split by bars if multiple chords in one word (like |G-|D-|)
  const parts = cleanWord.split(/\|/).filter(p => p.length > 0);

  // If we have multiple parts, check each
  if (parts.length > 1) {
    return parts.every(part => {
      // Keep internal dashes for complex chords like G/B-C, only remove trailing dashes
      const cleanPart = part.replace(/-+$/g, '');
      return isChordCore(cleanPart);
    });
  }

  return isChordCore(cleanWord);
}

/**
 * Core chord pattern matching
 */
function isChordCore(word: string): boolean {
  if (!word || word.length === 0) return false;

  // Handle complex slash chords with dashes like G/B-C, D/F#-G
  // Split by dash if it contains slash
  if (word.includes('/') && word.includes('-')) {
    const parts = word.split('-');
    // Check if all parts are valid chords
    return parts.every(part => {
      const singleChordPattern = /^[A-G][#b]?(?:m|maj|min|dim|aug|Δ|°|\+)?(?:2|4|5|6|7|9|11|13)?(?:sus|add)?(?:2|4|9|11|13)?(?:\/[A-G][#b]?)?$/i;
      return singleChordPattern.test(part.trim());
    });
  }

  // Standard chord pattern:
  // - Root: A-G with optional # or b
  // - Quality: m, maj, min, dim, aug, Δ, °, +
  // - Extensions: 2, 4, 5, 6, 7, 9, 11, 13
  // - Suspended: sus, sus2, sus4
  // - Added: add9, add11
  // - Slash bass: /E, /B, etc.
  const chordPattern = /^[A-G][#b]?(?:m|maj|min|dim|aug|Δ|°|\+)?(?:2|4|5|6|7|9|11|13)?(?:sus|add)?(?:2|4|9|11|13)?(?:\/[A-G][#b]?)?$/i;

  return chordPattern.test(word);
}

/**
 * Check if a word is a Nashville number
 * Single digits (1-7) alone are NOT Nashville numbers - they're likely verse numbers
 * Nashville numbers need a modifier: 1m, b3, #4, 5/1, 4sus, etc.
 */
function isNashvilleNumber(word: string): boolean {
  const cleanWord = word.replace(/[,;.()[\]|-]/g, '').trim();
  if (!cleanWord) return false;
  
  // Single digit alone is NOT a Nashville number (it's a verse number like "Verse 1")
  if (/^[1-7]$/.test(cleanWord)) return false;
  
  // Must have some modifier to be Nashville
  return NASHVILLE_PATTERN.test(cleanWord);
}

/**
 * Check if a line is likely a chord-only line
 * (no lyrics, just chords with spacing)
 */
function isChordOnlyLine(line: string): { isChordLine: boolean; chords: Array<{ chord: string; position: number }>; isNashville: boolean } {
  const trimmed = line.trim();
  if (!trimmed) return { isChordLine: false, chords: [], isNashville: false };

  // Extract potential chords preserving their positions
  const chords: Array<{ chord: string; position: number }> = [];
  let isNashville = false;

  // Split by whitespace but keep track of positions - use ORIGINAL line to preserve spacing
  let currentPos = 0;
  const words = line.split(/(\s+)/);

  let chordCount = 0;
  let nonChordCount = 0;

  words.forEach((part) => {
    if (/^\s+$/.test(part)) {
      // Whitespace - just add to position
      currentPos += part.length;
    } else if (part.length > 0) {
      // First check if it's a section indicator we should ignore
      const upperPart = part.toUpperCase();
      const isSectionPart = SECTION_KEYWORDS.some(kw => upperPart.startsWith(kw)) ||
                            /^[0-9]+[:.)]?$/.test(part) || // "1", "1:", "2.", "(1)" - verse numbers
                            /^\d+$/.test(part) || // Just a number alone
                            part === 'x2' || part === 'x3' || part === 'x4' ||
                            part.toLowerCase() === 'x' ||
                            /^[xX]\d+$/.test(part); // x2, X3, etc.

      if (isSectionPart) {
        // Skip section indicators - don't count as chord or non-chord
        currentPos += part.length;
        return;
      }

      // Check if it's a chord or Nashville number
      const isChordWord = isChord(part);
      const isNashvilleWord = isNashvilleNumber(part);

      if (isChordWord || isNashvilleWord) {
        chords.push({
          chord: part.replace(/^\|+|\|+$/g, '').replace(/-+$/g, ''), // Clean for display
          position: currentPos
        });
        chordCount++;
        if (isNashvilleWord) isNashville = true;
      } else {
        nonChordCount++;
      }
      currentPos += part.length;
    }
  });

  // Consider it a chord line if we have chords and very few non-chord words
  // Allow for labels like "x2", "1:", etc.
  const isChordLine = chordCount > 0 && (nonChordCount === 0 || (chordCount >= 2 && nonChordCount <= 1));

  return { isChordLine, chords, isNashville };
}

/**
 * Check if a line is a section header
 */
function parseSectionHeader(line: string): { isSection: boolean; sectionName: string; chordPart: string; hasChords: boolean } {
  const trimmed = line.trim();
  
  // Pattern 1: "SECTION: chords" or "Section: chords" or "Verse: 1"
  const colonMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9\s]*?):\s*(.*)$/);
  if (colonMatch) {
    let sectionName = colonMatch[1].trim();
    let chordPart = colonMatch[2].trim();
    
    // If the part after colon is just a number, it's the verse number, not chords
    // e.g., "Verse: 1" should be "Verse 1" with no chords
    if (/^\d+$/.test(chordPart)) {
      sectionName = sectionName + ' ' + chordPart;
      chordPart = '';
    }
    
    // Verify it's a known section or starts with one
    const upperName = sectionName.toUpperCase();
    const isKnownSection = SECTION_KEYWORDS.some(kw => upperName.startsWith(kw)) ||
                           /^(VERSE|STROFA|CHORUS|REFREN)\s*\d*$/i.test(sectionName);
    
    if (isKnownSection || chordPart.length === 0) {
      const { isChordLine } = isChordOnlyLine(chordPart);
      return {
        isSection: true,
        sectionName,
        chordPart,
        hasChords: isChordLine && chordPart.length > 0
      };
    }
  }
  
  // Pattern 2: "SECTION chords" (no colon, section keyword followed by chords)
  for (const keyword of SECTION_KEYWORDS) {
    const pattern = new RegExp(`^(${keyword}(?:\\s+\\d+)?)\\s+(.+)$`, 'i');
    const match = trimmed.match(pattern);
    
    if (match) {
      const sectionName = match[1].trim();
      const chordPart = match[2].trim();
      const { isChordLine } = isChordOnlyLine(chordPart);
      
      if (isChordLine) {
        return {
          isSection: true,
          sectionName,
          chordPart,
          hasChords: true
        };
      }
    }
  }
  
  // Pattern 3: Just a section name (no chords)
  const upperTrimmed = trimmed.toUpperCase();
  for (const keyword of SECTION_KEYWORDS) {
    // Match "VERSE", "VERSE 1", "VERSE:", "CHORUS 2", etc.
    const pattern = new RegExp(`^${keyword}(?:\\s+\\d+)?[:.)]?$`, 'i');
    if (pattern.test(trimmed)) {
      return {
        isSection: true,
        sectionName: trimmed.replace(/[:.)]$/, ''),
        chordPart: '',
        hasChords: false
      };
    }
  }
  
  // Pattern 4: All caps with no brackets (likely section header)
  if (trimmed === upperTrimmed && !trimmed.includes('[') && trimmed.length < 50) {
    // Check if it's mostly non-chord words
    const { isChordLine } = isChordOnlyLine(trimmed);
    if (!isChordLine) {
      return {
        isSection: true,
        sectionName: trimmed,
        chordPart: '',
        hasChords: false
      };
    }
  }
  
  return { isSection: false, sectionName: '', chordPart: '', hasChords: false };
}

/**
 * Extract chords from a string (for section chord parts)
 */
function extractChordsFromString(text: string): string[] {
  const chords: string[] = [];
  const words = text.split(/\s+/);
  
  words.forEach(word => {
    // Handle bar notation like |G-|D-|Am-|
    // Remove pipes and trailing dashes, but keep internal dashes (needed for complex chords like G/B-C)
    const cleanWord = word.replace(/^\|+|\|+$/g, '').replace(/-+$/g, '');

    if (cleanWord && (isChord(cleanWord) || isNashvilleNumber(cleanWord))) {
      chords.push(cleanWord);
    }
  });
  
  return chords;
}

/**
 * Parse lyrics with chords - MAIN FUNCTION
 */
export function parseLyricsWithChords(lyrics: string): ChordLine[] {
  if (!lyrics) return [];
  
  const lines = lyrics.split('\n');
  const result: ChordLine[] = [];
  
  let currentSectionName = '';
  let pendingChordLine: { chords: Array<{ chord: string; position: number }>; isNashville: boolean } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Empty line
    if (!trimmedLine) {
      // If we have a pending chord line with no lyrics, output it
      if (pendingChordLine) {
        result.push({
          type: 'chords_only',
          content: '',
          chords: pendingChordLine.chords,
          isNashville: pendingChordLine.isNashville
        });
        pendingChordLine = null;
      }
      result.push({ type: 'empty', content: '' });
      continue;
    }
    
    // Check for section header
    const sectionParse = parseSectionHeader(trimmedLine);
    if (sectionParse.isSection) {
      // Output any pending chord line first
      if (pendingChordLine) {
        result.push({
          type: 'chords_only',
          content: '',
          chords: pendingChordLine.chords,
          isNashville: pendingChordLine.isNashville
        });
        pendingChordLine = null;
      }
      
      currentSectionName = sectionParse.sectionName;
      
      if (sectionParse.hasChords) {
        const sectionChords = extractChordsFromString(sectionParse.chordPart);
        result.push({
          type: 'section_with_chords',
          content: trimmedLine,
          sectionName: sectionParse.sectionName,
          sectionChords,
          originalChordText: sectionParse.chordPart,
          isNashville: sectionChords.some(c => isNashvilleNumber(c))
        });
      } else {
        result.push({
          type: 'section',
          content: sectionParse.sectionName
        });
      }
      continue;
    }
    
    // Check for [Chord] inline format
    if (line.includes('[')) {
      // Output any pending chord line first
      if (pendingChordLine) {
        result.push({
          type: 'chords_only',
          content: '',
          chords: pendingChordLine.chords,
          isNashville: pendingChordLine.isNashville
        });
        pendingChordLine = null;
      }
      
      const chords: Array<{ chord: string; position: number }> = [];
      let cleanText = '';
      let currentPosition = 0;
      
      const chordRegex = /\[([^\]]+)\]/g;
      let lastIndex = 0;
      let match;
      
      while ((match = chordRegex.exec(line)) !== null) {
        const textBefore = line.substring(lastIndex, match.index);
        cleanText += textBefore;
        currentPosition += textBefore.length;
        
        chords.push({
          chord: match[1],
          position: currentPosition
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      cleanText += line.substring(lastIndex);
      
      result.push({
        type: 'lyrics',
        content: cleanText,
        chords: chords.length > 0 ? chords : undefined,
        isNashville: chords.some(c => isNashvilleNumber(c.chord))
      });
      continue;
    }
    
    // Check if this is a chord-only line (chords with spacing, no lyrics)
    // Use ORIGINAL line to preserve exact spacing for chord positions
    const chordLineCheck = isChordOnlyLine(line);
    if (chordLineCheck.isChordLine) {
      // If we already have a pending chord line, output it first (for multi-line chord sections)
      if (pendingChordLine) {
        // Check if next line is lyrics - if so, combine
        const nextLineIdx = i + 1;
        if (nextLineIdx < lines.length) {
          const nextLine = lines[nextLineIdx];
          const nextChordCheck = isChordOnlyLine(nextLine);

          // If next line is also chords, output this as chords_only and set new pending
          if (nextChordCheck.isChordLine || nextLine.trim() === '' || parseSectionHeader(nextLine.trim()).isSection) {
            result.push({
              type: 'chords_only',
              content: '',
              chords: pendingChordLine.chords,
              isNashville: pendingChordLine.isNashville
            });
          }
        }
        pendingChordLine = null;
      }

      // Set this as pending to combine with next lyrics line
      pendingChordLine = {
        chords: chordLineCheck.chords,
        isNashville: chordLineCheck.isNashville
      };
      continue;
    }

    // Regular lyrics line
    if (pendingChordLine) {
      // Combine pending chords with this lyrics line
      // Use ORIGINAL line to match chord positions
      result.push({
        type: 'lyrics',
        content: line,
        chords: pendingChordLine.chords,
        isNashville: pendingChordLine.isNashville
      });
      pendingChordLine = null;
    } else {
      // Just lyrics, no chords
      result.push({
        type: 'lyrics',
        content: trimmedLine
      });
    }
  }
  
  // Handle any remaining pending chord line
  if (pendingChordLine) {
    result.push({
      type: 'chords_only',
      content: '',
      chords: pendingChordLine.chords,
      isNashville: pendingChordLine.isNashville
    });
  }
  
  return result;
}

/**
 * Transpose a single chord
 */
export function transposeChord(chord: string, semitones: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatToSharp: { [key: string]: string } = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };

  // Handle Nashville numbers - just return as-is
  if (isNashvilleNumber(chord)) {
    return chord;
  }

  // Handle complex chords with dashes like G/B-C, D/F#-G-Am
  if (chord.includes('-')) {
    const parts = chord.split('-');
    const transposedParts = parts.map(part => transposeChord(part.trim(), semitones));
    return transposedParts.join('-');
  }

  // Extract the root note and the rest
  let rootNote = chord[0].toUpperCase();
  let restOfChord = chord.substring(1);

  if (chord.length > 1 && (chord[1] === '#' || chord[1] === 'b')) {
    rootNote = chord.substring(0, 2);
    restOfChord = chord.substring(2);
  }

  // Convert flats to sharps
  if (flatToSharp[rootNote]) {
    rootNote = flatToSharp[rootNote];
  }

  let noteIndex = notes.indexOf(rootNote);
  if (noteIndex === -1) return chord;

  noteIndex = (noteIndex + semitones + 12) % 12;
  const newRootNote = notes[noteIndex];

  // Handle slash chords
  if (restOfChord.includes('/')) {
    const slashIndex = restOfChord.indexOf('/');
    const modifier = restOfChord.substring(0, slashIndex);
    const bassNote = restOfChord.substring(slashIndex + 1);

    let bassPart = bassNote[0].toUpperCase();
    let bassRest = bassNote.substring(1);

    if (bassNote.length > 1 && (bassNote[1] === '#' || bassNote[1] === 'b')) {
      bassPart = bassNote.substring(0, 2);
      bassRest = bassNote.substring(2);
    }

    if (flatToSharp[bassPart]) {
      bassPart = flatToSharp[bassPart];
    }

    let bassIndex = notes.indexOf(bassPart);
    if (bassIndex !== -1) {
      bassIndex = (bassIndex + semitones + 12) % 12;
      const newBassNote = notes[bassIndex];
      return newRootNote + modifier + '/' + newBassNote + bassRest;
    }
  }

  return newRootNote + restOfChord;
}

/**
 * Convert Nashville number to chord
 */
export function nashvilleToChord(nashville: string, key: string): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const majorScale = [0, 2, 4, 5, 7, 9, 11]; // Intervals for major scale
  
  const flatToSharp: { [key: string]: string } = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };
  
  // Parse key
  let keyRoot = key[0].toUpperCase();
  if (key.length > 1 && (key[1] === '#' || key[1] === 'b')) {
    keyRoot = key.substring(0, 2);
  }
  if (flatToSharp[keyRoot]) {
    keyRoot = flatToSharp[keyRoot];
  }
  
  const keyIndex = notes.indexOf(keyRoot);
  if (keyIndex === -1) return nashville;
  
  // Parse Nashville number
  let accidental = '';
  let degree = 0;
  let rest = nashville;
  
  if (rest[0] === 'b') {
    accidental = 'b';
    rest = rest.substring(1);
  } else if (rest[0] === '#') {
    accidental = '#';
    rest = rest.substring(1);
  }
  
  if (rest.length > 0 && rest[0] >= '1' && rest[0] <= '7') {
    degree = parseInt(rest[0]) - 1; // 0-indexed
    rest = rest.substring(1);
  } else {
    return nashville; // Not a valid Nashville number
  }
  
  // Calculate note
  let interval = majorScale[degree];
  if (accidental === 'b') interval -= 1;
  if (accidental === '#') interval += 1;
  
  const noteIndex = (keyIndex + interval + 12) % 12;
  const noteName = notes[noteIndex];
  
  return noteName + rest;
}

/**
 * Convert chord to Nashville number
 */
export function chordToNashville(chord: string, key: string): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  
  const flatToSharp: { [key: string]: string } = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };
  
  // Already Nashville
  if (isNashvilleNumber(chord)) return chord;
  
  // Parse chord root
  let rootNote = chord[0].toUpperCase();
  let restOfChord = chord.substring(1);
  
  if (chord.length > 1 && (chord[1] === '#' || chord[1] === 'b')) {
    rootNote = chord.substring(0, 2);
    restOfChord = chord.substring(2);
  }
  
  if (flatToSharp[rootNote]) {
    rootNote = flatToSharp[rootNote];
  }
  
  // Parse key
  let keyRoot = key[0].toUpperCase();
  if (key.length > 1 && (key[1] === '#' || key[1] === 'b')) {
    keyRoot = key.substring(0, 2);
  }
  if (flatToSharp[keyRoot]) {
    keyRoot = flatToSharp[keyRoot];
  }
  
  const rootIndex = notes.indexOf(rootNote);
  const keyIndex = notes.indexOf(keyRoot);
  
  if (rootIndex === -1 || keyIndex === -1) return chord;
  
  const interval = (rootIndex - keyIndex + 12) % 12;
  
  // Find which scale degree this interval corresponds to
  let degree = -1;
  let accidental = '';
  
  for (let i = 0; i < majorScale.length; i++) {
    if (majorScale[i] === interval) {
      degree = i + 1;
      break;
    } else if (majorScale[i] === interval + 1) {
      degree = i + 1;
      accidental = 'b';
      break;
    } else if (majorScale[i] === interval - 1) {
      degree = i + 1;
      accidental = '#';
      break;
    }
  }
  
  if (degree === -1) {
    // Handle edge cases
    if (interval === 1) return 'b2' + restOfChord;
    if (interval === 3) return 'b3' + restOfChord;
    if (interval === 6) return '#4' + restOfChord;
    if (interval === 8) return 'b6' + restOfChord;
    if (interval === 10) return 'b7' + restOfChord;
    return chord;
  }
  
  return accidental + degree + restOfChord;
}

/**
 * Transpose all chords in parsed lyrics
 */
export function transposeLyrics(parsedLyrics: ChordLine[], semitones: number): ChordLine[] {
  if (semitones === 0) return parsedLyrics;
  
  return parsedLyrics.map(line => {
    // Transpose section chords
    if ((line.type === 'section_with_chords' || line.type === 'chords_only') && line.sectionChords && line.originalChordText) {
      let transposedText = line.originalChordText;
      const transposedChords: string[] = [];
      
      const sortedChords = [...line.sectionChords].sort((a, b) => b.length - a.length);
      
      sortedChords.forEach(chord => {
        const transposedChord = line.isNashville ? nashvilleToChord(chord, 'C') : transposeChord(chord, semitones);
        transposedChords.push(transposedChord);
        
        const regex = new RegExp(`\\b${chord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        transposedText = transposedText.replace(regex, transposedChord);
      });
      
      return {
        ...line,
        sectionChords: transposedChords,
        originalChordText: transposedText,
        content: line.sectionName ? `${line.sectionName}: ${transposedText}` : transposedText
      };
    }
    
    // Transpose inline/above chords
    if (line.chords) {
      return {
        ...line,
        chords: line.chords.map(c => ({
          ...c,
          chord: line.isNashville ? nashvilleToChord(c.chord, 'C') : transposeChord(c.chord, semitones)
        }))
      };
    }
    
    return line;
  });
}

/**
 * Get semitones between two keys
 */
export function getSemitonesFromKey(fromKey: string, toKey: string): number {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const normalizeKey = (key: string) => {
    let normalized = key.replace('m', '').trim();
    const flatToSharp: { [key: string]: string } = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    if (flatToSharp[normalized]) {
      normalized = flatToSharp[normalized];
    }
    return normalized;
  };
  
  const fromNormalized = normalizeKey(fromKey);
  const toNormalized = normalizeKey(toKey);
  
  const fromIndex = notes.indexOf(fromNormalized);
  const toIndex = notes.indexOf(toNormalized);
  
  if (fromIndex === -1 || toIndex === -1) return 0;
  
  let semitones = toIndex - fromIndex;
  if (semitones < 0) semitones += 12;
  
  return semitones;
}

/**
 * All available keys
 */
export const ALL_KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
];

/**
 * Convert chord to scale degree
 */
export function chordToDegree(chord: string, key: string): string {
  return chordToNashville(chord, key);
}

/**
 * Convert all chords in parsed lyrics to degrees
 */
export function convertLyricsToDegrees(parsedLyrics: ChordLine[], key: string): ChordLine[] {
  return parsedLyrics.map(line => {
    if ((line.type === 'section_with_chords' || line.type === 'chords_only') && line.sectionChords) {
      const degreeChords = line.sectionChords.map(chord => chordToNashville(chord, key));
      let degreeText = line.originalChordText || '';
      
      const sortedChords = [...line.sectionChords].sort((a, b) => b.length - a.length);
      sortedChords.forEach((chord, idx) => {
        const degree = degreeChords[line.sectionChords!.indexOf(chord)];
        const regex = new RegExp(`\\b${chord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        degreeText = degreeText.replace(regex, degree);
      });
      
      return {
        ...line,
        sectionChords: degreeChords,
        originalChordText: degreeText,
        content: line.sectionName ? `${line.sectionName}: ${degreeText}` : degreeText
      };
    }
    
    if (line.chords) {
      return {
        ...line,
        chords: line.chords.map(c => ({
          ...c,
          chord: chordToNashville(c.chord, key)
        }))
      };
    }
    
    return line;
  });
}
