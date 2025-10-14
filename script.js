const canvas = document.getElementById('anim-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let columnCount;
let matrixDrops = [];
let matrixSpeeds = [];
const MATRIX_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789▒░▓≡+-*/<>♪◊◇◆◈☰☱☲☳☴☵☶☷';
const BASE_MATRIX_FONT_SIZE = 14;
const BASE_MATRIX_MIN_SPEED = 0.35;
const BASE_MATRIX_MAX_SPEED = 0.75;
let matrixFontSize = BASE_MATRIX_FONT_SIZE;
let matrixSpeedMultiplier = 1;

const themeMenuToggle = document.getElementById('themeMenuToggle');
const themeMenuPanel = document.getElementById('themeMenuPanel');
const themeOptionButtons = themeMenuPanel
  ? themeMenuPanel.querySelectorAll('[data-theme-option]')
  : [];
const THEME_STORAGE_KEY = 'plantuml-viewer-theme';

const THEMES = {
  'matrix-classic': {
    bodyClass: null,
    glyph: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.6)',
    shadowBlur: 12,
    fadeFill: 'rgba(0, 0, 0, 0.08)',
    background: 'rgba(0, 0, 0, 0.35)',
    resetThreshold: 0.975
  },
  'matrix-inverse': {
    bodyClass: 'theme-matrix-light',
    glyph: '#111827',
    glow: 'rgba(17, 24, 39, 0.18)',
    shadowBlur: 4,
    fadeFill: 'rgba(248, 250, 252, 0.18)',
    background: 'rgba(248, 250, 252, 0.5)',
    resetThreshold: 0.965
  }
};

let currentThemeKey = 'matrix-classic';
let currentTheme = THEMES[currentThemeKey];
let activeBodyThemeClass = null;
const umlInput = document.getElementById('umlInput');
const lineNumbers = document.getElementById('umlLineNumbers');
const output = document.getElementById('output');
const downloadMenu = document.getElementById('downloadMenu');
const downloadTrigger = document.getElementById('downloadTrigger');
const downloadList = document.getElementById('downloadList');
const downloadLinks = downloadList ? downloadList.querySelectorAll('a[data-format]') : [];
const baseUrl = 'https://www.plantuml.com/plantuml';
const openOverlayButton = document.getElementById('openOverlay');
const overlay = document.getElementById('diagramOverlay');
const overlayImage = document.getElementById('overlayImage');
const overlayCloseButton = document.getElementById('closeOverlay');
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const zoomResetButton = document.getElementById('zoomReset');
const fontSizeControl = document.getElementById('fontSizeControl');
const speedControl = document.getElementById('speedControl');
const fontSizeValueLabel = document.getElementById('fontSizeValue');
const speedValueLabel = document.getElementById('speedValue');

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

let currentDiagramSrc = '';
let currentDiagramAlt = 'Rendered UML diagram';
let overlayZoom = 1;

if (fontSizeControl) {
  const initialFontSize = Number(fontSizeControl.value);
  if (Number.isFinite(initialFontSize) && initialFontSize > 0) {
    matrixFontSize = initialFontSize;
  }
}

if (speedControl) {
  const initialSpeedMultiplier = Number(speedControl.value);
  if (Number.isFinite(initialSpeedMultiplier) && initialSpeedMultiplier > 0) {
    matrixSpeedMultiplier = initialSpeedMultiplier;
  }
}

function updateFontSizeLabel() {
  if (fontSizeValueLabel) {
    fontSizeValueLabel.textContent = `${Math.round(matrixFontSize)}px`;
  }
}

function formatSpeedMultiplier(value) {
  const fixed = value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${fixed || '1'}×`;
}

function updateSpeedLabel() {
  if (speedValueLabel) {
    speedValueLabel.textContent = formatSpeedMultiplier(matrixSpeedMultiplier);
  }
}

updateFontSizeLabel();
updateSpeedLabel();

function updateLineNumbers() {
  if (!umlInput || !lineNumbers) return;
  const value = umlInput.value;
  const lineCount = Math.max(1, value.split('\n').length);
  const markup = Array.from({ length: lineCount }, (_, index) => `<span>${index + 1}</span>`).join('');
  lineNumbers.innerHTML = markup;
  lineNumbers.scrollTop = umlInput.scrollTop;
}

updateLineNumbers();

function getRandomSpeed() {
  const baseRange =
    BASE_MATRIX_MIN_SPEED +
    Math.random() * (BASE_MATRIX_MAX_SPEED - BASE_MATRIX_MIN_SPEED);
  return baseRange * matrixSpeedMultiplier;
}

function updateActiveThemeButton() {
  themeOptionButtons.forEach(button => {
    const isActive = button.dataset.themeOption === currentThemeKey;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-checked', String(isActive));
  });
}

function applyTheme(key, { skipPersist = false, skipCanvasInit = false } = {}) {
  if (!THEMES[key]) {
    key = 'matrix-classic';
  }
  currentThemeKey = key;
  currentTheme = THEMES[currentThemeKey];

  if (activeBodyThemeClass) {
    document.body.classList.remove(activeBodyThemeClass);
  }

  if (currentTheme.bodyClass) {
    document.body.classList.add(currentTheme.bodyClass);
    activeBodyThemeClass = currentTheme.bodyClass;
  } else {
    activeBodyThemeClass = null;
  }
  updateActiveThemeButton();

  if (!skipPersist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentThemeKey);
    } catch (storageError) {
      console.warn('Unable to persist theme preference:', storageError);
    }
  }

  if (!skipCanvasInit) {
    initCanvas();
  }
}

function openThemeMenu() {
  if (!themeMenuPanel || !themeMenuToggle) return;
  themeMenuPanel.hidden = false;
  themeMenuToggle.setAttribute('aria-expanded', 'true');
  themeMenuPanel.focus();
}

function closeThemeMenu() {
  if (!themeMenuPanel || !themeMenuToggle) return;
  themeMenuPanel.hidden = true;
  themeMenuToggle.setAttribute('aria-expanded', 'false');
}

function toggleThemeMenu() {
  if (!themeMenuPanel) return;
  if (themeMenuPanel.hidden) {
    openThemeMenu();
  } else {
    closeThemeMenu();
  }
}

function initCanvas() {
  if (!canvas || !ctx) return;

  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  columnCount = Math.floor(width / matrixFontSize) + 1;
  matrixDrops = new Array(columnCount)
    .fill(0)
    .map(() => -Math.random() * 20);
  matrixSpeeds = new Array(columnCount)
    .fill(0)
    .map(() => getRandomSpeed());

  ctx.shadowBlur = 0;
  ctx.fillStyle = currentTheme.background;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${matrixFontSize}px 'IBM Plex Mono', 'Fira Code', monospace`;
}

function drawMatrixFrame() {
  if (!ctx) return;

  ctx.fillStyle = currentTheme.fadeFill;
  ctx.shadowBlur = 0;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = currentTheme.glyph;
  ctx.shadowColor = currentTheme.glow;
  ctx.shadowBlur = currentTheme.shadowBlur;

  for (let column = 0; column < columnCount; column++) {
    const character = MATRIX_CHARACTERS.charAt(
      Math.floor(Math.random() * MATRIX_CHARACTERS.length)
    );
    const x = column * matrixFontSize;
    const y = matrixDrops[column] * matrixFontSize;

    ctx.fillText(character, x, y);

    if (y > height && Math.random() > currentTheme.resetThreshold) {
      matrixDrops[column] = -Math.random() * 10;
      matrixSpeeds[column] = getRandomSpeed();
    } else {
      matrixDrops[column] = matrixDrops[column] + matrixSpeeds[column];
    }
  }

  requestAnimationFrame(drawMatrixFrame);
}

if (fontSizeControl) {
  fontSizeControl.addEventListener('input', event => {
    const nextFontSize = Number(event.target.value);
    if (!Number.isFinite(nextFontSize) || nextFontSize <= 0) {
      return;
    }
    matrixFontSize = nextFontSize;
    updateFontSizeLabel();
    initCanvas();
  });
}

if (speedControl) {
  speedControl.addEventListener('input', event => {
    const nextMultiplier = Number(event.target.value);
    if (!Number.isFinite(nextMultiplier) || nextMultiplier <= 0) {
      return;
    }
    const previousMultiplier = matrixSpeedMultiplier;
    matrixSpeedMultiplier = nextMultiplier;
    if (!Number.isFinite(previousMultiplier) || previousMultiplier <= 0) {
      matrixSpeeds = matrixSpeeds.map(() => getRandomSpeed());
    } else {
      const ratio = nextMultiplier / previousMultiplier;
      matrixSpeeds = matrixSpeeds.map(speed => speed * ratio);
    }
    updateSpeedLabel();
  });
}

const storedTheme = (() => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (storageError) {
    console.warn('Unable to read theme preference:', storageError);
    return null;
  }
})();

applyTheme(storedTheme || currentThemeKey, { skipPersist: true, skipCanvasInit: true });
initCanvas();
drawMatrixFrame();

window.addEventListener('resize', initCanvas);

if (themeMenuToggle) {
  themeMenuToggle.addEventListener('click', event => {
    event.stopPropagation();
    toggleThemeMenu();
  });
}

if (themeMenuPanel) {
  document.addEventListener('click', event => {
    if (!themeMenuPanel.hidden && !themeMenuPanel.contains(event.target) && event.target !== themeMenuToggle) {
      closeThemeMenu();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeThemeMenu();
      if (themeMenuToggle) {
        themeMenuToggle.focus();
      }
    }
  });
}

themeOptionButtons.forEach(button => {
  button.addEventListener('click', () => {
    const nextTheme = button.dataset.themeOption;
    if (nextTheme !== currentThemeKey) {
      applyTheme(nextTheme);
    }
    closeThemeMenu();
    if (themeMenuToggle) {
      themeMenuToggle.focus();
    }
  });
});

function getCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code');
  console.log("🔍 Raw URL search:", window.location.search);
  console.log("🔍 Extracted code param:", codeParam);
  return codeParam ? decodeURIComponent(codeParam) : '';
}

function closeDownloadDropdown() {
  if (!downloadList || !downloadTrigger) return;
  downloadList.hidden = true;
  downloadTrigger.setAttribute('aria-expanded', 'false');
}

function updateDownloadLinks(encoded) {
  downloadLinks.forEach(link => {
    const format = link.dataset.format;
    if (!format) return;
    link.href = `${baseUrl}/${format}/${encoded}`;
  });
}

function applyOverlayZoom(scale) {
  if (!overlayImage) return;
  overlayZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(scale)));
  overlayImage.style.transform = `scale(${overlayZoom})`;
}

function showOverlay() {
  if (!overlay || !overlayImage || !currentDiagramSrc) return;
  overlayImage.src = currentDiagramSrc;
  overlayImage.alt = currentDiagramAlt;
  overlay.hidden = false;
  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    applyOverlayZoom(1);
  });
}

function hideOverlay(immediate = false) {
  if (!overlay || overlay.hidden) return;

  const finalizeClose = () => {
    overlay.hidden = true;
    overlayImage.src = '';
    overlay.removeEventListener('transitionend', finalizeClose);
  };

  if (immediate) {
    overlay.classList.remove('is-visible');
    finalizeClose();
    return;
  }

  overlay.classList.remove('is-visible');
  overlay.addEventListener('transitionend', finalizeClose);
}

function renderDiagram() {
  const input = umlInput ? umlInput.value.trim() : '';
  console.log("📝 Code being rendered:", input);

  if (!input) {
    console.warn("⚠️ No UML input found.");
    output.innerHTML = `<p class="preview-placeholder">Paste PlantUML code to see the preview here.</p>`;
    if (downloadMenu) {
      downloadMenu.hidden = true;
    }
    if (openOverlayButton) {
      openOverlayButton.hidden = true;
    }
    currentDiagramSrc = '';
    hideOverlay(true);
    closeDownloadDropdown();
    return;
  }

  try {
    const encoded = plantumlEncoder.encode(input);
    const img = document.createElement('img');
    img.classList.add('diagram-img');
    img.src = `${baseUrl}/png/${encoded}`;
    img.alt = 'Rendered UML diagram';
    output.innerHTML = '';
    output.appendChild(img);

    if (downloadMenu) {
      downloadMenu.hidden = false;
    }
    updateDownloadLinks(encoded);
    closeDownloadDropdown();
    currentDiagramSrc = img.src;
    currentDiagramAlt = img.alt;
    if (openOverlayButton) {
      openOverlayButton.hidden = false;
    }
    console.log("✅ Diagram rendered successfully.");
  } catch (error) {
    output.innerHTML = `<p class="preview-placeholder">Something went wrong while rendering the diagram.</p>`;
    if (downloadMenu) {
      downloadMenu.hidden = true;
    }
    if (openOverlayButton) {
      openOverlayButton.hidden = true;
    }
    currentDiagramSrc = '';
    hideOverlay(true);
    closeDownloadDropdown();
    console.error("❌ Error rendering diagram:", error);
  }
}

if (downloadTrigger && downloadList && downloadMenu) {
  downloadTrigger.addEventListener('click', event => {
    event.stopPropagation();
    const isHidden = downloadList.hidden;
    downloadList.hidden = !isHidden ? true : false;
    downloadTrigger.setAttribute('aria-expanded', String(isHidden));
  });

  document.addEventListener('click', event => {
    if (!downloadList.hidden && !downloadMenu.contains(event.target)) {
      closeDownloadDropdown();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeDownloadDropdown();
      hideOverlay();
    }
  });
}

if (umlInput) {
  umlInput.addEventListener('input', () => {
    updateLineNumbers();
    renderDiagram();
  });

  umlInput.addEventListener('scroll', () => {
    if (lineNumbers) {
      lineNumbers.scrollTop = umlInput.scrollTop;
    }
  });
}

if (openOverlayButton) {
  openOverlayButton.addEventListener('click', showOverlay);
}

if (zoomInButton) {
  zoomInButton.addEventListener('click', () => {
    applyOverlayZoom(overlayZoom + ZOOM_STEP);
  });
}

if (zoomOutButton) {
  zoomOutButton.addEventListener('click', () => {
    applyOverlayZoom(overlayZoom - ZOOM_STEP);
  });
}

if (zoomResetButton) {
  zoomResetButton.addEventListener('click', () => {
    applyOverlayZoom(1);
  });
}

if (overlayCloseButton) {
  overlayCloseButton.addEventListener('click', () => hideOverlay());
}

if (overlay) {
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      hideOverlay();
    }
  });
}

if (output) {
  output.addEventListener('click', event => {
    if (event.target && event.target.classList.contains('diagram-img')) {
      showOverlay();
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const code = getCodeFromURL();
  console.log("🧠 Decoded code from URL:", code);
  if (code && umlInput) {
    umlInput.value = code;
    console.log("✅ Textarea populated.");
    renderDiagram();
  } else {
    console.warn("⚠️ No 'code' parameter found.");
  }
  updateLineNumbers();
});
