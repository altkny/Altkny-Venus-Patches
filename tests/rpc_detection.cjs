"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("patches/src/main/resources/venus/rpc_detection.js","utf8");
const profiles=[
 {id:"app:spotify",name:"Spotify",packageName:"com.spotify.music",autoDetect:true,sendMode:"compat",elapsed:true},
 {id:"app:youtube",name:"YouTube",packageName:"com.google.android.youtube",autoDetect:false,sendMode:"compat",elapsed:true},
 {id:"app:sensitive",name:"Unapproved",packageName:"com.secret.app",autoDetect:false,sendMode:"compat",elapsed:true}
];
const recorded=[],publications=[],updates=[];
let foreground={granted:true,packageName:"",since:0};
const settings={rpcDetectionEnabled:false,rpcEnabled:false};
const transport={active:false,profileId:null,mode:"compat",lastPayload:null};
const timers=[],cleared=[];
const ctx={
  console,Date,JSON,Set,
  settings,venusRpcTransport:transport,
  features:{customRpc:true},
  venusRpcGateway:{active:false},
  venusRpcGatewayAuthorized:()=>false,
  venusRpcGatewayPublish:()=>({ok:false,error:"No auth"}),
  venusRpcProfiles:()=>profiles,
  venusRpcNormalize:p=>p,
  venusRpcDispatch:activity=>(recorded.push(activity),true),
  venusRpcPublish:(profile,resume)=>{
    publications.push({profile,resume});
    transport.active=true;
    transport.profileId=profile.id;
    transport.mode=profile.sendMode;
    return {ok:true,pending:false};
  },
  notify:()=>{},backgroundSync:()=>{},
  setSetting:(key,value)=>{settings[key]=value;updates.push({key,value})},
  diagCall:async(action,argument)=>{
    if(action==="rpc:permission") return JSON.stringify({granted:true});
    if(action==="rpc:settings") return "opened";
    if(action==="rpc:foreground") {
      recorded.push(JSON.parse(argument));
      return JSON.stringify(foreground);
    }
    throw Error("Unexpected action "+action);
  },
  global:{
    setInterval:fn=>(timers.push(fn),timers.length),
    clearInterval:id=>cleared.push(id)
  }
};
vm.createContext(ctx);
vm.runInContext(source+
"\nglobalThis.rpcDetectorTest={state:venusRpcDetection,valid:venusRpcValidPackage,candidates:venusRpcDetectionCandidates,start:venusRpcDetectionStart,stop:venusRpcDetectionStop,poll:venusRpcDetectionPoll,handle:venusRpcDetectionHandle};",ctx);
const d=ctx.rpcDetectorTest;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  assert.equal(d.state.active,false,"Detection off by default");
  assert.equal(d.start(),false,"No polling without master switch");
  assert.equal(d.valid("com.spotify.music"),true);
  assert.equal(d.valid("not-an-id"),false);
  assert.equal(d.valid("com.unsafe;cmd"),false);
  assert.equal(d.candidates().length,1,"No app without explicit profile opt-in");
  settings.rpcDetectionEnabled=true;
  assert.equal(d.start(),true);
  await flush();
  assert.equal(d.state.granted,true);
  assert.equal(recorded.length,1);
  assert.equal(recorded[0].length,1);
  assert.equal(recorded[0][0],"com.spotify.music");
  assert.equal(publications.length,0,"Do not publish unrelated foreground apps");
  foreground={granted:true,packageName:"com.spotify.music",since:Date.now()-8500};
  d.poll();await flush();
  assert.equal(publications.length,1);
  assert.equal(publications[0].profile.id,"app:spotify");
  assert.ok(publications[0].profile.timeOffsetSeconds>=7);
  assert.equal(settings.rpcEnabled,true);
  d.poll();await flush();
  assert.equal(publications.length,1,"No repeated unchanged presence");
  foreground={granted:true,packageName:"",since:0};
  d.poll();await flush();
  assert.equal(recorded.at(-1),null,"Unapproved or exited app clears managed activity");
  assert.equal(settings.rpcEnabled,false);
  assert.equal(d.state.managedId,null);
  foreground={granted:true,packageName:"com.google.android.youtube",since:Date.now()};
  d.poll();await flush();
  assert.equal(publications.length,1,"YouTube not approved must not publish");
  d.stop(true);
  assert.equal(d.state.active,false);
  assert.ok(cleared.length);
  assert.equal(d.state.status,"off");
  console.log("Opt-in Android app detection passed: grants, allowlist, matching, state changes, disabling, clearing and no spam.");
})().catch(e=>{console.error(e);process.exitCode=1;});
