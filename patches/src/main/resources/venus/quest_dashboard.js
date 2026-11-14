    // Quest dashboard is read-only. It never changes enrollment, game activity, or rewards.
    const questDashboardNotices = {account:null, seen:new Set(), expiring:new Set()};
    const QUEST_DASHBOARD_LIMIT = 60;
    function questDashboardItems(store) {
        let entries;
        try { const items = store && store.quests; entries = items && typeof items.values === "function" ? Array.from(items.values()) : []; }
        catch (_) { return []; }
        const now = Date.now();
        return entries.filter(item => item && typeof item.id === "string" && item.config).slice(0, 300).map(item => {
            const status = item.userStatus || {}, config = item.config, messages = config.messages || {};
            const expires = questTime(config.expiresAt), completed = !!status.completedAt;
            const claimed = !!(status.claimedAt || status.rewardClaimedAt);
            const enrolled = !!status.enrolledAt, task = questTask(item);
            const rawTasks = (config.taskConfigV2 || config.taskConfig || {}).tasks || {};
            const kinds = Object.keys(rawTasks).filter(k => rawTasks[k] && Number(rawTasks[k].target) > 0);
            const type = kinds.some(k => QUEST_VIDEO_TASKS.includes(k)) ? "Video" :
                kinds.includes(QUEST_PLAY_TASK) ? "Play" :
                kinds.includes(QUEST_ACTIVITY_TASK) ? "Activity" :
                kinds.some(k => /STREAM/i.test(k)) ? "Stream" : "Other";
            const rewardParts = [];
            for (const key of ["rewardName","rewardDescription","rewardTitle","reward"]) {
                if (typeof messages[key] === "string" && messages[key].trim()) rewardParts.push(messages[key].trim());
            }
            const configRewards = config.rewardsConfig || config.rewards;
            if (configRewards && typeof configRewards === "object") {
                const list = Array.isArray(configRewards.rewards) ? configRewards.rewards : Array.isArray(configRewards) ? configRewards : [];
                list.slice(0, 3).forEach(reward => {
                    const name = reward && (reward.name || reward.title || reward.label);
                    if (typeof name === "string" && name.trim()) rewardParts.push(name.trim());
                });
            }
            const reward = Array.from(new Set(rewardParts)).join(" · ") || "Open the Quest for reward details";
            const expiring = Number.isFinite(expires) && expires <= now;
            const progress = task ? Math.max(0, Math.min(1, questProgress(item, task.type) / task.target)) : 0;
            const condition = completed ? "Completed" : expiring ? "Expired" : enrolled ? "Accepted" : "Available";
            const reason = completed ? "The Quest is completed." : expiring ? "The Quest has expired." :
                questFlag(store,"isQuestAccessSuspended") === true ? "Quest access is paused for this account." :
                !task ? "No enabled supported task. Check Quest type settings or open the Quest manually." :
                !enrolled && !settings.questsEnroll ? "Accept this Quest in Discord to begin." :
                quest.running && quest.running.id === item.id ? "Currently running." :
                quest.enrolling ? "Waiting for acceptance to finish." : "Waiting for a compatible task.";
            return {id:item.id, name:questName(item), reward, type, expires, completed, claimed, enrolled,
                condition, progress, reason, completedAt:questTime(status.completedAt), expiring};
        }).sort((a,b) => Number(a.completed) - Number(b.completed) ||
            (Number.isFinite(a.expires) ? a.expires : Infinity) - (Number.isFinite(b.expires) ? b.expires : Infinity));
    }
    function questDashboardDeadline(expires, now) {
        if (!Number.isFinite(expires)) return tr("No expiration date");
        const remaining = expires - now;
        if (remaining <= 0) return tr("Expired");
        const minutes = Math.ceil(remaining / 60000);
        if (minutes < 60) return tr("{n} min left", {n:minutes});
        const hours = Math.floor(minutes / 60);
        if (hours < 48) return tr("{n} h left", {n:hours});
        return tr("{n} days left", {n:Math.ceil(hours / 24)});
    }
    function questDashboardNotify(items, user) {
        if (!user || !settings.questsDashboardAlerts) return;
        const state = questDashboardNotices;
        if (state.account !== user) { state.account=user; state.seen.clear(); state.expiring.clear(); }
        // The first loaded snapshot is a baseline; never toast about old Quests on opening.
        if (!state.seen.size) {
            items.forEach(item=>state.seen.add(item.id));
            return;
        }
        const now=Date.now();
        items.forEach(item=>{
            if (!state.seen.has(item.id)) {
                state.seen.add(item.id);
                if (!item.completed && !item.expiring) reviewToast(reviewUI(), "New Quest available", venusIcon(13929,"QuestsIcon"));
            }
            if (!item.completed && !item.expiring && Number.isFinite(item.expires) &&
                item.expires-now <= 24*3600000 && !state.expiring.has(item.id)) {
                state.expiring.add(item.id);
                reviewToast(reviewUI(), "A Quest expires within 24 hours", venusIcon(5150,"ClockIcon"));
            }
        });
        // Keep notification memory bounded.
        if (state.seen.size > 500) state.seen=new Set(items.map(item=>item.id));
        if (state.expiring.size > 500) state.expiring=new Set(items.filter(item=>item.expires-now<=86400000).map(item=>item.id));
    }
    function QuestDashboard() {
        const [filter,setFilter]=React.useState("active");
        const [type,setType]=React.useState("all");
        const [expanded,setExpanded]=React.useState(null);
        const [tick,setTick]=React.useState(0);
        const [refreshed,setRefreshed]=React.useState(false);
        const store=questStore(), user=currentUser(), id=user && user.id;
        React.useEffect(()=>{
            let active=true;
            const changed=()=>{ if (active) setTick(v=>v+1); };
            const source=questStore();
            try { if (source && typeof source.addChangeListener==="function") source.addChangeListener(changed); } catch (_) {}
            const timer=typeof global.setInterval==="function" ? global.setInterval(changed,60000) : null;
            return ()=>{active=false;
                try { if (source && typeof source.removeChangeListener==="function") source.removeChangeListener(changed); } catch (_) {}
                if (timer!=null && typeof global.clearInterval==="function") global.clearInterval(timer);
            };
        },[id]);
        const all=questDashboardItems(store), now=Date.now();
        React.useEffect(()=>{questDashboardNotify(all,id);},[id,tick,settings.questsDashboardAlerts]);
        const totals={active:all.filter(item=>!item.completed&&!item.expiring).length,
            done:all.filter(item=>item.completed).length,
            expired:all.filter(item=>item.expiring&&!item.completed).length};
        const shown=all.filter(item=>(filter==="all" || filter==="active"&&!item.completed&&!item.expiring ||
            filter==="done"&&item.completed || filter==="expired"&&item.expiring&&!item.completed) &&
            (type==="all" || item.type===type)).slice(0,QUEST_DASHBOARD_LIMIT);
        const ui=reviewUI(), Group=ui.TableRowGroup||RN.View, Row=ui.TableRow;
        const title=tr("Quest dashboard");
        const selector=venusSegmented({key:"questFilter",value:filter,onChange:setFilter,
            items:[{value:"active",label:tr("Active")},{value:"done",label:tr("Done")},
                {value:"expired",label:tr("Expired")},{value:"all",label:tr("All")}]});
        const types=venusSegmented({key:"questType",value:type,onChange:setType,
            items:[{value:"all",label:tr("All types")},{value:"Video",label:tr("Video")},
                {value:"Play",label:tr("Play")},{value:"Activity",label:tr("Activity")}]});
        const rows=shown.map(item=>{
            const opened=expanded===item.id;
            const details=opened ? [
                tr("Reward: {value}",{value:item.reward}),
                tr("Status: {value}",{value:tr(item.condition)}),
                tr("Expires: {value}",{value:Number.isFinite(item.expires)?new Date(item.expires).toLocaleString():tr("Unknown")}),
                item.completed && Number.isFinite(item.completedAt) ?
                    tr("Completed: {value}",{value:new Date(item.completedAt).toLocaleString()}):null,
                item.claimed?tr("Reward claimed"):item.completed?tr("Claim reward in Discord"):null,
                tr("Diagnostics: {value}",{value:tr(item.reason)})
            ].filter(Boolean).join("\n") : null;
            const status=item.completed?tr("Completed"):tr(questDashboardDeadline(item.expires,now));
            const sub=[item.type,status,item.enrolled&&!item.completed?tr("Accepted"):null].filter(Boolean).join(" · ");
            if (Row) return el(Row,{key:"qd:"+item.id,label:item.name,subLabel:opened?sub+"\n"+details:sub,
                arrow:true,onPress:()=>setExpanded(opened?null:item.id)});
            return el(RN.Pressable,{key:item.id,onPress:()=>setExpanded(opened?null:item.id),style:{padding:12}},
                el(RN.Text,{style:{color:"#ffffff",fontWeight:"600"}},item.name),
                el(RN.Text,{style:{color:"#b9bbbe"}},sub+(opened?"\n"+details:"")));
        });
        return el(RN.View,{key:"questDashboard",style:{gap:10}},
            groupTitle("questDashboardTitle",title),
            statusCard("questDashboardOverview",tr("{active} active · {done} completed · {expired} expired",
                {active:totals.active,done:totals.done,expired:totals.expired}),{title,
                IconComponent:venusIcon(13929,"QuestsIcon")}),
            selector,types,
            el(Group,{key:"questDashboardList",title:tr("Quests")},
                rows.length?rows:actionRow(ui,"empty",all.length?tr("No Quests match these filters"):tr("No Quests loaded"),
                    all.length?tr("Change the filters to see more."):tr("Refresh to ask Discord for the current Quest list."),
                    ()=>{},true)),
            actionRow(ui,"questRefresh",tr("Refresh Quests"),refreshed?tr("Refresh requested"):tr("Fetch current Quests using Discord."),
                ()=>{questsFetch(true);setRefreshed(true);},false,false,rowIcon(11630,"RefreshIcon")),
            footnote("questDashboardNote","History shows completed Quests still available in Discord's local store. Reward claims must be made in Discord.")
        );
    }
