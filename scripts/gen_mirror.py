#!/usr/bin/env python3
"""React SPA Wiki から AI 可読 Markdown ミラーを生成する。

正本は SPA (denken3-*.html)。本スクリプトの出力は再生成物であり手動編集しない。
2026-09-06 再建（旧 auto-heal パイプラインは旧PC消失により復元不能だったため）。

使い方:
    python scripts/gen_mirror.py --wiki kikai
    python scripts/gen_mirror.py --wiki denryoku
    python scripts/gen_mirror.py --wiki riron --check   # 書き込まず差分件数のみ
"""
import argparse
import functools
import hashlib
import http.server
import re
import socket
import socketserver
import sys
import threading
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent

WIKIS = {
    "riron": {"html": "denken3-riron-wiki.html", "subject": "理論", "mirror": "riron-mirror"},
    "kikai": {"html": "denken3-kikai-wiki.html", "subject": "機械", "mirror": "kikai-mirror"},
    "denryoku": {"html": "denken3-denryoku-wiki.html", "subject": "電力", "mirror": "denryoku-mirror"},
}

# --- DOM -> Markdown（ブラウザ内で実行）---------------------------------
EXTRACT_JS = r"""
(() => {
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','NAV','BUTTON','SELECT','INPUT','TEXTAREA']);
  const texOf = (el) => {
    const a = el.querySelector('annotation[encoding="application/x-tex"]');
    return a ? a.textContent.trim() : null;
  };
  const inline = (el) => {
    if (el.nodeType === 3) return el.textContent;
    if (el.nodeType !== 1) return '';
    if (el.classList && el.classList.contains('katex')) {
      const t = texOf(el);
      return t ? '$' + t + '$' : el.textContent;
    }
    if (el.tagName === 'SVG' || el.tagName === 'svg') return '';
    if (SKIP.has(el.tagName)) return '';
    if (el.tagName === 'CODE') return '`' + el.textContent + '`';
    if (el.tagName === 'BR') return ' ';
    if (el.tagName === 'STRONG' || el.tagName === 'B') {
      const s = [...el.childNodes].map(inline).join('').trim();
      return s ? '**' + s + '**' : '';
    }
    return [...el.childNodes].map(inline).join('');
  };
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const out = [];
  const emit = (s) => { if (s || s === '') out.push(s); };

  const walk = (el) => {
    if (el.nodeType === 3) { const t = clean(el.textContent); if (t) emit(t); return; }
    if (el.nodeType !== 1) return;
    const tag = el.tagName;
    if (SKIP.has(tag) || tag === 'SVG' || tag === 'svg') return;
    const st = window.getComputedStyle(el);
    if (st && (st.display === 'none' || st.visibility === 'hidden')) return;

    if (/^H[1-6]$/.test(tag)) {
      const lvl = Math.min(parseInt(tag[1]), 4);
      const t = clean(inline(el));
      if (t) { emit(''); emit('#'.repeat(lvl) + ' ' + t); emit(''); }
      return;
    }
    if (tag === 'TABLE') {
      const rows = [...el.querySelectorAll('tr')];
      if (!rows.length) return;
      const cells = (r) => [...r.children].map((c) => clean(inline(c)) || ' ');
      const head = cells(rows[0]);
      emit('');
      emit('| ' + head.join(' | ') + ' |');
      emit('| ' + head.map(() => '---').join(' | ') + ' |');
      rows.slice(1).forEach((r) => {
        const c = cells(r);
        while (c.length < head.length) c.push(' ');
        emit('| ' + c.slice(0, head.length).join(' | ') + ' |');
      });
      emit('');
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      const ordered = tag === 'OL';
      [...el.children].filter((li) => li.tagName === 'LI').forEach((li, i) => {
        const t = clean(inline(li));
        if (t) emit((ordered ? (i + 1) + '. ' : '- ') + t);
      });
      emit('');
      return;
    }
    if (tag === 'BLOCKQUOTE') {
      const t = clean(inline(el));
      if (t) { emit(''); emit('> ' + t); emit(''); }
      return;
    }
    if (tag === 'PRE') {
      emit('');
      emit('```');
      emit(el.textContent.trim());
      emit('```');
      emit('');
      return;
    }
    if (tag === 'IMG') {
      emit('![' + (el.getAttribute('alt') || '図') + '](' + (el.getAttribute('src') || '') + ')');
      return;
    }

    const hasBlockChild = [...el.children].some((c) =>
      /^(H[1-6]|TABLE|UL|OL|BLOCKQUOTE|PRE|DIV|SECTION|ARTICLE|P|MAIN)$/.test(c.tagName));
    if (!hasBlockChild) {
      const t = clean(inline(el));
      if (t) emit(t);
      return;
    }
    [...el.childNodes].forEach(walk);
  };

  const root = document.querySelector('main') || document.querySelector('#root') || document.body;
  walk(root);
  const svgCount = root.querySelectorAll('svg').length;
  let md = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { md: md, svgCount: svgCount };
})()
"""


# --- ページID列挙（ブラウザ内で実行）-----------------------------------
DISCOVER_JS = r"""
(() => {
  const ids = [];
  const push = (v) => { if (v && typeof v === 'string' && !ids.includes(v)) ids.push(v); };
  try {
    if (typeof WIKI_DATA !== 'undefined' && Array.isArray(WIKI_DATA.chapters)) {
      WIKI_DATA.chapters.forEach((ch) => {
        push(ch.id);
        (ch.pages || []).forEach((p) => push(p.id));
      });
    }
  } catch (e) {}
  try {
    if (typeof PAGES !== 'undefined') {
      const v = PAGES;
      if (Array.isArray(v)) v.forEach((p) => push(typeof p === 'string' ? p : p && p.id));
      else Object.keys(v).forEach(push);
    }
  } catch (e) {}
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const h = (a.getAttribute('href') || '').replace(/^#/, '').split('/')[0].split(':')[0].trim();
    push(h);
  });
  return ids;
})()
"""

# SPA 共通で使われがちな参照ページ。存在しなければ本文重複として自動的に捨てられる。
EXTRA_IDS = [
    "guide", "formulas", "glossary", "trends", "exam-info", "exam-operation",
    "reference", "circuit-patterns", "trap-patterns", "reuse-ranking",
    "wave-analysis", "last-3days", "retake-strategy", "dual-map",
]


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(directory, port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))

    class Quiet(socketserver.TCPServer):
        allow_reuse_address = True

        def handle_error(self, *a):
            pass

    httpd = Quiet(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def slug(page_id):
    s = re.sub(r"[^0-9A-Za-z_.-]+", "-", page_id).strip("-")
    return s or "index"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wiki", required=True, choices=sorted(WIKIS))
    ap.add_argument("--out", help="出力ディレクトリ名（既定: <wiki>-mirror）")
    ap.add_argument("--check", action="store_true", help="書き込まず差分件数のみ報告")
    ap.add_argument("--limit", type=int, default=0, help="先頭N件のみ（動作確認用）")
    args = ap.parse_args()

    cfg = WIKIS[args.wiki]
    html = ROOT / cfg["html"]
    if not html.exists():
        sys.exit("NG: {} が見つからない".format(html))
    outdir = ROOT / (args.out or cfg["mirror"])

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("NG: playwright 未導入。python -m pip install playwright && python -m playwright install chromium")

    port = free_port()
    httpd = serve(ROOT, port)
    url = "http://127.0.0.1:{}/{}".format(port, cfg["html"])
    processed = changed = 0

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1400, "height": 1000})
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(2000)

            # ページID列挙: WIKI_DATA.chapters を第一情報源、アンカーと定番参照ページを補完
            discovered = page.evaluate(DISCOVER_JS)
            ids, seen = [], set()
            for pid in list(discovered) + EXTRA_IDS:
                pid = (pid or "").strip()
                if pid and pid not in seen:
                    seen.add(pid)
                    ids.append(pid)
            if not ids:
                ids = [""]
            if args.limit:
                ids = ids[: args.limit]
            print("[{}] 検出ページ {} 件".format(args.wiki, len(ids)))

            outdir.mkdir(parents=True, exist_ok=True)
            body_seen = {}
            for pid in ids:
                page.evaluate("id => { location.hash = id; }", pid)
                page.wait_for_timeout(700)
                try:
                    res = page.evaluate(EXTRACT_JS)
                except Exception as e:
                    print("  SKIP {}: {}".format(pid, e))
                    continue
                body = (res.get("md") or "").strip()
                if len(body) < 200:
                    print("  SKIP {}: 本文が短い({}字)".format(pid, len(body)))
                    continue
                # 未定義IDはホーム等にフォールバックして同一本文になる。重複は捨てる。
                digest = hashlib.sha1(body.encode("utf-8")).hexdigest()
                if digest in body_seen:
                    print("  SKIP {}: 本文が {} と同一（未定義ID）".format(pid, body_seen[digest]))
                    continue
                body_seen[digest] = pid
                title = page.evaluate(
                    "() => { const h = document.querySelector('main h1, #root h1, h1');"
                    " return h ? h.textContent.trim() : ''; }") or pid
                header = (
                    "# 電験三種 {} — {}（{}・AI可読版）\n\n"
                    "> React SPA `{}` の {} ページを描画し自動生成したAI可読ミラー。"
                    "正本は SPA、本ファイルは再生成物（手動編集しない）。\n"
                    "> 図版 {} 点は SVG のため本ミラーには含まれない。\n\n---\n\n"
                ).format(cfg["subject"], title, pid or "index", cfg["html"],
                         pid or "index", res.get("svgCount", 0))
                content = header + body + "\n"
                target = outdir / (slug(pid) + ".md")
                old = target.read_text(encoding="utf-8") if target.exists() else None
                if old != content:
                    changed += 1
                    if not args.check:
                        target.write_text(content, encoding="utf-8")
                processed += 1
                print("  OK {}  {:,}字 / 図{}点".format(target.name, len(body), res.get("svgCount", 0)))
            browser.close()
    finally:
        httpd.shutdown()

    verb = "差分" if args.check else "出力"
    print("\n[{}] {} ページ処理 / {} {} 件 -> {}".format(
        args.wiki, processed, verb, changed, outdir.relative_to(ROOT)))


if __name__ == "__main__":
    main()
