#!/usr/bin/env bash
# Concatenate all deliverable docs into docs/DOSSIER-RENDU.md, in the order
# expected by the jury. PDF conversion happens afterwards (see make dossier).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT="docs/DOSSIER-RENDU.md"

DOCS=(
  SYNTHESE        # synthesis (approach, architecture, critical analysis)
  ARCHITECTURE    # architecture and container diagrams
  DATABASE        # data modelling for the 4 databases
  API             # reference for the 86 routes
  SECURITY        # security, MFA, GDPR
  DSL             # custom query language
  PLUGINS         # desktop client plugin system
  TEST            # test strategy and results
  USER_GUIDE      # per-role user guide
  DEPLOYMENT      # install and deployment
  RUNBOOK         # operations
)

: > "$OUT"
for d in "${DOCS[@]}"; do
  if [ -f "docs/$d.md" ]; then
    cat "docs/$d.md" >> "$OUT"
    printf '\n\n' >> "$OUT"
  else
    echo "⚠  docs/$d.md introuvable, ignoré" >&2
  fi
done

echo "$OUT assemblé : $(wc -l < "$OUT") lignes, $(ls -lh "$OUT" | awk '{print $5}')"
