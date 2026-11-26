"""Fixed trusted renderer. JSON was validated before entering the sandbox.
CPU only; fixed primitives and materials; no code, asset URL or user blend import.
"""
import bpy
import json
import math
import sys
from mathutils import Vector

with open(sys.argv[sys.argv.index('--')+1], encoding='utf-8') as handle:
    plan = json.load(handle)
assets = {a['id']: a for a in plan['assets']}
frame_offset = 0
for shot in plan['shots']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = plan['samples']
    scene.cycles.seed = 777
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.render.use_persistent_data = True
    scene.render.resolution_x = plan['width']
    scene.render.resolution_y = plan['height']
    scene.render.resolution_percentage = 100
    scene.render.fps = plan['fps']
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.world = bpy.data.worlds.new('studio')
    scene.world.color = (0.1, 0.1, 0.1)
    scene.view_settings.view_transform = 'AgX'
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-1.1))
    for item in shot['objects']:
        asset = assets[item['asset']]
        if asset['shape'] == 'cube': bpy.ops.mesh.primitive_cube_add()
        elif asset['shape'] == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16)
        else: bpy.ops.mesh.primitive_cylinder_add(vertices=32)
        obj = bpy.context.object
        obj.name = asset['id']
        obj.scale = asset['scale']
        mat = bpy.data.materials.new(asset['id'])
        mat.diffuse_color = (*asset['color'], 1)
        obj.data.materials.append(mat)
        for frame, pos, rotation in [(1,item['from'],item['rotationFrom']), (shot['frames'],item['to'],item['rotationTo'])]:
            obj.location = pos
            obj.rotation_euler = [math.radians(v) for v in rotation]
            obj.keyframe_insert(data_path='location', frame=frame)
            obj.keyframe_insert(data_path='rotation_euler', frame=frame)
    bpy.ops.object.light_add(type='AREA', location=(2,-4,6))
    bpy.context.object.data.energy = 700
    bpy.context.object.data.shape = 'DISK'
    bpy.context.object.data.size = 5
    bpy.ops.object.camera_add(location=shot['camera'])
    camera = bpy.context.object
    camera.rotation_euler = (Vector(shot['target']) - camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens = 40
    scene.camera = camera
    for frame in range(1,shot['frames']+1):
        scene.frame_set(frame)
        scene.render.filepath = f'frame-{frame_offset+frame:04d}.png'
        bpy.ops.render.render(write_still=True)
    frame_offset += shot['frames']
