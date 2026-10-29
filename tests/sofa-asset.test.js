import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3, Box3 } from 'three';
import { livingSofas } from '../src/living-layout.js';

test('exported Blender sofa retains the approved floor-centred envelope and PBR maps', () => {
  const bytes = readFileSync(new URL('../src/assets/models/west-sofa.glb', import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const bounds = new Box3();
  let triangles = 0;
  function visit(index, parent) {
    const node = doc.nodes[index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation || [0,0,0]),
      new Quaternion().fromArray(node.rotation || [0,0,0,1]),
      new Vector3().fromArray(node.scale || [1,1,1]),
    );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) for (const primitive of doc.meshes[node.mesh].primitives) {
      const positions = doc.accessors[primitive.attributes.POSITION];
      bounds.union(new Box3(new Vector3().fromArray(positions.min), new Vector3().fromArray(positions.max)).applyMatrix4(world));
      triangles += (primitive.indices === undefined ? positions.count : doc.accessors[primitive.indices].count) / 3;
      assert.notEqual(primitive.attributes.NORMAL, undefined);
      assert.notEqual(primitive.attributes.TEXCOORD_0, undefined);
    }
    for (const child of node.children || []) visit(child, world);
  }
  for (const node of doc.scenes[doc.scene || 0].nodes) visit(node, new Matrix4());
  const size = bounds.getSize(new Vector3());
  const sofa = livingSofas.find(s => s.id === 'west-sofa');
  for (const [actual, expected] of [[size.x, sofa.width], [size.y, sofa.height], [size.z, sofa.depth], [bounds.min.y, 0]])
    assert.ok(Math.abs(actual - expected) < .003, `${actual} differs from ${expected}`);
  const centre = bounds.getCenter(new Vector3());
  assert.ok(Math.abs(centre.x) < .001 && Math.abs(centre.z) < .001);
  assert.ok(triangles < 90000);
  assert.ok(bytes.length < 8 * 1024 * 1024, 'GLB exceeds the 8 MiB delivery budget');
  const linen = doc.materials.find(m => m.name.startsWith('Cream linen'));
  assert.ok(linen.normalTexture && linen.pbrMetallicRoughness.baseColorTexture && linen.pbrMetallicRoughness.metallicRoughnessTexture);
  assert.ok(doc.images.every(im => im.bufferView !== undefined), 'Textures must be self-contained');
});
