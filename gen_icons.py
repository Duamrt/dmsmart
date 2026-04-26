import struct, zlib, os

def make_png(path, size):
    w = h = size
    BG = (3, 7, 18)
    CY = (0, 212, 255)
    pixels = [[BG]*w for _ in range(h)]

    scale = max(1, size // 20)

    D = ["XXXX.","X...X","X...X","X...X","X...X","X...X","XXXX."]
    M = ["X...X","XX.XX","X.X.X","X...X","X...X","X...X","X...X"]

    def draw(letter, col0, row0):
        for r, row in enumerate(letter):
            for c, ch in enumerate(row):
                if ch == 'X':
                    for dy in range(scale):
                        for dx in range(scale):
                            py, px = row0+r*scale+dy, col0+c*scale+dx
                            if 0<=py<h and 0<=px<w:
                                pixels[py][px] = CY

    # Centraliza as duas letras
    letter_w = 5*scale
    gap = 2*scale
    total = letter_w*2 + gap
    col0 = (w - total) // 2
    row0 = (h - 7*scale) // 2

    draw(D, col0, row0)
    draw(M, col0 + letter_w + gap, row0)

    raw = b''.join(b'\x00' + b''.join(bytes(p) for p in row) for row in pixels)

    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png  = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)
    print(f"OK {path}")

make_png(r"C:\Users\Duam Rodrigues\dmsmart\icons\dm-192.png", 192)
make_png(r"C:\Users\Duam Rodrigues\dmsmart\icons\dm-512.png", 512)
print("Ícones gerados!")
