"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("patches/src/main/resources/venus/rpc_editor.js","utf8");
const context={Date,Math,Number};
vm.createContext(context);
vm.runInContext(source+
    "\nglobalThis.rpcTimer={format:venusRpcTime,seconds:venusRpcElapsedSeconds,next:venusRpcNextClockDelay};",context);
const {format,seconds,next}=context.rpcTimer;
const start=1_700_000_000_000;
assert.equal(format(0),"00:00:00");
assert.equal(format(65),"00:01:05");
assert.equal(format(3661),"01:01:01");
assert.equal(seconds(start,start),0);
assert.equal(seconds(start,start+999),0);
assert.equal(seconds(start,start+1000),1);
assert.equal(seconds(start,start+5017),5);
// If Android delays a timer callback by 15 seconds, the clock catches up
// from absolute time instead of being 15 seconds behind.
assert.equal(seconds(start,start+15980),15);
assert.equal(seconds(start,start+12_345_678),12345);
assert.equal(next(start,start),1015);
assert.equal(next(start,start+125),890);
assert.equal(next(start,start+990),40);
assert.equal(next(start,start+1500),515);
assert.equal(seconds(start,start-1000),0);
console.log("RPC clock tests passed: second boundaries, delayed callbacks and hour formatting.");
