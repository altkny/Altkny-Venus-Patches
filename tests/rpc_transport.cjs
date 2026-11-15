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
  questDispatch:action=>(actions.push(action),true),
  currentId:()=> "123456789012345678",
  backgroundSync:()=>{},
  notify:()=>{},
  later:()=>{},
  Date,console
};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.__rpc={build:venusRpcBuildActivity,publish:venusRpcPublish,clear:venusRpcClear,state:venusRpcTransport};',ctx);
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
assert.equal(actions.at(-1).type,"LOCAL_ACTIVITY_UPDATE");
assert.equal(actions.at(-1).socketId,"venus-custom-rpc");
assert.equal(actions.at(-1).activity.name,"Minecraft");
rpc.clear();
assert.equal(actions.at(-1).activity,null);
assert.equal(rpc.publish({id:"custom",name:"Unregistered",buttons:[]},false).ok,false);
assert.equal(actions.at(-1).activity,null);
console.log("RPC transport unit tests passed (external Discord publication not tested).");
