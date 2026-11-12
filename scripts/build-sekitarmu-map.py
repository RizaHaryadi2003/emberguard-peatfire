# Membangun data/sekitarmu-map.json: Indonesia & tetangga (Natural Earth),
# Kalimantan Barat dan kecamatan/sungai Kota Pontianak (OpenStreetMap), serta
# titik lokasi penelitian, semuanya dalam satu proyeksi (km).
import json, math, sys
ne_dir, osm_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
LAT0 = -0.03
KX = 111.320 * math.cos(math.radians(LAT0))
KY = 110.574
def P(lon, lat): return (lon * KX, -lat * KY)

def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1,y1),(x2,y2) = pts[0], pts[-1]
    L = math.hypot(x2-x1, y2-y1)
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        x0,y0 = pts[i]
        d = (abs((y2-y1)*x0-(x2-x1)*y0+x2*y1-y2*x1)/L) if L > 0 else math.hypot(x0-x1, y0-y1)
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx+1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]

def ring_d(r, eps, minlen=0):
    if len(r) < 4: return ""
    far = max(range(len(r)), key=lambda i: (r[i][0]-r[0][0])**2+(r[i][1]-r[0][1])**2)
    s = dp(r[:far+1], eps)[:-1] + dp(r[far:], eps)
    if len(s) < 4: return ""
    xs=[p[0] for p in s]; ys=[p[1] for p in s]
    if max(xs)-min(xs) < minlen and max(ys)-min(ys) < minlen: return ""
    return "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in s) + "Z"

def stitch(ways):
    segs = [[(p['lon'], p['lat']) for p in w] for w in ways if w]
    rings = []
    while segs:
        ring = segs.pop(0); changed = True
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

res = {"projection": {"lat0": LAT0, "kmPerDegLon": round(KX, 4), "kmPerDegLat": KY}, "countries": [], "kalbar": "", "districts": [], "rivers": [], "sites": []}

# Negara: kotak Asia Tenggara maritim.
ne = json.load(open(f"{ne_dir}/ne_50m_admin_0_countries.geojson"))
KEEP = {"IDN": "Indonesia", "MYS": "Malaysia", "BRN": "Brunei", "TLS": "Timor-Leste", "PNG": "Papua Nugini", "SGP": "Singapura", "PHL": "Filipina"}
for f in ne["features"]:
    code = f["properties"].get("ADM0_A3")
    if code not in KEEP: continue
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    d = ""
    for poly in polys:
        outer = [P(lon, lat) for lon, lat in poly[0]]
        if not any(-1200*0 <= 0 for _ in [0]): pass
        lons = [c[0] for c in poly[0]]; lats = [c[1] for c in poly[0]]
        if max(lons) < 94 or min(lons) > 142 or max(lats) < -12 or min(lats) > 8: continue
        d += ring_d(outer, 4.0, minlen=8)
    res["countries"].append({"code": code, "name": KEEP[code], "d": d})

# Kalimantan Barat.
kb = json.load(open(f"{osm_dir}/kalbar.json"))["elements"][0]
outer = [m["geometry"] for m in kb["members"] if m["type"] == "way" and m.get("role") == "outer"]
res["kalbar"] = "".join(ring_d([P(lon, lat) for lon, lat in r], 0.8, minlen=1.5) for r in stitch(outer))

# Kecamatan dan sungai Kota Pontianak.
def area(r):
    return abs(sum(x1*y2-x2*y1 for (x1,y1),(x2,y2) in zip(r, r[1:])))/2
kec = json.load(open(f"{osm_dir}/kecamatan-geom.json"))
for e in sorted(kec["elements"], key=lambda e: e["tags"]["name"]):
    outer = [m["geometry"] for m in e["members"] if m["type"] == "way" and m.get("role", "outer") in ("outer", "")]
    rings = [[P(lon, lat) for lon, lat in r] for r in stitch(outer)]
    xs=[p[0] for r in rings for p in r]; ys=[p[1] for r in rings for p in r]
    res["districts"].append({
        "name": e["tags"]["name"],
        "areaKm2": round(sum(area(r) for r in rings), 2),
        "label": [round(sum(xs)/len(xs), 2), round(sum(ys)/len(ys), 2)],
        "d": "".join(ring_d(r, 0.02) for r in rings),
    })
riv = json.load(open(f"{osm_dir}/sungai.json"))
for e in riv["elements"]:
    if e["type"] != "relation": continue
    outer = [m["geometry"] for m in e["members"] if m["type"] == "way" and m.get("role") == "outer"]
    res["rivers"].append("".join(ring_d([P(lon, lat) for lon, lat in r], 0.02) for r in stitch(outer)))

# Lokasi penelitian (titik tengah ruas jalan di OpenStreetMap).
SITES = [
    ("reformasi", "Jl. Reformasi Untan", -0.0665, 109.3400),
    ("sepakat", "Jl. Sepakat II", -0.0700, 109.3420),
    ("perdana", "Jl. Perdana, Bansir Darat", -0.0667, 109.3338),
]
for sid, name, lat, lon in SITES:
    x, y = P(lon, lat)
    res["sites"].append({"id": sid, "name": name, "x": round(x, 3), "y": round(y, 3)})

# Kotak tiap tingkat perbesaran (km): Indonesia, Kalbar, Pontianak.
def bbox_of(d):
    import re
    nums = [float(v) for v in re.findall(r"-?\d+\.?\d*", d)]
    xs, ys = nums[0::2], nums[1::2]
    return [round(min(xs),2), round(min(ys),2), round(max(xs)-min(xs),2), round(max(ys)-min(ys),2)]
idn = next(c for c in res["countries"] if c["code"] == "IDN")
res["views"] = {
    "indonesia": bbox_of(idn["d"]),
    # Batas OpenStreetMap ikut memuat laut wilayah provinsi, jadi kotak
    # daratnya ditulis dari batas daratan Kalimantan Barat (lintang -3,1°
    # sampai 2,1°, bujur 108,7° sampai 114,2°). Di halaman, isian provinsi
    # dipotong dengan garis pantai Indonesia (clipPath).
    "kalbar": [round(P(108.7, 0)[0], 2), round(P(0, 2.1)[1], 2), round((114.2 - 108.7) * KX, 2), round(5.2 * KY, 2)],
    "pontianak": bbox_of("".join(d["d"] for d in res["districts"])),
}
json.dump(res, open(out, "w"), separators=(",", ":"))
print("ukuran", len(json.dumps(res, separators=(",", ":"))), "byte", file=sys.stderr)
print(res["views"], file=sys.stderr)
for d in res["districts"]: print(d["name"], d["areaKm2"], file=sys.stderr)
