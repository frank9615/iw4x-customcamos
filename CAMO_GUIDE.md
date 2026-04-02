# IW4X Custom Camo Creation Guide

This document describes the research, process, and tools used to create a custom weapon camouflage for IW4X (Modern Warfare 2).

## Research & Technical Details

### File Format: IWI Version 8
The Infinity Ward engine uses the proprietary `.iwi` format for textures. For MW2 (IW4), the engine expects **Version 8**.
Through reverse engineering of the community tools, the IWI v8 header was found to be 32 bytes long:

| Offset | Size | Name | Description |
| :--- | :--- | :--- | :--- |
| 0 | 4 | Magic | `IWi\x08` (hex: 49 57 69 08) |
| 4 | 4 | Flags | Operational values (e.g. `371` or `0x0173` for DXT5) |
| 8 | 2 | Format | Format ID (`11` or `0x0B` for DXT1, `13` or `0x0D` for DXT5) |
| 10 | 2 | Width | Texture width (little-endian uint16) |
| 12 | 2 | Height | Texture height (little-endian uint16) |
| 14 | 2 | Depth | Typically `1` for camouflages |
| 16 | 16 | MipOff | 4 32-bit integer values (offsets). Points to EOF if no mipmaps |

### Texture Compression
The game prefers **DXT** (S3TC) compression for performance. We used **DXT5** for this camo to support potential transparency and higher detail, although DXT1 is also common for simple textures.

## The Automated Workflow (Recommended)

I have created a single script that automates the whole process (ImageMagick + Python):

```bash
cd cli_tools
python make_iwi.py <input_image> <output_file.iwi>
```

The script handles:
1.  **DDS Conversion**: Uses `magick` to convert your image to DDS with DXT5 compression and mipmap generation.
2.  **IWI v8 Header**: Extracts the pixels and inserts the correct `iwi8` header.
3.  **Cleanup**: Removes temporary files.

## Hand-made Workflow (For reference)

1.  **AI Generation**: Generates a seamless 1024x1024 pattern.
2.  **DDS Conversion**: Uses ImageMagick (`magick`) for compression.
    - Command: `magick input.png -define dds:compression=dxt5 output.dds`
3.  **IWI Wrap**: Python script (`convert_to_iwi.py`) to add the IWI v8 header.

## Windows Setup

If you are on Windows, follow these steps:
1.  **Install Python 3**: From the [official website](https://www.python.org/downloads/) or the Microsoft Store.
2.  **Install ImageMagick**: From [here](https://imagemagick.org/script/download.php). **IMPORTANT**: During installation, check the box **"Add application directory to your system PATH"**.
3.  **Open the Terminal**: Use `PowerShell` or `cmd` in your files directory and run the script normally.

## How to use the Camo

1.  **Locate IW4X Folder**: Vai nella cartella di installazione di IW4X.
2.  **Create Directory**: Vai in `userraw/images/`.
3.  **Install File**: Copia il file generato (es. `weapon_camo_gold.iwi`) lì dentro.
    - Common filenames to replace:
        - `weapon_camo_gold.iwi`
        - `weapon_camo_arctic.iwi`
        - `weapon_camo_red_urban.iwi`
        - `weapon_camo_blue_tiger.iwi`
4.  **Launch Game**: Start IW4X. The new texture will automatically override the default one.

## Tools Used
- **ImageMagick**: Image processing and DDS encoding.
- **Python 3**: Header manipulation and file assembly.
- **AI Image Generator**: Content creation.
