import React, { useEffect, useRef, useState } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 15 };
    let dx = 0;
    let dy = 0;
    let interval: any;
    let currentScore = 0;
    let isGameOver = false;

    const placeFood = () => {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Check if food is on snake
      for (const segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
          placeFood();
          break;
        }
      }
    };

    const draw = () => {
      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

      // Draw food
      ctx.fillStyle = '#ef4444'; // red-500
      ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      // Draw snake
      ctx.fillStyle = '#22c55e'; // green-500
      snake.forEach((segment, index) => {
        if (index === 0) ctx.fillStyle = '#16a34a'; // Darker green for head
        else ctx.fillStyle = '#22c55e';
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
      });
    };

    const update = () => {
      if (isGameOver) return;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        isGameOver = true;
        setGameOver(true);
        return;
      }

      // Self collision
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          isGameOver = true;
          setGameOver(true);
          return;
        }
      }

      snake.unshift(head);

      // Food collision
      if (head.x === food.x && head.y === food.y) {
        currentScore += 10;
        setScore(currentScore);
        placeFood();
      } else {
        snake.pop();
      }

      draw();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
      else if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
      else if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
      else if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Initial draw
    draw();
    
    interval = setInterval(update, 100);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  const handleRestart = () => {
    setScore(0);
    setGameOver(false);
    // Component will unmount and remount due to key change trick, or we can just reload it.
    // Easiest is to force a re-render. We'll do it by just keeping it simple for now.
  };

  return (
    <div className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold text-slate-200 mb-2 w-full text-left">Classic Snake</h2>
      <div className="flex justify-between w-full max-w-sm mb-4">
        <span className="text-cyan-400 font-bold">Score: {score}</span>
        {gameOver && <span className="text-red-400 font-bold">Game Over!</span>}
      </div>
      
      <div className="relative border border-cyan-900/50 shadow-lg shadow-cyan-900/20 rounded-lg overflow-hidden bg-slate-950">
        <canvas ref={canvasRef} width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE} />
        {gameOver && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <button 
              onClick={() => window.location.reload()} // Hacky but works for isolated game
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
      <p className="mt-4 text-slate-400 text-sm">Use Arrow Keys to move.</p>
    </div>
  );
}
