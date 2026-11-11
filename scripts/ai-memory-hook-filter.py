#!/usr/bin/env python3
"""Filter Codex composer suggestions for video-builder; pass other hooks through.

Only an exact app-generated prompt prefix is excluded. A session marker suppresses
its later tool/end events so it cannot generate a handoff or learned preference.
The initial SessionStart metadata may already exist; raw history is never deleted.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

PROJECT = Path('/Volumes/SSD Dev/Projects/video-builder')
PREFIX = 'This is an app-generated request for a suggested next user message. The user did not write this message.'


def excluded(payload, state_dir):
    try:
        cwd = Path(payload.get('cwd', '')).resolve()
        if cwd != PROJECT and PROJECT not in cwd.parents:
            return False
        session_id = payload.get('session_id') or payload.get('sessionId')
        if not isinstance(session_id, str) or not session_id:
            return False
        marker = state_dir / hashlib.sha256(session_id.encode()).hexdigest()
        prompt = payload.get('prompt', '')
        if isinstance(prompt, str) and prompt.lstrip().startswith(PREFIX):
            state_dir.mkdir(parents=True, exist_ok=True)
            marker.touch(mode=0o600)
            return True
        return marker.exists()
    except (OSError, TypeError, ValueError):
        return False


def main():
    raw = sys.stdin.buffer.read()
    state_dir = Path.home() / 'Library/Application Support/ai-memory/filtered-suggestions'
    try:
        payload = json.loads(raw)
        if isinstance(payload, dict) and excluded(payload, state_dir):
            return 0
    except (ValueError, UnicodeError):
        pass
    binary = Path.home() / '.local/bin/ai-memory'
    return subprocess.run([str(binary), *sys.argv[1:]], input=raw).returncode


if __name__ == '__main__':
    raise SystemExit(main())
