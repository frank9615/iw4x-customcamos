import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let weaponMesh; // The main mesh we will apply the texture to
let currentTexture = null;

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
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

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

    // Placeholder Mesh (A stylized "weapon" shape)
    createPlaceholderWeapon();

    // Handle Resize
    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

function createPlaceholderWeapon() {
    const group = new THREE.Group();

    // Base material (This will receive the camo)
    const camoMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.4,
        metalness: 0.6,
    });

    // Parts setup
    const bodyGeometry = new THREE.BoxGeometry(2.5, 0.4, 0.2);
    const body = new THREE.Mesh(bodyGeometry, camoMaterial);
    
    // Non-camo material for other parts (like scope/barrel)
    const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.7,
        metalness: 0.8
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

    group.add(body);
    group.add(barrel);
    group.add(scope);
    group.add(stock);
    group.add(mag);

    // Save reference to the body mesh so we can change its material later
    weaponMesh = body; 

    scene.add(group);
}

// Function to simulate a load and then attach newly generated camo texture dynamically
export function updateCamoTexture(imageUrl) {
    if (!weaponMesh) return;

    const loadingElem = document.getElementById('viewer-loading');
    const loadingFill = document.getElementById('viewer-progress-fill');
    const loadingText = document.getElementById('viewer-loading-text');

    if (loadingElem && loadingFill && loadingText) {
        // Avvia caricamento fittizio per dare l'effetto premium
        loadingText.textContent = "APPLICAZIONE MIMETICA IN CORSO...";
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

function actuallyApplyTexture(imageUrl) {
    if (currentTexture) {
        currentTexture.dispose();
    }
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 0.5); // Adjust for the placeholder body shape
        texture.colorSpace = THREE.SRGBColorSpace; // Keeps colors vivid

        // Apply texture
        weaponMesh.material.map = texture;
        weaponMesh.material.needsUpdate = true;
        currentTexture = texture;
    });
}
