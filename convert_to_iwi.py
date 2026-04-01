import sys
import os
import struct

def convert_dds_to_iwi(dds_path, iwi_path, format_type='dxt5'):
    """
    Converts a DDS file to IW4 (MW2) IWI version 8.
    Strips the 128-byte DDS header and prepends a 32-byte IWI header.
    """
    if not os.path.exists(dds_path):
        print(f"Error: {dds_path} not found")
        return

    with open(dds_path, 'rb') as f:
        dds_data = f.read()

    # DDS Header is 128 bytes
    # Magic (4) + Header (124)
    if dds_data[0:4] != b'DDS ':
        print("Error: Not a valid DDS file")
        return

    # Extract width and height from DDS header (offsets 12 and 16)
    height = struct.unpack('<I', dds_data[12:16])[0]
    width = struct.unpack('<I', dds_data[16:20])[0]
    
    # Pixel data starts after 128 bytes
    pixel_data = dds_data[128:]
    
    # IWI v8 Header (32 bytes)
    # 0-3: Magic 'iwi8'
    # 4: Format (0x01 = DXT1, 0x02 = DXT3, 0x03 = DXT5)
    # 5: Usage (0x02 seems standard for world textures)
    # 6-7: Width
    # 8-9: Height
    # ...
    
    format_map = {
        'dxt1': 0x01,
        'dxt3': 0x02,
        'dxt5': 0x03
    }
    
    iwi_header = bytearray(32)
    iwi_header[0:4] = b'iwi8'
    iwi_header[4] = format_map.get(format_type.lower(), 0x03)
    iwi_header[5] = 0x02 # Usage
    
    # Width and Height are uint16 in IWI
    struct.pack_into('<H', iwi_header, 6, width)
    struct.pack_into('<H', iwi_header, 8, height)
    
    # Mipmap count? Offset 12 seems to be mipmap count in some versions
    # For now we'll assume the DDS has whatever it has.
    
    # Some versions have the file size at offset 24 or similar
    # But for MW2, simple 32-byte header + data usually works.
    
    with open(iwi_path, 'wb') as f:
        f.write(iwi_header)
        f.write(pixel_data)

    print(f"Successfully converted {dds_path} to {iwi_path}")
    print(f"Dimensions: {width}x{height}, Format: {format_type}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 convert_to_iwi.py <input.dds> <output.iwi> [format]")
    else:
        fmt = sys.argv[3] if len(sys.argv) > 3 else 'dxt5'
        convert_dds_to_iwi(sys.argv[1], sys.argv[2], fmt)
