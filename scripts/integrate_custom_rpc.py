#!/usr/bin/env python3
"""Idempotently integrate Venus RPC editor into the pinned 351.11 runtime.

The editor only previews and saves activities. No network publisher is
installed by this script. Fail loudly if the upstream runtime changed.
"""
from pathlib import Path

root=Path(__file__).resolve().parents[1]
runtime=root/"patches/src/main/resources/venus/bootstrap.js"
ui=root/"patches/src/main/resources/venus/rpc_editor.js"
src=runtime.read_text(encoding="utf-8")
if "function VenusRpcSettings()" in src:
    print("Venus RPC editor already integrated")
    raise SystemExit(0)

def change(old,new,count=1):
    global src
    actual=src.count(old)
    if actual != count:
        raise RuntimeError(f"Expected {count} matches for {old[:90]!r}, found {actual}")
    src=src.replace(old,new)

change('badges:false, badgesGameTime:true,',
       'customRpc:true, rpcProfiles:"[]", rpcSelected:"", badges:false, badgesGameTime:true,')
change('badges: false, badgesGameTime: true,',
       'customRpc: true, rpcProfiles: "[]", rpcSelected: "", badges: false, badgesGameTime: true,')
change('    const FEATURE_ICONS = {',
       '    const FEATURE_ICONS = {customRpc:[15994, "LaptopPhoneIcon"], ')
change('    // Settings page: the Quest types, a status card and what to know.\n    function QuestSettings() {',
       ui.read_text(encoding="utf-8").rstrip() +
       '\n    // Settings page: the Quest types, a status card and what to know.\n    function QuestSettings() {')
change('        // Sending\n',
       '        withOptions("advanced", "customRpc", "VENUS_CUSTOM_RPC", "Custom Rich Presence",\n'
       '            "Game presets, a custom activity editor and a live preview.", "Rich Presence", VenusRpcSettings);\n'
       '        // Sending\n')
runtime.write_text(src,encoding="utf-8")
print("Venus RPC editor integrated into the Features > Advanced page.")
