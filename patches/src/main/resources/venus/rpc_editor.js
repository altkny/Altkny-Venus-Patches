// Custom Rich Presence UI for the existing Venus bootstrap closure.
// Experimental publisher uses Discord's own in-client activity dispatcher.
    const VENUS_RPC_GAMES = [
        "Minecraft","ROBLOX","VALORANT","Fortnite","Terraria","Stardew Valley",
        "Counter-Strike 2","League of Legends","Apex Legends","ELDEN RING",
        "Overwatch","Dota 2"
    ];
    const VENUS_RPC_EMPTY = {id:"custom",name:"Custom Activity",applicationId:"",details:"",state:"",
        iconHash:"",largeImage:"",smallImage:"",largeText:"",smallText:"",
        elapsed:true,buttons:[{label:"",url:""},{label:"",url:""}]};
    function venusRpcClean(x,n) { return typeof x === "string" ? x.trim().slice(0,n || 128) : ""; }
    function venusRpcNormalize(value) {
        const p = value && typeof value === "object" ? value : {};
        const buttons = Array.isArray(p.buttons) ? p.buttons : [];
        return {
            id:venusRpcClean(p.id,64) || "custom",
            applicationId:venusRpcClean(p.applicationId,20),
            iconHash:venusRpcClean(p.iconHash,40),
            name:venusRpcClean(p.name) || "Custom Activity",
            details:venusRpcClean(p.details),state:venusRpcClean(p.state),
            largeImage:venusRpcClean(p.largeImage,256),smallImage:venusRpcClean(p.smallImage,256),
            largeText:venusRpcClean(p.largeText),smallText:venusRpcClean(p.smallText),
            elapsed:p.elapsed === true,
            buttons:[0,1].map(i=>({label:venusRpcClean(buttons[i] && buttons[i].label,32),
                url:venusRpcClean(buttons[i] && buttons[i].url,512)}))
        };
    }
    function venusRpcProfiles() {
        try {
            const a=JSON.parse(settings.rpcProfiles || "[]");
            return Array.isArray(a) ? a.slice(0,32).map(venusRpcNormalize) : [];
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
        const radius=props.circle?size/2:12;
        return el(RN.View,{style:{height:size,width:size,borderRadius:radius,
            backgroundColor:"#363d50",alignItems:"center",justifyContent:"center",overflow:"hidden"}},
            props.uri&&!failed?el(RN.Image,{
                source:{uri:props.uri},resizeMode:"cover",
                onError:()=>setFailed(true),
                style:{width:size,height:size,borderRadius:radius}
            }):el(RN.Text,{style:{fontSize:size<40?10:12,color:"#d1d8ff",fontWeight:"700"}},
                props.label||"GAME"));
    }
    function VenusRpcSettings() {
        useSettings("rpcProfiles"); useSettings("rpcSelected"); useSettings("rpcEnabled"); useSettings("rpcCatalog");
        const [profile,edit]=React.useState(()=>venusRpcNormalize(
            venusRpcProfiles().find(x=>x.id===settings.rpcSelected) ||
            Object.assign({},VENUS_RPC_EMPTY,{name:"Minecraft",id:"minecraft"})));
        const [started,setStarted]=React.useState(Date.now());
        const [notice,setNotice]=React.useState("");
        const [search,setSearch]=React.useState("");
        const [visible,setVisible]=React.useState(12);
        const [liveSync,setLiveSync]=React.useState(true);
        const rpcRunning=!!(settings.rpcEnabled && venusRpcTransport.active);
        React.useEffect(()=>{
            let active=true;
            Promise.resolve().then(()=>venusRpcCatalogLoad(false)).catch(()=>{}).then(()=>{
                if(active) setVisible(n=>Math.max(12,n));
            });
            return ()=>{active=false;};
        },[]);
        // On an active profile, debounce edits and update the real Discord activity
        // without needing to tap Publish after every key stroke.
        React.useEffect(()=>{
            if(!liveSync || !rpcRunning || venusRpcTransport.profileId!==profile.id) return;
            if(!global.setTimeout) return;
            const handle=global.setTimeout(()=>{
                if(!settings.rpcEnabled || venusRpcTransport.profileId!==profile.id) return;
                const p=venusRpcNormalize(profile);
                const result=venusRpcPublish(p,true);
                if(result.ok){
                    const saved=venusRpcProfiles().filter(x=>x.id!==p.id);
                    saved.unshift(p);
                    setSetting("rpcProfiles",JSON.stringify(saved.slice(0,32)));
                }
            },850);
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
            const saved=venusRpcProfiles().find(x=>x.id===game.id || x.applicationId===game.id);
            const p=saved || venusRpcNormalize(Object.assign({},VENUS_RPC_EMPTY,{
                id:game.id,applicationId:game.id,name:game.name,iconHash:game.icon||""
            }));
            edit(p);setStarted(Date.now());setNotice("");
        };
        const custom=()=>{
            const saved=venusRpcProfiles().find(x=>x.id==="custom");
            edit(saved || venusRpcNormalize(VENUS_RPC_EMPTY));
            setStarted(Date.now());setNotice("");
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
            setSetting("rpcProfiles",JSON.stringify(items.slice(0,32)));
            setSetting("rpcSelected",p.id);
            edit(p);
            setNotice("Profile saved on this device.");
        };
        const publishCurrent=()=>{
            const p=venusRpcNormalize(profile);
            const result=venusRpcPublish(p,false);
            if (!result.ok) {setNotice(result.error);return;}
            const items=venusRpcProfiles().filter(x=>x.id!==p.id);
            items.unshift(p);
            setSetting("rpcProfiles",JSON.stringify(items.slice(0,32)));
            setSetting("rpcSelected",p.id);
            setSetting("rpcEnabled",true);
            backgroundSync();
            edit(p);
            setStarted(venusRpcTransport.startedAt);
            setNotice("Activity updated in Discord.");
        };
        const stopCurrent=()=>{
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
            if(rpcRunning&&venusRpcTransport.profileId===profile.id){
                const result=venusRpcPublish(profile,false);
                if(!result.ok){setNotice(result.error);return;}
                setStarted(venusRpcTransport.startedAt);
                setNotice("Timer restarted in Discord and in the preview.");
            } else {
                setStarted(Date.now());
                setNotice("Preview timer restarted.");
            }
        };
        const image=(p,small,size)=>el(VenusRpcCover,{
            key:(small?"small:":"cover:")+(venusRpcPreviewImage(p,small)||"none"),
            uri:venusRpcPreviewImage(p,small),size:size||64,circle:!!small,
            label:small?"?":(p.name||"GAME").slice(0,2).toUpperCase()
        });
        const elapsedStart=rpcRunning&&venusRpcTransport.profileId===profile.id&&venusRpcTransport.startedAt ?
            venusRpcTransport.startedAt : started;
        const preview=el(RN.View,{key:"preview",accessible:true,style:{borderRadius:16,
            backgroundColor:"#20232b",borderWidth:1,borderColor:"#414651",padding:15,gap:10}},
            el(RN.View,{style:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}},
                text("PLAYING A GAME",{fontSize:11,color:muted,fontWeight:"700",letterSpacing:1}),
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
                (liveSync?"Active on Discord · edits sync automatically":"Active on Discord · tap Publish to update") :
                "Preview mode · select a game and publish to start.",
                {fontSize:11,color:rpcRunning?"#86d6b2":"#e7c88a"}));
        const catalog=venusRpcKnownGames();
        const featured=VENUS_RPC_GAMES.map(name=>catalog.find(g=>g.name.toLowerCase()===name.toLowerCase())).filter(Boolean).slice(0,10);
        const query=search.trim().toLowerCase();
        const matches=React.useMemo(()=>{
            if(!query) return catalog.slice(0,visible+1);
            const found=[];
            for(const game of catalog){
                if(game.name.toLowerCase().includes(query)||game.id.includes(query)){
                    found.push(game);
                    if(found.length>=visible+1) break;
                }
            }
            return found;
        },[catalog,query,visible]);
        const gamesToShow=matches.slice(0,visible);
        const gameRow=(game)=>el(RN.Pressable,{key:game.id,accessibilityRole:"button",
            accessibilityLabel:game.name,onPress:()=>choose(game),
            style:{flexDirection:"row",alignItems:"center",gap:10,padding:10,
                marginBottom:5,borderRadius:12,borderWidth:1,
                borderColor:profile.applicationId===game.id?"#8790fb":"#383c47",
                backgroundColor:profile.applicationId===game.id?"#5865f22e":"#272a33"}},
            image({applicationId:game.id,iconHash:game.icon,name:game.name},false,36),
            el(RN.View,{style:{flex:1,gap:2}},
                text(game.name,{fontSize:13,fontWeight:"600"}),
                text(game.id,{fontSize:10,color:muted})),
            profile.applicationId===game.id?text("✓",{fontSize:16,color:"#a9b3ff"}):null);
        const featuredRows=el(RN.View,{key:"featured",style:{gap:6}},
            text("Popular games",{fontSize:15,fontWeight:"700"}),
            el(RN.View,{style:{gap:2}},featured.map(gameRow)));
        const presets=el(RN.View,{key:"gameCatalog",style:{gap:9}},
            featuredRows,
            text("Discord game library",{fontSize:15,fontWeight:"700"}),
            el(RN.TextInput,{
                accessibilityLabel:"Search Discord games",
                placeholder:"Search thousands of games by name or ID...",
                placeholderTextColor:"#858b9e",value:search,
                autoCapitalize:"none",autoCorrect:false,
                onChangeText:value=>{setSearch(value);setVisible(12);},
                style:{color:fg,backgroundColor:"#171a21",borderColor:line,borderWidth:1,
                    borderRadius:12,paddingHorizontal:13,paddingVertical:11,fontSize:14}}),
            text((venusRpcCatalog.source==="discord"?"Official Discord directory: ":
                venusRpcCatalog.loading?"Loading Discord games · ":
                "Offline fallback: ")+catalog.length+" games",
                {color:muted,fontSize:12}),
            venusRpcCatalog.error?text("Catalog: "+venusRpcCatalog.error,{color:"#e6bb8d",fontSize:12}):null,
            el(RN.View,{style:{gap:2}},gamesToShow.length?gamesToShow.map(gameRow):text("No matching games in the loaded catalog.",{fontSize:12,color:muted})),
            matches.length>visible?button("Load more games",()=>setVisible(n=>Math.min(n+48,300)),false,"moreGames"):null,
            button("Refresh official game list",()=>{
                setNotice("Updating game catalog...");
                venusRpcCatalogLoad(true).then(g=>setNotice("Game catalog updated: "+g.length+" games."))
                    .catch(()=>setNotice("Game catalog is unavailable."));
            },false,"refreshGames"),
            button("Custom activity",custom,profile.id==="custom","custom"));
        const saved=venusRpcProfiles();
        const savedRows=saved.length?el(RN.View,{key:"saved",style:{gap:8}},
            text("Saved profiles",{fontSize:15,fontWeight:"700"}),
            el(RN.View,{style:{flexDirection:"row",flexWrap:"wrap",gap:7}},
                saved.map(p=>button(p.name,()=>choose(p.id,p.name),p.id===profile.id,p.id+"saved")))):null;
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
        const sections=[
            el(RN.View,{key:"title",style:{gap:5}},text("Custom Rich Presence",{fontSize:20,fontWeight:"700"}),
                text("Game presets, custom profiles and an instant Discord-style preview.",{color:muted})),
            preview,
            text("Choose a game",{fontSize:16,fontWeight:"700"}),presets,
            savedRows,
            text("Edit activity",{fontSize:15,fontWeight:"700"}),
            field("Activity name","name","Minecraft"),
            field("Discord Application ID","applicationId","Optional for recognized game presets",20),
            field("Details","details","Exploring the Overworld"),
            field("State","state","In a world"),
            field("Large image URL (HTTPS)","largeImage","https://example.com/image.png",256),
            field("Large image hint","largeText","Cover art"),
            field("Small image URL (HTTPS)","smallImage","https://example.com/icon.png",256),
            field("Small image hint","smallText","Icon"),
            el(RN.View,{key:"timer",style:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:6}},
                text("Elapsed-time counter"),
                el(RN.Switch,{value:profile.elapsed,onValueChange:v=>{edit(p=>Object.assign({},p,{elapsed:v}));setStarted(Date.now());}})),
            el(RN.View,{key:"liveSync",style:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:6}},
                text("Auto-sync changes while active"),
                el(RN.Switch,{value:liveSync,onValueChange:setLiveSync})),
            text("Optional links",{fontSize:15,fontWeight:"700"}),
            ...buttons,
            el(RN.View,{key:"actions",style:{flexDirection:"row",flexWrap:"wrap",gap:8}},
                button("Publish activity",publishCurrent,true),
                button("Stop publishing",stopCurrent,false),
                button("Save profile",saveCurrent,false),
                button("Reset timer",resetTimer,false),
                button("Delete saved",removeCurrent,false)),
            notice?text(notice,{color:"#e7c88a"}):null,
            text("Experimental: this sends a local activity event through the signed-in Discord client. No token is requested. External visibility, images and buttons are not guaranteed; Discord may reject the activity.",{color:muted,fontSize:12,lineHeight:18})
        ];
        return el(RN.ScrollView,{key:"venusRpcEditor",keyboardShouldPersistTaps:"handled",
            contentContainerStyle:{padding:16,paddingBottom:40,gap:12}},...sections);
    }
