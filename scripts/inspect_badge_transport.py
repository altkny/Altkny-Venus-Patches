#!/usr/bin/env python3
"""Read-only inspection of badge activity publication from the pinned JS bundle."""
import re
from pathlib import Path

root=Path(__file__).resolve().parents[1]
s=(root/"patches/src/main/resources/venus/bootstrap.js").read_text(encoding="utf-8")
lines=s.splitlines()
queries=[
    r"function [A-Za-z]*[Bb]adge[A-Za-z]*\(",
    r"function [A-Za-z]*[Pp]resence[A-Za-z]*\(",
    r"function [A-Za-z]*[Gg]ateway[A-Za-z]*\(",
    r"badge.*(?:gateway|socket|activity|presence|connect)",
    r"gateway\.discord",
    r"PRESENCE_UPDATE",
]
printed=set()
print("BOOTSTRAP LINES:",len(lines))
for q in queries:
    found=list(re.finditer(q,s,re.IGNORECASE))
    print("\nPATTERN",q,"COUNT",len(found))
    for m in found[:16]:
        line=s.count("\n",0,m.start())
        if line in printed: continue
        printed.add(line)
        print("\nMATCH L",line+1)
        for n in range(max(0,line-2),min(len(lines),line+22)):
            print(f"{n+1}: {lines[n][:250]}")

print("\n=== FEATURE HOOKS / INITIALIZERS ===")
for needle in ["badgesInit(", "function questDispatch(", "function setSetting(", "function useSettings(", "function badgeStart(", "function badgeStop(", "function badgesStart(", "function badgesStop(", "function backgroundSync(", "if (features.badges)", "case 7656", "BADGE_FALLBACK_GAMES"]:
  ix=[i for i,line in enumerate(lines) if needle in line]
  print("\nNEEDLE",needle,"COUNT",len(ix))
  for line in ix[:5]:
    print("\nAT",line+1)
    for k in range(max(0,line-4),min(len(lines),line+22)):
      print(f"{k+1}: {lines[k][:250]}")

# VENUS RPC NAV INSPECTOR
print("\n====== NAVIGATION ANCHORS ======")
needles=["function VenusSettings", "function VenusHome", "function withOptions(", "nativeRegistry", "function Features", "function SettingsHome", "function SettingsPage", "function SettingsRoot", "function FeatureSettings", '"advanced", "customRpc"', 'function VenusRpcSettings', 'function settingsNative', 'customRpc']
seen=set()
for needle in needles:
    hits=[i for i,t in enumerate(lines) if needle in t]
    print("\nNEEDLE:",needle,"MATCHES",len(hits))
    for i in hits[:7]:
        if i in seen: continue
        seen.add(i)
        print("\nNEAR",i+1)
        for k in range(max(0,i-6),min(len(lines),i+18)):
            print(f"{k+1}: {lines[k][:300]}")
for a,b in [(1540,1695),(1760,1920),(1960,2025)]:
    print("\nRANGE",a,b)
    for n in range(a-1,min(len(lines),b)):
        print(f"{n+1}: {lines[n][:330]}")
