import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createNoise2D } from 'simplex-noise';
import { Maximize, Play, Settings, Hammer, Plus } from 'lucide-react';

const noise2D = createNoise2D();

const WORLD_SIZE = 64;
const WORLD_HEIGHT = 32;
const CHUNK_SIZE = 16;

const COLORS: Record<number, number> = {
  1: 0x4ade80, // Grass
  2: 0x78350f, // Dirt
  3: 0x94a3b8, // Stone
  4: 0xb45309, // Wood
  5: 0x22c55e, // Leaves
  6: 0xfde047, // Sand
  7: 0x3b82f6, // Water
};

const BLOCK_NAMES: Record<number, string> = {
  1: 'Grass', 2: 'Dirt', 3: 'Stone', 4: 'Wood', 5: 'Leaves', 6: 'Sand', 7: 'Water'
};

export default function FrostCraft() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const blockRef = useRef(selectedBlock);
  useEffect(() => { blockRef.current = selectedBlock; }, [selectedBlock]);

  const [isMobile, setIsMobile] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => {
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(hasTouch || isMobileUA);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isMobileRef = useRef(isMobile);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

  const joystickDir = useRef({ x: 0, y: 0 });
  const jumpPressed = useRef(false);
  const knobRef = useRef<HTMLDivElement>(null);

  const mobileActionsRef = useRef<{
      breakBlock: () => void;
      placeBlock: () => void;
  } | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);
    const controls = new PointerLockControls(camera, document.body);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // World Data
    const blocks = new Uint8Array(WORLD_SIZE * WORLD_HEIGHT * WORLD_SIZE);
    
    const getBlock = (x: number, y: number, z: number) => {
        if (x < 0 || x >= WORLD_SIZE || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= WORLD_SIZE) return 0;
        return blocks[x + z * WORLD_SIZE + y * WORLD_SIZE * WORLD_SIZE];
    };
    
    const setBlock = (x: number, y: number, z: number, type: number) => {
        if (x < 0 || x >= WORLD_SIZE || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= WORLD_SIZE) return;
        blocks[x + z * WORLD_SIZE + y * WORLD_SIZE * WORLD_SIZE] = type;
    };

    // Generate World
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            let height = 10 + Math.floor(noise2D(x / 30, z / 30) * 8);
            height += Math.floor(noise2D(x / 10, z / 10) * 3);
            
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                if (y < height - 3) {
                    setBlock(x, y, z, 3); // Stone
                } else if (y < height) {
                    setBlock(x, y, z, 2); // Dirt
                } else if (y === height) {
                    if (y <= 8) {
                        setBlock(x, y, z, 6); // Sand
                    } else {
                        setBlock(x, y, z, 1); // Grass
                    }
                } else if (y <= 8 && y > height) {
                    setBlock(x, y, z, 7); // Water
                }
            }
            
            // Trees
            if (height > 8 && Math.random() < 0.02) {
                const treeHeight = 4 + Math.floor(Math.random() * 2);
                for (let ty = 1; ty <= treeHeight; ty++) {
                    setBlock(x, height + ty, z, 4);
                }
                for (let ly = treeHeight - 2; ly <= treeHeight + 1; ly++) {
                    for (let lx = -2; lx <= 2; lx++) {
                        for (let lz = -2; lz <= 2; lz++) {
                            if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && (ly === treeHeight + 1 || Math.random() < 0.5)) continue;
                            if (getBlock(x + lx, height + ly, z + lz) === 0) {
                                setBlock(x + lx, height + ly, z + lz, 5);
                            }
                        }
                    }
                }
            }
        }
    }

    // Meshing
    const chunkMeshes: Record<string, THREE.InstancedMesh[]> = {};
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const materials: Record<number, THREE.Material> = {};
    Object.keys(COLORS).forEach(k => {
        const type = parseInt(k);
        const mat = new THREE.MeshLambertMaterial({ color: COLORS[type] });
        if (type === 7) { mat.transparent = true; mat.opacity = 0.7; }
        if (type === 5) { mat.transparent = true; mat.opacity = 0.9; }
        materials[type] = mat;
    });

    const rebuildChunk = (cx: number, cz: number) => {
        const chunkId = `${cx},${cz}`;
        if (chunkMeshes[chunkId]) {
            chunkMeshes[chunkId].forEach(m => scene.remove(m));
        }
        chunkMeshes[chunkId] = [];
        
        const typeBlocks: Record<number, {x: number, y: number, z: number}[]> = {};
        Object.keys(COLORS).forEach(k => typeBlocks[parseInt(k)] = []);
        
        for (let x = cx * CHUNK_SIZE; x < (cx + 1) * CHUNK_SIZE; x++) {
            for (let z = cz * CHUNK_SIZE; z < (cz + 1) * CHUNK_SIZE; z++) {
                for (let y = 0; y < WORLD_HEIGHT; y++) {
                    const type = getBlock(x, y, z);
                    if (type !== 0) {
                        let exposed = false;
                        const neighbors = [
                            getBlock(x+1, y, z), getBlock(x-1, y, z),
                            getBlock(x, y+1, z), getBlock(x, y-1, z),
                            getBlock(x, y, z+1), getBlock(x, y, z-1)
                        ];
                        for(let n of neighbors) {
                            if (n === 0) { exposed = true; break; }
                            if ((type === 5 || type === 7) && n !== type) { exposed = true; break; }
                        }
                        if (exposed) typeBlocks[type].push({x, y, z});
                    }
                }
            }
        }
        
        const dummy = new THREE.Object3D();
        Object.keys(typeBlocks).forEach(key => {
            const type = parseInt(key);
            const blocks = typeBlocks[type];
            if (blocks.length === 0) return;
            
            const mesh = new THREE.InstancedMesh(boxGeo, materials[type], blocks.length);
            blocks.forEach((pos, i) => {
                dummy.position.set(pos.x, pos.y, pos.z);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            chunkMeshes[chunkId].push(mesh);
        });
    };

    // Build all chunks initially
    for (let cx = 0; cx < WORLD_SIZE / CHUNK_SIZE; cx++) {
        for (let cz = 0; cz < WORLD_SIZE / CHUNK_SIZE; cz++) {
            rebuildChunk(cx, cz);
        }
    }

    // Player State
    const player = {
        x: WORLD_SIZE / 2,
        y: WORLD_HEIGHT,
        z: WORLD_SIZE / 2,
        vx: 0, vy: 0, vz: 0,
        radius: 0.3,
        height: 1.6
    };
    
    // Spawn point
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
        if (getBlock(Math.floor(player.x), y, Math.floor(player.z)) !== 0) {
            player.y = y + 2;
            break;
        }
    }
    camera.position.set(player.x, player.y + player.height * 0.8, player.z);

    // Controls
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => keys[e.code] = true;
    const onKeyUp = (e: KeyboardEvent) => keys[e.code] = false;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Number keys for block selection
    const onNumKey = (e: KeyboardEvent) => {
        if (e.code.startsWith('Digit')) {
            const num = parseInt(e.code.replace('Digit', ''));
            if (num >= 1 && num <= 7) {
                setSelectedBlock(num);
            }
        }
    };
    window.addEventListener('keydown', onNumKey);

    const isSolid = (x: number, y: number, z: number) => {
        const b = getBlock(x, y, z);
        return b !== 0 && b !== 7; // Water is not solid
    };

    const checkCollision = (px: number, py: number, pz: number) => {
        const minX = Math.floor(px - player.radius);
        const maxX = Math.floor(px + player.radius);
        const minY = Math.floor(py);
        const maxY = Math.floor(py + player.height);
        const minZ = Math.floor(pz - player.radius);
        const maxZ = Math.floor(pz + player.radius);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (isSolid(x, y, z)) return true;
                }
            }
        }
        return false;
    };

    const breakBlock = () => {
        let step = 0.05;
        let maxDist = 6;
        const pos = camera.position.clone();
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        
        for (let d = 0; d < maxDist; d += step) {
            pos.addVectors(camera.position, dir.clone().multiplyScalar(d));
            const bx = Math.floor(pos.x + 0.5);
            const by = Math.floor(pos.y + 0.5);
            const bz = Math.floor(pos.z + 0.5);
            
            if (getBlock(bx, by, bz) !== 0 && getBlock(bx, by, bz) !== 7) {
                setBlock(bx, by, bz, 0);
                rebuildChunk(Math.floor(bx / CHUNK_SIZE), Math.floor(bz / CHUNK_SIZE));
                break;
            }
        }
    };

    const placeBlock = () => {
        let step = 0.05;
        let maxDist = 6;
        const pos = camera.position.clone();
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        
        let lastPos = pos.clone();
        for (let d = 0; d < maxDist; d += step) {
            pos.addVectors(camera.position, dir.clone().multiplyScalar(d));
            const bx = Math.floor(pos.x + 0.5);
            const by = Math.floor(pos.y + 0.5);
            const bz = Math.floor(pos.z + 0.5);
            
            if (getBlock(bx, by, bz) !== 0 && getBlock(bx, by, bz) !== 7) {
                const lbx = Math.floor(lastPos.x + 0.5);
                const lby = Math.floor(lastPos.y + 0.5);
                const lbz = Math.floor(lastPos.z + 0.5);
                // Don't place inside player
                if (!checkCollision(lbx, lby, lbz) || 
                    (Math.abs(lbx - player.x) > player.radius || Math.abs(lbz - player.z) > player.radius || lby < player.y || lby > player.y + player.height)) {
                    setBlock(lbx, lby, lbz, blockRef.current);
                    rebuildChunk(Math.floor(lbx / CHUNK_SIZE), Math.floor(lbz / CHUNK_SIZE));
                }
                break;
            }
            lastPos.copy(pos);
        }
    };

    // Assign actions to ref so React UI buttons can trigger them
    mobileActionsRef.current = {
        breakBlock,
        placeBlock
    };

    // Interaction
    const onMouseClick = (e: MouseEvent) => {
        if (isMobileRef.current) return;

        if (e.target instanceof Element && e.target.closest('button')) {
            return;
        }

        if (!controls.isLocked) {
            controls.lock();
            return;
        }
        
        if (e.button === 0) {
            breakBlock();
        } else if (e.button === 2) {
            placeBlock();
        }
    };
    document.addEventListener('mousedown', onMouseClick);

    // Touch look rotation logic for mobile
    let lookTouchId: number | null = null;
    let lastLookPos = { x: 0, y: 0 };

    const onTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('#joystick-container')) {
            return;
        }
        
        // Prevent default screen scrolling/bouncing on mobile during play
        e.preventDefault();

        const touch = e.changedTouches[0];
        lookTouchId = touch.identifier;
        lastLookPos = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
        if (lookTouchId === null) return;
        
        // Prevent scrolling
        e.preventDefault();

        let touch: Touch | null = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === lookTouchId) {
                touch = e.touches[i];
                break;
            }
        }
        if (!touch) return;

        const dx = touch.clientX - lastLookPos.x;
        const dy = touch.clientY - lastLookPos.y;

        // Apply camera rotation
        const sensitivity = 0.005;
        camera.rotation.y -= dx * sensitivity;
        camera.rotation.x -= dy * sensitivity;
        camera.rotation.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, camera.rotation.x));

        lastLookPos = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
        if (lookTouchId === null) return;
        
        let ended = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouchId) {
                ended = true;
                break;
            }
        }
        
        if (ended) {
            lookTouchId = null;
        }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    
    // Resize handler
    const onResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Game loop
    let lastTime = performance.now();
    let reqId: number;

    const loop = (time: number) => {
        reqId = requestAnimationFrame(loop);
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        if (controls.isLocked || isMobileRef.current) {
            player.vy -= 25 * dt; // gravity
            
            const speed = keys['ShiftLeft'] ? 8 : 5;
            const inputVelocity = new THREE.Vector3();
            
            if (isMobileRef.current) {
                inputVelocity.z = joystickDir.current.y;
                inputVelocity.x = joystickDir.current.x;
                const len = inputVelocity.length();
                if (len > 0) {
                    const scale = Math.min(len, 1.0) * speed;
                    inputVelocity.normalize().multiplyScalar(scale);
                }
            } else {
                if (keys['KeyW']) inputVelocity.z -= 1;
                if (keys['KeyS']) inputVelocity.z += 1;
                if (keys['KeyA']) inputVelocity.x -= 1;
                if (keys['KeyD']) inputVelocity.x += 1;
                if (inputVelocity.length() > 0) inputVelocity.normalize().multiplyScalar(speed);
            }
            
            const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
            inputVelocity.applyEuler(euler);
            
            player.vx = inputVelocity.x;
            player.vz = inputVelocity.z;
            
            player.x += player.vx * dt;
            if (checkCollision(player.x, player.y, player.z)) {
                player.x -= player.vx * dt;
            }
            
            player.z += player.vz * dt;
            if (checkCollision(player.x, player.y, player.z)) {
                player.z -= player.vz * dt;
            }
            
            player.y += player.vy * dt;
            let grounded = false;
            if (checkCollision(player.x, player.y, player.z)) {
                player.y -= player.vy * dt;
                if (player.vy < 0) grounded = true;
                player.vy = 0;
            }
            
            // Swim in water
            if (getBlock(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z)) === 7) {
                player.vy *= 0.8; // water friction
                if (keys['Space'] || jumpPressed.current) player.vy += 15 * dt;
                grounded = false;
            } else if (grounded && (keys['Space'] || jumpPressed.current)) {
                player.vy = 8;
            }
            
            camera.position.set(player.x, player.y + player.height * 0.8, player.z);
        }

        renderer.render(scene, camera);
    };
    reqId = requestAnimationFrame(loop);

    return () => {
        cancelAnimationFrame(reqId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('keydown', onNumKey);
        document.removeEventListener('mousedown', onMouseClick);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
        window.removeEventListener('resize', onResize);
        controls.unlock();
        renderer.dispose();
    };
  }, [gameState]);

  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.targetTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = touch.clientX - rect.left - centerX;
    const y = touch.clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x*x + y*y);
    const maxRadius = 40;
    if (distance <= maxRadius) {
      setKnobPos({ x, y });
      joystickDir.current = { x: x / maxRadius, y: y / maxRadius };
    } else {
      const angle = Math.atan2(y, x);
      const nx = Math.cos(angle) * maxRadius;
      const ny = Math.sin(angle) * maxRadius;
      setKnobPos({ x: nx, y: ny });
      joystickDir.current = { x: nx / maxRadius, y: ny / maxRadius };
    }
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.targetTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = touch.clientX - rect.left - centerX;
    const y = touch.clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x*x + y*y);
    const maxRadius = 40;
    if (distance <= maxRadius) {
      setKnobPos({ x, y });
      joystickDir.current = { x: x / maxRadius, y: y / maxRadius };
    } else {
      const angle = Math.atan2(y, x);
      const nx = Math.cos(angle) * maxRadius;
      const ny = Math.sin(angle) * maxRadius;
      setKnobPos({ x: nx, y: ny });
      joystickDir.current = { x: nx / maxRadius, y: ny / maxRadius };
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setKnobPos({ x: 0, y: 0 });
    joystickDir.current = { x: 0, y: 0 };
  };

  if (gameState === 'menu') {
      return (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full h-[600px] flex flex-col items-center justify-center relative overflow-hidden">
             {/* Simple aesthetic background for menu */}
             <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                 backgroundImage: 'radial-gradient(circle at center, #3b82f6 0%, transparent 70%)'
             }}></div>
             
             <h1 className="text-6xl font-bold text-white mb-2 tracking-tighter" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>FrostCraft</h1>
             <p className="text-blue-300 mb-12 text-lg font-medium tracking-wide">SINGLEPLAYER 3D EDITION</p>
             
             <button 
                onClick={() => setGameState('playing')}
                className="flex items-center space-x-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
             >
                 <Play className="w-6 h-6 fill-current" />
                 <span>PLAY GAME</span>
             </button>
             
             <div className="absolute bottom-8 text-slate-500 text-sm flex gap-6 font-medium">
                <span>WASD to move</span>
                <span>SPACE to jump</span>
                <span>L/R Click to interact</span>
                <span>1-7 to select blocks</span>
             </div>
          </div>
      );
  }

  return (
    <div 
        ref={containerRef} 
        className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'w-full h-[600px] rounded-2xl overflow-hidden border border-slate-700'}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-4 h-4">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/70 -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/70 -translate-x-1/2"></div>
          </div>
      </div>
      
      {/* UI Overlay */}
      <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <button 
              onClick={() => setIsMobile(!isMobile)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg backdrop-blur-sm transition-all cursor-pointer ${isMobile ? 'bg-blue-600/90 text-white shadow-lg' : 'bg-black/50 hover:bg-black/70 text-slate-300'}`}
          >
              {isMobile ? 'Mobile: On' : 'Mobile: Off'}
          </button>
          <button 
              onClick={toggleFullscreen}
              className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors cursor-pointer"
          >
              <Maximize className="w-5 h-5" />
          </button>
      </div>

      <div className="absolute top-4 left-4 text-white/80 bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm text-sm font-mono pointer-events-none z-10">
          {isMobile ? 'Drag right screen to look' : 'ESC to unlock mouse'}
      </div>

      {/* Mobile Controls Overlay */}
      {isMobile && (
        <>
          {/* Joystick (Bottom Left) */}
          <div 
            id="joystick-container"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            className="absolute bottom-6 left-6 w-32 h-32 rounded-full bg-black/40 border-2 border-white/20 backdrop-blur-sm flex items-center justify-center select-none z-10 touch-none"
          >
            <div className="w-8 h-8 rounded-full border border-white/10 absolute"></div>
            
            {/* Knob */}
            <div 
              ref={knobRef}
              className="w-12 h-12 rounded-full bg-white/85 shadow-lg absolute pointer-events-none"
              style={{
                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`
              }}
            ></div>
          </div>

          {/* Action Buttons (Bottom Right) */}
          <div className="absolute bottom-6 right-6 flex flex-col space-y-3 z-10 select-none touch-none">
              {/* Mine / Break */}
              <button 
                  onTouchStart={(e) => { e.stopPropagation(); mobileActionsRef.current?.breakBlock(); }}
                  onClick={(e) => { e.stopPropagation(); mobileActionsRef.current?.breakBlock(); }}
                  className="w-14 h-14 bg-red-600/90 active:bg-red-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 cursor-pointer"
              >
                  <Hammer className="w-6 h-6" />
              </button>
              
              {/* Build / Place */}
              <button 
                  onTouchStart={(e) => { e.stopPropagation(); mobileActionsRef.current?.placeBlock(); }}
                  onClick={(e) => { e.stopPropagation(); mobileActionsRef.current?.placeBlock(); }}
                  className="w-14 h-14 bg-green-600/90 active:bg-green-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 cursor-pointer"
              >
                  <Plus className="w-6 h-6" />
              </button>

              {/* Jump */}
              <button 
                  onTouchStart={(e) => { e.stopPropagation(); jumpPressed.current = true; }}
                  onTouchEnd={(e) => { e.stopPropagation(); jumpPressed.current = false; }}
                  onMouseDown={(e) => { e.stopPropagation(); jumpPressed.current = true; }}
                  onMouseUp={(e) => { e.stopPropagation(); jumpPressed.current = false; }}
                  className="w-16 h-16 bg-blue-600/90 active:bg-blue-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl font-bold border-2 border-white/30 text-xs cursor-pointer"
              >
                  JUMP
              </button>
          </div>
        </>
      )}
      
      {/* Hotbar */}
      <div className={`absolute left-1/2 -translate-x-1/2 flex space-x-1 bg-black/50 p-1.5 rounded-xl backdrop-blur-md z-10 transition-all ${isMobile ? 'bottom-24 scale-90 sm:scale-100' : 'bottom-6'}`}>
         {[1, 2, 3, 4, 5, 6, 7].map(num => (
             <button
                 key={num}
                 onClick={(e) => { e.stopPropagation(); setSelectedBlock(num); }}
                 className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center relative transition-all cursor-pointer ${selectedBlock === num ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-transparent hover:border-white/50 opacity-80'}`}
             >
                 <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm shadow-inner" style={{ backgroundColor: `#${COLORS[num].toString(16).padStart(6, '0')}` }}></div>
                 <span className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white text-[9px] w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full font-bold">{num}</span>
             </button>
         ))}
      </div>
    </div>
  );
}
