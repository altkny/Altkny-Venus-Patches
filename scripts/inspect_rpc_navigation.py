#!/usr/bin/env python3
"""Read-only index of Discord/Venus settings navigation and RPC transport APIs."""
from pathlib import Path
import re
s=(Path(__file__).resolve().parents[1]/"patches/src/main/resources/venus/bootstrap.js").read_text(encoding="utf8")
lines=s.splitlines()
needles=[
"function VenusSettings","function VenusHome","function SettingsHome","function Features","function withOptions(",
"function nativeRegistry","const nativeRegistry","function withOptions","function openVenus",
"VENUS_CUSTOM_RPC","withOptions(\"advanced\", \"customRpc\"","function VenusRpcSettings",
"case 584:","LOCAL_ACTIVITY_UPDATE","ACTIVITY_UPDATE","UPDATE_ACTIVITY","RPC",
"Settings overview","Settings home","Features list","function SettingsPage",
"function VenusPage","const SECTIONS","registerPage","settingsSections","settingsRoutes",
"getSettingsSections","function HomeSettings","VENUS_SETTINGS","function SettingsRoot",
"Rich Presence","function badgePresence("
]
found=set()
for term in needles:
  matches=[i for i,line in enumerate(lines) if term in line]
  print("\n###",term,"matches",len(matches),"###")
  for i in matches[:5]:
    if i in found: continue
    found.add(i)
    radius=22 if any(x in term for x in ["withOptions","nativeRegistry","VENUS_CUSTOM_RPC","VenusSettings","SettingsHome","SettingsRoot"]) else 8
    for n in range(max(0,i-radius),min(len(lines),i+radius+1)):
      print(f"{n+1}: {lines[n][:400]}")
for a,b in [(1500,1610),(1660,1790),(1820,1930),(1980,2060),(23200,23300)]:
  print("\n=== RANGE",a,b,"===")
  for n in range(a-1,min(len(lines),b)):
    print(f"{n+1}: {lines[n][:360]}")
