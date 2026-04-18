const yearTarget = document.querySelector("[data-current-year]");

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

const experienceCards = [...document.querySelectorAll(".experience-card")];

experienceCards.forEach((card) => {
  card.open = false;
});

const canvas = document.querySelector("[data-pattern-canvas]");
const refreshButton = document.querySelector("[data-pattern-refresh]");

if (canvas instanceof HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const tau = Math.PI * 2;

  const hexToRgba = (hex, alpha) => {
    const normalized = hex.replace("#", "");
    const value = Number.parseInt(normalized, 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const createNoise2D = () => {
    const permutation = Array.from({ length: 256 }, (_, index) => index);

    for (let index = permutation.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random(0, index + 1));
      [permutation[index], permutation[swapIndex]] = [
        permutation[swapIndex],
        permutation[index],
      ];
    }

    const perm = [...permutation, ...permutation];

    const fade = (value) => value * value * value * (value * (value * 6 - 15) + 10);
    const lerp = (start, end, amount) => start + amount * (end - start);
    const grad = (hash, x, y) => {
      switch (hash & 3) {
        case 0:
          return x + y;
        case 1:
          return -x + y;
        case 2:
          return x - y;
        default:
          return -x - y;
      }
    };

    return (x, y) => {
      const floorX = Math.floor(x) & 255;
      const floorY = Math.floor(y) & 255;
      const localX = x - Math.floor(x);
      const localY = y - Math.floor(y);
      const fadeX = fade(localX);
      const fadeY = fade(localY);

      const aa = perm[perm[floorX] + floorY];
      const ab = perm[perm[floorX] + floorY + 1];
      const ba = perm[perm[floorX + 1] + floorY];
      const bb = perm[perm[floorX + 1] + floorY + 1];

      const blendA = lerp(grad(aa, localX, localY), grad(ba, localX - 1, localY), fadeX);
      const blendB = lerp(
        grad(ab, localX, localY - 1),
        grad(bb, localX - 1, localY - 1),
        fadeX,
      );

      return lerp(blendA, blendB, fadeY);
    };
  };

  const resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const paintBase = () => {
    context.clearRect(0, 0, width, height);

    const wash = context.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, "rgba(14, 7, 19, 0.58)");
    wash.addColorStop(0.42, "rgba(27, 12, 31, 0.24)");
    wash.addColorStop(1, "rgba(5, 2, 8, 0.62)");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);

    const accentGlow = context.createRadialGradient(
      width * random(0.16, 0.84),
      height * random(0.14, 0.82),
      0,
      width * random(0.16, 0.84),
      height * random(0.14, 0.82),
      Math.max(width, height) * random(0.3, 0.5),
    );
    accentGlow.addColorStop(0, "rgba(112, 41, 99, 0.32)");
    accentGlow.addColorStop(1, "rgba(112, 41, 99, 0)");
    context.fillStyle = accentGlow;
    context.fillRect(0, 0, width, height);
  };

  const drawLayeredWaves = () => {
    const layers = Math.floor(random(6, 10));
    const palette = [
      hexToRgba("#702963", 0.24),
      hexToRgba("#8e3e7d", 0.18),
      hexToRgba("#bb6aaa", 0.12),
      hexToRgba("#52204a", 0.28),
    ];

    for (let index = 0; index < layers; index += 1) {
      const baseY = height * random(0.12, 0.92);
      const amplitudeA = random(16, 70);
      const amplitudeB = random(10, 44);
      const frequencyA = random(0.003, 0.01);
      const frequencyB = random(0.005, 0.014);
      const phaseA = random(0, tau);
      const phaseB = random(0, tau);

      context.beginPath();
      context.moveTo(-80, height + 80);

      for (let x = -80; x <= width + 80; x += 12) {
        const y =
          baseY +
          Math.sin(x * frequencyA + phaseA) * amplitudeA +
          Math.cos(x * frequencyB + phaseB) * amplitudeB;
        context.lineTo(x, y);
      }

      context.lineTo(width + 80, height + 80);
      context.closePath();
      context.fillStyle = pick(palette);
      context.fill();

      context.beginPath();
      for (let x = -80; x <= width + 80; x += 12) {
        const y =
          baseY +
          Math.sin(x * frequencyA + phaseA) * amplitudeA +
          Math.cos(x * frequencyB + phaseB) * amplitudeB;
        if (x === -80) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.strokeStyle = hexToRgba(pick(["#702963", "#8e3e7d", "#bb6aaa"]), random(0.22, 0.42));
      context.lineWidth = random(1.2, 2.8);
      context.stroke();
    }
  };

  const drawPerlinNoiseField = () => {
    const noise2D = createNoise2D();
    const cell = random(10, 16);
    const scale = random(0.0035, 0.007);
    const thresholds = [0.22, 0.36, 0.5, 0.64, 0.78];
    const colors = ["#52204a", "#702963", "#8e3e7d", "#bb6aaa", "#f7eff8"];

    for (let y = -cell; y < height + cell; y += cell) {
      for (let x = -cell; x < width + cell; x += cell) {
        const noiseValue = (noise2D(x * scale, y * scale) + 1) / 2;
        let colorIndex = thresholds.findIndex((threshold) => noiseValue < threshold);

        if (colorIndex === -1) {
          colorIndex = colors.length - 1;
        }

        const size = cell * random(0.82, 1.24);
        const alpha = 0.08 + noiseValue * 0.2;
        context.fillStyle = hexToRgba(colors[colorIndex], alpha);
        context.fillRect(x, y, size, size);

        if (noiseValue > 0.68) {
          context.strokeStyle = hexToRgba("#f7eff8", 0.08 + noiseValue * 0.07);
          context.lineWidth = 0.8;
          context.strokeRect(x, y, size, size);
        }
      }
    }
  };

  const drawVoronoi = () => {
    const seeds = Array.from({ length: Math.floor(random(12, 20)) }, () => ({
      x: random(0, width),
      y: random(0, height),
      color: pick(["#52204a", "#702963", "#8e3e7d", "#bb6aaa"]),
    }));
    const step = random(10, 16);

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        let nearestDistance = Number.POSITIVE_INFINITY;
        let secondNearestDistance = Number.POSITIVE_INFINITY;
        let nearestSeed = seeds[0];

        for (const seed of seeds) {
          const dx = seed.x - x;
          const dy = seed.y - y;
          const distance = dx * dx + dy * dy;

          if (distance < nearestDistance) {
            secondNearestDistance = nearestDistance;
            nearestDistance = distance;
            nearestSeed = seed;
          } else if (distance < secondNearestDistance) {
            secondNearestDistance = distance;
          }
        }

        const edgeDelta = Math.sqrt(secondNearestDistance) - Math.sqrt(nearestDistance);
        const alpha = edgeDelta < step * 0.65 ? 0.08 : 0.18;
        context.fillStyle = hexToRgba(nearestSeed.color, alpha);
        context.fillRect(x, y, step + 1, step + 1);

        if (edgeDelta < step * 0.9) {
          context.fillStyle = hexToRgba("#f7eff8", 0.045);
          context.fillRect(x, y, step + 1, step + 1);
        }
      }
    }

    seeds.forEach((seed) => {
      const glow = context.createRadialGradient(seed.x, seed.y, 0, seed.x, seed.y, 34);
      glow.addColorStop(0, hexToRgba(seed.color, 0.26));
      glow.addColorStop(1, hexToRgba(seed.color, 0));
      context.fillStyle = glow;
      context.beginPath();
      context.arc(seed.x, seed.y, 34, 0, tau);
      context.fill();
    });
  };

  const drawParticleFlowField = () => {
    const noise2D = createNoise2D();
    const particles = Math.floor(random(240, 420));
    const steps = Math.floor(random(26, 40));
    const scale = random(0.0018, 0.0036);
    const speed = random(4.5, 8.5);

    context.lineCap = "round";
    context.lineJoin = "round";

    for (let particleIndex = 0; particleIndex < particles; particleIndex += 1) {
      let x = random(-40, width + 40);
      let y = random(-40, height + 40);

      context.beginPath();
      context.moveTo(x, y);

      for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
        const noiseValue = noise2D(x * scale, y * scale);
        const angle =
          noiseValue * tau * 1.75 +
          Math.sin((x + y) * 0.0012) * 0.9 +
          Math.cos((x - y) * 0.0015) * 0.55;

        x += Math.cos(angle) * speed;
        y += Math.sin(angle) * speed;
        context.lineTo(x, y);
      }

      context.strokeStyle = pick([
        hexToRgba("#702963", random(0.08, 0.18)),
        hexToRgba("#8e3e7d", random(0.08, 0.16)),
        hexToRgba("#bb6aaa", random(0.05, 0.12)),
      ]);
      context.lineWidth = random(0.9, 2.2);
      context.stroke();
    }
  };

  const patterns = [
    drawLayeredWaves,
    drawPerlinNoiseField,
    drawVoronoi,
    drawParticleFlowField,
  ];

  const renderPattern = () => {
    if (!context) {
      return;
    }

    resizeCanvas();
    paintBase();
    pick(patterns)();
  };

  let resizeToken = 0;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeToken);
    resizeToken = window.setTimeout(renderPattern, 120);
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", renderPattern);
  }

  renderPattern();
}
