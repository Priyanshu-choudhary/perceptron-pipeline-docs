/**
 * Perceptron 3D Rover & Sensor Rig Interactive Hero Scene
 * Uses Three.js r128
 */

export class RoverHeroScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.roverGroup = null;
    this.lidarHead = null;
    this.lidarBeams = [];
    this.animId = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060913, 0.035);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(4.5, 3.2, 5.0);
    this.camera.lookAt(0, 0.4, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00e5ff, 2.0);
    dirLight.position.set(5, 8, 4);
    this.scene.add(dirLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 2.5, 12);
    goldLight.position.set(-3, 2, -2);
    this.scene.add(goldLight);

    // Grid Floor
    const grid = new THREE.GridHelper(20, 40, 0x00e5ff, 0x1e293b);
    grid.position.y = -0.05;
    this.scene.add(grid);

    // Build Rover Geometry
    this.buildRover();

    // Resize listener
    window.addEventListener('resize', () => this.onResize());

    // Animation Loop
    this.animate();
  }

  buildRover() {
    this.roverGroup = new THREE.Group();

    // Chassis Box (0.42 x 0.45 x 0.22 m scale)
    const chassisGeo = new THREE.BoxGeometry(1.4, 0.4, 1.1);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: false
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.4;
    this.roverGroup.add(chassis);

    // Chassis Glow Edge
    const edgesGeo = new THREE.EdgesGeometry(chassisGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 });
    const wireChassis = new THREE.LineSegments(edgesGeo, edgesMat);
    chassis.add(wireChassis);

    // 4 Skid-steer Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const wheelWireMat = new THREE.LineBasicMaterial({ color: 0x10b981 });

    const wheelPositions = [
      [0.55, 0.32, 0.65],
      [-0.55, 0.32, 0.65],
      [0.55, 0.32, -0.65],
      [-0.55, 0.32, -0.65]
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      const wWire = new THREE.LineSegments(new THREE.EdgesGeometry(wheelGeo), wheelWireMat);
      wheel.add(wWire);
      this.roverGroup.add(wheel);
    });

    // Sensor Mast
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 16);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0.35, 0.9, 0);
    this.roverGroup.add(mast);

    // 3D LiDAR Head (Velodyne Puck)
    const lidarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 24);
    const lidarMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x004466 });
    this.lidarHead = new THREE.Mesh(lidarGeo, lidarMat);
    this.lidarHead.position.set(0.35, 1.35, 0);
    this.lidarHead.rotation.z = 0.26; // 15 deg downward pitch!
    this.roverGroup.add(this.lidarHead);

    // Laser Beams Cone
    const laserCount = 16;
    const beamGeo = new THREE.BufferGeometry();
    const beamPositions = [];
    const beamColors = [];

    for (let i = 0; i < laserCount; i++) {
      const angle = (i / laserCount) * Math.PI * 2;
      const pitch = -0.26 + ((i - 8) / 16) * 0.3; // 16 beam vertical angles
      const length = 4.0;
      beamPositions.push(0, 0, 0);
      beamPositions.push(
        Math.cos(angle) * Math.cos(pitch) * length,
        Math.sin(pitch) * length,
        Math.sin(angle) * Math.cos(pitch) * length
      );
      beamColors.push(0, 0.9, 1);
      beamColors.push(0.1, 0.2, 0.5);
    }

    beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(beamPositions, 3));
    beamGeo.setAttribute('color', new THREE.Float32BufferAttribute(beamColors, 3));

    const beamMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.65 });
    this.lidarBeamsMesh = new THREE.LineSegments(beamGeo, beamMat);
    this.lidarHead.add(this.lidarBeamsMesh);

    // Forward Camera Frustum Pyramid
    const camGeo = new THREE.ConeGeometry(0.6, 1.5, 4, 1, true);
    camGeo.rotateX(Math.PI / 2);
    const camMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const camCone = new THREE.Mesh(camGeo, camMat);
    camCone.position.set(0.7, 0.55, 0);
    this.roverGroup.add(camCone);

    this.scene.add(this.roverGroup);
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());

    if (this.lidarHead) {
      this.lidarHead.rotation.y += 0.05; // 10 Hz LiDAR spin
    }
    if (this.roverGroup) {
      this.roverGroup.rotation.y += 0.003; // Gentle showcase rotation
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
