# /fill-weekly

Scan each member folder under public/. For each member:

1. Find the most recent yyyy-MM-dd.md meeting log.
2. Also read the member's reading.json (if it exists) to extract reading activity:
   - pagesThisWeek: total pages from books completed or read in the last 7 days
   - pagesLastWeek: total pages from books completed or read in the 7 days before that
   - Look at `booksRead[].completedDate` and `booksRead[].pageCount`, and `currentlyReading.weeklyPages.thisWeek` / `currentlyReading.weeklyPages.lastWeek`
   - If no reading data is available, leave these fields empty.
3. Read and parse the .md report to extract:
   - managerFeedbackDate (the meeting date from the report)
   - pocsThisWeek and pocsLastWeek (number of POCs mentioned, if any)
   - projectPRsThisWeek and projectPRsLastWeek (PR counts or PR references)
   - slackContributionsThisWeek and slackContributionsLastWeek (if mentioned)
   - keyFindings (up to 3 bullet points: top wins, challenges, or action items)
4. Leave personalCommitsThisWeek, personalCommitsLastWeek, corporateCommitsThisWeek, and corporateCommitsLastWeek empty — those are auto-calculated by the app.
4. Write the result to public/<member>/weekly.json using:

```
curl -X PUT http://localhost:3001/api/users/<member>/weekly \
  -H "Content-Type: application/json" \
  -d '{
    "personalCommitsThisWeek": "",
    "personalCommitsLastWeek": "",
    "corporateCommitsThisWeek": "",
    "corporateCommitsLastWeek": "",
    "pagesThisWeek": "<extracted from reading.json or empty>",
    "pagesLastWeek": "<extracted from reading.json or empty>",
    "managerFeedbackDate": "<extracted date>",
    "pocsThisWeek": "<extracted or empty>",
    "pocsLastWeek": "<extracted or empty>",
    "projectPRsThisWeek": "<extracted or empty>",
    "projectPRsLastWeek": "<extracted or empty>",
    "slackContributionsThisWeek": "<extracted or empty>",
    "slackContributionsLastWeek": "<extracted or empty>",
    "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"]
  }'
```

5. Print a summary table showing each member, whether a report was found, and what was extracted.

Important:
- If a member has no .md reports, skip them and note it in the summary.
- Only extract data that is explicitly stated in the report — do not guess or hallucinate values.
- keyFindings should capture the most actionable items: wins, blockers, and next priorities.
- The server must be running on localhost:3001 for the PUT calls to work.
