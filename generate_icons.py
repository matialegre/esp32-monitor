import os
from PIL import Image
from PIL import ImageDraw

# Crear carpeta para los íconos
if not os.path.exists('public/icons'):
    os.makedirs('public/icons')

# Tamaños de íconos necesarios
icon_sizes = [128, 192, 256, 512]

# Crear un ícono base (puedes personalizar esto)
base_size = max(icon_sizes)
base_icon = Image.new('RGBA', (base_size, base_size), (33, 150, 243, 255))

# Dibujar un diseño simple en el ícono
draw = ImageDraw.Draw(base_icon)

# Dibujar un círculo en el centro
radius = base_size // 4
center = (base_size // 2, base_size // 2)
draw.ellipse(
    (center[0] - radius, center[1] - radius,
     center[0] + radius, center[1] + radius),
    fill=(255, 255, 255, 255)
)

# Guardar íconos en diferentes tamaños
for size in icon_sizes:
    icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(f'public/icons/icon-{size}.png')

print("Íconos generados exitosamente!")
