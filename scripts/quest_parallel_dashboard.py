#!/usr/bin/env python3
"""Bounded parallel Quest scheduler and visible per-Quest running status.

Applies against the 351.11 Venus bootstrap only, idempotently. Does not
change HTTP message formats, enrollment cadence or reward claim actions.
"""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
target=root/"patches/src/main/resources/venus/bootstrap.js"
s=target.read_text(encoding="utf-8")
if "quest.active instanceof Map" in s:
    print("Parallel Quest scheduler already integrated")
    raise SystemExit(0)
def replace(old,new,count=1):
    global s
    n=s.count(old)
    if n!=count:
        raise RuntimeError(f"Expected {count} anchors, got {n}: {old[:100]!r}")
    s=s.replace(old,new)
replace("questsEnroll:true, questsDashboardAlerts:false,","questsEnroll:true, questsDashboardAlerts:false, questsConcurrent:1,")
replace("questsEnroll: true, questsDashboardAlerts: false,","questsEnroll: true, questsDashboardAlerts: false, questsConcurrent: 1,")
replace('    function questSleep(ms) {',
'''    quest.active = new Map();
    function questActiveLimit() {
        const n = Math.floor(Number(settings.questsConcurrent));
        return n === 2 || n === 3 ? n : 1;
    }
    // Legacy quest.running remains the first active entry for background service
    // compatibility. Each progress loop verifies membership in quest.active.
    function questSyncPrimary() {
        quest.running = quest.active.values().next().value || null;
        backgroundSync();
        notify("quests");
    }
    function questSleep(ms) {''')
replace('        if (!quest.running && ready.length) questRun(ready[0]);',
'''        // Only one Video task at a time. Keep separate heartbeat loops bounded
        // and never select a Quest that already owns a running slot.
        let slots = Math.max(0, questActiveLimit() - quest.active.size);
        let videoInFlight = Array.from(quest.active.values()).some(entry => entry.task.kind === "video");
        for (const item of ready) {
            if (!slots) break;
            if (quest.active.has(item.id)) continue;
            const task = questTask(item);
            if (!task || task.kind === "video" && videoInFlight) continue;
            questRun(item);
            slots--;
            if (task.kind === "video") videoInFlight = true;
        }''')
replace('    function questActive(entry) { return quest.running === entry && entry.generation === quest.generation && enabled("quests"); }',
        '    function questActive(entry) { return quest.active.get(entry.id) === entry && entry.generation === quest.generation && enabled("quests"); }')
replace('''        quest.running = entry;
        backgroundSync();
        notify("quests");''',
'''        if (!task || quest.active.has(item.id) || quest.active.size >= questActiveLimit()) return;
        quest.active.set(entry.id, entry);
        questSyncPrimary();''')
replace('''            if (!done || entry.generation !== quest.generation) return;
            quest.completed++;''',
'''            if (!done || !questActive(entry)) return;
            quest.completed++;''')
replace('''            if (entry.generation !== quest.generation) return;
            const wait = questRetryAfter(error);''',
'''            if (!questActive(entry)) return;
            const wait = questRetryAfter(error);''',1)
replace('''            if (quest.running === entry) { quest.running = null; backgroundSync(); notify("quests"); }
            if (entry.generation === quest.generation) questsSchedule(2000 + Math.floor(Math.random() * 2000));''',
'''            if (quest.active.get(entry.id) === entry) {
                quest.active.delete(entry.id);
                questSyncPrimary();
            }
            if (entry.generation === quest.generation) questsSchedule(2000 + Math.floor(Math.random() * 2000));''')
replace('''        if (!Number.isFinite(n) || quest.running !== entry) return;''',
'''        if (!Number.isFinite(n) || !questActive(entry)) return;''')
replace('''        if (graceful) questTerminate(quest.running);
        quest.generation++;
        quest.running = null; quest.enrolling = false; quest.enrollBlockedUntil = 0; quest.skip.clear();''',
'''        if (graceful) quest.active.forEach(entry => questTerminate(entry));
        quest.generation++;
        quest.active.clear();
        quest.running = null; quest.enrolling = false; quest.enrollBlockedUntil = 0; quest.skip.clear();''')
replace('''        if (quest.user && quest.refetchTimer === undefined && !quest.running) questsStart(8000);''',
'''        if (quest.user && quest.refetchTimer === undefined && !quest.active.size) questsStart(8000);''')
replace('''        // Turning a quest type off stops that kind if it's the one running.
        const running = quest.running && quest.running.task;
        if (!value && running && (key === "questsVideo" && running.kind === "video" || key === "questsActivity" && running.kind === "activity" ||
            key === "questsPlay" && running.kind === "play")) {
            questTerminate(quest.running);
            quest.generation++; quest.running = null; quest.enrolling = false;
            if (quest.scanTimer !== undefined && global.clearTimeout) global.clearTimeout(quest.scanTimer);
            quest.scanTimer = undefined;
            backgroundSync();
        }
        questsSchedule(1000);''',
'''        // Stop only the disabled type; unrelated Quest loops remain intact.
        if (!value && (key === "questsVideo" || key === "questsActivity" || key === "questsPlay")) {
            for (const entry of Array.from(quest.active.values())) {
                if (key === "quests" + entry.task.kind.charAt(0).toUpperCase() + entry.task.kind.slice(1)) {
                    questTerminate(entry);
                    quest.active.delete(entry.id);
                }
            }
            questSyncPrimary();
        }
        questsSchedule(1000);''')
replace('''        if (quest.running) {
            const share = questShare(), left = share != null ? Math.ceil((quest.running.task.target - quest.running.progress) / 60) : 0;
            lines.push(tr("Now: {name}.", {name:quest.running.name}) + (share != null && left > 0 ? " " + pl(left, "About {n} minute left.", "About {n} minutes left.") : ""));
        }''',
'''        if (quest.active.size) {
            lines.push(tr("{n} Quests running", {n:quest.active.size}));
            quest.active.forEach(entry => {
                const progress = typeof entry.progress === "number" && entry.task.target ?
                    Math.min(100,Math.max(0,Math.round(entry.progress*100/entry.task.target))) : 0;
                lines.push(tr("{name}: {n}%", {name:entry.name,n:progress}));
            });
        }''')
replace('''        if (quest.running) return tr("Completing a Quest");''',
'''        if (quest.active.size) return tr("{n} Quests running", {n:quest.active.size});''')
replace('''            el(Group, {key:"types", title:tr("Quests to complete")},''',
'''            el(RN.View,{key:"concurrency",style:{gap:8}},
                groupTitle("concurrentTitle","Quest slots"),
                venusSegmented({key:"concurrentChoice",value:questActiveLimit(),disabled:!on,
                    onChange:value=>setSetting("questsConcurrent",value),
                    items:[{value:1,label:tr("1 Quest")},{value:2,label:tr("2 Quests")},{value:3,label:tr("3 Quests")}]}),
                footnote("concurrentNote","Up to three independent tasks; only one video task at a time. Other Quests wait for a free slot.")),
            el(Group, {key:"types", title:tr("Quests to complete")},''')
# Dashboard is only a view of this scheduler, and reacts to its notifications.
replace('''                quest.running && quest.running.id === item.id ? "Currently running." :''',
'''                quest.active.has(item.id) ? "Currently running." :''')
replace('''            const condition = completed ? "Completed" : expiring ? "Expired" : enrolled ? "Accepted" : "Available";''',
'''            const isRunning=quest.active.has(item.id);
            const condition = completed ? "Completed" : expiring ? "Expired" : isRunning ? "Running" :
                enrolled && task ? "Queued" : enrolled ? "Accepted" : "Available";''')
replace('''            return {id:item.id, name:questName(item), reward, type, expires, completed, claimed, enrolled,
                condition, progress, reason, completedAt:questTime(status.completedAt), expiring};''',
'''            const live = quest.active.get(item.id);
            const shownProgress = live && typeof live.progress === "number" && live.task.target > 0 ?
                Math.max(0,Math.min(1,live.progress/live.task.target)) : progress;
            return {id:item.id, name:questName(item), reward, type, expires, completed, claimed, enrolled,
                condition, running:isRunning, progress:shownProgress, reason, completedAt:questTime(status.completedAt), expiring};''')
replace('''        const totals={active:all.filter(item=>!item.completed&&!item.expiring).length,''',
'''        const running=all.filter(item=>item.running);
        const waiting=all.filter(item=>item.condition==="Queued");
        const totals={active:all.filter(item=>!item.completed&&!item.expiring).length,''')
replace('''            const sub=[item.type,status,item.enrolled&&!item.completed?tr("Accepted"):null].filter(Boolean).join(" · ");''',
'''            const sub=[item.running?tr("RUNNING · {n}%",{n:Math.round(item.progress*100)}):
                item.condition==="Queued"?tr("QUEUED"):tr(item.condition),
                item.type,status].filter(Boolean).join(" · ");''')
replace('''                item.enrolled&&!item.completed?el(VenusProgress,{key:"questProgress:"+item.id,value:item.progress}):null) : null;''',
'''                item.enrolled&&!item.completed?el(VenusProgress,{key:"questProgress:"+item.id,value:item.progress}):null) : null;''')
replace('''            selector,types,
            el(Group,{key:"questDashboardList",title:tr("Quests")},''',
'''            running.length ? el(RN.View,{key:"runningQuests",style:{gap:8}},
                groupTitle("runningTitle","Running now"),
                running.map(item => el(RN.View,{key:"running:"+item.id,
                    style:{borderWidth:1,borderColor:"#5865f2",borderRadius:14,padding:14,
                        backgroundColor:"#5865f21a",gap:6}},
                    el(RN.Text,{style:{color:"#f2f3f5",fontSize:15,fontWeight:"700"}},item.name),
                    el(RN.Text,{style:{color:"#b9c4ff",fontSize:12}},
                        tr("{type} · {n}% complete",{type:tr(item.type),n:Math.round(item.progress*100)})),
                    el(VenusProgress,{key:"runningBar:"+item.id,value:item.progress}),
                    el(RN.Text,{style:{color:"#a7aab2",fontSize:12}},questDashboardDeadline(item.expires,now)))))
                : statusCard("noRunning","No Quest is running right now.",
                    {title:tr("Waiting for Quests"),IconComponent:venusIcon(13929,"QuestsIcon")}),
            waiting.length?statusCard("waitingCount",
                tr("{n} accepted Quests waiting for a free slot.",{n:waiting.length}),
                {title:tr("Queued"),IconComponent:venusIcon(5150,"ClockIcon")}):null,
            selector,types,
            el(Group,{key:"questDashboardList",title:tr("Quests")},''')
target.write_text(s,encoding="utf-8")
print("Integrated bounded parallel Quest scheduler and live-running dashboard.")
