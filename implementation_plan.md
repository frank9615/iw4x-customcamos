# IW4X Custom Camo Implementation Plan

Create a custom, high-visibility camouflage texture for IW4X by generating a vibrant image and encoding it into the game's native `.iwi` format.

## User Review Required

> [!IMPORTANT]
> The `.iwi` format is proprietary. I will be using a reverse-engineered header structure for Version 8 (Modern Warfare 2). This should work on standard IW4X clients.

> [!NOTE]
> The camo must replace an existing one or be loaded as a new asset. I will name the file so it replaces the "Gold" or "Red Urban" camo (or another standard one) for easy testing, or simply provide it as `custom_camo.iwi` for the user to use as they wish.

## Proposed Changes

### [Camo Generation]
- Generate a 1024x1024 high-visibility (flashy) pattern using `generate_image`.

### [Tools and Scripts]
- **ImageMagick (`magick`)**: Used to convert the generated PNG to `.dds` (DirectDraw Surface) with DXT5 compression.
- **Python Script (`convert_to_iwi.py`)**: A custom script to prepend the 32-byte IWI v8 header to the DDS data.

### [Documentation]
- **[NEW] [CAMO_GUIDE.md](file:///Users/fra/Desktop/iw4x-customcamos/CAMO_GUIDE.md)**: Detailed documentation of the process, research, and usage instructions.

## Open Questions

- **Texture Replacement**: Which specific camo should this replace? (e.g., `weapon_camo_gold.iwi`, `weapon_camo_arctic.iwi`). If you don't care, I'll use a generic name or a common replacement target.

## Verification Plan

### Automated Tests
- Verify the generated `.iwi` file size (Header size + DDS payload size).
- Check the IWI header magic bytes (`iwi8`) via `hexdump`.

### Manual Verification
- The user will need to place the file in `userraw/images/` and check in-game.
