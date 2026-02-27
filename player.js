document.addEventListener('DOMContentLoaded', () => {
  let steps = [];
  let currentIndex = 0;

  const uploadScreen = document.getElementById('upload-screen');
  const playerScreen = document.getElementById('player-screen');
  const jsonUpload = document.getElementById('jsonUpload');
  
  const screenshotEl = document.getElementById('screenshot');
  const hotspotEl = document.getElementById('hotspot');
  const tooltipEl = document.getElementById('tooltip');
  const stepDescriptionEl = document.getElementById('stepDescription');
  const connectorLine = document.getElementById('connector-line');
  const stepCounterEl = document.getElementById('stepCounter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // ==========================================
  // NEW: Auto-Load from URL Parameter
  // ==========================================
  const urlParams = new URLSearchParams(window.location.search);
  const demoFile = urlParams.get('demo');

  if (demoFile) {
    // If a URL parameter exists, hide upload screen and fetch the file
    uploadScreen.innerHTML = "<h2>Loading demo...</h2>";
    fetch(demoFile)
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(data => {
        steps = data;
        if (steps.length > 0) {
          uploadScreen.style.display = 'none';
          playerScreen.style.display = 'flex';
          renderStep(0);
        }
      })
      .catch(error => {
        console.error("Error loading demo:", error);
        uploadScreen.innerHTML = "<h2>Error loading demo file. Make sure the filename is correct.</h2>";
      });
  }

  // ==========================================
  // Manual File Upload (Fallback)
  // ==========================================
  jsonUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        steps = JSON.parse(e.target.result);
        if (steps.length > 0) {
          uploadScreen.style.display = 'none';
          playerScreen.style.display = 'flex';
          renderStep(0);
        } else { alert("The JSON file contains no recorded steps."); }
      } catch (error) {
        alert("Invalid JSON file."); console.error(error);
      }
    };
    reader.readAsText(file);
  });

  // ==========================================
  // Player Rendering Logic
  // ==========================================
  function updatePositions() {
    try {
      const step = steps[currentIndex];
      if (!step || !step.element) return;

      const scaleX = screenshotEl.clientWidth / screenshotEl.naturalWidth;
      const scaleY = screenshotEl.clientHeight / screenshotEl.naturalHeight;

      let hx = (step.customX !== undefined ? step.customX : (step.element.x + step.element.width / 2)) * scaleX;
      let hy = (step.customY !== undefined ? step.customY : (step.element.y + step.element.height / 2)) * scaleY;

      const tOffsetX = (step.tooltipOffsetX !== undefined ? step.tooltipOffsetX : 0) * scaleX;
      const tOffsetY = (step.tooltipOffsetY !== undefined ? step.tooltipOffsetY : 40) * scaleY;

      hotspotEl.style.left = `${hx}px`; hotspotEl.style.top = `${hy}px`;
      tooltipEl.style.left = `${hx + tOffsetX}px`; tooltipEl.style.top = `${hy + tOffsetY}px`;

      connectorLine.setAttribute('x1', hx); connectorLine.setAttribute('y1', hy);
      connectorLine.setAttribute('x2', hx + tOffsetX); connectorLine.setAttribute('y2', hy + tOffsetY);

      if (step.hideHotspot) {
        hotspotEl.style.display = 'none'; connectorLine.style.display = 'none';
      } else if (currentIndex !== steps.length - 1) {
        hotspotEl.style.display = 'block'; connectorLine.style.display = 'block';
      }
    } catch (error) { console.error("Error updating positions:", error); }
  }

  function renderStep(index) {
    if (index < 0 || index >= steps.length) return;
    currentIndex = index; const currentStep = steps[currentIndex];

    stepCounterEl.innerText = `Step ${currentIndex + 1} of ${steps.length}`;
    prevBtn.disabled = currentIndex === 0;
    
    stepDescriptionEl.innerHTML = currentStep.description || "";

    if (currentIndex === steps.length - 1) {
      nextBtn.disabled = true; hotspotEl.style.display = 'none'; 
      tooltipEl.style.display = 'none'; connectorLine.style.display = 'none';
    } else {
      nextBtn.disabled = false; tooltipEl.style.display = 'block';
    }

    screenshotEl.src = currentStep.screenshotBase64;
    screenshotEl.onload = updatePositions; 
  }

  window.addEventListener('resize', updatePositions); 

  prevBtn.addEventListener('click', () => renderStep(currentIndex - 1));
  nextBtn.addEventListener('click', () => renderStep(currentIndex + 1));
  hotspotEl.addEventListener('click', () => renderStep(currentIndex + 1));
});