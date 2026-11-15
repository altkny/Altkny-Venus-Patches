// Explicit, opt-in Kizzy-style Gateway presence publisher.
// Uses an ephemeral user-supplied credential, never account token discovery.
// No persistence, analytics, logging or external endpoints beyond Discord Gateway.
    const VENUS_RPC_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
    const venusRpcGateway = {
        token:null, socket:null, alive:false, ready:false, sequence:null,
        sessionId:null, resumeUrl:null, heartbeat:null, retry:null,
        interval:0, ack:true, attempt:0, status:"off",
        account:null, activity:null, start:0, lastSent:0, error:""
    };
    function venusRpcGatewayStatus(status,error) {
        venusRpcGateway.status=status;
        venusRpcGateway.error=error||"";
        notify("rpcEnabled");
        notify("rpcGateway");
    }
    function venusRpcGatewayCredential(value) {
        const token=typeof value==="string"?value.trim():"";
        if(!token) return false;
        // Never put the credential in saved settings or logs.
        venusRpcGateway.token=token;
        return true;
    }
    function venusRpcGatewayCanSend() {
        return !!(venusRpcGateway.ready&&venusRpcGateway.socket&&venusRpcGateway.socket.readyState===1);
    }
    function venusRpcGatewayFrame(op,data) {
        const socket=venusRpcGateway.socket;
        if(!socket||socket.readyState!==1) return false;
        try { socket.send(JSON.stringify({op,d:data}));return true; }
        catch (_) { venusRpcGatewayStatus("error","Gateway send failed.");return false; }
    }
    function venusRpcGatewayHeartbeat() {
        if(!venusRpcGateway.alive) return;
        if(!venusRpcGateway.ack) {
            venusRpcGatewayReconnect("Gateway missed a heartbeat.");
            return;
        }
        venusRpcGateway.ack=false;
        venusRpcGatewayFrame(1,venusRpcGateway.sequence);
    }
    function venusRpcGatewayClearTimers() {
        if(venusRpcGateway.heartbeat!=null&&global.clearInterval)
            global.clearInterval(venusRpcGateway.heartbeat);
        if(venusRpcGateway.retry!=null&&global.clearTimeout)
            global.clearTimeout(venusRpcGateway.retry);
        venusRpcGateway.heartbeat=null;
        venusRpcGateway.retry=null;
    }
    function venusRpcGatewayPresence(activity,start) {
        return {since:start||null,activities:activity?[activity]:[],
            status:"online",afk:false};
    }
    function venusRpcGatewaySendPresence() {
        if(!venusRpcGatewayCanSend()) return false;
        const ok=venusRpcGatewayFrame(3,venusRpcGatewayPresence(
            venusRpcGateway.activity,venusRpcGateway.start));
        if(ok) {
            venusRpcGateway.lastSent=Date.now();
            venusRpcGatewayStatus("published","");
        }
        return ok;
    }
    function venusRpcGatewayCloseSocket() {
        const socket=venusRpcGateway.socket;
        venusRpcGateway.socket=null;
        venusRpcGateway.ready=false;
        if(socket) {
            try {socket.onopen=null;socket.onmessage=null;socket.onerror=null;socket.onclose=null;
                if(socket.readyState===0||socket.readyState===1) socket.close(1000,"Venus RPC stop");}
            catch (_) {}
        }
    }
    function venusRpcGatewayStop(clearRemote) {
        venusRpcGateway.alive=false;
        venusRpcGatewayClearTimers();
        if(clearRemote&&venusRpcGatewayCanSend())
            venusRpcGatewayFrame(3,venusRpcGatewayPresence(null,0));
        venusRpcGatewayCloseSocket();
        venusRpcGateway.token=null;
        venusRpcGateway.activity=null;
        venusRpcGateway.sequence=null;
        venusRpcGateway.sessionId=null;
        venusRpcGateway.resumeUrl=null;
        venusRpcGateway.account=null;
        venusRpcGateway.attempt=0;
        venusRpcGatewayStatus("off","");
    }
    function venusRpcGatewayReconnect(reason) {
        if(!venusRpcGateway.alive) return;
        venusRpcGatewayClearTimers();
        venusRpcGatewayCloseSocket();
        if(venusRpcGateway.attempt>=5) {
            venusRpcGatewayStop(false);
            venusRpcGatewayStatus("error","Gateway failed to reconnect. Publish again.");
            return;
        }
        const ms=Math.min(30000,1500*Math.pow(2,venusRpcGateway.attempt++));
        venusRpcGatewayStatus("reconnecting",reason||"Reconnecting");
        if(global.setTimeout) venusRpcGateway.retry=global.setTimeout(
            ()=>venusRpcGatewayOpen(),ms);
    }
    function venusRpcGatewayOpen() {
        if(!venusRpcGateway.alive||!venusRpcGateway.token) return false;
        if(currentId()!==venusRpcGateway.account) {
            venusRpcGatewayStop(false);
            venusRpcGatewayStatus("error","Discord account changed. Publish again.");
            return false;
        }
        const Socket=global.WebSocket;
        if(typeof Socket!=="function"){
            venusRpcGatewayStop(false);
            venusRpcGatewayStatus("error","WebSocket is unavailable in this Discord client.");
            return false;
        }
        let socket;
        try {
            const url=venusRpcGateway.resumeUrl||VENUS_RPC_GATEWAY_URL;
            socket=new Socket(url);
        } catch (_) {
            venusRpcGatewayReconnect("Unable to open the Discord Gateway.");
            return false;
        }
        venusRpcGateway.socket=socket;
        venusRpcGateway.ready=false;
        venusRpcGatewayStatus("connecting","");
        socket.onmessage=event=>{
            if(socket!==venusRpcGateway.socket||!venusRpcGateway.alive) return;
            let frame;
            try {frame=JSON.parse(event.data);} catch (_) {return;}
            if(typeof frame.s==="number") venusRpcGateway.sequence=frame.s;
            if(frame.op===10){
                const ms=Number(frame.d&&frame.d.heartbeat_interval);
                if(!(ms>500&&ms<300000)){
                    venusRpcGatewayReconnect("Gateway heartbeat configuration invalid.");
                    return;
                }
                venusRpcGateway.interval=ms;
                venusRpcGateway.ack=true;
                if(global.setInterval) venusRpcGateway.heartbeat=
                    global.setInterval(venusRpcGatewayHeartbeat,ms);
                venusRpcGatewayHeartbeat();
                if(venusRpcGateway.sessionId&&venusRpcGateway.sequence!=null){
                    venusRpcGatewayFrame(6,{
                        token:venusRpcGateway.token,
                        session_id:venusRpcGateway.sessionId,
                        seq:venusRpcGateway.sequence
                    });
                } else {
                    // Same Identify envelope used by Kizzy; identity is never logged.
                    venusRpcGatewayFrame(2,{
                        token:venusRpcGateway.token,
                        capabilities:65,compress:false,largeThreshold:100,
                        properties:{os:"Windows",browser:"Discord Client",device:"Venus"}
                    });
                }
            } else if(frame.op===1){
                venusRpcGatewayFrame(1,venusRpcGateway.sequence);
            } else if(frame.op===11){
                venusRpcGateway.ack=true;
            } else if(frame.op===7){
                venusRpcGatewayReconnect("Discord requested a reconnect.");
            } else if(frame.op===9){
                venusRpcGateway.sessionId=null;
                venusRpcGateway.sequence=null;
                venusRpcGateway.resumeUrl=null;
                venusRpcGatewayReconnect("Discord requested a new session.");
            } else if(frame.op===0&&frame.t==="READY"){
                if(frame.d&&frame.d.user&&frame.d.user.id&&
                    frame.d.user.id!==venusRpcGateway.account){
                    venusRpcGatewayStop(false);
                    venusRpcGatewayStatus("error","Credential belongs to another account.");
                    return;
                }
                venusRpcGateway.sessionId=frame.d&&frame.d.session_id||null;
                const url=frame.d&&frame.d.resume_gateway_url;
                if(typeof url==="string"&&/^wss:\/\/[^/]+\.discord\.gg\//.test(url))
                    venusRpcGateway.resumeUrl=url.replace(/\/+$/,"")+"/?v=10&encoding=json";
                venusRpcGateway.ready=true;
                venusRpcGateway.attempt=0;
                venusRpcGatewaySendPresence();
            } else if(frame.op===0&&frame.t==="RESUMED"){
                venusRpcGateway.ready=true;
                venusRpcGateway.attempt=0;
                venusRpcGatewaySendPresence();
            }
        };
        socket.onerror=()=>{
            if(socket!==venusRpcGateway.socket) return;
            venusRpcGatewayStatus("connecting","Gateway connection error.");
        };
        socket.onclose=event=>{
            if(socket!==venusRpcGateway.socket||!venusRpcGateway.alive) return;
            const code=event&&event.code;
            if([4004,4010,4011,4013,4014].includes(code)){
                venusRpcGatewayStop(false);
                venusRpcGatewayStatus("error","Gateway rejected authentication or connection.");
            } else {
                venusRpcGatewayReconnect("Gateway disconnected.");
            }
        };
        return true;
    }
    function venusRpcGatewayPublish(activity,start) {
        if(!venusRpcGateway.token)
            return {ok:false,error:"Kizzy Gateway mode needs a user token entered for this session. Venus never saves it."};
        if(!currentId())
            return {ok:false,error:"Sign in to Discord before publishing."};
        if(venusRpcGateway.alive&&venusRpcGateway.account!==currentId()){
            venusRpcGatewayStop(false);
            return {ok:false,error:"Account changed. Enter the credential again."};
        }
        venusRpcGateway.activity=activity;
        venusRpcGateway.start=start;
        venusRpcGateway.account=currentId();
        if(venusRpcGatewayCanSend()){
            const sent=venusRpcGatewaySendPresence();
            return sent?{ok:true,pending:false,error:""}:{ok:false,error:"Gateway failed to send presence."};
        }
        if(venusRpcGateway.alive) return {ok:true,pending:true,error:""};
        venusRpcGateway.alive=true;
        venusRpcGateway.attempt=0;
        const started=venusRpcGatewayOpen();
        return started?{ok:true,pending:true,error:""}:{ok:false,error:venusRpcGateway.error||"Failed to open Gateway."};
    }
