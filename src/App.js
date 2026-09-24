import { useState, useEffect, useRef } from "react";
import hamburguerImg from "./assets/hamburguer.png";
import pizzaImg from "./assets/pizza.png";
import sushiImg from "./assets/sushi.png";

/* ==========================================================================
   1. CONSTANTES — os "números e dados" do jogo, tudo fora do componente
      para poder mudar sem precisar entender a lógica.
   ========================================================================== */

// O MAPA: cada território tem nome, posição (x,y) no desenho e uma lista
// de IDs dos vizinhos (com quem ele faz fronteira). Para adicionar um
// território novo: dê um novo id, escolha x/y e diga quem são os vizinhos
// (lembre de adicionar o novo id na lista de neighbors deles também).
const ZONE_DEFS = [
  { id: 0, name: "Centro", x: 300, y: 200, neighbors: [1, 2, 3, 4] },
  { id: 1, name: "Porto", x: 150, y: 120, neighbors: [0, 3, 5] },
  { id: 2, name: "Praia", x: 450, y: 120, neighbors: [0, 3, 6] },
  { id: 3, name: "Zona Norte", x: 300, y: 60, neighbors: [0, 1, 2] },
  { id: 4, name: "Zona Sul", x: 300, y: 340, neighbors: [0, 7, 8] },
  { id: 5, name: "Bairro Industrial", x: 100, y: 260, neighbors: [1, 7] },
  { id: 6, name: "Universidade", x: 500, y: 260, neighbors: [2, 8] },
  { id: 7, name: "Vila Nova", x: 180, y: 320, neighbors: [4, 5] },
  { id: 8, name: "Parque", x: 420, y: 320, neighbors: [4, 6] },
];

// EDGES: as "estradas" desenhadas entre territórios vizinhos.
// Gerado automaticamente a partir do ZONE_DEFS acima — não precisa editar.
const EDGES = [];
ZONE_DEFS.forEach((z) => z.neighbors.forEach((n) => { if (z.id < n) EDGES.push([z.id, n]); }));

// BALANCEAMENTO DO JOGO — mexa aqui para deixar mais fácil/difícil/rápido.
const BOT_COLORS = ["#3ddc84", "#38bdf8"]; // cores dos bots (o time do humano usa a cor do time escolhido)
const STARTING_MONEY = 150;      // dinheiro inicial de cada jogador
const STARTING_BIKES = 3;        // entregadores em cada território inicial
const BASE_HIRE_COST = 50;       // preço da 1ª contratação
const HIRE_COST_STEP = 10;       // quanto o preço sobe a cada contratação
const INCOME_PER_BIKE = 20;      // renda máxima (100% de conformidade) por entregador
const ROUND_LIMIT = 8;           // nº de rodadas até decidir por pontos

// Paleta de cores do visual "pixel art retrô"
const COLORS = {
  bgDeep: "#14121f",
  panel: "#1f1b2e",
  panelBorder: "#3a3552",
  ink: "#f5f1e8",
  accentYellow: "#ffd23f",
  accentMagenta: "#ff2d78",
  road: "#34324a",
  danger: "#ef4444",
  success: "#4ade80",
  neutral: "#2b2940",
};

// TIME ESCOLHIDO NA TELA "ESCOLHER TIME": cada um tem um nome, uma cor
// (usada nas suas zonas/HUD) e a imagem do time (vinda de Times.jsx).
const TEAM_INFO = {
  hamburguer: { label: "Hambúrguer", color: "#f2542d", img: hamburguerImg },
  pizza: { label: "Pizza", color: "#ffd23f", img: pizzaImg },
  sushi: { label: "Sushi", color: "#4ade80", img: sushiImg },
};
const DEFAULT_TEAM = "hamburguer";

// TEXTOS DAS CARTAS — adicione, remova ou edite frases nestas 3 listas
// para mudar o conteúdo educativo sem tocar na lógica das cartas.
const LAW_CARDS = [
  "Use sempre capacete ao pilotar sua bike elétrica.",
  "Respeite os limites de velocidade nas ciclovias e vias compartilhadas.",
  "Sinalize com antecedência antes de virar ou mudar de faixa.",
  "Não é permitido transitar na contramão.",
  "Pare completamente no sinal vermelho e nas faixas de pedestre.",
  "Mantenha a iluminação da bike em dia para andar à noite.",
];
const INFRACAO_CARDS = [
  "Um entregador foi flagrado sem capacete.",
  "Flagrado avançando o sinal vermelho.",
  "Multado por trafegar na calçada.",
  "Pego andando na contramão numa rua movimentada.",
  "Autuado por excesso de velocidade perto de uma escola.",
];
const BLITZ_CARDS = [
  "A prefeitura fez uma blitz educativa na região.",
  "Fiscalização de trânsito revisou a documentação das bikes na área.",
  "Bloqueio surpresa checou os equipamentos das bikes de uma zona.",
];

/* ==========================================================================
   2. FUNÇÕES UTILITÁRIAS — funções "puras" (recebem dados, devolvem dados),
      sem mexer direto na tela. Usadas tanto pelo jogador quanto pelos bots.
   ========================================================================== */

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Desenha o ícone do entregador em "pixel art" usando uma grade 8x8 de
// quadradinhos SVG (1 = roda, 2 = corpo/cor do dono, 3 = bolsa térmica).
function PixelBike({ color = "#38bdf8", size = 22 }) {
  const grid = [
    [0, 0, 0, 3, 3, 3, 0, 0],
    [0, 0, 0, 3, 3, 3, 0, 0],
    [0, 2, 2, 2, 2, 0, 0, 0],
    [2, 2, 2, 2, 2, 2, 0, 0],
    [0, 0, 2, 2, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];
  const cell = size / 8;
  const fillFor = { 1: "#111018", 2: color, 3: "#dc2626" };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grid.map((row, r) =>
        row.map((v, c) =>
          v === 0 ? null : (
            <rect key={r + "-" + c} x={c * cell} y={r * cell} width={cell} height={cell} fill={fillFor[v]} />
          )
        )
      )}
    </svg>
  );
}

// Geram o estilo "retrô" (borda grossa + sombra dura, sem cantos
// arredondados) usado em todos os painéis e botões da interface.
// Ícone de um jogador: você aparece com a imagem do seu time (hambúrguer/
// pizza/sushi); bots continuam com o PixelBike desenhado em SVG.
function PlayerIcon({ player, size = 20 }) {
  if (!player) return null;
  if (player.isBot) return <PixelBike color={player.color} size={size} />;
  const info = TEAM_INFO[player.team] || TEAM_INFO[DEFAULT_TEAM];
  return (
    <img
      src={info.img}
      alt={info.label}
      style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated" }}
    />
  );
}

function pixelPanelStyle(borderColor = COLORS.panelBorder) {
  return { backgroundColor: COLORS.panel, border: `3px solid ${borderColor}`, boxShadow: "4px 4px 0px rgba(0,0,0,0.5)" };
}
function pixelButtonStyle(bg = COLORS.accentYellow, disabled = false) {
  return {
    backgroundColor: disabled ? "#555" : bg,
    color: COLORS.bgDeep,
    border: "2px solid #000",
    boxShadow: disabled ? "none" : "3px 3px 0px rgba(0,0,0,0.6)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

// Cálculos simples reaproveitados em vários lugares (custo de contratação,
// zonas/entregadores/pontuação de um jogador, quem joga em seguida).
function computeHireCost(player) {
  return BASE_HIRE_COST + player.hiresMade * HIRE_COST_STEP;
}
function getZonesOf(zones, playerId) {
  return zones.filter((z) => z.ownerId === playerId);
}
function totalBikesOf(zones, playerId) {
  return getZonesOf(zones, playerId).reduce((sum, z) => sum + z.bikes, 0);
}
function scoreOf(zones, player) {
  return getZonesOf(zones, player.id).length * 50 + player.money;
}
function nextEligibleIndex(zones, players, fromIndex) {
  let idx = fromIndex;
  for (let i = 0; i < players.length; i++) {
    idx = (idx + 1) % players.length;
    if (getZonesOf(zones, players[idx].id).length > 0) break;
  }
  return idx;
}

/* ---- Sistema de cartas: sortear uma carta e aplicar o efeito dela ---- */

// Sorteia o tipo de carta: 55% lei, 25% infração, 20% blitz.
// Mude os números (0.55 / 0.8) para deixar um tipo mais ou menos comum.
function drawCard() {
  const r = Math.random();
  if (r < 0.55) return { type: "lei", text: LAW_CARDS[Math.floor(Math.random() * LAW_CARDS.length)] };
  if (r < 0.8) return { type: "infracao", text: INFRACAO_CARDS[Math.floor(Math.random() * INFRACAO_CARDS.length)] };
  return { type: "blitz", text: BLITZ_CARDS[Math.floor(Math.random() * BLITZ_CARDS.length)] };
}

// Aplica o efeito da carta sorteada e devolve: as zonas atualizadas,
// a mensagem pro log, e o bônus de ataque (só a carta de lei dá bônus).
function applyCard(card, playerId, zones) {
  if (card.type === "lei") {
    return { zones, log: `📜 Lei seguida: sua frota ganha +1 no dado do próximo ataque deste turno.`, attackBonus: 1 };
  }
  if (card.type === "infracao") {
    const mine = zones.filter((z) => z.ownerId === playerId && z.bikes > 1);
    if (mine.length === 0) return { zones, log: `🚨 Infração registrada, mas a frota já está no mínimo — sem perdas.`, attackBonus: 0 };
    const target = mine[Math.floor(Math.random() * mine.length)];
    const newZones = zones.map((z) => (z.id === target.id ? { ...z, bikes: z.bikes - 1 } : z));
    return { zones: newZones, log: `🚨 Infração: 1 entregador multado em ${target.name}.`, attackBonus: 0 };
  }
  const candidates = zones.filter((z) => z.ownerId !== null && z.bikes > 1);
  if (candidates.length === 0) return { zones, log: `🚓 Blitz não encontrou irregularidades.`, attackBonus: 0 };
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const newZones = zones.map((z) => (z.id === target.id ? { ...z, bikes: z.bikes - 1 } : z));
  return { zones: newZones, log: `🚓 Blitz flagrou irregularidade em ${target.name}, -1 entregador.`, attackBonus: 0 };
}

function cardMeta(type) {
  if (type === "lei") return { title: "📜 CARTA DE LEI", color: COLORS.accentYellow };
  if (type === "infracao") return { title: "🚨 CARTA DE INFRAÇÃO", color: COLORS.danger };
  return { title: "🚓 BLITZ / FISCALIZAÇÃO", color: COLORS.accentMagenta };
}

/* ---- Combate: as regras de ataque entre dois territórios vizinhos ---- */

// bonus = o +1 da carta de lei (0 se não tiver). Rola 1 dado pra cada lado
// (+ bônus pela quantidade de entregadores, até +3). Quem tira mais vence.
// Se o atacante vence, metade da frota dele muda para o território
// conquistado. Se perde, o atacante fica com 1 entregador a menos.
function resolveAttack(zones, players, fromId, toId, bonus) {
  const atk = zones.find((z) => z.id === fromId);
  const def = zones.find((z) => z.id === toId);
  const atkOwner = players.find((p) => p.id === atk.ownerId);
  const defOwnerName = def.ownerId === null ? "Território neutro" : players.find((p) => p.id === def.ownerId)?.name;
  const atkBonus = Math.min(atk.bikes - 1, 3) + bonus;
  const defBonus = Math.min(def.bikes, 3);
  const atkRoll = Math.floor(Math.random() * 6) + 1 + atkBonus;
  const defRoll = Math.floor(Math.random() * 6) + 1 + defBonus;
  let newZones, log;
  if (atkRoll > defRoll) {
    const moved = Math.max(1, Math.floor(atk.bikes / 2));
    newZones = zones.map((z) => {
      if (z.id === fromId) return { ...z, bikes: z.bikes - moved };
      if (z.id === toId) return { ...z, ownerId: atk.ownerId, bikes: moved };
      return z;
    });
    log = `⚔️ ${atkOwner.name} (${atkRoll}) conquistou ${def.name} de ${defOwnerName} (${defRoll}).`;
  } else {
    newZones = zones.map((z) => (z.id === fromId ? { ...z, bikes: Math.max(1, z.bikes - 1) } : z));
    log = `🛡️ ${defOwnerName} (${defRoll}) resistiu ao ataque de ${atkOwner.name} (${atkRoll}) em ${def.name}.`;
  }
  const owners = new Set(newZones.map((z) => z.ownerId));
  const dominator = owners.size === 1 && [...owners][0] !== null ? [...owners][0] : null;
  return { zones: newZones, log, dominator };
}

/* ---- "IA" dos bots: joga o turno inteiro do bot de uma vez só ---- */
// Ordem: 1) renda, 2) até 2 contratações (65% de chance cada vez),
// 3) puxa 1 carta, 4) até 2 ataques (só ataca se achar vantagem,
// senão para de atacar). Mude os números (0.65, o "< 2" dos loops,
// "advantage < -1") para deixar o bot mais ou menos agressivo.
function computeBotTurn(bot, zonesIn, playersIn) {
  let zones = zonesIn;
  let players = playersIn;
  const logs = [];
  let dominator = null;

  let income = 0;
  getZonesOf(zones, bot.id).forEach((z) => {
    const compliance = Math.floor(Math.random() * 51) + 50;
    income += Math.round((z.bikes * INCOME_PER_BIKE * compliance) / 100);
  });
  players = players.map((p) => (p.id === bot.id ? { ...p, money: p.money + income } : p));
  logs.push(`💰 ${bot.name} coletou R$${income} de renda.`);

  for (let i = 0; i < 2; i++) {
    const curPlayer = players.find((p) => p.id === bot.id);
    const cost = computeHireCost(curPlayer);
    const myZones = getZonesOf(zones, bot.id);
    if (curPlayer.money >= cost && myZones.length > 0 && Math.random() < 0.65) {
      const zone = myZones[Math.floor(Math.random() * myZones.length)];
      players = players.map((p) => (p.id === bot.id ? { ...p, money: p.money - cost, hiresMade: p.hiresMade + 1 } : p));
      zones = zones.map((z) => (z.id === zone.id ? { ...z, bikes: z.bikes + 1 } : z));
      logs.push(`🚴 ${bot.name} contratou um entregador em ${zone.name}.`);
    }
  }

  const card = drawCard();
  const cardResult = applyCard(card, bot.id, zones);
  zones = cardResult.zones;
  logs.push(`${bot.name}: ${cardResult.log}`);
  const attackBonus = cardResult.attackBonus;

  for (let i = 0; i < 2; i++) {
    const myZones = getZonesOf(zones, bot.id).filter((z) => z.bikes >= 2);
    if (myZones.length === 0) break;
    let bestAttack = null;
    myZones.forEach((z) => {
      z.neighbors.forEach((nId) => {
        const n = zones.find((zz) => zz.id === nId);
        if (n.ownerId === bot.id) return;
        const advantage = z.bikes - n.bikes;
        if (!bestAttack || advantage > bestAttack.advantage) bestAttack = { fromId: z.id, toId: nId, advantage };
      });
    });
    if (!bestAttack || bestAttack.advantage < -1) break;
    const result = resolveAttack(zones, players, bestAttack.fromId, bestAttack.toId, i === 0 ? attackBonus : 0);
    zones = result.zones;
    logs.push(result.log);
    if (result.dominator !== null) {
      dominator = result.dominator;
      break;
    }
  }

  return { zones, players, logs, dominator };
}

/* ==========================================================================
   3. COMPONENTE PRINCIPAL — guarda o estado do jogo e desenha a tela.
   ========================================================================== */
export default function GuerraDosEntregadores({ team, onSair } = {}) {
  // ---- ESTADO: tudo que pode mudar durante a partida ----
  const [screen, setScreen] = useState("setup"); // "setup" | "playing" | "gameover"
  const [numBots, setNumBots] = useState(1);
  const [players, setPlayers] = useState([]);
  const [zones, setZones] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("INCOME");
  const [turnCount, setTurnCount] = useState(0);
  const [log, setLog] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winReason, setWinReason] = useState(null);
  const [turnAttackBonus, setTurnAttackBonus] = useState(0);
  const [pendingCard, setPendingCard] = useState(null);
  const processingRef = useRef(false);

  const round = Math.floor(turnCount / Math.max(players.length, 1)) + 1;
  const currentPlayer = players[currentIndex];

  function pushLog(text) {
    setLog((prev) => [text, ...prev].slice(0, 8));
  }

  // Monta o jogo do zero: cria os jogadores (você + bots) e distribui
  // 2 territórios iniciais para cada um; o resto fica neutro.
  function startGame(bots) {
    const teamKey = team || DEFAULT_TEAM;
    const totalPlayers = 1 + bots;
    const newPlayers = Array.from({ length: totalPlayers }).map((_, i) => ({
      id: i,
      name: i === 0 ? "Você" : `Bot ${i}`,
      isBot: i !== 0,
      team: i === 0 ? teamKey : null,
      color: i === 0 ? TEAM_INFO[teamKey].color : BOT_COLORS[i - 1],
      money: STARTING_MONEY,
      hiresMade: 0,
    }));
    const shuffledIds = shuffle(ZONE_DEFS.map((z) => z.id));
    const newZones = ZONE_DEFS.map((z) => ({ ...z, ownerId: null, bikes: Math.random() < 0.5 ? 1 : 2 }));
    shuffledIds.slice(0, totalPlayers * 2).forEach((zoneId, i) => {
      const ownerIndex = Math.floor(i / 2);
      const zone = newZones.find((z) => z.id === zoneId);
      zone.ownerId = ownerIndex;
      zone.bikes = STARTING_BIKES;
    });
    setPlayers(newPlayers);
    setZones(newZones);
    setCurrentIndex(0);
    setPhase("INCOME");
    setTurnCount(0);
    setSelectedZoneId(null);
    setPendingCard(null);
    setTurnAttackBonus(0);
    setWinner(null);
    setWinReason(null);
    setLog(["🛵 Jogo iniciado! Conquiste os territórios neutros e roube dos bots."]);
    setScreen("playing");
  }

  // ---- TURNO AUTOMÁTICO DOS BOTS ----
  // Sempre que muda de quem é a vez, se for a vez de um bot, espera
  // 750ms (só pra dar tempo de ler o log) e joga o turno dele inteiro.
  useEffect(() => {
    if (screen !== "playing") return;
    const cp = players[currentIndex];
    if (!cp || !cp.isBot) return;
    if (processingRef.current) return;
    processingRef.current = true;
    const timer = setTimeout(() => {
      const result = computeBotTurn(cp, zones, players);
      const revLogs = [...result.logs].reverse();
      if (result.dominator !== null) {
        setZones(result.zones);
        setPlayers(result.players);
        setLog((prev) => [...revLogs, ...prev].slice(0, 8));
        setWinner(result.dominator);
        setWinReason("domination");
        setScreen("gameover");
        processingRef.current = false;
        return;
      }
      const nextTurnCount = turnCount + 1;
      const nextRound = Math.floor(nextTurnCount / result.players.length) + 1;
      if (nextRound > ROUND_LIMIT) {
        let best = result.players[0];
        result.players.forEach((p) => { if (scoreOf(result.zones, p) > scoreOf(result.zones, best)) best = p; });
        setZones(result.zones);
        setPlayers(result.players);
        setLog((prev) => [...revLogs, ...prev].slice(0, 8));
        setWinner(best.id);
        setWinReason("rounds");
        setScreen("gameover");
        processingRef.current = false;
        return;
      }
      const nextIndex = nextEligibleIndex(result.zones, result.players, currentIndex);
      setZones(result.zones);
      setPlayers(result.players);
      setLog((prev) => [...revLogs, ...prev].slice(0, 8));
      setTurnCount(nextTurnCount);
      setCurrentIndex(nextIndex);
      setPhase("INCOME");
      setSelectedZoneId(null);
      setTurnAttackBonus(0);
      processingRef.current = false;
    }, 750);
    return () => clearTimeout(timer);
  }, [currentIndex, screen]);

  // ---- AÇÕES DO JOGADOR HUMANO ----
  // Cada função abaixo corresponde a um clique seu na interface.

  // Fase RENDA: soma a renda de cada território seu (sorteio de 50-100%
  // de conformidade por território) e passa pra fase de contratação.
  function collectIncome() {
    let total = 0;
    const details = [];
    getZonesOf(zones, currentPlayer.id).forEach((z) => {
      const compliance = Math.floor(Math.random() * 51) + 50;
      const earned = Math.round((z.bikes * INCOME_PER_BIKE * compliance) / 100);
      total += earned;
      details.push(`${z.name} (${compliance}%): +R$${earned}`);
    });
    setPlayers((prev) => prev.map((p) => (p.id === currentPlayer.id ? { ...p, money: p.money + total } : p)));
    pushLog(`💰 Você coletou R$${total} de renda. ${details.join(" · ")}`);
    setPhase("HIRE");
  }

  // Fase CONTRATAÇÃO: clicar num território seu compra +1 entregador ali.
  function hireBike(zoneId) {
    const cost = computeHireCost(currentPlayer);
    if (currentPlayer.money < cost) {
      pushLog(`🚫 Dinheiro insuficiente (precisa de R$${cost}).`);
      return;
    }
    setPlayers((prev) => prev.map((p) => (p.id === currentPlayer.id ? { ...p, money: p.money - cost, hiresMade: p.hiresMade + 1 } : p)));
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, bikes: z.bikes + 1 } : z)));
    const zoneName = zones.find((z) => z.id === zoneId)?.name;
    pushLog(`🚴 Você contratou um entregador em ${zoneName} por R$${cost}.`);
  }

  // Botão "Puxar Carta e Avançar": sorteia a carta e guarda o resultado
  // em pendingCard — isso abre o modal (a fase só muda para ATTACK
  // quando você clicar em "Continuar" no modal, veja confirmCard).
  function handleDrawCard() {
    const card = drawCard();
    const result = applyCard(card, currentPlayer.id, zones);
    setPendingCard({ card, zones: result.zones, log: result.log, attackBonus: result.attackBonus });
  }

  // Botão "Continuar" do modal da carta: aplica o efeito de verdade e
  // libera a fase de ATAQUE.
  function confirmCard() {
    setZones(pendingCard.zones);
    pushLog(`Você: ${pendingCard.log}`);
    setTurnAttackBonus(pendingCard.attackBonus);
    setPhase("ATTACK");
    setPendingCard(null);
  }

  // Fase ATAQUE: dispara o combate entre 2 territórios (chamado pelo
  // handleZoneClick quando você já escolheu o território de origem
  // e clica num vizinho neutro ou inimigo).
  function attack(fromId, toId) {
    const result = resolveAttack(zones, players, fromId, toId, turnAttackBonus);
    setZones(result.zones);
    pushLog(result.log);
    setSelectedZoneId(null);
    setTurnAttackBonus(0);
    if (result.dominator !== null) {
      setWinner(result.dominator);
      setWinReason("domination");
      setScreen("gameover");
    }
  }

  // Botão "Finalizar Turno": passa a vez pro próximo jogador vivo
  // (pulando quem já perdeu todos os territórios) e verifica se
  // acabaram as rodadas (decide o vencedor por pontos nesse caso).
  function finishTurn() {
    const nextTurnCount = turnCount + 1;
    const nextRound = Math.floor(nextTurnCount / players.length) + 1;
    if (nextRound > ROUND_LIMIT) {
      let best = players[0];
      players.forEach((p) => { if (scoreOf(zones, p) > scoreOf(zones, best)) best = p; });
      setWinner(best.id);
      setWinReason("rounds");
      setScreen("gameover");
      return;
    }
    const nextIndex = nextEligibleIndex(zones, players, currentIndex);
    setTurnCount(nextTurnCount);
    setCurrentIndex(nextIndex);
    setPhase("INCOME");
    setSelectedZoneId(null);
    setTurnAttackBonus(0);
  }

  // Clique em qualquer território no mapa: o que acontece depende da
  // fase atual (contratar na fase HIRE, escolher/atacar na fase ATTACK).
  function handleZoneClick(zoneId) {
    if (!currentPlayer || currentPlayer.isBot) return;
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    if (phase === "HIRE") {
      if (zone.ownerId === currentPlayer.id) hireBike(zoneId);
      return;
    }
    if (phase === "ATTACK") {
      if (selectedZoneId === null) {
        if (zone.ownerId === currentPlayer.id && zone.bikes >= 2) setSelectedZoneId(zoneId);
        return;
      }
      if (zoneId === selectedZoneId) {
        setSelectedZoneId(null);
        return;
      }
      const fromZone = zones.find((z) => z.id === selectedZoneId);
      if (zone.ownerId !== currentPlayer.id && fromZone.neighbors.includes(zoneId)) {
        attack(selectedZoneId, zoneId);
      } else if (zone.ownerId === currentPlayer.id && zone.bikes >= 2) {
        setSelectedZoneId(zoneId);
      }
    }
  }

  /* ------------------------------------------------------------------
     4. TELAS — a partir daqui é só o desenho (JSX) de cada tela.
     ------------------------------------------------------------------ */

  // TELA 1: configuração inicial (escolher nº de bots e começar)
  if (screen === "setup") {
    return (
      <div className="w-full flex items-center justify-center p-6" style={{ backgroundColor: COLORS.bgDeep, fontFamily: "system-ui, sans-serif", minHeight: 600 }}>
        <div className="max-w-md w-full p-6" style={pixelPanelStyle(COLORS.accentYellow)}>
          <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: COLORS.accentYellow, letterSpacing: "1px" }}>
            🛵 GUERRA DOS ENTREGADORES
          </h1>
          <p className="text-center text-sm mb-4" style={{ color: COLORS.ink }}>
            Modo solo: conquiste territórios neutros e roube a frota dos bots pelo mapa da cidade.
          </p>

          <div className="mb-4 p-2 flex items-center gap-2" style={{ backgroundColor: COLORS.road, border: `2px solid ${COLORS.panelBorder}` }}>
            <img
              src={TEAM_INFO[team || DEFAULT_TEAM].img}
              alt={TEAM_INFO[team || DEFAULT_TEAM].label}
              style={{ width: 32, height: 32, objectFit: "contain", imageRendering: "pixelated" }}
            />
            <p className="text-xs" style={{ color: COLORS.ink }}>
              Seu time: <strong style={{ color: TEAM_INFO[team || DEFAULT_TEAM].color }}>{TEAM_INFO[team || DEFAULT_TEAM].label}</strong>
            </p>
          </div>

          <div className="mb-4 p-3" style={{ backgroundColor: COLORS.road, border: `2px solid ${COLORS.panelBorder}` }}>
            <p className="text-xs font-bold mb-1" style={{ color: COLORS.accentYellow }}>Como jogar</p>
            <ul className="text-xs space-y-1" style={{ color: COLORS.ink }}>
              <li>1. Colete a renda aleatória dos seus entregadores.</li>
              <li>2. Contrate mais entregadores (fica mais caro a cada contratação).</li>
              <li>3. Puxe uma carta de trânsito: lei (bônus), infração ou blitz (perdas).</li>
              <li>4. Ataque territórios vizinhos — neutros (cinza) ou dos bots — para conquistá-los.</li>
              <li>5. Vence quem dominar o mapa todo, ou tiver mais pontos após {ROUND_LIMIT} rodadas.</li>
            </ul>
          </div>

          <p className="text-sm mb-2 font-bold" style={{ color: COLORS.ink }}>Quantos bots você quer enfrentar?</p>
          <div className="flex gap-3 mb-4">
            {[1, 2].map((n) => (
              <button key={n} onClick={() => setNumBots(n)} className="flex-1 py-2 font-bold" style={pixelButtonStyle(numBots === n ? COLORS.accentMagenta : COLORS.accentYellow)}>
                {n} bot{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>

          <button onClick={() => startGame(numBots)} className="w-full py-3 font-bold text-base" style={pixelButtonStyle(COLORS.success)}>
            ▶ Começar Jogo
          </button>

          {onSair && (
            <button onClick={onSair} className="w-full py-2 mt-2 font-bold text-xs" style={pixelButtonStyle("#555")}>
              ⬅ Voltar ao Menu
            </button>
          )}
        </div>
      </div>
    );
  }

  // TELA 2: fim de jogo (ranking final e botão de jogar de novo)
  if (screen === "gameover") {
    const ranked = [...players].sort((a, b) => scoreOf(zones, b) - scoreOf(zones, a));
    return (
      <div className="w-full flex items-center justify-center p-6" style={{ backgroundColor: COLORS.bgDeep, fontFamily: "system-ui, sans-serif", minHeight: 600 }}>
        <div className="max-w-md w-full p-6" style={pixelPanelStyle(COLORS.accentYellow)}>
          <h2 className="text-xl font-bold text-center mb-2" style={{ color: COLORS.accentYellow }}>🏆 FIM DE JOGO</h2>
          <p className="text-center text-sm mb-4" style={{ color: COLORS.ink }}>
            {winReason === "domination"
              ? `${players.find((p) => p.id === winner)?.name} dominou toda a cidade!`
              : `Fim das ${ROUND_LIMIT} rodadas — vitória por pontos!`}
          </p>
          <div className="space-y-2 mb-4">
            {ranked.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-2" style={{ backgroundColor: COLORS.road, border: `2px solid ${p.color}` }}>
                <span className="flex items-center gap-2 text-sm font-bold" style={{ color: COLORS.ink }}>
                  <PlayerIcon player={p} size={20} /> {i === 0 ? "👑 " : ""}
                  {p.isBot ? "🤖" : "👤"} {p.name}
                </span>
                <span className="text-xs" style={{ color: COLORS.ink, fontFamily: "monospace" }}>
                  {getZonesOf(zones, p.id).length} zonas · R${p.money} · {scoreOf(zones, p).toFixed(0)} pts
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen("setup")} className="w-full py-3 font-bold" style={pixelButtonStyle(COLORS.success)}>
            🔁 Jogar novamente
          </button>
          {onSair && (
            <button onClick={onSair} className="w-full py-2 mt-2 font-bold text-xs" style={pixelButtonStyle("#555")}>
              ⬅ Voltar ao Menu
            </button>
          )}
        </div>
      </div>
    );
  }

  // TELA 3: o jogo em si (HUD + mapa + barra lateral + modal da carta)
  const meta = pendingCard ? cardMeta(pendingCard.card.type) : null;

  return (
    <div className="w-full p-3" style={{ backgroundColor: COLORS.bgDeep, fontFamily: "system-ui, sans-serif", minHeight: 600, position: "relative" }}>
      <div className="flex items-center justify-between p-3 mb-3 flex-wrap gap-2" style={pixelPanelStyle(COLORS.accentYellow)}>
        <span className="font-bold text-sm" style={{ color: COLORS.accentYellow }}>🛵 GUERRA DOS ENTREGADORES</span>
        <span className="text-xs" style={{ color: COLORS.ink, fontFamily: "monospace" }}>Rodada {round}/{ROUND_LIMIT}</span>
        <span className="text-xs font-bold px-2 py-1" style={{ color: COLORS.bgDeep, backgroundColor: currentPlayer.color }}>
          Vez de: {currentPlayer.isBot ? "🤖 " : "👤 "}{currentPlayer.name}
        </span>
        {onSair && (
          <button onClick={onSair} className="text-xs font-bold px-2 py-1" style={pixelButtonStyle("#555")}>
            ⬅ Menu
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        {/* MAPA: um SVG com uma linha por conexão (EDGES) e um círculo
            por território (zones.map). Editar posição/tamanho é aqui. */}
        <div className="md:w-3/5 p-2" style={pixelPanelStyle()}>
          <svg viewBox="0 0 600 420" width="100%" height="auto">
            <rect x="0" y="0" width="600" height="420" fill={COLORS.bgDeep} />
            {EDGES.map(([a, b]) => {
              const za = ZONE_DEFS.find((z) => z.id === a);
              const zb = ZONE_DEFS.find((z) => z.id === b);
              return <line key={a + "-" + b} x1={za.x} y1={za.y} x2={zb.x} y2={zb.y} stroke={COLORS.panelBorder} strokeWidth={3} />;
            })}
            {zones.map((zone) => {
              const owner = players.find((p) => p.id === zone.ownerId);
              const isSelected = selectedZoneId === zone.id;
              const isSelectable =
                !currentPlayer.isBot &&
                ((phase === "HIRE" && zone.ownerId === currentPlayer.id) ||
                  (phase === "ATTACK" &&
                    ((selectedZoneId === null && zone.ownerId === currentPlayer.id && zone.bikes >= 2) ||
                      (selectedZoneId !== null &&
                        ((zone.ownerId === currentPlayer.id && zone.bikes >= 2) ||
                          (zone.ownerId !== currentPlayer.id && zones.find((z) => z.id === selectedZoneId)?.neighbors.includes(zone.id)))))));
              const fill = owner ? owner.color : COLORS.neutral;
              const stroke = isSelected ? COLORS.accentYellow : owner ? owner.color : "#666";
              return (
                <g key={zone.id} onClick={() => isSelectable && handleZoneClick(zone.id)} style={{ cursor: isSelectable ? "pointer" : "default" }}>
                  <circle cx={zone.x} cy={zone.y} r={isSelected ? 34 : 30} fill={fill} stroke={stroke} strokeWidth={isSelected ? 4 : 3} strokeDasharray={owner ? "0" : "6,4"} opacity={isSelectable || phase === "INCOME" || phase === "CARD" ? 1 : 0.75} />
                  <text x={zone.x} y={zone.y - 40} textAnchor="middle" fontSize="11" fontWeight="bold" fill={COLORS.ink}>{zone.name}</text>
                  <text x={zone.x} y={zone.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={owner ? COLORS.bgDeep : COLORS.ink}>{zone.bikes}</text>
                  <text x={zone.x} y={zone.y + 46} textAnchor="middle" fontSize="9" fill={owner ? owner.color : COLORS.ink}>
                    {owner ? (owner.isBot ? `🤖 ${owner.name}` : "👤 Você") : "Neutro"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* BARRA LATERAL: lista de jogadores, ações da fase atual, log */}
        <div className="md:w-2/5 flex flex-col gap-3">
          <div className="p-3" style={pixelPanelStyle()}>
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1" style={{ opacity: getZonesOf(zones, p.id).length === 0 ? 0.4 : 1 }}>
                <span className="text-xs font-bold flex items-center gap-1" style={{ color: p.color }}>
                  <PlayerIcon player={p} size={16} />
                  {p.isBot ? "🤖" : "👤"} {p.name}
                  {p.id === currentPlayer.id ? " ◀" : ""}
                </span>
                <span className="text-xs" style={{ color: COLORS.ink, fontFamily: "monospace" }}>
                  R${p.money} · {getZonesOf(zones, p.id).length}z · {totalBikesOf(zones, p.id)}🚴
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 flex-1" style={pixelPanelStyle(COLORS.accentMagenta)}>
            <p className="text-xs font-bold mb-2" style={{ color: COLORS.accentMagenta }}>
              FASE: {phase === "INCOME" ? "RENDA" : phase === "HIRE" ? "CONTRATAÇÃO" : "ATAQUE"}
            </p>

            {currentPlayer.isBot ? (
              <p className="text-xs" style={{ color: COLORS.ink }}>🤖 {currentPlayer.name} está jogando...</p>
            ) : (
              <>
                {phase === "INCOME" && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: COLORS.ink }}>Role a renda dos seus entregadores.</p>
                    <button onClick={collectIncome} className="w-full py-2 font-bold text-sm" style={pixelButtonStyle(COLORS.accentYellow)}>🎲 Coletar Renda</button>
                  </div>
                )}
                {phase === "HIRE" && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: COLORS.ink }}>
                      Clique numa zona sua para contratar (R${computeHireCost(currentPlayer)}). Você tem R${currentPlayer.money}.
                    </p>
                    <button onClick={handleDrawCard} className="w-full py-2 font-bold text-sm" style={pixelButtonStyle(COLORS.accentYellow)}>➜ Puxar Carta e Avançar</button>
                  </div>
                )}
                {phase === "ATTACK" && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: COLORS.ink }}>
                      {selectedZoneId === null ? "Clique numa zona sua (2+ entregadores) para escolher o ataque." : "Agora clique num território vizinho (neutro ou inimigo) para atacar."}
                    </p>
                    <button onClick={finishTurn} className="w-full py-2 font-bold text-sm" style={pixelButtonStyle(COLORS.success)}>✅ Finalizar Turno</button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-3" style={pixelPanelStyle()}>
            <p className="text-xs font-bold mb-1" style={{ color: COLORS.accentYellow }}>LOG</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {log.map((entry, i) => (
                <p key={i} className="text-xs" style={{ color: COLORS.ink }}>{entry}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DA CARTA: aparece por cima de tudo quando pendingCard existe */}
      {pendingCard && (
        <div className="absolute inset-0 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50 }}>
          <div className="max-w-sm w-full p-5" style={pixelPanelStyle(meta.color)}>
            <p className="text-xs font-bold mb-2" style={{ color: meta.color }}>{meta.title}</p>
            <p className="text-sm mb-3" style={{ color: COLORS.ink }}>"{pendingCard.card.text}"</p>
            <p className="text-xs mb-4" style={{ color: COLORS.accentYellow }}>{pendingCard.log}</p>
            <button onClick={confirmCard} className="w-full py-2 font-bold text-sm" style={pixelButtonStyle(COLORS.success)}>Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}