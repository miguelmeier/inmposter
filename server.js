/**
 * IMPOSTER GAME - Backend Server
 * Node.js + Express + Socket.io multiplayer game server
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---------------------------------------------------------------------------
// Static files
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Word / Hint pairs used during the game
// ---------------------------------------------------------------------------
const WORD_PAIRS = [
  // --- DIE HARDCORE FALLEN (Klingt nach Sex, ist aber harmlos) ---
  { word: "Zahnarzt",       hint: "Tief in den Rachen, bis es weh tut." },
  { word: "Lutscher",       hint: "Erst hart, im Mund dann klebrig." },
  { word: "Strohhalm",      hint: "Nur durch Saugen kommt was." },
  { word: "Banane",         hint: "Pellen, dann einführen." },
  { word: "Geldautomat",    hint: "Karte rein, unten kommt's raus." },
  { word: "Bowlingkugel",   hint: "Drei Finger rein, dann werfen." },
  { word: "Socke",          hint: "Zieht man drüber, wird oft steif." },
  { word: "Zelt",           hint: "Morgens steht die Stange." },
  { word: "Ketchupflasche", hint: "Hintern hauen bis es spritzt." },
  { word: "Bus",            hint: "Hinten einsteigen kostet extra." },
  { word: "Mikrofon",       hint: "Fest umklammern, Lippen ran." },
  { word: "Schlüssel",      hint: "Drehen bis das Loch aufgeht." },
  { word: "Staubsauger",    hint: "Bläst nicht, saugt nur." },
  { word: "Kerze",          hint: "Heißes Wachs und der Stab wird kleiner." },
  { word: "Teebeutel",      hint: "Rein, raus, bis der Saft kommt." },
  { word: "Toaster",        hint: "Reinstecken, warten, heiß rausziehen." },

  // --- SEX & DATING (Kurz & Knapp) ---
  { word: "One Night Stand", hint: "Rein, raus, tschüss." },
  { word: "Doggy Style",     hint: "Schlechte Aussicht, gutes Gefühl." },
  { word: "Tinder",          hint: "Wischen, wischen, Treffer." },
  { word: "Kondom",          hint: "Ohne Gefühl, aber sicher." },
  { word: "Pornostar",       hint: "Stöhnt beruflich vor Zuschauern." },
  { word: "Handschellen",    hint: "Klick und fest." },
  { word: "Dildo",           hint: "Vibriert und meckert nicht." },
  { word: "Gleitgel",        hint: "Wenn's trocken ist, tut's weh." },
  { word: "Swingerclub",     hint: "Tausche Partner gegen Partner." },
  { word: "Blowjob",         hint: "Kopf nicken mit vollem Mund." },
  { word: "Vorspiel",        hint: "Das Aufwärmen dauert länger als das Spiel." },
  { word: "Orgasmus",        hint: "Kurz zucken, dann schlafen." },
  { word: "Stripclub",       hint: "Nur gucken, nicht anfassen." },
  { word: "Walk of Shame",   hint: "Morgens im Party-Outfit heim." },
  { word: "69",              hint: "Kopf an Fuß, gerecht verteilt." },
  { word: "Sperma",          hint: "Nur einer kommt durchs Ziel." },
  { word: "BH",              hint: "Abends wird die Last befreit." },
  { word: "Inzest",          hint: "Alles bleibt in der Familie." },
  { word: "Dreier",          hint: "Einer ist immer das fünfte Rad." },

  // --- JUGEND & LIFESTYLE (Trocken) ---
  { word: "Influencer",      hint: "Nichts können, aber Likes kriegen." },
  { word: "Shisha",          hint: "Schlauch teilen, Blubbern hören." },
  { word: "Kater",           hint: "Der Kopf dröhnt, Magen dreht." },
  { word: "Kiffen",          hint: "Rote Augen, großer Hunger." },
  { word: "Türsteher",       hint: "Du kommst hier nicht rein." },
  { word: "Fitnessstudio",   hint: "Zahlen, schwitzen, Spiegel gucken." },
  { word: "Vegetarier",      hint: "Isst dem Essen das Essen weg." },
  { word: "Smartphone",      hint: "Streicheln, starren, ignorieren." },
  { word: "Ex-Freund",       hint: "Ein Fehler mit Namen." },
  { word: "Friendzone",      hint: "Zuhören ja, Anfassen nein." },
  { word: "Fake ID",         hint: "Lüge auf Plastik gedruckt." },

  // --- BERUF & GESELLSCHAFT ---
  { word: "Chef",            hint: "Oben sitzen, unten treten." },
  { word: "Arbeitslos",      hint: "Viel Zeit, null Cash." },
  { word: "Polizei",         hint: "Blaues Licht, Party vorbei." },
  { word: "Lehrer",          hint: "Redet, keiner hört zu." },
  { word: "Gynäkologe",      hint: "Guckt rein, wo andere Spaß haben." },
  { word: "Priester",        hint: "Schwarzes Kleid, hört Geheimnisse." },
  { word: "Beerdigung",      hint: "Einer liegt, alle weinen." },
  { word: "Gefängnis",       hint: "Gitterblick und Seife festhalten." },
  { word: "Steuern",         hint: "Legaler Raubüberfall." },

  // --- GEFÄHRLICHES ---
  { word: "Drogen",          hint: "Teurer Urlaub im Kopf." },
  { word: "Waffe",           hint: "Lauter Knall, Loch drin." },
  { word: "Entführung",      hint: "Ungewollter Ausflug im Kofferraum." },
  { word: "Bombe",           hint: "Tick, tack, bumm." }
];

// ---------------------------------------------------------------------------
// In-memory room store
// rooms[code] = { hostId, players: [{id, nickname}], state, wordPair,
//                 imposterId, speakerIndex, gamePhase }
// ---------------------------------------------------------------------------
const rooms = {};

// ---------------------------------------------------------------------------
// Helper: generate a random 4-letter uppercase room code
// ---------------------------------------------------------------------------
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Re-generate if collision
  return rooms[code] ? generateRoomCode() : code;
}

// ---------------------------------------------------------------------------
// Helper: pick a random item from an array
// ---------------------------------------------------------------------------
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Broadcast the current player list to everyone in a room
// ---------------------------------------------------------------------------
function broadcastLobby(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  io.to(roomCode).emit("lobby:update", {
    players: room.players,
    hostId: room.hostId,
  });
}

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── CREATE ROOM ──────────────────────────────────────────────────────────
  socket.on("room:create", ({ nickname }, callback) => {
    const code = generateRoomCode();
    rooms[code] = {
      hostId: socket.id,
      players: [{ id: socket.id, nickname }],
      gamePhase: "lobby",  // lobby | playing | reveal
      wordPair: null,
      imposterId: null,
      speakerIndex: -1,
    };
    socket.join(code);
    socket.roomCode = code;
    console.log(`[ROOM] Created: ${code} by ${nickname}`);
    callback({ success: true, roomCode: code });
    broadcastLobby(code);
  });

  // ── JOIN ROOM ─────────────────────────────────────────────────────────────
  socket.on("room:join", ({ nickname, roomCode }, callback) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      return callback({ success: false, error: "Room not found. Check the code and try again." });
    }
    if (room.gamePhase !== "lobby") {
      return callback({ success: false, error: "This game has already started." });
    }
    if (room.players.length >= 10) {
      return callback({ success: false, error: "Room is full (max 10 players)." });
    }
    // Prevent duplicate nicknames in the same room
    if (room.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
      return callback({ success: false, error: "That nickname is already taken in this room." });
    }

    room.players.push({ id: socket.id, nickname });
    socket.join(code);
    socket.roomCode = code;
    console.log(`[ROOM] ${nickname} joined ${code}`);
    callback({ success: true, roomCode: code });
    broadcastLobby(code);
  });

  // ── START GAME ────────────────────────────────────────────────────────────
  socket.on("game:start", () => {
    const code = socket.roomCode;
    const room = rooms[code];

    if (!room) return;
    if (socket.id !== room.hostId) return; // Only host can start
    if (room.players.length < 2) {
      return socket.emit("error:msg", "You need at least 2 players to start.");
    }

    // Pick a random word pair and a random imposter
    room.wordPair = pickRandom(WORD_PAIRS);
    room.imposterId = pickRandom(room.players).id;
    room.gamePhase = "playing";
    room.speakerIndex = -1; // No speaker announced yet

    console.log(
      `[GAME] Started in ${code} | Word: ${room.wordPair.word} | Imposter: ${room.imposterId}`
    );

    // Send each player their personalised role packet
    room.players.forEach((player) => {
      const isImposter = player.id === room.imposterId;
      io.to(player.id).emit("game:started", {
        role: isImposter ? "imposter" : "player",
        secret: isImposter ? room.wordPair.hint : room.wordPair.word,
        players: room.players,
        hostId: room.hostId,
        speakerIndex: room.speakerIndex,
      });
    });
  });

  // ── NEXT SPEAKER (Host only) ──────────────────────────────────────────────
  socket.on("game:nextSpeaker", () => {
    const code = socket.roomCode;
    const room = rooms[code];

    if (!room || socket.id !== room.hostId) return;

    room.speakerIndex = (room.speakerIndex + 1) % room.players.length;
    const speaker = room.players[room.speakerIndex];

    console.log(`[SPEAKER] ${speaker.nickname} is speaking in ${code}`);

    io.to(code).emit("game:speaker", {
      speakerIndex: room.speakerIndex,
      speakerName: speaker.nickname,
      speakerId: speaker.id,
    });
  });

  // ── REVEAL RESULTS (Host only) ─────────────────────────────────────────────
  socket.on("game:reveal", () => {
    const code = socket.roomCode;
    const room = rooms[code];

    if (!room || socket.id !== room.hostId) return;

    room.gamePhase = "reveal";
    const imposterPlayer = room.players.find((p) => p.id === room.imposterId);

    io.to(code).emit("game:reveal", {
      imposterName: imposterPlayer ? imposterPlayer.nickname : "Unknown",
      imposterId: room.imposterId,
      word: room.wordPair.word,
      hint: room.wordPair.hint,
    });
  });

  // ── PLAY AGAIN (Host only) ────────────────────────────────────────────────
  socket.on("game:playAgain", () => {
    const code = socket.roomCode;
    const room = rooms[code];

    if (!room || socket.id !== room.hostId) return;

    room.gamePhase = "lobby";
    room.wordPair = null;
    room.imposterId = null;
    room.speakerIndex = -1;

    io.to(code).emit("game:backToLobby");
    broadcastLobby(code);
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];
    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      // Empty room — clean it up
      delete rooms[code];
      console.log(`[ROOM] Deleted empty room: ${code}`);
      return;
    }

    // If host left, assign a new host
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      console.log(`[HOST] New host in ${code}: ${room.players[0].nickname}`);
    }

    broadcastLobby(code);
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🕵️  Imposter Game Server running at http://localhost:${PORT}\n`);

});
