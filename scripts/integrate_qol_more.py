#!/usr/bin/env python3
"""Wire additional QoL features into pinned Venus 351.11 runtime."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
target=root/"patches/src/main/resources/venus/bootstrap.js"
more=root/"patches/src/main/resources/venus/qol_more_hooks.js"
src=target.read_text(encoding="utf-8")
if "function venusQolReplyTimestamp(" in src:
    print("Additional QoL hooks already integrated")
    raise SystemExit(0)
def change(old,new,count=1):
    global src
    if src.count(old)!=count: raise RuntimeError(f"Expected {count} anchors for {old[:65]!r}, got {src.count(old)}")
    src=src.replace(old,new)

change('    if (features.reverseImageSearch || features.copyFileContents) targetModules[9978] = 1;',
       '    if (features.reverseImageSearch || features.copyFileContents || features.imageDescriptions) targetModules[9978] = 1;\n'
       '    if (features.channelPreview) selectModules([10596, 17245, 10780]);\n'
       '    if (features.replyTimestamp) targetModules[8013] = 1;')
change('reverseImageSearch: false, copyFileContents: false, noTyping: false,',
       'reverseImageSearch: false, copyFileContents: false, replyTimestamp: false, imageDescriptions: false, channelPreview: false, noTyping: false,',2)
change('    const FEATURE_ICONS = {reverseImageSearch:[13827, "ChatSmileIcon"], copyFileContents:[5141, "CopyIcon"], noDelete:',
       '    const FEATURE_ICONS = {replyTimestamp:[5150, "ClockIcon"], imageDescriptions:[12003, "FileIcon"], channelPreview:[8490, "AtIcon"], reverseImageSearch:[13827, "ChatSmileIcon"], copyFileContents:[5141, "CopyIcon"], noDelete:')
change('        toggle("messages", "copyFileContents", "Copy file contents", "Copy text from a small attached text file.");',
       '        toggle("messages", "copyFileContents", "Copy file contents", "Copy text from a small attached text file.");\n'
       '        toggle("messages", "replyTimestamp", "Reply timestamp", "Show the original message date on quoted replies.");\n'
       '        toggle("messages", "imageDescriptions", "Image descriptions", "Read descriptions provided for attached images.");\n'
       '        toggle("servers", "channelPreview", "Channel preview", "Preview only messages already cached on this device.");')
change('    // Message menu row.\n    function viewRawMessageSheet(',
       more.read_text(encoding="utf-8").rstrip()+'\n    // Message menu row.\n    function viewRawMessageSheet(')
change('        let message = result.message;\n        if (pastelOn) message = pastelMessage(message,row.message);',
       '        let message = result.message;\n'
       '        if (features.replyTimestamp && enabled("replyTimestamp")) message = venusQolReplyTimestamp(message);\n'
       '        if (pastelOn) message = pastelMessage(message,row.message);')
change('features.voiceDownload || features.localEdit) && exports.default && exports.default.prototype)',
       'features.voiceDownload || features.localEdit || features.replyTimestamp) && exports.default && exports.default.prototype)')
change('                if (features.copyFileContents) exports = hookComponent(exports, copyFileContentsSheet);',
       '                if (features.copyFileContents) exports = hookComponent(exports, copyFileContentsSheet);\n'
       '                if (features.imageDescriptions) exports = hookComponent(exports, venusQolDescriptionsSheet);')
change('                return features.viewRaw ? hookComponent(exports, viewRawChannelMenu) : exports;',
       '                if (features.viewRaw) exports = hookComponent(exports, viewRawChannelMenu);\n'
       '                return features.channelPreview ? hookComponent(exports, venusQolChannelMenu) : exports;')
change('            case 17245: return features.viewRaw ? hookComponent(exports, viewRawThreadMenu) : exports;',
       '            case 17245:\n'
       '                if (features.viewRaw) exports = hookComponent(exports, viewRawThreadMenu);\n'
       '                return features.channelPreview ? hookComponent(exports, venusQolThreadMenu) : exports;')
change('            case 10780: return features.viewRaw ? hookComponent(exports, viewRawPostMenu) : exports;',
       '            case 10780:\n'
       '                if (features.viewRaw) exports = hookComponent(exports, viewRawPostMenu);\n'
       '                return features.channelPreview ? hookComponent(exports, venusQolPostMenu) : exports;')
target.write_text(src,encoding="utf-8")
print("Additional QoL hooks integrated.")
