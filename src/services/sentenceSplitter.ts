/**
 * Sentence Splitter for StoryTTS Desktop
 * Supports Vietnamese & English boundary detection, dialogue quotation, honorifics, and numerals.
 */

// Common honorifics and abbreviations to avoid splitting on
const ABBREVIATIONS = [
  'ThS', 'TS', 'BS', 'PGS', 'GS', 'TP', 'Q', 'P', 'TX', 'TT',
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'vs', 'etc',
  'v.v', 'v.v...', 'tp', 'đ/c', 'đc', 'ks', 'nsưt', 'nsnd'
];

export function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Pre-normalize common ellipses and multiple periods
  let normalized = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0) return [];

  // Protect abbreviations with a placeholder
  const protectedAbbrs: { key: string; original: string }[] = [];
  ABBREVIATIONS.forEach((abbr, idx) => {
    const regex = new RegExp(`\\b${abbr}\\.`, 'gi');
    normalized = normalized.replace(regex, (match) => {
      const key = `__ABBR_${idx}_${Math.random().toString(36).substring(2, 6)}__`;
      protectedAbbrs.push({ key, original: match });
      return key;
    });
  });

  // Protect decimal numbers like 3.14 or 12.500
  normalized = normalized.replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

  // Regex to split on sentence delimiters (. ? ! …) followed by quotes or whitespace
  // Captures trailing punctuation and quotes with the sentence
  const sentenceRegex = /([^.?!…]+[.?!…]+(?:["'”’»\)]+)?(?=\s+|$)|[^.?!…]+$)/g;
  const rawSentences = normalized.match(sentenceRegex) || [normalized];

  const results: string[] = [];

  for (let s of rawSentences) {
    let restored = s;
    // Restore decimal numbers
    restored = restored.replace(/__DOT__/g, '.');
    // Restore protected abbreviations
    for (const item of protectedAbbrs) {
      restored = restored.replace(new RegExp(item.key, 'g'), item.original);
    }
    const trimmed = restored.trim();
    if (trimmed.length > 0) {
      results.push(trimmed);
    }
  }

  return results.length > 0 ? results : [text.trim()];
}
