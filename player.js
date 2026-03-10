document.addEventListener('DOMContentLoaded', () => {
  let steps = [];
  let demoTitle = "";
  let currentIndex = 0;

  const uploadScreen = document.getElementById('upload-screen');
  const playerScreen = document.getElementById('player-screen');
  const jsonUpload = document.getElementById('jsonUpload');
  
  const screenshotEl = document.getElementById('screenshot');
  const annContainer = document.getElementById('annotations-container');
  const sidebarEl = document.getElementById('sidebar');
  const demoTitleDisplay = document.getElementById('demoTitleDisplay');
  const stepCounterEl = document.getElementById('stepCounter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressBar = document.getElementById('progressBar');

  // Enterprise: Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (playerScreen.style.display !== 'flex') return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if(currentIndex < steps.length - 1) renderStep(currentIndex + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); if(currentIndex > 0) renderStep(currentIndex - 1); }
  });

  // Enterprise: Right-Click to Go Back
  document.addEventListener('contextmenu', (e) => {
    if (playerScreen.style.display === 'flex') {
      e.preventDefault(); 
      if (currentIndex > 0) renderStep(currentIndex - 1);
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const demoFile = urlParams.get('demo');

  if (demoFile) {
    uploadScreen.innerHTML = "<h2>Loading demo...</h2>";
    fetch(demoFile).then(res => res.json()).then(data => handleLoadedData(data))
      .catch(err => { console.error(err); uploadScreen.innerHTML = "<h2>Error loading demo file.</h2>"; });
  }

  jsonUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try { handleLoadedData(JSON.parse(e.target.result)); } catch (error) { alert("Invalid JSON file."); }
    };
    reader.readAsText(file);
  });

  function handleLoadedData(data) {
    if (Array.isArray(data)) { steps = data; demoTitle = "Interactive Demo"; } 
    else { steps = data.steps || []; demoTitle = data.title || "Interactive Demo"; }
    
    if (steps.length > 0) {
      demoTitleDisplay.innerText = demoTitle;
      uploadScreen.style.display = 'none'; 
      playerScreen.style.display = 'flex'; 
      renderThumbnails();
      renderStep(0); 
    }
  }

  function renderThumbnails() {
    sidebarEl.innerHTML = '';
    steps.forEach((step, index) => {
      const thumb = document.createElement('div');
      thumb.className = `thumbnail ${index === currentIndex ? 'active' : ''}`;
      thumb.innerHTML = `<img src="${step.screenshotBase64}" alt="Step ${index + 1}"><div class="thumb-label">Step ${index + 1}</div>`;
      thumb.addEventListener('click', () => renderStep(index));
      sidebarEl.appendChild(thumb);
    });
  }

  function buildAnnotationsDOM() {
    const step = steps[currentIndex];
    annContainer.innerHTML = ''; 
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "connector-canvas");
    annContainer.appendChild(svg);

    step.annotations.forEach(ann => {
      const hasTitle = ann.title && ann.title.trim() !== "";
      const hasText = ann.text && ann.text.trim() !== "";
      
      let tooltip;
      if(hasTitle || hasText) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("data-id", ann.id); line.setAttribute("stroke", "rgba(255, 152, 0, 0.8)");
        line.setAttribute("stroke-width", "2"); line.setAttribute("stroke-dasharray", "4");
        svg.appendChild(line);

        tooltip = document.createElement("div");
        tooltip.className = "tooltip"; tooltip.setAttribute("data-id", ann.id);
        
        let html = '';
        if (hasTitle) html += `<div class="tooltip-title">${ann.title}</div>`;
        if (hasText) html += `<div class="tooltip-content">${ann.text}</div>`;
        tooltip.innerHTML = html;
        
        if (ann.hoverOnly) {
           tooltip.style.opacity = '0'; tooltip.style.pointerEvents = 'none'; line.style.opacity = '0';
        }
        annContainer.appendChild(tooltip);
      }

      const hotspot = document.createElement("div");
      hotspot.className = `hotspot ${ann.isTrigger ? 'trigger' : ''}`;
      hotspot.setAttribute("data-id", ann.id);
      
      if (ann.isSlide) hotspot.innerHTML = `<div class="slide-arrow-wrapper" style="transform: rotate(${ann.slideAngle || 0}deg);"><div class="slide-arrow">⇛</div></div>`;
      if (ann.isTrigger) hotspot.addEventListener('click', () => renderStep(currentIndex + 1));
      
      if (ann.hoverOnly && tooltip) {
        hotspot.addEventListener('mouseenter', () => { tooltip.style.opacity = '1'; svg.querySelector(`line[data-id="${ann.id}"]`).style.opacity = '1'; });
        hotspot.addEventListener('mouseleave', () => { tooltip.style.opacity = '0'; svg.querySelector(`line[data-id="${ann.id}"]`).style.opacity = '0'; });
      }
      annContainer.appendChild(hotspot);
    });
  }

  function updatePositions() {
    const step = steps[currentIndex];
    if (!step) return;
    const scaleX = screenshotEl.clientWidth / screenshotEl.naturalWidth;
    const scaleY = screenshotEl.clientHeight / screenshotEl.naturalHeight;
    const scale = Math.min(scaleX, scaleY);

    step.annotations.forEach(ann => {
      const hx = ann.x * scaleX; const hy = ann.y * scaleY;
      let tx, ty;
      const scaledSize = (ann.radius || 25) * 2 * scale;
      const baseFontSize = Math.max(11, 14 * scale); 

      const hotspot = annContainer.querySelector(`.hotspot[data-id="${ann.id}"]`);
      const tooltip = annContainer.querySelector(`.tooltip[data-id="${ann.id}"]`);
      const line = annContainer.querySelector(`line[data-id="${ann.id}"]`);

      if(hotspot) { 
        hotspot.style.left = `${hx}px`; hotspot.style.top = `${hy}px`; 
        hotspot.style.width = `${scaledSize}px`; hotspot.style.height = `${scaledSize}px`;
        hotspot.style.transform = 'translate(-50%, -50%)'; // Center dot natively
        const arrow = hotspot.querySelector('.slide-arrow');
        if (arrow) { arrow.style.fontSize = `${scaledSize * 1.3}px`; arrow.style.left = `${scaledSize * 0.7}px`; arrow.style.top = `-${scaledSize * 0.8}px`; }
      }

      if(tooltip) {
        tooltip.style.width = 'fit-content';
        tooltip.style.height = 'auto';
        tooltip.style.maxWidth = `${Math.min(380 * scale, window.innerWidth * 0.8)}px`; 
        tooltip.style.fontSize = `${baseFontSize}px`;
        const titleEl = tooltip.querySelector('.tooltip-title');
        if(titleEl) titleEl.style.fontSize = `${baseFontSize * 1.15}px`;

        // Enterprise: Smart Snapping Logic
        if (ann.hoverOnly) {
           const tWidth = tooltip.offsetWidth || 280;
           const tHeight = tooltip.offsetHeight || 100;
           
           let snapX = hx + (scaledSize / 2) + 20; 
           if (snapX + tWidth > screenshotEl.clientWidth) {
              snapX = hx - (scaledSize / 2) - 20 - tWidth; // Flip left
           }
           let snapY = hy - (tHeight / 2); 
           if (snapY < 10) snapY = 10; 
           if (snapY + tHeight > screenshotEl.clientHeight) snapY = screenshotEl.clientHeight - tHeight - 10; 
           
           tx = snapX; ty = snapY;
           tooltip.style.transform = 'none'; 
           if(line) line.style.display = 'none'; 
        } else {
           tx = hx + (ann.ox * scaleX); ty = hy + (ann.oy * scaleY);
           tooltip.style.transform = 'translateX(-50%)'; 
           if(line) line.style.display = 'block';
        }

        tooltip.style.left = `${tx}px`; tooltip.style.top = `${ty}px`;
        if(line && !ann.hoverOnly) {
          line.setAttribute('x1', hx); line.setAttribute('y1', hy); line.setAttribute('x2', tx); line.setAttribute('y2', ty);
        }
      }
    });
  }

  function renderStep(index) {
    if (index < 0 || index >= steps.length) return;
    
    // Enterprise: Progress Bar Animation
    const progressPercent = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 100;
    progressBar.style.width = `${progressPercent}%`;

    currentIndex = index; const currentStep = steps[currentIndex];
    stepCounterEl.innerText = `Step ${currentIndex + 1} of ${steps.length}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === steps.length - 1;
    Array.from(sidebarEl.children).forEach((child, i) => child.classList.toggle('active', i === currentIndex));

    // Smooth transition
    annContainer.style.opacity = '0';
    screenshotEl.style.opacity = '0';
    setTimeout(() => {
      screenshotEl.src = currentStep.screenshotBase64;
      screenshotEl.onload = () => { 
        buildAnnotationsDOM(); 
        updatePositions(); 
        screenshotEl.style.opacity = '1'; 
        annContainer.style.opacity = '1';
      };
    }, 150);
  }

  window.addEventListener('resize', updatePositions); 
  prevBtn.addEventListener('click', () => renderStep(currentIndex - 1));
  nextBtn.addEventListener('click', () => renderStep(currentIndex + 1));

  let dragData = null; let animationFrameId = null;
  annContainer.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; 
    const tooltip = e.target.closest('.tooltip');
    if (tooltip) {
      const id = tooltip.getAttribute('data-id');
      const ann = steps[currentIndex].annotations.find(a => a.id === id);
      if (ann.hoverOnly) return; // Smart snap ignores manual drags
      const line = annContainer.querySelector(`line[data-id="${id}"]`);
      dragData = { id: id, startX: e.clientX, startY: e.clientY, initialLeft: parseFloat(tooltip.style.left), initialTop: parseFloat(tooltip.style.top), tooltipEl: tooltip, lineEl: line, hasMoved: false };
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragData) return;
    const dx = e.clientX - dragData.startX; const dy = e.clientY - dragData.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragData.hasMoved = true;
    
    if (dragData.hasMoved) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (!dragData) return;
        const newLeft = dragData.initialLeft + dx; const newTop = dragData.initialTop + dy;
        dragData.tooltipEl.style.left = `${newLeft}px`; dragData.tooltipEl.style.top = `${newTop}px`;
        if (dragData.lineEl) { dragData.lineEl.setAttribute('x2', newLeft); dragData.lineEl.setAttribute('y2', newTop); }
      });
    }
  });

  document.addEventListener('mouseup', () => { dragData = null; });
});
