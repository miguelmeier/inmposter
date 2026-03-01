/**
 * IMPOSTER GAME - Backend Server v2
 * Node.js + Express + Socket.io
 *
 * Features:
 *  - Random shuffled speaker order (Fisher-Yates), reshuffled each cycle
 *  - Full voting system: host starts → everyone votes → live counter → results reveal
 */

const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const path    = require("path");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Word / Hint pairs
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
// ---------------------------------------------------------------------------
const rooms = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms[code] ? generateRoomCode() : code;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fisher-Yates shuffle — returns a NEW shuffled copy */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function broadcastLobby(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit("lobby:update", { players: room.players, hostId: room.hostId });
}

/** Build vote-count summary (does NOT expose who voted for whom) */
function buildVoteSummary(room) {
  const totals = {};
  room.players.forEach(p => { totals[p.id] = 0; });
  Object.values(room.votes).forEach(targetId => {
    if (totals[targetId] !== undefined) totals[targetId]++;
  });
  return {
    totals,
    voters: Object.keys(room.votes).length,
    total:  room.players.length,
  };
}

/** End the vote and broadcast full results including who-voted-for-whom */
function finalizeVote(code) {
  const room = rooms[code];
  if (!room) return;
  room.votingPhase = false;

  const summary    = buildVoteSummary(room);
  const maxVotes   = Math.max(0, ...Object.values(summary.totals));
  const mostVotedIds = Object.entries(summary.totals)
    .filter(([, v]) => v === maxVotes && maxVotes > 0)
    .map(([id]) => id);

  // Full transparency: who voted for whom
  const voteLog = Object.entries(room.votes).map(([voterId, targetId]) => {
    const voter  = room.players.find(p => p.id === voterId);
    const target = room.players.find(p => p.id === targetId);
    return {
      voterId,
      voterName:  voter  ? voter.nickname  : "?",
      targetId,
      targetName: target ? target.nickname : "?",
    };
  });

  room.voteHistory.push({ round: room.voteHistory.length + 1, totals: summary.totals, mostVotedIds, maxVotes, voteLog });

  console.log(`[VOTE] Results in ${code} | Leader: ${mostVotedIds.join(",")} (${maxVotes} votes)`);

  io.to(code).emit("vote:results", {
    totals:       summary.totals,
    mostVotedIds,
    maxVotes,
    voteLog,
    players:      room.players,
    round:        room.voteHistory.length,
  });
}

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[+] ${socket.id}`);

  // ── CREATE ROOM ───────────────────────────────────────────────────────────
  socket.on("room:create", ({ nickname }, cb) => {
    const code = generateRoomCode();
    rooms[code] = {
      hostId:       socket.id,
      players:      [{ id: socket.id, nickname }],
      gamePhase:    "lobby",   // lobby | playing | reveal
      wordPair:     null,
      imposterId:   null,
      speakerOrder: [],        // shuffled array of player IDs
      speakerStep:  -1,        // current index into speakerOrder
      votingPhase:  false,
      votes:        {},        // { voterId: targetId }
      voteHistory:  [],
    };
    socket.join(code);
    socket.roomCode = code;
    console.log(`[ROOM] Created ${code} by "${nickname}"`);
    cb({ success: true, roomCode: code });
    broadcastLobby(code);
  });

  // ── JOIN ROOM ─────────────────────────────────────────────────────────────
  socket.on("room:join", ({ nickname, roomCode }, cb) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];
    if (!room)
      return cb({ success: false, error: "Room not found. Double-check the code." });
    if (room.gamePhase !== "lobby")
      return cb({ success: false, error: "This game has already started." });
    if (room.players.length >= 10)
      return cb({ success: false, error: "Room is full (max 10 players)." });
    if (room.players.some(p => p.nickname.toLowerCase() === nickname.toLowerCase()))
      return cb({ success: false, error: "That nickname is already taken." });

    room.players.push({ id: socket.id, nickname });
    socket.join(code);
    socket.roomCode = code;
    console.log(`[JOIN] "${nickname}" → ${code}`);
    cb({ success: true, roomCode: code });
    broadcastLobby(code);
  });

  // ── START GAME ────────────────────────────────────────────────────────────
  socket.on("game:start", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;
    if (room.players.length < 2)
      return socket.emit("error:msg", "Need at least 2 players to start.");

    room.wordPair     = pickRandom(WORD_PAIRS);
    room.imposterId   = pickRandom(room.players).id;
    room.gamePhase    = "playing";
    room.votingPhase  = false;
    room.votes        = {};
    room.voteHistory  = [];
    room.speakerOrder = shuffle(room.players.map(p => p.id));
    room.speakerStep  = -1;

    console.log(`[GAME] ${code} | "${room.wordPair.word}" | Imposter: ${room.imposterId}`);
    console.log(`[ORDER] ${room.speakerOrder.map(id => room.players.find(p=>p.id===id)?.nickname).join(" → ")}`);

    room.players.forEach(player => {
      const isImposter = player.id === room.imposterId;
      io.to(player.id).emit("game:started", {
        role:         isImposter ? "imposter" : "player",
        secret:       isImposter ? room.wordPair.hint : room.wordPair.word,
        players:      room.players,
        hostId:       room.hostId,
        speakerOrder: room.speakerOrder,
        speakerStep:  room.speakerStep,
      });
    });
  });

  // ── NEXT SPEAKER (Host only) ──────────────────────────────────────────────
  socket.on("game:nextSpeaker", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;

    room.speakerStep++;

    // Completed a full cycle → reshuffle for variety
    if (room.speakerStep >= room.speakerOrder.length) {
      room.speakerOrder = shuffle(room.players.map(p => p.id));
      room.speakerStep  = 0;
      console.log(`[ORDER] Reshuffled in ${code}`);
    }

    const speakerId = room.speakerOrder[room.speakerStep];
    const speaker   = room.players.find(p => p.id === speakerId);
    if (!speaker) return;

    console.log(`[SPEAK] ${speaker.nickname} (step ${room.speakerStep}) in ${code}`);

    io.to(code).emit("game:speaker", {
      speakerId,
      speakerName:  speaker.nickname,
      speakerStep:  room.speakerStep,
      speakerOrder: room.speakerOrder,
    });
  });

  // ── START VOTE (Host only) ────────────────────────────────────────────────
  socket.on("vote:start", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;
    if (room.votingPhase) return;

    room.votingPhase = true;
    room.votes       = {};
    console.log(`[VOTE] Started in ${code}`);

    io.to(code).emit("vote:started", {
      players: room.players,
      hostId:  room.hostId,
    });
  });

  // ── SUBMIT VOTE ───────────────────────────────────────────────────────────
  socket.on("vote:submit", ({ targetId }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.votingPhase) return;

    const voter  = room.players.find(p => p.id === socket.id);
    const target = room.players.find(p => p.id === targetId);
    if (!voter || !target) return;
    if (room.votes[socket.id]) return; // already voted — immutable

    room.votes[socket.id] = targetId;
    console.log(`[VOTE] "${voter.nickname}" → "${target.nickname}" in ${code}`);

    // Broadcast live count update
    const summary = buildVoteSummary(room);
    io.to(code).emit("vote:update", summary);

    // Auto-finalize if everyone voted
    if (Object.keys(room.votes).length >= room.players.length) {
      finalizeVote(code);
    }
  });

  // ── END VOTE EARLY (Host only) ────────────────────────────────────────────
  socket.on("vote:end", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId || !room.votingPhase) return;
    console.log(`[VOTE] Force-ended by host in ${code}`);
    finalizeVote(code);
  });

  // ── CLOSE VOTE RESULTS → resume game (Host only) ──────────────────────────
  socket.on("vote:close", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;
    io.to(code).emit("vote:closed");
  });

  // ── REVEAL IMPOSTER (Host only) ───────────────────────────────────────────
  socket.on("game:reveal", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;

    room.gamePhase = "reveal";
    const imposter = room.players.find(p => p.id === room.imposterId);

    io.to(code).emit("game:reveal", {
      imposterName: imposter ? imposter.nickname : "Unknown",
      imposterId:   room.imposterId,
      word:         room.wordPair.word,
      hint:         room.wordPair.hint,
    });
  });

  // ── PLAY AGAIN (Host only) ────────────────────────────────────────────────
  socket.on("game:playAgain", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || socket.id !== room.hostId) return;

    Object.assign(room, {
      gamePhase:    "lobby",
      wordPair:     null,
      imposterId:   null,
      speakerOrder: [],
      speakerStep:  -1,
      votingPhase:  false,
      votes:        {},
      voteHistory:  [],
    });

    io.to(code).emit("game:backToLobby");
    broadcastLobby(code);
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[-] ${socket.id}`);
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];

    room.players = room.players.filter(p => p.id !== socket.id);

    if (room.players.length === 0) {
      delete rooms[code];
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      console.log(`[HOST] Transferred to "${room.players[0].nickname}" in ${code}`);
    }

    // Keep speaker order consistent
    room.speakerOrder = room.speakerOrder.filter(id => id !== socket.id);
    if (room.speakerStep >= room.speakerOrder.length) room.speakerStep = 0;

    // Handle mid-vote disconnect
    if (room.votingPhase) {
      delete room.votes[socket.id];
      const summary = buildVoteSummary(room);
      io.to(code).emit("vote:update", summary);
      if (room.players.length > 0 && Object.keys(room.votes).length >= room.players.length) {
        finalizeVote(code);
      }
    }

    broadcastLobby(code);
  });
});

// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🕵️  Imposter Game v2 → http://localhost:${PORT}\n`);
});
