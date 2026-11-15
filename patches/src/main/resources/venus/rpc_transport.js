// Experimental in-client activity transport. Reuses Discord's signed-in
// dispatcher; never opens a second Gateway session or reads/stores user tokens.
// A successful dispatch is NOT proof of visibility to other accounts.
    const VENUS_RPC_SOCKET = "venus-custom-rpc";
    const VENUS_RPC_PID = 20941;
    const venusRpcTransport = {attached:false, connected:false, active:false,
        startedAt:0, profileId:null, error:"", lastSent:0, account:null,
        lastPayload:null};
    // Discord's own detectable games directory, loaded on demand only.
    // A search result always carries its real Discord application ID and icon hash.
    const venusRpcCatalog = {games:null,loading:null,at:0,error:"",source:"fallback"};
    function venusRpcFallbackGames() {
        const entries=typeof BADGE_FALLBACK_GAMES!=="undefined" ? BADGE_FALLBACK_GAMES : [];
        return entries.map(item=>{
            const id=Array.isArray(item)?item[0]:item&&item.id;
            const name=Array.isArray(item)?item[1]:item&&item.name;
            const icon=Array.isArray(item)?item[4]:item&&(item.icon_hash||item.icon);
            return {id:String(id||""),name:String(name||""),icon:String(icon||"")};
        }).filter(g=>/^\d{17,20}$/.test(g.id)&&g.name);
    }
    function venusRpcOfficialIcon(id,hash,size) {
        return /^\d{17,20}$/.test(String(id||"")) &&
            /^(?:a_)?[0-9a-f]{32}$/i.test(String(hash||""))
            ? "https://cdn.discordapp.com/app-icons/"+id+"/"+hash+".png?size="+(size||128)
            : "";
    }
    function venusRpcGameFromServer(raw) {
        if(!raw||typeof raw!=="object") return null;
        const id=String(raw.id||"");
        const name=typeof raw.name==="string"?raw.name.trim():"";
        if(!/^\d{17,20}$/.test(id)||!name||name.length>128) return null;
        if(raw.type!=null&&raw.type!==0&&raw.type!==5) return null;
        const icon=String(raw.icon_hash||raw.icon||"");
        return {id,name,icon:/^(?:a_)?[0-9a-f]{32}$/i.test(icon)?icon:""};
    }
    function venusRpcKnownGames() { return venusRpcCatalog.games||venusRpcFallbackGames(); }
    function venusRpcGameForProfile(p) {
        const app=String(p&&p.applicationId||"");
        const name=String(p&&p.name||"").toLowerCase();
        const games=venusRpcKnownGames();
        return games.find(g=>g.id===app)||
            (!app&&games.find(g=>g.name.toLowerCase()===name))||null;
    }
    function venusRpcCatalogLoad(force) {
        if(!force&&venusRpcCatalog.games&&Date.now()-venusRpcCatalog.at<6*3600000)
            return Promise.resolve(venusRpcCatalog.games);
        if(venusRpcCatalog.loading) return venusRpcCatalog.loading;
        const account=currentId();
        venusRpcCatalog.error="";
        venusRpcCatalog.loading=(async()=>{
            let games=null;
            try{
                if(!account) throw new Error("Sign in to Discord to load the game directory.");
                const response=await questRequest("/games/detectable",undefined,false,"get",
                    ()=>currentId()===account);
                const body=response&&response.body;
                if(!Array.isArray(body)||body.length<100)
                    throw new Error("The Discord detectable games directory is unavailable.");
                const ids=new Set(),result=[];
                for(const raw of body){
                    const game=venusRpcGameFromServer(raw);
                    if(game&&!ids.has(game.id)){ids.add(game.id);result.push(game);}
                }
                if(result.length<100) throw new Error("Discord returned an incomplete game list.");
                games=result.sort((a,b)=>a.name.localeCompare(b.name));
                venusRpcCatalog.source="discord";
            }catch(e){
                venusRpcCatalog.error=String(e&&e.message||e||"Directory unavailable").slice(0,150);
                games=venusRpcCatalog.games||venusRpcFallbackGames();
                venusRpcCatalog.source=venusRpcCatalog.games?"cached":"fallback";
            }
            venusRpcCatalog.games=games;
            venusRpcCatalog.at=Date.now();
            venusRpcCatalog.loading=null;
            notify("rpcCatalog");
            return games;
        })();
        return venusRpcCatalog.loading;
    }
    function venusRpcPreviewImage(profile,small) {
        const p=profile||{},candidate=small?p.smallImage:p.largeImage;
        if(venusRpcValidUrl(candidate)) return candidate;
        const app=venusRpcAppId(p);
        // Rich Presence assets may be numeric application asset IDs.
        if(/^\d{17,20}$/.test(String(candidate||""))&&app)
            return "https://cdn.discordapp.com/app-assets/"+app+"/"+candidate+".png?size=256";
        if(!small){
            const known=venusRpcGameForProfile(p);
            return venusRpcOfficialIcon(app,p.iconHash||(known&&known.icon),256);
        }
        return "";
    }
    function venusRpcAppId(p) {
        if (/^\d{17,20}$/.test(String(p&&p.applicationId||""))) return p.applicationId;
        const known=venusRpcGameForProfile(p);
        return known?known.id:null;
    }
    function venusRpcBuildActivity(profile, startedAt) {
        const p=venusRpcNormalize(profile), app=venusRpcAppId(p);
        if (!app) return {error:"No registered Discord Application ID for this profile."};
        if (!p.name) return {error:"An activity name is required."};
        const buttons=p.buttons.filter(b=>b.label&&venusRpcValidUrl(b.url)).slice(0,2);
        if (p.buttons.some(b=>(b.label||b.url)&&(!b.label||!venusRpcValidUrl(b.url))))
            return {error:"Each button needs a name and a valid HTTPS URL."};
        const activity={name:p.name,application_id:app,type:0,flags:0};
        if(p.details) activity.details=p.details;
        if(p.state) activity.state=p.state;
        if(p.elapsed) activity.timestamps={start:startedAt};
        // Discord may drop unsupported CDN/remote asset keys; the preview is
        // intentionally independent and never claims that assets were accepted.
        const assets={};
        if(p.largeImage) assets.large_image=p.largeImage;
        if(p.smallImage) assets.small_image=p.smallImage;
        if(p.largeText) assets.large_text=p.largeText;
        if(p.smallText) assets.small_text=p.smallText;
        if(Object.keys(assets).length) activity.assets=assets;
        if(buttons.length) {
            activity.buttons=buttons.map(b=>b.label);
            activity.metadata={button_urls:buttons.map(b=>b.url)};
        }
        return {activity};
    }
    function venusRpcStoredStart() {
        const at=Number(settings.rpcStartedAt);
        return Number.isFinite(at)&&at>0&&at<=Date.now() ? Math.floor(at) : 0;
    }
    function venusRpcDispatch(activity) {
        return questDispatch({type:"LOCAL_ACTIVITY_UPDATE",socketId:VENUS_RPC_SOCKET,
            pid:VENUS_RPC_PID,activity:activity||null});
    }
    function venusRpcClear() {
        const was=venusRpcTransport.active;
        venusRpcTransport.active=false;
        venusRpcTransport.profileId=null;
        venusRpcTransport.startedAt=0;
        venusRpcTransport.lastPayload=null;
        if(was) venusRpcDispatch(null);
        // An explicit stop clears the stored epoch. Logout/account switches
        // retain it for the same account, but never publish it to another.
        if(!settings.rpcEnabled){
            setSetting("rpcStartedAt",0);
            setSetting("rpcAccountId","");
        }
        backgroundSync();
        notify("rpcEnabled");
    }
    function venusRpcPublish(profile, resumed) {
        if(!features.customRpc) return {ok:false,error:"Custom RPC patch is not installed."};
        if(!currentId()) return {ok:false,error:"Sign in to Discord before publishing."};
        if(resumed&&settings.rpcAccountId&&settings.rpcAccountId!==currentId())
            return {ok:false,error:"This RPC timer belongs to another Discord account."};
        const p=venusRpcNormalize(profile);
        const start=resumed ?
            (venusRpcTransport.startedAt||venusRpcStoredStart()||Date.now()) : Date.now();
        const built=venusRpcBuildActivity(p,start);
        if(built.error) {
            venusRpcTransport.error=built.error;
            notify("rpcEnabled");
            return {ok:false,error:built.error};
        }
        // The original start timestamp remains unchanged. Duplicate local
        // dispatches only refresh activity unnecessarily; they cannot make
        // a remote Discord client redraw its timer more frequently.
        const payload=JSON.stringify(built.activity);
        if(resumed && venusRpcTransport.active &&
            venusRpcTransport.profileId===p.id &&
            venusRpcTransport.account===currentId() &&
            venusRpcTransport.lastPayload===payload)
            return {ok:true,skipped:true,error:""};
        const success=venusRpcDispatch(built.activity);
        if(!success) {
            venusRpcTransport.error="Discord's local activity dispatcher is unavailable.";
            notify("rpcEnabled");
            return {ok:false,error:venusRpcTransport.error};
        }
        venusRpcTransport.active=true;
        venusRpcTransport.profileId=p.id;
        venusRpcTransport.startedAt=start;
        venusRpcTransport.account=currentId();
        venusRpcTransport.lastSent=Date.now();
        venusRpcTransport.lastPayload=payload;
        venusRpcTransport.error="";
        if(!resumed || !venusRpcStoredStart()){
            setSetting("rpcStartedAt",start);
            setSetting("rpcAccountId",currentId());
        }
        backgroundSync();
        notify("rpcEnabled");
        return {ok:true,error:""};
    }
    function venusRpcSavedProfile() {
        return venusRpcProfiles().find(p=>p.id===settings.rpcSelected)||null;
    }
    function venusRpcRestore() {
        if(!features.customRpc || !settings.rpcEnabled || !currentId()) return;
        const p=venusRpcSavedProfile();
        if (!p) {
            venusRpcTransport.error="Saved RPC profile not found.";
            notify("rpcEnabled");
            return;
        }
        venusRpcPublish(p,true);
    }
    function venusRpcLoaded() {
        if(!features.customRpc) return;
        // The dispatcher may not be initialized when settings are loaded.
        later(venusRpcRestore,2500,false);
    }
    function venusRpcAttach(dispatcher) {
        if(venusRpcTransport.attached || !dispatcher || typeof dispatcher.subscribe!=="function") return;
        venusRpcTransport.attached=true;
        dispatcher.subscribe("CONNECTION_OPEN", event=>{
            const account=(event&&event.user&&event.user.id)||currentId();
            if(venusRpcTransport.active && account!==venusRpcTransport.account) venusRpcClear();
            // Re-register the activity on a new connection, but suppress
            // repetitive restore calls while the same connection is active.
            if(!venusRpcTransport.connected) venusRpcTransport.lastPayload=null;
            venusRpcTransport.connected=true;
            later(venusRpcRestore,1500,false);
        });
        dispatcher.subscribe("LOGOUT",()=>{
            venusRpcClear();venusRpcTransport.connected=false;venusRpcTransport.account=null;
        });
        dispatcher.subscribe("MULTI_ACCOUNT_SWITCH_START",()=>{
            venusRpcClear();venusRpcTransport.connected=false;venusRpcTransport.account=null;
        });
        if(currentId()) later(venusRpcRestore,1200,false);
    }
