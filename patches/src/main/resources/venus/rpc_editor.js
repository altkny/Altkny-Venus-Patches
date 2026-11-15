// Custom Rich Presence UI for the existing Venus bootstrap closure.
// Official game identities come from the Discord directory. Other apps are user-editable templates.
    const VENUS_RPC_GAMES = [
        "Minecraft","ROBLOX","VALORANT","Fortnite","Terraria","Stardew Valley",
        "Counter-Strike 2","League of Legends","Apex Legends","ELDEN RING",
        "Overwatch","Dota 2"
    ];
    // Curated app examples: never invent application IDs or realtime metadata.
    const VENUS_RPC_APPS = [
        ["Spotify","Music",2,"Listening to music",""],
        ["YouTube Music","Music",2,"Listening to music",""],
        ["Apple Music","Music",2,"Listening to music",""],
        ["SoundCloud","Music",2,"Listening to music",""],
        ["Deezer","Music",2,"Listening to music",""],
        ["TIDAL","Music",2,"Listening to music",""],
        ["YouTube","Video",3,"Watching a video",""],
        ["Netflix","Video",3,"Watching a show",""],
        ["Prime Video","Video",3,"Watching a show",""],
        ["Disney+","Video",3,"Watching a show",""],
        ["Twitch","Video",3,"Watching a stream",""],
        ["Crunchyroll","Video",3,"Watching anime",""],
        ["Visual Studio Code","Development",0,"Working on a project","Editing code"],
        ["Android Studio","Development",0,"Working on an Android project",""],
        ["IntelliJ IDEA","Development",0,"Coding",""],
        ["GitHub","Development",0,"Working on a repository",""],
        ["Termux","Development",0,"Using the terminal",""],
        ["Figma","Creative",0,"Designing",""],
        ["Blender","Creative",0,"Creating 3D art",""],
        ["CapCut","Creative",0,"Editing a video",""],
        ["Krita","Creative",0,"Digital painting",""],
        ["Canva","Creative",0,"Creating a design",""],
        ["Obsidian","Productivity",0,"Writing notes",""],
        ["Notion","Productivity",0,"Organizing a workspace",""],
        ["Google Docs","Productivity",0,"Writing a document",""],
        ["Google Chrome","Productivity",0,"Browsing the web",""],
        ["Firefox","Productivity",0,"Browsing the web",""],
        ["Discord","Social",0,"Chatting",""],
        ["Telegram","Social",0,"Messaging",""],
        ["WhatsApp","Social",0,"Messaging",""]
    ];
    const VENUS_RPC_CATEGORIES = ["All","Music","Video","Development","Creative","Productivity","Social"];
    const VENUS_RPC_COLORS = {
        Music:"#315c50",Video:"#604151",Development:"#364f73",
        Creative:"#635074",Productivity:"#4b586d",Social:"#4c547a",
        Game:"#363d63",Custom:"#424858"
    };
    function venusRpcMonogram(name) {
        const words=String(name||"APP").trim().split(/[\s+\-]+/).filter(Boolean);
        return words.length>1 ? words.slice(0,2).map(w=>w[0]).join("").toUpperCase():
            (words[0]||"AP").slice(0,2).toUpperCase();
    }
    function venusRpcAppEntries() {
        // The previous version selected compatibility mode for these
        // templates. It only dispatches local activities and did not provide
        // a reliable route for non-game presets to become remotely visible.
        return VENUS_RPC_APPS.map(([name,category,type,details,state])=>({
            id:"app:"+name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),
            name,category,type,details,state,source:"preset",applicationId:"",
            packageName:typeof VENUS_RPC_KNOWN_PACKAGES!=="undefined"?
                VENUS_RPC_KNOWN_PACKAGES[name]||"":"",
            autoDetect:false,sendMode:"kizzy",elapsed:type===0
        }));
    }
    function venusRpcIsAppPreset(p) {
        return !!(p&&typeof p.id==="string"&&p.id.startsWith("app:"));
    }
    function venusRpcNeedsGateway(p) {
        return venusRpcIsAppPreset(p)&&
            !/^\d{17,20}$/.test(String(p.applicationId||""));
    }
    const VENUS_RPC_TYPES = [
        [0,"Playing"],[2,"Listening"],[3,"Watching"],[1,"Streaming"],[5,"Competing"]
    ];
    const VENUS_RPC_EMPTY = {id:"custom",name:"Custom Activity",applicationId:"",details:"",state:"",
        iconHash:"",iconUrl:"",category:"Custom",packageName:"",autoDetect:false,
        largeImage:"",smallImage:"",largeText:"",smallText:"",
        type:0,streamUrl:"",platform:"",partyCurrent:0,partyMax:0,
        sendMode:"rich",timeOffsetSeconds:0,
        elapsed:true,buttons:[{label:"",url:""},{label:"",url:""}]};
    function venusRpcClean(x,n) { return typeof x === "string" ? x.trim().slice(0,n || 128) : ""; }
    function venusRpcNormalize(value) {
        const p = value && typeof value === "object" ? value : {};
        const buttons = Array.isArray(p.buttons) ? p.buttons : [];
        return {
            id:venusRpcClean(p.id,64) || "custom",
            applicationId:venusRpcClean(p.applicationId,20),
            iconHash:venusRpcClean(p.iconHash,40),
            iconUrl:venusRpcValidUrl(venusRpcClean(p.iconUrl,512))?
                venusRpcClean(p.iconUrl,512):"",
            category:venusRpcClean(p.category,32)||"Custom",
            packageName:/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(
                venusRpcClean(p.packageName,128))?venusRpcClean(p.packageName,128):"",
            autoDetect:p.autoDetect===true,
            name:venusRpcClean(p.name) || "Custom Activity",
            details:venusRpcClean(p.details),state:venusRpcClean(p.state),
            largeImage:venusRpcClean(p.largeImage,256),smallImage:venusRpcClean(p.smallImage,256),
            largeText:venusRpcClean(p.largeText),smallText:venusRpcClean(p.smallText),
            type:[0,1,2,3,5].includes(Number(p.type))?Number(p.type):0,
            streamUrl:venusRpcClean(p.streamUrl,512),
            platform:["android","desktop","embedded","ios","ps4","ps5","samsung","xbox"]
                .includes(p.platform)?p.platform:"",
            partyCurrent:Math.max(0,Math.min(99,Math.floor(Number(p.partyCurrent)||0))),
            partyMax:Math.max(0,Math.min(99,Math.floor(Number(p.partyMax)||0))),
            sendMode:venusRpcNeedsGateway(p)?"kizzy":
                p.sendMode==="kizzy"?"kizzy":p.sendMode==="compat"?"compat":"rich",
            timeOffsetSeconds:Math.max(0,Math.min(7*86400,Math.floor(Number(p.timeOffsetSeconds)||0))),
            elapsed:p.elapsed === true,
            buttons:[0,1].map(i=>({label:venusRpcClean(buttons[i] && buttons[i].label,32),
                url:venusRpcClean(buttons[i] && buttons[i].url,512)}))
        };
    }
    function venusRpcProfiles() {
        try {
            const a=JSON.parse(settings.rpcProfiles || "[]");
            return Array.isArray(a) ? a.slice(0,64).map(venusRpcNormalize) : [];
        } catch (_) { return []; }
    }
    function venusRpcValidUrl(url) { return /^https:\/\/[^\s]+$/i.test(url); }
    function venusRpcTime(seconds) {
        const n=Math.max(0,Math.floor(Number(seconds)||0)), h=Math.floor(n/3600), m=Math.floor(n%3600/60), s=n%60;
        return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
    }
    // Always derive elapsed time from the original epoch. A delayed Android timer
    // callback must never make the clock permanently fall behind.
    function venusRpcElapsedSeconds(startedAt,now) {
        return Number.isFinite(startedAt)&&startedAt>0 ?
            Math.max(0,Math.floor((now-startedAt)/1000)) : 0;
    }
    function venusRpcNextClockDelay(startedAt,now) {
        const elapsed=Math.max(0,now-startedAt);
        return Math.max(40,1000-(elapsed%1000)+15);
    }
    function VenusRpcClock(props) {
        // Dedicated component: updating the clock does not redraw the entire
        // games catalog, its thumbnails and all editable text fields.
        const [now,setNow]=React.useState(Date.now());
        React.useEffect(()=>{
            let mounted=true,handle=null,subscription=null;
            const refresh=()=>{
                if(!mounted) return;
                if(handle!==null&&global.clearTimeout) global.clearTimeout(handle);
                const current=Date.now();
                setNow(current);
                if(global.setTimeout)
                    handle=global.setTimeout(refresh,venusRpcNextClockDelay(props.startedAt,current));
            };
            refresh();
            // Android suspends JS timers in the background. Resync immediately
            // when returning to the Discord settings page.
            try {
                if(RN&&RN.AppState&&typeof RN.AppState.addEventListener==="function")
                    subscription=RN.AppState.addEventListener("change",state=>{
                        if(state==="active") refresh();
                    });
            } catch (_) {}
            return ()=>{
                mounted=false;
                if(handle!==null&&global.clearTimeout) global.clearTimeout(handle);
                if(subscription&&typeof subscription.remove==="function") subscription.remove();
            };
        },[props.startedAt]);
        return el(RN.Text,{style:{color:"#a7abb6",fontSize:12}},
            venusRpcTime(venusRpcElapsedSeconds(props.startedAt,now))+" elapsed");
    }
    function VenusRpcCover(props) {
        const [failed,setFailed]=React.useState(false);
        React.useEffect(()=>{setFailed(false);},[props.uri]);
        const size=props.size||64;
        const radius=props.circle?size/2:14;
        const tileColor=props.tint||"#363d50";
        return el(RN.View,{style:{height:size,width:size,borderRadius:radius,
            backgroundColor:tileColor,alignItems:"center",justifyContent:"center",overflow:"hidden"}},
            props.uri&&!failed?el(RN.Image,{
                source:{uri:props.uri},resizeMode:"cover",
                onError:()=>setFailed(true),
                style:{width:size,height:size,borderRadius:radius}
            }):el(RN.Text,{style:{fontSize:size<40?10:Math.min(18,Math.round(size*0.28)),
                color:"#eef0ff",fontWeight:"800",letterSpacing:0.5}},
                props.label||"GAME"));
    }
    function venusRpcParseTime(value) {
        const x=String(value||"").trim();
        if(!/^(?:\d{1,3}:)?\d{1,2}:\d{1,2}$/.test(x)) return null;
        const parts=x.split(":").map(Number);
        const h=parts.length===3?parts[0]:0,m=parts.length===3?parts[1]:parts[0],s=parts[parts.length-1];
        if(m>59||s>59) return null;
        const n=h*3600+m*60+s;
        return n<=7*86400?n:null;
    }
    function VenusRpcSettings() {
        useSettings("rpcProfiles"); useSettings("rpcSelected"); useSettings("rpcEnabled"); useSettings("rpcCatalog");
        const [profile,edit]=React.useState(()=>venusRpcNormalize(
            venusRpcProfiles().find(x=>x.id===settings.rpcSelected) ||
            Object.assign({},VENUS_RPC_EMPTY,{name:"Minecraft",id:"minecraft"})));
        const [started,setStarted]=React.useState(Date.now());
        const [notice,setNotice]=React.useState("");
        const [search,setSearch]=React.useState("");
        const [library,setLibrary]=React.useState("games");
        const [appCategory,setAppCategory]=React.useState("All");
        const [visible,setVisible]=React.useState(16);
        const [liveSync,setLiveSync]=React.useState(true);
        const [gatewayToken,setGatewayToken]=React.useState("");
        const [gatewayConsent,setGatewayConsent]=React.useState(false);
        useSettings("rpcGateway");
        useSettings("rpcDetection");
        useSettings("rpcDetectionEnabled");
        const [tab,setTab]=React.useState("games");
        const [manualTime,setManualTime]=React.useState(()=>
            venusRpcTime(venusRpcNormalize(venusRpcProfiles().find(x=>x.id===settings.rpcSelected)||
                VENUS_RPC_EMPTY).timeOffsetSeconds));
        const rpcRunning=!!(settings.rpcEnabled && venusRpcTransport.active &&
            (venusRpcTransport.mode!=="kizzy"||venusRpcGateway.status==="submitted"));
        React.useEffect(()=>{
            if(tab==="detect") venusRpcDetectionCheckPermission();
        },[tab]);
        React.useEffect(()=>{
            let active=true;
            Promise.resolve().then(()=>venusRpcCatalogLoad(false)).catch(()=>{}).then(()=>{
                if(active) setVisible(n=>Math.max(16,n));
            });
            return ()=>{active=false;};
        },[]);
        // On an active profile, debounce edits and update the real Discord activity
        // without needing to tap Publish after every key stroke.
        React.useEffect(()=>{
            if(!liveSync || !rpcRunning || venusRpcTransport.profileId!==profile.id) return;
            if(!global.setTimeout) return;
            // Discord's activity updates have a documented frequency limit.
            const cooldown=Math.max(0,4200-(Date.now()-venusRpcTransport.lastSent));
            const handle=global.setTimeout(()=>{
                if(!settings.rpcEnabled || venusRpcTransport.profileId!==profile.id) return;
                const p=venusRpcNormalize(profile);
                const result=venusRpcPublish(p,true);
                if(result.ok){
                    const saved=venusRpcProfiles().filter(x=>x.id!==p.id);
                    saved.unshift(p);
                    setSetting("rpcProfiles",JSON.stringify(saved.slice(0,64)));
                }
            },Math.max(850,cooldown));
            return ()=>{if(global.clearTimeout) global.clearTimeout(handle);};
        },[profile,liveSync,rpcRunning]);
        if (!RN || !React) return null;
        const fg="#f2f3f5", muted="#a7abb6", line="#343842", panel="#262a34", accent="#7983f5";
        const text=(value,style)=>el(RN.Text,{style:Object.assign({color:fg,fontSize:14},style||{})},value);
        const field=(label,key,placeholder,limit)=>{
            const value=profile[key] || "";
            return el(RN.View,{key:"rpc:"+key,style:{gap:6,marginBottom:9}},
                text(label,{fontSize:12,color:muted,fontWeight:"600"}),
                el(RN.TextInput,{
                    accessibilityLabel:label,
                    style:{color:fg,backgroundColor:"#171a21",borderWidth:1,borderColor:line,
                        borderRadius:10,paddingHorizontal:12,paddingVertical:9,fontSize:14},
                    value,placeholder,placeholderTextColor:"#818792",
                    maxLength:limit||128,autoCorrect:false,
                    onChangeText:v=>edit(p=>Object.assign({},p,{[key]:v},
                        key==="applicationId" ? {iconHash:""} : {}))}));
        };
        const button=(label,press,selected,key)=>{
            return el(RN.Pressable,{key:key||label,accessibilityRole:"button",onPress:press,
                style:{paddingVertical:10,paddingHorizontal:13,borderRadius:10,
                    borderWidth:1,borderColor:selected?accent:line,backgroundColor:selected?"#5865f23a":panel}},
                text(label,{fontWeight:"600",color:selected?"#c5caff":fg,fontSize:13}));
        };
        const choose=(game)=>{
            if(game&&/^\d{17,20}$/.test(String(game.id||"")))
                venusRpcWarmApplication(game.id);
            const saved=venusRpcProfiles().find(x=>x.id===game.id ||
                (game.applicationId&&x.applicationId===game.applicationId));
            const preset=game&&game.source==="preset";
            const keepGateway=venusRpcTransport.mode==="kizzy"&&venusRpcGatewayAuthorized();
            const p=saved ? venusRpcNormalize(saved) :
                venusRpcNormalize(Object.assign({},VENUS_RPC_EMPTY,
                    preset?game:{
                        id:game.id,applicationId:game.id,name:game.name,
                        iconHash:game.icon||"",category:"Game",
                        sendMode:keepGateway?"kizzy":"rich"
                    },preset?{sendMode:"kizzy"}:{}));
            edit(p);
            setManualTime(venusRpcTime(p.timeOffsetSeconds));
            setStarted(Date.now()-p.timeOffsetSeconds*1000);
            setNotice("");
        };
        const custom=()=>{
            const p=venusRpcNormalize(Object.assign({},VENUS_RPC_EMPTY,{
                id:"custom:"+Date.now().toString(36),
                name:"My App",category:"Custom",
                sendMode:"kizzy"
            }));
            edit(p);
            setManualTime(venusRpcTime(p.timeOffsetSeconds));
            setStarted(Date.now()-p.timeOffsetSeconds*1000);
            setTab("editor");setNotice("");
        };
        const updateButton=(index,key,value)=>edit(p=>{
            const buttons=p.buttons.map(x=>Object.assign({},x));
            buttons[index][key]=value;
            return Object.assign({},p,{buttons});
        });
        const saveCurrent=()=>{
            const p=venusRpcNormalize(profile);
            if (!p.name) {setNotice("Choose a name first.");return;}
            const invalid=p.buttons.some(b=>(b.label||b.url) && (!b.label||!venusRpcValidUrl(b.url)));
            if (invalid) {setNotice("Buttons need a label and a valid HTTPS link.");return;}
            const items=venusRpcProfiles().filter(x=>x.id!==p.id);
            items.unshift(p);
            setSetting("rpcProfiles",JSON.stringify(items.slice(0,64)));
            setSetting("rpcSelected",p.id);
            edit(p);
            setNotice("Profile saved on this device.");
        };
        const publishProfile=p=>{
            const normalized=venusRpcNormalize(p);
            // App templates must never appear to work just because the
            // internal dispatcher returned true. Route the user to the
            // actual publisher setup instead of sending a fake success.
            if(normalized.sendMode==="kizzy"&&!venusRpcGatewayAuthorized()){
                edit(normalized);
                setTab("send");
                setNotice("This app needs a connected Gateway session. Configure it in Publication first. No activity was sent.");
                return false;
            }
            const resume=rpcRunning&&venusRpcTransport.profileId===normalized.id;
            const result=venusRpcPublish(normalized,resume);
            if(!result.ok){
                if(normalized.sendMode==="kizzy") setTab("send");
                setNotice(result.error);return false;
            }
            const items=venusRpcProfiles().filter(x=>x.id!==normalized.id);
            items.unshift(normalized);
            setSetting("rpcProfiles",JSON.stringify(items.slice(0,64)));
            setSetting("rpcSelected",normalized.id);
            setSetting("rpcEnabled",true);
            backgroundSync();
            edit(normalized);
            setStarted(venusRpcTransport.startedAt);
            setNotice(result.pending?
                "Connecting to Gateway. No confirmation of public visibility yet.":
                normalized.sendMode==="kizzy"?
                "Presence sent to Gateway. Discord can still reject or hide the activity.":
                "Local activity dispatched. This does not confirm visibility to other accounts.");
            return true;
        };
        const publishCurrent=()=>publishProfile(profile);
        const authorizeGateway=()=>{
            const consent=venusRpcGatewayAuthorize(gatewayToken,gatewayConsent);
            if(!consent.ok){setNotice(consent.error);return;}
            setGatewayToken("");
            const p=venusRpcNormalize(Object.assign({},profile,{sendMode:"kizzy"}));
            setTab("send");
            publishProfile(p);
        };
        const stopCurrent=()=>{
            setSetting("rpcDetectionEnabled",false);
            venusRpcDetectionStop(true);
            setSetting("rpcEnabled",false);
            venusRpcClear();
            setNotice("Activity stopped.");
        };
        const removeCurrent=()=>{
            const items=venusRpcProfiles().filter(x=>x.id!==profile.id);
            setSetting("rpcProfiles",JSON.stringify(items));
            if(settings.rpcSelected===profile.id) stopCurrent();
            setSetting("rpcSelected","");
            edit(venusRpcNormalize(VENUS_RPC_EMPTY));
            setNotice("Saved profile removed.");
        };
        const resetTimer=()=>{
            const p=venusRpcNormalize(Object.assign({},profile,{timeOffsetSeconds:0}));
            edit(p);setManualTime("00:00:00");
            if(rpcRunning&&venusRpcTransport.profileId===profile.id){
                const result=venusRpcPublish(p,false);
                if(!result.ok){setNotice(result.error);return;}
                setStarted(venusRpcTransport.startedAt);
                setNotice("Timer restarted in Discord and in the preview.");
            } else {
                setStarted(Date.now());
                setNotice("Preview timer restarted.");
            }
        };
        const applyManualTime=()=>{
            const seconds=venusRpcParseTime(manualTime);
            if(seconds===null){setNotice("Use HH:MM:SS, up to 168 hours.");return;}
            edit(p=>Object.assign({},p,{timeOffsetSeconds:seconds}));
            setStarted(Date.now()-seconds*1000);
            setNotice("Elapsed time adjusted. Publish to apply it to your activity.");
        };
        const typePicker=el(RN.View,{key:"typePicker",style:{gap:8}},
            text("Activity style",{fontSize:14,fontWeight:"700"}),
            el(RN.View,{style:{flexDirection:"row",flexWrap:"wrap",gap:7}},
                VENUS_RPC_TYPES.map(([kind,label])=>
                    button(label,()=>edit(p=>Object.assign({},p,{type:kind})),
                        profile.type===kind,"kind:"+kind))));
        const deliveryPicker=el(RN.View,{key:"delivery",style:{gap:9}},
            text("Publication format",{fontSize:15,fontWeight:"700"}),
            button("Full Rich Presence · Application ID",()=>
                edit(p=>Object.assign({},p,{sendMode:"rich"})),
                profile.sendMode==="rich","rich"),
            button("Compatibility · Local-only experimental",()=>{
                if(venusRpcNeedsGateway(profile)){
                    setNotice("Third-party app templates without an Application ID cannot use local Compatibility to publish. Use the Gateway connection.");
                    setTab("send");
                    return;
                }
                edit(p=>Object.assign({},p,{sendMode:"compat"}));
            },
                profile.sendMode==="compat","compat"),
            button("Kizzy Gateway · Independent WebSocket",()=>
                edit(p=>Object.assign({},p,{sendMode:"kizzy"})),
                profile.sendMode==="kizzy","kizzy"),
            text("Full and Compatibility only use the client dispatcher. This has not been verified as public activity. App templates require Gateway publication until an official Android Rich Presence transport is integrated.",
                {color:muted,fontSize:12,lineHeight:18}));
        const image=(p,small,size)=>el(VenusRpcCover,{
            key:(small?"small:":"cover:")+(venusRpcPreviewImage(p,small)||"none"),
            uri:venusRpcPreviewImage(p,small),size:size||64,circle:!!small,
            tint:VENUS_RPC_COLORS[p.category]||VENUS_RPC_COLORS.Custom,
            label:small?"?":venusRpcMonogram(p.name)
        });
        const elapsedStart=rpcRunning&&venusRpcTransport.profileId===profile.id&&venusRpcTransport.startedAt ?
            venusRpcTransport.startedAt : started;
        const preview=el(RN.View,{key:"preview",accessible:true,style:{borderRadius:16,
            backgroundColor:"#20232b",borderWidth:1,borderColor:"#414651",padding:15,gap:10}},
            el(RN.View,{style:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}},
                text((VENUS_RPC_TYPES.find(row=>row[0]===profile.type)||VENUS_RPC_TYPES[0])[1].toUpperCase()+
                    " · "+(profile.sendMode==="kizzy"?"KIZZY GATEWAY":
                        profile.sendMode==="compat"?"COMPATIBILITY":"RICH PRESENCE"),
                    {fontSize:10,color:muted,fontWeight:"700",letterSpacing:0.5}),
                text("LIVE PREVIEW",{fontSize:10,color:"#a8b0ff",fontWeight:"700"})),
            el(RN.View,{style:{flexDirection:"row",gap:12,alignItems:"center"}},
                el(RN.View,{style:{width:72,height:72,justifyContent:"center",alignItems:"center",
                    backgroundColor:"#343950",borderRadius:12}},image(profile,false,72),
                    profile.smallImage?el(RN.View,{style:{position:"absolute",right:-6,bottom:-5,
                        borderWidth:2,borderColor:"#20232b",borderRadius:18}},image(profile,true,30)):null),
                el(RN.View,{style:{flex:1,gap:4}},
                    text(profile.name || "Custom Activity",{fontWeight:"700",fontSize:16}),
                    profile.details?text(profile.details,{fontSize:13}):null,
                    profile.state?text(profile.state,{color:muted,fontSize:12}):null,
                    profile.elapsed?el(VenusRpcClock,{startedAt:elapsedStart}):null)),
            profile.buttons.filter(b=>b.label&&venusRpcValidUrl(b.url)).map((b,i)=>
                el(RN.View,{key:"previewbutton"+i,style:{backgroundColor:"#414651",
                    borderRadius:8,paddingVertical:9,alignItems:"center"}},
                    text(b.label,{fontSize:13,fontWeight:"600"}))),
            text(rpcRunning && venusRpcTransport.profileId===profile.id ?
                (profile.sendMode==="kizzy"?
                    "Submitted to Gateway · public visibility not verified":
                    "Local dispatcher active · visibility unverified") :
                "Preview mode · select a game and publish to start.",
                {fontSize:11,color:rpcRunning?"#86d6b2":"#e7c88a"}));
        const catalog=venusRpcKnownGames();
        const appTemplates=React.useMemo(venusRpcAppEntries,[]);
        const query=search.trim().toLowerCase();
        const featured=React.useMemo(()=>VENUS_RPC_GAMES.map(name=>
            catalog.find(g=>g.name.toLowerCase()===name.toLowerCase()))
            .filter(Boolean).slice(0,6),[catalog]);
        // Bound the mounted list to the current page: Android does not need
        // thousands of image components or cards in a single ScrollView.
        const matches=React.useMemo(()=>{
            const found=[];
            for(const game of catalog){
                if(!query||game.name.toLowerCase().includes(query)||game.id.includes(query)){
                    found.push(game);
                    if(found.length>visible) break;
                }
            }
            return found;
        },[catalog,query,visible]);
        const gamesToShow=matches.slice(0,visible);
        const appMatches=React.useMemo(()=>appTemplates.filter(app=>
            (appCategory==="All"||app.category===appCategory)&&
            (!query||app.name.toLowerCase().includes(query)||
                app.category.toLowerCase().includes(query))),[appTemplates,appCategory,query]);
        const appsToShow=appMatches.slice(0,visible);
        const tile=(item,isApp,featuredTile)=>{
            const selected=profile.id===item.id||
                (!isApp&&profile.applicationId===item.id);
            const tileProfile=isApp?item:{
                applicationId:item.id,iconHash:item.icon,name:item.name,category:"Game"
            };
            return el(RN.Pressable,{
                key:(isApp?"app:":"game:")+item.id+(featuredTile?":top":""),
                accessibilityRole:"button",
                accessibilityLabel:(isApp?"App ":"Game ")+item.name,
                accessibilityState:{selected},
                onPress:()=>{choose(item);setNotice("");},
                style:{
                    flexDirection:"row",alignItems:"center",gap:12,
                    paddingHorizontal:12,paddingVertical:11,marginBottom:4,
                    borderRadius:15,borderWidth:1,
                    borderColor:selected?"#8f98ff":"#3b404f",
                    backgroundColor:selected?"#333c5e":"#242936"
                }
            },
                image(tileProfile,false,48),
                el(RN.View,{style:{flex:1,gap:4}},
                    text(item.name,{fontSize:14,fontWeight:"700",numberOfLines:1}),
                    text(isApp?item.category+" · "+(
                        (VENUS_RPC_TYPES.find(t=>t[0]===item.type)||VENUS_RPC_TYPES[0])[1]
                    )+" · Editable preset":"Official Discord game identity",
                        {fontSize:11,color:muted,numberOfLines:1})),
                selected?text("✓",{fontSize:19,color:"#a9b3ff",fontWeight:"700"}):
                    text("›",{fontSize:23,color:"#8e96ae"}));
        };
        const librarySelector=el(RN.View,{key:"librarySwitch",
            style:{flexDirection:"row",gap:8}},
            button("Games · "+catalog.length,()=>{
                setLibrary("games");setVisible(16);setSearch("");
            },library==="games","libraryGames"),
            button("Apps · "+appTemplates.length,()=>{
                setLibrary("apps");setVisible(16);setSearch("");
            },library==="apps","libraryApps"));
        const searchField=el(RN.TextInput,{
            key:"catalogSearch",
            accessibilityLabel:library==="games"?"Search games":"Search apps",
            placeholder:library==="games"?"Search official games or IDs...":
                "Search music, video, creative apps...",
            placeholderTextColor:"#9aa1b5",value:search,
            autoCapitalize:"none",autoCorrect:false,
            onChangeText:value=>{setSearch(value);setVisible(16);},
            style:{color:fg,backgroundColor:"#171b27",borderColor:"#4a5165",
                borderWidth:1,borderRadius:13,
                paddingHorizontal:15,paddingVertical:12,fontSize:14}
        });
        const gamesCatalog=el(RN.View,{key:"gameCatalog",style:{gap:10}},
            !query&&featured.length?el(RN.View,{style:{gap:5}},
                text("Featured games",{fontSize:15,fontWeight:"700"}),
                ...featured.map(g=>tile(g,false,true))):null,
            text("Official game library",{fontSize:15,fontWeight:"700"}),
            text((venusRpcCatalog.source==="discord"?"Discord directory · ":
                venusRpcCatalog.loading?"Loading game directory · ":
                "Offline fallback · ")+catalog.length+" available entries",
                {fontSize:12,color:muted}),
            venusRpcCatalog.error?text(venusRpcCatalog.error,
                {fontSize:11,color:"#e6bb8d"}):null,
            ...gamesToShow.map(g=>tile(g,false,false)),
            !gamesToShow.length?text("No matching games.",{color:muted,fontSize:12}):null,
            matches.length>visible?button("Show more games",()=>
                setVisible(n=>Math.min(n+40,500)),false,"moreGames"):null,
            button("Update game directory",()=>{
                setNotice("Updating official game directory...");
                venusRpcCatalogLoad(true)
                    .then(g=>setNotice("Directory updated: "+g.length+" entries."))
                    .catch(()=>setNotice("Game directory is unavailable."));
            },false,"refreshGames"));
        const appCatalog=el(RN.View,{key:"appCatalog",style:{gap:10}},
            text("Apps beyond gaming",{fontSize:16,fontWeight:"700"}),
            text("Music, video, development, art, productivity and social apps. Publishing needs a connected Gateway session; these are manually edited, not live integrations.",
                {fontSize:12,color:muted,lineHeight:18}),
            el(RN.View,{style:{flexDirection:"row",flexWrap:"wrap",gap:6}},
                ...VENUS_RPC_CATEGORIES.map(category=>
                    button(category,()=>{
                        setAppCategory(category);setVisible(16);
                    },appCategory===category,"cat:"+category))),
            ...appsToShow.map(app=>tile(app,true,false)),
            !appsToShow.length?text("No matching apps.",{fontSize:12,color:muted}):null,
            appMatches.length>visible?button("Show more apps",()=>
                setVisible(n=>Math.min(n+40,200)),false,"moreApps"):null,
            button("Create a custom app profile",custom,false,"newApp"));
        const presets=el(RN.View,{key:"catalog",style:{gap:12}},
            librarySelector,searchField,
            library==="apps"?appCatalog:gamesCatalog);
        const saved=venusRpcProfiles();
        const savedRows=saved.length?el(RN.View,{key:"saved",style:{gap:7}},
            text("Quick switch · Saved profiles",{fontSize:15,fontWeight:"700"}),
            el(RN.ScrollView,{horizontal:true,showsHorizontalScrollIndicator:false,
                contentContainerStyle:{flexDirection:"row",gap:8,paddingVertical:2}},
                ...saved.map(p=>el(RN.View,{key:p.id,style:{
                    flexDirection:"row",alignItems:"center",gap:4,
                    padding:3,borderRadius:12,backgroundColor:"#292e40"}},
                    button(p.name,()=>choose(p),p.id===profile.id,p.id+"saved"),
                    button("▶",()=>publishProfile(p),false,p.id+"publish"))))):null;
        const buttons=[0,1].map(i=>el(RN.View,{key:"custombutton"+i,style:{gap:6,marginVertical:4}},
            text("Button "+(i+1),{fontSize:13,fontWeight:"700"}),
            el(RN.TextInput,{accessibilityLabel:"Button "+(i+1)+" label",value:profile.buttons[i].label,
                placeholder:"Button label",placeholderTextColor:muted,maxLength:32,
                style:{color:fg,backgroundColor:"#171a21",padding:10,borderRadius:10},
                onChangeText:value=>updateButton(i,"label",value)}),
            el(RN.TextInput,{accessibilityLabel:"Button "+(i+1)+" URL",value:profile.buttons[i].url,
                placeholder:"https://example.com",placeholderTextColor:muted,maxLength:512,
                autoCapitalize:"none",autoCorrect:false,keyboardType:"url",
                style:{color:fg,backgroundColor:"#171a21",padding:10,borderRadius:10},
                onChangeText:value=>updateButton(i,"url",value)})));
        const menu=el(RN.View,{key:"navigation",style:{flexDirection:"row",gap:7}},
            [["games","Library"],["editor","Edit"],["detect","Detect"],["send","Send"]].map(([id,label])=>
                el(RN.Pressable,{key:id,onPress:()=>setTab(id),accessibilityRole:"tab",
                    accessibilityState:{selected:tab===id},
                    style:{flex:1,alignItems:"center",paddingVertical:12,borderRadius:12,
                        borderColor:tab===id?"#9aa3ff":"#414552",borderWidth:1,
                        backgroundColor:tab===id?"#505c9a":"#272b37"}},
                    text(label,{fontSize:12,fontWeight:tab===id?"700":"500"}))));
        const elapsedPicker=el(RN.View,{key:"elapsedPicker",style:{gap:9}},
            el(RN.View,{style:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}},
                text("Show elapsed time",{fontSize:13,fontWeight:"600"}),
                el(RN.Switch,{value:profile.elapsed,onValueChange:v=>
                    edit(p=>Object.assign({},p,{elapsed:v}))})),
            text("Start at a custom elapsed time",{fontSize:12,color:muted}),
            el(RN.View,{style:{flexDirection:"row",gap:8,alignItems:"center"}},
                el(RN.TextInput,{accessibilityLabel:"Elapsed time HH:MM:SS",
                    value:manualTime,onChangeText:setManualTime,placeholder:"HH:MM:SS",
                    placeholderTextColor:muted,autoCorrect:false,keyboardType:"numbers-and-punctuation",
                    style:{flex:1,color:fg,backgroundColor:"#171a21",borderColor:line,
                        borderWidth:1,padding:11,borderRadius:10}}),
                button("Apply",applyManualTime,false,"applyElapsed")),
            text("Example: 02:30:00 starts the activity at 2 hours and 30 minutes. Maximum: 168 hours.",
                {fontSize:11,color:muted}),
            el(RN.View,{style:{flexDirection:"row",gap:7,flexWrap:"wrap"}},
                button("Start now",resetTimer,false,"resetElapsed"),
                button("+5 minutes",()=>{
                    const base=venusRpcParseTime(manualTime)||0;
                    setManualTime(venusRpcTime(Math.min(7*86400,base+300)));
                },false,"timePlus5"),
                button("+1 hour",()=>{
                    const base=venusRpcParseTime(manualTime)||0;
                    setManualTime(venusRpcTime(Math.min(7*86400,base+3600)));
                },false,"timePlus1h")));
        const editor=el(RN.View,{key:"editorTab",style:{gap:10}},
            text("Activity type",{fontSize:17,fontWeight:"700"}),
            typePicker,
            text("Activity identity",{fontSize:16,fontWeight:"700"}),
            text(profile.category==="Game"&&profile.applicationId?
                "Discord game · Official name, app ID and icon. Live game stats must be entered manually.":
                "Custom app · Set the activity name and what you are doing.",
                {fontSize:12,color:muted,lineHeight:18}),
            field("Activity name","name","Minecraft"),
            field("Android package ID (detection only)","packageName","com.spotify.music",128),
            field("Details","details","Exploring the Overworld"),
            field("State","state","In a world"),
            profile.type===1?field("Streaming URL","streamUrl","https://twitch.tv/channel",512):null,
            text("Platform",{fontSize:14,fontWeight:"700"}),
            el(RN.View,{style:{flexDirection:"row",flexWrap:"wrap",gap:6}},
                [["","Automatic"],["android","Android"],["desktop","Desktop"],
                    ["ios","iOS"],["xbox","Xbox"],["ps5","PS5"]].map(([value,label])=>
                    button(label,()=>edit(p=>Object.assign({},p,{platform:value})),
                        profile.platform===value,"platform:"+label))),
            text("Group size (optional)",{fontSize:14,fontWeight:"700"}),
            el(RN.View,{style:{flexDirection:"row",gap:9}},
                ...[["Current","partyCurrent"],["Maximum","partyMax"]].map(([label,key])=>
                    el(RN.View,{key,style:{flex:1,gap:5}},
                        text(label,{fontSize:12,color:muted}),
                        el(RN.TextInput,{keyboardType:"number-pad",
                            value:profile[key]?String(profile[key]):"",
                            placeholder:"None",placeholderTextColor:"#858b9e",
                            maxLength:2,onChangeText:value=>
                                edit(p=>Object.assign({},p,{[key]:Math.min(99,Number(value)||0)})),
                            style:{backgroundColor:"#171a21",color:fg,padding:11,borderRadius:10}})))),
            text("Activity timer",{fontSize:16,fontWeight:"700"}),elapsedPicker,
            text("Artwork",{fontSize:16,fontWeight:"700"}),
            field("Profile cover URL (preview only)","iconUrl","https://example.com/cover.png",512),
            text("Discord displays the application's registered icon by default. Use registered asset IDs or publicly accessible HTTPS images below to set custom artwork.",
                {fontSize:12,color:muted,lineHeight:18}),
            field("Large artwork URL or asset ID","largeImage","https://example.com/art.png",256),
            field("Large image description","largeText","Cover art"),
            field("Small image URL or asset ID","smallImage","https://example.com/icon.png",256),
            field("Small image description","smallText","Icon"),
            text("Activity buttons",{fontSize:16,fontWeight:"700"}),
            ...buttons);
        const gatewayPanel=profile.sendMode==="kizzy"?
            el(RN.View,{key:"gatewayPanel",style:{gap:10,padding:12,borderRadius:14,
                borderWidth:1,borderColor:"#535976",backgroundColor:"#212534"}},
                text("Kizzy Gateway · manual authorization",{fontSize:16,fontWeight:"700"}),
                text("This is an independent user session, not a regular Discord RPC connection. Discord can reject it or restrict the account. Use it only if you accept that risk.",
                    {color:"#efc4a2",fontSize:12,lineHeight:18}),
                text("Your token is a private account credential. Venus does not read it from Discord, save it in settings/backups, or log it. It is sent only to Discord's Gateway and cleared from memory when stopped.",
                    {color:muted,fontSize:12,lineHeight:18}),
                el(RN.View,{style:{flexDirection:"row",alignItems:"center",gap:12}},
                    el(RN.Switch,{value:gatewayConsent,onValueChange:setGatewayConsent}),
                    el(RN.View,{style:{flex:1}},text("I understand the risks and agree to use this independent connection.",
                        {fontSize:12,fontWeight:"600"}))),
                el(RN.TextInput,{accessibilityLabel:"Discord account token for Kizzy Gateway",
                    placeholder:venusRpcGatewayAuthorized()?"Authorized for this session":"Account token (never saved)",
                    placeholderTextColor:"#9198a8",value:gatewayToken,
                    secureTextEntry:true,autoCapitalize:"none",autoCorrect:false,
                    maxLength:256,onChangeText:setGatewayToken,
                    style:{color:fg,backgroundColor:"#171a21",padding:12,
                        borderWidth:1,borderColor:line,borderRadius:10}}),
                text("Gateway connection: "+venusRpcGateway.status+
                    (venusRpcGateway.error?" · "+venusRpcGateway.error:""),
                    {fontSize:12,color:venusRpcGateway.status==="submitted"?"#89d2ad":muted}),
                button(venusRpcGatewayAuthorized()?"Replace token and publish":"Authorize Gateway and publish",
                    authorizeGateway,false,"authorizeGateway"),
                venusRpcGatewayAuthorized()?button("Stop and forget Gateway token",()=>{
                    setSetting("rpcEnabled",false);
                    venusRpcClear();
                    setNotice("Gateway stopped; credential erased from memory.");
                },false,"forgetGateway"):null,
                text("A submitted Gateway presence is not proof it is public. Check from another account. Authorization is required after restarting Discord.",
                    {color:muted,fontSize:11,lineHeight:17})):null;
        const sending=el(RN.View,{key:"sendingTab",style:{gap:10}},
            text("How activity is sent",{fontSize:18,fontWeight:"700"}),
            deliveryPicker,
            gatewayPanel,
            text("Discord application",{fontSize:16,fontWeight:"700"}),
            field("Application ID","applicationId","Enter the game's registered ID",20),
            text("A game in the searchable directory is not necessarily publishable as Rich Presence. Discord may filter unsupported applications.",
                {fontSize:12,color:muted,lineHeight:18}),
            el(RN.View,{style:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}},
                text("Sync edits automatically",{fontSize:13,fontWeight:"600"}),
                el(RN.Switch,{value:liveSync,onValueChange:setLiveSync})),
            text("Automatic synchronization coalesces edits and reduces rapid activity updates. The timestamp stays unchanged unless you edit the timer.",
                {fontSize:12,color:muted,lineHeight:18}),
            text("Connection diagnostics",{fontSize:16,fontWeight:"700"}),
            text("Sender: "+(profile.sendMode==="kizzy"?"Independent Kizzy Gateway":
                "Local Discord activity dispatcher"),{fontSize:12,color:muted}),
            text("Last dispatch: "+(venusRpcTransport.lastSent?
                new Date(venusRpcTransport.lastSent).toLocaleTimeString():"Not sent yet"),
                {fontSize:12,color:muted}),
            text("Result: "+(venusRpcTransport.error||
                (venusRpcTransport.mode==="kizzy"?
                    "Gateway submitted (not verified from a second account)":
                    "Local dispatch only (remote visibility unverified)")),
                {fontSize:12,color:venusRpcTransport.error?"#ffbcab":muted}),
            button("Switch to compatibility and publish",()=>{
                const p=venusRpcNormalize(Object.assign({},profile,{sendMode:"compat"}));
                edit(p);
                const resume=rpcRunning&&venusRpcTransport.profileId===p.id;
                const result=venusRpcPublish(p,resume);
                if(!result.ok){setNotice(result.error);return;}
                const profiles=venusRpcProfiles().filter(x=>x.id!==p.id);
                profiles.unshift(p);
                setSetting("rpcProfiles",JSON.stringify(profiles.slice(0,32)));
                setSetting("rpcSelected",p.id);
                setSetting("rpcEnabled",true);
                setNotice("Compatibility presence sent. Check its visibility on another client.");
            },false,"compatPublish"));
        const updateDetectedProfile=on=>{
            const p=venusRpcNormalize(Object.assign({},profile,{autoDetect:on}));
            if(on&&!p.packageName) {
                setTab("editor");
                setNotice("Enter the Android package ID in Edit before enabling app detection.");
                return;
            }
            edit(p);
            const stored=venusRpcProfiles().filter(x=>x.id!==p.id);
            stored.unshift(p);
            setSetting("rpcProfiles",JSON.stringify(stored.slice(0,64)));
            setSetting("rpcSelected",p.id);
            if(settings.rpcDetectionEnabled) venusRpcDetectionPoll();
        };
        const detectionTab=el(RN.View,{key:"detectionTab",style:{gap:12}},
            text("Automatic Android app detection",{fontSize:18,fontWeight:"700"}),
            text("Detect which permitted app is in the foreground. This needs Android Usage Access. Monitoring is OFF by default and is limited to the profiles you choose.",
                {fontSize:12,color:muted,lineHeight:18}),
            el(RN.View,{style:{flexDirection:"row",alignItems:"center",
                justifyContent:"space-between",padding:12,
                borderWidth:1,borderColor:line,borderRadius:12}},
                el(RN.View,{style:{flex:1,gap:4}},
                    text("Enable detection",{fontWeight:"700",fontSize:14}),
                    text("Only your approved apps",{fontSize:11,color:muted})),
                el(RN.Switch,{value:!!settings.rpcDetectionEnabled,
                    onValueChange:value=>{
                        setSetting("rpcDetectionEnabled",value);
                        if(value) venusRpcDetectionStart();
                        else venusRpcDetectionStop(true);
                    }})),
            text("Android Usage Access: "+
                (venusRpcDetection.granted?"Granted":"Not granted or unavailable"),
                {fontSize:12,color:venusRpcDetection.granted?"#93d8b0":"#e9b998"}),
            el(RN.View,{style:{flexDirection:"row",gap:7,flexWrap:"wrap"}},
                button("Open permission settings",()=>{
                    venusRpcDetectionOpenSettings().catch(()=>
                        setNotice("Could not open Android Usage Access settings."));
                },false,"openUsageSettings"),
                button("Check permission",()=>{
                    venusRpcDetectionCheckPermission().then(granted=>
                        setNotice(granted?"Usage Access granted.":"Grant Usage Access for Venus in Android Settings."));
                },false,"checkUsageSettings")),
            el(RN.View,{style:{padding:12,borderRadius:12,
                borderColor:"#424a60",borderWidth:1,gap:8}},
                text("Current profile: "+profile.name,{fontWeight:"700",fontSize:14}),
                text("Android ID: "+(profile.packageName||"Not specified"),
                    {fontSize:12,color:muted}),
                el(RN.View,{style:{flexDirection:"row",alignItems:"center",
                    justifyContent:"space-between"}},
                    el(RN.View,{style:{flex:1}},
                        text("Allow this app to update my RPC",{fontSize:12,fontWeight:"600"})),
                    el(RN.Switch,{value:!!profile.autoDetect,
                        onValueChange:updateDetectedProfile}))),
            text("Approved profiles: "+venusRpcDetectionCandidates().length,
                {fontSize:12,color:muted}),
            text("Detector: "+venusRpcDetection.status+
                (venusRpcDetection.error?" · "+venusRpcDetection.error:""),
                {fontSize:12,color:venusRpcDetection.error?"#efb9a4":muted}),
            venusRpcDetection.packageName?
                text("Allowed app detected: "+venusRpcDetection.packageName,
                    {fontSize:12,color:"#9fb4ee"}):null,
            text("When an approved app becomes active, Venus selects its saved profile and attempts to publish. It stops sharing when the app is no longer active. No app history is stored or uploaded.",
                {fontSize:12,color:muted,lineHeight:18}),
            text("This detects the app, not track titles, videos or screen contents. Android may suspend background JavaScript and Discord can filter Rich Presence. A successful local send does not prove the activity appears publicly.",
                {fontSize:11,color:muted,lineHeight:17}));
        const sections=[
            el(RN.View,{key:"title",style:{gap:5}},
                text("Rich Presence Studio",{fontSize:21,fontWeight:"800"}),
                text("Official games · Apps · Artwork · Quick switching",{color:muted,fontSize:12})),
            preview,
            el(RN.View,{key:"actions",style:{flexDirection:"row",flexWrap:"wrap",gap:8}},
                button(rpcRunning?"Update activity":"Publish activity",publishCurrent,true),
                button("Stop",stopCurrent,false),
                button("Save",saveCurrent,false)),
            notice?text(notice,{color:"#e7c88a",fontSize:12}):null,
            menu,
            tab==="games"?el(RN.View,{key:"gamesTab",style:{gap:11}},
                savedRows,presets):null,
            tab==="editor"?editor:null,
            tab==="detect"?detectionTab:null,
            tab==="send"?sending:null,
            tab==="editor"?el(RN.View,{key:"editActions",style:{flexDirection:"row",flexWrap:"wrap",gap:8}},
                button("Delete saved",removeCurrent,false)):null,
            text("Game icons are loaded from the Discord directory. Other apps use editable templates, not live app detection. Final appearance depends on Discord.",
                {fontSize:11,color:muted,lineHeight:17})
        ];
        return el(RN.ScrollView,{key:"venusRpcEditor",keyboardShouldPersistTaps:"handled",
            contentContainerStyle:{padding:16,paddingBottom:40,gap:12}},...sections);
    }
