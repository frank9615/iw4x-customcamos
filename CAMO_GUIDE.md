# IW4X Custom Camo Creation Guide

This document describes the research, process, and tools used to create a custom weapon camouflage for IW4X (Modern Warfare 2).

## Research & Technical Details

### File Format: IWI Version 8
The Infinity Ward engine uses the proprietary `.iwi` format for textures. For MW2 (IW4), the engine expects **Version 8**.
Through reverse engineering of the community tools, the IWI v8 header was found to be 32 bytes long:

| Offset | Size | Name | Description |
| :--- | :--- | :--- | :--- |
| 0 | 4 | Magic | Always `iwi8` |
| 4 | 1 | Format | `0x01`: DXT1, `0x02`: DXT3, `0x03`: DXT5 |
| 5 | 1 | Usage | Usually `0x02` for weapon textures |
| 6 | 2 | Width | Texture width (little-endian uint16) |
| 8 | 2 | Height | Texture height (little-endian uint16) |
| 10 | 22 | Padding | Extra header data (usually 0x00) |

### Texture Compression
The game prefers **DXT** (S3TC) compression for performance. We used **DXT5** for this camo to support potential transparency and higher detail, although DXT1 is also common for simple textures.

## The Automated Workflow (Recommended)

Ho creato uno script unico che automatizza tutto il processo (ImageMagick + Python):

```bash
python3 make_iwi.py <immagine_input> <file_output.iwi>
```

Lo script si occupa di:
1.  **DDS Conversion**: Usa `magick` per convertire la tua immagine in DDS con compressione DXT5 e generazione di mipmap.
2.  **IWI v8 Header**: Estrae i pixel e inserisce l'header `iwi8` corretto.
3.  **Cleanup**: Rimuove i file temporanei.

## Hand-made Workflow (Per riferimento)

1.  **AI Generation**: Generazione di un pattern seamless 1024x1024.
2.  **DDS Conversion**: Uso di ImageMagick (`magick`) per la compressione.
    - Comando: `magick input.png -define dds:compression=dxt5 output.dds`
3.  **IWI Wrap**: Script Python (`convert_to_iwi.py`) per aggiungere l'header IWI v8.

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
