import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import path from 'path';
import http from 'http';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  // Games state
  const ticTacToeRooms: Record<string, any> = {};
  const connect4Rooms: Record<string, any> = {};
  const rpsRooms: Record<string, any> = {};

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Tic Tac Toe Multiplayer
    socket.on('join_tictactoe', (roomId, user) => {
      socket.join(roomId);
      if (!ticTacToeRooms[roomId]) {
        ticTacToeRooms[roomId] = { players: [], board: Array(9).fill(null), turn: 'X', winner: null };
      }
      
      const room = ticTacToeRooms[roomId];
      if (room.players.length < 2 && !room.players.find((p: any) => p.id === socket.id)) {
        room.players.push({ id: socket.id, user, symbol: room.players.length === 0 ? 'X' : 'O' });
      }

      io.to(roomId).emit('tictactoe_state', room);
    });

    socket.on('play_tictactoe', (roomId, index) => {
      const room = ticTacToeRooms[roomId];
      if (!room || room.winner) return;

      const player = room.players.find((p: any) => p.id === socket.id);
      if (!player || player.symbol !== room.turn) return;

      if (!room.board[index]) {
        room.board[index] = player.symbol;
        room.turn = room.turn === 'X' ? 'O' : 'X';
        
        // check winner
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < lines.length; i++) {
          const [a, b, c] = lines[i];
          if (room.board[a] && room.board[a] === room.board[b] && room.board[a] === room.board[c]) {
            room.winner = room.board[a];
          }
        }
        if (!room.winner && !room.board.includes(null)) {
          room.winner = 'Draw';
        }

        io.to(roomId).emit('tictactoe_state', room);
      }
    });

    socket.on('restart_tictactoe', (roomId) => {
       const room = ticTacToeRooms[roomId];
       if (room) {
          room.board = Array(9).fill(null);
          room.turn = 'X';
          room.winner = null;
          io.to(roomId).emit('tictactoe_state', room);
       }
    });

    socket.on('leave_tictactoe', (roomId) => {
      socket.leave(roomId);
      const room = ticTacToeRooms[roomId];
      if (room) {
        room.players = room.players.filter((p: any) => p.id !== socket.id);
        if (room.players.length === 0) {
          delete ticTacToeRooms[roomId];
        } else {
          room.board = Array(9).fill(null);
          room.turn = 'X';
          room.winner = null;
          io.to(roomId).emit('tictactoe_state', room);
        }
      }
    });

    // Connect 4 Multiplayer
    const checkConnect4Winner = (board: string[]) => {
      const rows = 6;
      const cols = 7;
      const get = (r: number, c: number) => board[r * cols + c];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = get(r, c);
          if (!val) continue;

          // horizontal
          if (c <= cols - 4 && val === get(r, c+1) && val === get(r, c+2) && val === get(r, c+3)) return val;
          // vertical
          if (r <= rows - 4 && val === get(r+1, c) && val === get(r+2, c) && val === get(r+3, c)) return val;
          // diagonal down-right
          if (r <= rows - 4 && c <= cols - 4 && val === get(r+1, c+1) && val === get(r+2, c+2) && val === get(r+3, c+3)) return val;
          // diagonal up-right
          if (r >= 3 && c <= cols - 4 && val === get(r-1, c+1) && val === get(r-2, c+2) && val === get(r-3, c+3)) return val;
        }
      }
      if (!board.includes(null as any)) return 'Draw';
      return null;
    };

    socket.on('join_connect4', (roomId, user) => {
      socket.join(roomId);
      if (!connect4Rooms[roomId]) {
        connect4Rooms[roomId] = { players: [], board: Array(42).fill(null), turn: 'Red', winner: null };
      }
      
      const room = connect4Rooms[roomId];
      if (room.players.length < 2 && !room.players.find((p: any) => p.id === socket.id)) {
        room.players.push({ id: socket.id, user, symbol: room.players.length === 0 ? 'Red' : 'Yellow' });
      }

      io.to(roomId).emit('connect4_state', room);
    });

    socket.on('play_connect4', (roomId, col) => {
      const room = connect4Rooms[roomId];
      if (!room || room.winner) return;

      const player = room.players.find((p: any) => p.id === socket.id);
      if (!player || player.symbol !== room.turn) return;

      // Find lowest available spot in column
      let row = -1;
      for (let r = 5; r >= 0; r--) {
        if (!room.board[r * 7 + col]) {
          row = r;
          break;
        }
      }

      if (row !== -1) {
        room.board[row * 7 + col] = player.symbol;
        room.turn = room.turn === 'Red' ? 'Yellow' : 'Red';
        room.winner = checkConnect4Winner(room.board);

        io.to(roomId).emit('connect4_state', room);
      }
    });

    socket.on('restart_connect4', (roomId) => {
       const room = connect4Rooms[roomId];
       if (room) {
          room.board = Array(42).fill(null);
          room.turn = 'Red';
          room.winner = null;
          io.to(roomId).emit('connect4_state', room);
       }
    });

    socket.on('leave_connect4', (roomId) => {
      socket.leave(roomId);
      const room = connect4Rooms[roomId];
      if (room) {
        room.players = room.players.filter((p: any) => p.id !== socket.id);
        if (room.players.length === 0) {
          delete connect4Rooms[roomId];
        } else {
          room.board = Array(42).fill(null);
          room.turn = 'Red';
          room.winner = null;
          io.to(roomId).emit('connect4_state', room);
        }
      }
    });

    // Rock Paper Scissors Multiplayer
    socket.on('join_rps', (roomId, user) => {
      socket.join(roomId);
      if (!rpsRooms[roomId]) {
        rpsRooms[roomId] = { players: [], choices: {}, winner: null };
      }
      
      const room = rpsRooms[roomId];
      if (room.players.length < 2 && !room.players.find((p: any) => p.id === socket.id)) {
        room.players.push({ id: socket.id, user });
      }

      io.to(roomId).emit('rps_state', room);
    });

    socket.on('play_rps', (roomId, choice) => {
      const room = rpsRooms[roomId];
      if (!room || room.winner) return;

      const player = room.players.find((p: any) => p.id === socket.id);
      if (!player) return;

      room.choices[socket.id] = choice;

      if (Object.keys(room.choices).length === 2) {
        // Evaluate winner
        const p1 = room.players[0].id;
        const p2 = room.players[1].id;
        const c1 = room.choices[p1];
        const c2 = room.choices[p2];

        if (c1 === c2) {
          room.winner = 'Draw';
        } else if (
          (c1 === 'Rock' && c2 === 'Scissors') ||
          (c1 === 'Paper' && c2 === 'Rock') ||
          (c1 === 'Scissors' && c2 === 'Paper')
        ) {
          room.winner = p1;
        } else {
          room.winner = p2;
        }
      }

      io.to(roomId).emit('rps_state', room);
    });

    socket.on('restart_rps', (roomId) => {
       const room = rpsRooms[roomId];
       if (room) {
          room.choices = {};
          room.winner = null;
          io.to(roomId).emit('rps_state', room);
       }
    });

    socket.on('leave_rps', (roomId) => {
      socket.leave(roomId);
      const room = rpsRooms[roomId];
      if (room) {
        room.players = room.players.filter((p: any) => p.id !== socket.id);
        if (room.players.length === 0) {
          delete rpsRooms[roomId];
        } else {
          room.choices = {};
          room.winner = null;
          io.to(roomId).emit('rps_state', room);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Clean up tic tac toe rooms
      for (const roomId in ticTacToeRooms) {
        const room = ticTacToeRooms[roomId];
        const playerIndex = room.players.findIndex((p: any) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            delete ticTacToeRooms[roomId];
          } else {
             room.board = Array(9).fill(null);
             room.turn = 'X';
             room.winner = null;
             io.to(roomId).emit('tictactoe_state', room);
          }
        }
      }
      // Clean up connect 4 rooms
      for (const roomId in connect4Rooms) {
        const room = connect4Rooms[roomId];
        const playerIndex = room.players.findIndex((p: any) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            delete connect4Rooms[roomId];
          } else {
             room.board = Array(42).fill(null);
             room.turn = 'Red';
             room.winner = null;
             io.to(roomId).emit('connect4_state', room);
          }
        }
      }
      // Clean up RPS rooms
      for (const roomId in rpsRooms) {
        const room = rpsRooms[roomId];
        const playerIndex = room.players.findIndex((p: any) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            delete rpsRooms[roomId];
          } else {
             room.choices = {};
             room.winner = null;
             io.to(roomId).emit('rps_state', room);
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
