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
    name:p.name||"",
    buttons:Array.isArray(p.buttons)?p.buttons:[],
  }),
  venusRpcValidUrl:url=>/^https:\/\/[^\s]+$/i.test(url),
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
vm.runInContext(src+'\nglobalThis.__rpc={build:venusRpcBuildActivity,publish:venusRpcPublish,clear:venusRpcClear,state:venusRpcTransport,catalogLoad:venusRpcCatalogLoad,officialIcon:venusRpcOfficialIcon,previewImage:venusRpcPreviewImage,knownGames:venusRpcKnownGames};',ctx);
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
assert.equal(rpc.publish(game,false).ok,true);
assert.equal(ctx.settings.rpcStartedAt,rpc.state.startedAt);
assert.equal(ctx.settings.rpcAccountId,ctx.currentId());
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
