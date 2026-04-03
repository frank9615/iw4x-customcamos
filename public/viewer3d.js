import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let currentWeaponGroup = null; // Replaces single weaponMesh
let currentTexture = null;
let currentViewport = 'iso';
let currentModelRadius = 1.8;
let resizeObserver = null;

const BACKGROUND_PRESETS = {
    studio_dark: 0x0b0d12,
    sand: 0x8f7d63,
    snow: 0xbec8d4,
    forest: 0x2d3f35,
    urban: 0x4c535a
};

const CAMO_BLOCKED_TERMS = [
    'lens',
    'glass',
    'scope',
    'acog',
    'reticle',
    'optic',
    'laser',
    'thermal',
    'decal',
    'logo',
    'emblem',
    'rail',
    'muzzle',
    'suppressor',
    'silencer',
    'bolt',
    'trigger',
    'mag',
    'magazine',
    'clip',
    'ammo'
];

// Initialize the 3D Scene
export function initViewer3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Simulate loading engine is removed here, we only do it on texture change

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 4);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    applyBackgroundPreset('studio_dark');

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x00ff88, 0.5); // Greenish accent light
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Setup Model Switching
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            loadWeaponModel(e.target.value);
        });
    }

    // Load initial model (placeholder or intervention)
    loadWeaponModel(modelSelect ? modelSelect.value : 'intervention');

    // Setup Studio Controls
    const lightSlider = document.getElementById('light-slider');
    const lightVal = document.getElementById('light-val');
    if (lightSlider) {
        lightSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            renderer.toneMappingExposure = val;
            if (lightVal) lightVal.textContent = val.toFixed(1);
        });
    }

    const roughnessSlider = document.getElementById('roughness-slider');
    const roughnessVal = document.getElementById('roughness-val');
    if (roughnessSlider) {
        roughnessSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (currentWeaponGroup) {
                currentWeaponGroup.traverse((child) => {
                    if (child.isMesh && child.material) child.material.roughness = val;
                });
            }
            if (roughnessVal) roughnessVal.textContent = val.toFixed(2);
        });
    }

    const metalSlider = document.getElementById('metalness-slider');
    const metalnessVal = document.getElementById('metalness-val');
    if (metalSlider) {
        metalSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (currentWeaponGroup) {
                currentWeaponGroup.traverse((child) => {
                    if (!child.isMesh || !child.material) return;
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach((mat) => {
                        mat.metalness = val;
                    });
                });
            }
            if (metalnessVal) metalnessVal.textContent = val.toFixed(2);
        });
    }

    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const studioPanel = document.getElementById('studio-controls-panel');
    if (settingsToggleBtn && studioPanel) {
        settingsToggleBtn.addEventListener('click', () => {
            studioPanel.classList.toggle('hidden-panel');
        });
    }

    const backgroundSelect = document.getElementById('background-select');
    if (backgroundSelect) {
        backgroundSelect.addEventListener('change', (e) => {
            applyBackgroundPreset(e.target.value);
        });
    }

    const rotateToggle = document.getElementById('rotate-toggle');
    if (rotateToggle) {
        rotateToggle.checked = true;
        rotateToggle.addEventListener('change', (e) => {
            controls.autoRotate = Boolean(e.target.checked);
        });
    }

    const viewportSelect = document.getElementById('viewport-select');
    if (viewportSelect) {
        viewportSelect.addEventListener('change', (e) => {
            currentViewport = e.target.value;
            applyViewportPreset(currentViewport);
        });
    }

    // Reset Studio Defaults
    const resetStudioBtn = document.getElementById('reset-studio-btn');
    if (resetStudioBtn) {
        resetStudioBtn.addEventListener('click', () => {
            if (lightSlider) { lightSlider.value = 1.2; lightSlider.dispatchEvent(new Event('input')); }
            if (roughnessSlider) { roughnessSlider.value = 0.4; roughnessSlider.dispatchEvent(new Event('input')); }
            if (metalSlider) { metalSlider.value = 0.6; metalSlider.dispatchEvent(new Event('input')); }
            if (backgroundSelect) {
                backgroundSelect.value = 'studio_dark';
                backgroundSelect.dispatchEvent(new Event('change'));
            }
            if (rotateToggle) {
                rotateToggle.checked = true;
                rotateToggle.dispatchEvent(new Event('change'));
            }
            if (viewportSelect) {
                viewportSelect.value = 'iso';
                viewportSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    // Handle Resize
    const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        recenterView();
    };

    window.addEventListener('resize', handleResize);
    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
    }

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    applyViewportPreset(currentViewport);
    animate();
}

function applyBackgroundPreset(presetName) {
    const colorHex = BACKGROUND_PRESETS[presetName] ?? BACKGROUND_PRESETS.studio_dark;
    const color = new THREE.Color(colorHex);
    scene.background = color;
    if (renderer) renderer.setClearColor(color, 1);
}

function getModelRadius() {
    if (!currentWeaponGroup) return currentModelRadius;
    const box = new THREE.Box3().setFromObject(currentWeaponGroup);
    if (box.isEmpty()) return currentModelRadius;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    return Math.max(sphere.radius, 0.6);
}

function recenterView() {
    if (!camera || !controls) return;
    currentModelRadius = getModelRadius();
    controls.target.set(0, 0, 0);
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-5) {
        direction.set(1, 0.35, 1);
    }
    direction.normalize();
    const distance = Math.max(currentModelRadius * 2.65, 2.4);
    camera.position.copy(direction.multiplyScalar(distance));
    camera.lookAt(controls.target);
    controls.minDistance = Math.max(currentModelRadius * 1.1, 1.6);
    controls.maxDistance = Math.max(currentModelRadius * 6.0, 8.0);
}

function applyViewportPreset(viewport) {
    if (!camera || !controls) return;

    currentModelRadius = getModelRadius();
    const distance = Math.max(currentModelRadius * 2.7, 2.4);
    const presets = {
        iso: new THREE.Vector3(distance, distance * 0.4, distance),
        front: new THREE.Vector3(0, distance * 0.12, distance),
        right: new THREE.Vector3(distance, distance * 0.12, 0),
        left: new THREE.Vector3(-distance, distance * 0.12, 0),
        top: new THREE.Vector3(0, distance, 0.0001)
    };

    const targetPos = presets[viewport] ?? presets.iso;
    controls.target.set(0, 0, 0);
    camera.position.copy(targetPos);
    camera.lookAt(controls.target);
    controls.minDistance = Math.max(currentModelRadius * 1.1, 1.6);
    controls.maxDistance = Math.max(currentModelRadius * 6.0, 8.0);
    controls.update();
}

function shouldApplyCamo(mesh, material) {
    if (!material) return false;
    if (mesh?.isDecoration || mesh?.userData?.noCamo) return false;
    const meshName = String(mesh?.name || '').toLowerCase();
    const matName = String(material?.name || '').toLowerCase();
    const fullName = `${meshName} ${matName}`;
    for (const blocked of CAMO_BLOCKED_TERMS) {
        if (fullName.includes(blocked)) return false;
    }
    return true;
}

function getIw4xStyleRepeat(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z, 0.1);
    const shortest = Math.max(Math.min(size.x, size.y, size.z), 0.05);

    // Mimics how IW4x/MW2 camos tile densely on weapon surfaces, with adaptive scaling by mesh size.
    const repeatX = THREE.MathUtils.clamp(longest * 5.5, 3.0, 14.0);
    const repeatY = THREE.MathUtils.clamp(shortest * 9.0, 2.0, 12.0);
    return { repeatX, repeatY };
}

function loadWeaponModel(type) {
    if (currentWeaponGroup) {
        scene.remove(currentWeaponGroup);
        currentWeaponGroup = null;
    }

    if (type === 'placeholder') {
        createPlaceholderWeapon();
        return;
    }

    const loader = new GLTFLoader();
    const loadingElem = document.getElementById('viewer-loading');
    const loadingText = document.getElementById('viewer-loading-text');
    const loadingFill = document.getElementById('viewer-progress-fill');

    if (loadingElem && loadingText && loadingFill) {
        loadingText.textContent = "LOADING 3D MODEL...";
        loadingElem.style.display = 'flex';
        loadingFill.style.width = '0%';
    }

    loader.load(
        `models/${type}.glb`,
        function (gltf) {
            currentWeaponGroup = gltf.scene;

            // Auto-Scale the model to fit safely within the camera view
            const box = new THREE.Box3().setFromObject(currentWeaponGroup);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const targetSize = 3.8; // Zoomed out slightly more
                const scaleRatio = targetSize / maxDim;
                currentWeaponGroup.scale.set(scaleRatio, scaleRatio, scaleRatio);
            }

            // Center the model in the view AFTER scaling
            const newBox = new THREE.Box3().setFromObject(currentWeaponGroup);
            const center = newBox.getCenter(new THREE.Vector3());
            currentWeaponGroup.position.sub(center);

            currentWeaponGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => {
                        if (!shouldApplyCamo(child, m)) return;

                        m.metalness = parseFloat(document.getElementById('metalness-slider')?.value || 0.6);
                        m.roughness = parseFloat(document.getElementById('roughness-slider')?.value || 0.4);
                        m.needsUpdate = true;
                    });
                }
            });

            // Re-apply texture immediately if one was already generated!
            if (currentTexture) {
                actuallyApplyTexture(null, true);
            }

            scene.add(currentWeaponGroup);
            currentModelRadius = getModelRadius();
            applyViewportPreset(currentViewport);

            if (loadingElem) {
                loadingFill.style.width = '100%';
                setTimeout(() => { loadingElem.style.display = 'none'; }, 300);
            }
        },
        function (xhr) {
            if (loadingFill && xhr.total > 0) {
                loadingFill.style.width = `${(xhr.loaded / xhr.total) * 100}%`;
            }
        },
        function (error) {
            console.error('Error loading model:', error);
            createPlaceholderWeapon(); // Fallback
            if (loadingElem) loadingElem.style.display = 'none';
        }
    );
}

function createPlaceholderWeapon() {
    const group = new THREE.Group();

    // Base material (This will receive the camo)
    const camoMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Set to white to receive map correctly
        roughness: parseFloat(document.getElementById('roughness-slider')?.value || 0.4),
        metalness: parseFloat(document.getElementById('metalness-slider')?.value || 0.6),
        name: "mtl_placeholder_body"
    });

    // Parts setup
    const bodyGeometry = new THREE.BoxGeometry(2.5, 0.4, 0.2);
    const body = new THREE.Mesh(bodyGeometry, camoMaterial);

    // Non-camo material for other parts (like scope/barrel)
    const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.7,
        metalness: 0.8,
        name: "mtl_placeholder_scope"
    });

    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
    const barrel = new THREE.Mesh(barrelGeometry, darkMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(1.5, 0, 0);

    const scopeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 16);
    const scope = new THREE.Mesh(scopeGeometry, darkMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0, 0.3, 0);

    const stockGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.15);
    const stock = new THREE.Mesh(stockGeometry, darkMaterial);
    stock.position.set(-1.2, -0.15, 0);

    const magGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.15);
    const mag = new THREE.Mesh(magGeometry, darkMaterial);
    mag.position.set(0.2, -0.3, 0);
    mag.name = 'magazine';
    mag.userData.noCamo = true;

    group.add(body);
    group.add(barrel);
    group.add(scope);
    group.add(stock);
    group.add(mag);

    currentWeaponGroup = group;
    // We hackily map everything so loops down the line can work with this dummy
    currentWeaponGroup.traverse((child) => { if (child.isMesh && child.material === darkMaterial) child.isDecoration = true; });

    scene.add(group);
    currentModelRadius = getModelRadius();
    applyViewportPreset(currentViewport);

    if (currentTexture) {
        actuallyApplyTexture(null, true);
    }
}

// Function to simulate a load and then attach newly generated camo texture dynamically
export function updateCamoTexture(imageUrl) {
    const loadingElem = document.getElementById('viewer-loading');
    const loadingFill = document.getElementById('viewer-progress-fill');
    const loadingText = document.getElementById('viewer-loading-text');

    if (loadingElem && loadingFill && loadingText) {
        // Avvia caricamento fittizio per dare l'effetto premium
        loadingText.textContent = "APPLYING MATERIAL...";
        loadingElem.style.display = 'flex';
        loadingFill.style.width = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 15 + Math.random() * 25;

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                // Fine caricamento: mostriamo realmente la mimetica
                actuallyApplyTexture(imageUrl);

                setTimeout(() => { loadingElem.style.display = 'none'; }, 600);
            }
            loadingFill.style.width = progress + '%';
        }, 150);
    } else {
        actuallyApplyTexture(imageUrl);
    }
}

function actuallyApplyTexture(imageUrl, isReapply = false) {
    if (!isReapply && currentTexture) {
        currentTexture.dispose();
    }

    const applyToWeapon = (tex) => {
        if (!currentWeaponGroup) return; // Safely exit if model is still loading

        currentWeaponGroup.traverse((child) => {
            if (child.isMesh && child.material && !child.isDecoration) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                    if (!shouldApplyCamo(child, m)) return;

                    const isPlaceholder = document.getElementById('model-select')?.value === 'placeholder';
                    const materialTex = isPlaceholder ? tex : tex.clone();

                    if (m.map && m.map !== tex) {
                        m.map.dispose();
                    }

                    materialTex.wrapS = THREE.RepeatWrapping;
                    materialTex.wrapT = THREE.RepeatWrapping;
                    materialTex.flipY = isPlaceholder;
                    materialTex.colorSpace = THREE.SRGBColorSpace;
                    if (isPlaceholder) {
                        materialTex.repeat.set(2, 0.5);
                    } else {
                        const { repeatX, repeatY } = getIw4xStyleRepeat(child);
                        materialTex.repeat.set(repeatX, repeatY);
                    }

                    m.color.setHex(0xffffff); // Must be white to reveal texture
                    m.map = materialTex;
                    m.needsUpdate = true;
                });
            }
        });
    };

    if (isReapply && currentTexture) {
        applyToWeapon(currentTexture);
        return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        currentTexture = texture;
        applyToWeapon(texture);
    });
}
