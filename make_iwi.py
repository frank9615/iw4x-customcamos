import sys
import os
import struct
import subprocess

def create_iwi_header(width, height, format_type='dxt5'):
    """
    Creates a 32-byte IWI v8 header for Modern Warfare 2 (IW4).
    """
    format_map = {
        'dxt1': 0x01,
        'dxt3': 0x02,
        'dxt5': 0x03
    }
    
    header = bytearray(32)
    header[0:4] = b'iwi8'
    header[4] = format_map.get(format_type.lower(), 0x03)
    header[5] = 0x02  # Usage: World/Weapon Texture
    
    # Width and Height at offsets 6 and 8
    struct.pack_into('<H', header, 6, width)
    struct.pack_into('<H', header, 8, height)
    
    return header

def run_magick(input_image, dds_output):
    """
    Uses ImageMagick to convert an image to DDS.
    """
    try:
        # We use -define dds:compression=dxt5 to ensure correct format
        # We also force it to be a 2D texture
        cmd = [
            "magick", input_image, 
            "-define", "dds:compression=dxt5", 
            "-define", "dds:mipmaps=1", # Include mipmaps for better in-game rendering
            dds_output
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running ImageMagick: {e.stderr.decode()}")
        return False
    except FileNotFoundError:
        print("Error: ImageMagick (magick) not found in PATH.")
        return False

def make_iwi(input_image, output_iwi):
    temp_dds = "temp_conv.dds"
    
    print(f"[*] Processing {input_image}...")
    
    # 1. Convert to DDS via ImageMagick
    if not run_magick(input_image, temp_dds):
        return

    # 2. Read DDS and extract data
    try:
        with open(temp_dds, 'rb') as f:
            dds_data = f.read()

        if dds_data[0:4] != b'DDS ':
            print("Error: Generated DDS is invalid.")
            return

        # Extract dimension from DDS header
        height = struct.unpack('<I', dds_data[12:16])[0]
        width = struct.unpack('<I', dds_data[16:20])[0]
        
        # 3. Create IWI file
        header = create_iwi_header(width, height, 'dxt5')
        pixel_data = dds_data[128:]  # Skip 128-byte DDS header
        
        with open(output_iwi, 'wb') as f:
            f.write(header)
            f.write(pixel_data)
            
        print(f"[+] Successfully created {output_iwi} ({width}x{height})")
        
    finally:
        # Cleanup
        if os.path.exists(temp_dds):
            os.remove(temp_dds)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 make_iwi.py <input_image> <output_iwi>")
        print("Example: python3 make_iwi.py my_texture.png weapon_camo_gold.iwi")
        sys.exit(1)
        
    make_iwi(sys.argv[1], sys.argv[2])
