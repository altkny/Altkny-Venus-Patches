#!/usr/bin/env python3
"""Integrate Venus local RPC and the explicitly opted-in Kizzy-style Gateway.

A user-supplied Gateway credential is never read from the Discord session,
stored in settings, or logged. Source insertion is idempotent.
"""
from pathlib import Path

root=Path(__file__).resolve().parents[1]
runtime=root/"patches/src/main/resources/venus/bootstrap.js"
ui=root/"patches/src/main/resources/venus/rpc_editor.js"
transport=root/"patches/src/main/resources/venus/rpc_transport.js"
gateway=root/"patches/src/main/resources/venus/rpc_gateway.js"
detector=root/"patches/src/main/resources/venus/rpc_detection.js"
s=runtime.read_text(encoding="utf-8")

def replace_once(old,new):
    global s
    n=s.count(old)
    if n != 1:
        raise RuntimeError(f"Expected 1 occurrence, got {n}: {old[:100]!r}")
    s=s.replace(old,new)

if 'function VenusRpcSettings()' not in s:
    raise RuntimeError("Run integrate_custom_rpc.py before this script")

# Replace only the editor's own source region. Allows edits to the standalone
# source to be carried forward without rebundling or modifying unrelated code.
begin='    const VENUS_RPC_GAMES = ['
end='    // Settings page: the Quest types, a status card and what to know.'
if s.count(begin)!=1 or s.count(end)!=1:
    raise RuntimeError("RPC editor/Quest settings anchors changed")
a=s.index(begin)
b=s.index(end,a)
original=s[a:b]
new=ui.read_text(encoding="utf-8")
new=new[new.index(begin):].rstrip()+"\n"
if original != new:
    s=s[:a]+new+s[b:]

transport_begin='    const VENUS_RPC_SOCKET = "venus-custom-rpc";'
transport_src=transport.read_text(encoding="utf-8")
transport_src=transport_src[transport_src.index(transport_begin):].rstrip()+"\n"
gateway_src=gateway.read_text(encoding="utf-8")
gateway_begin='    const VENUS_RPC_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";'
transport_src+=gateway_src[gateway_src.index(gateway_begin):].rstrip()+"\n"
detector_src=detector.read_text(encoding="utf-8")
detector_begin='    const VENUS_RPC_KNOWN_PACKAGES = Object.freeze({'
transport_src+=detector_src[detector_src.index(detector_begin):].rstrip()+"\n"
if transport_begin in s:
    # The standalone transport source is authoritative on every integration.
    # Keep its existing comment prefix and replace only our own code.
    start=s.index(transport_begin)
    stop=s.index(begin,start)
    if s[start:stop] != transport_src:
        s=s[:start]+transport_src+s[stop:]
else:
    # Transport is loaded before the editor; both share the bootstrap closure.
    replace_once(begin,transport.read_text(encoding="utf-8").rstrip()+"\n"+begin)

for old,new in [
 ('customRpc:true, rpcProfiles:', 'customRpc:true, rpcEnabled:false, rpcProfiles:'),
 ('customRpc: true, rpcProfiles:', 'customRpc: true, rpcEnabled: false, rpcProfiles:'),
 ('rpcEnabled:false, rpcProfiles:', 'rpcEnabled:false, rpcStartedAt:0, rpcAccountId:"", rpcProfiles:'),
 ('rpcEnabled: false, rpcProfiles:', 'rpcEnabled: false, rpcStartedAt: 0, rpcAccountId: "", rpcProfiles:'),
]:
    if old in s and new not in s:
        replace_once(old,new)
if 'if (features.customRpc) selectModules([584]);' not in s:
    replace_once('    if (features.badges) selectModules([584, 1392, 6015, 8590, 10002, 14713, 14748]);',
        '    if (features.badges) selectModules([584, 1392, 6015, 8590, 10002, 14713, 14748]);\n'
        '    if (features.customRpc) selectModules([584]);')
if 'if (features.customRpc) venusRpcLoaded();' not in s:
    replace_once('            status.storage = "ready";\n            debugLogReady();',
        '            status.storage = "ready";\n            debugLogReady();\n'
        '            if (features.customRpc) venusRpcLoaded();')
if 'if (features.customRpc && exports && exports.default) venusRpcAttach(exports.default);' not in s:
    replace_once('                if (features.badges && exports && exports.default) badgesInit(exports.default);',
        '                if (features.badges && exports && exports.default) badgesInit(exports.default);\n'
        '                if (features.customRpc && exports && exports.default) venusRpcAttach(exports.default);')
if 'const rpcBusy = !!(features.customRpc && settings.rpcEnabled && venusRpcTransport.active);' not in s:
    replace_once('        const needed = questBusy || badgeBusy || pushListening;',
        '        const rpcBusy = !!(features.customRpc && settings.rpcEnabled && venusRpcTransport.active);\n'
        '        const needed = questBusy || badgeBusy || rpcBusy || pushListening;')
if 'rpcBusy ? tr("Sharing {name}"' not in s:
    replace_once('            badgeBusy ? tr("Completing badges") : tr("Activity notifications");',
        '            badgeBusy ? tr("Completing badges") :\n'
        '            rpcBusy ? tr("Sharing {name}",{name:venusRpcSavedProfile()?.name || "activity"}) :\n'
        '            tr("Activity notifications");')

# The Studio is a dedicated root entry in Venus Settings, not a feature row.
# Existing installations retain the customRpc feature flag for module selection.
old_row=('        withOptions("advanced", "customRpc", "VENUS_CUSTOM_RPC", "Custom Rich Presence",\n'
         '            "Game presets, a custom activity editor and a live preview.", "Rich Presence", VenusRpcSettings);\n')
if old_row in s:
    replace_once(old_row, '')
root_route='        route("VENUS_RPC_STUDIO", "Rich Presence", [], undefined, iconFor("customRpc"));\n'
if root_route not in s:
    replace_once('        // Language: the language Venus settings are shown in, Discord\'s own by default.',
        '        if (features.customRpc) {\n'
        + '    '+root_route
        + '            next.VENUS_RPC_STUDIO.screen.getComponent = () => VenusRpcSettings;\n'
        + '            next.VENUS_RPC_STUDIO.useDescription = () => "Manage your activity, games and publishing";\n'
        + '        }\n'
        + '        // Language: the language Venus settings are shown in, Discord\'s own by default.')
# A route in nativeRegistry is searchable, but it is NOT visible in the
# Discord settings list until settingsSections explicitly includes its ID.
old_venus='section("Venus", ["VENUS_PLUGINS", "VENUS_LANGUAGE", "VENUS_BACKUP", "VENUS_GENERAL"])'
new_venus='section("Venus", ["VENUS_PLUGINS", ...(features.customRpc ? ["VENUS_RPC_STUDIO"] : []), "VENUS_LANGUAGE", "VENUS_BACKUP", "VENUS_GENERAL"])'
if old_venus in s and new_venus not in s:
    replace_once(old_venus,new_venus)
elif new_venus not in s:
    raise RuntimeError("Venus settings menu anchor missing; cannot expose Rich Presence root route")
assert s.count('VENUS_RPC_STUDIO", "VENUS_LANGUAGE"') <= 1 or new_venus in s

runtime.write_text(s,encoding="utf-8")
print("Integrated local RPC, Kizzy Gateway, opt-in Android foreground-app detection and Venus navigation.")
