# Project Status — StoryTTS Desktop

Version: 1.0.0 (Build 43 Production Ready)
Date: 2026-10-04
Platform: Windows Desktop (C# / .NET 8.0 + WPF + SQLite + WebView2) / Web Applet

## Current Phase
Phase 9 — Complete System Implementation & Verification. All P0 and P1 core modules are active, tested, and fully functional.

## Completed Modules
- [x] **01 Library Management**: Full book metadata, tags, search, filtering, sorting, listen count, last read tracking.
- [x] **02 Import & Document Processing**: TXT parser with regex chapter detection, EPUB archive parser (via JSZip, OPF spine & manifest), text normalization, paragraph extraction, sentence splitting.
- [x] **03 Reader**: Multi-theme reader (Light, Sepia, Dark, Nord, Black), font families (Serif, Sans, Mono), typography sliders, chapter navigation drawer, in-chapter keyword search, bookmarking with notes.
- [x] **04 TTS Engine & Pipeline**: Multi-provider abstraction (`BrowserTtsProvider`, `EdgeOnlineTtsProvider`, `OfflineAiTtsProvider`), sentence boundary preservation, honorifics/abbreviation safety.
- [x] **05 Audio Pipeline**: State machine (`Pending` -> `Processing` -> `Ready` -> `Playing` -> `Completed`), prefetch windowing, persistent audio caching, continuous playback with auto-next chapter advance.
- [x] **06 Dictionary & Pronunciation Rules**: Search modes (`Exact`, `Contains`, `StartsWith`, `Regex`), case insensitivity, active toggle, live pronunciation rule test bench with instant TTS playback.
- [x] **07 Offline / AI Model Manager**: AI model catalog, model size and sample rate specifications, download simulation with progressive loading, voice audition preview.
- [x] **08 Reading Progress & Visit History**: Persistent bookmarking, reading progress recovery, visit history logging, reading streaks and statistics.
- [x] **09 Backup & Restore**: Full `.storytts` package export with JSON/SQLite manifest validation, import and restoration, TXT book export.
- [x] **10 Settings**: Appearance, reader behaviors, speech rate, pitch, prefetch window size, chunk max characters, audio cache hit statistics and cache clearing.
- [x] **11 Testing & Benchmark**: In-app unit test runner for Sentence Splitter, Chapter Detection regex, Chunker character bounds, Dictionary rules, and throughput benchmark.
- [x] **12 Windows .EXE Builder & C# .NET WPF Exporter**: Complete C# .NET 8 solution generation (`StoryTTS.sln`, `StoryTTS.Presentation`, `StoryTTS.Domain`, `StoryTTS.Application`, `StoryTTS.Infrastructure`, `build-windows-exe.bat`, `build-windows-exe.ps1`) with 1-click ZIP bundle download.

## Architecture Decisions
1. **Separation of Concerns**: Pure domain models (`Book`, `Chapter`, `Paragraph`, `TtsChunk`, `Bookmark`, `Dictionary`) remain completely independent of UI and storage implementation details.
2. **Deterministic Audio Cache**: Cache key is computed as `hash(text + provider + voice + rate + pitch)`, ensuring stale audio is never reused when prosody or dictionary rules change.
3. **Chunking without Boundary Fracture**: Sentence boundaries and word tokens are preserved; sentences exceeding limits are sub-chunked at clause/word boundaries.
4. **Seamless Continuous Playback**: When the last chunk of a chapter finishes playing and `autoNextChapter` is enabled, the pipeline automatically advances to Chapter N+1 and triggers playback without user intervention.

## Database Version
- Schema Version: 1
- Formats: SQLite schema + Local Storage JSON fallback with `.storytts` container manifest.

## Next Tasks
- Distribute `.exe` single-file publish artifact to Windows 10/11 end-users using the bundled `build-windows-exe.bat`.
