#!/usr/bin/env python3
"""Simple REPL that sends commands to smol6 via HTTP (port 8888)."""

import readline
import urllib.request
import sys
import os

HISTORY_FILE = os.path.expanduser('~/.smol_cli_history')
URL = 'http://127.0.0.1:8888/command'

def send(cmd):
    try:
        req = urllib.request.Request(URL, data=cmd.encode(), method='POST')
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.read().decode().strip()
    except Exception as e:
        return f'Error: {e}'

def main():
    try:
        readline.read_history_file(HISTORY_FILE)
    except FileNotFoundError:
        pass

    print('smol remote shell (port 8888). Ctrl-D to exit.')
    while True:
        try:
            cmd = input('smol> ').strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not cmd:
            continue
        print(send(cmd))

    readline.write_history_file(HISTORY_FILE)

if __name__ == '__main__':
    main()
