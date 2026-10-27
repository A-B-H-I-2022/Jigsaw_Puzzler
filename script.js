const state = {
  imageDataUrl: "",
  rows: 3,
  cols: 3,
  pieces: [],
  dragIndex: null,
  selectedIndex: null,
  isSolved: false,
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

function setStatus(message, success = false) {
  statusBadge.textContent = message;
  statusBadge.classList.toggle("success", success);
}

function applyPuzzleFromData(data) {
  state.imageDataUrl = data.imageDataUrl || "";
  state.rows = Number(data.rows) || 3;
  state.cols = Number(data.cols) || 3;
  state.pieces = Array.isArray(data.pieces) && data.pieces.length === state.rows * state.cols ? data.pieces : buildSolvedPieces();

  rowsSelect.value = String(state.rows);
  colsSelect.value = String(state.cols);
  renderBoard();
  updateShareLink();
}

function buildSolvedPieces() {
  return Array.from({ length: state.rows * state.cols }, (_, index) => index);
}

function shufflePieces() {
  if (!state.imageDataUrl) {
    setStatus("Upload an image first");
    return;
  }

  const total = state.rows * state.cols;
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
  updateShareLink();
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
  updateShareLink();
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("Please upload a valid image");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    state.imageDataUrl = event.target.result;
    state.rows = Number(rowsSelect.value) || 3;
    state.cols = Number(colsSelect.value) || 3;
    state.pieces = buildSolvedPieces();
    state.selectedIndex = null;
    shufflePieces();
  };
  reader.readAsDataURL(file);
}

function updateShareLink() {
  if (!state.imageDataUrl) {
    shareLinkInput.value = "";
    return;
  }

  if (!isPubliclyHosted()) {
    shareLinkInput.value = "";
    shareLinkInput.placeholder = "Publish this app publicly to create a shareable link";
    return;
  }

  const payload = {
    imageDataUrl: state.imageDataUrl,
    rows: state.rows,
    cols: state.cols,
    pieces: state.pieces,
  };

  const encoded = encodeURIComponent(JSON.stringify(payload));
  const baseUrl = window.location.href.split("#")[0];
  const link = `${baseUrl}#puzzle=${encoded}`;
  shareLinkInput.value = link;
}

function isPubliclyHosted() {
  const { protocol, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  return (protocol === "http:" || protocol === "https:") && !isLocalHost;
}

function createPuzzleFromCurrentOptions() {
  if (!state.imageDataUrl) {
    setStatus("Upload an image to create the puzzle");
    return;
  }

  state.rows = Number(rowsSelect.value) || 3;
  state.cols = Number(colsSelect.value) || 3;
  state.pieces = buildSolvedPieces();
  state.selectedIndex = null;
  shufflePieces();
}

function loadPuzzleFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith("#puzzle=")) {
    return;
  }

  try {
    const decoded = decodeURIComponent(hash.slice("#puzzle=".length));
    const data = JSON.parse(decoded);
    if (data && data.imageDataUrl) {
      applyPuzzleFromData(data);
      setStatus("Puzzle loaded from link", false);
    }
  } catch (error) {
    console.error("Puzzle link is invalid:", error);
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
shuffleBtn.addEventListener("click", shufflePieces);
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
