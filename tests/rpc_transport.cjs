"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");

const file="patches/src/main/resources/venus/rpc_transport.js";
const src=fs.readFileSync(file,"utf8");
const actions=[];
const ctx={
  features:{customRpc:true},
  settings:{rpcEnabled:false,rpcSelected:"minecraft"},
  BADGE_FALLBACK_GAMES:[{name:"Minecraft",id:"1402418491272986635"}],
  venusRpcNormalize:p=>({
    ...p,
    applicationId:p.applicationId||"",
    sendMode:p.sendMode||"rich",
    name:p.name||"",
    buttons:Array.isArray(p.buttons)?p.buttons:[],
  }),
  venusRpcValidUrl:url=>/^https:\/\/[^\s]+$/i.test(url),
  venusRpcGateway:{active:false},
  venusRpcGatewayAuthorized:()=>false,
  venusRpcGatewayStop:()=>{},
  venusRpcGatewayPublish:()=>({ok:false,error:"Not authorized"}),
  venusRpcProfiles:()=>[],
  questRequest:async()=>({body:Array.from({length:165},(_,i)=>({
    id:String(1400000000000000000n+BigInt(i)),
    name:"Game "+i,icon_hash:"0123456789abcdef0123456789abcdef",type:0
  }))}),
  questDispatch:action=>(actions.push(action),true),
  currentId:()=> "123456789012345678",
  backgroundSync:()=>{},
  notify:()=>{},
  later:()=>{},
  setSetting:(key,value)=>{ctx.settings[key]=value;return true;},
  Date,console
};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.__rpc={build:venusRpcBuildActivity,publish:venusRpcPublish,clear:venusRpcClear,state:venusRpcTransport,catalogLoad:venusRpcCatalogLoad,officialIcon:venusRpcOfficialIcon,previewImage:venusRpcPreviewImage,knownGames:venusRpcKnownGames,appId:venusRpcAppId};',ctx);
const rpc=ctx.__rpc;
const game={
  id:"minecraft",name:"Minecraft",details:"Overworld",state:"Survival",
  elapsed:true,buttons:[{label:"Visit",url:"https://example.org"}],
};
const data=rpc.build(game,1700000000000);
assert.equal(data.error,undefined);
assert.equal(data.activity.application_id,"1402418491272986635");
assert.equal(data.activity.details,"Overworld");
assert.equal(data.activity.timestamps.start,1700000000000);
assert.equal(data.activity.buttons[0],"Visit");
assert.equal(data.activity.metadata.button_urls[0],"https://example.org");
const compatibility=rpc.build({id:"unregistered",name:"Unknown game",sendMode:"compat",type:3,elapsed:true,buttons:[]},1700000000000);
assert.equal(compatibility.error,undefined);
assert.equal(compatibility.activity.type,3);
assert.equal(Object.hasOwn(compatibility.activity,"application_id"),false);
assert.equal(compatibility.activity.timestamps.start,1700000000000);
const gatewayBuilt=rpc.build({id:"newgame",name:"Missing game",sendMode:"kizzy",elapsed:true,buttons:[]},1700000000000);
assert.equal(gatewayBuilt.activity.application_id,"962990036020756480");
assert.equal(gatewayBuilt.activity.timestamps.start,1700000000000);
assert.equal(rpc.appId({id:"app:minecraft",name:"Minecraft",category:"Music"}),null,
    "App templates must not automatically impersonate detected game names");
assert.equal(rpc.previewImage({id:"app:spotify",name:"Spotify",category:"Music",
    iconUrl:"https://example.org/spotify-cover.png"},false),"https://example.org/spotify-cover.png");
const party=rpc.build({...game,platform:"android",partyCurrent:2,partyMax:5},1700000000000);
assert.equal(party.activity.platform,"android");
assert.equal(party.activity.party.size[0],2);
assert.equal(party.activity.party.size[1],5);
const invalidParty=rpc.build({...game,partyCurrent:7,partyMax:2},1700000000000);
assert.equal(invalidParty.activity.party,undefined);
const listening=rpc.build({...game,type:2},1700000000000);
assert.equal(listening.activity.type,2);
const streaming=rpc.build({...game,type:1,streamUrl:"https://twitch.tv/test"},1700000000000);
assert.equal(streaming.activity.type,1);
assert.equal(streaming.activity.url,"https://twitch.tv/test");
const competing=rpc.build({...game,type:5},1700000000000);
assert.equal(competing.activity.type,5);

const beforeBlocked=actions.length;
const blockedApp=rpc.publish({id:"app:spotify",name:"Spotify",category:"Music",sendMode:"compat",buttons:[]},false);
assert.equal(blockedApp.ok,false,"Do not tell users a local-only app presence worked");
assert.match(blockedApp.error,/Gateway/);
assert.equal(actions.length,beforeBlocked,"Unregistered app must not dispatch fake success");
const pendingGateway=rpc.publish({id:"app:spotify",name:"Spotify",category:"Music",sendMode:"kizzy",buttons:[]},false);
assert.equal(pendingGateway.ok,false,"Gateway requires authorization");
assert.equal(actions.length,beforeBlocked);
assert.equal(rpc.publish(game,false).ok,true);
assert.equal(ctx.settings.rpcStartedAt,rpc.state.startedAt);
assert.equal(ctx.settings.rpcAccountId,ctx.currentId());
// The UI can mount and restore repeatedly: never spam an unchanged activity.
const initialCount=actions.length, stableStart=rpc.state.startedAt;
assert.equal(rpc.publish(game,true).ok,true);
assert.equal(rpc.publish(game,true).skipped,true);
assert.equal(actions.length,initialCount);
assert.equal(rpc.state.startedAt,stableStart);
// Edits may change the card but cannot restart its elapsed counter.
assert.equal(rpc.publish({...game,details:"Updated"},true).ok,true);
assert.equal(actions.length,initialCount+1);
assert.equal(actions.at(-1).activity.timestamps.start,stableStart);
assert.equal(rpc.publish({...game,details:"Updated"},true).skipped,true);
assert.equal(actions.length,initialCount+1);
assert.equal(actions.at(-1).type,"LOCAL_ACTIVITY_UPDATE");
assert.equal(actions.at(-1).socketId,"venus-custom-rpc");
assert.equal(actions.at(-1).activity.name,"Minecraft");
rpc.clear();
assert.equal(actions.at(-1).activity,null);
// A restart recovers the original epoch; a subsequent edit never moves it.
const previous=Date.now()-4272;
ctx.settings.rpcStartedAt=previous;
ctx.settings.rpcAccountId=ctx.currentId();
ctx.settings.rpcEnabled=true;
assert.equal(rpc.publish(game,true).ok,true);
assert.equal(actions.at(-1).activity.timestamps.start,previous);
assert.equal(rpc.publish({...game,details:"updated"},true).ok,true);
assert.equal(actions.at(-1).activity.timestamps.start,previous);
// Editing only the elapsed offset updates the timestamp once.
const offsetBefore=actions.length;
assert.equal(rpc.publish({...game,timeOffsetSeconds:1800},true).ok,true);
assert.ok(actions.at(-1).activity.timestamps.start<=Date.now()-1800000+2000);
assert.equal(actions.length,offsetBefore+1);
assert.equal(rpc.publish({...game,timeOffsetSeconds:1800},true).skipped,true);
assert.equal(actions.length,offsetBefore+1);
// The reset button republishes with a fresh timestamp.
assert.equal(rpc.publish(game,false).ok,true);
assert.ok(rpc.state.startedAt>previous);
assert.equal(actions.at(-1).activity.timestamps.start,rpc.state.startedAt);
ctx.settings.rpcEnabled=false;
rpc.clear();
assert.equal(ctx.settings.rpcStartedAt,0);
assert.equal(ctx.settings.rpcAccountId,"");
assert.equal(rpc.publish({id:"custom",name:"Unregistered",buttons:[]},false).ok,false);
assert.equal(actions.at(-1).activity,null);
console.log("RPC transport unit tests passed (external Discord publication not tested).");

(async()=>{
  const games=await rpc.catalogLoad(true);
  assert.equal(games.length,165,"Discord catalog should load more than the built-in fallback");
  assert.equal(games[0].name,"Game 0");
  assert.equal(rpc.knownGames().length,165);
  const game=games.find(g=>g.name==="Game 15");
  const image=rpc.officialIcon(game.id,game.icon,256);
  assert.equal(image,"https://cdn.discordapp.com/app-icons/"+game.id+"/"+game.icon+".png?size=256");
  assert.equal(rpc.previewImage({applicationId:game.id,name:game.name,iconHash:game.icon},false),image);
  const extra=rpc.build({id:game.id,applicationId:game.id,name:game.name,elapsed:true,buttons:[]},12345);
  assert.equal(extra.activity.application_id,game.id);
  console.log("Large Discord game catalog, official images and application IDs passed.");
})().catch(e=>{console.error(e);process.exitCode=1;});
