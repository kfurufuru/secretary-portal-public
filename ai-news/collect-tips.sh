#!/bin/bash

set -e

# Configuration
REPO_DIR="/home/user/secretary-portal"
AI_NEWS_DIR="$REPO_DIR/ai-news"
DATA_FILE="$AI_NEWS_DIR/claude-code-tips-data.json"
HTML_FILE="$AI_NEWS_DIR/claude-code-tips.html"
API_KEY="${EXA_API_KEY:-ede99c31-054c-4e55-939b-3f6ca0f2cf83}"
TEMP_DIR=$(mktemp -d)

# Cleanup on exit
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting Claude Code tips collection task"

# Step 1: Perform 3 Exa API searches
log "Performing Exa API searches..."

QUERY1='{"query": "Claude Code innovative techniques 2026", "numResults": 10, "type": "neural", "useAutoprompt": true}'
QUERY2='{"query": "Claude Code hooks MCP autonomous agent", "numResults": 10, "type": "neural", "useAutoprompt": true}'
QUERY3='{"query": "Claude Code productivity workflow tips", "numResults": 10, "type": "neural", "useAutoprompt": true}'

RESULT1=$(curl -s -X POST https://api.exa.ai/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$QUERY1")

if [ $? -ne 0 ] || echo "$RESULT1" | grep -q '"error"'; then
    log "ERROR: Query 1 failed. Response: $RESULT1"
    log "Skipping update, keeping existing data"
    exit 0
fi

RESULT2=$(curl -s -X POST https://api.exa.ai/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$QUERY2")

if [ $? -ne 0 ] || echo "$RESULT2" | grep -q '"error"'; then
    log "ERROR: Query 2 failed. Response: $RESULT2"
    log "Skipping update, keeping existing data"
    exit 0
fi

RESULT3=$(curl -s -X POST https://api.exa.ai/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$QUERY3")

if [ $? -ne 0 ] || echo "$RESULT3" | grep -q '"error"'; then
    log "ERROR: Query 3 failed. Response: $RESULT3"
    log "Skipping update, keeping existing data"
    exit 0
fi

log "API searches completed successfully"

# Step 2: Process and merge results
log "Processing results..."

# Create a temporary Python script for data processing
cat > "$TEMP_DIR/process.py" << 'PYTHON_SCRIPT'
import json
import sys
from datetime import datetime
from collections import OrderedDict

api_results = [json.loads(sys.argv[1]), json.loads(sys.argv[2]), json.loads(sys.argv[3])]
data_file = sys.argv[4]

# Merge all results
all_results = []
seen_urls = set()

for result in api_results:
    if 'results' in result:
        for item in result['results']:
            url = item.get('url', '')
            if url and url not in seen_urls:
                all_results.append({
                    'url': url,
                    'title': item.get('title', 'Untitled'),
                    'summary': item.get('summary', ''),
                    'publishedDate': item.get('publishedDate', '')
                })
                seen_urls.add(url)

# Load existing data
existing_data = {'last_updated': '', 'entries': []}
try:
    with open(data_file, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
except:
    pass

# Extract existing URLs
existing_urls = {entry['url'] for entry in existing_data.get('entries', [])}

# Find new entries
new_entries = [item for item in all_results if item['url'] not in existing_urls]

log_msg = f"Found {len(new_entries)} new entries from {len(all_results)} total results"
print(log_msg, file=sys.stderr)

# Combine and sort by date (newest first)
combined = existing_data.get('entries', []) + new_entries
combined.sort(key=lambda x: x.get('publishedDate', ''), reverse=True)

# Keep only latest 50
combined = combined[:50]

# Update data
existing_data['last_updated'] = datetime.now().isoformat()
existing_data['entries'] = combined

# Save
with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(existing_data, f, ensure_ascii=False, indent=2)

print(json.dumps(existing_data))
PYTHON_SCRIPT

# Execute Python processing
PROCESSED=$(python3 "$TEMP_DIR/process.py" "$RESULT1" "$RESULT2" "$RESULT3" "$DATA_FILE" 2>&1)

if [ $? -ne 0 ]; then
    log "ERROR: Data processing failed"
    log "$PROCESSED"
    exit 0
fi

log "Data processing completed"

# Step 3: Update HTML file (already done by Python script since we're reading from JSON in HTML)
log "HTML will be updated dynamically from JSON data"

# Step 4: Git operations
log "Preparing git commit..."

cd "$REPO_DIR"

# Configure git user if needed
git config user.email "auto-collector@secretary" 2>/dev/null || git config --local user.email "auto-collector@secretary"
git config user.name "Claude Code Auto" 2>/dev/null || git config --local user.name "Claude Code Auto"

# Add files and commit if there are changes
git add ai-news/claude-code-tips.html ai-news/claude-code-tips-data.json

if ! git diff --cached --quiet; then
    COMMIT_DATE=$(date +%Y-%m-%d)
    git commit -m "auto: Claude Code tips update $COMMIT_DATE"

    # Push with retry logic
    MAX_RETRIES=4
    RETRY_DELAYS=(2 4 8 16)
    ATTEMPT=1

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
        if git push -u origin $(git rev-parse --abbrev-ref HEAD); then
            log "Successfully pushed to remote"
            break
        else
            if [ $ATTEMPT -lt $MAX_RETRIES ]; then
                DELAY=${RETRY_DELAYS[$((ATTEMPT-1))]}
                log "Push failed, retrying in ${DELAY}s (attempt $ATTEMPT/$MAX_RETRIES)"
                sleep $DELAY
            else
                log "ERROR: Push failed after $MAX_RETRIES attempts"
                exit 1
            fi
        fi
        ATTEMPT=$((ATTEMPT+1))
    done
else
    log "No changes to commit"
fi

log "Task completed successfully"
