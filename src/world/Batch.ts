import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D, IcosahedronGeometry } from 'three';
import type { MaterialId } from './Materials';
type Primitive = 'box' | 'roof' | 'cone' | 'cylinder' | 'rock';
interface Part { type: Primitive; material: MaterialId; x: number; y: number; z: number; w: number; h: number; d: number; angle: number; tint: number }
/** One draw call per geometry/material/zone, instead of one per window or house. */
export class Batch {
  private parts: Part[] = [];
  add(type: Primitive, material: MaterialId, x: number, y: number, z: number, w: number, h: number, d: number, angle = 0, tint = 0xffffff) {
    this.parts.push({ type, material, x, y, z, w, h, d, angle, tint });
  }
  build(materials: Record<MaterialId, MeshStandardMaterial>): Group {
    const roof = new BufferGeometry();
    roof.setAttribute('position', new Float32BufferAttribute([
      -.5,0,-.5, .5,0,-.5, 0,1,-.5, .5,0,.5, -.5,0,.5, 0,1,.5,
      -.5,0,.5, -.5,0,-.5, 0,1,-.5, -.5,0,.5, 0,1,-.5, 0,1,.5,
      .5,0,-.5, .5,0,.5, 0,1,.5, .5,0,-.5, 0,1,.5, 0,1,-.5,
    ], 3));
    roof.setAttribute('uv', new Float32BufferAttribute([0,0,1,0,.5,1,1,0,0,0,.5,1,0,0,1,0,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1], 2));
    roof.setIndex(Array.from({length:6},(_,i)=>[i*3,i*3+2,i*3+1]).flat());
    roof.computeVertexNormals();
    const geometries: Record<Primitive, BufferGeometry> = { box: new BoxGeometry(1,1,1), roof, cone: new ConeGeometry(.5,1,8), cylinder: new CylinderGeometry(.5,.5,1,10), rock: new IcosahedronGeometry(.5,0) };
    const grouped = new Map<string, Part[]>();
    for (const part of this.parts) { const key = `${part.type}:${part.material}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key)!.push(part); }
    const group = new Group(), dummy = new Object3D(), color = new Color();
    const used = new Set<Primitive>();
    for (const parts of grouped.values()) {
      const first = parts[0]; used.add(first.type);
      const mesh = new InstancedMesh(geometries[first.type], materials[first.material], parts.length);
      parts.forEach((part, index) => {
        dummy.position.set(part.x,part.y,part.z); dummy.rotation.set(0,part.angle,0); dummy.scale.set(part.w,part.h,part.d); dummy.updateMatrix();
        mesh.setMatrixAt(index,dummy.matrix); mesh.setColorAt(index,color.setHex(part.tint));
      });
      mesh.computeBoundingSphere(); group.add(mesh);
    }
    for (const [key, geometry] of Object.entries(geometries)) if (!used.has(key as Primitive)) geometry.dispose();
    return group;
  }
}
