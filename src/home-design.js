import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { homeItems, homeRugs, homeShowers, homeLights, homeBakeBoxes } from './home-layout.js';
import { daylightUV, floorBounds } from './daylight-layout.js';
import { buildToilet } from './toilet.js';
import { ensuitePlumbing } from './ensuite-layout.js';

// A small shared palette is carried through every room. Per-vertex finishes
// allow the complete collection to batch without a material per accessory.
const style = (color, roughness=.75, grain=0, glow=0) => ({color,roughness,grain,glow});
const walnut=style('#543827',.48,1), oak=style('#79573d',.58,1),
  tobacco=style('#775442',.88,2), olive=style('#62644b',.95,2),
  rust=style('#965b40',.91,2), linen=style('#d4c3a4',.92,2),
  ivory=style('#eee5d6',.84,2), brass=style('#ad8951',.3,4),
  ceramic=style('#efe8db',.22), stone=style('#c2aa8a',.62),
  ink=style('#292b28',.65), leaf=style('#526448',.83),
  glow=style('#fff1d7',.7,0,1), mirror=style('#d3d6cc',.08,4);
const sage=style('#9baea0',.9,2), ochre=style('#bf9657',.88,2),
  blue=style('#769397',.86,2), basket=style('#aa9271',.96,2);

export function buildHomeDesign(parent, ceiling, lit) {
  const group=new THREE.Group(); group.name='Warm whole-house furnishings'; parent.add(group);
  const material=lit(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,emissive:'#ffce87'}));
  const nightUniform={value:0};
  material.onBeforeCompile=shader=>{
    shader.uniforms.uHomeNight=nightUniform;
    const varying='varying vec3 vHomeFinish; varying vec3 vHomePoint; varying vec2 vHomeX; varying vec2 vHomeZ; varying vec3 vHomeWeights;\n';
    shader.vertexShader='attribute vec3 homeFinish; attribute vec3 homePoint; attribute vec2 homeX; attribute vec2 homeZ; attribute vec3 homeWeights;\n'+varying+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHomeFinish=homeFinish; vHomePoint=homePoint; vHomeX=homeX; vHomeZ=homeZ; vHomeWeights=homeWeights;');
    shader.fragmentShader='uniform float uHomeNight;\n'+varying+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float wood=sin(vHomePoint.x*135.0 + sin(vHomePoint.y*5.0+vHomePoint.z*7.0)*2.2);
      float weave=sin(vHomePoint.x*410.0)*sin((vHomePoint.y+vHomePoint.z)*410.0);
      float pattern=abs(vHomeFinish.y-1.0)<.1 ? wood*.065 : abs(vHomeFinish.y-2.0)<.1 ? weave*.025 : 0.0;
      diffuseColor.rgb *= 1.0+pattern;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=vHomeFinish.x;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=vHomeFinish.y>3.5 ? .85 : 0.0;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vHomeFinish.z*uHomeNight;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',THREE.ShaderChunk.lights_fragment_maps.replace('texture2D( lightMap, vLightMapUv )','(texture2D(lightMap,vLightMapUv)*vHomeWeights.y+texture2D(lightMap,vHomeX)*vHomeWeights.x+texture2D(lightMap,vHomeZ)*vHomeWeights.z)'));
  };
  material.customProgramCacheKey=()=> 'home-warm-finishes-v1';
  function add(g,geometry,finish,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material); mesh.position.set(x,y,z);
    mesh.castShadow=mesh.receiveShadow=true; g.add(mesh);
    const count=geometry.attributes.position.count,col=new THREE.Color(finish.color),colors=[],finishes=[];
    for(let i=0;i<count;i++){colors.push(col.r,col.g,col.b);finishes.push(finish.roughness,finish.grain,finish.glow);}
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('homeFinish',new THREE.Float32BufferAttribute(finishes,3));
    return mesh;
  }
  const box=(g,w,h,d,x,y,z,m,r=.014)=>add(g,r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const cyl=(g,r,h,x,y,z,m,top=r)=>add(g,new THREE.CylinderGeometry(top,r,h,24),m,x,y,z);
  const ball=(g,x,y,z,sx,sy,sz,m)=>{const a=add(g,new THREE.SphereGeometry(1,16,10),m,x,y,z);a.scale.set(sx,sy,sz);return a;};
  function rod(g,a,b,r,m){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),v=bb.clone().sub(aa);const o=add(g,new THREE.CylinderGeometry(r,r,v.length(),8),m,...aa.add(bb).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function legs(g,w,d,h){for(const x of [-1,1])for(const z of [-1,1])box(g,.045,h,.045,x*(w/2-.065),h/2,z*(d/2-.065),walnut,.006);}
  function books(g,x,y,z,count=5){for(let i=0;i<count;i++){const b=box(g,.035,.18+(i%3)*.026,.12,x+i*.045,y+.1,z,[rust,olive,linen,ink][i%4],.002);b.rotation.z=i===count-1?-.12:0;}}
  function vase(g,x,y,z,small=false){const s=small?.6:1;cyl(g,.085*s,.2*s,x,y+.1*s,z,ceramic,.045*s);for(let i=0;i<3;i++){const end=[x+Math.sin(i*2)*.11*s,y+.52*s,z+Math.cos(i*2)*.09*s];rod(g,[x,y+.17*s,z],end,.004,leaf);for(let k=0;k<3;k++)ball(g,end[0]-.025*k,end[1]-.07*k,end[2],.065*s,.014*s,.026*s,leaf);}}
  function lamp(g,x,y,z){cyl(g,.09,.025,x,y+.012,z,brass);cyl(g,.035,.26,x,y+.15,z,walnut);cyl(g,.135,.19,x,y+.34,z,glow,.10);}
  function art(g,w,h,x,y,z){
    box(g,w,h,.035,x,y,z,walnut,.006);box(g,w-.055,h-.055,.012,x,y,z+.023,linen,.002);
    const sun=add(g,new THREE.CircleGeometry(w*.17,32),rust,x-w*.17,y+h*.12,z+.032);
    box(g,w*.32,h*.42,.009,x+w*.13,y-h*.12,z+.034,olive,.035);
    box(g,w*.7,.014,.009,x,y-h*.31,z+.04,oak,.003);
  }
  // Original layered landscape illustrations, inspired by the reference's
  // varied gallery frames rather than reproducing its photographs/paintings.
  function landscape(g,w,h,x,y,z,seed=0){
    const frame=new THREE.Group();frame.position.set(x,y,z);g.add(frame);
    box(frame,w,h,.035,0,0,0,walnut,.006);
    box(frame,w-.025,h-.025,.014,0,0,.023,brass,.003);
    box(frame,w-.045,h-.045,.012,0,0,.034,linen,.002);
    const iw=w-.105,ih=h-.10;
    box(frame,iw,ih,.006,0,0,.043,style(seed%2?'#c3bb9d':'#a6b0a5'),.001);
    const disc=add(frame,new THREE.CircleGeometry(iw*.11,24),ochre,-iw*.22,ih*.23,.05);
    for(let k=0;k<3;k++){
      const shape=new THREE.Shape();shape.moveTo(-iw/2,-ih/2);
      for(let j=0;j<=10;j++)shape.lineTo((j/10-.5)*iw,Math.sin(j*.55+k+seed)*ih*.10+ih*(.08-k*.18));
      shape.lineTo(iw/2,-ih/2);shape.closePath();
      add(frame,new THREE.ShapeGeometry(shape),[sage,olive,style('#455344')][k],0,0,.052+k*.004);
    }
    const tx=iw*(seed%2?.25:-.18);
    rod(frame,[tx,-ih*.35,.07],[tx,ih*.18,.07],.004,walnut);
    for(let k=0;k<5;k++)ball(frame,tx+Math.sin(k*2)*iw*.10,ih*(.06+k*.04),.073,iw*.12,ih*.07,.003,leaf);
  }
  function gallery(g,o){const w=o.width,d=o.depth,h=o.height;
    box(g,w,.045,d,0,h,0,walnut,.008);
    for(const side of [-1,1]){box(g,.035,.20,.035,side*w*.34,h-.11,-d/2+.025,brass,.003);rod(g,[side*w*.34,h-.19,-d/2+.025],[side*w*.34,h-.025,d*.3],.009,brass);}
    lamp(g,-w*.29,h+.025,0);
    vase(g,w*.34,h+.025,0,true);books(g,w*.08,h+.025,0,3);
    for(let i=0;i<5;i++){const x=w*.34+Math.sin(i*1.6)*.055,y=h-.06-i*.055;rod(g,[w*.34,h+.16,0],[x,y,d*.39],.003,leaf);ball(g,x,y,d*.39,.035,.023,.012,leaf);}
    for(const [i,a] of [[-.34,1.60,.24,.46],[0,1.85,.25,.40],[.34,1.59,.24,.44],[-.35,2.15,.20,.31],[.34,2.13,.23,.38],[0,1.35,.21,.32]].entries())
      landscape(g,w*a[2],a[3],w*a[0],a[1],-d/2+.012,i);
    for(let i=0;i<2;i++){cyl(g,.029,.075,w*(.01-i*.06),h+.065,d*.2,ceramic);cyl(g,.018,.018,w*(.01-i*.06),h+.112,d*.2,glow);}
  }
  function storage(g,o){const w=o.width,h=o.height,d=o.depth;
    if(o.kind==='storage-cabinet'){
      box(g,w,h-.06,d,0,h/2+.03,0,walnut);
      for(const side of [-1,1]){box(g,w/2-.016,h-.10,.025,side*w/4,h/2+.035,d/2,oak,.004);box(g,.02,.12,.018,side*.045,h*.54,d/2+.022,brass,.003);}
      return;
    }
    for(const side of [-1,1])for(const z of [-1,1])box(g,.035,h,.035,side*(w/2-.025),h/2,z*(d/2-.025),ink,.003);
    const columns=Math.round(w/.65),rows=4;
    for(let r=0;r<=rows;r++)box(g,w,.032,d,0,.08+r*(h-.10)/rows,0,oak,.005);
    for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
      const bw=w/columns-.09,x=-w/2+(c+.5)*w/columns,y=.10+r*(h-.10)/rows,bh=(h-.10)/rows-.10;
      box(g,bw,bh,d-.07,x,y+bh/2,0,[basket,sage,linen][(r+c)%3],.014);
      box(g,bw+.012,.025,d-.05,x,y+bh,0,walnut,.004);
      box(g,.16,.065,.005,x,y+bh*.55,d/2-.031,ivory,.002);
      box(g,.075,.009,.007,x,y+bh*.55,d/2-.027,ink,.002);
    }
  }
  function toys(g,o){const w=o.width,h=o.height,d=o.depth;
    for(const side of [-1,1])box(g,.035,h,d,side*(w/2-.02),h/2,0,walnut,.004);
    box(g,w,h,.022,0,h/2,-d/2,walnut,.002);
    for(const y of [.045,h/2,h-.02])box(g,w,.035,d,0,y,0,oak,.005);
    box(g,.025,h,d,0,h/2,0,walnut,.004);
    for(const side of [-1,1]){box(g,w*.40,h*.34,d*.86,side*w*.25,h*.23,0,side<0?sage:ochre,.025);box(g,.085,.025,.01,side*w*.25,h*.28,d*.44,walnut,.005);}
    books(g,-w*.39,h*.52,0,5);
    ball(g,w*.23,h*.70,0,.08,.09,.07,ochre);for(const side of [-1,1])ball(g,w*.23+side*.055,h*.79,0,.03,.03,.025,ochre);
    landscape(g,.48,.40,0,1.35,-d/2+.012,3);
  }
  function cloth(g,w,d,y,z,finish){
    const vertices=[],uv=[],indices=[],nx=36,nz=20;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=(i/nx-.5)*w,v=(j/nz-.5)*d;
      const edge=Math.max(0,(Math.abs(x)/w-.43)/.07);
      const fold=.006*Math.sin(x*27+v*6)*Math.sin(v*13+1);
      vertices.push(x,y+fold-.095*edge*edge,z+v);uv.push(i/nx,j/nz);
      if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+1,c=a+nx+1;indices.push(a,c,b,b,c,c+1);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();add(g,geometry,finish);
  }
  function bed(g,o){const w=o.width,d=o.depth,child=o.kind==='child-bed';
    legs(g,w-.08,d-.08,.2);box(g,w,.25,d,0,.28,0,walnut,.035);
    box(g,w-.04,o.height-.18,.12,0,(o.height+.18)/2,-d/2+.065,tobacco,.04);
    for(let i=0;i<7;i++)box(g,(w-.1)/7-.012,o.height-.29,.028,-(w-.1)/2+(i+.5)*(w-.1)/7,(o.height+.27)/2,-d/2+.14,tobacco,.012);
    box(g,w-.07,.2,d-.17,0,.48,.025,ivory,.065);
    box(g,w-.07,.075,d*.65,0,.61,d*.15,linen,.035);
    cloth(g,w-.015,d*.65,.653,d*.15,linen);
    cloth(g,w-.005,.57,.67,d*.32,child?blue:olive);
    for(const side of child?[0]:[-1,1]){
      const p=box(g,w*.39,.15,.42,side*w*.23,.66,-d*.3,ivory,.068);p.rotation.y=side*.05;
      const q=box(g,.37,.11,.29,side*w*.23,.76,-d*.22,side<0?olive:rust,.05);q.rotation.y=-side*.1;
    }
    if(child){
      landscape(g,.54,.60,0,1.43,-d/2+.015,2);
      for(let i=0;i<5;i++)for(let j=0;j<2;j++){
        const dot=add(g,new THREE.CircleGeometry(.026,5),ochre,(i-2)*.15,.676,d*.32+(j-.5)*.22);dot.rotation.x=-Math.PI/2;
      }
    }
  }
  function cabinet(g,o){const w=o.width,h=o.height,d=o.depth;
    box(g,w,.08,d,0,.06,0,ink);box(g,w,h-.12,d,0,h/2+.035,0,walnut);
    const doors=o.kind==='wardrobe'?Math.round(w/.55):2;
    for(let i=0;i<doors;i++){
      const x=-w/2+(i+.5)*w/doors;
      box(g,w/doors-.016,h-.18,.025,x,h/2+.04,d/2+.002,oak,.004);
      for(let j=0;j<5;j++)box(g,.009,h-.24,.008,x+(j-2)*(w/doors)/6,h/2+.04,d/2+.018,walnut,.002);
      box(g,.012,.18,.024,x+w/doors*.33,h*.55,d/2+.03,brass,.003);
    }
    if(o.kind==='dresser'){vase(g,-w*.3,h+.01,0);books(g,w*.1,h,.05,5);art(g,.7,.8,0,1.55,-d/2+.015);}
  }
  function chair(g,o){const w=o.width,d=o.depth;
    legs(g,w,d,.42);box(g,w,.11,d,0,.43,0,oak,.028);box(g,w-.07,.10,d-.07,0,.51,0,olive,.035);
    box(g,w,o.height-.44,.09,0,(o.height+.44)/2,-d/2+.05,walnut,.035);
    box(g,w-.07,.25,.09,0,.67,-d/2+.11,tobacco,.03);
    for(const side of [-1,1]){box(g,.035,.3,.035,side*(w/2-.02),.52,d*.3,walnut);box(g,.055,.045,d*.85,side*(w/2-.02),.67,0,oak);}
  }
  function vanity(g,o){const w=o.width,d=o.depth,h=o.height;
    box(g,w,h-.4,d,0,(h+.32)/2,0,walnut,.025);
    for(let i=0;i<2;i++){box(g,w-.035,.16,.022,0,h-.15-i*.19,d/2,oak,.006);box(g,w*.6,.009,.018,0,h-.08-i*.19,d/2+.017,brass,.002);}
    // A real open recess: counter strips surround the basin; no solid slab through it.
    const bw=Math.min(w*.7,.53),bd=d*.62;
    box(g,(w-bw)/2,.045,d,-(w+bw)/4,h,0,stone);box(g,(w-bw)/2,.045,d,(w+bw)/4,h,0,stone);
    for(const sign of [-1,1])box(g,bw,.045,(d-bd)/2,0,h,sign*(d+bd)/4,stone);
    box(g,bw,.04,bd,0,h-.09,0,ceramic,.02);
    for(const sign of [-1,1]){box(g,.022,.1,bd,sign*(bw/2-.01),h-.04,0,ceramic,.005);box(g,bw,.1,.022,0,h-.04,sign*(bd/2-.01),ceramic,.005);}
    cyl(g,.013,.21,0,h+.13,-d*.37,brass);rod(g,[0,h+.23,-d*.37],[0,h+.23,-.025],.013,brass);
    cyl(g,.018,.006,0,h-.064,0,ink);
    const mw=w*.83,mh=o.room==='wc'?.64:.85;
    box(g,mw,mh,.025,0,1.52,-d/2-.005,brass,.06);box(g,mw-.035,mh-.035,.012,0,1.52,-d/2+.015,mirror,.05);
    box(g,mw*.8,.018,.04,0,1.52+mh/2+.065,-d/2+.04,glow,.007);
    if(w>.7){vase(g,w*.36,h+.025,0,true);box(g,.17,.04,.18,-w*.36,h+.045,0,linen);}
  }
  function furnish(g,o){const w=o.width,d=o.depth,h=o.height;
    if(o.kind==='bed'||o.kind==='child-bed')bed(g,o);
    else if(o.kind==='gallery-shelf')gallery(g,o);
    else if(o.kind.startsWith('storage-'))storage(g,o);
    else if(o.kind==='toy-cubbies')toys(g,o);
    else if(o.kind==='play-table'){
      legs(g,w,d,h-.035);box(g,w,.045,d,0,h-.022,0,oak,.028);
      box(g,.28,.006,.20,0,h+.003,0,ivory,.002);
      for(let i=0;i<3;i++)box(g,.008,.009,.12,-.09+i*.025,h+.012,.02,[rust,blue,ochre][i],.002);
      for(let i=0;i<3;i++)box(g,.06,.05,.06,w*.30,h+.025+i*.05,-d*.2,[sage,ochre,rust][i],.006);
    }
    else if(o.kind==='stool'){legs(g,w,d,h-.06);cyl(g,w*.49,.06,0,h-.03,0,sage);}
    else if(['wardrobe','dresser'].includes(o.kind))cabinet(g,o);
    else if(o.kind==='nightstand'){legs(g,w,d,.12);box(g,w,h-.12,d,0,(h+.12)/2,0,walnut);box(g,w-.03,.16,.02,0,h-.1,d/2,oak);box(g,.13,.01,.02,0,h-.06,d/2+.02,brass);lamp(g,0,h,0);}
    else if(o.kind==='chair')chair(g,o);
    else if(o.kind==='vanity')vanity(g,o);
    else if(o.kind==='bench'){legs(g,w,d,.38);box(g,w,.13,d,0,.4,0,tobacco,.04);}
    else if(o.kind==='desk'||o.kind==='console'){
      legs(g,w,d,h-.05);box(g,w,.06,d,0,h-.03,0,oak,.012);box(g,w*.45,.16,d-.04,w*.24,h-.14,0,walnut);
      if(o.kind==='desk'){box(g,.48,.29,.025,0,h+.27,-d*.2,ink);box(g,.435,.245,.006,0,h+.27,-d*.2+.016,style('#47554d'));cyl(g,.012,.13,0,h+.09,-d*.2,brass);box(g,.24,.012,.16,0,h+.009,-d*.2,ink);box(g,.34,.012,.11,0,h+.01,d*.22,ink);books(g,-w*.39,h,-.04,3);lamp(g,w*.36,h,0);art(g,.66,.7,0,1.65,-d/2+.01);}
      else{vase(g,-w*.3,h,0);books(g,w*.16,h,0,4);art(g,.72,.85,0,1.65,-d/2+.01);}
    }
    else if(o.kind==='bookcase'){
      for(const x of [-1,1])box(g,.045,h,d,x*(w/2-.025),h/2,0,walnut);
      box(g,w,h,.022,0,h/2,-d/2,walnut);
      for(let i=0;i<5;i++){const y=.12+i*(h-.14)/4;box(g,w,.035,d,0,y,0,oak);if(i<4){books(g,-w*.39,y+.02,0,5+i%2);if(i%2===0)vase(g,w*.25,y+.03,0,true);else box(g,.35,.18,d*.75,w*.24,y+.11,0,linen);}}
    }
    else if(o.kind==='daybed'){
      legs(g,w,d,.2);box(g,w,.23,d,0,.28,0,walnut);box(g,w,.43,.12,0,.64,-d/2+.06,tobacco,.04);box(g,w-.1,.16,d-.12,0,.47,.02,tobacco,.05);
      for(const side of [-1,1]){box(g,.12,.32,d,side*(w/2-.06),.55,0,oak,.025);box(g,.38,.33,.14,side*w*.29,.68,-d*.16,side<0?olive:linen,.055);}
      box(g,.64,.018,d*.7,.25,.56,.04,rust,.008);
    }
    else if(o.kind==='round-table'){cyl(g,w*.44,.05,0,h-.025,0,oak);cyl(g,.07,h-.05,0,(h-.05)/2,0,walnut);cyl(g,.22,.025,0,.024,0,walnut);vase(g,0,h,0,true);}
    else if(o.kind==='plant'){
      cyl(g,w*.46,.32,0,.17,0,rust,w*.5);cyl(g,w*.42,.012,0,.333,0,ink);
      for(let i=0;i<8;i++){const a=i*2.4,y=.45+(h-.5)*(i%4)/3,xx=Math.sin(a)*w*.3,zz=Math.cos(a)*d*.3;rod(g,[0,.3,0],[xx,y,zz],.006,walnut);const b=ball(g,xx,y,zz,w*.22,.025,d*.15,leaf);b.rotation.z=a;}
    }
    else if(o.kind==='toilet'){
      const t=new THREE.Group();t.position.z=-d/2;g.add(t);buildToilet(t,add,{ceramic,seat:ceramic,seal:ink,chrome:brass},{width:w,projection:d,height:h});box(g,.24,.15,.015,0,1.02,-d/2,brass,.01);
    }
  }
  function applyUV(root,envelope){
    root.updateWorldMatrix(true,true);
    root.traverse(mesh=>{
      if(!mesh.isMesh||mesh.material!==material)return;
      const geo=mesh.geometry,pos=geo.attributes.position,norm=geo.attributes.normal;
      const uv=[],ux=[],uz=[],weights=[],points=[];
      const pt=new THREE.Vector3(),n=new THREE.Vector3(),normalMat=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      for(let i=0;i<pos.count;i++){
        pt.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);n.fromBufferAttribute(norm,i).applyMatrix3(normalMat).normalize();points.push(pt.x,pt.y,pt.z);
        if(envelope){const b=envelope,x=(pt.x-b.x+b.width/2)/b.width,z=(pt.z-b.z+b.depth/2)/b.depth,y=1-(pt.y-b.y)/b.height;
          uv.push(...daylightUV(`home-${b.id}-top`,x,z));ux.push(...daylightUV(`home-${b.id}-${n.x<0?'west':'east'}`,z,y));uz.push(...daylightUV(`home-${b.id}-${n.z<0?'north':'south'}`,x,y));
          const wx=Math.abs(n.x)**4,wy=Math.abs(n.y)**4,wz=Math.abs(n.z)**4,sum=wx+wy+wz;weights.push(wx/sum,wy/sum,wz/sum);
        }else{const f=daylightUV('floor',(pt.x-floorBounds.minX)/(floorBounds.maxX-floorBounds.minX),(pt.z-floorBounds.minZ)/(floorBounds.maxZ-floorBounds.minZ));uv.push(...f);ux.push(...f);uz.push(...f);weights.push(0,1,0);}
      }
      for(const [name,data,size] of [['uv1',uv,2],['homeX',ux,2],['homeZ',uz,2],['homeWeights',weights,3],['homePoint',points,3]])geo.setAttribute(name,new THREE.Float32BufferAttribute(data,size));
    });
  }
  const bounds=[];
  for(const o of homeItems){const g=new THREE.Group();g.name=o.id;g.position.set(o.x,.014,o.z);g.rotation.y=o.rotation;group.add(g);furnish(g,o);applyUV(g,homeBakeBoxes.find(b=>b.id===o.id));const b=new THREE.Box3().setFromObject(g);bounds.push({id:o.id,room:o.room,kind:o.kind,min:b.min.toArray(),max:b.max.toArray()});}
  for(const r of homeRugs){const g=new THREE.Group();g.position.set(r.x,0,r.z);group.add(g);
    box(g,r.width,.009,r.depth,0,.016,0,linen,.002);
    box(g,r.width-.1,.003,r.depth-.1,0,.023,0,r.play?sage:r.runner?tobacco:olive,.001);
    box(g,r.width-.17,.003,r.depth-.17,0,.026,0,r.play?sage:linen,.001);
    if(r.runner){
      const horizontal=r.width>r.depth,length=horizontal?r.width:r.depth;
      for(let i=0;i<9;i++){
        const p=(i-4)*(length-.4)/9,medallion=add(g,new THREE.CircleGeometry(.10,4),i%2?olive:tobacco,horizontal?p:0,.029,horizontal?0:p);medallion.rotation.x=-Math.PI/2;
        const centre=add(g,new THREE.CircleGeometry(.035,16),linen,horizontal?p:0,.031,horizontal?0:p);centre.rotation.x=-Math.PI/2;
      }
    }else if(r.play){
      for(let i=0;i<5;i++){const patch=add(g,new THREE.CircleGeometry(.10+(i%2)*.035,32),[linen,ochre,blue][i%3],(i-2)*.32,.029,Math.sin(i*2)*.32);patch.rotation.x=-Math.PI/2;}
    }else for(let i=0;i<7;i++)box(g,.022,.002,r.depth-.23,(i-3)*(r.width-.25)/7,.029,0,tobacco,.001);
    applyUV(g);
  }
  const glass=new THREE.MeshStandardMaterial({color:'#c8ded5',transparent:true,opacity:.12,roughness:.1,metalness:.1,depthWrite:false,side:THREE.DoubleSide});
  for(const s of homeShowers){const g=new THREE.Group();g.name=s.id;g.position.set(s.x,0,s.z);group.add(g);
    // Existing bathroom floor remains visible, with a low threshold and drain.
    box(g,s.width,.012,.018,0,.022,-s.depth/2,brass,.002);
    box(g,.22,.006,.07,0,.025,s.depth*.28,ink,.002);
    const sd=s.screenDepth||s.depth;
    const screen=new THREE.Mesh(new THREE.BoxGeometry(.012,2.05,sd),glass);screen.position.set(s.width/2,1.04,0);g.add(screen);
    for(const z of [-sd/2,sd/2])box(g,.018,2.08,.018,s.width/2,1.04,z,brass,.002);
    box(g,.018,.018,sd,s.width/2,2.08,0,brass,.002);
    const fittings=new THREE.Group();g.add(fittings);
    if(s.room==='bath'){fittings.position.x=-s.width/2+.025;fittings.rotation.y=-Math.PI/2;}
    else fittings.position.z=s.depth/2-.05;
    rod(fittings,[0,.98,0],[0,2.12,0],.014,brass);rod(fittings,[0,2.12,0],[0,2.12,-.29],.014,brass);cyl(fittings,.13,.018,0,2.1,-.27,brass);box(fittings,.2,.05,.06,0,1.05,0,brass);applyUV(g);
  }
  // Curtains frame the openings; they don't cover the glazing or slider.
  for(const [x,z,w,rot] of [[2.7,.65,.36,0],[6.62,.65,.38,0],[7.43,12.85,.30,Math.PI],[9.98,12.85,.30,Math.PI],[1.04,5.5,.27,Math.PI/2],[1.04,7.58,.27,Math.PI/2]]){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;group.add(g);
    for(let i=0;i<8;i++)box(g,w/8+.008,2.43,.055,(i-3.5)*w/8,1.24,Math.sin(i*Math.PI/2)*.025,linen,.018);
    box(g,w+.08,.025,.025,0,2.49,0,brass);applyUV(g);
  }
  for(const l of homeLights.filter(l=>!l.accent)){const g=new THREE.Group();g.position.set(...l.position);ceiling.add(g);
    const pendant=l.room==='living';cyl(g,.09,.025,0,2.77-l.position[1],0,brass);
    if(pendant){cyl(g,.008,.36,0,.25,0,ink);cyl(g,.34,.19,0,.01,0,linen,.27);cyl(g,.29,.012,0,-.09,0,glow);for(let i=0;i<24;i++){const a=i*Math.PI/12;rod(g,[Math.cos(a)*.28,.1,Math.sin(a)*.28],[Math.cos(a)*.34,-.08,Math.sin(a)*.34],.006,brass);}}
    else if(l.room==='bedroom'){cyl(g,.23,.045,0,.15,0,brass);ball(g,0,.065,0,.20,.10,.20,glow);cyl(g,.035,.02,0,-.035,0,brass);}
    else{cyl(g,.23,.055,0,.07,0,brass);cyl(g,.21,.025,0,.035,0,glow);}
    applyUV(g);
  }
  const details=new THREE.Group();group.add(details);
  // Finish the existing service rough-ins with removable covers, keeping their
  // approved positions and the laundry partition intact.
  box(details,.014,.43,1.03,.146,.35,10.846,style('#3c3d36',.4),.003);
  for(const z of [10.43,11.26])box(details,.018,.03,.025,.16,.36,z,brass,.002);
  const plate=new THREE.Group();plate.position.set(ensuitePlumbing.toilet[0]-.028,0,ensuitePlumbing.toilet[1]);plate.rotation.y=-Math.PI/2;details.add(plate);
  box(plate,.2,.25,.016,0,.89,0,brass,.009);
  for(const x of [-.046,.046])box(plate,.065,.09,.012,x,.91,.012,stone,.004);
  // A towel rail and folded towels beside each vanity.
  for(const o of homeItems.filter(o=>o.kind==='vanity'&&o.room!=='wc')){
    const g=new THREE.Group();g.position.set(o.x,.0,o.z);group.add(g);
    const x=o.width/2-.14;
    rod(g,[x-.12,.55,o.depth/2+.04],[x+.12,.55,o.depth/2+.04],.009,brass);
    box(g,.19,.26,.022,x,.41,o.depth/2+.045,linen,.006);applyUV(g,homeBakeBoxes.find(b=>b.id===o.id));
  }
  applyUV(details);
  return {group,material,bounds,setNight(night){nightUniform.value=night?1.8:0;}};
}
