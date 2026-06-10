# Claude Code Tips Auto-Collector

Automated daily task to collect Claude Code tips using Exa API and update the HTML page.

## Setup Instructions

### Local Environment (Recommended)

The script requires:
- `bash` 4.0+
- `curl` (for API calls)
- `python3` (for data processing)
- `git` (for version control)
- Network access to `api.exa.ai`

### Exa API Key

The Exa API key is already configured in the script. If you need to update it, set the environment variable:

```bash
export EXA_API_KEY="your-api-key-here"
```

### Manual Execution

Run the collection script directly:

```bash
chmod +x /home/user/secretary-portal/ai-news/collect-tips.sh
/home/user/secretary-portal/ai-news/collect-tips.sh
```

This will:
1. Query Exa API with 3 search queries
2. Process and deduplicate results
3. Merge with existing data (keeping latest 50 entries)
4. Update `claude-code-tips-data.json`
5. Commit and push to Git

### Scheduled Execution (cron)

Add to your crontab to run daily at 02:00 JST (23:00 UTC previous day):

```bash
crontab -e
```

Add this line:
```
0 23 * * * /home/user/secretary-portal/ai-news/collect-tips.sh >> /var/log/claude-tips-collector.log 2>&1
```

For MacOS with cron issues, use `launchd` instead:

Create `~/Library/LaunchAgents/com.claude.tips.collector.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.tips.collector</string>
    <key>ProgramArguments</key>
    <array>
        <string>/home/user/secretary-portal/ai-news/collect-tips.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardErrorPath</key>
    <string>/var/log/claude-tips-collector.log</string>
    <key>StandardOutPath</key>
    <string>/var/log/claude-tips-collector.log</string>
</dict>
</plist>
```

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.claude.tips.collector.plist
```

### GitHub Actions Setup

Add `.github/workflows/claude-tips-collector.yml`:

```yaml
name: Claude Code Tips Collector

on:
  schedule:
    # 02:00 JST = 17:00 UTC previous day
    - cron: '0 17 * * *'
  workflow_dispatch:

jobs:
  collect:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Set up Git
        run: |
          git config --global user.email "auto-collector@secretary"
          git config --global user.name "Claude Code Auto"
      
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y curl python3
      
      - name: Run collection task
        env:
          EXA_API_KEY: ${{ secrets.EXA_API_KEY }}
        run: |
          chmod +x ai-news/collect-tips.sh
          ai-news/collect-tips.sh
      
      - name: Push changes
        run: |
          git push origin $(git rev-parse --abbrev-ref HEAD)
```

Then add the `EXA_API_KEY` as a GitHub secret.

## File Structure

```
ai-news/
├── README.md                      # This file
├── claude-code-tips.html          # Web page displaying tips
├── claude-code-tips-data.json     # Data file (auto-updated)
└── collect-tips.sh                # Collection script
```

## How It Works

### Step 1: Exa API Search
Executes 3 neural searches:
- "Claude Code innovative techniques 2026"
- "Claude Code hooks MCP autonomous agent"
- "Claude Code productivity workflow tips"

Each query returns up to 10 results with title, summary, URL, and published date.

### Step 2: Data Processing
- Merges all results
- Removes duplicate URLs
- Identifies new entries (not in existing data)
- Combines with existing entries
- Sorts by published date (newest first)
- Keeps only latest 50 entries

### Step 3: HTML Update
The HTML file (`claude-code-tips.html`) dynamically loads from `claude-code-tips-data.json` using JavaScript:
- Displays top 30 entries
- Shows title, summary, date, and link
- Updates "Last Updated" timestamp

No manual HTML editing needed—it's auto-populated by the JSON data.

### Step 4: Git Commit & Push
```bash
git config user.email "auto-collector@secretary"
git config user.name "Claude Code Auto"
git add ai-news/claude-code-tips.html ai-news/claude-code-tips-data.json
git commit -m "auto: Claude Code tips update 2026-05-15"
git push
```

With retry logic (up to 4 attempts with exponential backoff).

## Error Handling

If API calls fail (HTTP 4xx/5xx):
- Script logs the error
- Keeps existing data intact
- Does not create a commit
- Exits gracefully

## Testing

To test the collection script locally:

```bash
# Test with mock API responses
EXA_API_KEY="test-key" bash -x ai-news/collect-tips.sh

# Check generated data
cat ai-news/claude-code-tips-data.json | python3 -m json.tool

# View HTML in browser
open ai-news/claude-code-tips.html
```

## Monitoring

Check the collector logs:

```bash
# If using cron
tail -f /var/log/claude-tips-collector.log

# If using GitHub Actions
# Check: https://github.com/kfurufuru/secretary-portal/actions
```

## Troubleshooting

### "Host not in allowlist" Error
The cloud environment has network restrictions. Run the script in:
- Your local machine
- GitHub Actions
- Your own CI/CD server with network access

### "git push" fails
- Verify SSH keys are configured: `ssh -T git@github.com`
- Check repo permissions: `git remote -v`
- Ensure git user is configured correctly

### API returns empty results
- Check Exa API key is valid
- Verify rate limits haven't been exceeded
- Try with different search queries

## Last Updated

- **JSON Data**: See `last_updated` field in `claude-code-tips-data.json`
- **Script Last Modified**: See git history

## Additional Resources

- [Exa API Documentation](https://docs.exa.ai)
- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [MCP (Model Context Protocol)](https://github.com/anthropics/mcp)
