import test from 'node:test';
import assert from 'node:assert/strict';
import {rooms,canOccupy} from '../src/plan.js';
import {homeItems,homeObstacles,homeShowers,homeFootprint} from '../src/home-layout.js';
import {livingObstacles,livingView} from '../src/living-layout.js';
import {kitchenObstacles} from '../src/kitchen-layout.js';
import {ensuiteObstacles} from '../src/ensuite-layout.js';
import {bathroomObstacles} from '../src/bathroom-details-layout.js';
const obstacles=[...homeObstacles,...livingObstacles,...kitchenObstacles,...ensuiteObstacles,...bathroomObstacles];
test('whole-house furniture stays inside the existing shell',()=>{
  for(const o of homeItems){
    const c=Math.cos(o.rotation),s=Math.sin(o.rotation);
    for(const x of [-.5,0,.5])for(const z of [-.5,0,.5])
      assert.ok(canOccupy(o.x+x*o.width*c+z*o.depth*s,o.z-x*o.width*s+z*o.depth*c,[],.01),o.id);
  }
});
test('new furniture footprints do not intersect',()=>{
  for(let i=0;i<homeItems.length;i++)for(let j=i+1;j<homeItems.length;j++){
    const a=homeFootprint(homeItems[i]),b=homeFootprint(homeItems[j]);
    const x=(a.width+b.width)/2-Math.abs(a.x-b.x);
    const z=(a.depth+b.depth)/2-Math.abs(a.z-b.z);
    assert.ok(x<=.005||z<=.005,`${homeItems[i].id} overlaps ${homeItems[j].id}`);
  }
});
test('furnished house keeps all rooms and walk-in showers reachable',()=>{
  const step=.1,key=(x,z)=>`${x},${z}`,start=livingView.point.map(v=>Math.round(v/step));
  const queue=[start],seen=new Set([key(...start)]);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const a=x+dx,b=z+dz,k=key(a,b);
      if(!seen.has(k)&&canOccupy(a*step,b*step,obstacles)){seen.add(k);queue.push([a,b]);}
    }
  }
  for(const r of rooms)assert.ok(seen.has(key(...r.point.map(v=>Math.round(v/step)))),r.name);
  for(const s of homeShowers)assert.ok(seen.has(key(Math.round(s.x/step),Math.round(s.z/step))),s.id);
  for(const [name,x,z] of [['protected window',5.6,12.6],['protected entrance',6.0,10.1],['bedroom arrival',8.8,9.6],['wardrobe access',7.6,11.4]])
    assert.ok(seen.has(key(Math.round(x/step),Math.round(z/step))),name);
  for(const o of homeItems)assert.equal(canOccupy(o.x,o.z,obstacles),false,o.id);
});
test('owner room corrections retain the bed footprint and clear the window',()=>{
  const bed=homeItems.find(o=>o.id==='primary-bed');
  assert.deepEqual([bed.width,bed.depth],[1.8,2.2]);
  assert.equal(bed.rotation,Math.PI);
  assert.ok(bed.z>11&&bed.height+.014<.78,'headboard stays below the existing sill');
  assert.equal(homeItems.filter(o=>o.room==='guest'&&o.kind.includes('bed')).length,1);
  assert.ok(homeItems.filter(o=>o.room==='flex').every(o=>o.kind.startsWith('storage-')));
  // Storage stays outside the protected-room window approach.
  for(let x=5.0;x<=6.0;x+=.2)assert.ok(canOccupy(x,12.6,obstacles),'window approach');
});
