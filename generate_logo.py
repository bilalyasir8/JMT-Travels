from PIL import Image, ImageDraw, ImageFont
import math
import os

width, height = 512, 512
img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Center circle background
center_x, center_y = 256, 256
radius = 240
draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], fill="#FAF8F4", outline="#33328C", width=6)

# Dashed inner border
dash_radius = 228
for angle in range(0, 360, 4):
    rad = math.radians(angle)
    x1 = center_x + dash_radius * math.cos(rad)
    y1 = center_y + dash_radius * math.sin(rad)
    x2 = center_x + (dash_radius - 4) * math.cos(rad)
    y2 = center_y + (dash_radius - 4) * math.sin(rad)
    if (angle // 4) % 2 == 0:
        draw.line([x1, y1, x2, y2], fill="#4EAE4B", width=2)

# Dynamic Green Arc / Wing Motif
green_poly = [
    (110, 220), (140, 130), (220, 95), (320, 105), (410, 150),
    (340, 135), (250, 130), (170, 180), (130, 230)
]
draw.polygon(green_poly, fill="#4EAE4B")

# Dynamic Navy Arc
navy_poly = [
    (130, 245), (180, 165), (260, 140), (350, 155), (420, 195),
    (350, 180), (260, 175), (185, 220), (145, 255)
]
draw.polygon(navy_poly, fill="#33328C")

# Gold Aircraft Emblem / Accent
gold_plane = [
    (385, 140), (415, 132), (405, 150), (420, 148), (425, 156),
    (405, 158), (395, 170), (390, 168), (393, 158), (378, 159),
    (372, 164), (368, 162), (372, 154)
]
draw.polygon(gold_plane, fill="#C9962E")

# Try to load fonts or use default
try:
    font_bold = ImageFont.truetype("arialbd.ttf", 74)
    font_sub = ImageFont.truetype("arialbd.ttf", 20)
    font_ar = ImageFont.truetype("arial.ttf", 22)
    font_est = ImageFont.truetype("arialbd.ttf", 12)
except:
    font_bold = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_ar = ImageFont.load_default()
    font_est = ImageFont.load_default()

# Text: JMT
draw.text((center_x, 300), "JMT", fill="#33328C", font=font_bold, anchor="mm")

# Text: TRAVEL & TOURISM
draw.text((center_x, 342), "TRAVEL & TOURISM", fill="#4EAE4B", font=font_sub, anchor="mm")

# Text: للسفر والسياحة
draw.text((center_x, 378), "للسفر والسياحة", fill="#1F6B35", font=font_ar, anchor="mm")

# Stamp dot & text: EST. 2004 · OMAN
draw.ellipse([center_x - 3, 408 - 3, center_x + 3, 408 + 3], fill="#C9962E")
draw.text((center_x, 420), "EST. 20+ YEARS · OMAN", fill="#17171F", font=font_est, anchor="mm")

os.makedirs("public/assets", exist_ok=True)
img.save("public/assets/logo.png", "PNG")
print("Successfully generated public/assets/logo.png")
