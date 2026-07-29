(function () {
  "use strict";

  const modes = {
    world: {
      label: "Countries",
      path: "/draw-country/",
      title: "Draw countries from memory",
      subtitle: "Coastlines, borders, and memory under pressure.",
      pool: [
        { slug: "italy", name: "Italy", region: "Europe", path: "M45 5 C58 8 62 20 57 30 C67 37 73 44 73 54 C73 62 66 67 61 73 C58 77 62 82 70 88 C62 94 50 91 47 82 C44 73 39 67 33 61 C26 54 25 43 31 36 C36 31 35 22 37 14 C39 9 42 6 45 5 Z M72 76 C81 78 87 84 86 91 C78 95 71 91 70 84 C69 80 70 78 72 76 Z" },
        { slug: "france", name: "France", region: "Europe", path: "M28 17 C38 9 56 12 68 22 L78 42 C70 50 71 63 60 73 L39 76 C33 66 20 63 18 49 L24 38 C17 28 20 21 28 17 Z" },
        { slug: "japan", name: "Japan", region: "Asia", path: "M66 5 C72 12 72 21 65 29 C59 25 57 14 66 5 Z M55 31 C62 38 61 47 54 55 C47 52 46 39 55 31 Z M44 56 C52 65 49 78 38 88 C29 82 31 66 44 56 Z M28 84 C34 90 35 96 29 99 C22 96 21 88 28 84 Z" },
        { slug: "brazil", name: "Brazil", region: "South America", path: "M37 13 C50 8 66 16 75 28 C88 31 92 46 82 56 C82 71 73 86 59 93 C49 86 45 75 38 68 C29 66 17 60 14 48 C24 39 23 24 37 13 Z" },
        { slug: "india", name: "India", region: "Asia", path: "M39 7 C53 6 69 14 74 28 C67 36 67 48 58 56 C55 66 51 78 45 92 C37 79 25 68 24 55 C13 44 16 28 27 23 C30 16 33 10 39 7 Z" },
        { slug: "united-states", name: "United States", region: "North America", path: "M11 38 C24 27 39 29 51 32 C64 25 79 27 91 38 L86 61 C72 58 61 67 49 61 C35 66 22 62 10 56 Z M9 72 C17 67 27 70 31 77 C24 83 15 82 9 72 Z M70 75 C78 73 87 78 89 87 C80 91 72 86 70 75 Z" },
        { slug: "mexico", name: "Mexico", region: "North America", path: "M13 30 C29 23 45 25 60 33 C72 41 85 50 90 64 C80 69 66 62 59 53 C48 50 39 47 30 50 C22 48 17 40 13 30 Z M61 56 C70 61 76 72 73 84 C62 81 56 68 61 56 Z" },
        { slug: "australia", name: "Australia", region: "Oceania", path: "M20 39 C31 25 53 23 69 30 C84 35 92 48 86 62 C72 68 61 78 43 75 C29 79 16 69 12 55 C10 47 13 42 20 39 Z M74 78 C82 76 88 82 87 90 C78 92 72 86 74 78 Z" },
        { slug: "united-kingdom", name: "United Kingdom", region: "Europe", path: "M50 8 C59 16 57 31 48 37 C57 44 56 58 45 63 C49 73 43 84 32 84 C28 74 35 64 30 55 C22 49 24 36 34 33 C31 21 38 11 50 8 Z M63 58 C72 61 75 70 68 77 C59 75 56 64 63 58 Z" },
        { slug: "germany", name: "Germany", region: "Europe", path: "M39 9 C53 6 67 14 72 27 C65 36 70 50 62 60 C64 72 52 82 39 78 C32 68 23 63 26 50 C20 39 25 28 33 23 C32 16 35 11 39 9 Z" },
        { slug: "canada", name: "Canada", region: "North America", path: "M8 27 C21 12 42 19 56 16 C71 13 89 20 93 36 C84 43 86 55 73 59 C62 55 50 63 40 57 C29 64 15 55 11 43 C6 39 5 32 8 27 Z" },
        { slug: "spain", name: "Spain", region: "Europe", path: "M22 30 C35 18 57 19 75 31 C74 46 65 63 47 68 C32 64 20 52 22 30 Z M70 66 C78 67 82 74 78 81 C70 81 66 74 70 66 Z" },
        { slug: "norway", name: "Norway", region: "Europe", path: "M51 2 C63 8 71 18 67 31 C59 37 58 50 48 56 C42 67 34 79 22 91 C16 84 23 72 29 62 C36 51 34 40 42 29 C37 17 42 7 51 2 Z" },
        { slug: "argentina", name: "Argentina", region: "South America", path: "M46 5 C57 13 61 29 55 44 C60 57 55 73 48 88 C40 96 31 93 34 82 C39 70 36 56 39 44 C30 29 34 12 46 5 Z" },
        { slug: "south-africa", name: "South Africa", region: "Africa", path: "M25 38 C40 25 63 27 78 40 C77 57 63 74 45 78 C31 72 20 58 25 38 Z" },
        { slug: "egypt", name: "Egypt", region: "Africa", path: "M22 22 L75 22 L79 63 L51 76 L25 65 Z M76 23 C83 31 86 42 83 55" },
        { slug: "china", name: "China", region: "Asia", path: "M18 37 C28 20 52 14 70 24 C82 26 91 38 88 51 C76 56 72 70 57 73 C45 66 31 75 20 64 C25 53 11 49 18 37 Z" },
        { slug: "russia", name: "Russia", region: "Europe and Asia", path: "M5 31 C24 16 50 18 69 24 C83 18 96 27 94 43 C83 46 78 58 65 55 C51 60 33 57 22 52 C14 55 6 47 5 31 Z" },
        { slug: "sweden", name: "Sweden", region: "Europe", path: "M49 4 C60 12 63 27 57 41 C63 55 58 76 45 94 C34 88 36 70 39 56 C32 43 35 27 42 18 C39 10 43 5 49 4 Z" },
        { slug: "greece", name: "Greece", region: "Europe", path: "M35 18 C51 15 67 24 69 40 C61 46 50 45 43 52 C49 61 45 74 34 81 C25 74 29 59 35 51 C24 44 24 26 35 18 Z M62 58 C70 60 74 67 70 75 C61 75 57 65 62 58 Z" },
        { slug: "turkey", name: "Turkey", region: "Europe and Asia", path: "M13 42 C28 28 55 28 77 36 C88 40 90 51 80 58 C61 54 42 65 24 58 C14 55 9 49 13 42 Z" },
        { slug: "indonesia", name: "Indonesia", region: "Asia", path: "M7 49 C22 43 38 44 51 49 C43 56 25 57 7 49 Z M52 56 C65 50 80 52 93 59 C81 67 63 65 52 56 Z M22 68 C34 65 47 68 55 75 C41 80 29 77 22 68 Z" },
        { slug: "new-zealand", name: "New Zealand", region: "Oceania", path: "M54 23 C65 31 64 45 55 55 C47 49 45 33 54 23 Z M39 57 C50 65 48 81 35 89 C27 80 29 64 39 57 Z" },
        { slug: "ireland", name: "Ireland", region: "Europe", path: "M43 12 C60 17 69 32 65 50 C58 67 43 78 27 70 C17 56 20 34 31 22 C35 17 39 13 43 12 Z" }
      ]
    },
    states: {
      label: "US States",
      path: "/draw-us-states/",
      title: "Draw US states from memory",
      subtitle: "State shapes for people who think they know the map.",
      pool: [
        { slug: "california", name: "California", region: "United States", path: "M34 5 C46 13 50 30 47 45 C55 58 54 76 44 94 C31 82 22 64 22 45 C16 32 22 15 34 5 Z" },
        { slug: "texas", name: "Texas", region: "United States", path: "M18 27 C34 20 58 20 76 30 L83 52 C73 59 66 71 61 87 C47 78 37 66 25 63 C17 55 12 41 18 27 Z" },
        { slug: "florida", name: "Florida", region: "United States", path: "M19 34 C34 27 56 29 72 39 C75 53 88 65 84 84 C72 84 65 70 62 58 C47 58 31 52 19 46 Z" },
        { slug: "new-york", name: "New York", region: "United States", path: "M19 43 C33 31 58 26 78 34 C72 47 57 53 40 53 C33 61 24 58 19 43 Z M70 58 C77 60 80 66 76 72 C69 72 66 64 70 58 Z" },
        { slug: "alaska", name: "Alaska", region: "United States", path: "M16 36 C31 16 58 15 78 28 C82 42 74 54 58 58 C46 67 35 80 18 79 C28 65 24 50 16 36 Z" },
        { slug: "hawaii", name: "Hawaii", region: "United States", path: "M25 38 C32 35 38 38 40 44 C34 48 27 45 25 38 Z M45 49 C53 46 61 51 61 59 C52 61 45 57 45 49 Z M66 62 C75 60 82 66 81 75 C72 77 65 71 66 62 Z" },
        { slug: "colorado", name: "Colorado", region: "United States", path: "M18 25 L80 23 L82 73 L20 75 Z" },
        { slug: "michigan", name: "Michigan", region: "United States", path: "M38 12 C54 18 60 33 52 48 C40 43 32 27 38 12 Z M58 46 C73 51 79 66 70 82 C55 76 50 59 58 46 Z" },
        { slug: "washington", name: "Washington", region: "United States", path: "M16 26 C32 18 57 21 80 28 L76 63 C55 61 32 66 18 56 Z" },
        { slug: "arizona", name: "Arizona", region: "United States", path: "M27 18 L73 23 L69 76 L35 84 L23 67 Z" }
      ]
    },
    flags: {
      label: "Flags",
      path: "/draw-flags-from-memory/",
      title: "Draw flags from memory",
      subtitle: "Flag layouts as a fast visual memory test.",
      pool: [
        { slug: "japan", name: "Japan flag", region: "Flags", path: "M18 25 L82 25 L82 75 L18 75 Z M50 36 A14 14 0 1 0 50.1 36 Z" },
        { slug: "switzerland", name: "Switzerland flag", region: "Flags", path: "M24 18 L76 18 L76 82 L24 82 Z M43 32 L57 32 L57 43 L68 43 L68 57 L57 57 L57 68 L43 68 L43 57 L32 57 L32 43 L43 43 Z" },
        { slug: "france", name: "France flag", region: "Flags", path: "M20 25 L80 25 L80 75 L20 75 Z M40 25 L40 75 M60 25 L60 75" },
        { slug: "canada", name: "Canada flag", region: "Flags", path: "M18 24 L82 24 L82 76 L18 76 Z M34 24 L34 76 M66 24 L66 76 M50 34 L55 47 L67 45 L58 54 L61 66 L50 59 L39 66 L42 54 L33 45 L45 47 Z" },
        { slug: "united-kingdom", name: "United Kingdom flag", region: "Flags", path: "M16 24 L84 24 L84 76 L16 76 Z M16 24 L84 76 M84 24 L16 76 M50 24 L50 76 M16 50 L84 50" },
        { slug: "brazil", name: "Brazil flag", region: "Flags", path: "M18 25 L82 25 L82 75 L18 75 Z M50 33 L73 50 L50 67 L27 50 Z M50 39 A11 11 0 1 0 50.1 39 Z" },
        { slug: "united-states", name: "United States flag", region: "Flags", path: "M16 24 L84 24 L84 76 L16 76 Z M16 32 L84 32 M16 40 L84 40 M16 48 L84 48 M16 56 L84 56 M16 64 L84 64 M16 72 L84 72 M16 24 L48 24 L48 52 L16 52" },
        { slug: "south-korea", name: "South Korea flag", region: "Flags", path: "M18 25 L82 25 L82 75 L18 75 Z M50 38 A12 12 0 1 0 50.1 38 Z M31 35 L38 29 M34 38 L41 32 M62 68 L69 61 M59 65 L66 58" }
      ]
    },
    outline: {
      label: "Outline Quiz",
      path: "/country-outline-quiz/",
      title: "Country outline quiz",
      subtitle: "Silhouettes, proportions, and border memory.",
      pool: []
    }
  };

  if (Array.isArray(window.COUNTRY_DRAW_SHAPES) && window.COUNTRY_DRAW_SHAPES.length > modes.world.pool.length) {
    const originalBySlug = Object.fromEntries(modes.world.pool.map(function (item) {
      return [item.slug, item];
    }));
    modes.world.pool = window.COUNTRY_DRAW_SHAPES.map(function (item) {
      return Object.assign({}, item, {
        region: originalBySlug[item.slug]?.region || item.region
      });
    });
  }

  modes.outline.pool = modes.world.pool.slice();

  const root = document.querySelector("[data-country-draw-app]");
  if (!root) return;

  const requestedMode = root.dataset.mode || "world";
  let modeKey = modes[requestedMode] ? requestedMode : "world";
  let currentMode = modes[modeKey];
  let targetSlug = root.dataset.target || "";
  let target = findTarget(modeKey, targetSlug) || dailyTarget(currentMode.pool);
  let strokes = [];
  let isDrawing = false;
  let canvas;
  let ctx;
  let score = null;
  let scoreDetails = null;
  let revealed = false;
  let notice = "";
  let answered = false;
  let quizScore = { correct: 0, total: 0 };
  let drawingStarted = false;
  let stats = loadStats();
  let isDailyRound = !targetSlug && modeKey !== "outline";

  render();
  track("game_start", {
    game_mode: modeKey,
    target_slug: target.slug
  });

  function render() {
    currentMode = modes[modeKey];
    root.innerHTML = modeKey === "outline" ? outlineTemplate() : drawingTemplate();
    bindCommon();
    if (modeKey === "outline") {
      bindOutline();
    } else {
      bindDrawing();
    }
  }

  function drawingTemplate() {
    const modeButtons = Object.keys(modes).map(function (key) {
      const mode = modes[key];
      return `<a class="mode-pill ${key === modeKey ? "is-active" : ""}" href="${mode.path}" data-mode-switch="${key}">${mode.label}</a>`;
    }).join("");
    const modeStats = stats[modeKey] || {};
    const dailyComplete = Boolean(modeStats.dailyScores?.[todayKey()]);

    return `
      <section class="app-shell" aria-label="Country Draw game">
        <header class="topbar">
          <a class="brand" href="/" aria-label="Country Draw home">
            <span class="brand-mark" aria-hidden="true"></span>
            <span>Country Draw</span>
          </a>
          <nav class="mode-nav" aria-label="Game modes">${modeButtons}</nav>
        </header>
        <div class="game-grid">
          <aside class="challenge-panel">
            <p class="kicker">${currentMode.label}</p>
            <h2>${currentMode.title}</h2>
            <p>${currentMode.subtitle}</p>
            <div class="target-card">
              <span class="target-label">${isDailyRound ? "Today's challenge" : "Current shape"}</span>
              <strong>${escapeHtml(target.name)}</strong>
              <span>${escapeHtml(target.region)}</span>
            </div>
            <button class="daily-challenge-button ${isDailyRound ? "is-active" : ""}" type="button" data-action="daily">
              ${dailyComplete ? "Today's score saved" : "Play today's challenge"}
            </button>
            <label class="target-search">
              <span>Find a ${modeKey === "flags" ? "flag" : modeKey === "states" ? "state" : "country"}</span>
              <input type="search" inputmode="search" autocomplete="off" placeholder="Search ${currentMode.pool.length} shapes" data-target-search>
            </label>
            <div class="challenge-count">${currentMode.pool.length} shapes available</div>
            <div class="mini-list" data-target-list aria-label="Available challenges">
              ${targetButtons(currentMode.pool, target.slug)}
            </div>
          </aside>
          <section class="board-panel">
            <div class="board-head">
              <div>
                <p class="kicker">Draw from memory</p>
                <h1>${escapeHtml(target.name)}</h1>
              </div>
              <div class="score-chip" aria-live="polite">${score === null ? revealed ? "Reference" : "No score yet" : score + "/100"}</div>
            </div>
            <div class="draw-board ${score === null && !revealed ? "" : "has-result"}">
              <svg class="target-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <path id="target-path" d="${target.path}"></path>
              </svg>
              <canvas id="draw-canvas" aria-label="Drawing canvas"></canvas>
            </div>
            <p class="board-message" aria-live="polite">${escapeHtml(notice)}</p>
            <div class="tool-row" aria-label="Drawing controls">
              <button class="primary-action" data-action="submit">Submit drawing</button>
              <button data-action="undo" ${strokes.length && score === null && !revealed ? "" : "disabled"}>Undo stroke</button>
              <button data-action="clear">${score === null && !revealed ? "Clear" : "Try again"}</button>
              <button data-action="new">New shape</button>
              <button data-action="reveal">Reveal</button>
            </div>
          </section>
          <aside class="result-panel">
            <p class="kicker">Result</p>
            <h2>${score === null ? revealed ? "Study the outline" : "Draw first" : resultLabel(score)}</h2>
            <p>${score === null ? revealed ? `Trace the major turns of ${escapeHtml(target.name)}, then choose Try again.` : "Awaiting your first outline." : resultCopy(score, target.name)}</p>
            ${scoreBreakdownTemplate()}
            <div class="metric-stack">
              <div><span>Mode</span><strong>${currentMode.label}</strong></div>
              <div><span>Target</span><strong>${escapeHtml(target.name)}</strong></div>
              <div><span>Personal best</span><strong>${stats[modeKey]?.best || 0}/100</strong></div>
              <div><span>Completed</span><strong>${stats[modeKey]?.rounds || 0}</strong></div>
              <div><span>Daily streak</span><strong>${stats[modeKey]?.dailyStreak || 0}</strong></div>
            </div>
            <button class="share-button" data-action="share" ${score === null ? "disabled" : ""}>Share result</button>
          </aside>
        </div>
      </section>
    `;
  }

  function outlineTemplate() {
    const options = optionSet(target, currentMode.pool);
    return `
      <section class="app-shell" aria-label="Country outline quiz">
        <header class="topbar">
          <a class="brand" href="/" aria-label="Country Draw home">
            <span class="brand-mark" aria-hidden="true"></span>
            <span>Country Draw</span>
          </a>
          <nav class="mode-nav" aria-label="Game modes">
            ${Object.keys(modes).map(function (key) {
              const mode = modes[key];
              return `<a class="mode-pill ${key === modeKey ? "is-active" : ""}" href="${mode.path}" data-mode-switch="${key}">${mode.label}</a>`;
            }).join("")}
          </nav>
        </header>
        <div class="quiz-grid">
          <section class="quiz-stage">
            <div class="board-head">
              <div>
                <p class="kicker">Country outline quiz</p>
                <h1>Guess the silhouette</h1>
              </div>
              <div class="score-chip" data-quiz-score aria-live="polite">${quizScore.correct}/${quizScore.total}</div>
            </div>
            <div class="silhouette-card">
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <path d="${target.path}"></path>
              </svg>
            </div>
            <div class="answer-grid">
              ${options.map(function (item) {
                return `<button data-answer="${item.slug}">${escapeHtml(item.name)}</button>`;
              }).join("")}
            </div>
            <div class="tool-row">
              <button data-action="new">Skip / next outline</button>
              <a class="ghost-link" href="/draw-country/">Switch to drawing</a>
            </div>
          </section>
          <aside class="result-panel">
            <p class="kicker">Streak</p>
            <h2 data-quiz-heading>${answered ? "Keep going" : "Pick a country"}</h2>
            <p data-quiz-copy aria-live="polite">${answered ? "The next silhouette is ready." : "Silhouette recognition mode."}</p>
            <div class="metric-stack">
              <div><span>Correct</span><strong data-quiz-correct>${quizScore.correct}</strong></div>
              <div><span>Attempts</span><strong data-quiz-total>${quizScore.total}</strong></div>
              <div><span>Pool</span><strong>${currentMode.pool.length} outlines</strong></div>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  function bindCommon() {
    root.querySelectorAll("[data-mode-switch]").forEach(function (link) {
      link.addEventListener("click", function () {
        track("mode_changed", {
          game_mode: link.dataset.modeSwitch,
          target_slug: target.slug
        });
      });
    });
  }

  function bindDrawing() {
    canvas = root.querySelector("#draw-canvas");
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    canvas.addEventListener("pointerdown", startStroke);
    canvas.addEventListener("pointermove", moveStroke);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", endStroke);

    const targetList = root.querySelector("[data-target-list]");
    const search = root.querySelector("[data-target-search]");
    targetList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-target-pick]");
      if (!button) return;
      pickTarget(button.dataset.targetPick, "challenge_list");
    });
    search.addEventListener("input", function () {
      const query = search.value.trim().toLowerCase();
      const matches = query
        ? currentMode.pool.filter(function (item) { return item.name.toLowerCase().includes(query); })
        : currentMode.pool;
      targetList.innerHTML = targetButtons(matches, target.slug);
    });

    root.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.dataset.action;
        if (action === "submit") submitDrawing();
        if (action === "undo") undoStroke();
        if (action === "clear") clearDrawing();
        if (action === "new") nextTarget();
        if (action === "reveal") revealTarget();
        if (action === "share") copyResult();
        if (action === "daily") startDailyChallenge();
      });
    });
  }

  function bindOutline() {
    root.querySelectorAll("[data-answer]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        quizScore.total += 1;
        const correct = button.dataset.answer === target.slug;
        if (correct) quizScore.correct += 1;
        track("quiz_answered", {
          game_mode: modeKey,
          target_slug: target.slug,
          answer_slug: button.dataset.answer,
          is_correct: correct
        });
        button.classList.add(correct ? "is-correct" : "is-wrong");
        root.querySelectorAll("[data-answer]").forEach(function (option) {
          if (option.dataset.answer === target.slug) option.classList.add("is-correct");
          option.disabled = true;
        });
        root.querySelector("[data-quiz-score]").textContent = `${quizScore.correct}/${quizScore.total}`;
        root.querySelector("[data-quiz-correct]").textContent = quizScore.correct;
        root.querySelector("[data-quiz-total]").textContent = quizScore.total;
        root.querySelector("[data-quiz-heading]").textContent = correct ? "Correct" : `It was ${target.name}`;
        root.querySelector("[data-quiz-copy]").textContent = correct
          ? `You recognized ${target.name}. Draw it next to reinforce the shape.`
          : `Compare the outline with ${target.name}, then try another silhouette.`;
        const nextButton = root.querySelector("[data-action='new']");
        if (nextButton) nextButton.textContent = "Next outline";
      });
    });

    const next = root.querySelector("[data-action='new']");
    if (next) {
      next.addEventListener("click", function () {
        nextTarget();
      });
    }
  }

  function startStroke(event) {
    isDrawing = true;
    if (!drawingStarted) {
      drawingStarted = true;
      track("drawing_started", {
        game_mode: modeKey,
        target_slug: target.slug
      });
    }
    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    strokes.push([point]);
    drawLine(point, point);
  }

  function moveStroke(event) {
    if (!isDrawing) return;
    const point = getPoint(event);
    const stroke = strokes[strokes.length - 1];
    const prev = stroke[stroke.length - 1] || point;
    stroke.push(point);
    drawLine(prev, point);
  }

  function endStroke() {
    isDrawing = false;
    const undo = root.querySelector("[data-action='undo']");
    if (undo) undo.disabled = strokes.length === 0;
  }

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function drawLine(a, b) {
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#173f58";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }

  function redraw() {
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokes.forEach(function (stroke) {
      for (let i = 1; i < stroke.length; i += 1) {
        drawLine(stroke[i - 1], stroke[i]);
      }
    });
  }

  function clearDrawing() {
    strokes = [];
    score = null;
    scoreDetails = null;
    revealed = false;
    notice = "";
    drawingStarted = false;
    track("drawing_cleared", {
      game_mode: modeKey,
      target_slug: target.slug
    });
    redraw();
    render();
  }

  function undoStroke() {
    if (!strokes.length || score !== null || revealed) return;
    strokes.pop();
    notice = strokes.length ? "Removed the last stroke." : "Drawing cleared.";
    redraw();
    const message = root.querySelector(".board-message");
    if (message) message.textContent = notice;
    const button = root.querySelector("[data-action='undo']");
    if (button) button.disabled = strokes.length === 0;
    track("drawing_undo", {
      game_mode: modeKey,
      target_slug: target.slug,
      strokes_remaining: strokes.length
    });
  }

  function revealTarget() {
    revealed = true;
    notice = `Reference shown for ${target.name}. Choose Try again to redraw it from memory.`;
    track("outline_revealed", {
      game_mode: modeKey,
      target_slug: target.slug,
      score: score === null ? -1 : score
    });
    render();
  }

  function submitDrawing() {
    const points = strokes.flat();
    if (points.length < 10) {
      notice = "Draw a complete outline before submitting. A quick tap or short line cannot be scored.";
      const message = root.querySelector(".board-message");
      if (message) message.textContent = notice;
      return;
    }

    const user = normalizePoints(points);
    const path = root.querySelector("#target-path");
    const targetPoints = normalizePoints(samplePath(path, 180));
    const userDistance = averageNearest(user, targetPoints);
    const referenceDistance = averageNearest(targetPoints, user);
    const distance = (userDistance + referenceDistance) / 2;
    const aspectDifference = Math.abs(aspect(points) - aspect(targetPoints));
    const aspectPenalty = aspectDifference * 8;
    const raw = 100 - distance * 2.15 - aspectPenalty;
    score = Math.max(0, Math.min(100, Math.round(raw)));
    scoreDetails = {
      edgeMatch: qualityScore(distance, 2.15),
      coverage: qualityScore(referenceDistance, 3),
      precision: qualityScore(userDistance, 3),
      proportion: Math.max(0, Math.round(100 - aspectDifference * 24))
    };
    revealed = true;
    notice = `Compared ${points.length} drawing points with the ${target.name} reference outline.`;
    stats[modeKey] = stats[modeKey] || { rounds: 0, best: 0 };
    stats[modeKey].rounds += 1;
    stats[modeKey].best = Math.max(stats[modeKey].best, score);
    if (isDailyRound) recordDailyCompletion(modeKey, score);
    saveStats(stats);
    track("drawing_submitted", {
      game_mode: modeKey,
      target_slug: target.slug,
      score: score,
      point_count: points.length
    });
    render();
  }

  function samplePath(path, count) {
    const total = path.getTotalLength();
    const points = [];
    for (let i = 0; i < count; i += 1) {
      const p = path.getPointAtLength((total * i) / Math.max(1, count - 1));
      points.push({ x: p.x, y: p.y });
    }
    return points;
  }

  function normalizePoints(points) {
    const box = bounds(points);
    const scale = 76 / Math.max(box.width || 1, box.height || 1);
    return points.map(function (p) {
      return {
        x: (p.x - box.cx) * scale + 50,
        y: (p.y - box.cy) * scale + 50
      };
    });
  }

  function averageNearest(a, b) {
    const sampled = resample(a, 130);
    let total = 0;
    sampled.forEach(function (p) {
      let best = Infinity;
      b.forEach(function (q) {
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < best) best = d;
      });
      total += best;
    });
    return total / Math.max(1, sampled.length);
  }

  function resample(points, limit) {
    if (points.length <= limit) return points;
    const step = points.length / limit;
    const out = [];
    for (let i = 0; i < limit; i += 1) {
      out.push(points[Math.floor(i * step)]);
    }
    return out;
  }

  function aspect(points) {
    const box = bounds(points);
    return box.width / Math.max(1, box.height);
  }

  function bounds(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach(function (p) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const width = maxX - minX;
    const height = maxY - minY;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      cx: minX + width / 2,
      cy: minY + height / 2
    };
  }

  function nextTarget() {
    const pool = currentMode.pool;
    if (pool.length > 1) {
      let next = target;
      while (next.slug === target.slug) {
        next = pool[Math.floor(Math.random() * pool.length)];
      }
      target = next;
    }
    targetSlug = target.slug;
    score = null;
    scoreDetails = null;
    revealed = false;
    notice = "";
    isDailyRound = false;
    strokes = [];
    answered = false;
    drawingStarted = false;
    track("target_changed", {
      game_mode: modeKey,
      target_slug: target.slug,
      change_source: "next_button"
    });
    render();
  }

  function copyResult() {
    if (score === null) return;
    const streak = stats[modeKey]?.dailyStreak || 0;
    const text = [
      `I scored ${score}/100 drawing ${target.name} on Country Draw.`,
      isDailyRound ? `Daily streak: ${streak}` : "",
      location.href
    ].filter(Boolean).join("\n");
    const button = root.querySelector("[data-action='share']");
    if (typeof navigator.share === "function") {
      navigator.share({
        title: `Country Draw: ${target.name}`,
        text
      }).then(function () {
        trackShare("native");
        if (button) button.textContent = "Shared";
      }).catch(function () {
        copyText(text);
        trackShare("clipboard");
        if (button) button.textContent = "Copied";
      });
    } else {
      copyText(text);
      trackShare("clipboard");
      if (button) button.textContent = "Copied";
    }
  }

  function trackShare(method) {
    track("result_shared", {
      game_mode: modeKey,
      target_slug: target.slug,
      score: score,
      share_method: method
    });
  }

  function resultLabel(value) {
    if (value >= 86) return "Cartographer level";
    if (value >= 68) return "Strong outline";
    if (value >= 42) return "Recognizable";
    if (value > 0) return "Keep practicing";
    return "Try a larger sketch";
  }

  function resultCopy(value, name) {
    if (value >= 86) return `Your ${name} outline is close enough to brag about.`;
    if (value >= 68) return `The main proportions of ${name} are working.`;
    if (value >= 42) return `${name} is visible, but the edges drifted.`;
    if (value > 0) return `Use the reveal as a memory anchor, then try ${name} again.`;
    return `Make a bigger sketch before submitting ${name}.`;
  }

  function scoreBreakdownTemplate() {
    if (!scoreDetails) return "";
    const rows = [
      ["Edge match", scoreDetails.edgeMatch],
      ["Coverage", scoreDetails.coverage],
      ["Stroke precision", scoreDetails.precision],
      ["Proportion", scoreDetails.proportion]
    ];
    return `<div class="score-breakdown" aria-label="Score breakdown">
      ${rows.map(function ([label, value]) {
        return `<div class="score-detail">
          <div><span>${label}</span><strong>${value}%</strong></div>
          <div class="score-track"><span style="width:${value}%"></span></div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function qualityScore(distance, weight) {
    return Math.max(0, Math.min(100, Math.round(100 - distance * weight)));
  }

  function startDailyChallenge() {
    const daily = dailyTarget(currentMode.pool);
    pickTarget(daily.slug, "daily_challenge");
  }

  function dailyTarget(pool) {
    const stamp = todayKey().replace(/-/g, "");
    const index = Number(stamp) % pool.length;
    return pool[index];
  }

  function todayKey(date = new Date()) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function recordDailyCompletion(key, value) {
    const modeStats = stats[key] = stats[key] || { rounds: 0, best: 0 };
    modeStats.dailyScores = modeStats.dailyScores || {};
    const today = todayKey();
    if (Object.prototype.hasOwnProperty.call(modeStats.dailyScores, today)) return;
    modeStats.dailyScores[today] = value;

    const dates = Object.keys(modeStats.dailyScores).sort();
    while (dates.length > 90) {
      delete modeStats.dailyScores[dates.shift()];
    }

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    while (Object.prototype.hasOwnProperty.call(modeStats.dailyScores, todayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    modeStats.dailyStreak = streak;
  }

  function findTarget(key, slug) {
    if (!slug || !modes[key]) return null;
    return modes[key].pool.find(function (item) { return item.slug === slug; }) || null;
  }

  function optionSet(answer, pool) {
    const others = pool.filter(function (item) { return item.slug !== answer.slug; });
    const offset = answer.slug.length % others.length;
    const options = [answer].concat(others.slice(offset, offset + 3));
    while (options.length < 4) options.push(others[options.length]);
    return options.sort(function (a, b) {
      return (a.slug.charCodeAt(0) + a.name.length) - (b.slug.charCodeAt(0) + b.name.length);
    });
  }

  function targetButtons(pool, selectedSlug) {
    const visible = pool.slice(0, 12);
    if (!visible.length) {
      return `<p class="empty-search">No matching shape. Try another spelling.</p>`;
    }
    return visible.map(function (item) {
      return `<button class="${item.slug === selectedSlug ? "is-selected" : ""}" data-target-pick="${item.slug}">${escapeHtml(item.name)}</button>`;
    }).join("");
  }

  function pickTarget(slug, source) {
    const picked = findTarget(modeKey, slug);
    if (!picked) return;
    target = picked;
    targetSlug = picked.slug;
    score = null;
    scoreDetails = null;
    revealed = false;
    notice = "";
    isDailyRound = source === "daily_challenge";
    strokes = [];
    drawingStarted = false;
    track("target_changed", {
      game_mode: modeKey,
      target_slug: target.slug,
      change_source: source
    });
    render();
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem("country-draw-stats") || "{}");
    } catch {
      return {};
    }
  }

  function saveStats(value) {
    try {
      localStorage.setItem("country-draw-stats", JSON.stringify(value));
    } catch {
      // The game remains fully usable when storage is unavailable.
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function track(eventName, parameters) {
    if (typeof window.countryDrawTrack === "function") {
      window.countryDrawTrack(eventName, parameters);
    }
  }
})();
