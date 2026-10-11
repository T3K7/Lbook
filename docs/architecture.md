# StoryTTS Desktop — Architecture Documentation

## 1. Architectural Layers

StoryTTS Desktop follows Clean Architecture principles:

```text
Presentation Layer (WPF UI / React SPA WebView2)
       ↓
Application Layer (Book Services, TTS Pipeline, Chapter Engine, Backup)
       ↓
Domain Layer (Book, Chapter, Paragraph, TtsChunk, Bookmark, Dictionary)
       ↑
Infrastructure Layer (SQLite, Parsers, Audio Engine, TTS Providers)
```

### Layer Principles:
- **Domain Layer**: Contains core entities and business rules. It has zero external dependencies on WPF, SQLite, or concrete TTS synthesis engines.
- **Application Layer**: Orchestrates use cases (importing documents, chunking text, managing the audio queue, prefetching audio, restoring backups).
- **Presentation Layer**: Exposes controls for Reader, Library, Chapter Editor, Dictionary, AI Models, and Settings.
- **Infrastructure Layer**: Implements I/O operations (SQLite persistence, System.Speech / Web Speech API, Edge online synthesizer, ZIP/EPUB parsing).

## 2. Windows Executable (.EXE) Strategy

The project provides dual capabilities:
1. **Interactive Web Workspace**: Instant execution, reader navigation, audio synthesis, and rule testing in any modern browser.
2. **Native Windows C# .NET 8.0 WPF Solution**: Complete C# source solution with `.sln`, `.csproj`, XAML views, SQLite-net-pcl ORM, and `build-windows-exe.bat` for building `StoryTTS.exe` as a single-file, self-contained executable for Windows x64.
