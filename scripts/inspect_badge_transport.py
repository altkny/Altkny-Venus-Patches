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
