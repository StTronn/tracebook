---
name: data-analysis
description: Load BEFORE running any SQL, sqlite3, DuckDB or pandas query to answer a question from data (database, CSV, spreadsheet, logs). Checklist that prevents plausible-but-wrong numbers — locate the data the question refers to, verify the result, output the requested shape.
when_to_use: Any question asking how many, count, total, average, top, funnel, conversion, sessions, users, revenue, or a result table computed from a .sqlite/.db/.csv/.xlsx/.parquet file.
---

# Answering questions from data

A wrong number that looks plausible is the worst outcome. Spend turns on looking at the data, not on guessing.

## 1. Locate the data before computing
- Find where the question's terms live: search table/column names (schema, information_schema) and, for candidate
  columns, their values (`LIKE '%term%'`, top values with counts).
- Small schema (≲30 tables): read it all at once. Large: search, don't dump.
- Consider every candidate location, not just the first table that looks close; pick by evidence, and note why.
- If an exact term isn't found anywhere, say so; any substitution must be stated in the answer.

## 2. Define what you count before computing
- Write down: the unit (sessions / users / orders / rows), the grain, filters, ordering or time conditions.
- "Unique X" → COUNT(DISTINCT X). "Then / in that order" → compare timestamps within the same unit.

## 3. Sanity-check the intermediate results
- Row counts before/after every join (unexpected growth = fan-out).
- NULLs, duplicates, ties in timestamps, mixed types in key columns.
- See references/checks.md for ready-made check queries.

## 4. Cross-check the final number
- Compute it a second, independent way (different query shape, or list the qualifying rows and count them by eye if small).
- If the two disagree, find out why before answering.

## 5. Answer
- Output exactly the format asked for (file, columns, header).
- In your reply: the number, the query used, and any assumption or substitution made.
