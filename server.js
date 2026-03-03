const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// Rooms: { roomCode: { players: [{id, name, symbol}], state: {...} } }
const rooms = {};

function createGameState() {
  return {
    cells: Array.from({ length: 9 }, () => Array(9).fill(null)),
    smallWinners: Array(9).fill(null),
    bigWinner: null,
    currentPlayer: 'X',
    activeSmall: null,
  };
}

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES)
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  if (board.every(v => v !== null)) return 'draw';
  return null;
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  // Create room
  socket.on('create_room', ({ playerName }) => {
    let code;
    do { code = generateCode(); } while (rooms[code]);

    rooms[code] = {
      players: [{ id: socket.id, name: playerName || 'Jogador X', symbol: 'X' }],
      state: createGameState(),
      rematch: {}
    };

    socket.join(code);
    socket.roomCode = code;
    socket.symbol = 'X';

    socket.emit('room_created', { code, symbol: 'X', playerName: playerName || 'Jogador X' });
    console.log(`Sala criada: ${code}`);
  });

  // Join room
  socket.on('join_room', ({ code, playerName }) => {
    const room = rooms[code];

    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada. Verifique o código.' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Sala cheia!' });
      return;
    }

    room.players.push({ id: socket.id, name: playerName || 'Jogador O', symbol: 'O' });
    socket.join(code);
    socket.roomCode = code;
    socket.symbol = 'O';

    const xPlayer = room.players[0];
    const oPlayer = room.players[1];

    // Notify both players
    socket.emit('game_start', {
      symbol: 'O',
      opponentName: xPlayer.name,
      state: room.state
    });

    io.to(xPlayer.id).emit('game_start', {
      symbol: 'X',
      opponentName: oPlayer.name,
      state: room.state
    });

    console.log(`Sala ${code} iniciou com 2 jogadores`);
  });

  // Play move
  socket.on('play_move', ({ sb, ci }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    const state = room.state;
    const { cells, smallWinners, currentPlayer, activeSmall } = state;

    // Validate it's this player's turn
    if (socket.symbol !== currentPlayer) return;
    if (state.bigWinner) return;
    if (cells[sb][ci] !== null || smallWinners[sb] !== null) return;
    if (activeSmall !== null && activeSmall !== sb) return;

    // Apply move
    cells[sb][ci] = currentPlayer;

    const sw = checkWinner(cells[sb]);
    if (sw) smallWinners[sb] = sw;

    const bw = checkWinner(smallWinners);
    if (bw && bw !== 'draw') {
      state.bigWinner = bw;
    } else if (smallWinners.every(s => s !== null)) {
      state.bigWinner = 'draw';
    } else {
      state.activeSmall = smallWinners[ci] !== null ? null : ci;
      state.currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }

    io.to(code).emit('state_update', { state });
  });

  // Rematch request
  socket.on('request_rematch', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.rematch[socket.id] = true;

    // If both want rematch
    if (room.players.length === 2 && room.players.every(p => room.rematch[p.id])) {
      room.state = createGameState();
      room.rematch = {};
      io.to(code).emit('rematch_start', { state: room.state });
    } else {
      // Notify opponent
      const opponent = room.players.find(p => p.id !== socket.id);
      if (opponent) io.to(opponent.id).emit('rematch_requested');
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);

    if (room.players.length === 0) {
      delete rooms[code];
      console.log(`Sala ${code} removida`);
    } else {
      io.to(code).emit('opponent_disconnected');
      console.log(`Jogador saiu da sala ${code}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
