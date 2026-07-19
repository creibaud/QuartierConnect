#!/usr/bin/env bash
# Audit — and optionally remove — conversations a running stack holds but the
# shipped dataset does not.
#
#   Usage: ./scripts/prune-demo-threads.sh           # audit only, writes nothing
#          ./scripts/prune-demo-threads.sh --apply   # delete the extras
#
# Demos and real-time tests leave conversations behind. The graded artifact is
# deliverables/test-datasets/demo-dataset, so its conversations.json is the
# reference and anything else in the database is residue.
#
# The reference list is read from that file rather than hardcoded, so it cannot
# drift away from what actually ships.
#
# Removing a conversation also removes its messages and any GridFS attachment
# those messages own: messages.conversationId is a plain string with no foreign
# key, so deleting the conversation alone would leave the rest orphaned.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

REFERENCE_FILE="deliverables/test-datasets/demo-dataset/mongo/conversations.json"
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

PG_USER="$(env_get POSTGRES_USER)";      PG_USER="${PG_USER:-qc}"
PG_DB="$(env_get POSTGRES_DB)";          PG_DB="${PG_DB:-quartierconnect}"
MONGO_USER="$(env_get MONGO_ROOT_USER)"; MONGO_USER="${MONGO_USER:-root}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"
MONGO_DB="quartierconnect"

# No -i: both commands carry their payload as an argument, and attaching stdin
# would swallow the confirmation the operator types later.
mongosh_eval() {
  docker exec docker-mongo-1 mongosh -u "$MONGO_USER" -p "$MONGO_PASS" \
    --authenticationDatabase admin --quiet "$MONGO_DB" --eval "$1"
}

psql_run() {
  docker exec docker-postgres-1 psql -U "$PG_USER" -d "$PG_DB" -Atc "$1"
}

[ -f "$REFERENCE_FILE" ] || { echo "✗ Reference dataset missing: $REFERENCE_FILE" >&2; exit 1; }

REFERENCE_IDS="$(python3 - "$REFERENCE_FILE" <<'PY'
import json, sys
docs = json.load(open(sys.argv[1]))
ids = [d["_id"]["$oid"] if isinstance(d["_id"], dict) else d["_id"] for d in docs]
print(json.dumps(ids))
PY
)"
REFERENCE_COUNT="$(python3 -c 'import json,sys; print(len(json.loads(sys.argv[1])))' "$REFERENCE_IDS")"
echo "→ Reference holds $REFERENCE_COUNT conversations"

AUDIT_JS="$(cat <<EOF
const reference = new Set(${REFERENCE_IDS});
const conversations = db.conversations.find({}, { participants: 1, isGroup: 1, groupName: 1 }).toArray();
const matched = conversations.filter((c) => reference.has(String(c._id)));
const extra = conversations.filter((c) => !reference.has(String(c._id)));
print(JSON.stringify({
  total: conversations.length,
  matched: matched.length,
  extra: extra.map((c) => ({
    id: String(c._id),
    isGroup: Boolean(c.isGroup),
    groupName: c.groupName || null,
    participants: c.participants,
    messages: db.messages.countDocuments({ conversationId: String(c._id) }),
    preview: db.messages
      .find({ conversationId: String(c._id) }, { content: 1, type: 1, senderId: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .limit(8)
      .toArray()
      .map((m) => ({ type: m.type, senderId: m.senderId, content: m.content })),
  })),
}));
EOF
)"
REPORT="$(mongosh_eval "$AUDIT_JS")"

TOTAL="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["total"])' <<<"$REPORT")"
MATCHED="$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["matched"])' <<<"$REPORT")"
EXTRA_IDS="$(python3 -c 'import json,sys; print(" ".join(c["id"] for c in json.loads(sys.stdin.read())["extra"]))' <<<"$REPORT")"

echo "→ Database holds $TOTAL conversations, $MATCHED of them from the reference"

# Without the reference threads present, the whitelist means nothing: every
# conversation would look like residue and the script would offer to wipe the
# lot. That happens when a stack was seeded directly instead of imported.
if [ "$MATCHED" -eq 0 ]; then
  echo "✗ None of the $REFERENCE_COUNT reference conversations are in this database." >&2
  echo "  It was seeded independently, so it was never a copy of the deliverable" >&2
  echo "  and there is nothing to reconcile. Refusing to touch anything." >&2
  exit 1
fi

if [ "$MATCHED" -lt "$REFERENCE_COUNT" ]; then
  echo "⚠  $((REFERENCE_COUNT - MATCHED)) reference conversations are MISSING here." >&2
  echo "   That is a different problem from residue; fix it before pruning." >&2
  [ "$APPLY" -eq 1 ] && exit 1
fi

if [ -z "$EXTRA_IDS" ]; then
  echo "✓ No residue: the database matches the deliverable."
  exit 0
fi

# Resolve participants to real people so the operator can recognise the thread
# before deleting it. Conversations store PostgreSQL user ids, so the names only
# exist on the other side.
PARTICIPANT_IDS="$(python3 - "$REPORT" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
ids = {p for c in data["extra"] for p in c["participants"]}
print(",".join("'%s'" % i for i in sorted(ids)))
PY
)"
NAMES="$(psql_run "SELECT id || E'\t' || email FROM users WHERE id IN ($PARTICIPANT_IDS)" || true)"

echo
echo "Conversations not present in the deliverable:"
python3 - "$NAMES" "$REPORT" <<'PY'
import json, sys
names = dict(
    line.split("\t", 1) for line in sys.argv[1].splitlines() if "\t" in line
)
data = json.loads(sys.argv[2])
for c in data["extra"]:
    who = ", ".join(names.get(p, p) for p in c["participants"])
    label = c["groupName"] or ("group" if c["isGroup"] else "1:1")
    print(f"\n  {c['id']}  [{label}]  {who}")
    print(f"  {c['messages']} message(s):")
    for m in c["preview"]:
        body = m["content"] if m["type"] == "text" else f"<{m['type']}>"
        print(f"    - {names.get(m['senderId'], m['senderId'])}: {body}")
PY

if [ "$APPLY" -eq 0 ]; then
  echo
  echo "Audit only. Re-run with --apply to delete the conversations listed above."
  exit 0
fi

echo
echo "⚠  About to delete $(wc -w <<<"$EXTRA_IDS") conversation(s), their messages"
echo "   and their attachments. This cannot be undone without a backup."
printf "   Type 'yes' to continue: "
read -r answer
[ "$answer" = "yes" ] || { echo "Aborted."; exit 1; }

EXTRA_JSON="$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1].split()))' "$EXTRA_IDS")"

PRUNE_JS="$(cat <<EOF
const extra = ${EXTRA_JSON};
let files = 0;
for (const id of extra) {
  const withFiles = db.messages
    .find({ conversationId: id, fileId: { \$ne: null } }, { fileId: 1 })
    .toArray()
    .map((m) => m.fileId);
  for (const fileId of withFiles) {
    const oid = ObjectId(fileId);
    db.messaging_files.chunks.deleteMany({ files_id: oid });
    db.messaging_files.files.deleteMany({ _id: oid });
    files += 1;
  }
  const removed = db.messages.deleteMany({ conversationId: id });
  db.conversations.deleteOne({ _id: ObjectId(id) });
  print(\`  removed \${id}: \${removed.deletedCount} message(s)\`);
}
print(\`  removed \${files} attachment(s)\`);
print(\`→ \${db.conversations.countDocuments({})} conversations remain\`);
EOF
)"
mongosh_eval "$PRUNE_JS"

echo "✓ Done. Reload the app to confirm the threads are gone."
