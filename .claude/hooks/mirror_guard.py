#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成物の編集を止める PreToolUse フック。

このリポジトリは上流から自動デプロイで生成された公開用のコピーであり、
ここを直接編集しても次のデプロイで上流の内容に上書きされて消える。
実際に、生成物と気づかずに編集された変更が失われかけたことがある。
CLAUDE.md の警告だけでは読み飛ばされ得るので、機械側でも止める。

止めるのはデプロイ管理下の成果物だけ。scripts/ や .claude/ など、この
クローン固有の作業ファイルは対象外にして、修理の手段は残しておく。

上流の場所はリポジトリに含めない（公開リポジトリなので内部構成を書かない）。
`.claude/mirror-upstream.txt` があればその内容をブロック時の案内に添える。
このファイルは gitignore 済みで、各自のクローンにローカルで置く。

緊急時は環境変数 MIRROR_GUARD_OFF=1 で無効化できる。

    python .claude/hooks/mirror_guard.py --selftest
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# デプロイ管理下＝正本から自動生成される成果物
DEPLOY_MANAGED_DIRS = ("business-skills", "riron-mirror", "kikai-mirror",
                       "denryoku-mirror", "ai-news", "denken-news",
                       "trending-news", "knowledge", "data")


def is_managed(path_str: str) -> bool:
    """そのパスがデプロイ管理下の成果物か。"""
    p = Path(path_str.replace("\\", "/"))
    parts = [x for x in p.parts if x not in (".", "")]
    # ルート直下の .html（公開 wiki・ポータル本体）
    if p.suffix.lower() == ".html" and len(parts) == 1:
        return True
    # 生成ディレクトリ配下
    return bool(parts) and parts[0] in DEPLOY_MANAGED_DIRS


_READ_ONLY_HEADS = ("grep", "rg", "ls", "cat", "head", "tail", "wc", "find",
                    "git status", "git diff", "git log", "git show", "diff",
                    "stat", "python scripts/verify", "open")


def looks_read_only(cmd: str) -> bool:
    first = cmd.strip().lstrip("(").strip()
    return any(first.startswith(h) for h in _READ_ONLY_HEADS)


def _norm(s: str) -> str:
    return s.replace("\\", "/").lower()


def elsewhere(cmd: str) -> bool:
    """そのコマンドが**このクローンの外**を対象にしていると読めるか。

    上流リポジトリや worktree での作業は、コマンド文字列に同じファイル名が
    現れても止めてはいけない。ファイル名の部分一致だけで判定すると、
    別リポジトリでの正当な操作まで誤ってブロックする（実際に誤検知した）。

    除外の判定材料はコードに直書きせず `.claude/mirror-upstream.txt` から読む
    （公開リポジトリなので内部の構成をコードに残さない）。このファイルが無い
    環境では、汎用の worktree マーカーだけを見る保守的な動作になる。

    このクローンの絶対パスが明示されていれば、他所への言及があっても対象とみなす。
    """
    c = _norm(cmd)
    if _norm(str(ROOT)) in c:
        return False
    markers = ["/wt-", "/worktrees/"]
    try:
        up = (ROOT / ".claude" / "mirror-upstream.txt").read_text(encoding="utf-8").strip()
        if up:
            markers.append(_norm(up))
    except OSError:
        pass
    return any(m in c for m in markers if m)


def targets(payload: dict) -> list[str]:
    ti = payload.get("tool_input") or {}
    hits: list[str] = []

    fp = ti.get("file_path") or ti.get("filePath") or ti.get("notebook_path")
    if fp and is_managed(str(fp)) and not elsewhere(str(fp)):
        hits.append(Path(str(fp)).name)

    if payload.get("tool_name") in ("Bash", "PowerShell"):
        cmd = str(ti.get("command", ""))
        if (cmd and not looks_read_only(cmd) and "mirror_guard.py" not in cmd
                and not elsewhere(cmd)):
            for p in ROOT.iterdir():
                if p.name in cmd and is_managed(p.name):
                    hits.append(p.name)
    return sorted(set(hits))


def upstream_hint() -> str:
    """ローカルにだけ置く上流の場所メモ（公開リポジトリには含めない）。"""
    try:
        txt = (ROOT / ".claude" / "mirror-upstream.txt").read_text(encoding="utf-8").strip()
        return f"\n  上流: {txt}" if txt else ""
    except OSError:
        return ""


def block(names: list[str]) -> None:
    reason = (
        f"[生成物ガード] {'、'.join(names)} は編集できません。\n"
        f"  このリポジトリは上流から自動デプロイで生成された公開用のコピーです。\n"
        f"  ここを直しても次のデプロイで上流の内容に上書きされて消えます。\n"
        f"  修正は上流リポジトリ側で行ってください。{upstream_hint()}\n"
        f"  詳細はこのリポジトリの CLAUDE.md を参照。\n"
        f"  デプロイ機構自体の修理などで本当に必要なときは MIRROR_GUARD_OFF=1 を付けて実行。"
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        },
        "systemMessage": "生成物の編集をブロックしました（修正は上流リポジトリで）",
    }, ensure_ascii=False))
    print(reason, file=sys.stderr)
    sys.exit(2)


def selftest() -> int:
    cases = [
        ("denken3-kikai-wiki.html", True),
        ("business-skills/index.html", True),
        ("kikai-mirror/transformer.md", True),
        ("scripts/verify_spa.py", False),
        (".claude/hooks/mirror_guard.py", False),
        ("CLAUDE.md", False),
    ]
    ok = True
    for path, want in cases:
        got = is_managed(path)
        ok &= got == want
        print(f"  {'OK ' if got == want else 'NG '} {path:34s} managed={got}")
    sample = {"tool_name": "Bash",
              "tool_input": {"command": "python fix.py denken3-kikai-wiki.html"}}
    got = targets(sample)
    ok &= got == ["denken3-kikai-wiki.html"]
    print(f"  {'OK ' if got else 'NG '} Bash 検出: {got}")

    ro = {"tool_name": "Bash",
          "tool_input": {"command": "grep -n foo denken3-kikai-wiki.html"}}
    got = targets(ro)
    ok &= not got
    print(f"  {'OK ' if not got else 'NG '} 読取は除外: {got or '（対象なし）'}")

    # 別チェックアウトでの作業を誤ってブロックしないこと（誤検知の回帰テスト）
    src = {"tool_name": "Bash",
           "tool_input": {"command": 'cd "/tmp/worktrees/topic" && '
                                     "python scripts/verify_numbers.py && "
                                     "grep -c foo denken3-kikai-wiki.html"}}
    got = targets(src)
    ok &= not got
    print(f"  {'OK ' if not got else 'NG '} 別チェックアウトは素通し: {got or '（対象なし）'}")

    # ただしこのクローンの絶対パスが明示されていれば、他所への言及があっても止める
    both = {"tool_name": "Bash",
            "tool_input": {"command": f'cp /tmp/worktrees/topic/x.html "{ROOT}/denken3-kikai-wiki.html"'}}
    got = targets(both)
    ok &= got == ["denken3-kikai-wiki.html"]
    print(f"  {'OK ' if got else 'NG '} 明示パスは止める: {got}")
    return 0 if ok else 1


def main() -> int:
    if "--selftest" in sys.argv[1:]:
        return selftest()
    if os.environ.get("MIRROR_GUARD_OFF") == "1":
        return 0
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    names = targets(payload)
    if names:
        block(names)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as e:  # fail-open
        print(f"[mirror_guard] スキップ: {e}", file=sys.stderr)
        sys.exit(0)
