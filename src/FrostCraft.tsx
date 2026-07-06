import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const BLOCK_SIZE = 20;

const COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#4ade80', // Grass
  2: '#78350f', // Dirt
  3: '#94a3b8', // Stone
  4: '#b45309', // Wood
  5: '#22c55e', // Leaves
};

const ALL_SOLID = [1, 2, 3, 4, 5];

interface FrostCraftProps {
  currentUser: string;
}

export default function FrostCraft({ currentUser }: FrostCraftProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedBlock, setSelectedBlock] = useState(1);

  const stateRef = useRef({
    world: [] as number[][],
    width: 0,
    height: 0,
    players: {} as Record<string, any>,
    me: {
      x: 50 * BLOCK_SIZE,
      y: 10 * BLOCK_SIZE,
      vx: 0,
      vy: 0,
      width: 14,
      height: 28,
      facing: 1,
      grounded: false
    },
    camera: { x: 0, y: 0 },
    keys: { a: false, d: false, w: false, s: false, space: false },
    mouse: { x: 0, y: 0, isDown: false, button: 0 },
    selectedBlock: 1
  });

  useEffect(() => {
    stateRef.current.selectedBlock = selectedBlock;
  }, [selectedBlock]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join_frostcraft', currentUser);

    newSocket.on('frostcraft_init', (data) => {
      stateRef.current.world = data.world;
      stateRef.current.width = data.width;
      stateRef.current.height = data.height;
    });

    newSocket.on('frostcraft_players', (players) => {
      stateRef.current.players = players;
    });

    newSocket.on('frostcraft_block_update', (data) => {
      const { x, y, type } = data;
      if (stateRef.current.world[y] && stateRef.current.world[y][x] !== undefined) {
         stateRef.current.world[y][x] = type;
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = stateRef.current.keys;
      if (e.key === 'a' || e.key === 'A') keys.a = true;
      if (e.key === 'd' || e.key === 'D') keys.d = true;
      if (e.key === 'w' || e.key === 'W' || e.key === ' ') { keys.w = true; keys.space = true; }
      if (e.key === 's' || e.key === 'S') keys.s = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = stateRef.current.keys;
      if (e.key === 'a' || e.key === 'A') keys.a = false;
      if (e.key === 'd' || e.key === 'D') keys.d = false;
      if (e.key === 'w' || e.key === 'W' || e.key === ' ') { keys.w = false; keys.space = false; }
      if (e.key === 's' || e.key === 'S') keys.s = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouse.x = e.clientX - rect.left;
      stateRef.current.mouse.y = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      stateRef.current.mouse.isDown = true;
      stateRef.current.mouse.button = e.button; 
      interactWithWorld();
    };

    const handleMouseUp = (e: MouseEvent) => {
      stateRef.current.mouse.isDown = false;
    };

    const interactWithWorld = () => {
       const state = stateRef.current;
       if (!state.world.length) return;
       
       const mx = state.mouse.x + state.camera.x;
       const my = state.mouse.y + state.camera.y;
       const tx = Math.floor(mx / BLOCK_SIZE);
       const ty = Math.floor(my / BLOCK_SIZE);

       if (tx >= 0 && tx < state.width && ty >= 0 && ty < state.height) {
          const dx = tx * BLOCK_SIZE + BLOCK_SIZE/2 - (state.me.x + state.me.width/2);
          const dy = ty * BLOCK_SIZE + BLOCK_SIZE/2 - (state.me.y + state.me.height/2);
          if (Math.sqrt(dx*dx + dy*dy) > 100) return; // Too far

          if (state.mouse.button === 0) {
             // Break
             if (state.world[ty][tx] !== 0) {
                newSocket.emit('frostcraft_set_block', { x: tx, y: ty, type: 0 });
                state.world[ty][tx] = 0;
             }
          } else if (state.mouse.button === 2) {
             // Place
             if (state.world[ty][tx] === 0) {
                newSocket.emit('frostcraft_set_block', { x: tx, y: ty, type: state.selectedBlock });
                state.world[ty][tx] = state.selectedBlock;
             }
          }
       }
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    let lastTime = performance.now();

    const isSolid = (tx: number, ty: number) => {
       if (tx < 0 || tx >= stateRef.current.width || ty < 0 || ty >= stateRef.current.height) return true;
       return ALL_SOLID.includes(stateRef.current.world[ty][tx]);
    };

    const checkCollision = (x: number, y: number, w: number, h: number) => {
       const tx1 = Math.floor(x / BLOCK_SIZE);
       const tx2 = Math.floor((x + w - 1) / BLOCK_SIZE);
       const ty1 = Math.floor(y / BLOCK_SIZE);
       const ty2 = Math.floor((y + h - 1) / BLOCK_SIZE);

       for (let ty = ty1; ty <= ty2; ty++) {
          for (let tx = tx1; tx <= tx2; tx++) {
             if (isSolid(tx, ty)) return true;
          }
       }
       return false;
    };

    let syncTimer = 0;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const state = stateRef.current;

      if (state.world.length > 0) {
        const speed = 150;
        const gravity = 600;
        const jumpForce = 300;

        if (state.keys.a) { state.me.vx = -speed; state.me.facing = -1; }
        else if (state.keys.d) { state.me.vx = speed; state.me.facing = 1; }
        else state.me.vx = 0;

        state.me.vy += gravity * dt;

        let nextX = state.me.x + state.me.vx * dt;
        if (!checkCollision(nextX, state.me.y, state.me.width, state.me.height)) {
           state.me.x = nextX;
        } else {
           state.me.vx = 0;
           state.me.x = Math.round(state.me.x);
        }

        let nextY = state.me.y + state.me.vy * dt;
        state.me.grounded = false;
        if (!checkCollision(state.me.x, nextY, state.me.width, state.me.height)) {
           state.me.y = nextY;
        } else {
           if (state.me.vy > 0) state.me.grounded = true;
           state.me.vy = 0;
           state.me.y = Math.round(state.me.y);
        }

        if (state.keys.w && state.me.grounded) {
           state.me.vy = -jumpForce;
        }

        state.camera.x = state.me.x + state.me.width / 2 - canvas.width / 2;
        state.camera.y = state.me.y + state.me.height / 2 - canvas.height / 2;

        state.camera.x = Math.max(0, Math.min(state.camera.x, state.width * BLOCK_SIZE - canvas.width));
        state.camera.y = Math.max(0, Math.min(state.camera.y, state.height * BLOCK_SIZE - canvas.height));

        syncTimer += dt;
        if (syncTimer > 0.05) { 
           syncTimer = 0;
           newSocket.emit('frostcraft_update_pos', { x: state.me.x, y: state.me.y, facing: state.me.facing });
        }
      }

      ctx.fillStyle = '#0f172a'; // Deep sky
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-state.camera.x, -state.camera.y);

      if (state.world.length > 0) {
         const startX = Math.max(0, Math.floor(state.camera.x / BLOCK_SIZE));
         const endX = Math.min(state.width, Math.ceil((state.camera.x + canvas.width) / BLOCK_SIZE));
         const startY = Math.max(0, Math.floor(state.camera.y / BLOCK_SIZE));
         const endY = Math.min(state.height, Math.ceil((state.camera.y + canvas.height) / BLOCK_SIZE));

         for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
               const type = state.world[y][x];
               if (type !== 0) {
                  ctx.fillStyle = COLORS[type];
                  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
               }
            }
         }
      }

      for (const id in state.players) {
         const p = state.players[id];
         if (id === newSocket.id) continue;
         
         ctx.fillStyle = p.color || '#fff';
         ctx.fillRect(p.x, p.y, 14, 28);
         
         ctx.fillStyle = '#000';
         if (p.facing === 1) {
            ctx.fillRect(p.x + 8, p.y + 4, 3, 3);
         } else {
            ctx.fillRect(p.x + 3, p.y + 4, 3, 3);
         }

         ctx.fillStyle = '#fff';
         ctx.font = '10px sans-serif';
         ctx.textAlign = 'center';
         ctx.fillText(p.user, p.x + 7, p.y - 5);
      }

      ctx.fillStyle = '#fff';
      ctx.fillRect(state.me.x, state.me.y, state.me.width, state.me.height);
      ctx.fillStyle = '#000';
      if (state.me.facing === 1) {
         ctx.fillRect(state.me.x + 8, state.me.y + 4, 3, 3);
      } else {
         ctx.fillRect(state.me.x + 3, state.me.y + 4, 3, 3);
      }
      ctx.fillStyle = '#cyan';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUser, state.me.x + state.me.width/2, state.me.y - 5);

      const mx = state.mouse.x + state.camera.x;
      const my = state.mouse.y + state.camera.y;
      const tx = Math.floor(mx / BLOCK_SIZE);
      const ty = Math.floor(my / BLOCK_SIZE);
      if (tx >= 0 && tx < state.width && ty >= 0 && ty < state.height) {
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
         ctx.lineWidth = 2;
         ctx.strokeRect(tx * BLOCK_SIZE, ty * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }

      ctx.restore();

      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      cancelAnimationFrame(animationFrame);
      newSocket.emit('leave_frostcraft');
      newSocket.disconnect();
    };
  }, [currentUser]);

  return (
    <div className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col items-center justify-center relative">
      <h2 className="text-xl font-bold text-slate-200 mb-2 w-full text-left">FrostCraft (Multiplayer Sandbox)</h2>
      
      <div className="flex gap-2 mb-4 bg-slate-950 p-2 rounded-lg border border-slate-800">
         {[
           { id: 1, name: 'Grass', color: COLORS[1] },
           { id: 2, name: 'Dirt', color: COLORS[2] },
           { id: 3, name: 'Stone', color: COLORS[3] },
           { id: 4, name: 'Wood', color: COLORS[4] },
           { id: 5, name: 'Leaves', color: COLORS[5] }
         ].map(b => (
           <button
             key={b.id}
             onClick={() => setSelectedBlock(b.id)}
             className={`flex flex-col items-center p-2 rounded border-2 transition-all ${selectedBlock === b.id ? 'border-white bg-slate-800' : 'border-transparent hover:bg-slate-800'}`}
           >
              <div className="w-6 h-6 rounded-sm shadow-inner" style={{ backgroundColor: b.color }}></div>
              <span className="text-[10px] mt-1 text-slate-300">{b.name}</span>
           </button>
         ))}
      </div>

      <div className="border border-cyan-900/50 shadow-lg shadow-cyan-900/20 rounded-lg overflow-hidden bg-slate-950 relative">
        <canvas ref={canvasRef} width={800} height={400} className="max-w-full cursor-crosshair block" />
      </div>
      <p className="mt-4 text-slate-400 text-sm flex gap-4">
        <span><b>WASD</b>: Move/Jump</span>
        <span><b>Left Click</b>: Break Block</span>
        <span><b>Right Click</b>: Place Block</span>
      </p>
    </div>
  );
}
