import { initializeImageMagick, ImageMagick, MagickFormat } from 'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.38/dist/index.min.js';
import { initViewer3D, updateCamoTexture } from './viewer3d.js';

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const statusSection = document.getElementById('status-section');
const downloadSection = document.getElementById('download-section');
const imagePreview = document.getElementById('image-preview');
const fileNameLabel = document.getElementById('file-name');
const fileResLabel = document.getElementById('file-res');
const convertBtn = document.getElementById('convert-btn');
const extractBtn = document.getElementById('extract-btn');
const downloadBtn = document.getElementById('download-btn');
const downloadPngBtn = document.getElementById('download-png-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMsg = document.getElementById('status-msg');
const pageBody = document.body;
const iwiMetadataBox = document.getElementById('iwi-metadata');
const iwiMetaMagic = document.getElementById('iwi-meta-magic');
const iwiMetaVersion = document.getElementById('iwi-meta-version');
const iwiMetaFormat = document.getElementById('iwi-meta-format');
const iwiMetaDimensions = document.getElementById('iwi-meta-dimensions');
const iwiMetaDepth = document.getElementById('iwi-meta-depth');
const iwiMetaFlags = document.getElementById('iwi-meta-flags');
const iwiMetaMips = document.getElementById('iwi-meta-mips');
const iwiMetaData = document.getElementById('iwi-meta-data');
const iwiMetaTotal = document.getElementById('iwi-meta-total');
const iwiMetaAlpha = document.getElementById('iwi-meta-alpha');

// Mode Switch Elements
const modeCreate = document.getElementById('mode-create');
const modeExtract = document.getElementById('mode-extract');
const dropText = document.querySelector('.drop-zone-content p');
const dropHint = document.querySelector('.formats-hint');

// Result Elements
const resultFilename = document.getElementById('result-filename');
const resultSize = document.getElementById('result-size');

const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const errorOverlay = document.getElementById('error-overlay');
const errorMsg = document.getElementById('error-msg');
const errorClose = document.getElementById('error-close');
const camoNameSelect = document.getElementById('camo-name-select');
const camoNameSelectionGroup = document.getElementById('camo-name-selection');

let currentFile = null;
let outBlob = null; // Can be a zip blob or png blob depending on op
let outFilename = "";
let initialized = false;
let viewerInitialized = false;
let currentPreviewObjectUrl = null;
let currentIwiMeta = null;

function showViewer() {
    document.getElementById('viewer-3d-wrapper').classList.remove('hidden');
    pageBody.classList.add('viewer-active');
    if (!viewerInitialized) {
        initViewer3D('viewer-3d-container');
        viewerInitialized = true;
    }
}

function clearPreviewObjectUrl() {
    if (currentPreviewObjectUrl) {
        URL.revokeObjectURL(currentPreviewObjectUrl);
        currentPreviewObjectUrl = null;
    }
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
}

function formatHex(value, width = 8) {
    return `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;
}

function parseIwiHeader(arrayBuffer) {
    if (arrayBuffer.byteLength < 32) {
        throw new Error('IWI header is too small (expected at least 32 bytes).');
    }

    const view = new DataView(arrayBuffer);
    const m0 = view.getUint8(0);
    const m1 = view.getUint8(1);
    const m2 = view.getUint8(2);
    const versionByte = view.getUint8(3);
    const magic = String.fromCharCode(m0, m1, m2);

    if (magic !== 'IWi' || versionByte !== 8) {
        throw new Error('The file does not contain a valid IWi8 signature.');
    }

    const flags = view.getUint32(4, true);
    const formatId = view.getUint16(8, true);
    const width = view.getUint16(10, true);
    const height = view.getUint16(12, true);
    const depth = view.getUint16(14, true);
    const mipOffsets = [
        view.getUint32(16, true),
        view.getUint32(20, true),
        view.getUint32(24, true),
        view.getUint32(28, true)
    ];

    const formatMap = {
        11: { name: 'DXT1', alpha: 'No/1-bit' },
        13: { name: 'DXT5', alpha: 'Yes' }
    };
    const mapped = formatMap[formatId] || { name: `Unknown (${formatId})`, alpha: 'Unknown' };

    return {
        magic: `${magic}${String.fromCharCode(versionByte)}`,
        version: versionByte,
        flags,
        formatId,
        formatName: mapped.name,
        width,
        height,
        depth,
        mipOffsets,
        payloadSize: Math.max(0, arrayBuffer.byteLength - 32),
        totalSize: arrayBuffer.byteLength,
        alpha: mapped.alpha
    };
}

function renderIwiMetadata(meta) {
    if (!iwiMetadataBox) return;
    iwiMetaMagic.textContent = meta.magic;
    iwiMetaVersion.textContent = String(meta.version);
    iwiMetaFormat.textContent = `${meta.formatName} (ID ${meta.formatId})`;
    iwiMetaDimensions.textContent = `${meta.width} x ${meta.height}`;
    iwiMetaDepth.textContent = String(meta.depth);
    iwiMetaFlags.textContent = formatHex(meta.flags);
    iwiMetaMips.textContent = meta.mipOffsets.map((offset) => formatHex(offset)).join(' / ');
    iwiMetaData.textContent = formatBytes(meta.payloadSize);
    iwiMetaTotal.textContent = formatBytes(meta.totalSize);
    iwiMetaAlpha.textContent = meta.alpha;
    iwiMetadataBox.classList.remove('hidden');
}

function hideIwiMetadata() {
    if (!iwiMetadataBox) return;
    iwiMetadataBox.classList.add('hidden');
}

async function decodeIwiArrayBufferToPng(arrayBuffer, headerMeta) {
    await initMagick();

    if (headerMeta.formatId !== 11 && headerMeta.formatId !== 13) {
        throw new Error('Unsupported compression (supported: DXT1 and DXT5).');
    }

    const isDxt1 = headerMeta.formatId === 11;
    const pixelData = new Uint8Array(arrayBuffer.slice(32));

    const ddsHeader = new ArrayBuffer(128);
    const ddsView = new DataView(ddsHeader);
    ddsView.setUint32(0, 0x20534444, true);
    ddsView.setUint32(4, 124, true);
    ddsView.setUint32(8, 0x1 | 0x2 | 0x4 | 0x1000 | 0x80000, true);
    ddsView.setUint32(12, headerMeta.height, true);
    ddsView.setUint32(16, headerMeta.width, true);
    ddsView.setUint32(20, pixelData.byteLength, true);
    ddsView.setUint32(76, 32, true);
    ddsView.setUint32(80, 0x4, true);
    ddsView.setUint32(84, isDxt1 ? 0x31545844 : 0x35545844, true);
    ddsView.setUint32(108, 0x1000, true);

    const ddsFile = new Uint8Array(128 + pixelData.byteLength);
    ddsFile.set(new Uint8Array(ddsHeader), 0);
    ddsFile.set(pixelData, 128);

    return await new Promise((resolve) => {
        ImageMagick.read(ddsFile, (img) => {
            img.write(MagickFormat.Png, (pngData) => {
                resolve(new Blob([pngData], { type: 'image/png' }));
            });
        });
    });
}

// Progress Utils
function updateProgress(percent, msg) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
    if (msg) statusMsg.textContent = msg;
}

function showError(msg) {
    statusSection.classList.add('hidden');
    errorOverlay.classList.remove('hidden');
    errorMsg.textContent = msg;
}

errorClose.addEventListener('click', () => {
    errorOverlay.classList.add('hidden');
    resetUI();
});

// Initialize ImageMagick
async function initMagick() {
    if (initialized) return;

    updateProgress(10, "Downloading WASM Engine...");

    try {
        const wasmUrl = 'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.38/dist/magick.wasm';
        const response = await fetch(wasmUrl);
        if (!response.ok) throw new Error(`Unable to download .wasm file`);
        const wasmBytes = await response.arrayBuffer();
        if (wasmBytes.byteLength === 0) throw new Error("The downloaded .wasm file is empty.");

        await initializeImageMagick(new Uint8Array(wasmBytes));
        initialized = true;
        updateProgress(30, "WASM Engine Loaded.");
    } catch (err) {
        console.error('Initialization error:', err);
        showError(`INITIALIZATION_FAILED: ${err.message}`);
        throw err;
    }
}

// Mode Switch Logic
let isExtractMode = false;

modeCreate.addEventListener('click', () => {
    isExtractMode = false;
    modeCreate.classList.add('active');
    modeExtract.classList.remove('active');
    fileInput.accept = 'image/*';
    dropText.innerHTML = `Drag your image or <span class="highlight">browse</span>`;
    dropHint.textContent = 'PNG • JPG • WEBP • BMP';
    if (camoNameSelectionGroup) camoNameSelectionGroup.classList.remove('hidden');
    resetUI();
});

modeExtract.addEventListener('click', () => {
    isExtractMode = true;
    modeExtract.classList.add('active');
    modeCreate.classList.remove('active');
    fileInput.accept = '.iwi';
    dropText.innerHTML = `Drag your .IWI file or <span class="highlight">browse</span>`;
    dropHint.textContent = 'IWI VERSION 8 FILES';
    if (camoNameSelectionGroup) camoNameSelectionGroup.classList.add('hidden');
    resetUI();
});

// Drag & Drop
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

async function handleFile(file) {
    currentFile = file;
    fileNameLabel.textContent = file.name;

    const isIwi = file.name.toLowerCase().endsWith('.iwi');

    if (isIwi) {
        convertBtn.classList.add('hidden');
        extractBtn.classList.remove('hidden');
        if (camoNameSelectionGroup) camoNameSelectionGroup.classList.add('hidden');
        fileResLabel.textContent = 'Reading IWI...';
        dropZone.classList.add('hidden');
        previewSection.classList.remove('hidden');
        showViewer();

        try {
            const arrayBuffer = await file.arrayBuffer();
            if (currentFile !== file) return;

            currentIwiMeta = parseIwiHeader(arrayBuffer);
            renderIwiMetadata(currentIwiMeta);

            const pngBlob = await decodeIwiArrayBufferToPng(arrayBuffer, currentIwiMeta);
            if (currentFile !== file) return;

            clearPreviewObjectUrl();
            currentPreviewObjectUrl = URL.createObjectURL(pngBlob);
            imagePreview.src = currentPreviewObjectUrl;
            updateCamoTexture(currentPreviewObjectUrl);

            fileResLabel.textContent = `${currentIwiMeta.width}x${currentIwiMeta.height} • ${currentIwiMeta.formatName}`;
            outBlob = pngBlob;
            outFilename = currentFile.name.replace(/\.iwi$/i, '.png');
            resultFilename.textContent = outFilename;
            resultSize.textContent = formatBytes(outBlob.size);
        } catch (err) {
            showError(`IWI_PREVIEW_FAILED: ${err.message}`);
        }
    } else if (file.type.startsWith('image/')) {
        convertBtn.classList.remove('hidden');
        extractBtn.classList.add('hidden');
        if (camoNameSelectionGroup) camoNameSelectionGroup.classList.remove('hidden');
        hideIwiMetadata();
        currentIwiMeta = null;
        const reader = new FileReader();
        reader.onload = (e) => {
            clearPreviewObjectUrl();
            imagePreview.src = e.target.result;
            const img = new Image();
            img.onload = () => { fileResLabel.textContent = `${img.width}x${img.height}`; };
            img.src = e.target.result;
            dropZone.classList.add('hidden');
            previewSection.classList.remove('hidden');
            showViewer();

            // UPDATE 3D PREVIEW AFTER ENGINE IS INITIALIZED
            updateCamoTexture(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        showError("FORMAT_ERROR: The file is not an image or .iwi");
    }
}

// Convert IWI to Image
extractBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    if (outBlob && outFilename.toLowerCase().endsWith('.png')) {
        downloadSection.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        downloadPngBtn.classList.remove('hidden');
        extractBtn.classList.add('hidden');
        return;
    }

    previewSection.classList.add('hidden');
    statusSection.classList.remove('hidden');

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        currentIwiMeta = parseIwiHeader(arrayBuffer);
        renderIwiMetadata(currentIwiMeta);

        updateProgress(70, 'Decoding IWI texture...');
        outBlob = await decodeIwiArrayBufferToPng(arrayBuffer, currentIwiMeta);
        outFilename = currentFile.name.replace(/\.iwi$/i, '.png');

        resultFilename.textContent = outFilename;
        resultSize.textContent = formatBytes(outBlob.size);

        clearPreviewObjectUrl();
        currentPreviewObjectUrl = URL.createObjectURL(outBlob);
        imagePreview.src = currentPreviewObjectUrl;
        updateCamoTexture(currentPreviewObjectUrl);

        fileResLabel.textContent = `${currentIwiMeta.width}x${currentIwiMeta.height} • ${currentIwiMeta.formatName}`;

        updateProgress(100, 'Decoding Complete!');

        setTimeout(() => {
            statusSection.classList.add('hidden');
            previewSection.classList.remove('hidden');
            extractBtn.classList.add('hidden');
            downloadSection.classList.remove('hidden');
            downloadBtn.classList.add('hidden');
            downloadPngBtn.classList.remove('hidden');
        }, 350);

    } catch (err) {
        showError(`EXTRACT_FAILED: ${err.message}`);
    }
});

// ZIP Gen logic
convertBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    previewSection.classList.add('hidden');
    statusSection.classList.remove('hidden');

    const generateMenu = document.getElementById('generate-menu-checkbox')?.checked ?? true;
    const isMaxRes = document.getElementById('max-res-checkbox')?.checked ?? false;

    try {
        await initMagick();
        updateProgress(40, "Generating Canvas...");

        // 1. Draw image to canvas
        const objectUrl = URL.createObjectURL(currentFile);
        const img = new Image();
        img.src = objectUrl;
        await new Promise(r => { img.onload = r; });

        const targetWidth = isMaxRes ? img.width : 400;
        const targetHeight = isMaxRes ? img.height : 400;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth; canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        let menuCanvas, menuCtx;
        const menuHeight = isMaxRes ? targetHeight : 152;

        if (generateMenu) {
            updateProgress(50, "Creating Menu Image...");
            // 2. Draw Menu Image + borders
            menuCanvas = document.createElement('canvas');
            menuCanvas.width = targetWidth;
            menuCanvas.height = menuHeight;
            menuCtx = menuCanvas.getContext('2d');

            if (isMaxRes) {
                // No crop
                menuCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
            } else {
                // Crop centered vertically from 400x400 image
                const topY = (400 - 152) / 2;
                menuCtx.drawImage(canvas, 0, topY, 400, 152, 0, 0, 400, 152);
            }

            // Setup Instagram watermark
            menuCtx.font = "bold 20px 'Inter', sans-serif";
            menuCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
            menuCtx.textAlign = "right";
            menuCtx.textBaseline = "bottom";

            // Add shadow for better readability
            menuCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
            menuCtx.shadowBlur = 4;
            menuCtx.shadowOffsetX = 1;
            menuCtx.shadowOffsetY = 1;

            // Draw watermark at bottom right with padding
            menuCtx.fillText("@frahrdi", targetWidth - 10, menuHeight - 10);

            // Reset shadow so it doesn't affect further operations
            menuCtx.shadowColor = "transparent";
            menuCtx.shadowBlur = 0;
            menuCtx.shadowOffsetX = 0;
            menuCtx.shadowOffsetY = 0;
        }

        const getBlob = (cvs) => new Promise(res => cvs.toBlob(res, 'image/png'));
        const camoPngBlob = await getBlob(canvas);
        const menuPngBlob = generateMenu ? await getBlob(menuCanvas) : null;

        const getIwi = async (pngBlob, width, height) => {
            const buf = new Uint8Array(await pngBlob.arrayBuffer());
            return new Promise((resolve) => {
                ImageMagick.read(buf, (image) => {
                    image.settings.setDefine('dds', 'compression', 'dxt5');
                    image.settings.setDefine('dds', 'mipmaps', '1');
                    image.write(MagickFormat.Dds, (ddsData) => {
                        const iwiHeader = new ArrayBuffer(32);
                        const view = new DataView(iwiHeader);

                        view.setUint8(0, 73); view.setUint8(1, 87); view.setUint8(2, 105); view.setUint8(3, 8); // IWi\x08
                        view.setUint32(4, 371, true); // 0x0173 flags per DXT5 
                        view.setUint16(8, 13, true); // DXT5 Format ID
                        view.setUint16(10, width, true);
                        view.setUint16(12, height, true);
                        view.setUint16(14, 1, true); // Depth

                        const pixelData = ddsData.slice(128);
                        const finalSize = 32 + pixelData.byteLength;

                        // Mipmap offsets tutti alla fine
                        view.setUint32(16, finalSize, true);
                        view.setUint32(20, finalSize, true);
                        view.setUint32(24, finalSize, true);
                        view.setUint32(28, finalSize, true);

                        const finalFile = new Uint8Array(finalSize);
                        finalFile.set(new Uint8Array(iwiHeader), 0);
                        finalFile.set(pixelData, 32);
                        resolve(finalFile);
                    });
                });
            });
        };

        updateProgress(70, "Compressing IWI...");
        const camoIwiBytes = await getIwi(camoPngBlob, targetWidth, targetHeight);

        const baseName = currentFile.name.split('.')[0];
        const selectedCamo = camoNameSelect ? camoNameSelect.value : 'arctic';

        if (generateMenu) {
            updateProgress(80, "Compressing IWI Menu...");
            const menuIwiBytes = await getIwi(menuPngBlob, targetWidth, menuHeight);

            updateProgress(90, "Packaging ZIP...");
            const zip = new JSZip();

            zip.file(`weapon_camo_${selectedCamo}.iwi`, camoIwiBytes);
            zip.file(`weapon_camo_menu_${selectedCamo}.iwi`, menuIwiBytes);

            outBlob = await zip.generateAsync({ type: 'blob' });
            outFilename = `${baseName}_camo_pack.zip`;

            downloadBtn.innerHTML = `DOWNLOAD ZIP PACKAGE\n<div class="btn-shine"></div>`;
        } else {
            outBlob = new Blob([camoIwiBytes], { type: 'application/octet-stream' });
            outFilename = `weapon_camo_${selectedCamo}.iwi`;
            downloadBtn.innerHTML = `DOWNLOAD .IWI FILE\n<div class="btn-shine"></div>`;
        }

        resultFilename.textContent = outFilename;
        resultSize.textContent = `${(outBlob.size / 1024).toFixed(1)} KB`;

        updateProgress(100, "Complete!");

        setTimeout(() => {
            statusSection.classList.add('hidden');
            downloadSection.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            downloadPngBtn.classList.add('hidden');
        }, 500);

    } catch (err) {
        showError(`CONVERSION_FAILED: ${err.message}`);
    }
});

function triggerDownload() {
    if (!outBlob) return;
    const url = URL.createObjectURL(outBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

downloadBtn.addEventListener('click', triggerDownload);
downloadPngBtn.addEventListener('click', triggerDownload);

resetBtn.addEventListener('click', resetUI);
const restartPreviewBtn = document.getElementById('restart-preview-btn');
if (restartPreviewBtn) restartPreviewBtn.addEventListener('click', resetUI);

function resetUI() {
    currentFile = null;
    outBlob = null;
    outFilename = '';
    currentIwiMeta = null;
    clearPreviewObjectUrl();
    hideIwiMetadata();
    updateProgress(0, "Ready.");
    dropZone.classList.remove('hidden');
    previewSection.classList.add('hidden');
    document.getElementById('viewer-3d-wrapper').classList.add('hidden');
    pageBody.classList.remove('viewer-active');
    statusSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
    fileInput.value = '';
}
