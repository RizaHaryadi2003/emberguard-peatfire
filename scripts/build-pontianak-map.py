# Membangun data/pontianak-map.json dari hasil unduhan Overpass API.
# Pemakaian: python3 -I scripts/build-pontianak-map.py <folder-unduhan> data/pontianak-map.json
# Folder unduhan berisi kecamatan-geom.json dan sungai.json; kuerinya
# dicatat di data/SUMBER.md.
import json, math, sys
src, out = sys.argv[1], sys.argv[2]
kec = json.load(open(f"{src}/kecamatan-geom.json"))
riv = json.load(open(f"{src}/sungai.json"))

LAT0 = -0.03
KX = 111.320 * math.cos(math.radians(LAT0))  # km per derajat bujur
KY = 110.574                                  # km per derajat lintang

def stitch(ways):
    """Sambung potongan garis menjadi cincin tertutup."""
    segs = [[(p['lon'], p['lat']) for p in w] for w in ways if w]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]: ring += s[1:]
                elif s[-1] == ring[-1]: ring += s[::-1][1:]
                elif s[-1] == ring[0]: ring = s + ring[1:]
                elif s[0] == ring[0]: ring = s[::-1] + ring[1:]
                else: continue
                segs.pop(i); changed = True; break
        rings.append(ring)
    return rings

def area_km2(ring):
    a = 0
    for (x1,y1),(x2,y2) in zip(ring, ring[1:]):
        a += (x1*KX)*(y2*KY) - (x2*KX)*(y1*KY)
    return abs(a)/2

def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1,y1),(x2,y2) = pts[0], pts[-1]
    dmax, idx = 0, 0
    L = math.hypot(x2-x1, y2-y1) or 1e-12
    for i in range(1, len(pts)-1):
        x0,y0 = pts[i]
        d = abs((y2-y1)*x0 - (x2-x1)*y0 + x2*y1 - y2*x1)/L
        if d > dmax: dmax, idx = d, i
    if dmax > eps:
        return dp(pts[:idx+1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]

allx=[];ally=[]
districts=[]
for e in kec['elements']:
    outer=[m['geometry'] for m in e['members'] if m['type']=='way' and m.get('role','outer') in ('outer','')]
    rings=stitch(outer)
    km=[[(x*KX,y*KY) for x,y in r] for r in rings]
    area=sum(area_km2(r) for r in rings)
    districts.append((e['tags']['name'], km, area))
    for r in km:
        for x,y in r: allx.append(x); ally.append(y)

minx,maxx,miny,maxy=min(allx),max(allx),min(ally),max(ally)
W=1000; S=W/(maxx-minx); H=round((maxy-miny)*S)
def tr(p): return (round((p[0]-minx)*S,1), round((maxy-p[1])*S,1))
EPS=0.02  # km
def path(rings):
    d=""
    for r in rings:
        # Cincin tertutup dibelah di titik terjauh dari titik awalnya, lalu
        # tiap belahan disederhanakan sendiri; Douglas-Peucker pada cincin
        # utuh meruntuhkannya karena kedua ujungnya sama.
        far=max(range(len(r)), key=lambda i:(r[i][0]-r[0][0])**2+(r[i][1]-r[0][1])**2)
        half=dp(r[:far+1],EPS)[:-1]+dp(r[far:],EPS)
        s=[tr(p) for p in half]
        d+="M"+"L".join(f"{x},{y}" for x,y in s)+"Z"
    return d

res={"viewBox":[0,0,W,H],"kmPerUnit":round(1/S,5),"districts":[],"rivers":[]}
for name,km,area in sorted(districts):
    res["districts"].append({"name":name,"areaKm2":round(area,2),"d":path(km)})
    print(f"{name:20s} {area:7.2f} km2", file=sys.stderr)
for e in riv['elements']:
    if e['type']=='relation':
        outer=[m['geometry'] for m in e['members'] if m['type']=='way' and m.get('role')=='outer']
        rings=stitch(outer)
        km=[[(p[0]*KX,p[1]*KY) for p in r] for r in rings]
        res["rivers"].append({"d":path(km)})
json.dump(res, open(out,"w"), separators=(",",":"))
print("ukuran", len(json.dumps(res)), "byte; viewBox", W, H, file=sys.stderr)
