# Claude Code

## Project context
- Frontend: Vite + React in [src/](src/)
- Team data lives under [public/](public/), one folder per member.
- Each member folder typically contains:
  - `presentations.json`
  - `reading.json`
  - `reinforcements.json`
  - Some folders may include dated `.md` reports (e.g., `2025-06-22.md`).

## Conventions
- Prefer reading JSON from [public/](public/) directly.
- A “report” refers to dated `.md` files inside a member folder.

## Slash commands

### /insights
Use this to summarize each member’s recent activity from meeting logs and surface highlights.

**Prompt**
Analyze the team member meeting logs under public/. For each member folder: read any yyyy-MM-dd.md files, summarize key points, action items, and risks; flag missing or empty logs; and provide 2–3 insights or trends. Output a concise table and a short bullet list per member.

### /compare-reports
Use this to compare the two most recent dated `.md` meeting logs in a member folder and extract summary deltas.

**Prompt (single member)**
In public/<member>/, find the two most recent *.md reports by date in filename. Compare them and extract summary data: top themes, changes in priorities, notable wins/risks, and action items. Output a brief diff-style summary and a JSON object with fields: member, reportA, reportB, themes, priorityChanges, wins, risks, actions.

**Prompt (all members)**
For each member folder under public/, locate the two most recent *.md reports (if present). Compare them and extract summary data with fields: member, reportA, reportB, themes, priorityChanges, wins, risks, actions. Output a JSON array; for members without 2 reports, include an entry with status: 'insufficient_reports'.

## Notes
- Replace `<member>` with the folder name (e.g., `LucasKonrath`).
- If there are no `.md` files, skip report comparison and mark as insufficient.
