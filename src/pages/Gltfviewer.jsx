import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./Gltfviewer.css";

export default function Gltfviewer() {
    const mountRef = useRef();

    const [clip, setClip] = useState({ x: 0, y: 0, z: 0 });
    const fillTargets = useRef([0, 0, 0, 0, 0]);

    // 3 proper clipping planes
    const clippingPlanesRef = useRef([
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), // Y
        new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),  // X
        new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)   // Z
    ]);

    const boundsRef = useRef({
        min: new THREE.Vector3(),
        max: new THREE.Vector3()
    });

    const readyRef = useRef(false);
const waterRef = useRef([]);
const holdsRef = useRef([]);
    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b1020);

        const shipGroup = new THREE.Group();
        scene.add(shipGroup);

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.localClippingEnabled = true;
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 1));

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        const planes = clippingPlanesRef.current;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        let selectedObject = null;
        let previousColor = null;

        const highlight = (object) => {
            if (!object) return;

            if (selectedObject) {
                selectedObject.material.color.set(previousColor);
            }

            selectedObject = object;
            previousColor = object.material.color.getHex();
            object.material.color.set(0x00ff00);
        };

        const onClick = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();

            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const clicked = intersects[0].object;
                if (clicked.isMesh) highlight(clicked);
            }
        };

        renderer.domElement.addEventListener("click", onClick);

        const loader = new OBJLoader();
        const modelFiles = [
            "/models/grain_holds/CH01.obj",
            "/models/grain_holds/CH02.obj",
            "/models/grain_holds/CH03.obj",
            "/models/grain_holds/CH04.obj",
            "/models/grain_holds/CH05.obj"
        ];

        let loadedCount = 0;

        modelFiles.forEach((file, index) => {
            loader.load(file, (obj) => {

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: "red",
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.5,
                            clippingPlanes: planes
                        });
                    }
                });

                // scale
                const box = new THREE.Box3().setFromObject(obj);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                obj.scale.setScalar(2 / maxDim);

                obj.updateMatrixWorld(true);

                shipGroup.add(obj);
                holdsRef.current.push(obj);

                loadedCount++;

                if (loadedCount === modelFiles.length) {

                    // CENTER SHIP
                    const shipBox = new THREE.Box3().setFromObject(shipGroup);
                    const center = shipBox.getCenter(new THREE.Vector3());

                    shipGroup.position.sub(center);
                    shipGroup.updateMatrixWorld(true);
// STEP 1: build holds AFTER final positioning
holdsRef.current.forEach((hold) => {
    const waterHeight = 0.01;

    const box = new THREE.Box3().setFromObject(hold);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // STEP 2: convert WORLD → SHIP LOCAL space
    const localCenter = shipGroup.worldToLocal(center.clone());
    const localMinY = shipGroup.worldToLocal(
        new THREE.Vector3(0, box.min.y, 0)
    ).y;

    // STEP 3: water geometry
    const waterGeo = new THREE.BoxGeometry(
        size.x * 0.9,
        size.y,
        size.z * 0.9
    );

    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x2196f3,
        transparent: true,
        opacity: 0.5
    });

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);

    // STEP 4: NOW position correctly in shipGroup space
    waterMesh.position.set(
        localCenter.x,
        localMinY,
        localCenter.z
    );

    shipGroup.add(waterMesh);

    // STEP 5: store correct values
    waterRef.current.push({
        mesh: waterMesh,
        minY: localMinY,
        height: size.y
    });
});
                    // FINAL BOUNDS (IMPORTANT)
                    const finalBox = new THREE.Box3().setFromObject(shipGroup);

                    boundsRef.current.min.copy(finalBox.min);
                    boundsRef.current.max.copy(finalBox.max);

                    const min = finalBox.min;
                    const max = finalBox.max;

                    // FIXED PLANES (NO MAGIC NUMBERS)
                    planes[0].normal.set(0, -1, 0);
                    planes[0].constant = -min.y;

                    planes[1].normal.set(1, 0, 0);
                    planes[1].constant = -min.x;

                    planes[2].normal.set(0, 0, 1);
                    planes[2].constant = -min.z;

                    renderer.localClippingEnabled = true;
                    readyRef.current = true;
                }
            });
        });

const animate = () => {
    requestAnimationFrame(animate);

    controls.target.set(0, 0, 0);
    controls.update();

    //smooth fill animation
    waterRef.current.forEach((water, i) => {
        const target = fillTargets.current[i];

        const current = water.mesh.userData.fill || 0;

        // smooth interpolation (LERP)
        const next = THREE.MathUtils.lerp(current, target, 0.05);

        water.mesh.userData.fill = next;

        applyFill(water, next);
    });

    if (readyRef.current) {
        renderer.render(scene, camera);
    }
};

        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

const handleAction = (action) => {
    switch (action) {
        case "fillHold1":
            fillTargets.current[0] = 100;
            break;
        case "fillHold2":
            fillTargets.current[1] = 100;
            break;
        case "fillHold3":
            fillTargets.current[2] = 100;
            break;
        case "fillHold4":
            fillTargets.current[3] = 100;
            break;
        case "fillHold5":
            fillTargets.current[4] = 100;
            break;

        case "reset":
            fillTargets.current = [0, 0, 0, 0, 0];
            break;
    }
};

    // UPDATE SLIDERS
    const handleClipChange = (axis, value) => {
        setClip(prev => {
            const updated = { ...prev, [axis]: Number(value) };

            const planes = clippingPlanesRef.current;
            const { min, max } = boundsRef.current;

            // Y (fill)
            planes[0].constant =
                -(min.y + (max.y - min.y) * (updated.y / 100));

            // X (left-right)
            planes[1].constant =
                -(min.x + (max.x - min.x) * (updated.x / 100));

            // Z (front-back)
            planes[2].constant =
                -(min.z + (max.z - min.z) * (updated.z / 100));

            return updated;
        });
    };
const applyFill = (water, percent) => {
    const { mesh, minY, height } = water;

    const scaleY = percent / 100;

    mesh.scale.y = scaleY;

    mesh.position.y = minY + (height * scaleY) / 2;
};

return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <div
            ref={mountRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        />

        {/* Left Control Panel */}
        <div className="control-panel">
            <div className="slider-block">
                <label>X Clip</label>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={clip.x}
                    onChange={(e) => handleClipChange("x", e.target.value)}
                />
                <div className="slider-value">{clip.x}% clipped</div>
            </div>

            <div className="slider-block">
                <label>Y Clip</label>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={clip.y}
                    onChange={(e) => handleClipChange("y", e.target.value)}
                />
                <div className="slider-value">{clip.y}% clipped</div>
            </div>

            <div className="slider-block">
                <label>Z Clip</label>
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={clip.z}
                    onChange={(e) => handleClipChange("z", e.target.value)}
                />
                <div className="slider-value">{clip.z}% clipped</div>
            </div>

            <div className="button-container">
                <button onClick={() => handleAction("fillHold1")}>Fill Hold 1</button>
                <button onClick={() => handleAction("fillHold2")}>Fill Hold 2</button>
                <button onClick={() => handleAction("fillHold3")}>Fill Hold 3</button>
                <button onClick={() => handleAction("fillHold4")}>Fill Hold 4</button>
                <button onClick={() => handleAction("fillHold5")}>Fill Hold 5</button>
                <button onClick={() => handleAction("stop")}>Stop</button>
                <button onClick={() => handleAction("reset")}>Reset</button>
            </div>
        </div>
    </div>
);
}