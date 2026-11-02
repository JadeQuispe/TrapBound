"""Remove disconnected edge fragments from the 48 existing hero pose assets.

The source art stays on its original 384px canvas. We keep the hero/weapon
component and interior magic details, only erasing small components that touch
the crop edge (pieces of adjacent poses in the source export).
"""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public/assets/equipment-v63"


def clean(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    alpha = im.getchannel("A")
    opaque = alpha.point(lambda value: 255 if value > 32 else 0).load()
    seen = bytearray(w * h)
    components = []
    for start in range(w * h):
        if seen[start] or not opaque[start % w, start // w]:
            continue
        queue = deque([start])
        seen[start] = 1
        component = []
        while queue:
            pos = queue.popleft()
            component.append(pos)
            x, y = pos % w, pos // w
            for neighbor in (pos - 1 if x else -1, pos + 1 if x < w - 1 else -1,
                             pos - w if y else -1, pos + w if y < h - 1 else -1):
                if neighbor >= 0 and not seen[neighbor] and opaque[neighbor % w, neighbor // w]:
                    seen[neighbor] = 1
                    queue.append(neighbor)
        components.append(component)
    if not components:
        return 0
    main = max(map(len, components))
    pixels = im.load()
    removed = 0
    for component in components:
        if len(component) >= main * .04:
            continue
        if not any((pos % w < 16 or pos % w >= w - 16 or pos // w < 12 or pos // w >= h - 12)
                   for pos in component):
            continue
        for pos in component:
            x, y = pos % w, pos // w
            pixels[x, y] = (0, 0, 0, 0)
        removed += 1
    if removed:
        temporary = path.with_name(path.stem + '-clean.webp')
        im.save(temporary, 'WEBP', quality=95, method=4)
        temporary.replace(path)
    return removed


if __name__ == '__main__':
    count = sum(clean(path) for path in ROOT.glob('*.webp'))
    print(f'Cleaned {count} isolated edge fragments across 48 hero poses.')
