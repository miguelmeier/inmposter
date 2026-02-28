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
  // --- KATEGORIE: "KLINGT VERSAUT, IST ES ABER NICHT" (Die Fallen) ---
  { word: "Zahnarzt",          hint: "Er sagt dir: 'Mach den Mund weit auf', dann bohrt er." },
  { word: "Lutscher",          hint: "Man leckt so lange dran, bis er weg ist oder klebt." },
  { word: "Strohhalm",         hint: "Man muss kräftig saugen, damit etwas rauskommt." },
  { word: "Banane",            hint: "Muss man pellen, bevor man sie sich in den Mund schiebt." },
  { word: "Geldautomat",       hint: "Man steckt die Karte rein, drückt rum und hofft, dass was rauskommt." },
  { word: "Bowlingkugel",      hint: "Man steckt drei Finger in die Löcher und wirft sie weg." },
  { word: "Socke",             hint: "Man zieht es über den Fuß, manchmal hat es ein Loch." },
  { word: "Zelt",              hint: "Morgens steht da oft eine Stange, die abends noch nicht da war." },
  { word: "Ketchupflasche",    hint: "Man klopft auf den Hintern, bis es endlich spritzt." },
  { word: "Bus",               hint: "Hinten darf man einsteigen, aber man braucht ein Ticket." },
  { word: "Mikrofon",          hint: "Man hält es fest in der Hand und geht mit dem Mund ganz nah ran." },

  // --- KATEGORIE: SEX & DATING (Indirekt umschrieben) ---
  { word: "One Night Stand",   hint: "Frühstück ist in diesem Service meistens nicht inbegriffen." },
  { word: "Doggy Style",       hint: "Eine Position, bei der man sich gegenseitig nicht ansieht." },
  { word: "Tinder",            hint: "Fleischbeschau per Daumenbewegung nach rechts oder links." },
  { word: "Kondom",            hint: "Ein Regenmantel, den man drinnen trägt, damit nichts passiert." },
  { word: "Pornostar",         hint: "Verdient Geld damit, Dinge zu tun, die andere nur im Schlafzimmer machen." },
  { word: "Handschellen",      hint: "Metallischer Schmuck für Leute, die gerne gefesselt sind." },
  { word: "Dildo",             hint: "Ersetzt den Mann, vibriert oft und beschwert sich nie." },
  { word: "Gleitgel",          hint: "Hilft dabei, wenn es trocken ist und reibt." },
  { word: "Swingerclub",       hint: "Hier gilt das Motto: Teilen macht Freude." },
  { word: "Blowjob",           hint: "Eine Arbeit, die man nicht mit den Händen verrichtet." },
  { word: "Vorspiel",          hint: "Das Aufwärmtraining vor dem eigentlichen Match." },
  { word: "Orgasmus",          hint: "Der kurze Moment, für den man die ganze Anstrengung macht." },
  { word: "Stripclub",         hint: "Gucken ist erlaubt, aber Anfassen kostet extra." },
  { word: "Walk of Shame",     hint: "Der peinliche Heimweg in den Klamotten von gestern Abend." },
  { word: "69",                hint: "Geben und Nehmen zur exakt gleichen Zeit." },
  { word: "Sperma",            hint: "Millionen Schwimmer, aber nur einer gewinnt den Preis." },
  { word: "BH",                hint: "Ein Gefängnis für zwei, das abends oft geöffnet wird." },

  // --- KATEGORIE: JUGEND & LIFESTYLE (Zynisch) ---
  { word: "Influencer",        hint: "Verkauft seine Privatsphäre für Herzchen und Likes." },
  { word: "Shisha",            hint: "Man teilt sich den Schlauch und bläst Rauch in die Luft." },
  { word: "Kater",             hint: "Die Rache des Körpers für den Spaß von gestern Nacht." },
  { word: "Kiffen",            hint: "Es riecht süßlich, macht die Augen rot und den Kühlschrank leer." },
  { word: "Türsteher",         hint: "Er entscheidet nach Nasenfaktor, wer rein darf." },
  { word: "Fitnessstudio",     hint: "Man zahlt jeden Monat, geht aber fast nie hin." },
  { word: "Vegetarier",        hint: "Isst dem Essen das Essen weg." },
  { word: "Smartphone",        hint: "Man wischt den ganzen Tag darauf rum und ignoriert echte Menschen." },
  { word: "Ex-Freund",         hint: "Ein Fehler aus der Vergangenheit, den man bereut." },
  { word: "Friendzone",        hint: "Du darfst zuhören und trösten, aber nicht anfassen." },
  { word: "Fake ID",           hint: "Ein Stück Plastik, das dich älter macht als du bist." },

  // --- KATEGORIE: BERUF & GESELLSCHAFT ---
  { word: "Chef",              hint: "Der Typ, der denkt, er hat immer Recht, weil er mehr verdient." },
  { word: "Arbeitslos",        hint: "Jeden Tag Wochenende, aber leider kein Budget." },
  { word: "Polizei",           hint: "Kommen meistens dann, wenn der Spaß vorbei ist." },
  { word: "Lehrer",            hint: "Redet vorne, während hinten keiner zuhört." },
  { word: "Gynäkologe",        hint: "Guckt beruflich dort hin, wo andere Spaß haben." },
  { word: "Priester",          hint: "Trägt ein Kleid und hört sich deine Sünden an." },
  { word: "Beerdigung",        hint: "Alle tragen Schwarz und einer liegt in der Kiste." },
  { word: "Gefängnis",         hint: "Schwedische Gardinen und Seife bloß nicht fallen lassen." },
  { word: "Steuern",           hint: "Der Staat nimmt dir Geld weg, bevor du es überhaupt hast." },

  // --- KATEGORIE: GEFÄHRLICHES ---
  { word: "Drogen",            hint: "Teures Pulver oder Tabletten für eine Realitätsflucht." },
  { word: "Waffe",             hint: "Macht ein lautes Geräusch und Löcher in Dinge." },
  { word: "Entführung",        hint: "Jemand wird mitgenommen, ohne dass er gefragt wurde." },
  { word: "Bombe",             hint: "Wenn der rote Draht durchgeschnitten wird, macht es Bumm." }
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