const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// rooms: { code: { players, state, chat, cleanupTimer } }
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

function getRoomForSocket(socketId) {
  for (const [code, room] of Object.entries(rooms)) {
    if (room.players.some(p => p.id === socketId)) return { code, room };
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  // ---- CREATE ROOM ----
  socket.on('create_room', ({ playerName }) => {
    let code;
    do { code = generateCode(); } while (rooms[code]);

    rooms[code] = {
      players: [{ id: socket.id, name: playerName || 'Jogador X', symbol: 'X', connected: true }],
      state: createGameState(),
      chat: [],
      cleanupTimer: null,
      score: { X: 0, O: 0, draw: 0 },
      rematch: {}
    };

    socket.join(code);
    socket.roomCode = code;
    socket.symbol = 'X';
    socket.emit('room_created', { code, symbol: 'X' });
    console.log(`Sala criada: ${code}`);
  });

  // ---- JOIN ROOM ----
  socket.on('join_room', ({ code, playerName }) => {
    const room = rooms[code];
    if (!room) { socket.emit('error', { message: 'Sala não encontrada. Verifique o código.' }); return; }

    // Check if this is a reconnection (same name/symbol slot)
    const existingO = room.players.find(p => p.symbol === 'O');
    if (existingO && !existingO.connected) {
      // Reconnect as O
      existingO.id = socket.id;
      existingO.connected = true;
      if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }
      socket.join(code);
      socket.roomCode = code;
      socket.symbol = 'O';
      socket.emit('game_start', { symbol: 'O', opponentName: room.players[0].name, state: room.state, score: room.score, chat: room.chat });
      io.to(room.players[0].id).emit('opponent_reconnected', { name: existingO.name });
      console.log(`Reconectado como O na sala ${code}`);
      return;
    }

    if (room.players.length >= 2) { socket.emit('error', { message: 'Sala cheia!' }); return; }

    room.players.push({ id: socket.id, name: playerName || 'Jogador O', symbol: 'O', connected: true });
    if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }

    socket.join(code);
    socket.roomCode = code;
    socket.symbol = 'O';

    const xPlayer = room.players[0];
    const oPlayer = room.players[1];

    socket.emit('game_start', { symbol: 'O', opponentName: xPlayer.name, state: room.state, score: room.score, chat: room.chat });
    io.to(xPlayer.id).emit('game_start', { symbol: 'X', opponentName: oPlayer.name, state: room.state, score: room.score, chat: room.chat });
    console.log(`Sala ${code} iniciada`);
  });

  // ---- RECONNECT (player returning to tab) ----
  socket.on('reconnect_room', ({ code, symbol, playerName }) => {
    const room = rooms[code];
    if (!room) { socket.emit('error', { message: 'Sala expirou. Crie uma nova.' }); return; }

    const player = room.players.find(p => p.symbol === symbol);
    if (!player) { socket.emit('error', { message: 'Slot não encontrado.' }); return; }

    // Update socket id
    player.id = socket.id;
    player.connected = true;
    if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }

    socket.join(code);
    socket.roomCode = code;
    socket.symbol = symbol;

    const opponent = room.players.find(p => p.symbol !== symbol);

    socket.emit('reconnect_success', {
      symbol,
      opponentName: opponent ? opponent.name : '',
      opponentConnected: opponent ? opponent.connected : false,
      state: room.state,
      score: room.score,
      chat: room.chat
    });

    if (opponent && opponent.connected) {
      io.to(opponent.id).emit('opponent_reconnected', { name: player.name });
    }

    console.log(`${symbol} reconectou na sala ${code}`);
  });

  // ---- PLAY MOVE ----
  socket.on('play_move', ({ sb, ci }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    const state = room.state;
    if (socket.symbol !== state.currentPlayer) return;
    if (state.bigWinner) return;
    if (state.cells[sb][ci] !== null || state.smallWinners[sb] !== null) return;
    if (state.activeSmall !== null && state.activeSmall !== sb) return;

    state.cells[sb][ci] = state.currentPlayer;

    const sw = checkWinner(state.cells[sb]);
    if (sw) state.smallWinners[sb] = sw;

    const bw = checkWinner(state.smallWinners);
    if (bw && bw !== 'draw') {
      state.bigWinner = bw;
      room.score[bw]++;
    } else if (state.smallWinners.every(s => s !== null)) {
      state.bigWinner = 'draw';
      room.score.draw++;
    } else {
      state.activeSmall = state.smallWinners[ci] !== null ? null : ci;
      state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    }

    io.to(code).emit('state_update', { state, score: room.score });
  });

  // ---- CHAT ----
  socket.on('chat_message', ({ text }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !text || text.trim().length === 0) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const msg = {
      symbol: player.symbol,
      name: player.name,
      text: text.trim().substring(0, 200),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    // Keep last 100 messages
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();

    io.to(code).emit('chat_message', msg);
  });

  // ---- REMATCH ----
  socket.on('request_rematch', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.rematch[socket.id] = true;
    if (room.players.length === 2 && room.players.every(p => room.rematch[p.id])) {
      room.state = createGameState();
      room.rematch = {};
      io.to(code).emit('rematch_start', { state: room.state });
    } else {
      const opponent = room.players.find(p => p.id !== socket.id);
      if (opponent && opponent.connected) io.to(opponent.id).emit('rematch_requested');
    }
  });

  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.connected = false;
      console.log(`${player.symbol} desconectou da sala ${code}`);
    }

    const opponent = room.players.find(p => p.id !== socket.id);
    if (opponent && opponent.connected) {
      io.to(opponent.id).emit('opponent_disconnected_temp');
    }

    // Give 3 minutes for reconnection before destroying room
    room.cleanupTimer = setTimeout(() => {
      if (rooms[code] && room.players.every(p => !p.connected)) {
        delete rooms[code];
        console.log(`Sala ${code} removida por inatividade`);
      }
    }, 3 * 60 * 1000);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
