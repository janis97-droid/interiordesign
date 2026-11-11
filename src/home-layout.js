// Whole-house furnishing proposal, November 2026. Sizes are design selections,
// not survey measurements. The approved shell and existing floor are unchanged.
const item = (id, room, kind, x, z, width, depth, height, rotation = 0) =>
  ({ id, room, kind, x, z, width, depth, height, rotation });
export const homeItems = [
  // Owner correction: opposite (window) wall, facing the entry. Low headboard
  // stays below the existing 78 cm sill; the 180 x 220 cm footprint is retained.
  item('primary-bed', 'bedroom', 'bed', 8.8, 11.80, 1.8, 2.2, .72, Math.PI),
  item('primary-nightstand-left', 'bedroom', 'nightstand', 7.64, 12.40, .5, .46, .52, Math.PI),
  item('primary-nightstand-right', 'bedroom', 'nightstand', 10.01, 12.40, .5, .46, .52, Math.PI),
  item('primary-wardrobe', 'bedroom', 'wardrobe', 7.05, 11.78, 2.16, .6, 2.35, Math.PI / 2),
  item('primary-gallery', 'bedroom', 'gallery-shelf', 8.55, 7.60, 2.25, .28, .86),
  item('child-bed', 'guest', 'child-bed', 2.10, 6.30, 1.05, 2.10, .82),
  item('child-nightstand', 'guest', 'nightstand', 2.98, 5.76, .42, .40, .42),
  item('child-toy-cubbies', 'guest', 'toy-cubbies', 3.50, 5.33, 1.12, .38, .66),
  item('child-play-table', 'guest', 'play-table', 3.15, 6.75, .75, .55, .48),
  item('child-stool', 'guest', 'stool', 3.2, 7.38, .34, .34, .28),
  item('guest-wardrobe', 'guest', 'wardrobe', 4.36, 6.15, 1.8, .55, 2.3, -Math.PI / 2),
  item('storage-west-shelves', 'flex', 'storage-shelves', 3.28, 11.65, 2.40, .45, 1.90, Math.PI / 2),
  item('storage-north-cabinet', 'flex', 'storage-cabinet', 4.16, 10.08, 1.80, .40, 1.90),
  item('storage-low-unit', 'flex', 'storage-cabinet', 4.15, 12.65, 1.25, .45, .68, Math.PI),
  item('storage-east-shelves', 'flex', 'storage-shelves', 6.30, 11.65, 1.45, .40, 1.85, -Math.PI / 2),
  item('hall-console', 'hall', 'gallery-shelf', 5.02, 6.62, 1.36, .28, .84, Math.PI / 2),
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
  {room:'bedroom', x:8.80,z:11.30,width:2.65,depth:2.5},
  {room:'bedroom', x:8.65,z:9.15,width:2.8,depth:.72,runner:true},
  {room:'guest', x:2.8,z:7.5,width:2.0,depth:1.35,play:true},
  {room:'hall', x:5.55,z:6.65,width:.70,depth:2.65,runner:true},
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
  {room:'bedroom',position:[7.90,1.18,7.67],intensity:1.6,cone:0,accent:true},
  {room:'hall',position:[5.12,1.16,7.01],intensity:1.2,cone:0,accent:true},
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
export const homeBakeBoxes = homeItems.map(o=>({id:o.id,...homeFootprint(o),y:.014,
  height:Math.max(o.height,({'gallery-shelf':2.35,'child-bed':1.8,'toy-cubbies':1.6,'nightstand':1})[o.kind]||0)}));
export const homeOccluders = homeItems.flatMap(o=>{
  const envelope={...homeFootprint(o),y:.1,height:o.height-.1,albedo:.3};
  if(o.kind==='plant') return [];
  if(['bed','child-bed','daybed','chair','bench','stool'].includes(o.kind)) {
    const c=Math.cos(o.rotation),s=Math.sin(o.rotation),localZ=-o.depth/2+.08;
    if(o.kind==='stool') return [envelope];
    return [{...envelope,height:Math.min(.42,o.height-.1)},
      {x:o.x+s*localZ,z:o.z+c*localZ,width:Math.abs(o.width*c)+Math.abs(.12*s),depth:Math.abs(o.width*s)+Math.abs(.12*c),y:.45,height:o.height-.45,albedo:.3}];
  }
  if(['desk','console','gallery-shelf','play-table','round-table'].includes(o.kind)) return [{...envelope,y:o.height-.06,height:.06}];
  return [envelope];
});
