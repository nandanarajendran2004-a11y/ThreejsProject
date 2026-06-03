import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./Gltfviewer.css";

export default function Gltfviewer() {
    const mountRef = useRef();
    const [clipPercent, setClipPercent] = useState(0);

    const clippingPlaneRef = useRef(
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
    );

    const modelBoundsRef = useRef({
        minY: 0,
        maxY: 1
    });

    const readyRef = useRef(false);
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

        camera.position.set(5,5,5);
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
        const plane = clippingPlaneRef.current;

        modelFiles.forEach((file) => {
            loader.load(file, (obj) => {
                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: "red",
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.5,
                            clippingPlanes: [plane]
                        });
                    }
                });

                // scale
                const box = new THREE.Box3().setFromObject(obj);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                obj.scale.setScalar(scale);

                obj.updateMatrixWorld(true);

                shipGroup.add(obj);
                loadedCount++;

                if (loadedCount === modelFiles.length) {

                    // center whole ship
                    const shipBox = new THREE.Box3().setFromObject(shipGroup);
                    const shipCenter = shipBox.getCenter(new THREE.Vector3());

                    shipGroup.position.sub(shipCenter);
                    shipGroup.updateMatrixWorld(true);

                    // compute final bounds AFTER centering
                    const finalBox = new THREE.Box3().setFromObject(shipGroup);

                    modelBoundsRef.current = {
                        minY: finalBox.min.y,
                        maxY: finalBox.max.y
                    };

                    plane.normal.set(0, -1, 0);
                    const initialPosition = finalBox.min.y;
                    plane.constant = -initialPosition;

                    // apply clipping
                    scene.traverse((child) => {
                        if (child.isMesh) {
                            child.material.clippingPlanes = [plane];
                            child.material.needsUpdate = true;
                        }
                    });

                    renderer.localClippingEnabled = true;

                    // force first render (fix blank screen issue)
                    readyRef.current = true;
                    renderer.render(scene, camera);
                }
            });
        });

        const animate = () => {
            requestAnimationFrame(animate);
            controls.target.set(0, 0, 0);
            controls.update();
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
            renderer.domElement.removeEventListener("click", onClick);
            renderer.dispose();
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    const handleSliderChange = (e) => {
        const percent = Number(e.target.value);
        setClipPercent(percent);

        const { minY, maxY } = modelBoundsRef.current;

        const position = minY + (maxY - minY) * (percent / 100);

        clippingPlaneRef.current.constant = -position;
    };

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
            <div
                ref={mountRef}
                style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden" }}
            />

            <div className="slider-container">
                <div className="slider-title">Clipping Percentage</div>

                <input
                    className="slider-input"
                    type="range"
                    min={0}
                    max={100}
                    value={clipPercent}
                    onChange={handleSliderChange}
                />

                <div className="slider-value">
                    {clipPercent}% clipped
                </div>
            </div>
        </div>
    );
}