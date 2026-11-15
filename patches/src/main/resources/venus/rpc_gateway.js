// Optional Kizzy-style Discord Gateway transport (independent WebSocket session).
// Uses only a token explicitly supplied by the user after acknowledging risks.
// Never reads account credentials from Discord, persists tokens, or logs frames.
    const VENUS_RPC_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
    const venusRpcGateway = {
        credential:null, acknowledged:false, socket:null, account:null,
        active:false, ready:false, status:"off", error:"",
        activity:null, start:0, lastSent:0, sequence:null, sessionId:null,
        resumeUrl:null, heartbeat:null, reconnectTimer:null, retries:0,
        ack:true, generation:0
    };
    function venusRpcGatewayStatus(status,error) {
        venusRpcGateway.status=status;
        venusRpcGateway.error=error||"";
        notify("rpcGateway");
    }
    function venusRpcGatewayAuthorize(token,acknowledged) {
        if(acknowledged!==true) return {ok:false,error:"Accept the Gateway risks before connecting."};
        if(typeof token!=="string"||token.trim().length<30||token.trim().length>256)
            return {ok:false,error:"Enter a valid account token to start this independent session."};
        if(venusRpcGateway.active) venusRpcGatewayStop(true);
        // Ephemeral memory only. The token is not passed to setSetting or logged.
        venusRpcGateway.credential=token.trim();
        venusRpcGateway.acknowledged=true;
        // A replaced credential requires a new Gateway send, even if the
        // Rich Presence payload itself has not changed.
        venusRpcTransport.lastPayload=null;
        venusRpcGatewayStatus("ready","");
        return {ok:true,error:""};
    }
    function venusRpcGatewayAuthorized() {
        return !!(venusRpcGateway.credential&&venusRpcGateway.acknowledged);
    }
    function venusRpcGatewayClearTimers() {
        if(venusRpcGateway.heartbeat!==null&&global.clearInterval)
            global.clearInterval(venusRpcGateway.heartbeat);
        if(venusRpcGateway.reconnectTimer!==null&&global.clearTimeout)
            global.clearTimeout(venusRpcGateway.reconnectTimer);
        venusRpcGateway.heartbeat=null;
        venusRpcGateway.reconnectTimer=null;
    }
    function venusRpcGatewaySend(op,data) {
        const ws=venusRpcGateway.socket;
        if(!ws||ws.readyState!==1) return false;
        try {ws.send(JSON.stringify({op,d:data}));return true;}
        catch (_) {venusRpcGatewayStatus("error","Gateway send failed.");return false;}
    }
    function venusRpcGatewayPresence(activity,start) {
        // This is the same opcode 3 presence envelope the Kizzy client uses.
        return {activities:activity?[activity]:[],afk:true,
            since:activity?start||Date.now():null,status:"online"};
    }
    function venusRpcGatewayFlush() {
        if(!venusRpcGateway.ready) return false;
        if(!venusRpcGatewaySend(3,venusRpcGatewayPresence(
            venusRpcGateway.activity,venusRpcGateway.start))) return false;
        venusRpcGateway.lastSent=Date.now();
        // Discord does not acknowledge presence publication. This only
        // confirms that the WebSocket accepted our outgoing frame.
        venusRpcGatewayStatus("submitted","");
        return true;
    }
    function venusRpcGatewayCloseSocket() {
        const ws=venusRpcGateway.socket;
        venusRpcGateway.socket=null;
        venusRpcGateway.ready=false;
        if(!ws) return;
        try {
            ws.onopen=null;ws.onclose=null;ws.onmessage=null;ws.onerror=null;
            if(ws.readyState===0||ws.readyState===1) ws.close(1000,"Presence stopped");
        }catch (_) {}
    }
    function venusRpcGatewayStop(clearRemote) {
        if(clearRemote&&venusRpcGateway.ready) {
            venusRpcGatewaySend(3,venusRpcGatewayPresence(null,0));
        }
        venusRpcGateway.active=false;
        venusRpcGateway.generation++;
        venusRpcGatewayClearTimers();
        venusRpcGatewayCloseSocket();
        venusRpcGateway.credential=null;
        venusRpcGateway.acknowledged=false;
        venusRpcGateway.account=null;
        venusRpcGateway.activity=null;
        venusRpcGateway.start=0;
        venusRpcGateway.sequence=null;
        venusRpcGateway.sessionId=null;
        venusRpcGateway.resumeUrl=null;
        venusRpcGateway.retries=0;
        venusRpcGatewayStatus("off","");
    }
    function venusRpcGatewayReconnect(message) {
        if(!venusRpcGateway.active) return;
        venusRpcGatewayClearTimers();
        venusRpcGatewayCloseSocket();
        if(venusRpcGateway.retries>=5) {
            venusRpcGatewayStop(false);
            venusRpcGatewayStatus("error","Gateway reconnect limit reached. Reauthorize.");
            return;
        }
        const delay=Math.min(30000,1000*Math.pow(2,venusRpcGateway.retries++));
        venusRpcGatewayStatus("reconnecting",message||"Reconnecting");
        const generation=venusRpcGateway.generation;
        if(global.setTimeout) venusRpcGateway.reconnectTimer=global.setTimeout(()=>{
            if(venusRpcGateway.generation===generation&&venusRpcGateway.active)
                venusRpcGatewayOpen();
        },delay);
    }
    function venusRpcGatewayHeartbeat() {
        if(!venusRpcGateway.active) return;
        if(!venusRpcGateway.ack) {
            venusRpcGatewayReconnect("Gateway did not acknowledge heartbeat.");
            return;
        }
        venusRpcGateway.ack=false;
        venusRpcGatewaySend(1,venusRpcGateway.sequence);
    }
    function venusRpcGatewayOpen() {
        if(!venusRpcGateway.active||!venusRpcGatewayAuthorized()) return false;
        if(currentId()!==venusRpcGateway.account) {
            venusRpcGatewayStop(false);
            venusRpcGatewayStatus("error","Discord account changed. Reauthorize.");
            return false;
        }
        if(typeof global.WebSocket!=="function") {
            venusRpcGatewayStop(false);
            venusRpcGatewayStatus("error","WebSocket is unavailable in this Discord runtime.");
            return false;
        }
        let ws;
        try {ws=new global.WebSocket(venusRpcGateway.resumeUrl||VENUS_RPC_GATEWAY_URL);}
        catch (_) {
            venusRpcGatewayReconnect("Could not connect to Discord Gateway.");
            return false;
        }
        venusRpcGateway.socket=ws;
        venusRpcGateway.ready=false;
        venusRpcGatewayStatus("connecting","");
        ws.onmessage=event=>{
            if(ws!==venusRpcGateway.socket||!venusRpcGateway.active) return;
            let frame;
            try {frame=JSON.parse(event.data);} catch (_) {return;}
            if(typeof frame.s==="number") venusRpcGateway.sequence=frame.s;
            if(frame.op===10) {
                const interval=Number(frame.d&&frame.d.heartbeat_interval);
                if(!(interval>=1000&&interval<=300000)) {
                    venusRpcGatewayReconnect("Invalid heartbeat interval.");
                    return;
                }
                venusRpcGateway.ack=true;
                if(global.setInterval) venusRpcGateway.heartbeat=
                    global.setInterval(venusRpcGatewayHeartbeat,interval);
                venusRpcGatewayHeartbeat();
                if(venusRpcGateway.sessionId&&venusRpcGateway.sequence!==null) {
                    venusRpcGatewaySend(6,{token:venusRpcGateway.credential,
                        session_id:venusRpcGateway.sessionId,seq:venusRpcGateway.sequence});
                } else {
                    // Kizzy identifies as Discord Client on Windows.
                    venusRpcGatewaySend(2,{
                        token:venusRpcGateway.credential,
                        capabilities:65,compress:false,largeThreshold:100,
                        properties:{os:"Windows",browser:"Discord Client",device:"ktor"}
                    });
                }
            } else if(frame.op===11) {
                venusRpcGateway.ack=true;
            } else if(frame.op===1) {
                venusRpcGatewaySend(1,venusRpcGateway.sequence);
            } else if(frame.op===7) {
                venusRpcGatewayReconnect("Gateway requested reconnect.");
            } else if(frame.op===9) {
                venusRpcGateway.sessionId=null;
                venusRpcGateway.sequence=null;
                venusRpcGateway.resumeUrl=null;
                venusRpcGatewayReconnect("Gateway invalidated session.");
            } else if(frame.op===0&&frame.t==="READY") {
                const account=frame.d&&frame.d.user&&frame.d.user.id;
                if(account&&account!==venusRpcGateway.account) {
                    venusRpcGatewayStop(false);
                    venusRpcGatewayStatus("error","Gateway token belongs to a different Discord account.");
                    return;
                }
                venusRpcGateway.sessionId=frame.d&&frame.d.session_id||null;
                const resume=frame.d&&frame.d.resume_gateway_url;
                if(typeof resume==="string"&&/^wss:\/\/[a-z0-9.-]+\.discord\.gg\/?$/i.test(resume))
                    venusRpcGateway.resumeUrl=resume.replace(/\/+$/,"")+"/?v=10&encoding=json";
                venusRpcGateway.ready=true;
                venusRpcGateway.retries=0;
                venusRpcGatewayFlush();
            } else if(frame.op===0&&frame.t==="RESUMED") {
                venusRpcGateway.ready=true;
                venusRpcGateway.retries=0;
                venusRpcGatewayFlush();
            }
        };
        ws.onerror=()=>{
            if(ws===venusRpcGateway.socket) venusRpcGatewayStatus("connecting","Gateway connection error.");
        };
        ws.onclose=event=>{
            if(ws!==venusRpcGateway.socket||!venusRpcGateway.active) return;
            if([4004,4010,4011,4013,4014].includes(event&&event.code)) {
                venusRpcGatewayStop(false);
                venusRpcGatewayStatus("error","Gateway rejected this connection.");
            } else venusRpcGatewayReconnect("Gateway disconnected.");
        };
        return true;
    }
    function venusRpcGatewayPublish(activity,start) {
        if(!venusRpcGatewayAuthorized())
            return {ok:false,error:"Gateway mode requires risk acceptance and manual authorization."};
        const account=currentId();
        if(!account) return {ok:false,error:"Sign in to Discord first."};
        if(venusRpcGateway.active&&venusRpcGateway.account!==account) {
            venusRpcGatewayStop(false);
            return {ok:false,error:"Account changed. Reauthorize Gateway mode."};
        }
        venusRpcGateway.activity=activity;
        venusRpcGateway.start=start;
        venusRpcGateway.account=account;
        if(venusRpcGateway.ready) return {ok:venusRpcGatewayFlush(),pending:false,error:venusRpcGateway.error};
        if(venusRpcGateway.active) return {ok:true,pending:true,error:""};
        venusRpcGateway.active=true;
        venusRpcGateway.retries=0;
        const connected=venusRpcGatewayOpen();
        return {ok:connected,pending:connected,error:connected?"":venusRpcGateway.error};
    }
