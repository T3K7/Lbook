# StoryTTS Desktop — TTS Pipeline & Audio Queue

## 1. Pipeline Flow

```text
Raw Paragraphs
      ↓
Text Preprocessor (BOM removal, unicode normalization)
      ↓
Dictionary Engine (Applies Exact, Contains, StartsWith, Regex rules in order)
      ↓
Sentence Splitter (Boundary detection, protects honorifics like ThS., TS., GS.)
      ↓
Chunker (Limits chunk character bounds without word splitting)
      ↓
TTS Queue (Pending → Processing → Ready → Playing → Completed)
      ↓
Audio Cache Check (Hit → return cached audio; Miss → synthesize & store)
      ↓
TTS Provider (Windows SAPI / Browser / Edge Neural / Offline AI)
      ↓
Audio Player & Karaoke Sentence Sync
```

## 2. Prefetch Windowing & Continuous Playback

When Chunk $N$ is playing:
- Chunks $N+1$, $N+2$, $\dots$, $N+K$ (where $K$ is `prefetchWindowSize`) are synthesized and prepared in background memory.
- When Chunk $N$ completes, Chunk $N+1$ begins playing immediately with $0\text{ms}$ audible gap.
- When the final chunk of Chapter $C$ completes: if `autoNextChapter` is true, the reader triggers `onChapterCompleteCallback`, loads Chapter $C+1$, regenerates the queue, and continues reading automatically.
