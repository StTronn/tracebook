# Check queries (SQLite/DuckDB)

Schema + sizes
  .schema
  SELECT name FROM sqlite_master WHERE type='table';
  SELECT COUNT(*) FROM <t>;

Find where a value lives (repeat per text column)
  SELECT '<t>.<col>', COUNT(*) FROM <t> WHERE <col> LIKE '%<term>%';

Distribution of a key column
  SELECT <col>, COUNT(*) FROM <t> GROUP BY 1 ORDER BY 2 DESC LIMIT 30;

Join fan-out
  SELECT COUNT(*) FROM a;  SELECT COUNT(*) FROM a JOIN b USING(k);   -- should not grow unless 1:N intended
  SELECT k, COUNT(*) FROM b GROUP BY k HAVING COUNT(*) > 1 LIMIT 10;   -- duplicate keys

Nulls / ties
  SELECT COUNT(*) - COUNT(<col>) AS nulls FROM <t>;
  SELECT <unit>, <ts>, COUNT(*) FROM <t> GROUP BY 1,2 HAVING COUNT(*) > 1 LIMIT 10;   -- same-timestamp ties break "in order"

List-then-count cross-check
  SELECT DISTINCT <unit> FROM (...your qualifying rows...);   -- eyeball if small, then COUNT
