import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Connect4GameProps {
  currentUser: string;
}

export default function Connect4Game({ currentUser }: Connect4GameProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [roomId, setRoomId] = useState('global-connect4');

  useEffect(() => {
    // Connect to same origin
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join_connect4', roomId, currentUser);

    newSocket.on('connect4_state', (state) => {
      setGameState(state);
    });

    return () => {
      newSocket.emit('leave_connect4', roomId);
      newSocket.disconnect();
    };
  }, [roomId, currentUser]);

  const handlePlay = (col: number) => {
    if (socket) {
      socket.emit('play_connect4', roomId, col);
    }
  };

  const handleRestart = () => {
    if (socket) {
      socket.emit('restart_connect4', roomId);
    }
  };

  if (!gameState) {
    return <div className="text-cyan-400">Connecting to game...</div>;
  }

  const me = gameState.players.find((p: any) => p.user === currentUser);
  const myTurn = me && me.symbol === gameState.turn;

  return (
    <div className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold text-slate-200 mb-2 w-full text-left">Multiplayer Connect 4</h2>
      
      <div className="flex justify-between w-full max-w-md mb-4 text-sm">
        <div className="text-slate-400">
          Players: {gameState.players.map((p: any) => (
            <span key={p.id} className={p.symbol === 'Red' ? 'text-red-400' : 'text-yellow-400'}>{p.user}</span>
          )).reduce((prev: any, curr: any) => [prev, ' vs ', curr], []) || 'Waiting...'}
        </div>
        <div className="text-cyan-400 font-medium">
          {gameState.winner 
            ? gameState.winner === 'Draw' ? 'Draw!' : `Winner: ${gameState.players.find((p:any) => p.symbol === gameState.winner)?.user || gameState.winner}`
            : gameState.players.length < 2 ? 'Waiting for opponent...' : myTurn ? 'Your Turn' : "Opponent's Turn"
          }
        </div>
      </div>
      
      <div className="bg-blue-900 p-3 rounded-xl border border-blue-700/50 shadow-lg shadow-blue-900/20 flex flex-col gap-2">
        {Array(6).fill(null).map((_, row) => (
          <div key={`row-${row}`} className="flex gap-2">
            {Array(7).fill(null).map((_, col) => {
              const cell = gameState.board[row * 7 + col];
              return (
                <button
                  key={`cell-${row}-${col}`}
                  onClick={() => handlePlay(col)}
                  disabled={!!gameState.winner || !myTurn || gameState.players.length < 2}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-inner shadow-black/50 border-2 ${
                    cell === 'Red' ? 'bg-red-500 border-red-400' 
                    : cell === 'Yellow' ? 'bg-yellow-400 border-yellow-300' 
                    : 'bg-slate-950/80 border-blue-950 hover:bg-slate-800 cursor-pointer'
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {gameState.winner && (
        <button 
          onClick={handleRestart}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
