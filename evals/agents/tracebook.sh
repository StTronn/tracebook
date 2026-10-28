#!/bin/sh
# Mounted at /usr/local/bin/tracebook (cc-p-t): tracebook from /opt/tracebook, leaving the task's own pandas untouched.
PYTHONPATH=/opt/tracebook exec python3 -c "import sys; from tracebook.cli import main; sys.exit(main())" "$@"
