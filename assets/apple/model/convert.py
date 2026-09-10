from pxr import Usd,UsdGeom,UsdShade
from pathlib import Path
import zipfile,json,array
src='website/assets/apple/apple-vision-pro-dual-knit.usdz';out=Path('website/assets/apple/model')
z=zipfile.ZipFile(src)
for name in z.namelist():
 if name.endswith(('.jpg','.png')): (out/Path(name).name).write_bytes(z.read(name))
s=Usd.Stage.Open(src);cache=UsdGeom.XformCache();blob=bytearray();meshes=[];materials={}
def put(values):
 a=array.array('f',values);offset=len(blob);blob.extend(a.tobytes());return [offset,len(a)]
def matdata(mat):
 key=str(mat.GetPath())
 if key in materials:return key
 sh=mat.ComputeSurfaceSource()[0];d={}
 if sh:
  for field in ['diffuseColor','roughness','metallic','opacity','normal']:
   i=sh.GetInput(field)
   if not i:continue
   conn=i.GetConnectedSource()
   if conn:
    tex=UsdShade.Shader(conn[0].GetPrim()).GetInput('file')
    if tex and tex.Get():d[field+'Map']=Path(tex.Get().path).name
   else:
    v=i.Get()
    if v is not None:d[field]=list(v) if field in ['diffuseColor','normal'] else float(v)
 materials[key]=d;return key
for p in s.Traverse():
 if not p.IsA(UsdGeom.Mesh):continue
 m=UsdGeom.Mesh(p)
 if m.ComputeVisibility()=='invisible':continue
 pts=m.GetPointsAttr().Get();counts=m.GetFaceVertexCountsAttr().Get();idx=m.GetFaceVertexIndicesAttr().Get()
 if not pts or not counts:continue
 tr=cache.GetLocalToWorldTransform(p);world=[tr.Transform(x) for x in pts]
 uv=UsdGeom.PrimvarsAPI(p).GetPrimvar('st');uvs=uv.ComputeFlattened() if uv else None
 normalvar=UsdGeom.PrimvarsAPI(p).GetPrimvar('normals'); ns=normalvar.ComputeFlattened() if normalvar else m.GetNormalsAttr().Get(); ni=normalvar.GetInterpolation() if normalvar else m.GetNormalsInterpolation(); nt=tr.GetInverse().GetTranspose()
 pos=[];tex=[];norm=[];offset=0
 for count in counts:
  for j in range(1,count-1):
   for corner in [offset,offset+j,offset+j+1]:
    vi=idx[corner];pos.extend(world[vi]);u=uvs[corner if uv.GetInterpolation()=='faceVarying' else vi] if uvs else (0,0);tex.extend(u)
    if ns:
     n=nt.TransformDir(ns[corner if ni=='faceVarying' else vi]); n.Normalize();norm.extend(n)
  offset+=count
 mat=UsdShade.MaterialBindingAPI(p).ComputeBoundMaterial()[0]
 meshes.append({'position':put(pos),'uv':put(tex),'normal':put(norm),'material':matdata(mat) if mat else None})
(out/'geometry.bin').write_bytes(blob);(out/'model.json').write_text(json.dumps({'meshes':meshes,'materials':materials}))
print(len(meshes),'meshes',len(blob),'bytes')
