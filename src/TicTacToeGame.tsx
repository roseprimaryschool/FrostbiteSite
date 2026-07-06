import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface TicTacToeGameProps {
  currentUser: string;
}

export default function TicTacToeGame({ currentUser }: TicTacToeGameProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [roomId, setRoomId] = useState('global-tictactoe');

  useEffect(() => {
    // Connect to same origin
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join_tictactoe', roomId, currentUser);

    newSocket.on('tictactoe_state', (state) => {
      setGameState(state);
    });

    return () => {
      newSocket.emit('leave_tictactoe', roomId);
      newSocket.disconnect();
    };
  }, [roomId, currentUser]);

  const handlePlay = (index: number) => {
    if (socket) {
      socket.emit('play_tictactoe', roomId, index);
    }
  };

  const handleRestart = () => {
    if (socket) {
      socket.emit('restart_tictactoe', roomId);
    }
  };

  if (!gameState) {
    return <div className="text-cyan-400">Connecting to game...</div>;
  }

  const me = gameState.players.find((p: any) => p.user === currentUser);
  const myTurn = me && me.symbol === gameState.turn;

  return (
    <div className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold text-slate-200 mb-2 w-full text-left flex items-center space-x-2">
        <span>Multiplayer Tic-Tac-Toe</span>
      </h2>
      <div className="flex justify-between w-full max-w-sm mb-4 text-sm">
        <div className="text-slate-400">
          Players: {gameState.players.map((p: any) => p.user).join(' vs ') || 'Waiting...'}
        </div>
        <div className="text-cyan-400 font-medium">
          {gameState.winner 
            ? gameState.winner === 'Draw' ? 'Draw!' : `Winner: ${gameState.players.find((p:any) => p.symbol === gameState.winner)?.user || gameState.winner}`
            : gameState.players.length < 2 ? 'Waiting for opponent...' : myTurn ? 'Your Turn' : "Opponent's Turn"
          }
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-cyan-900/50 shadow-lg shadow-cyan-900/20">
        {gameState.board.map((cell: string, idx: number) => (
          <button
            key={idx}
            onClick={() => handlePlay(idx)}
            disabled={!!cell || !!gameState.winner || !myTurn || gameState.players.length < 2}
            className={`w-20 h-20 text-3xl font-bold rounded-lg flex items-center justify-center transition-all ${
              cell === 'X' ? 'text-cyan-400 bg-slate-800' 
              : cell === 'O' ? 'text-emerald-400 bg-slate-800' 
              : 'bg-slate-800 hover:bg-slate-700 cursor-pointer text-transparent hover:text-slate-500'
            }`}
          >
            {cell || '-'}
          </button>
        ))}
      </div>

      {gameState.winner && (
        <button 
          onClick={handleRestart}
          className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
