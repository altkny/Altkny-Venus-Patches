// Android app detection. Opt-in only: a profile must explicitly allow its
// package, Usage Access must be granted, and the master switch must be on.
// The native bridge returns only allowlisted app IDs; never log a usage history.
    const VENUS_RPC_KNOWN_PACKAGES = Object.freeze({
        "Spotify":"com.spotify.music",
        "YouTube Music":"com.google.android.apps.youtube.music",
        "Apple Music":"com.apple.android.music",
        "SoundCloud":"com.soundcloud.android",
        "Deezer":"deezer.android.app",
        "TIDAL":"com.aspiro.tidal",
        "YouTube":"com.google.android.youtube",
        "Netflix":"com.netflix.mediaclient",
        "Prime Video":"com.amazon.avod.thirdpartyclient",
        "Disney+":"com.disney.disneyplus",
        "Twitch":"tv.twitch.android.app",
        "Crunchyroll":"com.crunchyroll.crunchyroid",
        "GitHub":"com.github.android",
        "Termux":"com.termux",
        "CapCut":"com.lemon.lvoverseas",
        "Krita":"org.krita",
        "Canva":"com.canva.editor",
        "Obsidian":"md.obsidian",
        "Notion":"notion.id",
        "Google Docs":"com.google.android.apps.docs.editors.docs",
        "Google Chrome":"com.android.chrome",
        "Firefox":"org.mozilla.firefox",
        "Telegram":"org.telegram.messenger",
        "WhatsApp":"com.whatsapp"
    });
    const venusRpcDetection = {
        active:false,busy:false,timer:null,generation:0,
        status:"off",error:"",granted:false,
        packageName:"",managedId:null,lastPoll:0,
        lastPublished:0
    };
    function venusRpcValidPackage(value) {
        return typeof value==="string" &&
            value.length>=3 && value.length<=128 &&
            /^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(value);
    }
    function venusRpcDetectionCandidates() {
        return venusRpcProfiles().filter(p=>p.autoDetect===true &&
            venusRpcValidPackage(p.packageName)).slice(0,64);
    }
    function venusRpcDetectionState(status,error) {
        venusRpcDetection.status=status;
        venusRpcDetection.error=error||"";
        notify("rpcDetection");
    }
    function venusRpcDetectionCheckPermission() {
        return diagCall("rpc:permission").then(body=>{
            const data=typeof body==="string"?JSON.parse(body):body;
            venusRpcDetection.granted=!!(data&&data.granted);
            notify("rpcDetection");
            return venusRpcDetection.granted;
        }).catch(()=>{
            venusRpcDetection.granted=false;
            venusRpcDetectionState("unsupported",
                "The native Android detector is unavailable in this installation.");
            return false;
        });
    }
    function venusRpcDetectionOpenSettings() {
        return diagCall("rpc:settings");
    }
    function venusRpcDetectionUnpublish() {
        // Removing an automatic activity must NOT clear the Kizzy Gateway
        // credential: the same authorized session can publish the next app.
        if(!venusRpcDetection.managedId) return;
        const managed=venusRpcDetection.managedId;
        venusRpcDetection.managedId=null;
        if(venusRpcTransport.profileId!==managed) return;
        if(venusRpcTransport.mode==="kizzy"&&venusRpcGatewayAuthorized()&&
           venusRpcGateway.active) venusRpcGatewayPublish(null,0);
        else venusRpcDispatch(null);
        venusRpcTransport.active=false;
        venusRpcTransport.profileId=null;
        venusRpcTransport.lastPayload=null;
        setSetting("rpcEnabled",false);
        backgroundSync();
        notify("rpcEnabled");
    }
    function venusRpcDetectionHandle(data) {
        const pkg=data&&typeof data.packageName==="string"?data.packageName:"";
        venusRpcDetection.granted=!!(data&&data.granted);
        if(!venusRpcDetection.granted) {
            venusRpcDetectionUnpublish();
            venusRpcDetectionState("permission","Grant Usage Access to detect apps.");
            return;
        }
        venusRpcDetection.packageName=pkg;
        const p=venusRpcDetectionCandidates().find(profile=>profile.packageName===pkg);
        if(!p){
            venusRpcDetectionUnpublish();
            venusRpcDetectionState("watching","");
            return;
        }
        if(venusRpcDetection.managedId===p.id&&venusRpcTransport.active&&
            venusRpcTransport.profileId===p.id) {
            venusRpcDetectionState("sharing","");
            return;
        }
        const since=Number(data.since);
        const offset=Number.isFinite(since)&&since>0&&since<=Date.now()?
            Math.min(604800,Math.floor((Date.now()-since)/1000)):0;
        const sending=venusRpcNormalize(Object.assign({},p,{
            timeOffsetSeconds:p.elapsed?offset:0
        }));
        const result=venusRpcPublish(sending,false);
        if(!result.ok) {
            venusRpcDetectionState("error",result.error);
            return;
        }
        venusRpcDetection.managedId=p.id;
        venusRpcDetection.lastPublished=Date.now();
        setSetting("rpcSelected",p.id);
        setSetting("rpcEnabled",true);
        backgroundSync();
        venusRpcDetectionState(result.pending?"connecting":"sharing","");
    }
    function venusRpcDetectionPoll() {
        if(!venusRpcDetection.active || !settings.rpcDetectionEnabled ||
            !features.customRpc) return;
        if(venusRpcDetection.busy) return;
        const candidates=venusRpcDetectionCandidates();
        if(!candidates.length){
            venusRpcDetectionUnpublish();
            venusRpcDetectionState("no-profiles","Enable detection on a saved app profile.");
            return;
        }
        venusRpcDetection.busy=true;
        const generation=venusRpcDetection.generation;
        const allowlist=[...new Set(candidates.map(p=>p.packageName))];
        diagCall("rpc:foreground",JSON.stringify(allowlist)).then(raw=>{
            if(!venusRpcDetection.active||generation!==venusRpcDetection.generation) return;
            const data=typeof raw==="string"?JSON.parse(raw):raw;
            venusRpcDetection.lastPoll=Date.now();
            venusRpcDetectionHandle(data);
        }).catch(()=>{
            if(generation!==venusRpcDetection.generation) return;
            venusRpcDetectionState("unsupported","Android detector could not read Usage Access.");
        }).then(()=>{venusRpcDetection.busy=false;});
    }
    function venusRpcDetectionStop(unpublish) {
        venusRpcDetection.active=false;
        venusRpcDetection.generation++;
        if(venusRpcDetection.timer!==null&&global.clearInterval)
            global.clearInterval(venusRpcDetection.timer);
        venusRpcDetection.timer=null;
        if(unpublish) venusRpcDetectionUnpublish();
        venusRpcDetectionState("off","");
        backgroundSync();
    }
    function venusRpcDetectionStart() {
        if(!features.customRpc || !settings.rpcDetectionEnabled) return false;
        if(venusRpcDetection.active) return true;
        if(!global.setInterval) return false;
        venusRpcDetection.active=true;
        venusRpcDetection.generation++;
        venusRpcDetectionState("checking","");
        venusRpcDetectionCheckPermission().then(granted=>{
            if(venusRpcDetection.active){
                if(!granted) venusRpcDetectionState("permission","Grant Usage Access to detect apps.");
                venusRpcDetectionPoll();
            }
        });
        venusRpcDetection.timer=global.setInterval(venusRpcDetectionPoll,5000);
        backgroundSync();
        return true;
    }
