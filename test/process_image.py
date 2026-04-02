import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw

def process():
    input_path = "C:/Users/fra/Documents/iw4x-customcamos/test/camo_texture.png"
    if not os.path.exists(input_path):
        print("Input file non trovato!")
        return
        
    img = Image.open(input_path).convert("RGBA")
    
    # 1. Resize base a 400x400
    img_400 = img.resize((400, 400), Image.Resampling.LANCZOS)
    img_400.save("C:/Users/fra/Documents/iw4x-customcamos/test/camo_texture_400.png")
    
    # 2. Crop/Resize a 400x152 per menu
    # Un crop centrato verticale 
    top = (400 - 152) // 2
    img_menu = img_400.crop((0, top, 400, top + 152))
    
    # 3. Applica i "quadratini ai bordi" effetto BO2
    draw = ImageDraw.Draw(img_menu, "RGBA")
    square_size = 4
    width, height = 400, 152
    
    # Crea un gradiente/motivo a quadrettoni scuri ai bordi (sopra e sotto) per simulare l'hud BO2.
    # Disegniamo quadretti con trasparenza
    for y in range(0, height, square_size):
        for x in range(0, width, square_size):
            # Se siamo vicino ai bordi sinistro, destro o superiore/inferiore
            if y < square_size * 2 or y >= height - square_size * 2 or x < square_size * 2 or x >= width - square_size * 2:
                # Scacchiera ai bordi
                if (x // square_size + y // square_size) % 2 == 0:
                    draw.rectangle([x, y, x+square_size, y+square_size], fill=(0, 0, 0, 150))
                else:
                    draw.rectangle([x, y, x+square_size, y+square_size], fill=(255, 255, 255, 50))

    out_menu = "C:/Users/fra/Documents/iw4x-customcamos/test/weapon_camo_menu_arctic.png"
    img_menu.save(out_menu)
    print(f"File salvato: {out_menu}")

process()
