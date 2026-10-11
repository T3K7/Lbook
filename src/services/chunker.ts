import { Paragraph, TtsChunk, DictionaryRule } from '../types';
import { preprocessTextForTts } from './textPreprocessor';

export interface ChunkOptions {
  maxCharacters?: number; // Default ~240 characters for fast audio synthesis
  providerId: string;
  voice: string;
}

/**
 * Creates TTS Chunks from an array of Paragraphs with sentence boundaries
 */
export function createChunksFromParagraphs(
  chapterId: string,
  paragraphs: Paragraph[],
  rules: DictionaryRule[] = [],
  options: ChunkOptions = { maxCharacters: 240, providerId: 'browser', voice: '' }
): TtsChunk[] {
  const chunks: TtsChunk[] = [];
  let sequence = 0;
  const maxChars = options.maxCharacters || 240;

  paragraphs.forEach((para) => {
    // If paragraph has pre-split sentences, use them; otherwise split
    const sentences = para.sentences && para.sentences.length > 0 
      ? para.sentences 
      : [para.text];

    let currentAccumulated = '';
    let currentRaw = '';
    let startSentenceIdx = 0;

    sentences.forEach((sentence, sIdx) => {
      const cleanRaw = sentence.trim();
      if (!cleanRaw) return;

      const processedSentence = preprocessTextForTts(cleanRaw, rules);

      // If this single sentence is huge (> maxChars), chunk it by words
      if (processedSentence.length > maxChars) {
        // Flush any accumulated buffer first
        if (currentAccumulated.trim()) {
          chunks.push({
            id: `${chapterId}_p${para.index}_c${sequence}`,
            chapterId,
            paragraphIndex: para.index,
            sentenceIndex: startSentenceIdx,
            sequence: sequence++,
            rawText: currentRaw.trim(),
            processedText: currentAccumulated.trim(),
            characterCount: currentAccumulated.trim().length,
            status: 'Pending',
            providerId: options.providerId,
            voice: options.voice,
          });
          currentAccumulated = '';
          currentRaw = '';
        }

        // Sub-chunk oversized sentence by clauses/words
        const words = cleanRaw.split(' ');
        let subRaw = '';
        let subProc = '';

        words.forEach((word) => {
          const testProc = subProc ? `${subProc} ${word}` : word;
          if (testProc.length > maxChars && subProc) {
            chunks.push({
              id: `${chapterId}_p${para.index}_c${sequence}`,
              chapterId,
              paragraphIndex: para.index,
              sentenceIndex: sIdx,
              sequence: sequence++,
              rawText: subRaw.trim(),
              processedText: preprocessTextForTts(subProc.trim(), rules),
              characterCount: subProc.trim().length,
              status: 'Pending',
              providerId: options.providerId,
              voice: options.voice,
            });
            subRaw = word;
            subProc = word;
          } else {
            subRaw = subRaw ? `${subRaw} ${word}` : word;
            subProc = testProc;
          }
        });

        if (subProc.trim()) {
          chunks.push({
            id: `${chapterId}_p${para.index}_c${sequence}`,
            chapterId,
            paragraphIndex: para.index,
            sentenceIndex: sIdx,
            sequence: sequence++,
            rawText: subRaw.trim(),
            processedText: preprocessTextForTts(subProc.trim(), rules),
            characterCount: subProc.trim().length,
            status: 'Pending',
            providerId: options.providerId,
            voice: options.voice,
          });
        }
        return;
      }

      // Check if adding this sentence exceeds maxChars
      if (currentAccumulated.length + processedSentence.length + 1 > maxChars && currentAccumulated.length > 0) {
        // Flush current chunk
        chunks.push({
          id: `${chapterId}_p${para.index}_c${sequence}`,
          chapterId,
          paragraphIndex: para.index,
          sentenceIndex: startSentenceIdx,
          sequence: sequence++,
          rawText: currentRaw.trim(),
          processedText: currentAccumulated.trim(),
          characterCount: currentAccumulated.trim().length,
          status: 'Pending',
          providerId: options.providerId,
          voice: options.voice,
        });

        currentAccumulated = processedSentence;
        currentRaw = cleanRaw;
        startSentenceIdx = sIdx;
      } else {
        if (!currentAccumulated) {
          startSentenceIdx = sIdx;
        }
        currentAccumulated = currentAccumulated ? `${currentAccumulated} ${processedSentence}` : processedSentence;
        currentRaw = currentRaw ? `${currentRaw} ${cleanRaw}` : cleanRaw;
      }
    });

    // Flush any remaining text in this paragraph
    if (currentAccumulated.trim().length > 0) {
      chunks.push({
        id: `${chapterId}_p${para.index}_c${sequence}`,
        chapterId,
        paragraphIndex: para.index,
        sentenceIndex: startSentenceIdx,
        sequence: sequence++,
        rawText: currentRaw.trim(),
        processedText: currentAccumulated.trim(),
        characterCount: currentAccumulated.trim().length,
        status: 'Pending',
        providerId: options.providerId,
        voice: options.voice,
      });
    }
  });

  return chunks;
}
