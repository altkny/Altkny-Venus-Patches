#!/usr/bin/env python3
"""Inspect integration anchors in the pinned Venus bootstrap, without changing it."""
from pathlib import Path
import re
p=Path(__file__).resolve().parents[1]/"patches/src/main/resources/venus/bootstrap.js"
s=p.read_text(encoding="utf-8")
lines=s.splitlines()
patterns=[
 r'function (?:Venus|Feature|Quest|Settings)[A-Za-z]*Settings\(',
 r'function (?:Venus|Feature|Settings)[A-Za-z]*(?:Page|Screen|Home|Root)\(',
 r'function (?:Venus|Settings|Feature)[A-Za-z]*(?:Menu|Index|Navigation|List)\(',
 r'function (?:Venus|Quest)Settings\(',
 r'function (?:[A-Za-z]+)Settings\(',
 r'(?:case|key|page|section)[:=].{0,60}[Qq]uests?',
 r'(?:navigation|sections|tabs|routes|features).{0,60}(?:settings|Settings)',
]
hits=set()
for ptn in patterns:
 for m in list(re.finditer(ptn,s))[:30]:
  number=s.count("\n",0,m.start())
  hits.add(number)
print(f"Total lines: {len(lines)}. Found {len(hits)} anchor matches")
for idx in sorted(hits)[:85]:
 print("\n=== L",idx+1,"===")
 for n in range(max(0,idx-3),min(len(lines),idx+7)):
  print(f"{n+1}: {lines[n][:190]}")

for a,b in [(92,125),(1200,1255),(1540,1695),(1760,1870)]:
 print(f"\\n### FOCUSED RANGE {a}-{b} ###")
 for n in range(a-1,min(len(lines),b)):
  print(f"{n+1}: {lines[n][:210]}")

for a,b in [(1690,1760),(1840,1880)]:
 print(f"\\n### FOCUSED RANGE {a}-{b} ###")
 for n in range(a-1,min(len(lines),b)):
  print(f"{n+1}: {lines[n][:450]}")

print("\\n### BADGE TRANSPORT INSPECTION ###")
for ptn in [r'function badges[A-Z][A-Za-z]*\(',r'function badge[A-Z][A-Za-z]*\(',r'function BadgeSettings\(',r'function (?:badge|badges)[A-Za-z]+\(',r'badge(?:s)?\.(?:socket|client|session|activity)',r'PRESENCE_UPDATE']:
 found=list(re.finditer(ptn,s,re.I))[:20]
 print("PATTERN",ptn,"COUNT",len(found))
 for m in found[:12]:
  idx=s.count("\\n",0,m.start())
  print("\\nMATCH LINE",idx+1)
  for n in range(max(0,idx-2),min(len(lines),idx+10)):
   print(f"{n+1}: {lines[n][:240]}")
