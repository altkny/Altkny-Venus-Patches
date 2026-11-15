// Experimental in-client activity transport. Reuses Discord's signed-in
// dispatcher; never opens a second Gateway session or reads/stores user tokens.
// A successful dispatch is NOT proof of visibility to other accounts.
    const VENUS_RPC_SOCKET = "venus-custom-rpc";
    const VENUS_RPC_PID = 20941;
    const venusRpcTransport = {attached:false, connected:false, active:false,
        startedAt:0, profileId:null, error:"", lastSent:0, account:null};
    function venusRpcAppId(p) {
        if (/^\d{17,20}$/.test(p.applicationId||"")) return p.applicationId;
        const entries = typeof BADGE_FALLBACK_GAMES !== "undefined" ? BADGE_FALLBACK_GAMES : [];
        const match = entries.find(g => {
            const name = Array.isArray(g) ? g[1] : g && g.name;
            return typeof name === "string" && name.toLowerCase() === (p.name||"").toLowerCase();
        });
        return match ? (Array.isArray(match) ? match[0] : match.id) : null;
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
    function venusRpcDispatch(activity) {
        return questDispatch({type:"LOCAL_ACTIVITY_UPDATE",socketId:VENUS_RPC_SOCKET,
            pid:VENUS_RPC_PID,activity:activity||null});
    }
    function venusRpcClear() {
        const was=venusRpcTransport.active;
        venusRpcTransport.active=false;
        venusRpcTransport.profileId=null;
        venusRpcTransport.startedAt=0;
        if(was) venusRpcDispatch(null);
        backgroundSync();
        notify("rpcEnabled");
    }
    function venusRpcPublish(profile, resumed) {
        if(!features.customRpc) return {ok:false,error:"Custom RPC patch is not installed."};
        if(!currentId()) return {ok:false,error:"Sign in to Discord before publishing."};
        const p=venusRpcNormalize(profile);
        const start=resumed && venusRpcTransport.startedAt ? venusRpcTransport.startedAt : Date.now();
        const built=venusRpcBuildActivity(p,start);
        if(built.error) {
            venusRpcTransport.error=built.error;
            notify("rpcEnabled");
            return {ok:false,error:built.error};
        }
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
        venusRpcTransport.error="";
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
