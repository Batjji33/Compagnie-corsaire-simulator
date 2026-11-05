import {Material,Mesh,Object3D,Texture} from 'three';

/** Three r186's shared DFG LUT outlives its renderers and retains their GL contexts.
 * Capture its uniform through the public shader hook, never patch Three internals.
 * Disposing the texture releases its per-context listeners; other renderers reupload
 * this tiny LUT on their next frame. Recheck this workaround when upgrading Three.
 */
export function rendererLifetime(root:Object3D):()=>void {
 let uniform:{value:unknown}|undefined;
 let target:Material|undefined;
 root.traverse(object=>{if(!target&&object instanceof Mesh){const m=Array.isArray(object.material)?object.material[0]:object.material;if('isMeshStandardMaterial' in m)target=m;}});
 if(target){const original=target.onBeforeCompile;target.onBeforeCompile=function(shader,renderer){original.call(this,shader,renderer);uniform=shader.uniforms.dfgLUT;};}
 return ()=>{if(uniform?.value instanceof Texture)uniform.value.dispose();uniform=undefined;};
}
