#!/usr/bin/env python3
"""Blockade Labs Skybox AI generator for Palazzo Aventino.

Cohesion recipe: lock skybox_style_id + seed across all rooms; generate the
salone as ANCHOR, then remix the other 7 off it. Reads SKYBOX_KEY from env
(via `doppler run --project nadaa --config dev -- ...`).
"""
import os, sys, json, time, urllib.request, urllib.error

KEY = os.environ.get("SKYBOX_KEY")
BASE = "https://backend.blockadelabs.com/api/v1"
STYLE = 119          # M3 Photoreal (Featured)
SEED = 7000001       # frozen across all rooms
NEG = "oversaturated, neon, modern furniture, fisheye distortion, warped lines, watermark, signage, people, text, duplicated columns, cluttered"
PREFIX = ("interior of a grand 17th-century Roman palazzo on the Aventine Hill, quiet luxury, "
          "muted travertine and warm honey stone, restrained and uncluttered, soft warm neutral "
          "daylight, photoreal architectural photography, no people, no text — ")

# room id -> (per-room seed, prompt body). Distinct architecture per room; cohesion
# comes from the shared style (119) + palette words in PREFIX, NOT from remixing geometry.
ROOMS = {
  "salone":   (7000001, "the piano nobile reception salon, a coffered vaulted ceiling carrying a faded allegory of the seasons fresco, tall shuttered windows, a polished travertine floor, a single restrained console"),
  "facade":   (7000012, "EXTERIOR view of the palazzo's grand entrance facade seen from a quiet sunlit piazza, a tall stone building front with pilasters, rows of shuttered windows and a deep cornice, a pair of cypress trees, cobbled square, open sky above, the rooftops of Rome beyond — an outdoor street-level scene, not an interior"),
  "cortile":  (7000023, "an open-air interior courtyard with NO roof, open blue Roman sky directly overhead, surrounded on four sides by a two-storey arcade of stone arches, a single potted citrus tree and a worn stone fountain at the centre, sunlit flagstones"),
  "scalone":  (7000034, "a grand staircase hall, a wide stone staircase with shallow steps and a carved balustrade sweeping upward to a landing, a tall window and a high lantern skylight spilling light down the steps, monumental and bare"),
  "biblioteca":(7000045, "a library, every wall lined floor-to-ceiling with walnut bookshelves crammed with old leather books, a long central reading table with a lamp, a rolling ladder, tall shutters folded back to a garden, warm and hushed"),
  "pranzo":   (7000056, "a formal dining room, a long dark-wood dining table set with chairs running down the centre, a low wrought-iron chandelier above it, walls in deep warm Roman ochre, a sideboard along one wall, candlelit warmth"),
  "padronale":(7000067, "a master bedroom, a large canopied four-poster bed against the far wall, soft white linen, a pair of armchairs, an open loggia of arches looking over a courtyard, pale stone and serene morning light"),
  "terrazza": (7000078, "an OUTDOOR rooftop terrace at golden dusk with open sky overhead and NO ceiling, clipped box hedges in terracotta pots, a stone balustrade, and across the skyline the dome of St. Peter's basilica catching the last light over the rooftops of Rome"),
}

def req(method, path, body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, method=method,
        headers={"x-api-key": KEY, "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:500]}"); sys.exit(1)

def generate(room_id):
    seed, body_text = ROOMS[room_id]
    body = {"skybox_style_id": STYLE, "seed": seed, "prompt": PREFIX + body_text, "negative_text": NEG}
    out = req("POST", "/skybox", body)
    rid = out.get("id") or out.get("request", {}).get("id")
    print(f"[{room_id}] queued request id={rid} status={out.get('status') or out.get('request',{}).get('status')}")
    return rid

def poll(rid, timeout=240):
    t0 = time.time()
    while time.time() - t0 < timeout:
        out = req("GET", f"/imagine/requests/{rid}")
        rq = out.get("request", out)
        st = rq.get("status")
        if st == "complete":
            return rq
        if st in ("error", "abort"):
            print(f"  generation {st}: {rq.get('error_message')}"); sys.exit(1)
        print(f"  ...{st} ({int(time.time()-t0)}s)"); time.sleep(6)
    print("  timeout"); sys.exit(1)

def download(url, path):
    urllib.request.urlretrieve(url, path)
    print(f"  saved {path}")

if __name__ == "__main__":
    # generate the rooms named on the CLI (default: all), each solo with its own seed
    rooms = sys.argv[1:] or list(ROOMS.keys())
    for room in rooms:
        rid = generate(room)
        rq = poll(rid)
        download(rq["file_url"], f"img/raw/{room}.jpg")
        print(f"  [{room}] done\n")
    print("DONE: " + ", ".join(rooms))
