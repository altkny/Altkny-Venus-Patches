#!/usr/bin/env python3
"""Integrate the read-only Quest dashboard into the existing Quest settings UI."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
target=root/"patches/src/main/resources/venus/bootstrap.js"
asset=root/"patches/src/main/resources/venus/quest_dashboard.js"
text=target.read_text(encoding="utf-8")
if "function QuestDashboard()" in text:
    print("Quest dashboard already integrated")
    raise SystemExit(0)
def replace(old,new,count=1):
    global text
    n=text.count(old)
    if n != count:
        raise RuntimeError(f"Expected {count} occurrence(s) for {old[:90]!r}, found {n}")
    text=text.replace(old,new)
replace("quests:false, questsVideo:true, questsPlay:true, questsActivity:true, questsEnroll:true,",
        "quests:false, questsVideo:true, questsPlay:true, questsActivity:true, questsEnroll:true, questsDashboardAlerts:false,")
replace("quests: false, questsVideo: true, questsPlay: true, questsActivity: true, questsEnroll: true,",
        "quests: false, questsVideo: true, questsPlay: true, questsActivity: true, questsEnroll: true,")
# defaultSettings contains spaces, settings contains compact style.
replace("quests: false, questsVideo: true, questsPlay: true, questsActivity: true, questsEnroll: true,",
        "quests: false, questsVideo: true, questsPlay: true, questsActivity: true, questsEnroll: true, questsDashboardAlerts: false,")
replace("    // Settings page: the Quest types, a status card and what to know.\n    function QuestSettings() {",
        asset.read_text(encoding="utf-8").rstrip()+"\n    // Settings page: the Quest types, a status card and what to know.\n    function QuestSettings() {")
replace('            el(Group, {key:"types", title:tr("Quests to complete")},',
        '            el(QuestDashboard, {key:"dashboard"}),\n            el(Group, {key:"types", title:tr("Quests to complete")},')
replace('                toggle("questsEnroll", "Accept new Quests", "Accepts new Quests for you, one at a time.", rowIcon(7144, "CircleCheckIcon"))),',
        '                toggle("questsEnroll", "Accept new Quests", "Accepts new Quests for you, one at a time.", rowIcon(7144, "CircleCheckIcon"))),\n'
        '            el(Group, {key:"alerts", title:tr("Quest alerts")},\n'
        '                toggle("questsDashboardAlerts", "Show Quest alerts", "Show in-app alerts for new Quests and Quests expiring within a day while this page is open.", rowIcon(9045, "BellIcon"))),')
target.write_text(text,encoding="utf-8")
print("Quest dashboard integrated into Venus Quest settings.")
