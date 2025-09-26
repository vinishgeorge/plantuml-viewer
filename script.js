const canvas = document.getElementById('anim-canvas');
const ctx = canvas.getContext('2d');
let width, height;
const particles = [];
const numParticles = 80;

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

function renderDiagram() {
  const input = document.getElementById('umlInput').value.trim();
  console.log("📝 Code being rendered:", input);
  if (!input) {
    console.warn("⚠️ No UML input found.");
    return;
  }

  try {
    const encoded = plantumlEncoder.encode(input);
    const baseUrl = 'https://www.plantuml.com/plantuml';
    const formats = ['png', 'svg', 'txt'];

    let html = `<h2 class="text-2xl font-semibold mt-6">📷 Preview</h2>`;
    html += `<img class="diagram-img" src="${baseUrl}/png/${encoded}" alt="UML Diagram" />`;

    html += `<div class="links mt-4"><h3 class="text-xl">⬇️ Download / Export</h3><ul class="space-y-1">`;
    formats.forEach(fmt => {
      html += `<li><a href="${baseUrl}/${fmt}/${encoded}" target="_blank">Download ${fmt.toUpperCase()}</a></li>`;
    });
    html += `</ul></div>`;

    document.getElementById('output').innerHTML = html;
    console.log("✅ Diagram rendered successfully.");
  } catch (error) {
    console.error("❌ Error rendering diagram:", error);
  }
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
