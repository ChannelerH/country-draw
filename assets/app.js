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
    let shareBlob = null;
    let shareObjectUrl = "";
    let shareImageAction = "none";
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
                <button type="button" data-action="map-share">Share score</button>
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
                <button type="button" data-action="share" hidden>Share score</button>
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

          <dialog class="share-dialog" data-share-dialog aria-labelledby="share-dialog-title">
            <div class="share-dialog-shell">
              <header class="share-dialog-header">
                <div>
                  <p>Ready to share</p>
                  <h2 id="share-dialog-title">Share your score</h2>
                </div>
                <button type="button" class="share-dialog-close" data-action="close-share" title="Close share preview" aria-label="Close share preview">&times;</button>
              </header>

              <div class="share-preview">
                <img data-share-preview alt="">
                <div class="share-preview-loading" data-share-loading aria-live="polite">Building your score card...</div>
              </div>

              <p class="share-feedback" data-share-feedback aria-live="polite">Your score card includes the result map and all four score values.</p>

              <div class="share-dialog-actions">
                <button type="button" class="share-action-primary" data-action="native-share">Share PNG</button>
                <button type="button" data-action="copy-result">Copy result</button>
                <button type="button" data-action="download-result">Download PNG</button>
              </div>
            </div>
          </dialog>
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
      container.querySelector("[data-action='share']").addEventListener("click", openShareDialog);
      container.querySelector("[data-action='dismiss-result']").addEventListener("click", dismissMapResult);
      container.querySelector("[data-action='map-retry']").addEventListener("click", function () {
        startChallenge(target, challengeType);
      });
      container.querySelector("[data-action='map-share']").addEventListener("click", openShareDialog);
      container.querySelector("[data-action='close-share']").addEventListener("click", closeShareDialog);
      container.querySelector("[data-action='native-share']").addEventListener("click", shareResultImage);
      container.querySelector("[data-action='copy-result']").addEventListener("click", copyResult);
      container.querySelector("[data-action='download-result']").addEventListener("click", downloadResultImage);
      const shareDialog = container.querySelector("[data-share-dialog]");
      shareDialog.addEventListener("click", function (event) {
        if (event.target === shareDialog) closeShareDialog();
      });
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
      resetShareCard();
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
      container.querySelector("[data-action='share']").textContent = "Share score";
      container.querySelector("[data-action='map-share']").textContent = "Share score";
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

    async function openShareDialog() {
      if (!result) return;
      const dialog = container.querySelector("[data-share-dialog]");
      const preview = container.querySelector("[data-share-preview]");
      const loading = container.querySelector("[data-share-loading]");
      const feedback = container.querySelector("[data-share-feedback]");
      const nativeButton = container.querySelector("[data-action='native-share']");

      resetShareCard();
      container.querySelector("#share-dialog-title").textContent = `Share ${target.properties.name}`;
      preview.alt = `${target.properties.name} Country Draw score card showing ${result.accuracy}% accuracy`;
      loading.hidden = false;
      loading.textContent = "Building your score card...";
      feedback.textContent = "Your score card includes the result map and all four score values.";
      nativeButton.hidden = true;
      setShareActionsDisabled(true);
      dialog.showModal();

      try {
        shareBlob = await buildShareCard();
        shareObjectUrl = URL.createObjectURL(shareBlob);
        preview.src = shareObjectUrl;
        await preview.decode().catch(() => {});
        configureShareImageAction();
        loading.hidden = true;
        setShareActionsDisabled(false);
        track("share_preview_opened", {
          region: regionKey,
          target_slug: target.properties.slug,
          score: result.accuracy
        });
      } catch (error) {
        console.error("Unable to build score card:", error);
        loading.textContent = "The score card could not be created.";
        feedback.textContent = "Close this preview and try again.";
      }
    }

    function closeShareDialog() {
      const dialog = container.querySelector("[data-share-dialog]");
      if (dialog.open) dialog.close();
    }

    function resetShareCard() {
      closeShareDialog();
      if (shareObjectUrl) URL.revokeObjectURL(shareObjectUrl);
      shareObjectUrl = "";
      shareBlob = null;
      shareImageAction = "none";
      const preview = container.querySelector("[data-share-preview]");
      if (preview) preview.removeAttribute("src");
      const nativeButton = container.querySelector("[data-action='native-share']");
      nativeButton.hidden = true;
      nativeButton.textContent = "Share PNG";
      container.querySelectorAll("[data-action='copy-result'], [data-action='download-result']").forEach((button) => {
        button.textContent = button.dataset.action === "copy-result" ? "Copy result" : "Download PNG";
      });
    }

    function setShareActionsDisabled(disabled) {
      container.querySelectorAll(".share-dialog-actions button").forEach((button) => {
        button.disabled = disabled;
      });
    }

    function shareText(includeUrl = true) {
      const lines = [
        `Country Draw ${todayLabel()}`,
        `${target.properties.name}: ${result.accuracy}% accuracy`,
        `Matched ${result.matched}% | Missed ${result.missedPercent}% | Extra ${result.extraPercent}%`
      ];
      if (includeUrl) lines.push(location.href);
      return lines.join("\n");
    }

    function shareImageFile() {
      return new File([shareBlob], shareFileName(), {
        type: "image/png",
        lastModified: Date.now()
      });
    }

    function canCopyImage() {
      return typeof window.ClipboardItem === "function"
        && typeof navigator.clipboard?.write === "function";
    }

    function configureShareImageAction() {
      const button = container.querySelector("[data-action='native-share']");
      const fileData = { files: [shareImageFile()] };
      const canShareFile = typeof navigator.share === "function"
        && typeof navigator.canShare === "function"
        && navigator.canShare(fileData);

      if (canShareFile) {
        shareImageAction = "native";
        button.textContent = "Share PNG";
        button.hidden = false;
        return;
      }

      if (canCopyImage()) {
        shareImageAction = "clipboard";
        button.textContent = "Copy image";
        button.hidden = false;
        setShareFeedback("This browser cannot send files to the share menu. Copy the PNG, then paste it into your app.");
        return;
      }

      shareImageAction = "none";
      button.hidden = true;
      setShareFeedback("Download the PNG to share the score card.");
    }

    async function shareResultImage() {
      if (!shareBlob) return;
      const button = container.querySelector("[data-action='native-share']");

      if (shareImageAction === "clipboard") {
        await copyResultImage(button);
        return;
      }

      if (shareImageAction !== "native") return;
      const data = { files: [shareImageFile()] };
      try {
        await navigator.share(data);
        setShareFeedback("PNG shared successfully.");
        track("result_shared", {
          share_method: "native_image",
          score: result.accuracy
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          if (canCopyImage()) {
            shareImageAction = "clipboard";
            button.textContent = "Copy image";
            setShareFeedback("The system could not share the file. Copy the PNG, then paste it into your app.");
          } else {
            button.hidden = true;
            setShareFeedback("The system could not share the file. Download the PNG instead.");
          }
        }
      }
    }

    async function copyResultImage(button) {
      try {
        const item = new ClipboardItem({ "image/png": shareBlob });
        await navigator.clipboard.write([item]);
        button.textContent = "Image copied";
        setShareFeedback("PNG copied. Paste it into Messages, email, or a social app.");
        track("result_shared", { share_method: "clipboard_image", score: result.accuracy });
      } catch {
        setShareFeedback("Image clipboard access was blocked. Download the PNG instead.");
      }
    }

    async function copyResult() {
      if (!result) return;
      const button = container.querySelector("[data-action='copy-result']");
      try {
        await copyText(shareText());
        button.textContent = "Copied";
        setShareFeedback("Result and link copied to the clipboard.");
        track("result_shared", { share_method: "clipboard", score: result.accuracy });
      } catch {
        setShareFeedback("Clipboard access was blocked. Download the PNG instead.");
      }
    }

    function downloadResultImage() {
      if (!shareBlob) return;
      const link = document.createElement("a");
      const url = URL.createObjectURL(shareBlob);
      link.href = url;
      link.download = shareFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      container.querySelector("[data-action='download-result']").textContent = "Downloaded";
      setShareFeedback("PNG score card downloaded.");
      track("result_shared", { share_method: "download_png", score: result.accuracy });
    }

    function setShareFeedback(message) {
      container.querySelector("[data-share-feedback]").textContent = message;
    }

    function shareFileName() {
      return `country-draw-${target.properties.slug}-${result.accuracy}.png`;
    }

    function buildShareCard() {
      const card = document.createElement("canvas");
      card.width = 1200;
      card.height = 630;
      const cardContext = card.getContext("2d");
      const colors = {
        background: "#f5f3ed",
        surface: "#ffffff",
        ink: "#14232b",
        muted: "#52636d",
        blue: "#174760",
        green: "#2dcc75",
        red: "#f24d3f",
        gold: "#ffa617",
        track: "#dce0dd",
        line: "#c9cfcb"
      };

      cardContext.fillStyle = colors.background;
      cardContext.fillRect(0, 0, card.width, card.height);
      drawCardGrid(cardContext, colors.line);

      cardContext.fillStyle = colors.blue;
      cardContext.fillRect(0, 0, card.width, 86);
      cardContext.fillStyle = "#ffffff";
      cardContext.font = "900 34px system-ui, sans-serif";
      cardContext.fillText("COUNTRY DRAW", 50, 55);
      cardContext.textAlign = "right";
      cardContext.font = "800 17px system-ui, sans-serif";
      cardContext.fillText(
        `${challengeType === "daily" ? "DAILY CHALLENGE" : "PRACTICE ROUND"}  ·  ${todayLabel().toUpperCase()}`,
        1150,
        52
      );
      cardContext.textAlign = "left";

      drawRoundedRect(cardContext, 46, 118, 650, 454, 8, colors.surface, colors.ink, 2);
      cardContext.fillStyle = colors.muted;
      cardContext.font = "800 16px system-ui, sans-serif";
      cardContext.fillText("YOUR MAP RESULT", 72, 151);
      drawShareMap(cardContext, { x: 70, y: 170, width: 602, height: 374 }, colors);

      const contentX = 744;
      cardContext.fillStyle = colors.muted;
      cardContext.font = "800 16px system-ui, sans-serif";
      cardContext.fillText(regionConfig[regionKey].label.toUpperCase(), contentX, 139);

      cardContext.fillStyle = colors.ink;
      const titleBottom = drawShareTitle(cardContext, target.properties.name, contentX, 183, 400);

      cardContext.fillStyle = colors.muted;
      cardContext.font = "800 18px system-ui, sans-serif";
      cardContext.fillText("Accuracy", contentX, titleBottom + 30);
      cardContext.fillStyle = colors.blue;
      cardContext.font = "900 68px Georgia, serif";
      cardContext.fillText(`${result.accuracy}%`, contentX, titleBottom + 90);

      const scoreStart = titleBottom + 120;
      drawShareScore(cardContext, "Matched", result.matched, scoreStart, colors.green, colors);
      drawShareScore(cardContext, "Missed", result.missedPercent, scoreStart + 54, colors.red, colors);
      drawShareScore(cardContext, "Extra", result.extraPercent, scoreStart + 108, colors.gold, colors);

      cardContext.fillStyle = colors.muted;
      cardContext.font = "700 17px system-ui, sans-serif";
      cardContext.fillText("Can you draw it closer?", contentX, 551);
      cardContext.fillStyle = colors.blue;
      cardContext.font = "900 20px system-ui, sans-serif";
      cardContext.fillText("countrydraw.games", contentX, 580);

      return new Promise((resolve, reject) => {
        card.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas export failed")), "image/png");
      });
    }

    function drawCardGrid(cardContext, color) {
      cardContext.save();
      cardContext.strokeStyle = color;
      cardContext.globalAlpha = 0.28;
      cardContext.lineWidth = 1;
      for (let x = 0; x <= 1200; x += 60) {
        cardContext.beginPath();
        cardContext.moveTo(x, 86);
        cardContext.lineTo(x, 630);
        cardContext.stroke();
      }
      for (let y = 86; y <= 630; y += 60) {
        cardContext.beginPath();
        cardContext.moveTo(0, y);
        cardContext.lineTo(1200, y);
        cardContext.stroke();
      }
      cardContext.restore();
    }

    function drawShareTitle(cardContext, title, x, y, maxWidth) {
      let fontSize = 38;
      let lines = [];
      while (fontSize >= 28) {
        cardContext.font = `900 ${fontSize}px Georgia, serif`;
        lines = wrapCanvasText(cardContext, title, maxWidth);
        if (lines.length <= 3) break;
        fontSize -= 2;
      }
      cardContext.font = `900 ${fontSize}px Georgia, serif`;
      lines.slice(0, 3).forEach((titleLine, index) => {
        cardContext.fillText(titleLine, x, y + index * (fontSize + 6));
      });
      return y + (Math.min(lines.length, 3) - 1) * (fontSize + 6);
    }

    function wrapCanvasText(cardContext, text, maxWidth) {
      const words = text.split(/\s+/);
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        if (line && cardContext.measureText(nextLine).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = nextLine;
        }
      });
      if (line) lines.push(line);
      return lines;
    }

    function drawShareScore(cardContext, label, value, y, color, colors) {
      cardContext.fillStyle = colors.ink;
      cardContext.font = "800 17px system-ui, sans-serif";
      cardContext.fillText(label, 744, y);
      cardContext.textAlign = "right";
      cardContext.fillText(`${value}%`, 1148, y);
      cardContext.textAlign = "left";
      drawRoundedRect(cardContext, 744, y + 13, 404, 14, 7, colors.track);
      const width = Math.max(value > 0 ? 8 : 0, Math.min(404, 404 * value / 100));
      if (width) drawRoundedRect(cardContext, 744, y + 13, width, 14, 7, color);
    }

    function drawShareMap(cardContext, frame, colors) {
      const projectedBounds = geoBounds(displayTarget);
      if (!projectedBounds) return;
      const padding = 30;
      const availableWidth = frame.width - padding * 2;
      const availableHeight = frame.height - padding * 2;
      const rangeX = Math.max(0.0001, projectedBounds.maxX - projectedBounds.minX);
      const rangeY = Math.max(0.0001, projectedBounds.maxY - projectedBounds.minY);
      const scale = Math.min(availableWidth / rangeX, availableHeight / rangeY);
      const offsetX = frame.x + (frame.width - rangeX * scale) / 2;
      const offsetY = frame.y + (frame.height - rangeY * scale) / 2;
      const project = (coordinate) => {
        const point = mercatorPoint(coordinate);
        return [
          offsetX + (point[0] - projectedBounds.minX) * scale,
          offsetY + (projectedBounds.maxY - point[1]) * scale
        ];
      };

      cardContext.save();
      cardContext.beginPath();
      cardContext.rect(frame.x, frame.y, frame.width, frame.height);
      cardContext.clip();
      paintGeoFeature(cardContext, result.extra, project, colors.gold, null, 0);
      paintGeoFeature(cardContext, result.missed, project, colors.red, null, 0);
      paintGeoFeature(cardContext, result.overlap, project, colors.green, null, 0);
      paintGeoFeature(cardContext, displayTarget, project, null, colors.ink, 4);
      cardContext.setLineDash([9, 7]);
      paintGeoFeature(cardContext, result.userFeature, project, null, colors.blue, 3);
      cardContext.setLineDash([]);
      cardContext.restore();
    }

    function geoBounds(feature) {
      const coordinates = [];
      collectGeoCoordinates(feature, coordinates);
      if (!coordinates.length) return null;
      const points = coordinates.map(mercatorPoint);
      return {
        minX: Math.min(...points.map((point) => point[0])),
        maxX: Math.max(...points.map((point) => point[0])),
        minY: Math.min(...points.map((point) => point[1])),
        maxY: Math.max(...points.map((point) => point[1]))
      };
    }

    function collectGeoCoordinates(value, output) {
      if (!value) return;
      if (value.type === "Feature") {
        collectGeoCoordinates(value.geometry, output);
        return;
      }
      if (value.type === "FeatureCollection") {
        value.features.forEach((feature) => collectGeoCoordinates(feature, output));
        return;
      }
      if (value.type === "GeometryCollection") {
        value.geometries.forEach((geometry) => collectGeoCoordinates(geometry, output));
        return;
      }
      collectCoordinateArray(value.coordinates, output);
    }

    function collectCoordinateArray(value, output) {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
        output.push(value);
        return;
      }
      value.forEach((child) => collectCoordinateArray(child, output));
    }

    function mercatorPoint(coordinate) {
      const latitude = Math.max(-84.5, Math.min(84.5, coordinate[1]));
      const radians = latitude * Math.PI / 180;
      return [coordinate[0], Math.log(Math.tan(Math.PI / 4 + radians / 2)) * 180 / Math.PI];
    }

    function paintGeoFeature(cardContext, feature, project, fill, stroke, lineWidth) {
      if (!feature) return;
      cardContext.beginPath();
      appendGeoPath(cardContext, feature, project);
      if (fill) {
        cardContext.fillStyle = fill;
        cardContext.globalAlpha = 0.82;
        cardContext.fill("evenodd");
        cardContext.globalAlpha = 1;
      }
      if (stroke) {
        cardContext.strokeStyle = stroke;
        cardContext.lineWidth = lineWidth;
        cardContext.lineJoin = "round";
        cardContext.lineCap = "round";
        cardContext.stroke();
      }
    }

    function appendGeoPath(cardContext, value, project) {
      if (!value) return;
      if (value.type === "Feature") {
        appendGeoPath(cardContext, value.geometry, project);
        return;
      }
      if (value.type === "FeatureCollection") {
        value.features.forEach((feature) => appendGeoPath(cardContext, feature, project));
        return;
      }
      if (value.type === "GeometryCollection") {
        value.geometries.forEach((geometry) => appendGeoPath(cardContext, geometry, project));
        return;
      }
      const polygons = value.type === "Polygon"
        ? [value.coordinates]
        : value.type === "MultiPolygon" ? value.coordinates : [];
      polygons.forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach((coordinate, index) => {
            const point = project(coordinate);
            if (index) cardContext.lineTo(point[0], point[1]);
            else cardContext.moveTo(point[0], point[1]);
          });
          cardContext.closePath();
        });
      });
    }

    function drawRoundedRect(cardContext, x, y, width, height, radius, fill, stroke, lineWidth = 1) {
      const safeRadius = Math.min(radius, width / 2, height / 2);
      cardContext.beginPath();
      cardContext.roundRect(x, y, width, height, safeRadius);
      if (fill) {
        cardContext.fillStyle = fill;
        cardContext.fill();
      }
      if (stroke) {
        cardContext.strokeStyle = stroke;
        cardContext.lineWidth = lineWidth;
        cardContext.stroke();
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
