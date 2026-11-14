#!/usr/bin/env python3
"""Integrate the two QoL message actions into Venus' existing bundled bootstrap."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / "patches/src/main/resources/venus/bootstrap.js"
hooks = root / "patches/src/main/resources/venus/qol_menu_hooks.js"
src = target.read_text(encoding="utf-8")
if "function reverseImageSearchSheet(" in src:
    print("QoL hooks already integrated.")
    raise SystemExit(0)

def change(old, new, count=1):
    global src
    found = src.count(old)
    if found != count:
        raise RuntimeError(f"Expected {count} occurrence(s) of {old[:75]!r}, found {found}")
    src = src.replace(old, new)

change('    if (features.noTyping) targetModules[12849] = 1;',
       '    if (features.reverseImageSearch || features.copyFileContents) targetModules[9978] = 1;\n'
       '    if (features.noTyping) targetModules[12849] = 1;')
change('noTyping: false, quickDelete: false,',
       'reverseImageSearch: false, copyFileContents: false, noTyping: false, quickDelete: false,', 2)
change('    const FEATURE_ICONS = {noDelete:',
       '    const FEATURE_ICONS = {reverseImageSearch:[13827, "ChatSmileIcon"], copyFileContents:[5141, "CopyIcon"], noDelete:')
change('        // Sending\n',
       '        toggle("messages", "reverseImageSearch", "Reverse image search", "Search an image attachment on TinEye. The image URL is shared with TinEye.");\n'
       '        toggle("messages", "copyFileContents", "Copy file contents", "Copy text from a small attached text file.");\n'
       '        // Sending\n')
change('    // Message menu row.\n    function viewRawMessageSheet(',
       hooks.read_text(encoding="utf-8").rstrip() + '\n    // Message menu row.\n    function viewRawMessageSheet(')
change('                if (features.viewRaw) exports = hookComponent(exports, viewRawMessageSheet);\n'
       '                return features.bulkDelete ? hookComponent(exports, bulkDeleteSheet) : exports;',
       '                if (features.viewRaw) exports = hookComponent(exports, viewRawMessageSheet);\n'
       '                if (features.reverseImageSearch) exports = hookComponent(exports, reverseImageSearchSheet);\n'
       '                if (features.copyFileContents) exports = hookComponent(exports, copyFileContentsSheet);\n'
       '                return features.bulkDelete ? hookComponent(exports, bulkDeleteSheet) : exports;')
target.write_text(src, encoding="utf-8")
print("Integrated QoL hooks into bootstrap.js")
