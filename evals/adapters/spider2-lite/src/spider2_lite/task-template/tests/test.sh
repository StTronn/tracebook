#!/bin/bash
# Grader 1 (correct): Spider2's own table comparison against the gold result(s) → /logs/verifier/reward.txt
# (template filled in by adapter.py: a doubled dollar sign is a literal one)
set -uo pipefail
mkdir -p /logs/verifier
s=$$(python3 /tests/compare.py /app/answer.csv /tests/gold "${instance_id}" /tests/eval.json)
[ "$$s" = "1" ] || s=0
echo "$$s" > /logs/verifier/reward.txt
echo "reward=$$s"
exit 0
