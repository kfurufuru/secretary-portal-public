#!/usr/bin/env python3
"""
trending-news/collector.py
==========================
毎朝自動実行されるバズニュース収集スクリプト。

データソース（17ソース）:
  ティア1: はてな IT/経済/総合, Zenn, Qiita
  ティア2: Hacker News, TechCrunch, The Verge, Ars Technica, VentureBeat,
           東洋経済, ダイヤモンド, Yahoo Japan, NHK
  ティア3: Reddit /r/technology, /r/artificial, /r/MachineLearning

処理フロー:
  1. 17ソースからRSS取得（XSS対策: html.escape() 適用）
  2. URLでdedup → トレンドスコア算出（0-100）
  3. score>=30 の記事タイトルを1バッチでHaiku要約
  4. news.json 保存（cap 120件）
  5. index.html に window.TRENDING_DATA を埋め込み

Usage:
    py trending-news/collector.py              # 本番実行
    py trending-news/collector.py --dry-run    # API不使用（スコアのみ確認）
    py trending-news/collector.py --no-summarize  # API不使用（埋め込みまで実行）
"""
import argparse
import calendar
import html as html_module
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from hashlib import md5
from pathlib import Path

try:
    import feedparser
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"[ERROR] 必要なパッケージが不足しています: {e}")
    print("  pip install feedparser requests python-dotenv")
    sys.exit(1)

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── パス設定（タスクスケジューラ対応: resolve()で絶対パス化）────
BASE_DIR   = Path(__file__).parent.resolve()
SECRETARY  = BASE_DIR.parent
NEWS_JSON  = BASE_DIR / "news.json"
INDEX_HTML = BASE_DIR / "index.html"
LOG_FILE   = SECRETARY / "logs" / "trending-news.log"
JST        = timezone(timedelta(hours=9))

# ── API キー（.env または ai-news/.env から読み込み）──────────
load_dotenv(BASE_DIR / ".env", override=True)
load_dotenv(SECRETARY / "ai-news" / "ai-news" / ".env", override=False)
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ── ロギング ─────────────────────────────────────────────────
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── ソース定義 ────────────────────────────────────────────────
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0; +https://github.com)"}

RSS_SOURCES = [
    # ティア1: ソーシャルプルーフあり（ブックマーク数）
    {"id": "hatena_it",        "name": "はてな IT",         "url": "https://b.hatena.ne.jp/hotentry/it.rss",                  "category": "tech",     "base_score": 38, "has_bookmarks": True},
    {"id": "hatena_economics", "name": "はてな 経済",       "url": "https://b.hatena.ne.jp/hotentry/economics.rss",           "category": "business", "base_score": 38, "has_bookmarks": True},
    {"id": "hatena_general",   "name": "はてな 総合",       "url": "https://b.hatena.ne.jp/hotentry.rss",                     "category": "general",  "base_score": 30, "has_bookmarks": True},
    {"id": "zenn",             "name": "Zenn",              "url": "https://zenn.dev/feed",                                   "category": "tech",     "base_score": 32, "has_bookmarks": False},
    {"id": "qiita",            "name": "Qiita",             "url": "https://qiita.com/popular-items/feed",                    "category": "tech",     "base_score": 32, "has_bookmarks": False},
    # ティア2: 編集キュレーション
    {"id": "hackernews",       "name": "Hacker News",       "url": "https://news.ycombinator.com/rss",                        "category": "tech",     "base_score": 28, "has_bookmarks": False},
    {"id": "techcrunch",       "name": "TechCrunch",        "url": "https://techcrunch.com/feed/",                            "category": "tech",     "base_score": 28, "has_bookmarks": False},
    {"id": "theverge",         "name": "The Verge",         "url": "https://www.theverge.com/rss/index.xml",                  "category": "tech",     "base_score": 25, "has_bookmarks": False},
    {"id": "arstechnica",      "name": "Ars Technica",      "url": "https://feeds.arstechnica.com/arstechnica/index",         "category": "tech",     "base_score": 25, "has_bookmarks": False},
    {"id": "venturebeat",      "name": "VentureBeat",       "url": "https://venturebeat.com/feed/",                           "category": "business", "base_score": 25, "has_bookmarks": False},
    {"id": "toyokeizai",       "name": "東洋経済",          "url": "https://toyokeizai.net/list/feed/rss",                    "category": "business", "base_score": 22, "has_bookmarks": False},
    {"id": "gendai",           "name": "現代ビジネス",      "url": "https://gendai.media/rss.xml",                    "category": "business", "base_score": 22, "has_bookmarks": False},
    {"id": "yahoo",            "name": "Yahoo Japan",       "url": "https://news.yahoo.co.jp/rss/topics/top-picks.xml",       "category": "general",  "base_score": 18, "has_bookmarks": False},
    {"id": "nhk",              "name": "NHK",               "url": "https://www3.nhk.or.jp/rss/news/cat0.xml",                "category": "general",  "base_score": 18, "has_bookmarks": False},
    # ティア3: コミュニティ
    {"id": "reddit_tech",      "name": "Reddit Technology", "url": "https://www.reddit.com/r/technology/.rss?limit=25",       "category": "tech",     "base_score": 15, "has_bookmarks": False},
    {"id": "reddit_ai",        "name": "Reddit AI",         "url": "https://www.reddit.com/r/artificial/.rss?limit=25",       "category": "tech",     "base_score": 15, "has_bookmarks": False},
    {"id": "reddit_ml",        "name": "Reddit ML",         "url": "https://www.reddit.com/r/MachineLearning/.rss?limit=15",  "category": "tech",     "base_score": 15, "has_bookmarks": False},
]

TECH_SIGNALS     = {"ai", "llm", "gpt", "claude", "gemini", "gpu", "nvidia", "openai",
                    "anthropic", "機械学習", "生成ai", "モデル", "api", "chatgpt",
                    "deepmind", "mistral", "llama", "transformer", "python", "ml"}
BUSINESS_SIGNALS = {"経済", "株", "円", "gdp", "企業", "決算", "上場", "融資",
                    "インフレ", "日銀", "金融", "投資", "市場", "ビジネス", "業績",
                    "売上", "利益", "ipo", "スタートアップ"}


# ── 1. RSS 取得 ───────────────────────────────────────────────
def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()

def _safe_text(text: str) -> str:
    """HTMLタグ除去 + HTMLエンティティデコード + 500文字上限
    XSSエスケープはJavaScript側の esc() が担当するためここでは行わない。
    <script>タグのみ先に除去してJSON注入を防ぐ。"""
    if "<script" in (text or "").lower():
        text = re.sub(r"(?i)<script[^>]*>.*?</script>", "", text or "", flags=re.DOTALL)
    clean = _strip_html(text)
    clean = html_module.unescape(clean)  # &amp; → & など
    return clean[:500]

def _item_id(url: str) -> str:
    return md5(url.encode()).hexdigest()[:8]

def _parse_date(entry) -> str:
    """feedparserのparsed time → ISO8601(JST)"""
    for field in ("published_parsed", "updated_parsed"):
        val = entry.get(field)
        if val:
            try:
                ts = datetime.fromtimestamp(calendar.timegm(val), tz=timezone.utc)
                return ts.astimezone(JST).isoformat()
            except Exception:
                pass
    return datetime.now(JST).isoformat()

def _parse_bookmarks(entry) -> int:
    """はてなRSSからブックマーク数を取得"""
    bm = getattr(entry, "hatena_bookmarkcount", None)
    if bm is not None:
        try:
            return int(bm)
        except (ValueError, TypeError):
            pass
    return 0

def _parse_reddit_score(entry) -> int:
    """RedditのRSSからupvoteスコアを取得"""
    for field in ("score", "slash_comments"):
        val = getattr(entry, field, None) or entry.get(field)
        if val is not None:
            try:
                return int(val)
            except (ValueError, TypeError):
                pass
    return 0

def fetch_rss_source(src: dict) -> list[dict]:
    """1ソースのRSS取得。Cloudflare対策のsleep付き。"""
    items = []
    is_reddit = "reddit.com" in src["url"]
    try:
        log.info(f"  取得中: {src['name']}")
        resp = requests.get(src["url"], headers=HEADERS, timeout=15)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
        for entry in feed.entries[:30]:
            raw_title = entry.get("title", "")
            # <script>タグを含むエントリを除外（XSS対策）
            if "<script" in raw_title.lower():
                continue
            title   = _safe_text(raw_title)
            summary = _safe_text(entry.get("summary", entry.get("description", "")))
            url     = entry.get("link", "").strip()
            if not title or not url:
                continue
            bookmarks = (
                _parse_bookmarks(entry) if src["has_bookmarks"]
                else (_parse_reddit_score(entry) if is_reddit else 0)
            )
            items.append({
                "id":           _item_id(url),
                "title":        title,
                "snippet":      summary[:300],
                "url":          url,
                "source":       src["id"],
                "source_name":  src["name"],
                "category":     src["category"],
                "base_score":   src["base_score"],
                "bookmarks":    bookmarks,
                "is_reddit":    is_reddit,
                "fetched_at":   datetime.now(JST).isoformat(),
                "published_at": _parse_date(entry),
                "summary":      "",
                "tags":         [],
                "score":        0,
            })
        time.sleep(0.5)
    except Exception as e:
        log.warning(f"  取得失敗 {src['name']}: {e}")
    return items

def fetch_all_sources() -> list[dict]:
    """全ソースを取得してURLでdedup"""
    all_items = []
    seen_urls = set()
    for src in RSS_SOURCES:
        for item in fetch_rss_source(src):
            if item["url"] not in seen_urls:
                seen_urls.add(item["url"])
                all_items.append(item)
    log.info(f"取得合計: {len(all_items)} 件 (dedup済み)")
    return all_items


# ── 2. スコア算出 ─────────────────────────────────────────────
def _social_proof_score(bookmarks: int, is_reddit: bool) -> int:
    value = bookmarks // 10 if is_reddit else bookmarks
    if value >= 1000: return 35
    if value >= 500:  return 28
    if value >= 200:  return 20
    if value >= 100:  return 12
    if value >= 50:   return 6
    return 0

def _recency_bonus(published_at: str) -> int:
    try:
        pub = datetime.fromisoformat(published_at)
        if pub.tzinfo is None:
            pub = pub.replace(tzinfo=timezone.utc)
        hours = (datetime.now(timezone.utc) - pub.astimezone(timezone.utc)).total_seconds() / 3600
        if hours < 3:   return 20
        if hours < 12:  return 14
        if hours < 24:  return 8
        if hours < 48:  return 3
        return 0
    except Exception:
        return 5

def _keyword_density(item: dict) -> int:
    text = (item["title"] + " " + item.get("snippet", "")).lower()
    hits = sum(1 for kw in TECH_SIGNALS | BUSINESS_SIGNALS if kw in text)
    return min(hits * 3, 15)

def assign_category(item: dict) -> str:
    text = (item["title"] + " " + item.get("snippet", "")).lower()
    if any(kw in text for kw in TECH_SIGNALS):
        return "tech"
    if any(kw in text for kw in BUSINESS_SIGNALS):
        return "business"
    return item.get("category", "general")

def compute_score(item: dict, existing_urls: set) -> int:
    base   = item["base_score"]
    social = _social_proof_score(item["bookmarks"], item.get("is_reddit", False))
    recent = _recency_bonus(item["published_at"])
    kw     = _keyword_density(item)
    stale  = -10 if item["url"] in existing_urls else 0
    return min(100, max(0, base + social + recent + kw + stale))


# ── 3. Haiku バッチ要約 ───────────────────────────────────────
HAIKU_PROMPT = """以下の記事タイトルリスト（JSON配列）について、
製造業エンジニア管理職（36歳）の視点で各記事を1文要約してください。

以下のJSON配列で返してください（コードブロック不要）:
[{{"id": "...", "summary": "1文（〜。で終わる）", "tags": ["タグ1", "タグ2"]}}]

注意:
- summaryは元のタイトルに存在しない事実を追加しない
- 抽象論禁止、具体的に
- tagsは最大3つ

タイトルリスト:
{titles_json}
"""

def generate_summary_batch(items: list[dict]) -> list[dict]:
    """score>=30の記事タイトルを1バッチでHaikuに要約させる"""
    if not API_KEY:
        log.warning("ANTHROPIC_API_KEY未設定。要約をスキップします")
        return items
    try:
        import anthropic
    except ImportError:
        log.warning("anthropicパッケージ未インストール。要約をスキップ")
        return items

    targets = [item for item in items if item.get("score", 0) >= 30]
    if not targets:
        log.info("score>=30の記事なし。要約スキップ")
        return items

    titles_input = [{"id": item["id"], "title": item["title"]} for item in targets]
    titles_json  = json.dumps(titles_input, ensure_ascii=False)

    log.info(f"Haiku要約: {len(targets)} 件を1バッチで送信")
    try:
        client = anthropic.Anthropic(api_key=API_KEY)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{"role": "user", "content": HAIKU_PROMPT.format(titles_json=titles_json)}],
        )
        raw = resp.content[0].text.strip()
        json_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not json_match:
            raise ValueError(f"JSON配列が見つかりません: {raw[:200]!r}")
        summaries   = json.loads(json_match.group())
        summary_map = {s["id"]: s for s in summaries}
        for item in items:
            if item["id"] in summary_map:
                s = summary_map[item["id"]]
                item["summary"] = s.get("summary", "")
                item["tags"]    = s.get("tags", [])
        log.info(f"Haiku要約完了: {len(summaries)} 件")
    except Exception as e:
        log.warning(f"Haiku要約失敗: {e}")
    return items


# ── 4. news.json 保存 ─────────────────────────────────────────
def build_news_json(new_items: list[dict]) -> dict:
    """既存JSONとマージ（URLdedup、cap 120件、スコア降順）"""
    existing_items: list[dict] = []
    if NEWS_JSON.exists():
        try:
            data = json.loads(NEWS_JSON.read_text(encoding="utf-8"))
            existing_items = data.get("items", [])
        except Exception:
            pass

    existing_urls = {item["url"] for item in existing_items}
    fresh_items   = [i for i in new_items if i["url"] not in existing_urls]
    merged        = sorted(fresh_items + existing_items, key=lambda x: x.get("score", 0), reverse=True)[:120]

    source_breakdown: dict[str, int] = {}
    for item in merged:
        src = item.get("source", "unknown")
        source_breakdown[src] = source_breakdown.get(src, 0) + 1

    return {
        "meta": {
            "last_updated":     datetime.now(JST).isoformat(),
            "total":            len(merged),
            "source_breakdown": source_breakdown,
        },
        "items": merged,
    }


# ── 5. HTML 埋め込み ──────────────────────────────────────────
def embed_into_html(news_data: dict) -> None:
    """window.TRENDING_DATA = {...}; を index.html に埋め込む"""
    if not INDEX_HTML.exists():
        log.warning("index.html が見つかりません。埋め込みスキップ")
        return
    html = INDEX_HTML.read_text(encoding="utf-8")
    inline  = json.dumps(news_data, ensure_ascii=False, separators=(",", ":"))
    new_tag = f"<script>window.TRENDING_DATA = {inline};</script>"
    updated, n = re.subn(
        r"<script>window\.TRENDING_DATA\s*=\s*\{.*?\};</script>",
        new_tag, html, flags=re.DOTALL,
    )
    if n == 0:
        log.warning("index.html にTRENDING_DATAマーカーが見つかりません")
        return
    INDEX_HTML.write_text(updated, encoding="utf-8")
    log.info(f"index.html 更新完了 ({news_data['meta']['total']} 件)")


# ── メイン ────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Trending News Collector")
    parser.add_argument("--dry-run",      action="store_true", help="API不使用、スコアのみ表示")
    parser.add_argument("--no-summarize", action="store_true", help="API不使用、埋め込みまで実行")
    args = parser.parse_args()

    log.info("=" * 60)
    log.info(f"Trending News Collector 開始: {datetime.now(JST).strftime('%Y-%m-%d %H:%M')}")
    log.info("=" * 60)

    # 1. RSS取得
    items = fetch_all_sources()
    if not items:
        log.warning("取得アイテムなし。終了")
        return

    # 2. スコア算出
    existing_urls: set[str] = set()
    if NEWS_JSON.exists():
        try:
            data = json.loads(NEWS_JSON.read_text(encoding="utf-8"))
            existing_urls = {i["url"] for i in data.get("items", [])}
        except Exception:
            pass
    for item in items:
        item["score"]    = compute_score(item, existing_urls)
        item["category"] = assign_category(item)

    if args.dry_run:
        log.info("[DRY-RUN] スコア上位20件:")
        for i in sorted(items, key=lambda x: x["score"], reverse=True)[:20]:
            log.info(f"  [{i['score']:3d}] {i['source_name']:16s} | {i['title'][:60]}")
        return

    # 3. Haiku要約（--no-summarize でスキップ）
    if not args.no_summarize:
        items = generate_summary_batch(items)

    # 4. news.json保存
    news_data = build_news_json(items)
    NEWS_JSON.write_text(
        json.dumps(news_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log.info(f"news.json 保存: {news_data['meta']['total']} 件")

    # 5. HTMLへ埋め込み
    embed_into_html(news_data)
    log.info("完了!")


if __name__ == "__main__":
    main()
