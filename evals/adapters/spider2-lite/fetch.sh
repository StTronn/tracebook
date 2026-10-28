#!/bin/bash
# Fetch pinned Spider2-lite files into evals/.cache/spider2/:  fetch.sh <commit> <instance_id>…
# questions + eval standards + evaluate.py + gold csvs for the ids; local SQLite zip (~457 MB, once) → only the dbs used.
set -euo pipefail
commit=$1; shift
cache="$(cd "$(dirname "$0")/../.." && pwd)/.cache"; s="$cache/spider2"
mkdir -p "$s/gold" "$s/localdb"
raw="https://raw.githubusercontent.com/xlang-ai/Spider2/$commit/spider2-lite"
echo "$commit" > "$s/COMMIT"
curl -sfL "$raw/spider2-lite.jsonl" -o "$s/spider2-lite.jsonl"
curl -sfL "$raw/evaluation_suite/gold/spider2lite_eval.jsonl" -o "$s/spider2lite_eval.jsonl"
curl -sfL "$raw/evaluation_suite/evaluate.py" -o "$s/evaluate.py"
tree=$(curl -sfL "https://api.github.com/repos/xlang-ai/Spider2/git/trees/$commit?recursive=1")
[ -f "$cache/local_sqlite.zip" ] || curl -sfL -o "$cache/local_sqlite.zip" \
  "https://drive.usercontent.google.com/download?id=1coEVsCZq-Xvj9p2TnhBFoFTsY-UoYGmG&export=download&confirm=t"
for id in "$@"; do
  for f in $(echo "$tree" | python3 -c "import json,re,sys
for t in json.load(sys.stdin)['tree']:
    m=re.fullmatch(r'spider2-lite/evaluation_suite/gold/exec_result/($id(_[a-z])?\.csv)', t['path'])
    if m: print(m.group(1))"); do
    curl -sfL "$raw/evaluation_suite/gold/exec_result/$f" -o "$s/gold/$f"
  done
  db=$(python3 -c "import json,sys
for l in open('$s/spider2-lite.jsonl'):
    r=json.loads(l)
    if r['instance_id']=='$id': print(r['db'])")
  [ -f "$s/localdb/$db.sqlite" ] || unzip -o -j -q "$cache/local_sqlite.zip" "$db.sqlite" -d "$s/localdb"
  echo "$id: db=$db gold=$(ls "$s/gold" | grep -c "^$id")"
done
