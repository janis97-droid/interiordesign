"""Original cream/walnut sofa. Metres, origin at floor centre; front is Blender -Y.

Build once with npm run asset:sofa. Edit the .blend freely, then use
npm run asset:sofa:export to validate and export those saved edits.
No third-party models or textures are required.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector

args = argparse.ArgumentParser()
args.add_argument('--root', required=True)
args.add_argument('--layout', required=True)
args.add_argument('--export-only', action='store_true')
opts = args.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(opts.root)
layout = json.loads(Path(opts.layout).read_text())
source = root / 'assets-src/living'
dest = root / 'src/assets/models'
source.mkdir(parents=True, exist_ok=True)
dest.mkdir(parents=True, exist_ok=True)
blend = source / 'west-sofa.blend'
texture_dir = source / 'textures'
texture_dir.mkdir(exist_ok=True)
W, D, H = layout['width'], layout['depth'], layout['height']


def image(name, rgb, noncolor=False):
    h, w = rgb.shape[:2]
    im = bpy.data.images.new(name, width=w, height=h, alpha=True)
    im.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1))], axis=2)
    im.pixels.foreach_set(rgba.astype(np.float32).ravel())
    im.filepath_raw = str(texture_dir / (name + '.png'))
    im.file_format = 'PNG'
    im.save()
    return im


def textures():
    n = 512
    y, x = np.mgrid[0:n, 0:n] / n
    rng = np.random.default_rng(7421)
    noise = rng.random((n, n)) - .5
    # 64 yarns per 25 cm tile, with finer fibres and gentle irregularity.
    yarnx = np.sin(2 * np.pi * (x * 64 + .025 * np.sin(y * 16 * np.pi)))
    yarny = np.sin(2 * np.pi * (y * 64 + .025 * np.sin(x * 12 * np.pi)))
    weave = .5 * yarnx + .5 * yarny
    variation = weave * .022 + noise * .025
    cream = image('cream-linen-base', np.array([.79, .75, .66])[None, None, :] + variation[:, :, None])
    # Tangent-space normal in OpenGL convention, small enough to read as yarn.
    dx = .18 * np.cos(2 * np.pi * x * 64)
    dy = .18 * np.cos(2 * np.pi * y * 64)
    normals = np.stack([-dx, -dy, np.ones_like(x)], axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    normal = image('linen-normal', normals * .5 + .5, True)
    rough = image('linen-roughness', np.repeat(np.clip(.83 + .06 * weave + .035 * noise, 0, 1)[..., None], 3, axis=2), True)
    grain = np.sin(2 * np.pi * (y * 9 + .12 * np.sin(x * 9)))
    grain += .3 * np.sin(2 * np.pi * (y * 43 + .18 * np.sin(x * 11)))
    wood = image('walnut-base', np.array([.105, .040, .017])[None, None, :] + grain[..., None] * np.array([.012, .006, .003]))
    patterns = []
    for ivory in (False, True):
        base = np.array([.58, .49, .32] if ivory else [.27, .050, .033])
        rgb = np.broadcast_to(base, (n, n, 3)).copy()
        # Original small eight-petal rosettes, staggered like the existing textile.
        for row in range(6):
            for col in range(8):
                cx = (col + .5 + .5 * (row % 2)) / 8
                cy = (row + .5) / 6
                qx, qy = ((x - cx + .5) % 1) - .5, ((y - cy + .5) % 1) - .5
                qx, qy = qx * 2, qy * 1.5
                radius = np.sqrt(qx*qx + qy*qy)
                angle = np.arctan2(qy, qx)
                petals = radius < (.026 + .012 * np.cos(8 * angle))
                rgb[petals] = [.47, .19, .105] if ivory else [.79, .67, .40]
                inner = radius < (.012 + .004 * np.cos(8 * angle))
                rgb[inner] = [.85, .76, .56]
                rgb[radius < .005] = [.34, .30, .16]
                leaf = ((qx-.026)/.009)**2 + ((qy-.038)/.017)**2 < 1
                rgb[leaf] = [.25, .29, .15]
        rgb += (weave * .018 + noise * .035)[..., None]
        patterns.append(image('ivory-floral' if ivory else 'rust-floral', rgb))
    return cream, normal, rough, wood, patterns


def material(name, color, roughness=.7, texture=None, normal=None, roughmap=None, sheen=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Sheen Weight'].default_value = sheen
    shader.inputs['Sheen Roughness'].default_value = .7
    for im, socket in [(texture, 'Base Color'), (roughmap, 'Roughness')]:
        if im:
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex.image = im
            mat.node_tree.links.new(tex.outputs['Color'], shader.inputs[socket])
    if normal:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = normal
        bump = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        bump.inputs['Strength'].default_value = .65
        mat.node_tree.links.new(tex.outputs['Color'], bump.inputs['Color'])
        mat.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat


def soft_box(name, dims, loc, radius, mat, n=14, softness=0, rotation=(0,0,0), uv_scale=.25, puff=False):
    """Rounded subdivided panels with continuous analytic cloth deformation."""
    half = np.array(dims) / 2
    inner = half - radius
    verts, faces, uvs = [], [], []
    for axis in range(3):
        a, b = [i for i in range(3) if i != axis]
        for sign in (-1, 1):
            start = len(verts)
            for j in range(n + 1):
                for i in range(n + 1):
                    q = np.zeros(3)
                    q[axis] = sign * half[axis]
                    q[a] = (i / n * 2 - 1) * half[a]
                    q[b] = (j / n * 2 - 1) * half[b]
                    anchor = np.clip(q, -inner, inner)
                    delta = q - anchor
                    v = anchor + radius * delta / np.linalg.norm(delta)
                    if puff:
                        unit = q / half
                        v = half * unit / (np.sum(np.abs(unit)**4)**.25)
                    if softness:
                        # Inward compression and low-amplitude folds fade at edges.
                        u, t = q[a] / half[a], q[b] / half[b]
                        mask = max(0, 1-u*u) * max(0, 1-t*t)
                        sag = .006 * mask * math.exp(-1.7*(u*u+t*t))
                        fold = .0022 * math.sin(23*u + 3*t) * math.exp(-((abs(t)-.72)/.22)**2) * mask
                        v[axis] -= sign * softness * (sag + fold)
                    verts.append(tuple(v))
                    # Metres per 25 cm repeat; pillows use one image per face.
                    uvs.append((q[a]/uv_scale + .5, q[b]/uv_scale + .5))
            for j in range(n):
                for i in range(n):
                    k = start + j*(n+1)+i
                    face = [k, k+1, k+n+2, k+n+1]
                    va,vb,vc = [Vector(verts[t]) for t in face[:3]]
                    if (vb-va).cross(vc-va)[axis] * sign < 0:
                        face.reverse()
                    faces.append(face)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='MaterialUV')
    for poly in mesh.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[mesh.loops[li].vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    # Weld face boundaries so corner normals remain continuous after glTF export.
    bm=bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    return obj


def seam(name, points, mat, radius=.0018):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def rounded_loop(w, h, r, plane, fixed, centre=(0,0)):
    points=[]
    for cx, cy, start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for k in range(9):
            a=math.radians(start+k*90/8)
            u=cx+r*math.cos(a)+centre[0]
            v=cy+r*math.sin(a)+centre[1]
            points.append((u,v,fixed) if plane=='xy' else (u,fixed,v))
    return points


def cushion_loop(w,h,plane,fixed,depth,centre=(0,0)):
    factor=(1-(abs(fixed)/(depth/2))**4)**.25
    points=[]
    for i in range(96):
        angle=2*math.pi*i/96
        c,s=math.cos(angle),math.sin(angle)
        u=w/2*math.copysign(abs(c)**.5,c)*factor+centre[0]
        v=h/2*math.copysign(abs(s)**.5,s)*factor+centre[1]
        points.append((u,v,fixed) if plane=='xy' else (u,fixed,v))
    return points


def build():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1
    cream,normal,rough,wood,patterns = textures()
    linen=material('Cream linen | 25 cm UV repeat', (1,1,1), texture=cream, normal=normal, roughmap=rough, sheen=.32)
    welt=material('Linen piping', (.59,.54,.44), .88, sheen=.22)
    walnut=material('Oiled walnut', (1,1,1), .46, texture=wood)
    red=material('Rust floral woven cushion', (1,1,1), .88, texture=patterns[0], normal=normal, sheen=.24)
    ivory=material('Ivory floral woven cushion', (1,1,1), .88, texture=patterns[1], normal=normal, sheen=.24)
    dark=material('Recessed upholstery joins', (.22,.17,.11), .95)
    # The outer arms establish the exact approved width and depth. Back reaches H.
    soft_box('Walnut plinth', (W-.06,D-.05,.085), (0,0,.155), .012, walnut, n=5)
    for x in (-W/2+.13,W/2-.13):
        for y in (-D/2+.12,D/2-.12):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=(x,y,.075))
            foot=bpy.context.object
            foot.name='Turned walnut foot'
            foot.scale=(.038,.038,.075)
            foot.data.materials.append(walnut)
            for face in foot.data.polygons: face.use_smooth=True
    soft_box('Upholstered base', (W-.08,D-.08,.20), (0,0,.29), .045, linen, n=14, softness=.4)
    soft_box('Tailored back shell', (W-.13,.205,.49), (0,D/2-.11,H-.245), .047, linen, n=18, softness=.6)
    for side in (-1,1):
        soft_box('Soft arm left' if side<0 else 'Soft arm right', (.20,D,.38), (side*(W/2-.10),0,.49), .055, linen, n=18, softness=.25)
        # Along the top of each arm, slightly inset from the outer envelope.
        seam('Arm top welt', rounded_loop(.188,D-.012,.049,'xy',.65,(side*(W/2-.10),0)), welt, .0015)
    seat_w=(W-.43)/2
    for i, x in enumerate((-seat_w/2-.005,seat_w/2+.005)):
        seat=soft_box('Seat cushion %d'%i, (seat_w-.012,.67,.16), (x,-.075,.445), .05, linen, n=22, softness=1.25,puff=True)
        seat_seam=seam('Seat cushion welt %d'%i, cushion_loop(seat_w-.012,.67,'xy',.038,.16), welt)
        seat_seam.parent=seat
        back=soft_box('Back cushion %d'%i, (seat_w-.012,.18,.395), (x,.267,.687), .055, linen, n=22, softness=1.2, rotation=(-.065,0,0),puff=True)
        points=cushion_loop(seat_w-.012,.395,'xz',-.065,.18)
        piping=seam('Back cushion welt %d'%i,points,welt)
        piping.parent=back
    # Fine division between the back panels, visible from the arrival viewpoint.
    seam('Back shell tailored welt',rounded_loop(W-.18,.42,.05,'xz',D/2-.005,(0,.65)),welt,.0015)
    for i,(x,z,angle,mat) in enumerate([(-.70,.665,-.12,red),(-.10,.655,.08,ivory),(.70,.66,.12,red)]):
        pillow=soft_box('Floral scatter cushion %d'%i,(.415,.16,.415),(x,.075,z),.075,mat,n=20,softness=.75,rotation=(-.13,angle,0),uv_scale=.415,puff=True)
        piping=seam('Scatter cushion seam %d'%i,cushion_loop(.415,.415,'xz',0,.16),welt,.0016)
        piping.parent=pillow
    for obj in bpy.context.scene.objects:
        obj['asset_id']='west-sofa'
    bpy.context.scene['asset_id']='west-sofa'
    bpy.context.scene['approved_layout']=json.dumps(layout)
    bpy.context.scene['notes']='Original modeled approximation; approved envelope and placement retained. Floor origin; Blender front -Y; glTF front +Z.'


def export():
    bpy.ops.object.select_all(action='DESELECT')
    objects=[o for o in bpy.context.scene.objects if o.type in {'MESH','CURVE'} and o.get('asset_id')=='west-sofa']
    if not objects: raise RuntimeError('No west-sofa objects found')
    depsgraph=bpy.context.evaluated_depsgraph_get()
    coordinates=[]
    triangles=0
    for o in objects:
        ev=o.evaluated_get(depsgraph)
        me=ev.to_mesh()
        coordinates.extend(o.matrix_world @ v.co for v in me.vertices)
        me.calc_loop_triangles()
        triangles+=len(me.loop_triangles)
        ev.to_mesh_clear()
        o.select_set(True)
    low=[min(p[i] for p in coordinates) for i in range(3)]
    high=[max(p[i] for p in coordinates) for i in range(3)]
    dims=[high[i]-low[i] for i in range(3)]
    for i,(expected, actual) in enumerate(zip([W,D,H],dims)):
        if abs(actual-expected) > .003:
            raise RuntimeError('Sofa envelope changed: dimension %d = %.5f, expected %.5f'%(i,actual,expected))
    if abs(low[2])>.001 or abs((high[0]+low[0])/2)>.001 or abs((high[1]+low[1])/2)>.001:
        raise RuntimeError('Sofa floor-centre origin moved')
    if triangles>90000: raise RuntimeError('Sofa exceeds 90k triangle budget')
    for im in bpy.data.images:
        if im.source=='FILE' or im.generated_width:
            if im.name!='Render Result': im.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(filepath=str(dest/'west-sofa.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_extras=True)
    report={'asset':'west-sofa','blender':bpy.app.version_string,'approvedLayout':layout,'blenderBounds':{'min':low,'max':high},'gltfDimensions':{'width':dims[0],'height':dims[2],'depth':dims[1]},'triangles':triangles,'glbBytes':(dest/'west-sofa.glb').stat().st_size,'license':'Original project asset and textures; no third-party dependencies','source':'assets-src/living/west-sofa.blend'}
    (dest/'west-sofa.json').write_text(json.dumps(report,indent=2)+'\n')
    print('SOFA_EXPORT '+json.dumps(report))


if opts.export_only:
    bpy.ops.wm.open_mainfile(filepath=str(blend))
else:
    build()
export()
