const canvas = document.getElementById('anim-canvas');
const ctx = canvas.getContext('2d');
let width, height;
const particles = [];
const numParticles = 80;
const umlInput = document.getElementById('umlInput');
const output = document.getElementById('output');
const downloadMenu = document.getElementById('downloadMenu');
const downloadTrigger = document.getElementById('downloadTrigger');
const downloadList = document.getElementById('downloadList');
const downloadLinks = downloadList ? downloadList.querySelectorAll('a[data-format]') : [];
const baseUrl = 'https://www.plantuml.com/plantuml';

function initCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  particles.length = 0;
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2
    });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#64748b';
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', initCanvas);
initCanvas();
animateParticles();

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

function renderDiagram() {
  const input = umlInput ? umlInput.value.trim() : '';
  console.log("📝 Code being rendered:", input);

  if (!input) {
    console.warn("⚠️ No UML input found.");
    output.innerHTML = `<p class="preview-placeholder">Paste PlantUML code to see the preview here.</p>`;
    if (downloadMenu) {
      downloadMenu.hidden = true;
    }
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
    console.log("✅ Diagram rendered successfully.");
  } catch (error) {
    output.innerHTML = `<p class="preview-placeholder">Something went wrong while rendering the diagram.</p>`;
    if (downloadMenu) {
      downloadMenu.hidden = true;
    }
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
    }
  });
}

if (umlInput) {
  umlInput.addEventListener('input', () => {
    renderDiagram();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const code = getCodeFromURL();
  console.log("🧠 Decoded code from URL:", code);
  if (code) {
    const textarea = document.getElementById('umlInput');
    textarea.value = code;
    console.log("✅ Textarea populated.");
    renderDiagram();
  } else {
    console.warn("⚠️ No 'code' parameter found.");
  }
});
