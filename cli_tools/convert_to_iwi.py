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
    # 0-3: Magic 'IWi\x08'
    # 4-7: Flags (e.g. 371 for DXT5)
    # 8-9: Format (11 = DXT1, 13 = DXT5)
    # 10-11: Width
    # 12-13: Height
    # 14-15: Depth (1)
    # 16-31: Mipmap Offsets
    
    fmt_val = 13 if format_type.lower() == 'dxt5' else 11
    
    iwi_header = bytearray(32)
    iwi_header[0:4] = b'IWi\x08'
    struct.pack_into('<I', iwi_header, 4, 371)
    struct.pack_into('<H', iwi_header, 8, fmt_val)
    struct.pack_into('<H', iwi_header, 10, width)
    struct.pack_into('<H', iwi_header, 12, height)
    struct.pack_into('<H', iwi_header, 14, 1)
    
    final_size = 32 + len(pixel_data)
    struct.pack_into('<I', iwi_header, 16, final_size)
    struct.pack_into('<I', iwi_header, 20, final_size)
    struct.pack_into('<I', iwi_header, 24, final_size)
    struct.pack_into('<I', iwi_header, 28, final_size)
    
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
