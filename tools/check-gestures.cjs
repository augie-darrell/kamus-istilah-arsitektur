const assert=require('node:assert/strict'),{pinchView,mountPinch}=require('../assets/js/graph-input.js');
const initial={scale:1,x:0,y:0},start=[{x:100,y:100},{x:200,y:100}];
assert.deepEqual(pinchView(initial,start,[{x:50,y:200},{x:250,y:200}]),{scale:2,x:-150,y:0},'Zoom and two-finger panning must preserve the point under the midpoint');
assert.deepEqual(pinchView(initial,start,[{x:125,y:100},{x:175,y:100}]),{scale:.5,x:75,y:50});
assert.equal(pinchView({scale:3,x:0,y:0},start,[{x:0,y:100},{x:300,y:100}],.2,3.5).scale,3.5);
assert.equal(pinchView(initial,start,[{x:149,y:100},{x:151,y:100}],.2,3.5).scale,.2);
class Surface extends EventTarget{setPointerCapture(){}}
const surface=new Surface();let camera={...initial},starts=0,ends=0,time=0;
class Point{constructor(x,y){this._x=x;this._y=y;}get x(){return this._x;}get y(){return this._y;}}
const gesture=mountPinch(surface,{getView:()=>camera,setView:view=>camera=view,point:e=>new Point(e.clientX,e.clientY),onStart:()=>starts++,onEnd:()=>ends++,now:()=>time});
function event(type,id,x=0,y=0,pointerType='touch'){
  const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,pointerType});surface.dispatchEvent(e);return e;
}
assert(!event('pointerdown',1,100,100).defaultPrevented,'One finger must remain available to node dragging/panning');
assert(event('pointerdown',2,200,100).defaultPrevented);assert(gesture.busy());assert.equal(starts,1);
event('pointermove',1,50,200);event('pointermove',2,250,200);assert.deepEqual(camera,{scale:2,x:-150,y:0});
assert(event('pointerup',2).defaultPrevented);assert(gesture.busy(),'Remaining finger must not become a new node drag');
const after={...camera};assert(event('pointermove',1,10,10).defaultPrevented);assert.deepEqual(camera,after);
assert(event('pointerup',1).defaultPrevented);assert(!gesture.busy());assert.equal(ends,1);
assert(event('click',0).defaultPrevented,'A pinch must not accidentally select a term or folder');time=500;assert(!event('click',0).defaultPrevented);
event('pointerdown',3,100,100);event('pointerdown',4,200,100);event('pointercancel',3);event('pointercancel',4);assert(!gesture.busy());assert.equal(ends,2);
assert(!event('pointerdown',5,100,100,'mouse').defaultPrevented);assert(!gesture.busy());
gesture.destroy();assert(!event('pointerdown',6,100,100).defaultPrevented);
console.log('Passed: midpoint-anchored pinch zoom, zoom limits, two-finger panning, one-finger preservation, no accidental clicks, cancellation, and mouse compatibility.');
