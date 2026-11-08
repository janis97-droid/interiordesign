// Whole-house furnishing proposal, November 2026. Sizes are design selections,
// not survey measurements. The approved shell and existing floor are unchanged.
const item = (id, room, kind, x, z, width, depth, height, rotation = 0) =>
  ({ id, room, kind, x, z, width, depth, height, rotation });
export const homeItems = [
  item('primary-bed', 'bedroom', 'bed', 8.9, 8.66, 1.8, 2.2, 1.12),
  item('primary-nightstand-left', 'bedroom', 'nightstand', 7.61, 7.94, .5, .46, .52),
  item('primary-nightstand-right', 'bedroom', 'nightstand', 10.16, 7.94, .5, .46, .52),
  item('primary-wardrobe', 'bedroom', 'wardrobe', 7.05, 11.78, 2.16, .6, 2.35, Math.PI / 2),
  item('primary-dresser', 'bedroom', 'dresser', 10.22, 11.86, 1.5, .52, .8, -Math.PI / 2),
  item('primary-bench', 'bedroom', 'bench', 8.85, 12.64, 1.25, .46, .46),
  item('guest-bed', 'guest', 'bed', 2.5, 6.18, 1.5, 2.12, 1.06),
  item('guest-nightstand-left', 'guest', 'nightstand', 1.38, 5.49, .44, .42, .52),
  item('guest-nightstand-right', 'guest', 'nightstand', 3.62, 5.49, .44, .42, .52),
  item('guest-wardrobe', 'guest', 'wardrobe', 4.36, 6.15, 1.8, .55, 2.3, -Math.PI / 2),
  item('study-desk', 'flex', 'desk', 3.35, 10.82, 1.45, .64, .76, Math.PI / 2),
  item('study-chair', 'flex', 'chair', 4.08, 10.82, .54, .58, .84, -Math.PI / 2),
  item('study-bookcase', 'flex', 'bookcase', 4.50, 10.02, 1.48, .34, 1.95),
  item('study-daybed', 'flex', 'daybed', 4.6, 12.48, 2.08, .92, .86, Math.PI),
  item('hall-console', 'hall', 'console', 5.02, 6.62, 1.36, .32, .84, Math.PI / 2),
  item('bath-vanity', 'bath', 'vanity', 1.19, 10.08, 1.36, .5, .86),
  item('bath-toilet', 'bath', 'toilet', 2.50, 11.28, .38, .64, .43, -Math.PI / 2),
  item('wc-basin', 'wc', 'vanity', .74, 8.65, .48, .32, .84),
  item('ensuite-vanity', 'ensuite', 'vanity', 11.91, 9.62, 1.08, .5, .86),
  item('balcony-chair-1', 'balcony', 'chair', .84, 1.1, .62, .67, .86),
  item('balcony-chair-2', 'balcony', 'chair', 1.68, 1.1, .62, .67, .86),
  item('balcony-table', 'balcony', 'round-table', 1.26, 2.02, .58, .58, .48),
  item('balcony-plant', 'balcony', 'plant', .55, 4.15, .38, .38, 1.3),
  item('balcony-herbs', 'balcony', 'plant', .55, 2.92, .34, .34, .82),
];
export const homeRugs = [
  {room:'bedroom', x:8.83,z:9.2,width:2.65,depth:2.5},
  {room:'guest', x:2.5,z:6.65,width:2.3,depth:2.4},
  {room:'flex', x:4.85,z:11.82,width:2.35,depth:1.65},
];
export const homeShowers = [
  {id:'bath-shower',room:'bath',x:.7,z:11.27,width:1.06,depth:1.28,screenDepth:.82},
  {id:'ensuite-shower',room:'ensuite',x:11.28,z:12.4,width:.86,depth:1.05},
];
export const homeLights = [
  {room:'bedroom',position:[8.7,2.55,10.65],intensity:9,cone:0},
  {room:'guest',position:[2.6,2.55,6.55],intensity:6,cone:0},
  {room:'flex',position:[4.9,2.55,11.5],intensity:6,cone:0},
  {room:'bath',position:[1.65,2.55,10.9],intensity:5,cone:0},
  {room:'wc',position:[.8,2.5,9.1],intensity:2,cone:0},
  {room:'ensuite',position:[11.5,2.5,11.1],intensity:5,cone:0},
  {room:'living',position:[5.25,2.25,2.0],intensity:6,cone:0},
];
export function homeFootprint(o) {
  const c=Math.abs(Math.cos(o.rotation||0)),s=Math.abs(Math.sin(o.rotation||0));
  return {x:o.x,z:o.z,width:o.width*c+o.depth*s,depth:o.width*s+o.depth*c};
}
export const homeObstacles = [
  ...homeItems.map(homeFootprint),
  // Walk-in screens have open fronts; the shower tray remains walkable.
  ...homeShowers.map(s=>({x:s.x+s.width/2,z:s.z,width:.035,depth:s.screenDepth||s.depth})),
];
export const homeBakeBoxes = homeItems.map(o=>({id:o.id,...homeFootprint(o),y:.014,height:o.height}));
export const homeOccluders = homeItems.flatMap(o=>{
  const envelope={...homeFootprint(o),y:.1,height:o.height-.1,albedo:.3};
  if(o.kind==='plant') return [];
  if(['bed','daybed','chair','bench'].includes(o.kind)) {
    const c=Math.cos(o.rotation),s=Math.sin(o.rotation),localZ=-o.depth/2+.08;
    return [{...envelope,height:Math.min(.42,o.height-.1)},
      {x:o.x+s*localZ,z:o.z+c*localZ,width:Math.abs(o.width*c)+Math.abs(.12*s),depth:Math.abs(o.width*s)+Math.abs(.12*c),y:.45,height:o.height-.45,albedo:.3}];
  }
  if(['desk','console','round-table'].includes(o.kind)) return [{...envelope,y:o.height-.06,height:.06}];
  return [envelope];
});
