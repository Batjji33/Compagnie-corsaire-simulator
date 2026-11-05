import assert from 'node:assert/strict';
import test from 'node:test';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture} from 'three';
import type {Material,WebGLRenderer} from 'three';
import {rendererLifetime} from '../src/world/RendererLifetime.ts';

test('closing a ferry view releases the shared renderer texture once and preserves shader hooks',()=>{
 const root=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial(),texture=new Texture();root.add(new Mesh(geometry,material));let disposed=0,compiled=0;texture.addEventListener('dispose',()=>disposed++);material.onBeforeCompile=()=>{compiled++;};
 const release=rendererLifetime(root),shader={uniforms:{dfgLUT:{value:texture}}} as unknown as Parameters<Material['onBeforeCompile']>[0];material.onBeforeCompile(shader,{} as WebGLRenderer);assert.equal(compiled,1);release();release();assert.equal(disposed,1);geometry.dispose();material.dispose();
});

test('the renderer cleanup tolerates uncompiled views and shaders without a DFG LUT',()=>{
 rendererLifetime(new Group())();const root=new Group(),g=new BoxGeometry(),m=new MeshStandardMaterial();root.add(new Mesh(g,m));const release=rendererLifetime(root);m.onBeforeCompile({uniforms:{}} as unknown as Parameters<Material['onBeforeCompile']>[0],{} as WebGLRenderer);assert.doesNotThrow(release);g.dispose();m.dispose();
});
