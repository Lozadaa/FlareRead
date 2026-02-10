# FlareRead UX Specification

## Feature Flows

### 1. EPUB Import Flow (with Category Step)

```
User clicks "Import EPUB" (Ctrl+O or menu)
        │
        ▼
┌──────────────────────┐
│ OS File Picker       │
│ Filter: *.epub       │
└──────────┬───────────┘
           │ file selected
           ▼
┌──────────────────────────────┐
│ Import Preview Dialog        │
│                              │
│  [Book Cover]                │
│  Title: "Deep Learning"      │
│  Author: "Ian Goodfellow"    │
│                              │
│  ┌─ Category ──────────────┐ │
│  │ [Dropdown: select one]  │ │
│  │  • English              │ │
│  │  • AI/Machine Learning  │ │
│  │  • Philosophy           │ │
│  │  • Uncategorized        │ │
│  │  + Create new...        │ │
│  └─────────────────────────┘ │
│                              │
│  ┌─ Reading Mode ──────────┐ │
│  │ ○ Study   ○ Leisure     │ │
│  └─────────────────────────┘ │
│                              │
│  [Cancel]         [Import]   │
└──────────────────────────────┘
        │
        ▼
  Book appears in library
  with category badge
```

**Key behaviors:**
- Category defaults to "Uncategorized" if none selected
- "Create new..." opens inline category creation (name + color picker)
- Reading mode is optional (null = unset)
- Duplicate detection: warns if same title+author or same file path exists

### 2. Goals Page (Learning Tracks)

```
┌───────────────────────────────────────────────────────────┐
│  Goals                                                     │
│                                                           │
│  ┌─ English ─────────────────────────────────────────┐    │
│  │ 📘  Target: 3,000 hours                           │    │
│  │                                                    │    │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░░  145.5h / 3000h│    │
│  │  4.85% complete                                    │    │
│  │                                                    │    │
│  │  Sessions: 120.5h  Manual: 10h  Base: 15h          │    │
│  │  Weekly target: 10h/week                           │    │
│  │                                                    │    │
│  │  [Add Hours]  [Edit Track]                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─ AI/Machine Learning ─────────────────────────────┐    │
│  │ 🤖  Target: 500 hours                             │    │
│  │  ████████████████░░░░░░░░░░░░░░░░░  53.2h / 500h  │    │
│  │  10.64% complete                                   │    │
│  │  ...                                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─ Philosophy ──────────────────────────────────────┐    │
│  │ 🏛️  Target: 200 hours                             │    │
│  │  ██████████████████████░░░░░░░░░░░  20.3h / 200h   │    │
│  │  10.15% complete                                   │    │
│  │  ...                                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                           │
│  [+ New Track]                                            │
└───────────────────────────────────────────────────────────┘
```

**Track card breakdown:**
- Category icon + name as header
- Large progress bar with hours/target and percentage
- Time breakdown: sessions (auto-tracked), manual entries, base hours
- Weekly target indicator
- Action buttons: Add Hours, Edit Track

**"+ New Track" flow:**
1. Select or create a category
2. Set target hours
3. Optionally set weekly target, deadline, manual base hours
4. Save

### 3. Add Hours Modal

```
┌───────────────────────────────────┐
│  Add Hours                    [×] │
│                                   │
│  Category: AI/Machine Learning    │
│                                   │
│  ┌─ Time ────────────────────┐    │
│  │  Hours: [  2 ]            │    │
│  │  Minutes: [ 30 ]          │    │
│  └───────────────────────────┘    │
│                                   │
│  ┌─ Date ────────────────────┐    │
│  │  [  2025-03-15  ] 📅      │    │
│  └───────────────────────────┘    │
│                                   │
│  ┌─ Note (optional) ────────┐    │
│  │  Read chapters 5-7 of    │    │
│  │  "Hands-On ML" (physical │    │
│  │  copy)                    │    │
│  └───────────────────────────┘    │
│                                   │
│  [Cancel]           [Add Hours]   │
└───────────────────────────────────┘
```

**Key behaviors:**
- Hours and minutes are separate inputs for easy entry
- Date defaults to today
- Note is optional but recommended
- Converts to `delta_minutes` internally (hours * 60 + minutes)
- Success toast: "Added 2h 30m to AI/Machine Learning"
- Negative values allowed (for corrections)

### 4. Dashboard Goals Card

```
┌─ Learning Goals ──────────────────────┐
│                                        │
│  📘 English         4.85%   145.5h     │
│  ████░░░░░░░░░░░░░░░░░░░             │
│                                        │
│  🤖 AI/ML          10.64%   53.2h     │
│  ██████░░░░░░░░░░░░░░░░░░             │
│                                        │
│  🏛️ Philosophy     10.15%   20.3h     │
│  ██████░░░░░░░░░░░░░░░░░░             │
│                                        │
│                     [View All Goals →] │
└────────────────────────────────────────┘
```

**Key behaviors:**
- Shows top 3 tracks by completion percentage (via `db:tracks:getTopForDashboard`)
- Compact progress bars with category icon, name, percentage, and total hours
- "View All Goals" links to the full Goals page
- Updates in real-time when a session ends (dashboard re-fetches)

### 5. Reading Session → Track Integration

```
User starts reading "Deep Learning" (category: AI/ML)
        │
        ▼
Session running (active_ms incrementing every second)
        │
        ▼ user clicks "End Session"
        │
session:stop → StudySessionManager.updateSessionInDb()
        │     (persists active_ms, end_time, etc.)
        │
        ▼
Dashboard/Goals page refreshes
        │
        ▼
db:tracks:computeProgress("ai-ml-category-id")
        │
        ▼
SQL: SUM(sessions.active_ms) JOIN books WHERE category_id = ?
        │
        ▼
Track progress reflects new session time
```

**No manual intervention needed** - session time is automatically included in track progress because `computeProgress` queries sessions via book → category JOIN.

### 6. Category Reassignment Flow

```
User opens book settings / info
        │
        ▼
Changes category from "English" → "Philosophy"
        │
        ▼
db:books:update(bookId, { category_id: newCategoryId })
        │
        ▼
All sessions for this book now count toward "Philosophy" track
(computed on-demand via JOIN, not cached)
        │
        ▼
"English" track progress decreases
"Philosophy" track progress increases
```

**No migration or recalculation needed** - the JOINs handle it automatically.

## Design Principles

1. **On-demand computation**: Track progress is never cached, always computed from source data (sessions + manual entries). This ensures consistency when categories change.

2. **Minimal friction**: Import flow has category selection built-in but defaults to "Uncategorized" so users aren't forced to organize.

3. **Transparency**: The goals card breaks down time sources (sessions, manual, base) so users understand where their tracked time comes from.

4. **Real-time feedback**: Dashboard and goals pages refresh after session end to show updated progress immediately.
