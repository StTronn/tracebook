#!/bin/bash
# Grader: Spider2's own table comparison per question (tests/grade.py) → /logs/verifier/reward.json
# {"q1": 0|1, …, "reward": fraction correct}. A missing/unreadable answer scores 0 for that question only.
set -uo pipefail
mkdir -p /logs/verifier
python3 /tests/grade.py || echo '{"reward": 0}' > /logs/verifier/reward.json
cat /logs/verifier/reward.json
exit 0
