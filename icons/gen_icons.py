from PIL import Image, ImageDraw, ImageFont
import math

def render(size):
    S = size / 512.0
    BG    = (13, 17, 23, 255)
    BLUE  = (0, 87, 255, 255)
    WHITE = (238, 242, 252, 255)

    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background
    cr = int(96 * S)
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=cr, fill=BG)

    # --- Find fonts ---
    bold_font = None
    medium_font = None
    for c in ['C:/Windows/Fonts/GILSANUB.TTF', 'C:/Windows/Fonts/ARIALNB.TTF', 'C:/Windows/Fonts/arialbd.ttf']:
        try:
            ImageFont.truetype(c, 10)
            bold_font = c
            break
        except: pass
    for c in ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/ARIALNB.TTF', 'C:/Windows/Fonts/GILSANUB.TTF']:
        try:
            ImageFont.truetype(c, 10)
            medium_font = c
            break
        except: pass

    # --- Blue bottom bar area (defines layout) ---
    bar_h = int(90 * S)
    bar_t = size - int(32*S) - bar_h
    bar_b = bar_t + bar_h
    bar_l = int(44*S); bar_r = size - int(44*S)
    draw.rounded_rectangle([bar_l, bar_t, bar_r, bar_b], radius=int(16*S), fill=BLUE)

    # "SMART" label inside bar
    if medium_font:
        sm_size = int(46 * S)
        sm_font = ImageFont.truetype(medium_font, sm_size)
        sm_bbox = draw.textbbox((0,0), "SMART", font=sm_font)
        sm_w = sm_bbox[2] - sm_bbox[0]
        sm_h = sm_bbox[3] - sm_bbox[1]
        sm_x = (size - sm_w) // 2 - sm_bbox[0]
        sm_y = bar_t + (bar_h - sm_h) // 2 - sm_bbox[1]
        # Slightly lighter blue text on blue bg
        draw.text((sm_x, sm_y), "SMART", font=sm_font, fill=(200, 220, 255, 200))

    # --- DM text (centered in remaining space above bar) ---
    avail_top = bar_t - int(20*S)
    avail_center = avail_top / 2

    if bold_font:
        dm_size = int(260 * S)
        dm_font = ImageFont.truetype(bold_font, dm_size)
        bbox = draw.textbbox((0,0), "DM", font=dm_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (size - tw) // 2 - bbox[0]
        ty = int(avail_center - th/2) - bbox[1]
        draw.text((tx, ty), "DM", font=dm_font, fill=WHITE)

    # --- Blue glow dot (top right corner) ---
    dot_cx = size - int(68*S)
    dot_cy = int(72*S)
    dot_r = int(20*S)

    # Glow
    glow_img = Image.new('RGBA', (size, size), (0,0,0,0))
    gd = ImageDraw.Draw(glow_img)
    for gr in range(int(55*S), 0, -1):
        ga = int(105 * (1 - gr/(55*S))**2.2)
        gd.ellipse([dot_cx-gr, dot_cy-gr, dot_cx+gr, dot_cy+gr], fill=(0,87,255,ga))
    img = Image.alpha_composite(img, glow_img)
    draw = ImageDraw.Draw(img)

    draw.ellipse([dot_cx-dot_r, dot_cy-dot_r, dot_cx+dot_r, dot_cy+dot_r], fill=(0,87,255,255))
    hr = int(dot_r*0.45)
    draw.ellipse([dot_cx-hr, dot_cy-hr, dot_cx+hr, dot_cy+hr], fill=(110,168,255,255))

    return img

print("Gerando 192...")
render(192).save('icon-192.png')
print("Gerando 512...")
render(512).save('icon-512.png')
print("Pronto!")
