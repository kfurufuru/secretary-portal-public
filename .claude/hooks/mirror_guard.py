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

**誤って止めないことも要件**。止めすぎるガードは解除の常用を招き、結果として
無効化される。実際に2度、正当な操作を誤ってブロックした（別チェックアウトでの
作業と、複合コマンドでの読み取り）。どちらも回帰テストを selftest に入れてある。

解除は `MIRROR_GUARD_OFF=1`。フックは Bash コマンドより前に別プロセスで走るため
環境変数はコマンド行からは届かない。そこでコマンド文字列にその指定があれば
解除とみなす（そうしないと、肝心のときに解除手段が使えない）。

    python .claude/hooks/mirror_guard.py --selftest
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# デプロイ管理下＝上流から自動生成される成果物
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


_READ_ONLY_HEADS = (
    # 読むだけのもの
    "grep", "rg", "ls", "cat", "head", "tail", "wc", "find", "diff", "stat",
    "sort", "uniq", "awk", "sed -n", "open", "python scripts/verify",
    "git status", "git diff", "git log", "git show", "git grep", "git ls-tree",
    "git ls-files", "git cat-file", "git rev-parse", "git branch",
    "git worktree list", "git check-ignore", "git merge-base", "git fetch",
    # 繋ぎで副作用が無いもの
    "cd", "echo", "printf", "export", "pwd", "true", "test", "[", "for", "do",
    "done", "if", "then", "fi", "while",
)


def looks_read_only(cmd: str) -> bool:
    """複合コマンド全体が読み取りだけで構成されているか。

    先頭トークンだけを見ると `cd X && git show ... | grep -c ...` のような
    純粋な確認まで「書き込み」と判定してしまう（実際に誤検知した）。
    `&&` `||` `;` `|` 改行で区切った**すべての区間**が無害な場合のみ読み取りとみなす。
    """
    for seg in re.split(r"&&|\|\||[;|\n]", cmd):
        s = seg.strip().lstrip("(").strip()
        if not s:
            continue
        if not any(s.startswith(h) for h in _READ_ONLY_HEADS):
            return False
    return True


def disabled(payload: dict) -> bool:
    """脱出ハッチ。

    フックは Bash コマンドの**前に別プロセスで**走るので、コマンド行に書いた
    `MIRROR_GUARD_OFF=1` は環境変数としてはフックに届かない。それでは
    ドキュメントに書いた解除手段が肝心のときに使えないので、ペイロードの
    コマンド文字列にその指定が現れていれば解除とみなす。
    """
    if os.environ.get("MIRROR_GUARD_OFF") == "1":
        return True
    cmd = str((payload.get("tool_input") or {}).get("command", ""))
    return "MIRROR_GUARD_OFF=1" in cmd


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
        f"  本当に必要なときはコマンドの先頭に MIRROR_GUARD_OFF=1 を付けて実行。"
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

    def check(label, payload, want):
        nonlocal ok
        got = targets(payload)
        good = (got == want)
        ok &= good
        print(f"  {'OK ' if good else 'NG '} {label}: {got or '（対象なし）'}")

    bash = lambda c: {"tool_name": "Bash", "tool_input": {"command": c}}
    hit = ["denken3-kikai-wiki.html"]

    check("Bash 検出", bash("python fix.py denken3-kikai-wiki.html"), hit)
    check("読取は除外", bash("grep -n foo denken3-kikai-wiki.html"), [])

    # 別チェックアウトでの作業を誤ってブロックしないこと（誤検知の回帰テスト）
    check("別チェックアウトは素通し",
          bash('cd "/tmp/worktrees/topic" && python scripts/verify_numbers.py && '
               "grep -c foo denken3-kikai-wiki.html"), [])

    # ただしこのクローンの絶対パスが明示されていれば、他所への言及があっても止める
    check("明示パスは止める",
          bash(f'cp /tmp/worktrees/topic/x.html "{ROOT}/denken3-kikai-wiki.html"'), hit)

    # 複合コマンドの読み取りを止めないこと（誤検知の回帰テスト）
    check("複合の読取は素通し",
          bash('cd "/some/clone" && git log --oneline -5 && '
               "git show origin/main:denken3-kikai-wiki.html | grep -c three-winding"), [])

    # 複合でも書き込みが混ざれば止めること
    check("複合でも書込は止める",
          bash("cd . && python fix.py denken3-kikai-wiki.html && echo done"), hit)

    # 脱出ハッチがコマンド行の指定で効くこと（フックは別プロセスなので env では届かない）
    esc = bash("MIRROR_GUARD_OFF=1 python fix.py denken3-kikai-wiki.html")
    ok &= disabled(esc)
    print(f"  {'OK ' if disabled(esc) else 'NG '} 脱出ハッチが効く: {disabled(esc)}")
    return 0 if ok else 1


def main() -> int:
    if "--selftest" in sys.argv[1:]:
        return selftest()
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    if disabled(payload):
        return 0
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
