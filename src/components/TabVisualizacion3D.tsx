import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Rotate3d,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Compass,
  Sliders,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PredictionResult, MachineType, SeverityLevel } from '../types';

interface TabVisualizacion3DProps {
  result: PredictionResult;
  machineType: MachineType;
}

interface SelectedComponentInfo {
  name: string;
  code: string;
  type: 'sensor' | 'bearing' | 'runner' | 'coupling' | 'generator';
  description: string;
  measuredValue?: number;
  severity?: SeverityLevel;
  sensorCode?: string;
}

export const TabVisualizacion3D: React.FC<TabVisualizacion3DProps> = ({ result, machineType }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const lissajousCanvasRef = useRef<HTMLCanvasElement>(null);

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [vibeExaggeration, setVibeExaggeration] = useState<number>(40);
  const [showXRay, setShowXRay] = useState<boolean>(true);
  const [showOrbitTrail, setShowOrbitTrail] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showSensorLabels, setShowSensorLabels] = useState<boolean>(true);
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'side' | 'coupling' | 'runner'>('iso');
  const [selectedItem, setSelectedItem] = useState<SelectedComponentInfo | null>(null);

  // Active measurement values from result
  const { prediction, metadata, severity } = result;
  const isMisalignment = prediction === 'LỆCH TRỤC' || prediction === 'DESALINEACIÓN';
  const nominalKph = metadata.nominalSpeed || 600;

  // Sensor max values
  const cspMax = metadata.maxValues['CSP'] || 35;
  const cslMax = metadata.maxValues['CSL'] || 42;
  const ctpMax = metadata.maxValues['CTP'] || 48;
  const ctlMax = metadata.maxValues['CTL'] || 1.8;

  // Refs for 3D animation loop
  const animFrameRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const orbitCurveRef = useRef<THREE.Line | null>(null);
  const vectorArrowsRef = useRef<THREE.ArrowHelper[]>([]);
  const sensorMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const casingMeshesRef = useRef<THREE.Mesh[]>([]);
  const rotationAngleRef = useRef<number>(0);
  const trailPointsRef = useRef<THREE.Vector3[]>([]);

  // Orbit parameters based on diagnosis
  const unbalanceAmp = Math.max(cspMax, cslMax) / 100; // normalized unit
  const misalignmentAmp = Math.max(ctpMax / 80, ctlMax / 3);

  // Mouse interaction state for camera rotation/panning
  const isDraggingRef = useRef<boolean>(false);
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraSphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 14,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
  });
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d); // Deep industrial navy
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.025);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x60a5fa, 1.8);
    dirLight1.position.set(10, 15, 10);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 0.9);
    dirLight2.position.set(-10, -5, -8);
    scene.add(dirLight2);

    const spotLight = new THREE.SpotLight(0x38bdf8, 2.5, 30, Math.PI / 4, 0.3);
    spotLight.position.set(0, 10, 5);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Engineering Floor Grid
    const gridHelper = new THREE.GridHelper(24, 24, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -2.8;
    scene.add(gridHelper);

    // Coordinates Compass Tripod (small corner)
    const axes = new THREE.AxesHelper(1.5);
    axes.position.set(-8, -2.5, -6);
    scene.add(axes);

    // Assembly Root Group
    const machineAssembly = new THREE.Group();
    scene.add(machineAssembly);

    // Concrete Base Pedestal
    const baseGeo = new THREE.BoxGeometry(16, 0.6, 5);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.8,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -2.5;
    baseMesh.receiveShadow = true;
    machineAssembly.add(baseMesh);

    // Mounting rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.2, 0.5), railMat);
    rail1.position.set(0, -2.1, 1.6);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.2, 0.5), railMat);
    rail2.position.set(0, -2.1, -1.6);
    machineAssembly.add(rail1, rail2);

    // -------------------------------------------------------------
    // 1. GENERATOR STATOR & HOUSING (Left Section: X = -5 to -1.5)
    // -------------------------------------------------------------
    const genStatorGroup = new THREE.Group();
    genStatorGroup.position.set(-4.5, 0, 0);

    const genStatorGeo = new THREE.CylinderGeometry(1.8, 1.8, 3.2, 32);
    const genStatorMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f, // Industrial generator blue
      metalness: 0.5,
      roughness: 0.4,
    });
    const genStatorMesh = new THREE.Mesh(genStatorGeo, genStatorMat);
    genStatorMesh.rotation.z = Math.PI / 2;
    genStatorMesh.castShadow = true;
    genStatorGroup.add(genStatorMesh);

    // Cooling ribs on generator
    for (let r = 0; r < 8; r++) {
      const ribGeo = new THREE.TorusGeometry(1.82, 0.04, 8, 32);
      const ribMat = new THREE.MeshStandardMaterial({ color: 0x0f2744, roughness: 0.7 });
      const ribMesh = new THREE.Mesh(ribGeo, ribMat);
      ribMesh.rotation.y = Math.PI / 2;
      ribMesh.position.x = -1.2 + r * 0.35;
      genStatorGroup.add(ribMesh);
    }

    // Generator Endplates
    const endPlateMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 });
    const endPlate1 = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.15, 32), endPlateMat);
    endPlate1.rotation.z = Math.PI / 2;
    endPlate1.position.x = -1.65;
    const endPlate2 = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.15, 32), endPlateMat);
    endPlate2.rotation.z = Math.PI / 2;
    endPlate2.position.x = 1.65;
    genStatorGroup.add(endPlate1, endPlate2);

    // Generator Stator Support Legs
    const legGeo = new THREE.BoxGeometry(0.5, 1.2, 3.4);
    const legMesh = new THREE.Mesh(legGeo, baseMat);
    legMesh.position.set(0, -1.4, 0);
    genStatorGroup.add(legMesh);
    machineAssembly.add(genStatorGroup);

    // -------------------------------------------------------------
    // 2. BEARINGS PEDESTALS
    // -------------------------------------------------------------
    // GE-NDE Bearing (Far Left: X = -6.5)
    const bearingNDEPedestal = createBearingPedestal(-6.4, 'GE-NDE (Ổ đỡ sau máy phát)');
    machineAssembly.add(bearingNDEPedestal);

    // GE-DE Bearing (Drive End: X = -2.0) with CSP and CSL sensors!
    const bearingDEPedestal = createBearingPedestal(-2.2, 'GE-DE (Ổ đỡ trước máy phát - CSP/CSL)');
    machineAssembly.add(bearingDEPedestal);

    // T Guide Bearing (Turbine side: X = 2.4) with CTP and CTL sensors!
    const bearingTPedestal = createBearingPedestal(2.2, 'T (Ổ đỡ hướng tuabin - CTP/CTL)');
    machineAssembly.add(bearingTPedestal);

    // -------------------------------------------------------------
    // 3. ROTATING ASSEMBLY (Dynamic Group affected by Vibration)
    // -------------------------------------------------------------
    const dynamicShaftGroup = new THREE.Group();
    dynamicGroupRef.current = dynamicShaftGroup;
    machineAssembly.add(dynamicShaftGroup);

    // Main steel shaft
    // Left segment (generator side)
    const genShaftGeo = new THREE.CylinderGeometry(0.35, 0.35, 5.8, 32);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Bright polished steel
      metalness: 0.9,
      roughness: 0.15,
    });
    const genShaft = new THREE.Mesh(genShaftGeo, shaftMat);
    genShaft.rotation.z = Math.PI / 2;
    genShaft.position.x = -3.7;
    genShaft.castShadow = true;
    dynamicShaftGroup.add(genShaft);

    // Flanged Shaft Coupling (X = -0.6)
    const couplingGroup = new THREE.Group();
    couplingGroup.position.set(-0.6, 0, 0);

    const flange1Geo = new THREE.CylinderGeometry(0.85, 0.85, 0.35, 32);
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const flange1 = new THREE.Mesh(flange1Geo, flangeMat);
    flange1.rotation.z = Math.PI / 2;
    flange1.position.x = -0.2;
    couplingGroup.add(flange1);

    const flange2 = new THREE.Mesh(flange1Geo, flangeMat);
    flange2.rotation.z = Math.PI / 2;
    flange2.position.x = 0.2;
    couplingGroup.add(flange2);

    // Coupling bolts circle
    for (let b = 0; b < 6; b++) {
      const angle = (b * Math.PI * 2) / 6;
      const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 12);
      const boltMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0, Math.cos(angle) * 0.55, Math.sin(angle) * 0.55);
      couplingGroup.add(bolt);
    }
    dynamicShaftGroup.add(couplingGroup);

    // Right segment (turbine shaft)
    const turbShaftGeo = new THREE.CylinderGeometry(0.35, 0.35, 5.0, 32);
    const turbShaft = new THREE.Mesh(turbShaftGeo, shaftMat);
    turbShaft.rotation.z = Math.PI / 2;
    turbShaft.position.x = 2.0;
    turbShaft.castShadow = true;
    dynamicShaftGroup.add(turbShaft);

    // Thrust collar for axial sensor CTL (at X = 2.8)
    const thrustCollarGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.2, 32);
    const thrustCollarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.1 });
    const thrustCollar = new THREE.Mesh(thrustCollarGeo, thrustCollarMat);
    thrustCollar.rotation.z = Math.PI / 2;
    thrustCollar.position.x = 2.8;
    dynamicShaftGroup.add(thrustCollar);

    // -------------------------------------------------------------
    // 4. TURBINE RUNNER (X = 4.8)
    // -------------------------------------------------------------
    const runnerGroup = new THREE.Group();
    runnerGroup.position.set(4.6, 0, 0);

    if (machineType === 'Pelton horizontal') {
      // Pelton Runner Wheel
      const discGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32);
      const discMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.z = Math.PI / 2;
      runnerGroup.add(disc);

      // Buckets around disc
      for (let k = 0; k < 14; k++) {
        const theta = (k * Math.PI * 2) / 14;
        const bucketGeo = new THREE.SphereGeometry(0.3, 12, 12, 0, Math.PI);
        const bucketMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
        const bucket = new THREE.Mesh(bucketGeo, bucketMat);
        bucket.position.set(0, Math.cos(theta) * 1.7, Math.sin(theta) * 1.7);
        bucket.rotation.x = theta + Math.PI / 2;
        bucket.rotation.y = Math.PI / 2;
        runnerGroup.add(bucket);
      }
    } else {
      // Francis Runner (Bánh xe công tác Francis)
      // Hub and Crown
      const crownGeo = new THREE.CylinderGeometry(0.55, 1.45, 1.2, 32);
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0x0369a1, // Deep turbine hydraulic blue
        metalness: 0.7,
        roughness: 0.25,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.rotation.z = -Math.PI / 2;
      runnerGroup.add(crown);

      // Nose Cone (chóp xả)
      const coneGeo = new THREE.ConeGeometry(0.55, 0.9, 32);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.z = -Math.PI / 2;
      cone.position.x = 1.0;
      runnerGroup.add(cone);

      // Francis 3D Curved Runner Blades
      for (let b = 0; b < 13; b++) {
        const phi = (b * Math.PI * 2) / 13;
        const bladeGeo = new THREE.BoxGeometry(0.9, 0.08, 0.45);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.8,
          roughness: 0.2,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(
          -0.1,
          Math.cos(phi) * 1.05,
          Math.sin(phi) * 1.05
        );
        blade.rotation.x = phi;
        blade.rotation.y = 0.4;
        blade.rotation.z = -0.25;
        runnerGroup.add(blade);
      }

      // Outer shroud ring
      const shroudGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32, 1, true);
      const shroudMat = new THREE.MeshStandardMaterial({
        color: 0x075985,
        metalness: 0.6,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
      const shroud = new THREE.Mesh(shroudGeo, shroudMat);
      shroud.rotation.z = Math.PI / 2;
      runnerGroup.add(shroud);
    }
    dynamicShaftGroup.add(runnerGroup);

    // -------------------------------------------------------------
    // 5. TURBINE VOLUTE / SPIRAL CASING (Buồng Xoắn Tuabin)
    // -------------------------------------------------------------
    const casingGroup = new THREE.Group();
    casingGroup.position.set(4.6, 0, 0);

    const casingTorusGeo = new THREE.TorusGeometry(1.85, 0.7, 16, 40);
    const casingMat = new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      metalness: 0.3,
      roughness: 0.2,
      transmission: showXRay ? 0.75 : 0.0,
      opacity: showXRay ? 0.4 : 1.0,
      transparent: true,
      wireframe: false,
    });
    const casingMesh = new THREE.Mesh(casingTorusGeo, casingMat);
    casingMesh.rotation.y = Math.PI / 2;
    casingGroup.add(casingMesh);
    casingMeshesRef.current.push(casingMesh);

    // Inlet penstock flange
    const inletGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.4, 24);
    const inletMesh = new THREE.Mesh(inletGeo, casingMat);
    inletMesh.position.set(0, 2.3, 0);
    casingGroup.add(inletMesh);
    casingMeshesRef.current.push(inletMesh);

    machineAssembly.add(casingGroup);

    // -------------------------------------------------------------
    // 6. PROXIMITY PROBE SENSORS (CSP, CSL, CTP, CTL)
    // -------------------------------------------------------------
    // Sensor CSP: GE-DE bearing, horizontal (parallel, X-axis direction)
    const cspSensor = createSensorProbe({
      code: 'CSP',
      name: 'CSP (Gối trước - Hướng song song)',
      position: new THREE.Vector3(-2.2, 0, 1.15),
      lookAtPos: new THREE.Vector3(-2.2, 0, 0),
      severity: severity['CSP'] || 'VERDE',
      measuredValue: cspMax,
    });
    machineAssembly.add(cspSensor.group);
    sensorMeshesRef.current.set('CSP', cspSensor.headMesh);

    // Sensor CSL: GE-DE bearing, vertical (longitudinal/perpendicular, Y-axis direction)
    const cslSensor = createSensorProbe({
      code: 'CSL',
      name: 'CSL (Gối trước - Hướng vuông góc)',
      position: new THREE.Vector3(-2.2, 1.15, 0),
      lookAtPos: new THREE.Vector3(-2.2, 0, 0),
      severity: severity['CSL'] || 'VERDE',
      measuredValue: cslMax,
    });
    machineAssembly.add(cslSensor.group);
    sensorMeshesRef.current.set('CSL', cslSensor.headMesh);

    // Sensor CTP: Turbine guide bearing, radial
    const ctpSensor = createSensorProbe({
      code: 'CTP',
      name: 'CTP (Gối tuabin - Hướng song song)',
      position: new THREE.Vector3(2.2, 0, 1.15),
      lookAtPos: new THREE.Vector3(2.2, 0, 0),
      severity: severity['CTP'] || 'VERDE',
      measuredValue: ctpMax,
    });
    machineAssembly.add(ctpSensor.group);
    sensorMeshesRef.current.set('CTP', ctpSensor.headMesh);

    // Sensor CTL: Turbine guide bearing, axial (facing thrust collar face!)
    const ctlSensor = createSensorProbe({
      code: 'CTL',
      name: 'CTL (Gối tuabin - Dọc trục)',
      position: new THREE.Vector3(3.2, 0.45, 0),
      lookAtPos: new THREE.Vector3(2.8, 0.45, 0),
      severity: severity['CTL'] || 'VERDE',
      measuredValue: ctlMax,
      isAxial: true,
    });
    machineAssembly.add(ctlSensor.group);
    sensorMeshesRef.current.set('CTL', ctlSensor.headMesh);

    // -------------------------------------------------------------
    // 7. ORBIT TRAIL VISUALIZER (Quỹ đạo tâm trục 3D)
    // -------------------------------------------------------------
    const trailGeometry = new THREE.BufferGeometry();
    const trailPointsCount = 80;
    const initialTrail = new Float32Array(trailPointsCount * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(initialTrail, 3));
    const trailMaterial = new THREE.LineBasicMaterial({
      color: isMisalignment ? 0xf43f5e : 0x10b981,
      linewidth: 3,
    });
    const orbitLine = new THREE.Line(trailGeometry, trailMaterial);
    machineAssembly.add(orbitLine);
    orbitCurveRef.current = orbitLine;

    // -------------------------------------------------------------
    // 8. VIBRATION FORCE VECTORS
    // -------------------------------------------------------------
    const arrowHelper1 = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-2.2, 0, 0),
      1.2,
      0xf59e0b,
      0.3,
      0.2
    );
    const arrowHelper2 = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(4.6, 0, 0),
      1.5,
      isMisalignment ? 0xf43f5e : 0x10b981,
      0.35,
      0.2
    );
    machineAssembly.add(arrowHelper1, arrowHelper2);
    vectorArrowsRef.current = [arrowHelper1, arrowHelper2];

    // Helper: Create bearing pedestal
    function createBearingPedestal(xPos: number, _name: string): THREE.Group {
      const g = new THREE.Group();
      g.position.set(xPos, 0, 0);

      // Pillow block lower base
      const footGeo = new THREE.BoxGeometry(1.0, 1.4, 2.2);
      const footMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.y = -1.3;
      foot.castShadow = true;
      g.add(foot);

      // Bearing ring housing
      const ringGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.85, 32);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.z = Math.PI / 2;
      ring.castShadow = true;
      g.add(ring);

      // Bearing bronze bushing (liner visible inside)
      const linerGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.88, 32, 1, true);
      const linerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
      const liner = new THREE.Mesh(linerGeo, linerMat);
      liner.rotation.z = Math.PI / 2;
      g.add(liner);

      return g;
    }

    // Helper: Create Proximity Sensor Probe
    function createSensorProbe(opts: {
      code: string;
      name: string;
      position: THREE.Vector3;
      lookAtPos: THREE.Vector3;
      severity: SeverityLevel;
      measuredValue: number;
      isAxial?: boolean;
    }) {
      const group = new THREE.Group();
      group.position.copy(opts.position);

      // Sensor Body (Stainless probe cylinder)
      const bodyGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), opts.lookAtPos.clone().sub(opts.position).normalize());
      group.add(bodyMesh);

      // Sensor Tip (Ceramic PEEK tip)
      const tipGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.1, roughness: 0.5 });
      const tipMesh = new THREE.Mesh(tipGeo, tipMat);
      tipMesh.position.y = -0.36;
      bodyMesh.add(tipMesh);

      // Status Indicator Ring / Halo
      const statusColor =
        opts.severity === 'ROJO'
          ? 0xf43f5e
          : opts.severity === 'AMARILLO'
          ? 0xf59e0b
          : 0x10b981;

      const ringGeo = new THREE.TorusGeometry(0.2, 0.035, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: statusColor });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.2;
      bodyMesh.add(ringMesh);

      // Measurement laser indicator line towards shaft
      const lineMat = new THREE.LineDashedMaterial({
        color: statusColor,
        dashSize: 0.08,
        gapSize: 0.04,
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.38, 0),
        new THREE.Vector3(0, -0.75, 0),
      ]);
      const dashLine = new THREE.Line(lineGeo, lineMat);
      dashLine.computeLineDistances();
      bodyMesh.add(dashLine);

      // Store metadata on mesh for Raycasting click
      bodyMesh.userData = {
        code: opts.code,
        name: opts.name,
        type: 'sensor',
        severity: opts.severity,
        measuredValue: opts.measuredValue,
        description: `Cảm biến tiệm cận đo độ dịch chuyển rung động không tiếp xúc (Eddy Current). Giám sát khe hở dầu ổ trục với dải đo micron (\u03bcm).`,
      };

      return { group, headMesh: bodyMesh };
    }

    // Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying) {
        // Base rotational speed in rad/sec: scaled by nominal KPH and simSpeed
        const rotSpeed = (nominalKph / 60) * Math.PI * 0.4 * simSpeed;
        rotationAngleRef.current += rotSpeed * delta;
        const angle = rotationAngleRef.current;

        // Apply vibration dynamics to the rotating group:
        // Magnification factor
        const mag = vibeExaggeration * 0.003;

        if (dynamicGroupRef.current) {
          // Continuous shaft rotation
          dynamicGroupRef.current.rotation.x = angle;

          if (isMisalignment) {
            // MISALIGNMENT DYNAMICS:
            // 2X dominant component, significant axial pulsation (Z-axis relative to shaft)
            // and angular tilting at coupling
            const radVibeY = Math.cos(angle * 2) * misalignmentAmp * mag;
            const radVibeZ = Math.sin(angle * 2) * misalignmentAmp * mag;
            const axialVibeX = Math.sin(angle) * (ctlMax * 0.1) * mag * 1.5;

            dynamicGroupRef.current.position.y = radVibeY;
            dynamicGroupRef.current.position.z = radVibeZ;
            dynamicGroupRef.current.position.x = axialVibeX;

            // Angular rocking (tilt)
            dynamicGroupRef.current.rotation.y = Math.sin(angle * 2) * 0.03 * (vibeExaggeration / 40);
            dynamicGroupRef.current.rotation.z = Math.cos(angle * 2) * 0.02 * (vibeExaggeration / 40);
          } else {
            // UNBALANCE DYNAMICS:
            // 1X synchronous eccentric circular orbit, pure radial runout
            const radVibeY = Math.cos(angle) * unbalanceAmp * mag * 1.6;
            const radVibeZ = Math.sin(angle) * unbalanceAmp * mag * 1.6;

            dynamicGroupRef.current.position.y = radVibeY;
            dynamicGroupRef.current.position.z = radVibeZ;
            dynamicGroupRef.current.position.x = 0; // negligible axial for unbalance

            dynamicGroupRef.current.rotation.y = 0;
            dynamicGroupRef.current.rotation.z = 0;
          }

          // Record trajectory for 3D Orbit Trail at GE-DE Bearing plane (X = -2.2)
          if (showOrbitTrail && orbitCurveRef.current) {
            const currentShaftPos = new THREE.Vector3(
              -2.2,
              dynamicGroupRef.current.position.y,
              dynamicGroupRef.current.position.z
            );
            trailPointsRef.current.push(currentShaftPos);
            if (trailPointsRef.current.length > trailPointsCount) {
              trailPointsRef.current.shift();
            }

            const positions = orbitCurveRef.current.geometry.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < trailPointsCount; i++) {
              const pt = trailPointsRef.current[i] || currentShaftPos;
              positions.setXYZ(i, pt.x, pt.y, pt.z);
            }
            positions.needsUpdate = true;
            orbitCurveRef.current.visible = true;
          } else if (orbitCurveRef.current) {
            orbitCurveRef.current.visible = false;
          }

          // Update Dynamic Force Vector Arrows
          if (vectorArrowsRef.current.length >= 2) {
            const arr1 = vectorArrowsRef.current[0];
            const arr2 = vectorArrowsRef.current[1];
            if (showVectors) {
              arr1.visible = true;
              arr2.visible = true;
              const dirY = dynamicGroupRef.current.position.y;
              const dirZ = dynamicGroupRef.current.position.z;
              const dirVec = new THREE.Vector3(0, dirY, dirZ).normalize();
              const len = Math.max(0.4, Math.sqrt(dirY * dirY + dirZ * dirZ) * 6);
              arr1.setDirection(dirVec);
              arr1.setLength(len, len * 0.25, len * 0.15);
              arr2.setDirection(dirVec);
              arr2.setLength(len * 1.3, len * 0.3, len * 0.2);
            } else {
              arr1.visible = false;
              arr2.visible = false;
            }
          }
        }
      }

      // Render 3D Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Draw 2D Lissajous Orbit on HUD Canvas
      drawLissajousHUD();
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Window resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 520;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [machineType, prediction, isMisalignment, nominalKph]);

  // Update Casing Material Transparency when showXRay changes
  useEffect(() => {
    casingMeshesRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        mat.transmission = showXRay ? 0.75 : 0.0;
        mat.opacity = showXRay ? 0.4 : 1.0;
        mat.needsUpdate = true;
      }
    });
  }, [showXRay]);

  // Handle Preset Camera Views
  useEffect(() => {
    const sph = cameraSphericalRef.current;
    if (cameraView === 'iso') {
      sph.radius = 15;
      sph.theta = Math.PI / 4;
      sph.phi = Math.PI / 3;
      cameraTargetRef.current.set(0, 0, 0);
    } else if (cameraView === 'top') {
      sph.radius = 16;
      sph.theta = 0;
      sph.phi = 0.05; // almost top-down
      cameraTargetRef.current.set(0, 0, 0);
    } else if (cameraView === 'side') {
      sph.radius = 14;
      sph.theta = 0;
      sph.phi = Math.PI / 2;
      cameraTargetRef.current.set(0, 0, 0);
    } else if (cameraView === 'coupling') {
      sph.radius = 6.5;
      sph.theta = Math.PI / 3;
      sph.phi = Math.PI / 2.6;
      cameraTargetRef.current.set(-0.6, 0, 0);
    } else if (cameraView === 'runner') {
      sph.radius = 7.5;
      sph.theta = Math.PI / 4;
      sph.phi = Math.PI / 2.5;
      cameraTargetRef.current.set(4.6, 0, 0);
    }
    updateCameraPosition();
  }, [cameraView]);

  // Update Camera from spherical coordinates
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSphericalRef.current;
    const target = cameraTargetRef.current;

    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  };

  // Mouse / Touch Interaction Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Check click on 3D object via Raycaster
    handleRaycastClick(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Update spherical angles
    const sph = cameraSphericalRef.current;
    sph.theta -= deltaX * 0.008;
    sph.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, sph.phi - deltaY * 0.008));
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sph = cameraSphericalRef.current;
    sph.radius = Math.max(4.0, Math.min(28.0, sph.radius + e.deltaY * 0.015));
    updateCameraPosition();
  };

  // Raycaster to select component or sensor
  const handleRaycastClick = (clientX: number, clientY: number) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / container.clientWidth) * 2 - 1,
      -((clientY - rect.top) / container.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      if (hit.object.userData && hit.object.userData.code) {
        setSelectedItem(hit.object.userData as SelectedComponentInfo);
        return;
      }
    }
  };

  // Draw 2D Lissajous Orbit on HUD Canvas
  const drawLissajousHUD = () => {
    const canvas = lissajousCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Clearance Circle (Boundary of Bearing Bushing)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, h - 10);
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Lissajous Orbit Path
    const currentAngle = rotationAngleRef.current;
    const points = 120;
    ctx.beginPath();
    ctx.strokeStyle = isMisalignment ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 2.5;

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.PI * 2;
      let x = 0;
      let y = 0;

      if (isMisalignment) {
        // 2X banana / figure-8 orbit
        x = Math.sin(t * 2) * (cspMax / 80) * (cx * 0.55);
        y = Math.cos(t * 2) * (cslMax / 80) * (cy * 0.55);
      } else {
        // 1X circular / elliptical unbalance orbit
        x = Math.cos(t) * (cspMax / 80) * (cx * 0.6);
        y = Math.sin(t) * (cslMax / 80) * (cy * 0.6);
      }

      if (i === 0) {
        ctx.moveTo(cx + x, cy + y);
      } else {
        ctx.lineTo(cx + x, cy + y);
      }
    }
    ctx.stroke();

    // Current Shaft Center Spot
    let curX = 0;
    let curY = 0;
    if (isMisalignment) {
      curX = Math.sin(currentAngle * 2) * (cspMax / 80) * (cx * 0.55);
      curY = Math.cos(currentAngle * 2) * (cslMax / 80) * (cy * 0.55);
    } else {
      curX = Math.cos(currentAngle) * (cspMax / 80) * (cx * 0.6);
      curY = Math.sin(currentAngle) * (cslMax / 80) * (cy * 0.6);
    }

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx + curX, cy + curY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Machine & Orbit Status */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Rotate3d className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">
                Mô Phỏng 3D Động Học Trục &amp; Bất Thường Rung Động
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isMisalignment
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                }`}
              >
                {prediction} (1X / 2X)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mô hình số hóa Digital Twin của cụm tuabin {machineType}, trực quan hóa chuyển động tâm trục (Lissajous Orbit) theo dữ liệu cảm biến
            </p>
          </div>
        </div>

        {/* Quick Diagnostic Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs">
          <Activity className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-slate-400 text-[11px]">Tốc độ quay:</div>
            <div className="text-white font-mono font-bold">{nominalKph} KPH</div>
          </div>
          <div className="h-6 w-px bg-slate-700 mx-2" />
          <div>
            <div className="text-slate-400 text-[11px]">Dạng chuyển động:</div>
            <div className="text-amber-400 font-semibold">
              {isMisalignment ? 'Quỹ đạo hình số 8 (2X)' : 'Quỹ đạo lệch tâm tròn (1X)'}
            </div>
          </div>
        </div>
      </div>

      {/* Main 3D Viewport + HUD Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3D Viewport (3 cols on lg) */}
        <div className="lg:col-span-3 relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Three.js Canvas Container */}
          <div
            ref={mountRef}
            id="turbine-3d-canvas"
            className="w-full h-[540px] cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* 3D Floating Camera HUD Overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 bg-slate-900/85 backdrop-blur border border-slate-700/70 p-1.5 rounded-lg shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center px-1.5">
              <Compass className="w-3.5 h-3.5 mr-1" /> Góc nhìn:
            </span>
            <button
              onClick={() => setCameraView('iso')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                cameraView === 'iso' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Toàn cảnh
            </button>
            <button
              onClick={() => setCameraView('coupling')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                cameraView === 'coupling' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Khớp nối
            </button>
            <button
              onClick={() => setCameraView('runner')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                cameraView === 'runner' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Bánh xe công tác
            </button>
            <button
              onClick={() => setCameraView('side')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                cameraView === 'side' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Cạnh bên
            </button>
            <button
              onClick={() => setCameraView('top')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                cameraView === 'top' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Từ trên xuống
            </button>
          </div>

          {/* Viewport Action Badges (Top Right) */}
          <div className="absolute top-3 right-3 flex items-center space-x-2 bg-slate-900/85 backdrop-blur border border-slate-700/70 px-2.5 py-1.5 rounded-lg text-xs shadow-lg">
            <button
              onClick={() => setShowXRay(!showXRay)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-colors ${
                showXRay ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ vỏ xoắn trong suốt X-Ray để quan sát cánh và trục tuabin"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>X-Ray Vỏ</span>
            </button>
            <button
              onClick={() => setShowOrbitTrail(!showOrbitTrail)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-colors ${
                showOrbitTrail ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Hiển thị đường quét quỹ đạo tâm trục 3D"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Quỹ đạo tâm</span>
            </button>
            <button
              onClick={() => setShowVectors(!showVectors)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-colors ${
                showVectors ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Véc-tơ lực rung động ly tâm tức thời"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Véc-tơ lực</span>
            </button>
          </div>

          {/* Mouse Control Guidance Hint (Bottom Left) */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 pointer-events-none hidden sm:flex items-center space-x-2">
            <span>🖱️ Kéo chuột trái: Xoay 3D</span>
            <span>&bull;</span>
            <span>Cuộn chuột: Phóng to / thu nhỏ</span>
            <span>&bull;</span>
            <span>Nhấp vào cảm biến để xem thông số</span>
          </div>

          {/* 3D Simulation Controls Toolbar (Bottom Right) */}
          <div className="absolute bottom-3 right-3 flex items-center space-x-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl">
            {/* Play/Pause Button */}
            <button
              id="sim-play-pause-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title={isPlaying ? 'Tạm dừng mô phỏng' : 'Tiếp tục mô phỏng'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Speed Selector */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-400 font-medium ml-1">Tốc độ:</span>
              {[0.5, 1.0, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                    simSpeed === spd ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Vibration Exaggeration Slider */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 font-medium" title="Phóng đại vi biến dạng micron để mắt thường nhìn rõ">
                Phóng đại rung:
              </span>
              <input
                id="vibe-exaggeration-slider"
                type="range"
                min="5"
                max="100"
                step="5"
                value={vibeExaggeration}
                onChange={(e) => setVibeExaggeration(Number(e.target.value))}
                className="w-20 accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="text-amber-400 font-mono text-[11px] font-bold w-7">
                {vibeExaggeration}x
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Lissajous Orbit Analysis & Sensor Readings */}
        <div className="space-y-4">
          {/* 1. Real-time 2D Lissajous Orbit Centerline */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                Quỹ Đạo Tâm Trục (Orbit Lissajous)
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                CSP vs CSL
              </span>
            </div>

            {/* Canvas */}
            <div className="flex justify-center bg-slate-950 p-2 rounded-lg border border-slate-800">
              <canvas
                ref={lissajousCanvasRef}
                width={170}
                height={170}
                className="rounded shadow-inner"
              />
            </div>

            <div className="mt-2.5 text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              {isMisalignment ? (
                <span>
                  <strong className="text-rose-400">Hình số 8 hoặc chuối (2X):</strong> Quỹ đạo tâm trục bị thắt nút đặc trưng của hiện tượng lệch trục góc hoặc lệch tâm song song tại khớp nối.
                </span>
              ) : (
                <span>
                  <strong className="text-emerald-400">Hình elip/tròn đồng bộ (1X):</strong> Tâm trục dao động điều hòa theo tần số quay cơ bản, phản ánh khối lượng mất cân bằng ly tâm trên bánh xe công tác.
                </span>
              )}
            </div>
          </div>

          {/* 2. Sensor Live Status Cards */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 shadow space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <Radio className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Cảm Biến Tiệm Cận Trên Mô Hình 3D
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { code: 'CSP', dir: 'Song song (DE)', val: cspMax, sev: severity['CSP'] },
                { code: 'CSL', dir: 'Vuông góc (DE)', val: cslMax, sev: severity['CSL'] },
                { code: 'CTP', dir: 'Gối tuabin (T)', val: ctpMax, sev: severity['CTP'] },
                { code: 'CTL', dir: 'Dọc trục (T)', val: ctlMax, sev: severity['CTL'] },
              ].map((s) => {
                const sevLevel = s.sev || 'VERDE';
                const isRed = sevLevel === 'ROJO';
                const isYellow = sevLevel === 'AMARILLO';
                const badgeColor = isRed
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isYellow
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                return (
                  <div
                    key={s.code}
                    onClick={() => {
                      setSelectedItem({
                        code: s.code,
                        name: `Cảm biến ${s.code}`,
                        type: 'sensor',
                        measuredValue: s.val,
                        severity: sevLevel,
                        description: `Cảm biến đo rung ${s.dir}. Giá trị đỉnh ghi nhận: ${s.val.toFixed(2)} \u03bcm. Vòng hào quang sáng trên mô hình 3D phản ánh mức độ nghiêm trọng rung động.`,
                      });
                    }}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 hover:border-blue-500/60 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-300 mr-2">{s.code}</span>
                      <span className="text-slate-400 text-[11px]">{s.dir}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white">{s.val.toFixed(2)} &mu;m</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${badgeColor}`}>
                        {sevLevel === 'VERDE' ? 'OK' : sevLevel === 'AMARILLO' ? 'CẢNH BÁO' : 'NGUY HIỂM'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Component Inspection Modal / Detail Panel */}
      {selectedItem && (
        <div className="bg-slate-800/90 border border-blue-500/40 rounded-xl p-4 shadow-lg flex items-start justify-between">
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <strong className="text-sm font-bold text-white">{selectedItem.name}</strong>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px]">
                {selectedItem.code}
              </span>
              {selectedItem.severity && (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedItem.severity === 'ROJO'
                      ? 'bg-rose-500/20 text-rose-300'
                      : selectedItem.severity === 'AMARILLO'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {selectedItem.severity === 'ROJO'
                    ? 'MỨC NGUY HIỂM'
                    : selectedItem.severity === 'AMARILLO'
                    ? 'MỨC CẢNH BÁO'
                    : 'BÌNH THƯỜNG'}
                </span>
              )}
            </div>
            <p className="text-slate-300 mt-1">{selectedItem.description}</p>
            {selectedItem.measuredValue !== undefined && (
              <div className="pt-1 text-slate-200">
                Giá trị đo cực đại: <strong className="font-mono text-amber-400">{selectedItem.measuredValue.toFixed(2)} &mu;m</strong>
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-700/60"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Explanatory 3D Engineering Architecture Guide */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center">
          <HelpCircle className="w-4 h-4 mr-2 text-blue-400" />
          Hướng Dẫn Quan Sát Cơ Học Rung Động 3D Trên Tuabin
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <strong className="text-emerald-400 font-bold block text-sm">
              1. Chế Độ Mất Cân Bằng (Unbalance - 1X)
            </strong>
            <p>
              Khối lượng lệch tâm tạo ra lực ly tâm tỷ lệ thuận với bình phương tốc độ góc (<span className="font-mono">F = m&omega;&sup2;r</span>).
              Trên mô hình 3D, bánh xe công tác và trục tuabin thực hiện chuyển động đảo tròn đồng bộ 1X quanh trục hình học.
              Biên độ rung lớn nhất tập trung tại các cảm biến hướng kính <span className="font-mono text-blue-300">CSP / CSL</span>.
            </p>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <strong className="text-rose-400 font-bold block text-sm">
              2. Chế Độ Lệch Trục (Misalignment - 2X)
            </strong>
            <p>
              Hiện tượng lệch tâm hoặc lệch góc giữa trục máy phát và trục tuabin tại khớp nối (<span className="font-mono">Flanged Coupling</span>).
              Trục bị uốn biến dạng tuần hoàn 2 lần mỗi vòng quay (2X), sinh ra rung động dao động dọc trục mạnh ghi nhận tại cảm biến <span className="font-mono text-amber-300">CTL</span> và quỹ đạo Lissajous uốn cong hình quả chuối/hình số 8.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
