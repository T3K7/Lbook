import { DictionaryRule } from '../types';

/**
 * Text Preprocessor for StoryTTS
 * Cleans text, formats punctuation, and applies pronunciation/dictionary replacement rules.
 */

export function cleanRawText(text: string): string {
  if (!text) return '';
  return text
    // Replace non-standard whitespace characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize unicode whitespace
    .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize quotes
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // Replace multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Applies active dictionary rules to target text in order
 */
export function applyDictionaryRules(text: string, rules: DictionaryRule[]): string {
  if (!text || !rules || rules.length === 0) return text;

  let processed = text;
  const activeRules = rules.filter(r => r.enabled && r.searchTerm.trim().length > 0);

  for (const rule of activeRules) {
    const flags = rule.caseInsensitive ? 'gi' : 'g';
    const escapedTerm = escapeRegExp(rule.searchTerm);

    try {
      switch (rule.searchMode) {
        case 'Exact': {
          // Whole word match boundary
          const regex = new RegExp(`(?<=^|\\s|[.,!?;:"'«»()[\\]])${escapedTerm}(?=$|\\s|[.,!?;:"'«»()[\\]])`, flags);
          processed = processed.replace(regex, rule.replaceTerm);
          break;
        }
        case 'Contains': {
          const regex = new RegExp(escapedTerm, flags);
          processed = processed.replace(regex, rule.replaceTerm);
          break;
        }
        case 'StartsWith': {
          const regex = new RegExp(`(?<=^|\\s)${escapedTerm}`, flags);
          processed = processed.replace(regex, rule.replaceTerm);
          break;
        }
        case 'Regex': {
          const regex = new RegExp(rule.searchTerm, flags);
          processed = processed.replace(regex, rule.replaceTerm);
          break;
        }
        default:
          break;
      }
    } catch {
      // If regex is invalid, skip safely
    }
  }

  return processed;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Full preprocessing pipeline: Clean -> Apply Rules -> Prepare for TTS engine
 */
export function preprocessTextForTts(text: string, rules: DictionaryRule[] = []): string {
  const cleaned = cleanRawText(text);
  const withRules = applyDictionaryRules(cleaned, rules);
  
  // Format numbers or reading pauses if needed
  return withRules
    .replace(/…/g, '...')
    .replace(/--/g, ' - ')
    .trim();
}
