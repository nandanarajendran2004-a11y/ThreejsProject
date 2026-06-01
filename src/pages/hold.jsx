import * as THREE from "three";
import {useEffect, useRef} from "react";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function Gltfviewer(){
    const mountRef = useRef();

    useEffect(()=>{
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b1020);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth /  window.innerHeight, 0.1, 1000);
        camera.position.set(6, 6, 6);
        camera.lookAt(0, 0, 0);

        const renderer =  new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const light = new THREE.AmbientLight(0xffffff, 1);
        scene.add(light);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        const loader = new OBJLoader();
        const modelFiles = ["/models/grain_holds/CH01.obj","/models/grain_holds/CH02.obj","/models/grain_holds/CH03.obj","/models/grain_holds/CH04.obj","/models/grain_holds/CH05.obj"];

        modelFiles.forEach((file,index)=>{
            loader.load(file,(obj)=>{
                obj.traverse((child)=>{
                    if(child.isMesh){
                        child.material = new THREE.MeshStandardMaterial({color: "red",
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.5});
                    }
                });
            // obj.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // 1. Normalize scale
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 2; // adjust this (smaller = more zoomed out)
            const scale = targetSize / maxDim;

            obj.scale.setScalar(scale);

            // 2. Recompute box after scaling
            obj.updateMatrixWorld(true);

            // 3. Center again after scaling
            const box2 = new THREE.Box3().setFromObject(obj);
            const center2 = box2.getCenter(new THREE.Vector3());
            obj.position.sub(center2);

            // 4. Spread models
            obj.position.x += index * 3;
            obj.updateMatrixWorld(true);
            scene.add(obj);
            },undefined,
        (error)=>{
            console.error(`Error loading ${file}:`,error);
        })
        })

        const animate=()=>{
            requestAnimationFrame(animate);
            controls.target.set(6, 0, 0);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize=()=>{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize",handleResize);
            renderer.dispose();
            if (mountRef.current){
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    },[]);
    return(
        <div ref={mountRef} style={{position: "fixed", top: 0, left: 0, width:"100%", height:"100%",overflow:"hidden"}}/>
    );
}