# StoryTTS Desktop — Database & Entity Relational Model

## 1. Relational Schema (SQLite)

```sql
CREATE TABLE Books (
    Id TEXT PRIMARY KEY,
    Title TEXT NOT NULL,
    Author TEXT,
    Description TEXT,
    Language TEXT DEFAULT 'vi',
    CoverImagePath TEXT,
    TotalChapters INTEGER DEFAULT 0,
    LastReadChapterId TEXT,
    LastReadPosition INTEGER DEFAULT 0,
    LastReadSentenceIndex INTEGER DEFAULT 0,
    ListenCount INTEGER DEFAULT 0,
    LastReadTime TEXT,
    SourcePath TEXT,
    SourceType TEXT DEFAULT 'txt',
    Tags TEXT,
    CreatedAt TEXT,
    UpdatedAt TEXT
);

CREATE TABLE Chapters (
    Id TEXT PRIMARY KEY,
    BookId TEXT NOT NULL,
    Title TEXT NOT NULL,
    ChapterIndex INTEGER NOT NULL,
    Content TEXT NOT NULL,
    WordCount INTEGER DEFAULT 0,
    SourceUrl TEXT,
    FOREIGN KEY(BookId) REFERENCES Books(Id) ON DELETE CASCADE
);

CREATE TABLE Paragraphs (
    Id TEXT PRIMARY KEY,
    ChapterId TEXT NOT NULL,
    ParagraphIndex INTEGER NOT NULL,
    Text TEXT NOT NULL,
    FOREIGN KEY(ChapterId) REFERENCES Chapters(Id) ON DELETE CASCADE
);

CREATE TABLE Bookmarks (
    Id TEXT PRIMARY KEY,
    BookId TEXT NOT NULL,
    ChapterId TEXT NOT NULL,
    ParagraphIndex INTEGER NOT NULL,
    SentenceIndex INTEGER NOT NULL,
    Snippet TEXT,
    Note TEXT,
    CreatedAt TEXT,
    FOREIGN KEY(BookId) REFERENCES Books(Id) ON DELETE CASCADE
);

CREATE TABLE Dictionaries (
    Id TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Description TEXT,
    IsGlobal INTEGER DEFAULT 1,
    BookId TEXT,
    CreatedAt TEXT
);

CREATE TABLE DictionaryRules (
    Id TEXT PRIMARY KEY,
    DictionaryId TEXT NOT NULL,
    SearchTerm TEXT NOT NULL,
    ReplaceTerm TEXT NOT NULL,
    SearchMode TEXT DEFAULT 'Exact', -- 'Exact', 'Contains', 'StartsWith', 'Regex'
    CaseInsensitive INTEGER DEFAULT 1,
    Enabled INTEGER DEFAULT 1,
    FOREIGN KEY(DictionaryId) REFERENCES Dictionaries(Id) ON DELETE CASCADE
);

CREATE TABLE AudioCache (
    Id TEXT PRIMARY KEY,
    CacheKey TEXT UNIQUE NOT NULL,
    TextHash TEXT NOT NULL,
    Provider TEXT NOT NULL,
    Voice TEXT NOT NULL,
    Rate REAL DEFAULT 1.0,
    Pitch REAL DEFAULT 1.0,
    Duration INTEGER,
    FilePath TEXT,
    CreatedAt TEXT,
    LastAccessedAt TEXT
);
```

## 2. Backup Container (.storytts)
The `.storytts` package format packages the SQLite database dump and manifest validation header for seamless import/export across Windows installations.
