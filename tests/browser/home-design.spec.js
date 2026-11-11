import {test,expect} from '@playwright/test';
import {homeItems,homeFootprint} from '../../src/home-layout.js';
import {rooms,canOccupy} from '../../src/plan.js';

test('whole house furnishings render in place with clear arrivals and warm night lighting',async({page})=>{
  test.setTimeout(180000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('./#room=bedroom');
  await page.waitForFunction(count=>window.__koma?.homeBounds?.length===count,homeItems.length);
  await expect(page.locator('#loading')).toHaveCount(0);
  const state=await page.evaluate(()=>window.__koma);
  for(const item of homeItems){
    const b=state.homeBounds.find(b=>b.id===item.id),fp=homeFootprint(item);
    expect(b,item.id).toBeTruthy();
    expect(b.min[0],item.id).toBeGreaterThanOrEqual(fp.x-fp.width/2-.08);
    expect(b.max[0],item.id).toBeLessThanOrEqual(fp.x+fp.width/2+.08);
    expect(b.min[2],item.id).toBeGreaterThanOrEqual(fp.z-fp.depth/2-.08);
    expect(b.max[2],item.id).toBeLessThanOrEqual(fp.z+fp.depth/2+.08);
  }
  for(const r of rooms){
    await page.getByRole('button',{name:`Visit ${r.name}`,exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.__koma.room)).toBe(r.id);
    const s=await page.evaluate(()=>window.__koma);
    expect(canOccupy(s.position.x,s.position.z,s.obstacles),r.id).toBe(true);
    await page.screenshot({path:`test-results/home-${r.id}-day.png`,animations:'disabled'});
  }
  await page.getByRole('button',{name:'Night',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__koma.lighting)).toBe('night');
  for(const r of rooms.filter(r=>['bedroom','guest','flex','living','bath'].includes(r.id))){
    await page.getByRole('button',{name:`Visit ${r.name}`,exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.__koma.room)).toBe(r.id);
    await page.screenshot({path:`test-results/home-${r.id}-night.png`,animations:'disabled'});
  }
  await page.getByRole('button',{name:'Visit Primary bedroom',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__koma.room)).toBe('bedroom');
  // Turn toward the reference-inspired gallery wall using the visitor controls.
  const before=await page.evaluate(()=>window.__koma.yaw);
  await page.mouse.move(1300,550);await page.mouse.down();
  await page.mouse.move(1300-Math.PI/.0035,493,{steps:12});await page.mouse.up();
  await expect.poll(()=>page.evaluate(start=>Math.cos(window.__koma.yaw-start),before)).toBeCloseTo(-1,2);
  await page.screenshot({path:'test-results/home-gallery-night.png',animations:'disabled'});
  await page.getByRole('button',{name:'Day',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__koma.lighting)).toBe('day');
  await page.screenshot({path:'test-results/home-gallery-day.png',animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  for(const id of ['guest','flex']){
    const room=rooms.find(r=>r.id===id);
    await page.getByRole('button',{name:/^Rooms/}).click();
    await page.getByRole('button',{name:`Visit ${room.name}`,exact:true}).click();
    await expect(page.locator('#view-title')).toHaveText(room.name);
    await page.screenshot({path:`test-results/home-${id}-mobile.png`,animations:'disabled'});
  }
  console.log('Whole-house render:',state.drawCalls,'calls,',state.triangles,'triangles');
  expect(errors).toEqual([]);
});
