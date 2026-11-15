"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("patches/src/main/resources/venus/rpc_gateway.js","utf8");
const sent=[],created=[],timeouts=[],intervals=[];
const fakeToken="testing-token-used-only-for-vm-mock-12345";
const account="123456789012345678";
class FakeSocket{
  constructor(url){this.url=url;this.readyState=1;created.push(this);}
  send(data){sent.push(JSON.parse(data));}
  close(){this.readyState=3;}
  emit(data){this.onmessage({data:JSON.stringify(data)});}
}
const saved=[];
const ctx={
  currentId:()=>account,notify:()=>{},settings:{},
  setSetting:(k,v)=>saved.push({k,v}),Date,console,
  global:{
    WebSocket:FakeSocket,
    setInterval:fn=>(intervals.push(fn),intervals.length),
    clearInterval:()=>{},
    setTimeout:fn=>(timeouts.push(fn),timeouts.length),
    clearTimeout:()=>{}
  }
};
vm.createContext(ctx);
vm.runInContext(source+
"\nglobalThis.gatewayTest={gateway:venusRpcGateway,authorize:venusRpcGatewayAuthorize,authorized:venusRpcGatewayAuthorized,publish:venusRpcGatewayPublish,stop:venusRpcGatewayStop};",ctx);
const g=ctx.gatewayTest;
const sample={name:"Minecraft",application_id:"1402418491272986635",
  type:0,details:"Survival",timestamps:{start:1700000000000}};
assert.equal(g.publish(sample,1700000000000).ok,false);
assert.equal(g.authorize(fakeToken,false).ok,false);
assert.equal(g.authorize(fakeToken,true).ok,true);
assert.equal(g.authorized(),true);
const started=g.publish(sample,1700000000000);
assert.equal(started.ok,true);
assert.equal(started.pending,true);
assert.equal(created[0].url,"wss://gateway.discord.gg/?v=10&encoding=json");
const ws=created[0];
ws.emit({op:10,d:{heartbeat_interval:45000}});
assert.equal(sent[0].op,1,"Heartbeat first");
assert.equal(sent[1].op,2,"Kizzy identify");
assert.equal(sent[1].d.token,fakeToken);
assert.equal(sent[1].d.properties.browser,"Discord Client");
assert.equal(sent[1].d.properties.os,"Windows");
assert.equal(sent[1].d.properties.device,"ktor");
assert.equal(sent[1].d.capabilities,65);
assert.equal(sent[1].d.compress,false);
ws.emit({op:11});
assert.equal(g.gateway.ack,true,"Heartbeat acknowledged");
ws.emit({op:0,t:"READY",s:10,d:{
  user:{id:account},session_id:"test-session",
  resume_gateway_url:"wss://gateway-us-east1-b.discord.gg"
}});
assert.equal(sent.at(-1).op,3);
assert.equal(sent.at(-1).d.activities[0].name,"Minecraft");
assert.equal(sent.at(-1).d.activities[0].timestamps.start,1700000000000);
assert.equal(sent.at(-1).d.since,1700000000000);
assert.equal(g.gateway.status,"published");
const before=sent.length;
assert.equal(g.publish({...sample,details:"Updated"},1700000000000).ok,true);
assert.equal(sent.length,before+1);
assert.equal(sent.at(-1).op,3);
assert.equal(sent.at(-1).d.activities[0].details,"Updated");
ws.onclose({code:4000});
assert.equal(g.gateway.status,"reconnecting");
assert.equal(timeouts.length,1);
timeouts[0]();
assert.equal(created[1].url,"wss://gateway-us-east1-b.discord.gg/?v=10&encoding=json");
created[1].emit({op:10,d:{heartbeat_interval:45000}});
assert.equal(sent.at(-1).op,6,"Resume opcode");
assert.equal(sent.at(-1).d.seq,10);
created[1].emit({op:0,t:"RESUMED",s:11,d:{}});
assert.equal(sent.at(-1).op,3,"Resume republishes presence");
const count=sent.length;
g.stop(true);
assert.equal(sent.length,count+1,"Stop clears remote presence");
assert.equal(sent.at(-1).op,3);
assert.equal(sent.at(-1).d.activities.length,0);
assert.equal(g.gateway.credential,null);
assert.equal(g.authorized(),false);
assert.equal(saved.length,0);
assert.equal(JSON.stringify(ctx.settings).includes(fakeToken),false);
assert.equal(g.gateway.status,"off");
assert.equal(g.authorize(fakeToken,true).ok,true);
assert.equal(g.publish(sample,1700000000000).ok,true);
created.at(-1).emit({op:10,d:{heartbeat_interval:45000}});
created.at(-1).emit({op:0,t:"READY",s:12,d:{
  user:{id:"987654321098765432"},session_id:"wrong-account"
}});
assert.equal(g.gateway.status,"error");
assert.equal(g.authorized(),false,"Wrong account clears credential");
console.log("Kizzy Gateway tests passed: consent, identify, heartbeat, presence, resume, stop, no storage, account guard.");
