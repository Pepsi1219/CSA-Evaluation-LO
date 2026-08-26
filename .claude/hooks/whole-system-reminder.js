#!/usr/bin/env node
// UserPromptSubmit hook — echoes the whole-system-thinking rule so it rides
// every user turn even after context compaction. Registered from
// .claude/settings.json. Node is used because it's cross-platform (Windows
// bash / cmd / PowerShell all run `node -e`) and already in the toolchain.
//
// Whatever this script prints on stdout is prepended to the model's view of
// the prompt. Keep it terse — bytes are context.
process.stdout.write(
    '[project rule — whole-system thinking]\n' +
    '- Before editing, list every file/system this change ripples into ' +
    '(source, tests, CLAUDE.md, docs, deploy pipeline, version, SW cache).\n' +
    '- Fix them all in one pass — never leave a half-updated system.\n' +
    '- If the impact analysis surfaces a genuinely risky trade-off ' +
    '(data loss, security posture, breaking contract, UX assumption break, ' +
    'or the request does not actually do what the user thinks), STOP and ' +
    'use AskUserQuestion before writing code.\n'
);
