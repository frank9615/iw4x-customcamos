import { initializeImageMagick, ImageMagick, MagickFormat } from 'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.38/dist/index.min.js';

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
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMsg = document.getElementById('status-msg');

// Result Elements
const resultFilename = document.getElementById('result-filename');
const resultSize = document.getElementById('result-size');

// New Elements
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const errorOverlay = document.getElementById('error-overlay');
const errorMsg = document.getElementById('error-msg');
const errorClose = document.getElementById('error-close');

let currentFile = null;
let iwiBlob = null;
let initialized = false;

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
    
    updateProgress(10, "Scaricamento Motore WASM...");
    
    try {
        const wasmUrl = 'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.38/dist/magick.wasm';
        
        // Fetch check to avoid "empty buffer" error
        const response = await fetch(wasmUrl);
        if (!response.ok) throw new Error(`Impossibile scaricare il file .wasm (${response.status}). Assicurati di usare un server locale (es. run_test.py).`);
        
        const wasmBytes = await response.arrayBuffer();
        if (wasmBytes.byteLength === 0) throw new Error("Il file .wasm scaricato è vuoto. Problema di rete o CORS.");

        await initializeImageMagick(new Uint8Array(wasmBytes));
        initialized = true;
        updateProgress(30, "Motore WASM Caricato.");
        console.log('MagickWasm 0.0.38 Initialized');
    } catch (err) {
        console.error('Initialization error:', err);
        showError(`INITIALIZATION_FAILED: ${err.message}`);
        throw err;
    }
}

// Drag & Drop Handlers
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showError("FORMAT_ERROR: Il file selezionato non è un'immagine valida.");
        return;
    }
    currentFile = file;
    fileNameLabel.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        const img = new Image();
        img.onload = () => {
            fileResLabel.textContent = `${img.width}x${img.height}`;
        };
        img.src = e.target.result;
        
        dropZone.classList.add('hidden');
        previewSection.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Conversion Logic
convertBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    previewSection.classList.add('hidden');
    statusSection.classList.remove('hidden');
    
    try {
        await initMagick();
        
        updateProgress(40, "Lettura dati immagine...");
        const arrayBuffer = await currentFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        ImageMagick.read(uint8Array, (image) => {
            updateProgress(60, "Compressione DXT5 (DDS)...");
            
            // Texture encoding settings
            image.settings.setDefine('dds', 'compression', 'dxt5');
            image.settings.setDefine('dds', 'mipmaps', '1');
            
            const width = image.width;
            const height = image.height;

            updateProgress(80, "Generazione Binary IWI v8...");
            image.write(MagickFormat.Dds, (ddsData) => {
                
                const iwiHeader = new ArrayBuffer(32);
                const view = new DataView(iwiHeader);
                
                // header 'iwi8'
                view.setUint8(0, 105); // i
                view.setUint8(1, 119); // w
                view.setUint8(2, 105); // i
                view.setUint8(3, 56);  // 8
                
                view.setUint8(4, 3);   // Format: DXT5
                view.setUint8(5, 2);   // Usage: Texture
                
                view.setUint16(6, width, true);
                view.setUint16(8, height, true);
                
                // Pixel data after DDS 128 header
                const pixelData = ddsData.slice(128);
                
                const finalFile = new Uint8Array(32 + pixelData.length);
                finalFile.set(new Uint8Array(iwiHeader), 0);
                finalFile.set(pixelData, 32);
                
                // Update Result UI
                const finalName = currentFile.name.split('.')[0] + '.iwi';
                const finalSizeKB = (finalFile.byteLength / 1024).toFixed(1);
                
                resultFilename.textContent = finalName;
                resultSize.textContent = `${finalSizeKB} KB`;
                
                iwiBlob = new Blob([finalFile], { type: 'application/octet-stream' });
                
                updateProgress(100, "Completato!");
                
                setTimeout(() => {
                    statusSection.classList.add('hidden');
                    downloadSection.classList.remove('hidden');
                }, 500);
            });
        });
    } catch (err) {
        console.error('Conversion process error:', err);
        showError(`CONVERSION_FAILED: ${err.message}`);
    }
});

downloadBtn.addEventListener('click', () => {
    if (!iwiBlob) return;
    const url = URL.createObjectURL(iwiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name.split('.')[0] + '.iwi';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', resetUI);

function resetUI() {
    currentFile = null;
    iwiBlob = null;
    updateProgress(0, "Pronto.");
    dropZone.classList.remove('hidden');
    previewSection.classList.add('hidden');
    statusSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
    fileInput.value = '';
}
