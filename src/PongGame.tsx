import React, { useEffect, useRef } from 'react';

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const width = canvas.width;
    const height = canvas.height;

    const paddleWidth = 10;
    const paddleHeight = 80;
    const ballSize = 10;

    const state = {
      playerY: height / 2 - paddleHeight / 2,
      aiY: height / 2 - paddleHeight / 2,
      ballX: width / 2,
      ballY: height / 2,
      ballVX: 4,
      ballVY: 3,
      playerScore: 0,
      aiScore: 0,
    };

    const keys = { w: false, s: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      // Player movement
      if (keys.w) state.playerY = Math.max(0, state.playerY - 6);
      if (keys.s) state.playerY = Math.min(height - paddleHeight, state.playerY + 6);

      // AI movement
      const aiCenter = state.aiY + paddleHeight / 2;
      if (aiCenter < state.ballY - 10) state.aiY += 3;
      else if (aiCenter > state.ballY + 10) state.aiY -= 3;
      state.aiY = Math.max(0, Math.min(height - paddleHeight, state.aiY));

      // Ball movement
      state.ballX += state.ballVX;
      state.ballY += state.ballVY;

      // Top and bottom collision
      if (state.ballY <= 0 || state.ballY + ballSize >= height) {
        state.ballVY *= -1;
      }

      // Paddle collision
      if (state.ballX <= paddleWidth && state.ballY + ballSize >= state.playerY && state.ballY <= state.playerY + paddleHeight) {
        state.ballVX = Math.abs(state.ballVX) + 0.5;
        state.ballVY += (Math.random() - 0.5);
      } else if (state.ballX + ballSize >= width - paddleWidth && state.ballY + ballSize >= state.aiY && state.ballY <= state.aiY + paddleHeight) {
        state.ballVX = -Math.abs(state.ballVX) - 0.5;
        state.ballVY += (Math.random() - 0.5);
      }

      // Score
      if (state.ballX < 0) {
        state.aiScore++;
        resetBall();
      } else if (state.ballX > width) {
        state.playerScore++;
        resetBall();
      }
    };

    const resetBall = () => {
      state.ballX = width / 2;
      state.ballY = height / 2;
      state.ballVX = (Math.random() > 0.5 ? 4 : -4);
      state.ballVY = (Math.random() > 0.5 ? 3 : -3);
    };

    const draw = () => {
      ctx.fillStyle = '#0f172a'; // slate-950
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#22d3ee'; // cyan-400
      ctx.font = '32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${state.playerScore} - ${state.aiScore}`, width / 2, 50);

      // Center dashed line
      ctx.beginPath();
      ctx.setLineDash([10, 10]);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.strokeStyle = '#334155'; // slate-700
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = '#0ea5e9'; // sky-500
      ctx.fillRect(0, state.playerY, paddleWidth, paddleHeight);
      ctx.fillRect(width - paddleWidth, state.aiY, paddleWidth, paddleHeight);

      // Ball
      ctx.fillRect(state.ballX, state.ballY, ballSize, ballSize);
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold text-slate-200 mb-6 w-full text-left">Pong Arena</h2>
      <p className="text-slate-400 mb-4 text-sm w-full text-left">Use W/S or Up/Down arrows to move.</p>
      <div className="border border-cyan-900/50 shadow-lg shadow-cyan-900/20 rounded-lg overflow-hidden bg-slate-950">
        <canvas ref={canvasRef} width={600} height={400} className="max-w-full" />
      </div>
    </div>
  );
}
