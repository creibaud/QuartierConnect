#!/usr/bin/env bash
# Assemble tous les documents du dossier de rendu en un seul fichier Markdown
# (docs/DOSSIER-RENDU.md), dans l'ordre attendu par le jury. La conversion en
# PDF se fait ensuite avec l'outil de rendu (voir README / make dossier).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT="docs/DOSSIER-RENDU.md"

# Ordre du dossier : synthèse, dossier technique, utilisation, exploitation.
DOCS=(
  SYNTHESE        # document de synthèse (démarche, architecture, analyse critique)
  ARCHITECTURE    # schémas d'architecture et conteneurs
  DATABASE        # modélisation des 4 bases
  API             # référence des 86 routes
  SECURITY        # sécurité, MFA, RGPD
  DSL             # langage de requête maison
  PLUGINS         # système de plugins du client lourd
  TEST            # stratégie et résultats de tests
  USER_GUIDE      # dossier d'utilisation par rôle
  DEPLOYMENT      # installation et déploiement
  RUNBOOK         # exploitation
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
