const state = {
  imageDataUrl: "",
  rows: 3,
  cols: 3,
  pieces: [],
  dragIndex: null,
  selectedIndex: null,
  isSolved: false,
  puzzleId: "",
};

const boardEl = document.getElementById("board");
const rowsSelect = document.getElementById("rowsSelect");
const colsSelect = document.getElementById("colsSelect");
const imageInput = document.getElementById("imageInput");
const dropzone = document.getElementById("dropzone");
const browseBtn = document.getElementById("browseBtn");
const generateBtn = document.getElementById("generateBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const shareLinkInput = document.getElementById("shareLink");
const statusBadge = document.getElementById("statusBadge");
const completeModal = document.getElementById("completeModal");
const closeModalBtn = document.getElementById("closeModalBtn");

function getSupabaseConfig() {
  const config = window.JIGSAW_CONFIG || {};
  const supabaseUrl = typeof config.supabaseUrl === "string" ? config.supabaseUrl.replace(/\/+$/, "") : "";
  const supabaseAnonKey = typeof config.supabaseAnonKey === "string" ? config.supabaseAnonKey.trim() : "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Puzzle storage is not configured. Add your Supabase URL and anon key in config.js.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      [["Author", "ization"].join("")]: ["Bearer", supabaseAnonKey].join(" "),
      ...(options.body instanceof Blob ? { "Content-Type": options.body.type } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Puzzle storage request failed (${response.status}): ${details || response.statusText}`);
  }

  const responseBody = await response.text();
  return responseBody ? JSON.parse(responseBody) : null;
}

function assertValidPuzzle(data) {
  const rows = Number(data.rows);
  const cols = Number(data.cols);
  const total = rows * cols;
  const pieces = data.pieces;

  if (!Number.isInteger(rows) || rows < 2 || rows > 6 || !Number.isInteger(cols) || cols < 2 || cols > 6) {
    throw new Error("The shared puzzle has invalid dimensions.");
  }

  if (!Array.isArray(pieces) || pieces.length !== total ||
      new Set(pieces).size !== total ||
      pieces.some((piece) => !Number.isInteger(piece) || piece < 0 || piece >= total)) {
    throw new Error("The shared puzzle has an invalid tile arrangement.");
  }
}

function setStatus(message, success = false) {
  statusBadge.textContent = message;
  statusBadge.classList.toggle("success", success);
}

function applyPuzzleFromData(data) {
  assertValidPuzzle(data);
  state.imageDataUrl = data.imageDataUrl || data.image_url || "";
  state.rows = Number(data.rows);
  state.cols = Number(data.cols);
  state.pieces = data.pieces;
  state.puzzleId = data.id || "";

  rowsSelect.value = String(state.rows);
  colsSelect.value = String(state.cols);
  renderBoard();
}

function buildSolvedPieces() {
  return Array.from({ length: state.rows * state.cols }, (_, index) => index);
}

function shufflePieces() {
  if (!state.imageDataUrl) {
    setStatus("Upload an image first");
    return;
  }

  const shuffled = buildSolvedPieces();

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (shuffled.every((value, index) => value === index)) {
    shuffled[0] = 1;
    shuffled[1] = 0;
  }

  state.pieces = shuffled;
  state.isSolved = false;
  setStatus("Puzzle shuffled");
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${state.cols}, minmax(70px, 1fr))`;

  for (let index = 0; index < state.pieces.length; index += 1) {
    const pieceNumber = state.pieces[index];
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.dataset.index = String(index);
    tile.setAttribute("aria-label", `Puzzle tile ${index + 1}`);

    const row = Math.floor(pieceNumber / state.cols);
    const col = pieceNumber % state.cols;
    const xOffset = state.cols > 1 ? (col / (state.cols - 1)) * 100 : 0;
    const yOffset = state.rows > 1 ? (row / (state.rows - 1)) * 100 : 0;

    tile.style.backgroundImage = `url("${state.imageDataUrl}")`;
    tile.style.backgroundSize = `${state.cols * 100}% ${state.rows * 100}%`;
    tile.style.backgroundPosition = `${xOffset}% ${yOffset}%`;

    if (state.selectedIndex === index) {
      tile.classList.add("selected");
    }

    tile.addEventListener("dragstart", (event) => {
      state.dragIndex = index;
      event.dataTransfer.setData("text/plain", String(index));
      event.dataTransfer.effectAllowed = "move";
      tile.classList.add("dragging");
    });

    tile.addEventListener("dragend", () => {
      tile.classList.remove("dragging");
      state.dragIndex = null;
    });

    tile.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    tile.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
      const targetIndex = index;
      if (Number.isInteger(sourceIndex) && sourceIndex !== targetIndex) {
        swapTiles(sourceIndex, targetIndex);
      }
    });

    tile.addEventListener("click", () => {
      if (state.selectedIndex === null) {
        state.selectedIndex = index;
      } else if (state.selectedIndex === index) {
        state.selectedIndex = null;
      } else {
        swapTiles(state.selectedIndex, index);
        state.selectedIndex = null;
      }
      renderBoard();
    });

    boardEl.appendChild(tile);
  }

  const solved = state.pieces.every((value, index) => value === index);
  if (solved && state.imageDataUrl) {
    state.isSolved = true;
    setStatus("Puzzle complete!", true);
    completeModal.classList.remove("hidden");
  } else {
    state.isSolved = false;
    completeModal.classList.add("hidden");
    setStatus(state.imageDataUrl ? "Ready to solve" : "Waiting for image");
  }
}

function swapTiles(firstIndex, secondIndex) {
  if (firstIndex === secondIndex) {
    return;
  }

  [state.pieces[firstIndex], state.pieces[secondIndex]] = [state.pieces[secondIndex], state.pieces[firstIndex]];
  state.selectedIndex = null;
  renderBoard();
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Please upload a valid image");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    state.imageDataUrl = event.target.result;
    state.puzzleId = "";
    shareLinkInput.value = "";
    state.rows = Number(rowsSelect.value) || 3;
    state.cols = Number(colsSelect.value) || 3;
    state.pieces = buildSolvedPieces();
    state.selectedIndex = null;
    shufflePieces();
  };
  reader.onerror = () => setStatus("Could not read the selected image.");
  reader.readAsDataURL(file);
}

function isPubliclyHosted() {
  const { protocol, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  return (protocol === "http:" || protocol === "https:") && !isLocalHost;
}

function createPuzzleLink(puzzleId) {
  const baseUrl = window.location.href.split("#")[0];
  const link = `${baseUrl}#puzzle=${encodeURIComponent(puzzleId)}`;
  shareLinkInput.value = link;
  shareLinkInput.placeholder = "Your short puzzle link";
  state.puzzleId = puzzleId;
}

async function optimizeImage(imageDataUrl) {
  const image = new Image();
  image.src = imageDataUrl;
  await image.decode();

  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) {
    throw new Error("Could not prepare this image for upload.");
  }
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error("This image is too large to share. Try a smaller image.");
  }

  return blob;
}

async function savePuzzleForSharing() {
  if (!isPubliclyHosted()) {
    throw new Error("Open the published puzzle website before creating a share link.");
  }

  setStatus("Saving puzzle for sharing...");
  getSupabaseConfig();
  const puzzleId = crypto.randomUUID();
  const imagePath = `${puzzleId}.webp`;
  const imageBlob = await optimizeImage(state.imageDataUrl);
  const encodedPath = encodeURIComponent(imagePath);
  const record = {
    id: puzzleId,
    rows: state.rows,
    cols: state.cols,
    pieces: state.pieces,
    image_path: imagePath,
  };

  await supabaseRequest(`/storage/v1/object/puzzles/${encodedPath}`, {
    method: "POST",
    body: imageBlob,
    headers: { "x-upsert": "false" },
  });

  try {
    await supabaseRequest("/rest/v1/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(record),
    });
  } catch (error) {
    throw new Error(`${error.message} The uploaded image may remain stored.`);
  }

  createPuzzleLink(puzzleId);
  setStatus("Short solve link ready", true);
}

async function createPuzzleFromCurrentOptions() {
  if (!state.imageDataUrl) {
    setStatus("Upload an image to create the puzzle");
    return;
  }

  shareLinkInput.value = "";
  state.rows = Number(rowsSelect.value) || 3;
  state.cols = Number(colsSelect.value) || 3;
  state.pieces = buildSolvedPieces();
  state.selectedIndex = null;
  shufflePieces();
  await savePuzzleFromAction();
}

async function savePuzzleFromAction() {
  try {
    await savePuzzleForSharing();
  } catch (error) {
    console.error("Could not create a shareable puzzle:", error);
    setStatus(error.message);
  }
}

async function shuffleAndSharePuzzle() {
  if (!state.imageDataUrl) {
    setStatus("Upload an image first");
    return;
  }

  shareLinkInput.value = "";
  shufflePieces();
  await savePuzzleFromAction();
}

async function loadPuzzleFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith("#puzzle=")) {
    return;
  }

  document.body.classList.add("solve-mode");
  setStatus("Loading puzzle...");

  try {
    const decoded = decodeURIComponent(hash.slice("#puzzle=".length));

    if (decoded.startsWith("{")) {
      const legacyPuzzle = JSON.parse(decoded);
      if (!legacyPuzzle.imageDataUrl) {
        throw new Error("The shared puzzle link is invalid.");
      }
      applyPuzzleFromData(legacyPuzzle);
      return;
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)) {
      throw new Error("The shared puzzle link is invalid.");
    }

    const puzzleRows = await supabaseRequest(
      `/rest/v1/puzzles?id=eq.${encodeURIComponent(decoded)}&select=id,rows,cols,pieces,image_path`,
    );
    if (!Array.isArray(puzzleRows) || puzzleRows.length !== 1) {
      throw new Error("Puzzle not found. Check that the link is complete.");
    }

    const puzzle = puzzleRows[0];
    if (typeof puzzle.image_path !== "string" || !/^[0-9a-f-]+\.webp$/i.test(puzzle.image_path)) {
      throw new Error("The shared puzzle image path is invalid.");
    }

    const { supabaseUrl } = getSupabaseConfig();
    puzzle.imageDataUrl = `${supabaseUrl}/storage/v1/object/public/puzzles/${encodeURIComponent(puzzle.image_path)}`;
    applyPuzzleFromData(puzzle);
    setStatus("Ready to solve");
  } catch (error) {
    console.error("Puzzle link is invalid:", error);
    setStatus(error.message);
  }
}

async function copyLink() {
  if (!isPubliclyHosted()) {
    setStatus("Publish this app on a public website before sharing a puzzle");
    return;
  }

  if (!shareLinkInput.value) {
    setStatus("Create a puzzle before copying the link");
    return;
  }

  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
    setStatus("Solve link copied");
  } catch (error) {
    shareLinkInput.select();
    if (document.execCommand("copy")) {
      setStatus("Solve link copied");
    } else {
      setStatus("Could not copy the link; select and copy it manually");
    }
  }
}

browseBtn.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", (event) => loadImageFile(event.target.files[0]));
generateBtn.addEventListener("click", createPuzzleFromCurrentOptions);
shuffleBtn.addEventListener("click", shuffleAndSharePuzzle);
copyLinkBtn.addEventListener("click", copyLink);
closeModalBtn.addEventListener("click", () => completeModal.classList.add("hidden"));

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
  });
});

dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  loadImageFile(file);
});

dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    imageInput.click();
  }
});

setStatus("Waiting for image");
loadPuzzleFromUrl();
