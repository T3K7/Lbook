# StoryTTS Desktop — Chapter Engine & Document Parsers

## 1. Chapter Detection
The engine scans incoming document lines against pre-configured and user-defined regular expressions:
- `^(?:CHƯƠNG|Chương|chương)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`
- `^(?:CHAPTER|Chapter|chapter)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`
- `^(?:HỒI|Hồi|hồi)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`
- `^(?:PHẦN|Phần|phần)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`
- `^(?:QUYỂN|Quyển|quyển)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`
- `^(?:TẬP|Tập|tập)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`
- `^(?:VOLUME|Volume|VOL|Vol)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$`

If no chapter headers are present, long texts are intelligently partitioned into chapters of approximately 1,500 words to ensure optimal reader performance and TTS responsiveness.

## 2. Chapter Operations
- **Rename**: Safely updates chapter title and maintains indices.
- **Split Chapter**: Partitions a chapter at paragraph index $P$, generating two distinct chapters.
- **Merge Chapter**: Combines Chapter $I$ and Chapter $I+1$ into a single coherent chapter.
- **Reorder**: Moves chapters up or down while maintaining strict sequential indexing.
- **Content Editing**: Allows editing the raw textual content of a chapter, triggering automatic re-parsing of paragraphs and sentences.
