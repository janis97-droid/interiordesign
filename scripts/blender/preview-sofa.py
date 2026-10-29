"""Add an editable studio preview to the saved asset; it is excluded from GLB exports."""
import bpy
import json
import sys
from pathlib import Path
from mathutils import Vector

root = Path(sys.argv[sys.argv.index('--') + 1])
blend = root / 'assets-src/living/west-sofa.blend'
bpy.ops.wm.open_mainfile(filepath=str(blend))
old = bpy.data.collections.get('Studio preview (not exported)')
if old:
    for obj in list(old.objects): bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(old)
studio = bpy.data.collections.new('Studio preview (not exported)')
bpy.context.scene.collection.children.link(studio)

def studio_object(obj):
    for collection in list(obj.users_collection): collection.objects.unlink(obj)
    studio.objects.link(obj)
    return obj

def look_at(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.camera_add(location=(3.1,-4.2,2.25))
camera=studio_object(bpy.context.object)
camera.name='Sofa review camera'
camera.data.lens=55
look_at(camera,(0,0,.44))
bpy.context.scene.camera=camera
for name,loc,power,size in [('Large softbox',(-2,-3,3.5),400,3),('Fill',(3,-1,2.5),170,2.5),('Rim',(0,2,3),240,2)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=studio_object(bpy.context.object)
    light.name=name
    light.data.energy=power
    light.data.shape='DISK'
    light.data.size=size
    look_at(light,(0,0,.4))
bpy.ops.mesh.primitive_plane_add(size=200)
floor=studio_object(bpy.context.object)
floor.name='Studio floor (not house geometry)'
floor.location.z=-.003
mat=bpy.data.materials.new('Studio warm grey')
mat.diffuse_color=(.2,.19,.17,1)
floor.data.materials.append(mat)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.world.color=(.2,.2,.2)
scene.render.resolution_x=1440
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(root/'docs/west-sofa-blender.png')
scene.view_settings.view_transform='AgX'
gpu=[]
scene.cycles.device='CPU'
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX'
    prefs.get_devices()
    for d in prefs.devices:
        d.use=d.type=='OPTIX'
        if d.use: gpu.append(d.name)
    if gpu: scene.cycles.device='GPU'
except Exception as exc:
    print('Using CPU rendering:',exc)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.get('asset_id')=='west-sofa': obj.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.render.render(write_still=True)
print('SOFA_PREVIEW '+json.dumps({'gpu':gpu,'image':scene.render.filepath}))
