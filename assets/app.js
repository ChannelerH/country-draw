(async function () {
  "use strict";

  const root = document.querySelector("[data-country-draw-app]");
  if (!root) return;

  const requestedMode = root.dataset.mode || "world";
  if (requestedMode === "flags" || requestedMode === "outline") {
    await loadScript("/assets/legacy-app.js");
    return;
  }

  root.innerHTML = `
    <section class="map-game-loading" aria-live="polite">
      <span class="map-loading-mark" aria-hidden="true"></span>
      <strong>Loading the map...</strong>
    </section>
  `;

  try {
    loadStyle("/assets/vendor/maplibre-gl.css");
    await Promise.all([
      loadScript("/assets/vendor/maplibre-gl.js", () => window.maplibregl),
      loadScript("/assets/vendor/turf.min.js", () => window.turf),
      loadScript("/assets/map-data.js", () => window.COUNTRY_DRAW_MAP_DATA)
    ]);
    new CountryMapGame(root, requestedMode);
  } catch (error) {
    console.error(error);
    root.innerHTML = `
      <section class="map-game-error">
        <h2>The map could not load</h2>
        <p>Refresh the page to try again. Your game history is stored on this device.</p>
        <button type="button" onclick="location.reload()">Reload map</button>
      </section>
    `;
  }

  function CountryMapGame(container, pageMode) {
    const regionConfig = {
      world: { label: "World", noun: "country" },
      us: { label: "US States", noun: "state" },
      canada: { label: "Canada", noun: "province or territory" },
      australia: { label: "Australia", noun: "state or territory" },
      uk: { label: "UK", noun: "country" }
    };
    const emptyCollection = () => ({ type: "FeatureCollection", features: [] });
    const mapData = window.COUNTRY_DRAW_MAP_DATA;
    const dedicatedSlug = container.dataset.target || "";

    let regionKey = pageMode === "states" ? "us" : "world";
    let gameMode = localStorage.getItem("country-draw-map-mode") === "capital" ? "capital" : "cover";
    let challengeType = dedicatedSlug ? "practice" : "daily";
    let target = findFeature(regionKey, dedicatedSlug) || dailyFeature(regionKey, gameMode);
    let displayTarget = unwrapFeature(target);
    let map;
    let canvas;
    let context;
    let resizeObserver;
    let drawingPaths = [];
    let activePath = [];
    let drawing = false;
    let interactionMode = "draw";
    let result = null;
    let capitalMarker = null;
    let stats = loadStats();

    renderShell();
    initializeMap();

    function renderShell() {
      container.innerHTML = `
        <section class="map-game-shell" aria-label="Country Draw map game">
          <header class="map-game-header">
            <a class="map-brand" href="/" aria-label="Country Draw home">
              <span class="map-brand-mark" aria-hidden="true"></span>
              <span>Country Draw</span>
            </a>
            <nav class="region-tabs" aria-label="Challenge region">
              ${Object.entries(regionConfig).map(([key, region]) => `
                <button type="button" data-region="${key}" class="${key === regionKey ? "is-active" : ""}">
                  ${region.label}
                </button>
              `).join("")}
            </nav>
          </header>

          <div class="map-game-workspace">
            <section class="map-stage" aria-label="Drawing map">
              <div id="country-map"></div>
              <canvas class="map-drawing-canvas" aria-label="Draw the missing border"></canvas>

              <section class="map-result-overlay" data-map-result hidden aria-label="Drawing result" aria-live="polite">
                <button type="button" class="map-result-close" data-action="dismiss-result" title="Close result" aria-label="Close result">&times;</button>
                <div class="map-result-row is-accuracy">
                  <strong>Accuracy</strong>
                  <div class="map-result-track"><span data-map-score-fill></span></div>
                  <b data-map-score>0%</b>
                </div>
                <div class="map-result-divider"></div>
                <div class="map-result-metrics">
                  ${mapScoreRow("Matched", "matched", "green")}
                  ${mapScoreRow("Missed", "missed", "red")}
                  ${mapScoreRow("Extra", "extra", "gold")}
                </div>
                <div class="map-result-actions">
                  <button type="button" data-action="map-retry">Try again</button>
                  <button type="button" data-action="map-share">Share</button>
                </div>
              </section>

              <div class="map-toolbox" aria-label="Map tools">
                <div class="map-tool-segment">
                  <button type="button" data-interaction="draw" class="is-active" title="Draw on the map" aria-label="Draw on the map">Draw</button>
                  <button type="button" data-interaction="move" title="Move and zoom the map" aria-label="Move and zoom the map">Move</button>
                </div>
                <button type="button" data-action="undo" title="Undo last stroke" aria-label="Undo last stroke" disabled>Undo</button>
                <button type="button" data-action="clear" title="Clear drawing" aria-label="Clear drawing" disabled>Clear</button>
              </div>

              <div class="map-status" data-map-status aria-live="polite">Preparing today's challenge...</div>
            </section>

            <aside class="game-control-panel">
              <div class="challenge-heading">
                <div>
                  <p class="map-kicker" data-challenge-label>Daily challenge</p>
                  <h1 data-challenge-title>Draw the hidden ${regionConfig[regionKey].noun}</h1>
                </div>
                <span class="challenge-number" data-challenge-number></span>
              </div>

              <div class="game-mode-control">
                <span>Clue mode</span>
                <div class="mode-segment" role="group" aria-label="Clue mode">
                  <button type="button" data-game-mode="cover" class="${gameMode === "cover" ? "is-active" : ""}">Cover</button>
                  <button type="button" data-game-mode="capital" class="${gameMode === "capital" ? "is-active" : ""}">Capital</button>
                </div>
              </div>

              <div class="clue-panel">
                <span data-clue-eyebrow>${gameMode === "cover" ? "Map clue" : "Location clue"}</span>
                <strong data-clue-title>${gameMode === "cover" ? "The target area is covered" : "The capital is marked"}</strong>
                <p data-clue-copy>Trace the missing border directly on the map.</p>
              </div>

              <div class="result-summary" data-result hidden>
                <div class="result-score">
                  <span>Accuracy</span>
                  <strong data-score>0%</strong>
                </div>
                <h2 data-result-name></h2>
                <div class="area-scores">
                  ${scoreRow("Matched", "matched", "green")}
                  ${scoreRow("Missed", "missed", "red")}
                  ${scoreRow("Extra", "extra", "gold")}
                </div>
              </div>

              <div class="primary-controls">
                <button type="button" class="map-primary-action" data-action="submit">Submit drawing</button>
                <button type="button" data-action="share" hidden>Share result</button>
              </div>

              <div class="challenge-switcher">
                <button type="button" data-action="daily" class="${challengeType === "daily" ? "is-active" : ""}">Today's challenge</button>
                <label>
                  <span>Practice a specific ${regionConfig[regionKey].noun}</span>
                  <select data-practice-select></select>
                </label>
                <button type="button" data-action="practice">Start practice</button>
              </div>

              <div class="map-stat-grid" aria-label="Game statistics">
                <div><span>Games</span><strong data-stat="games">0</strong></div>
                <div><span>Best</span><strong data-stat="best">0%</strong></div>
                <div><span>Average</span><strong data-stat="average">0%</strong></div>
                <div><span>Daily streak</span><strong data-stat="streak">0</strong></div>
              </div>
            </aside>
          </div>
        </section>
      `;

      canvas = container.querySelector(".map-drawing-canvas");
      context = canvas.getContext("2d");
      bindControls();
      populatePracticeSelect();
      updateStatsView();
    }

    function initializeMap() {
      map = new window.maplibregl.Map({
        container: "country-map",
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [0, 20],
        zoom: 1.5,
        minZoom: 1,
        maxZoom: 10,
        pitchWithRotate: false,
        dragRotate: false,
        renderWorldCopies: false,
        attributionControl: true
      });
      map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", function () {
        softenBaseMap();
        addGameLayers();
        resizeCanvas();
        resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(container.querySelector(".map-stage"));
        map.on("move", redrawPaths);
        map.on("resize", redrawPaths);
        startChallenge(target, challengeType);
      });
      map.on("error", function (event) {
        if (event?.error?.message) console.warn("Map resource error:", event.error.message);
      });
    }

    function softenBaseMap() {
      const layers = map.getStyle().layers || [];
      layers.forEach((layer) => {
        if (layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      });
    }

    function addGameLayers() {
      ["mask", "target", "overlap", "missed", "extra"].forEach((id) => {
        map.addSource(id, { type: "geojson", data: emptyCollection() });
      });

      map.addLayer({
        id: "country-mask",
        type: "fill",
        source: "mask",
        paint: { "fill-color": "#d7ddd8", "fill-opacity": 0.98 }
      });
      map.addLayer({
        id: "country-mask-outline",
        type: "line",
        source: "mask",
        paint: { "line-color": "#6f7976", "line-width": 2, "line-dasharray": [2, 2] }
      });
      map.addLayer(resultLayer("missed", "#d64b40"));
      map.addLayer(resultLayer("extra", "#dda02f"));
      map.addLayer(resultLayer("overlap", "#23835e"));
      map.addLayer({
        id: "target-outline",
        type: "line",
        source: "target",
        paint: { "line-color": "#142f3d", "line-width": 3, "line-dasharray": [2, 1.5] }
      });
    }

    function resultLayer(id, color) {
      return {
        id: `result-${id}`,
        type: "fill",
        source: id,
        paint: { "fill-color": color, "fill-opacity": 0.58 }
      };
    }

    function bindControls() {
      container.querySelectorAll("[data-region]").forEach((button) => {
        button.addEventListener("click", function () {
          changeRegion(button.dataset.region);
        });
      });
      container.querySelectorAll("[data-game-mode]").forEach((button) => {
        button.addEventListener("click", function () {
          changeGameMode(button.dataset.gameMode);
        });
      });
      container.querySelectorAll("[data-interaction]").forEach((button) => {
        button.addEventListener("click", function () {
          setInteractionMode(button.dataset.interaction);
        });
      });
      container.querySelector("[data-action='undo']").addEventListener("click", undoPath);
      container.querySelector("[data-action='clear']").addEventListener("click", clearDrawing);
      container.querySelector("[data-action='submit']").addEventListener("click", submitDrawing);
      container.querySelector("[data-action='share']").addEventListener("click", shareResult);
      container.querySelector("[data-action='dismiss-result']").addEventListener("click", dismissMapResult);
      container.querySelector("[data-action='map-retry']").addEventListener("click", function () {
        startChallenge(target, challengeType);
      });
      container.querySelector("[data-action='map-share']").addEventListener("click", shareResult);
      container.querySelector("[data-action='daily']").addEventListener("click", function () {
        challengeType = "daily";
        startChallenge(dailyFeature(regionKey, gameMode), "daily");
      });
      container.querySelector("[data-action='practice']").addEventListener("click", function () {
        const slug = container.querySelector("[data-practice-select]").value;
        const practiceTarget = findFeature(regionKey, slug);
        if (!practiceTarget) return;
        challengeType = "practice";
        startChallenge(practiceTarget, "practice");
      });

      canvas.addEventListener("pointerdown", startPath);
      canvas.addEventListener("pointermove", movePath);
      canvas.addEventListener("pointerup", endPath);
      canvas.addEventListener("pointercancel", endPath);
      canvas.addEventListener("pointerleave", endPath);
      window.addEventListener("keydown", function (event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          undoPath();
        }
      });
    }

    function changeRegion(nextRegion) {
      if (!mapData[nextRegion] || nextRegion === regionKey) return;
      regionKey = nextRegion;
      challengeType = "daily";
      container.querySelectorAll("[data-region]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.region === regionKey);
      });
      populatePracticeSelect();
      startChallenge(dailyFeature(regionKey, gameMode), "daily");
      track("region_changed", { region: regionKey, game_mode: gameMode });
    }

    function changeGameMode(nextMode) {
      if (!["cover", "capital"].includes(nextMode) || nextMode === gameMode) return;
      gameMode = nextMode;
      localStorage.setItem("country-draw-map-mode", gameMode);
      container.querySelectorAll("[data-game-mode]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.gameMode === gameMode);
      });
      const nextTarget = challengeType === "daily" ? dailyFeature(regionKey, gameMode) : target;
      startChallenge(nextTarget, challengeType);
      track("clue_mode_changed", { region: regionKey, game_mode: gameMode });
    }

    function startChallenge(feature, type) {
      target = feature;
      displayTarget = unwrapFeature(target);
      challengeType = type;
      result = null;
      drawingPaths = [];
      activePath = [];
      clearResultLayers();
      removeCapitalMarker();
      setInteractionMode("draw");
      updateChallengeView();
      fitTarget();
      showClue();
      redrawPaths();
      track("game_start", {
        region: regionKey,
        game_mode: gameMode,
        challenge_type: challengeType,
        target_slug: target.properties.slug
      });
    }

    function updateChallengeView() {
      const config = regionConfig[regionKey];
      const dedicated = challengeType === "practice";
      const regionFeatures = mapData[regionKey].features;
      const index = regionFeatures.findIndex((feature) => feature.properties.slug === target.properties.slug) + 1;
      container.querySelector("[data-challenge-label]").textContent = dedicated ? "Practice round" : "Daily challenge";
      container.querySelector("[data-challenge-title]").textContent = dedicated
        ? `Draw ${target.properties.name}`
        : `Draw the hidden ${config.noun}`;
      container.querySelector("[data-challenge-number]").textContent = dedicated ? `${index}/${regionFeatures.length}` : todayLabel();
      container.querySelector("[data-result]").hidden = true;
      container.querySelector("[data-map-result]").hidden = true;
      container.querySelector(".map-stage").classList.remove("is-showing-result");
      container.querySelector("[data-action='share']").hidden = true;
      container.querySelector("[data-action='share']").textContent = "Share result";
      container.querySelector("[data-action='map-share']").textContent = "Share";
      container.querySelector("[data-action='submit']").hidden = false;
      container.querySelector("[data-action='submit']").disabled = false;
      container.querySelector("[data-action='submit']").textContent = "Submit drawing";
      container.querySelector("[data-action='daily']").classList.toggle("is-active", challengeType === "daily");
      container.querySelector(".challenge-switcher label span").textContent = `Practice a specific ${config.noun}`;
      container.querySelector("[data-practice-select]").value = target.properties.slug;
      updateToolButtons();
      updateStatsView();
    }

    function showClue() {
      const clueTitle = container.querySelector("[data-clue-title]");
      const clueCopy = container.querySelector("[data-clue-copy]");
      container.querySelector("[data-clue-eyebrow]").textContent = gameMode === "cover" ? "Map clue" : "Location clue";
      clueTitle.textContent = gameMode === "cover" ? "The target area is covered" : "The capital is marked";
      clueCopy.textContent = challengeType === "practice"
        ? `${target.properties.capital} marks the reference point for ${target.properties.name}.`
        : "Use the map context and capital marker to reconstruct the missing border.";

      if (gameMode === "cover") {
        map.getSource("mask").setData(createMask(displayTarget));
      } else {
        map.getSource("mask").setData(emptyCollection());
      }
      showCapitalMarker();
      setStatus(gameMode === "cover"
        ? "Draw the border around the covered area."
        : "Draw the border around the capital marker.");
    }

    function fitTarget() {
      const bounds = window.turf.bbox(displayTarget);
      const width = Math.max(0.2, bounds[2] - bounds[0]);
      const height = Math.max(0.2, bounds[3] - bounds[1]);
      const horizontalPadding = width * 0.55;
      const verticalPadding = height * 0.55;
      const south = Math.max(-84.5, bounds[1] - verticalPadding);
      const north = Math.min(84.5, bounds[3] + verticalPadding);
      map.fitBounds([
        [bounds[0] - horizontalPadding, south],
        [bounds[2] + horizontalPadding, north]
      ], {
        padding: { top: 64, right: 64, bottom: 64, left: 64 },
        duration: 550,
        maxZoom: 6.8
      });
    }

    function createMask(feature) {
      const bounds = window.turf.bbox(feature);
      const center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
      const width = window.turf.distance([bounds[0], center[1]], [bounds[2], center[1]], { units: "kilometers" });
      const height = window.turf.distance([center[0], bounds[1]], [center[0], bounds[3]], { units: "kilometers" });
      return window.turf.ellipse(center, Math.max(35, width * 0.6), Math.max(35, height * 0.62), {
        steps: 96,
        units: "kilometers"
      });
    }

    function showCapitalMarker() {
      const coords = adjustedCapitalCoords(displayTarget);
      const marker = document.createElement("div");
      marker.className = "capital-map-marker";
      marker.setAttribute("aria-label", challengeType === "practice"
        ? `${target.properties.capital}, capital marker`
        : "Capital marker");
      marker.title = challengeType === "practice" ? target.properties.capital : "Capital marker";
      marker.innerHTML = `<span></span>`;
      capitalMarker = new window.maplibregl.Marker({ element: marker, anchor: "center" })
        .setLngLat(coords)
        .addTo(map);
    }

    function adjustedCapitalCoords(feature) {
      const coords = [...feature.properties.capitalCoords];
      const center = window.turf.center(feature).geometry.coordinates[0];
      while (coords[0] - center > 180) coords[0] -= 360;
      while (coords[0] - center < -180) coords[0] += 360;
      return coords;
    }

    function removeCapitalMarker() {
      if (!capitalMarker) return;
      capitalMarker.remove();
      capitalMarker = null;
    }

    function setInteractionMode(nextMode) {
      interactionMode = nextMode;
      container.querySelectorAll("[data-interaction]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.interaction === interactionMode);
      });
      const canDraw = interactionMode === "draw" && !result;
      canvas.style.pointerEvents = canDraw ? "auto" : "none";
      canvas.style.cursor = canDraw ? "crosshair" : "default";
      if (map) {
        if (interactionMode === "move") {
          map.dragPan.enable();
          map.scrollZoom.enable();
          map.doubleClickZoom.enable();
          map.touchZoomRotate.enable();
        } else {
          map.dragPan.disable();
          map.scrollZoom.disable();
          map.doubleClickZoom.disable();
          map.touchZoomRotate.disable();
        }
      }
      setStatus(interactionMode === "draw" ? "Drawing mode." : "Move mode. Pan or zoom the map, then switch back to Draw.");
    }

    function startPath(event) {
      if (interactionMode !== "draw" || result) return;
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      activePath = [eventToLngLat(event)];
      redrawPaths();
      track("drawing_started", {
        region: regionKey,
        game_mode: gameMode,
        target_slug: target.properties.slug
      });
    }

    function movePath(event) {
      if (!drawing || interactionMode !== "draw" || result) return;
      const point = eventToLngLat(event);
      const previous = activePath[activePath.length - 1];
      if (!previous || window.turf.distance(previous, point, { units: "kilometers" }) > 0.5) {
        activePath.push(point);
        redrawPaths();
      }
    }

    function endPath() {
      if (!drawing) return;
      drawing = false;
      if (activePath.length >= 3) drawingPaths.push(activePath);
      activePath = [];
      redrawPaths();
      updateToolButtons();
    }

    function eventToLngLat(event) {
      const bounds = canvas.getBoundingClientRect();
      const point = map.unproject([event.clientX - bounds.left, event.clientY - bounds.top]);
      const targetCenter = window.turf.center(displayTarget).geometry.coordinates[0];
      let longitude = point.lng;
      while (longitude - targetCenter > 180) longitude -= 360;
      while (longitude - targetCenter < -180) longitude += 360;
      return [longitude, point.lat];
    }

    function resizeCanvas() {
      if (!canvas || !context) return;
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      redrawPaths();
    }

    function redrawPaths() {
      if (!context || !canvas || !map) return;
      const bounds = canvas.getBoundingClientRect();
      context.clearRect(0, 0, bounds.width, bounds.height);
      [...drawingPaths, activePath].filter((path) => path.length).forEach(drawPath);
    }

    function drawPath(path) {
      context.beginPath();
      path.forEach((coords, index) => {
        const point = map.project(coords);
        if (index) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
      });
      context.strokeStyle = result ? "#102f42" : "#133f58";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
    }

    function undoPath() {
      if (result || !drawingPaths.length) return;
      drawingPaths.pop();
      redrawPaths();
      updateToolButtons();
      setStatus(drawingPaths.length ? "Last stroke removed." : "Drawing cleared.");
      track("drawing_undo", { region: regionKey, target_slug: target.properties.slug });
    }

    function clearDrawing() {
      if (result) {
        startChallenge(target, challengeType);
        return;
      }
      drawingPaths = [];
      activePath = [];
      redrawPaths();
      updateToolButtons();
      setStatus("Drawing cleared.");
      track("drawing_cleared", { region: regionKey, target_slug: target.properties.slug });
    }

    function updateToolButtons() {
      const hasPaths = drawingPaths.length > 0;
      container.querySelector("[data-action='undo']").disabled = !hasPaths || Boolean(result);
      const clearButton = container.querySelector("[data-action='clear']");
      clearButton.disabled = !hasPaths && !result;
      clearButton.textContent = result ? "Try again" : "Clear";
    }

    function submitDrawing() {
      if (result) return;
      const pointCount = drawingPaths.reduce((sum, path) => sum + path.length, 0);
      if (pointCount < 8) {
        setStatus("Close a complete border before submitting.");
        return;
      }

      const userFeature = createUserFeature();
      if (!userFeature) {
        setStatus("That border crosses itself too heavily. Undo the last stroke or draw a simpler closed outline.");
        return;
      }

      const overlap = geometryOperation("intersect", displayTarget, userFeature);
      const missed = geometryOperation("difference", displayTarget, userFeature);
      const extra = geometryOperation("difference", userFeature, displayTarget);
      const targetArea = window.turf.area(displayTarget);
      const overlapArea = overlap ? window.turf.area(overlap) : 0;
      const missedRatio = Math.max(0, Math.min(1, 1 - overlapArea / targetArea));
      const extraRatio = Math.max(0, extra ? window.turf.area(extra) / targetArea : 0);
      const matchedRatio = Math.max(0, Math.min(1, overlapArea / targetArea));
      const accuracy = Math.max(0, 1 - missedRatio - extraRatio);

      result = {
        userFeature,
        overlap,
        missed,
        extra,
        accuracy: Math.round(accuracy * 100),
        matched: Math.round(matchedRatio * 100),
        missedPercent: Math.round(missedRatio * 100),
        extraPercent: Math.round(extraRatio * 100)
      };
      revealResult();
      recordResult();
      track("drawing_submitted", {
        region: regionKey,
        game_mode: gameMode,
        challenge_type: challengeType,
        target_slug: target.properties.slug,
        score: result.accuracy,
        matched: result.matched,
        missed: result.missedPercent,
        extra: result.extraPercent
      });
    }

    function createUserFeature() {
      const polygons = [];
      drawingPaths.forEach((path) => {
        if (path.length < 3) return;
        const ring = [...path];
        if (!sameCoordinate(ring[0], ring[ring.length - 1])) ring.push([...ring[0]]);
        try {
          const polygon = window.turf.cleanCoords(window.turf.polygon([ring]));
          const pieces = window.turf.unkinkPolygon(polygon).features;
          pieces.forEach((piece) => {
            if (window.turf.area(piece) > 1000) polygons.push(piece);
          });
        } catch {
          // Invalid paths are ignored; another valid stroke may still be scoreable.
        }
      });
      if (!polygons.length) return null;
      if (polygons.length === 1) return polygons[0];
      try {
        return window.turf.union(window.turf.featureCollection(polygons));
      } catch {
        return polygons.sort((a, b) => window.turf.area(b) - window.turf.area(a))[0];
      }
    }

    function geometryOperation(method, first, second) {
      try {
        return window.turf[method](window.turf.featureCollection([first, second]));
      } catch (error) {
        console.warn(`${method} failed:`, error.message);
        return null;
      }
    }

    function revealResult() {
      map.getSource("mask").setData(emptyCollection());
      map.getSource("target").setData(displayTarget);
      map.getSource("overlap").setData(result.overlap || emptyCollection());
      map.getSource("missed").setData(result.missed || emptyCollection());
      map.getSource("extra").setData(result.extra || emptyCollection());
      removeCapitalMarker();
      setInteractionMode("move");
      redrawPaths();
      if (window.matchMedia("(max-width: 1020px)").matches) {
        container.querySelector(".map-stage").scrollIntoView({ block: "start" });
      }

      const panel = container.querySelector("[data-result]");
      panel.hidden = false;
      container.querySelector("[data-score]").textContent = `${result.accuracy}%`;
      container.querySelector("[data-result-name]").textContent = target.properties.name;
      setScoreRow("matched", result.matched);
      setScoreRow("missed", result.missedPercent);
      setScoreRow("extra", result.extraPercent);
      showMapResult();
      container.querySelector("[data-action='submit']").hidden = true;
      container.querySelector("[data-action='share']").hidden = false;
      container.querySelector("[data-action='clear']").disabled = false;
      container.querySelector("[data-action='clear']").textContent = "Try again";
      container.querySelector("[data-clue-title]").textContent = target.properties.name;
      container.querySelector("[data-clue-copy]").textContent = `Capital: ${target.properties.capital}. Green matched, red was missed, and gold was extra.`;
      setStatus(`Scored ${result.accuracy}% for ${target.properties.name}.`);
    }

    function showMapResult() {
      const panel = container.querySelector("[data-map-result]");
      panel.hidden = false;
      container.querySelector(".map-stage").classList.add("is-showing-result");
      container.querySelector("[data-map-score]").textContent = `${result.accuracy}%`;
      container.querySelector("[data-map-score-fill]").style.width = `${result.accuracy}%`;
      setMapScoreRow("matched", result.matched);
      setMapScoreRow("missed", result.missedPercent);
      setMapScoreRow("extra", result.extraPercent);
    }

    function dismissMapResult() {
      container.querySelector("[data-map-result]").hidden = true;
      container.querySelector(".map-stage").classList.remove("is-showing-result");
      setStatus(`Scored ${result.accuracy}% for ${target.properties.name}.`);
      container.querySelector("[data-action='clear']").focus();
    }

    function setScoreRow(key, value) {
      const row = container.querySelector(`[data-score-row="${key}"]`);
      row.querySelector("strong").textContent = `${value}%`;
      row.querySelector(".area-score-fill").style.width = `${Math.min(100, value)}%`;
    }

    function setMapScoreRow(key, value) {
      const row = container.querySelector(`[data-map-score-row="${key}"]`);
      row.querySelector("b").textContent = `${value}%`;
      row.querySelector(".map-result-fill").style.width = `${Math.min(100, value)}%`;
    }

    function clearResultLayers() {
      if (!map?.getSource("mask")) return;
      ["mask", "target", "overlap", "missed", "extra"].forEach((id) => {
        map.getSource(id).setData(emptyCollection());
      });
    }

    function recordResult() {
      const key = statKey();
      const entry = stats[key] = stats[key] || { games: 0, best: 0, total: 0, daily: {} };
      entry.daily = entry.daily || {};
      entry.games += 1;
      entry.best = Math.max(entry.best, result.accuracy);
      entry.total += result.accuracy;
      if (challengeType === "daily") {
        entry.daily[todayKey()] = result.accuracy;
      }
      saveStats();
      updateStatsView();
    }

    function updateStatsView() {
      const entry = stats[statKey()] || { games: 0, best: 0, total: 0, daily: {} };
      container.querySelector("[data-stat='games']").textContent = entry.games || 0;
      container.querySelector("[data-stat='best']").textContent = `${entry.best || 0}%`;
      container.querySelector("[data-stat='average']").textContent = `${entry.games ? Math.round(entry.total / entry.games) : 0}%`;
      container.querySelector("[data-stat='streak']").textContent = dailyStreak(entry.daily || {});
    }

    function populatePracticeSelect() {
      const select = container.querySelector("[data-practice-select]");
      select.innerHTML = mapData[regionKey].features.map((feature) => `
        <option value="${escapeHtml(feature.properties.slug)}"${feature.properties.slug === target.properties.slug ? " selected" : ""}>
          ${escapeHtml(feature.properties.name)}
        </option>
      `).join("");
    }

    async function shareResult() {
      if (!result) return;
      const text = [
        `Country Draw ${todayLabel()}`,
        `${target.properties.name}: ${result.accuracy}%`,
        `Matched ${result.matched}% | Missed ${result.missedPercent}% | Extra ${result.extraPercent}%`,
        location.href
      ].join("\n");
      const button = container.querySelector("[data-action='share']");
      const mapButton = container.querySelector("[data-action='map-share']");
      try {
        if (typeof navigator.share === "function") {
          await navigator.share({ title: "Country Draw", text });
          button.textContent = "Shared";
          mapButton.textContent = "Shared";
          track("result_shared", { share_method: "native", score: result.accuracy });
        } else {
          await copyText(text);
          button.textContent = "Copied";
          mapButton.textContent = "Copied";
          track("result_shared", { share_method: "clipboard", score: result.accuracy });
        }
      } catch {
        // Closing the system share sheet is not an error that needs user feedback.
      }
    }

    function findFeature(key, slug) {
      if (!slug || !mapData[key]) return null;
      return mapData[key].features.find((feature) => feature.properties.slug === slug) || null;
    }

    function dailyFeature(key, mode) {
      const pool = mapData[key].features;
      const seed = hash(`${todayKey()}|${key}|${mode}`);
      return pool[Math.abs(seed) % pool.length];
    }

    function statKey() {
      return `${regionKey}:${gameMode}`;
    }

    function loadStats() {
      try {
        return JSON.parse(localStorage.getItem("country-draw-map-stats") || "{}");
      } catch {
        return {};
      }
    }

    function saveStats() {
      try {
        localStorage.setItem("country-draw-map-stats", JSON.stringify(stats));
      } catch {
        // Storage is optional; gameplay remains available.
      }
    }

    function dailyStreak(days) {
      let streak = 0;
      const cursor = new Date();
      cursor.setHours(12, 0, 0, 0);
      while (Object.prototype.hasOwnProperty.call(days, todayKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    }

    function todayKey(date = new Date()) {
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
      ].join("-");
    }

    function todayLabel() {
      return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date());
    }

    function hash(value) {
      let output = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        output ^= value.charCodeAt(index);
        output = Math.imul(output, 16777619);
      }
      return output;
    }

    function unwrapFeature(feature) {
      const longitudes = [];
      collectLongitudes(feature.geometry.coordinates, longitudes);
      const min = Math.min(...longitudes);
      const max = Math.max(...longitudes);
      if (max - min <= 180) return cloneFeature(feature);
      const normalized = longitudes
        .map((longitude) => ((longitude % 360) + 360) % 360)
        .sort((a, b) => a - b);
      let largestGap = -1;
      let windowStart = normalized[0] || 0;
      normalized.forEach((longitude, index) => {
        const next = index === normalized.length - 1 ? normalized[0] + 360 : normalized[index + 1];
        if (next - longitude > largestGap) {
          largestGap = next - longitude;
          windowStart = next % 360;
        }
      });
      const clone = cloneFeature(feature);
      clone.geometry.coordinates = mapCoordinates(clone.geometry.coordinates, ([longitude, latitude]) => [
        longitudeInWindow(longitude, windowStart),
        latitude
      ]);
      return clone;
    }

    function longitudeInWindow(longitude, start) {
      let value = ((longitude % 360) + 360) % 360;
      if (value < start) value += 360;
      return value;
    }

    function cloneFeature(feature) {
      return JSON.parse(JSON.stringify(feature));
    }

    function collectLongitudes(value, output) {
      if (typeof value[0] === "number") {
        output.push(value[0]);
        return;
      }
      value.forEach((child) => collectLongitudes(child, output));
    }

    function mapCoordinates(value, callback) {
      if (typeof value[0] === "number") return callback(value);
      return value.map((child) => mapCoordinates(child, callback));
    }

    function sameCoordinate(a, b) {
      return a[0] === b[0] && a[1] === b[1];
    }

    function setStatus(message) {
      container.querySelector("[data-map-status]").textContent = message;
    }

    function scoreRow(label, key, color) {
      return `
        <div class="area-score-row" data-score-row="${key}">
          <div><span class="area-score-dot is-${color}"></span><span>${label}</span><strong>0%</strong></div>
          <div class="area-score-track"><span class="area-score-fill is-${color}"></span></div>
        </div>
      `;
    }

    function mapScoreRow(label, key, color) {
      return `
        <div class="map-result-row" data-map-score-row="${key}">
          <span class="map-result-dot is-${color}"></span>
          <strong>${label}</strong>
          <div class="map-result-track"><span class="map-result-fill is-${color}"></span></div>
          <b>0%</b>
        </div>
      `;
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);
    }

    function track(eventName, parameters) {
      if (typeof window.countryDrawTrack === "function") {
        window.countryDrawTrack(eventName, parameters);
      }
    }
  }

  function loadScript(source, ready) {
    if (ready?.()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${source}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${source}`));
      document.head.appendChild(script);
    });
  }

  function loadStyle(source) {
    if (document.querySelector(`link[href="${source}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = source;
    document.head.appendChild(link);
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
})();
