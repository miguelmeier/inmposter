/**
 * IMPOSTER GAME — Backend Server v3
 *
 * New in v3:
 *  - 60+ themed words (sex, youth, jobs, general) with never-repeat logic per session
 *  - Voting outcomes:
 *      TIE         → nobody eliminated, game continues
 *      INNOCENT    → that player eliminated (spectator), game continues
 *      IMPOSTER    → crew wins, round over, word + hint revealed
 *  - Eliminated players can watch but cannot speak or vote
 */

const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const path    = require("path");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────────────────────────────────────
// WORD BANK  (word + hint pairs, grouped by theme for balance)
// ─────────────────────────────────────────────────────────────────────────────
const WORD_PAIRS = [
  // ─── KATEGORIE: "KLINGT WIE SEX, IST ABER HARMLOS" (Die fiesesten Fallen) ───
  { word: "Zahnarzt",       hint: "Mund auf, Gerät rein, danach tut es weh." },
  { word: "Lutscher",       hint: "Erst hart, im Mund wird er klebrig und weich." },
  { word: "Strohhalm",      hint: "Man muss saugen, damit der Saft kommt." },
  { word: "Banane",         hint: "Pellen, anfassen, in den Mund schieben." },
  { word: "Geldautomat",    hint: "Karte reinstecken, warten, unten kommt's raus." },
  { word: "Bowlingkugel",   hint: "Drei Finger in die Löcher, dann kräftig stoßen." },
  { word: "Socke",          hint: "Zieht man drüber, wird am Fuß oft steif." },
  { word: "Zelt",           hint: "Morgens steht die Stange ganz von alleine." },
  { word: "Ketchupflasche", hint: "Auf den Hintern hauen, bis es endlich spritzt." },
  { word: "Bus",            hint: "Hinten einsteigen ist oft verboten oder kostet extra." },
  { word: "Mikrofon",       hint: "Fest umklammern und mit den Lippen ganz nah ran." },
  { word: "Schlüssel",      hint: "Solange drehen, bis das Loch aufgeht." },
  { word: "Döner",          hint: "Mit viel Fleisch und Soße, saut man sich oft ein." },
  { word: "Toaster",        hint: "Reinstecken, heiß werden lassen, rausziehen." },
  { word: "Sahnespender",   hint: "Schütteln, drücken, weiße Masse kommt." },

  // ─── KATEGORIE: SEX & DATING (Mechanisch umschrieben) ───
  { word: "One Night Stand", hint: "Rein, raus, tschüss und nie wieder melden." },
  { word: "Doggy Style",     hint: "Kein Blickkontakt, aber gute Aussicht." },
  { word: "Tinder",          hint: "Wischen, bewerten, wegwerfen." },
  { word: "Kondom",          hint: "Überziehen, damit alles sauber bleibt." },
  { word: "Pornostar",       hint: "Beruflich stöhnen, damit andere zusehen." },
  { word: "Handschellen",    hint: "Klick macht es, dann bist du wehrlos." },
  { word: "Dildo",           hint: "Batterien rein und er beschwert sich nie." },
  { word: "Gleitgel",        hint: "Wenn es quietscht oder klemmt, nimm das." },
  { word: "Swingerclub",     hint: "Tausche meins gegen deins." },
  { word: "Blowjob",         hint: "Arbeit mit dem Mund, nicht mit den Händen." },
  { word: "Vorspiel",        hint: "Das Aufwärmen dauert länger als das Match." },
  { word: "Orgasmus",        hint: "Kurzes Zucken, dann ist die Energie weg." },
  { word: "Stripclub",       hint: "Nur gucken, anfassen kostet extra." },
  { word: "Walk of Shame",   hint: "Morgens im Party-Outfit nach Hause schleichen." },
  { word: "69",              hint: "Geben und Nehmen, Kopf an Fuß." },
  { word: "Sperma",          hint: "Millionen starten, nur einer kommt an." },
  { word: "BH",              hint: "Wenn er fällt, atmen zwei auf." },
  { word: "Dreier",          hint: "Einer ist immer das fünfte Rad am Wagen." },
  { word: "Anal",            hint: "Eingang benutzt, der eigentlich Ausgang ist." },

  // ─── KATEGORIE: JUGEND & LIFESTYLE (Abstrakt) ───
  { word: "Influencer",      hint: "Bilder verkaufen, die nicht echt sind." },
  { word: "Shisha",          hint: "Am Schlauch nuckeln und Rauch blasen." },
  { word: "Kater",           hint: "Die Quittung für den Spaß von gestern." },
  { word: "Kiffen",          hint: "Rote Augen, Hunger und alles ist lustig." },
  { word: "Türsteher",       hint: "Du kommst hier heute nicht rein." },
  { word: "Fitnessstudio",   hint: "Bezahlen, um schwere Dinge hochzuheben." },
  { word: "Vegetarier",      hint: "Isst dem Essen das Futter weg." },
  { word: "Smartphone",      hint: "Wird öfter gestreichelt als der Partner." },
  { word: "Ex-Freund",       hint: "Ein Fehler, den man bereut." },
  { word: "Friendzone",      hint: "Zuhören erlaubt, Anfassen verboten." },
  { word: "Fake ID",         hint: "Lüge auf Plastik gedruckt." },
  { word: "OnlyFans",        hint: "Geldabo für nackte Haut." },
  { word: "Dickpic",         hint: "Ungefragtes Foto vom kleinen Freund." },

  // ─── KATEGORIE: BERUF & GESELLSCHAFT ───
  { word: "Chef",            hint: "Sitzt oben und hat oft keine Ahnung." },
  { word: "Arbeitslos",      hint: "Jeden Tag Wochenende, aber kein Geld." },
  { word: "Polizei",         hint: "Wenn das blaue Licht kommt, ist Schluss." },
  { word: "Lehrer",          hint: "Redet vorne, hinten schläft alles." },
  { word: "Gynäkologe",      hint: "Arbeitet dort, wo andere Urlaub machen." },
  { word: "Priester",        hint: "Männer im Kleid, die Geheimnisse hören." },
  { word: "Beerdigung",      hint: "Alle schwarz, einer liegt, keiner lacht." },
  { word: "Gefängnis",       hint: "Gitter vor der Nase, Seife festhalten." },
  { word: "Steuern",         hint: "Geld weggeben, bevor man es hat." },
  { word: "Callboy",         hint: "Liebe gegen Stundenlohn." },

  // ─── KATEGORIE: GEFÄHRLICHES ───
  { word: "Drogen",          hint: "Kurzurlaub im Kopf mit Absturzgarantie." },
  { word: "Waffe",           hint: "Lauter Knall, dann ist Ruhe." },
  { word: "Entführung",      hint: "Mitgenommen werden ohne zu fragen." },
  { word: "Bombe",           hint: "Falscher Draht und es macht Bumm." }
];

// ─────────────────────────────────────────────────────────────────────────────
// In-memory room store
// ─────────────────────────────────────────────────────────────────────────────
const rooms = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return rooms[s] ? genCode() : s;
}

/** Fisher-Yates — returns a new shuffled copy */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick a word that hasn't been used yet this session; reset pool if exhausted */
function pickWord(room) {
  const available = WORDS.filter((_, i) => !room.usedWordIndices.includes(i));
  const pool = available.length > 0 ? available : WORDS; // reset if all used
  if (available.length === 0) room.usedWordIndices = [];   // reset tracking

  const idx = WORDS.indexOf(pool[Math.floor(Math.random() * pool.length)]);
  room.usedWordIndices.push(idx);
  return WORDS[idx];
}

function broadcastLobby(code) {
  const r = rooms[code];
  if (!r) return;
  io.to(code).emit("lobby:update", { players: r.players, hostId: r.hostId });
}

/** Active players = all players minus eliminated ones */
function activePlayers(room) {
  return room.players.filter(p => !room.eliminated.includes(p.id));
}

/** Build live vote-count summary — counts only, no names */
function voteSummary(room) {
  const totals = {};
  activePlayers(room).forEach(p => { totals[p.id] = 0; });
  Object.values(room.votes).forEach(tid => {
    if (totals[tid] !== undefined) totals[tid]++;
  });
  return {
    totals,
    voters: Object.keys(room.votes).length,
    total:  activePlayers(room).length,
  };
}

/**
 * Finalize a vote round and determine outcome:
 *  TIE       → nobody eliminated, game continues
 *  IMPOSTER  → crew wins, round ends
 *  INNOCENT  → that player eliminated (spectator), game continues
 */
function finalizeVote(code) {
  const room = rooms[code];
  if (!room) return;
  room.votingPhase = false;

  const active  = activePlayers(room);
  const summary = voteSummary(room);
  const maxV    = Math.max(0, ...Object.values(summary.totals));

  // Find who got the most votes
  const topIds = Object.entries(summary.totals)
    .filter(([, v]) => v === maxV && maxV > 0)
    .map(([id]) => id);

  // Full vote log
  const voteLog = Object.entries(room.votes).map(([vid, tid]) => ({
    voterId:   vid,
    voterName: room.players.find(p => p.id === vid)?.nickname ?? "?",
    targetId:  tid,
    targetName: room.players.find(p => p.id === tid)?.nickname ?? "?",
  }));

  room.voteHistory.push({
    round: room.voteHistory.length + 1,
    totals: summary.totals, topIds, maxVotes: maxV, voteLog,
  });

  // ── TIE — nobody flies ────────────────────────────────────────────────────
  if (topIds.length !== 1 || maxV === 0) {
    console.log(`[VOTE] TIE in ${code}`);
    io.to(code).emit("vote:results", {
      outcome:    "tie",
      totals:     summary.totals,
      topIds,
      maxVotes:   maxV,
      voteLog,
      players:    room.players,
      eliminated: room.eliminated,
      round:      room.voteHistory.length,
    });
    return;
  }

  const accusedId     = topIds[0];
  const accusedPlayer = room.players.find(p => p.id === accusedId);

  // ── IMPOSTER CAUGHT — crew wins ───────────────────────────────────────────
  if (accusedId === room.imposterId) {
    room.gamePhase = "crewWin";
    console.log(`[VOTE] IMPOSTER caught in ${code}: ${accusedPlayer?.nickname}`);
    io.to(code).emit("vote:results", {
      outcome:      "crewWin",
      accusedId,
      accusedName:  accusedPlayer?.nickname ?? "?",
      totals:       summary.totals,
      topIds,
      maxVotes:     maxV,
      voteLog,
      players:      room.players,
      eliminated:   room.eliminated,
      word:         room.wordPair.word,
      hint:         room.wordPair.hint,
      round:        room.voteHistory.length,
    });
    return;
  }

  // ── INNOCENT ELIMINATED — game continues ──────────────────────────────────
  room.eliminated.push(accusedId);
  // Rebuild speaker order without eliminated player
  room.speakerOrder = shuffle(activePlayers(room).map(p => p.id));
  room.speakerStep  = -1;

  console.log(`[VOTE] Innocent eliminated in ${code}: ${accusedPlayer?.nickname}`);
  io.to(code).emit("vote:results", {
    outcome:       "eliminated",
    accusedId,
    accusedName:   accusedPlayer?.nickname ?? "?",
    totals:        summary.totals,
    topIds,
    maxVotes:      maxV,
    voteLog,
    players:       room.players,
    eliminated:    room.eliminated,
    round:         room.voteHistory.length,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io
// ─────────────────────────────────────────────────────────────────────────────
io.on("connection", socket => {
  console.log(`[+] ${socket.id}`);

  // ── CREATE ────────────────────────────────────────────────────────────────
  socket.on("room:create", ({ nickname }, cb) => {
    const code = genCode();
    rooms[code] = {
      hostId:          socket.id,
      players:         [{ id: socket.id, nickname }],
      gamePhase:       "lobby",
      wordPair:        null,
      imposterId:      null,
      eliminated:      [],
      speakerOrder:    [],
      speakerStep:     -1,
      votingPhase:     false,
      votes:           {},
      voteHistory:     [],
      usedWordIndices: [],
    };
    socket.join(code);
    socket.roomCode = code;
    console.log(`[ROOM] Created ${code} by "${nickname}"`);
    cb({ success: true, roomCode: code });
    broadcastLobby(code);
  });

  // ── JOIN ──────────────────────────────────────────────────────────────────
  socket.on("room:join", ({ nickname, roomCode }, cb) => {
    const code = roomCode.toUpperCase().trim();
    const r    = rooms[code];
    if (!r)                        return cb({ success: false, error: "Room not found." });
    if (r.gamePhase !== "lobby")   return cb({ success: false, error: "Game already started." });
    if (r.players.length >= 12)    return cb({ success: false, error: "Room full (max 12)." });
    if (r.players.some(p => p.nickname.toLowerCase() === nickname.toLowerCase()))
      return cb({ success: false, error: "Nickname already taken." });

    r.players.push({ id: socket.id, nickname });
    socket.join(code);
    socket.roomCode = code;
    cb({ success: true, roomCode: code });
    broadcastLobby(code);
  });

  // ── START GAME ────────────────────────────────────────────────────────────
  socket.on("game:start", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId) return;
    if (r.players.length < 2) return socket.emit("error:msg", "Need at least 2 players.");

    r.wordPair     = pickWord(r);
    r.imposterId   = r.players[Math.floor(Math.random() * r.players.length)].id;
    r.gamePhase    = "playing";
    r.eliminated   = [];
    r.votingPhase  = false;
    r.votes        = {};
    r.voteHistory  = [];
    r.speakerOrder = shuffle(r.players.map(p => p.id));
    r.speakerStep  = -1;

    console.log(`[GAME] ${code} | "${r.wordPair.word}" | Imposter: ${r.players.find(p=>p.id===r.imposterId)?.nickname}`);

    r.players.forEach(p => {
      const isImposter = p.id === r.imposterId;
      io.to(p.id).emit("game:started", {
        role:         isImposter ? "imposter" : "player",
        secret:       isImposter ? r.wordPair.hint : r.wordPair.word,
        players:      r.players,
        hostId:       r.hostId,
        eliminated:   r.eliminated,
        speakerOrder: r.speakerOrder,
        speakerStep:  r.speakerStep,
      });
    });
  });

  // ── NEXT SPEAKER ─────────────────────────────────────────────────────────
  socket.on("game:nextSpeaker", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId) return;

    r.speakerStep++;
    if (r.speakerStep >= r.speakerOrder.length) {
      r.speakerOrder = shuffle(activePlayers(r).map(p => p.id));
      r.speakerStep  = 0;
    }

    const speakerId = r.speakerOrder[r.speakerStep];
    const speaker   = r.players.find(p => p.id === speakerId);
    if (!speaker) return;

    io.to(code).emit("game:speaker", {
      speakerId,
      speakerName:  speaker.nickname,
      speakerStep:  r.speakerStep,
      speakerOrder: r.speakerOrder,
    });
  });

  // ── START VOTE ────────────────────────────────────────────────────────────
  socket.on("vote:start", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId || r.votingPhase) return;

    r.votingPhase = true;
    r.votes       = {};

    io.to(code).emit("vote:started", {
      players:   r.players,
      eliminated: r.eliminated,
      hostId:    r.hostId,
    });
  });

  // ── SUBMIT VOTE ───────────────────────────────────────────────────────────
  socket.on("vote:submit", ({ targetId }) => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || !r.votingPhase) return;

    const voter  = r.players.find(p => p.id === socket.id);
    const target = activePlayers(r).find(p => p.id === targetId);
    if (!voter || !target) return;
    // Eliminated players cannot vote
    if (r.eliminated.includes(socket.id)) return;
    if (r.votes[socket.id]) return; // already voted

    r.votes[socket.id] = targetId;
    const sum = voteSummary(r);
    io.to(code).emit("vote:update", sum);

    // Auto-finalize when all active players have voted
    const activeCount = activePlayers(r).filter(p => !r.eliminated.includes(p.id)).length;
    if (Object.keys(r.votes).length >= activeCount) finalizeVote(code);
  });

  // ── END VOTE EARLY ────────────────────────────────────────────────────────
  socket.on("vote:end", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId || !r.votingPhase) return;
    finalizeVote(code);
  });

  // ── CLOSE RESULTS ──────────────────────────────────────────────────────────
  // If the last vote round ended with crewWin, navigate to win screen.
  // Otherwise resume the game (tie or innocent eliminated).
  socket.on("vote:close", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId) return;

    if (r.gamePhase === "crewWin") {
      // Pull data from the last vote history entry
      const last    = r.voteHistory[r.voteHistory.length - 1];
      const imposter = r.players.find(p => p.id === r.imposterId);
      io.to(code).emit("game:crewWin", {
        accusedId:   r.imposterId,
        accusedName: imposter?.nickname ?? "?",
        word:        r.wordPair.word,
        hint:        r.wordPair.hint,
        maxVotes:    last?.maxVotes ?? 0,
      });
    } else {
      // Tie or innocent eliminated — resume game
      io.to(code).emit("vote:closed", {
        eliminated:   r.eliminated,
        speakerOrder: r.speakerOrder,
        speakerStep:  r.speakerStep,
        players:      r.players,
      });
    }
  });

  // ── REVEAL IMPOSTER ───────────────────────────────────────────────────────
  socket.on("game:reveal", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId) return;
    r.gamePhase = "reveal";
    const imp = r.players.find(p => p.id === r.imposterId);
    io.to(code).emit("game:reveal", {
      imposterName: imp?.nickname ?? "?",
      imposterId:   r.imposterId,
      word:         r.wordPair.word,
      hint:         r.wordPair.hint,
    });
  });

  // ── PLAY AGAIN ────────────────────────────────────────────────────────────
  socket.on("game:playAgain", () => {
    const code = socket.roomCode;
    const r    = rooms[code];
    if (!r || socket.id !== r.hostId) return;
    Object.assign(r, {
      gamePhase: "lobby", wordPair: null, imposterId: null,
      eliminated: [], speakerOrder: [], speakerStep: -1,
      votingPhase: false, votes: {}, voteHistory: [],
    });
    io.to(code).emit("game:backToLobby");
    broadcastLobby(code);
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const r = rooms[code];
    r.players = r.players.filter(p => p.id !== socket.id);
    if (r.players.length === 0) { delete rooms[code]; return; }
    if (r.hostId === socket.id) r.hostId = r.players[0].id;
    r.speakerOrder = r.speakerOrder.filter(id => id !== socket.id);
    r.eliminated   = r.eliminated.filter(id => id !== socket.id);
    if (r.speakerStep >= r.speakerOrder.length) r.speakerStep = 0;
    if (r.votingPhase) {
      delete r.votes[socket.id];
      io.to(code).emit("vote:update", voteSummary(r));
      const activeCount = activePlayers(r).length;
      if (activeCount > 0 && Object.keys(r.votes).length >= activeCount) finalizeVote(code);
    }
    broadcastLobby(code);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n🕵️  Imposter v3 → http://localhost:${PORT}\n`));
