#!/usr/bin/env python3
"""SPA が正しく描画されるかを実ブラウザで検証する。

変更前後で本文量・見出し数・コンソールエラーを比較するために使う。

    python scripts/verify_spa.py --save baseline.json     # 変更前を記録
    python scripts/verify_spa.py --compare baseline.json  # 変更後に比較
"""
import argparse
import functools
import http.server
import json
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
TARGETS = [
    "denken3-riron-wiki.html",
    "denken3-kikai-wiki.html",
    "denken3-denryoku-wiki.html",
    "denken-hoki-wiki.html",
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


def measure():
    from playwright.sync_api import sync_playwright

    port = free_port()
    httpd = serve(ROOT, port)
    result = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for name in TARGETS:
                if not (ROOT / name).exists():
                    continue
                errors, bytes_in = [], {"total": 0}
                page = browser.new_page(viewport={"width": 1400, "height": 1000})
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
                page.on("pageerror", lambda e: errors.append(str(e)))

                def on_response(resp):
                    try:
                        if resp.request.resource_type == "script":
                            body = resp.body()
                            bytes_in["total"] += len(body)
                    except Exception:
                        pass

                page.on("response", on_response)
                page.goto("http://127.0.0.1:{}/{}".format(port, name), wait_until="networkidle")
                page.wait_for_timeout(2500)
                stat = page.evaluate(
                    "() => ({ text: (document.body.innerText||'').length,"
                    " headings: document.querySelectorAll('h1,h2,h3').length,"
                    " svg: document.querySelectorAll('svg').length,"
                    " nodes: document.querySelectorAll('*').length })")
                stat["errors"] = errors[:5]
                stat["errorCount"] = len(errors)
                stat["scriptBytes"] = bytes_in["total"]
                result[name] = stat
                print("  {:32s} 本文{:>7,}字 見出し{:>4} SVG{:>4} JS{:>6.2f}MB エラー{}".format(
                    name, stat["text"], stat["headings"], stat["svg"],
                    stat["scriptBytes"] / 1024 / 1024, stat["errorCount"]))
                page.close()
            browser.close()
    finally:
        httpd.shutdown()
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save")
    ap.add_argument("--compare")
    args = ap.parse_args()

    print("=== 実ブラウザ描画計測 ===")
    now = measure()

    if args.save:
        Path(args.save).write_text(json.dumps(now, ensure_ascii=False, indent=1), encoding="utf-8")
        print("\n記録: {}".format(args.save))

    if args.compare:
        base = json.loads(Path(args.compare).read_text(encoding="utf-8"))
        print("\n=== 変更前との比較 ===")
        ng = 0
        for name, cur in now.items():
            b = base.get(name)
            if not b:
                continue
            dt = cur["text"] - b["text"]
            dh = cur["headings"] - b["headings"]
            dj = (cur["scriptBytes"] - b["scriptBytes"]) / 1024 / 1024
            bad = abs(dt) > max(200, b["text"] * 0.02) or dh != 0 or cur["errorCount"] > b["errorCount"]
            ng += bad
            print("  {:32s} 本文{:+,} 見出し{:+} JS{:+.2f}MB エラー{}→{}  {}".format(
                name, dt, dh, dj, b["errorCount"], cur["errorCount"], "NG" if bad else "OK"))
            if bad and cur["errors"]:
                for e in cur["errors"][:3]:
                    print("      ! {}".format(e[:160]))
        print("\n判定: {}".format("PASS（描画は同等）" if ng == 0 else "FAIL（{}件で差異）".format(ng)))
        return 1 if ng else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
