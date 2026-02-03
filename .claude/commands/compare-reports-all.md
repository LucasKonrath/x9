# /compare-reports-all

For each member folder under public/, locate the two most recent yyyy-MM-dd.md meeting logs (if present). Compare them and extract summary data: Commits (Personal and Coporate) between last 2 reports, number of personal and corporate commits on each and pages read each week. Output a JSON array; for members without 2 reports, include an entry with status: 'insufficient_reports'.
