# /fill-weekly

Scan each member folder under public/. For each member:

1. Find the most recent yyyy-MM-dd.md meeting log.
2. Read and parse it to extract:
   - managerFeedbackDate (the meeting date from the report)
   - pocsThisWeek and pocsLastWeek (number of POCs mentioned, if any)
   - projectPRsThisWeek and projectPRsLastWeek (PR counts or PR references)
   - slackContributionsThisWeek and slackContributionsLastWeek (if mentioned)
   - keyFindings (up to 3 bullet points: top wins, challenges, or action items)
3. Leave personalCommitsThisWeek, personalCommitsLastWeek, corporateCommitsThisWeek, corporateCommitsLastWeek, pagesThisWeek, and pagesLastWeek empty — those are auto-calculated by the app.
4. Write the result to public/<member>/weekly.json using:

```
curl -X PUT http://localhost:3001/api/users/<member>/weekly \
  -H "Content-Type: application/json" \
  -d '{
    "personalCommitsThisWeek": "",
    "personalCommitsLastWeek": "",
    "corporateCommitsThisWeek": "",
    "corporateCommitsLastWeek": "",
    "pagesThisWeek": "",
    "pagesLastWeek": "",
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
