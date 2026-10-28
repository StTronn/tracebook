FROM ghcr.io/laude-institute/t-bench/ubuntu-24-04:20250624

WORKDIR /app

# Agent-neutral: sqlite3 + pandas for the agent (pandas is also what the grader, tests/compare.py, needs);
# curl/ca-certificates/procps so agents can install their own runtime (e.g. Claude Code's native installer).
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip sqlite3 curl ca-certificates procps && \
    pip3 install --break-system-packages pandas==2.2.3 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY data/ /app/data/
