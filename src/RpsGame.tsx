import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Hand, HandMetal, FileDigit, Scissors } from 'lucide-react'; // Approximations for RPS

interface RpsGameProps {
  currentUser: string;
}

export default function RpsGame({ currentUser }: RpsGameProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [roomId, setRoomId] = useState('global-rps');
  const [myChoice, setMyChoice] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join_rps', roomId, currentUser);

    newSocket.on('rps_state', (state) => {
      setGameState(state);
      // Reset my choice if game restarted
      if (!state.choices[newSocket.id]) {
        setMyChoice(null);
      }
    });

    return () => {
      newSocket.emit('leave_rps', roomId);
      newSocket.disconnect();
    };
  }, [roomId, currentUser]);

  const handlePlay = (choice: string) => {
    if (socket && !myChoice) {
      setMyChoice(choice);
      socket.emit('play_rps', roomId, choice);
    }
  };

  const handleRestart = () => {
    if (socket) {
      socket.emit('restart_rps', roomId);
    }
  };

  if (!gameState) {
    return <div className="text-purple-400">Connecting to game...</div>;
  }

  const getWinnerMessage = () => {
    if (!gameState.winner) return null;
    if (gameState.winner === 'Draw') return "It's a Draw!";
    const winnerPlayer = gameState.players.find((p: any) => p.id === gameState.winner);
    return `${winnerPlayer?.user} Wins!`;
  };

  const getChoiceIcon = (choice: string) => {
    if (choice === 'Rock') return <HandMetal className="w-12 h-12" />;
    if (choice === 'Paper') return <Hand className="w-12 h-12" />;
    if (choice === 'Scissors') return <Scissors className="w-12 h-12" />;
    return null;
  };

  return (
    <div className="bg-slate-900/30 border border-purple-900/20 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold text-slate-200 mb-2 w-full text-left">Multiplayer RPS</h2>
      
      <div className="flex justify-between w-full max-w-md mb-6 text-sm">
        <div className="text-slate-400">
          Players: {gameState.players.map((p: any) => p.user).join(' vs ') || 'Waiting...'}
        </div>
        <div className="text-purple-400 font-medium">
          {gameState.winner ? getWinnerMessage() : gameState.players.length < 2 ? 'Waiting for opponent...' : 'Choose your weapon!'}
        </div>
      </div>
      
      <div className="flex gap-4 mb-8">
        {['Rock', 'Paper', 'Scissors'].map(choice => (
          <button
            key={choice}
            onClick={() => handlePlay(choice)}
            disabled={!!gameState.winner || gameState.players.length < 2 || !!myChoice}
            className={`w-24 h-24 flex flex-col items-center justify-center rounded-xl border-2 transition-all ${
              myChoice === choice 
                ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-purple-500/50 hover:text-purple-300 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:border-slate-700'
            }`}
          >
            {getChoiceIcon(choice)}
            <span className="mt-2 font-medium">{choice}</span>
          </button>
        ))}
      </div>

      {gameState.winner && (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-8 mb-6">
             {gameState.players.map((p: any) => (
                <div key={p.id} className="flex flex-col items-center">
                  <span className="text-slate-300 font-medium mb-2">{p.user}</span>
                  <div className={`p-4 rounded-full bg-slate-800 border-2 ${gameState.winner === p.id ? 'border-green-500 text-green-400' : gameState.winner === 'Draw' ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
                    {getChoiceIcon(gameState.choices[p.id])}
                  </div>
                </div>
             ))}
          </div>
          <button 
            onClick={handleRestart}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
