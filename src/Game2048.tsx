import React, { useState, useEffect } from 'react';

type Grid = number[][];

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => initializeGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  function initializeGrid() {
    let newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    return newGrid;
  }

  function addRandomTile(currentGrid: Grid): Grid {
    const emptyCells: {r: number, c: number}[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentGrid[r][c] === 0) emptyCells.push({r, c});
      }
    }
    if (emptyCells.length === 0) return currentGrid;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = [...currentGrid.map(row => [...row])];
    newGrid[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
  }

  function move(direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') {
    if (gameOver) return;
    
    let newGrid = [...grid.map(row => [...row])];
    let changed = false;
    let addedScore = 0;

    const slideAndMerge = (row: number[]) => {
      let nonZero = row.filter(val => val !== 0);
      for (let i = 0; i < nonZero.length - 1; i++) {
        if (nonZero[i] === nonZero[i+1]) {
          nonZero[i] *= 2;
          addedScore += nonZero[i];
          nonZero.splice(i + 1, 1);
        }
      }
      while (nonZero.length < 4) nonZero.push(0);
      return nonZero;
    };

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const newRow = slideAndMerge(newGrid[r]);
        if (newRow.join(',') !== newGrid[r].join(',')) changed = true;
        newGrid[r] = newRow;
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const newRow = slideAndMerge([...newGrid[r]].reverse()).reverse();
        if (newRow.join(',') !== newGrid[r].join(',')) changed = true;
        newGrid[r] = newRow;
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
        const newCol = slideAndMerge(col);
        if (newCol.join(',') !== col.join(',')) changed = true;
        for (let r = 0; r < 4; r++) newGrid[r][c] = newCol[r];
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
        const newCol = slideAndMerge(col).reverse();
        const oldCol = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
        if (newCol.join(',') !== oldCol.join(',')) changed = true;
        for (let r = 0; r < 4; r++) newGrid[r][c] = newCol[r];
      }
    }

    if (changed) {
      newGrid = addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(s => s + addedScore);
      checkGameOver(newGrid);
    }
  }

  function checkGameOver(currentGrid: Grid) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentGrid[r][c] === 0) return;
        if (r < 3 && currentGrid[r][c] === currentGrid[r+1][c]) return;
        if (c < 3 && currentGrid[r][c] === currentGrid[r][c+1]) return;
      }
    }
    setGameOver(true);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault(); // Prevent scrolling
      }
      if (e.key === 'ArrowUp') move('UP');
      else if (e.key === 'ArrowDown') move('DOWN');
      else if (e.key === 'ArrowLeft') move('LEFT');
      else if (e.key === 'ArrowRight') move('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, gameOver]);

  const getTileColor = (val: number) => {
    const colors: Record<number, string> = {
      0: 'bg-slate-800 text-transparent',
      2: 'bg-slate-200 text-slate-800',
      4: 'bg-slate-300 text-slate-800',
      8: 'bg-orange-300 text-orange-900',
      16: 'bg-orange-400 text-white',
      32: 'bg-orange-500 text-white',
      64: 'bg-red-500 text-white',
      128: 'bg-yellow-400 text-yellow-900 shadow-[0_0_10px_rgba(250,204,21,0.5)]',
      256: 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.6)]',
      512: 'bg-yellow-600 text-white shadow-[0_0_20px_rgba(202,138,4,0.7)]',
      1024: 'bg-amber-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.8)]',
      2048: 'bg-amber-600 text-white shadow-[0_0_30px_rgba(217,119,6,0.9)]',
    };
    return colors[val] || 'bg-slate-900 text-white';
  };

  return (
    <div className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold text-slate-200 mb-2 w-full text-left">2048</h2>
      <div className="flex justify-between w-full max-w-xs mb-4">
        <span className="text-orange-400 font-bold text-lg">Score: {score}</span>
        <button 
          onClick={() => { setGrid(initializeGrid()); setScore(0); setGameOver(false); }}
          className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded"
        >
          New Game
        </button>
      </div>
      
      <div className="bg-slate-950 p-3 rounded-xl border border-cyan-900/50 shadow-lg relative">
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl z-10">
            <span className="text-2xl font-bold text-white mb-4">Game Over!</span>
            <button 
              onClick={() => { setGrid(initializeGrid()); setScore(0); setGameOver(false); }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded font-medium"
            >
              Try Again
            </button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {grid.map((row, r) => row.map((val, c) => (
            <div 
              key={`${r}-${c}`} 
              className={`w-16 h-16 flex items-center justify-center rounded-lg font-bold text-xl transition-all duration-150 ${getTileColor(val)}`}
            >
              {val !== 0 ? val : ''}
            </div>
          )))}
        </div>
      </div>
      <p className="mt-4 text-slate-400 text-sm">Use Arrow Keys to join the numbers and get to the 2048 tile!</p>
    </div>
  );
}
