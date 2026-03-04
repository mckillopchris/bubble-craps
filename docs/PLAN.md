# Bubble Craps Game - Implementation Plan

## Context

Building a realistic bubble craps game modeled after Interblock's physical machines. The game simulates the dice-in-a-dome experience with a 3D physics-based dice roller, starting with the standard Craps variant for online play. The architecture will support future multiplayer capability and eventual iOS/Android ports.

- **Stack:** React + TypeScript, Three.js + Rapier3D physics, Vite
- **Scope (Phase 1 delivery):** Single-player standard Craps with 3D dice roller

## Architecture Overview

```
src/
  engine/          # Pure TypeScript game logic (no UI deps)
    types.ts       # Core types: Bet, GameState, DiceOutcome, etc.
    state.ts       # Game state machine (come-out, point, resolution)
    bets.ts        # Bet definitions, win/loss/push rules, payouts
    resolver.ts    # Roll resolution - evaluates all bets against outcome
    validator.ts   # Bet placement validation rules
  dice/            # 3D dice roller (Three.js + Rapier3D)
    scene.ts       # Three.js scene, camera, lighting, dome
    physics.ts     # Rapier3D world, dice rigid bodies, collision
    dice-mesh.ts   # Dice geometry, pip textures, materials
    roller.ts      # Roll trigger, animation loop, result detection
    DiceRoller.tsx  # React component wrapper
  ui/              # React UI components
    table/         # Craps table layout and betting areas
    chips/         # Chip rack, selection, placement
    controls/      # Roll button, special buttons, clear/double/repeat
    display/       # Credits, puck, history, win conditions
    modals/        # Odds popup, commission confirm, help/rules
  hooks/           # React hooks for game state, dice integration
  store/           # State management (Zustand or similar)
  assets/          # Textures, sounds, fonts
  utils/           # Shared utilities
```

The game engine (`engine/`) is deliberately framework-agnostic pure TypeScript, enabling direct reuse in future mobile ports regardless of chosen framework.

---

## Phases & User Stories

### Phase 1: Project Setup & Core Game Engine ✅

**Goal:** Establish project structure and implement the core game logic that will drive everything else.

**Stories:**

- P1-1: As a developer, I can run `npm run dev` and see a basic React app with Three.js rendering a placeholder scene
- P1-2: As a game engine, I can model all standard Craps bet types with their win/loss/push conditions and payouts
- P1-3: As a game engine, I can manage the game state machine: come-out roll → point established → subsequent rolls → 7-out or point rerolled
- P1-4: As a game engine, I can resolve all active bets against a dice outcome and calculate net payouts
- P1-5: As a game engine, I can validate bet placement rules (e.g., Pass Line only on come-out, Come only after point established, excluding bets like Pass/Don't Pass)
- P1-6: As a game engine, I can track player credits, total wagered, and playable balance

**Key deliverables:**

- Vite + React + TypeScript project scaffold
- Complete type system for game entities
- State machine with event-driven transitions
- All bet type definitions per the Interblock spec (contract, multi-roll, single-roll)
- Bet resolution engine with full payout tables
- Unit tests for all game logic

**Bet types to implement (standard Craps):**

| Category | Bets |
|----------|------|
| Contract | Pass Line, Don't Pass |
| Multi-roll | Pass Line Odds, Don't Pass Odds, Come, Don't Come, Come Odds, Don't Come Odds, Place (4/5/6/8/9/10), Buy, Lay, Big 6, Big 8, Hard Ways (2-2/3-3/4-4/5-5) |
| Single-roll | Field, C, E, C&E, Seven, Any Craps, Horn (2/3/11/12/Horn Bet), Hop bets, Hopping Hard Ways |

---

### Phase 2: 3D Dice Roller ✅

**Goal:** Build the signature bubble craps dice roller - a transparent dome containing two dice that physically bounce and settle.

**Stories:**

- P2-1: As a player, I can see a 3D transparent dome/bubble with two dice inside, rendered with realistic lighting and reflections
- P2-2: As a player, when I trigger a roll, the dice launch upward within the dome, bounce off the walls and floor with realistic physics, and settle to a rest position
- P2-3: As a player, I can clearly read the pip values on each die after they settle
- P2-4: As the game system, I can reliably detect which face is up on each die after physics simulation completes
- P2-5: As a player, the dice roll feels random and varied - different trajectories, spins, and settling patterns each time
- P2-6: As a player, I can see the dome from an angled perspective that matches the feel of looking at a real bubble craps machine

**Key deliverables:**

- Three.js scene with PBR-lit transparent dome geometry
- Rapier3D physics world with dome collider, floor, and two dice rigid bodies
- Dice meshes with properly oriented pip textures on all 6 faces (opposite faces sum to 7)
- Roll initiation with randomized impulse forces and torques
- Settlement detection (dice velocity below threshold for N frames)
- Face-up detection via quaternion analysis
- Camera positioning and optional subtle orbit
- Integration hook: `useRoll()` → triggers physics, returns `{die1: number, die2: number}`

**Physics simulation details (from patent):**

- Dice must contact dome walls multiple times per roll (simulating the patent's shake validation criteria)
- Randomized initial force vectors to prevent predictable patterns
- Gravity, restitution (bounciness), and friction tuned to match real dice behavior
- Minimum simulation time before settlement check (prevents instant "drops")

---

### Phase 3: Craps Table UI & Basic Game Flow ✅

**Goal:** Build the full craps table layout and connect it to the game engine for a playable basic game.

**Stories:**

- P3-1: As a player, I can see a standard craps table layout with all betting areas clearly labeled and visually distinct
- P3-2: As a player, I can select chip denominations from a chip rack at the bottom of the screen
- P3-3: As a player, I can place bets by clicking/tapping on valid betting areas, and see my chips appear on the table
- P3-4: As a player, I can see my total credit, playable balance, current bet total, and last win amount
- P3-5: As a player, I can see a marker puck that shows OFF before come-out and moves to ON at the established point
- P3-6: As a player, I can click a Roll button to trigger the dice roller and see the outcome resolve my bets
- P3-7: As a player, I can see a roll history sidebar showing recent results
- P3-8: As a player, I see the win condition display highlighting which totals would win on the next roll
- P3-9: As a player, winning bets are visually highlighted and payouts are animated into my credit
- P3-10: As a player, I can clear my last bet or all bets before rolling

**Key deliverables:**

- SVG/Canvas-based craps table layout component (responsive)
- Chip rack component with selectable denominations
- Bet placement system (click area → validate → place chip visual)
- HUD: credits, playable, bet total, last win
- Marker puck component with OFF/ON states and point positioning
- Roll button with state management (disabled during roll, etc.)
- Roll history list
- Win condition indicator
- Game flow integration: place bets → roll → resolve → display results → repeat

---

### Phase 4: Complete Bet System & Interactions

**Goal:** Implement all remaining bet mechanics, odds popups, and complex bet interactions.

**Stories:**

- P4-1: As a player, after a point is established on my Pass Line bet, I see an odds multiplier popup and can select my odds bet
- P4-2: As a player, I can place Come and Don't Come bets after the point is established, and see my chips move to the Come Point when established
- P4-3: As a player, I can place Place, Buy, and Lay bets on individual point numbers
- P4-4: As a player, when I place a Buy or Lay bet, I see a commission confirmation popup and my commission is deducted upfront
- P4-5: As a player, I can place Hard Ways bets and see the "rolls since last" counter for each hard way
- P4-6: As a player, I can place Horn bets individually or as a combined Horn Bet (split 4 ways)
- P4-7: As a player, I can place Hop bets on specific dice combinations
- P4-8: As a player, I can place Field bets with proper 2x/3x payouts on 2 and 12
- P4-9: As a player, I can use the Double Bet button to double all current bets
- P4-10: As a player, I can use the Repeat Last Bet button to replay my previous round's bets
- P4-11: As a player, Come/Don't Come excluding rules are enforced (can't bet both simultaneously)

**Key deliverables:**

- Odds multiplier popup component
- Come/Don't Come bet flow with chip movement animations
- Place/Buy/Lay bet areas with proper visual distinction
- Commission confirmation modal
- Hard Ways panel with roll counters
- Horn bets panel
- Hop bets panel
- Double bet & repeat bet logic
- All payout calculations matching Interblock spec

---

### Phase 5: Special Buttons & Advanced Features

**Goal:** Implement the convenience features and table management tools.

**Stories:**

- P5-1: As a player, I can tap "Press" to double the Place bet on the last established point
- P5-2: As a player, I can tap "Across" to place bets on all points except the established one
- P5-3: As a player, I can tap "Inside" to place bets on 5, 6, 8, 9 (except established point)
- P5-4: As a player, I can tap "Outside" to place bets on 4, 5, 9, 10 (except established point)
- P5-5: As a player, I can toggle Set Bets On/Off to disable multi-roll bets for the next roll without removing them
- P5-6: As a player, I see game timers counting down betting time (configurable)
- P5-7: As a player, I see a "BETS ARE NOT VALID YET" message when I haven't met minimum bet requirements
- P5-8: As a player, when a Place bet wins on come-out, I see a popup offering to transfer to a Buy bet on another point

**Key deliverables:**

- Special button bar component (Press, Across, Inside, Outside)
- Set Bets On/Off toggle with proper bet state management
- Betting timer with visual countdown
- Minimum bet validation
- Place-to-Buy transfer popup

---

### Phase 6: Special Bets

**Goal:** Implement the Lucky Shooter and Lucky Roller side bets.

**Stories:**

- P6-1: As a player, I can place a Lucky Shooter bet before a point is established
- P6-2: As a player, I see the Lucky Shooter layout with points lighting up red (initial) and blue (hits) as they're rolled
- P6-3: As a player, the Lucky Shooter resolves with proper payouts based on hits achieved before point reroll or 7-out
- P6-4: As a player, I can place Lucky Roller bets (Low Rolls, High Rolls, Roll 'Em All) after a 7 is rolled
- P6-5: As a player, I see numbers light up gold in the Lucky Roller display as qualifying totals are rolled
- P6-6: As a player, Lucky Roller bets resolve when all required numbers hit (win) or 7 is rolled (lose)

**Key deliverables:**

- Lucky Shooter bet area, contract bet logic, hit tracking, payout resolution
- Lucky Roller bet area with three independent sub-bets
- Visual tracking displays for both special bets
- Integration with main game cycle

---

### Phase 7: Polish, Sound & UX

**Goal:** Make the game feel polished and professional.

**Stories:**

- P7-1: As a player, I hear dice rattling in the dome during a roll, and a satisfying settle sound when they land
- P7-2: As a player, I hear chip clicks when placing bets and a distinct win chime when bets pay out
- P7-3: As a player, chips animate smoothly when placed, moved (Come point), and paid out
- P7-4: As a player, I can access a Help/Rules screen explaining all bet types and payouts
- P7-5: As a player, I can toggle "Show Winnings" to see potential payouts on each bet before rolling
- P7-6: As a player, I can toggle "Show Hints" for contextual guidance during play
- P7-7: As a player, I can toggle "Show Bet Limits" to see min/max on each betting area
- P7-8: As a player, the game looks good and is usable on both desktop and tablet-sized screens
- P7-9: As a player, I can choose between a light and dark table theme

**Key deliverables:**

- Web Audio API sound system with spatial audio for dome
- CSS/Framer Motion animations for chip movement
- Responsive layout (desktop + tablet breakpoints)
- Help modal with bet explanations
- Options menu (Show Winnings, Show Hints, Show Bet Limits)
- Visual polish pass (table felt textures, chip materials, glow effects)

---

### Phase 8: Backend & Multiplayer Architecture

**Goal:** Add server-side infrastructure for multiplayer and persistent game state.

**Stories:**

- P8-1: As a player, I can create or join a table and see other players' chip positions (not amounts)
- P8-2: As a player, all players at the table share the same dice roll
- P8-3: As a player, I see a shooter indicator showing whose turn it is to roll
- P8-4: As a player, the dice roll is triggered when the current shooter taps Roll (other players wait)
- P8-5: As a player, my credits and bet history persist across sessions
- P8-6: As the system, dice outcomes are generated server-side using a cryptographically secure RNG

**Key deliverables:**

- Node.js/Express backend with WebSocket support (Socket.io or ws)
- Server-side game engine instance per table
- CSRNG-based dice generation
- Player session management and auth
- Real-time bet/roll synchronization
- Database for player accounts and history (PostgreSQL)

---

### Phase 9: Mobile (Future)

**Goal:** Port to iOS and Android.

**Stories:**

- P9-1: As a mobile player, I can play the full craps game with touch-optimized controls
- P9-2: As a mobile player, the 3D dice roller renders smoothly at 60fps
- P9-3: As a mobile player, I can pinch-to-zoom on the table and drag to pan

**Key deliverables:**

- Framework selection (React Native + react-three-fiber, or native with SceneKit/ARCore)
- Game engine reuse (TypeScript core)
- Mobile-optimized table layout (portrait and landscape)
- Touch gesture system for bet placement
- Performance optimization for mobile GPUs

---

## Implementation Priority (What We Build First)

For the initial development sprint, we'll work through Phases 1-3 to get a playable game:

1. **Phase 1** - Game engine with all bet logic and state machine
2. **Phase 2** - 3D dice roller in the dome
3. **Phase 3** - Table UI connecting everything together

This delivers a fully playable single-player craps game with realistic dice physics. Phases 4-7 layer on completeness and polish. Phase 8+ adds multiplayer and mobile.

## Verification Plan

- **Unit tests:** All game engine logic (bet resolution, state transitions, payout calculations) covered by Vitest
- **Manual testing:** Play through full game cycles verifying each bet type wins/loses/pushes correctly per the Interblock spec tables
- **Physics verification:** Dice always land on a flat face, results are uniformly distributed over many rolls, settlement detection is reliable
- **Cross-browser:** Test in Chrome, Firefox, Safari (WebGL/WebGPU compatibility)
- **Responsive:** Verify layout at 1920x1080, 1366x768, and 1024x768 viewports
