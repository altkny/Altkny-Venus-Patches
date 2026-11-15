"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const src=fs.readFileSync("patches/src/main/resources/venus/rpc_editor.js","utf8");
const ctx={Date,console};
vm.createContext(ctx);
vm.runInContext(src+
"\nglobalThis.appSuite={templates:venusRpcAppEntries(),monogram:venusRpcMonogram,normalize:venusRpcNormalize,categories:VENUS_RPC_CATEGORIES};",ctx);
const {templates,monogram,normalize,categories}=ctx.appSuite;
assert.ok(templates.length>=30,"A curated catalog of 30 apps should exist");
assert.equal(new Set(templates.map(a=>a.id)).size,templates.length,"App IDs must be unique");
assert.ok(templates.every(a=>a.id.startsWith("app:")),"Never use fake snowflake IDs");
assert.ok(templates.every(a=>a.applicationId===""),"Never spoof an unverified application ID");
assert.ok(templates.every(a=>categories.includes(a.category)),"All apps use supported categories");
for(const name of ["Spotify","YouTube Music","Netflix","Visual Studio Code",
    "Android Studio","CapCut","Obsidian","Discord"]) {
  assert.ok(templates.some(a=>a.name===name),name+" preset missing");
}
assert.equal(templates.find(a=>a.name==="Spotify").type,2);
assert.equal(templates.find(a=>a.name==="Netflix").type,3);
assert.equal(templates.find(a=>a.name==="Visual Studio Code").type,0);
assert.equal(monogram("YouTube Music"),"YM");
assert.equal(monogram("Spotify"),"SP");
const app=normalize({...templates[0],sendMode:"compat",platform:"android",
  iconUrl:"https://example.com/logo.png",partyCurrent:2,partyMax:4});
assert.equal(app.category,"Music");
assert.equal(app.iconUrl,"https://example.com/logo.png");
assert.equal(app.platform,"android");
assert.equal(app.partyCurrent,2);
assert.equal(app.partyMax,4);
assert.equal(normalize({...app,iconUrl:"javascript:alert(1)"}).iconUrl,"");
assert.equal(normalize({...app,platform:"unsafe"}).platform,"");
assert.equal(normalize({...app,partyCurrent:500,partyMax:-4}).partyCurrent,99);
assert.equal(normalize({...app,partyCurrent:500,partyMax:-4}).partyMax,0);
console.log("App profiles passed: 30+ presets, categories, monograms, identity isolation, safe artwork and extra fields.");
