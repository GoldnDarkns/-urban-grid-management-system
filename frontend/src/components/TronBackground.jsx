import { useEffect, useRef } from 'react';

export default function TronBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 20000));
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 1 + Math.random() * 2,
          color: Math.random() > 0.5 ? '#00ff88' : '#00d4ff'
        });
      }
    };

    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      };
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    const draw = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      const { width, height } = canvas;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Clear with dark gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#010409');
      bgGrad.addColorStop(0.5, '#020812');
      bgGrad.addColorStop(1, '#010409');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // ============ PERSPECTIVE GRID ============
      const horizonY = height * 0.35;
      const vanishX = width * 0.5 + (mx - 0.5) * 150;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 50);
      skyGrad.addColorStop(0, '#010409');
      skyGrad.addColorStop(0.8, '#051020');
      skyGrad.addColorStop(1, '#0a2040');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, horizonY + 50);

      // Horizontal perspective lines
      ctx.lineWidth = 1;
      for (let i = 0; i < 25; i++) {
        const progress = i / 25;
        const y = horizonY + Math.pow(progress, 1.3) * (height - horizonY);
        const alpha = 0.03 + progress * 0.15;
        
        ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical converging lines
      const numLines = 50;
      for (let i = -numLines; i <= numLines; i++) {
        const spacing = 50;
        const baseX = vanishX + i * spacing;
        const bottomX = baseX + (baseX - vanishX) * 4;
        const alpha = Math.max(0.02, 0.12 - Math.abs(i / numLines) * 0.1);
        
        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }

      // Horizon glow
      const horizonGlow = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 80);
      horizonGlow.addColorStop(0, 'rgba(0, 212, 255, 0)');
      horizonGlow.addColorStop(0.5, 'rgba(0, 212, 255, 0.2)');
      horizonGlow.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 30, width, 110);

      // ============ ANIMATED SCAN LINES ============
      for (let i = 0; i < 3; i++) {
        const scanY = ((time * 80 + i * 400) % (height - horizonY)) + horizonY;
        const gradient = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.25)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, scanY - 15, width, 30);
      }

      // ============ FLOATING PARTICLES ============
      particlesRef.current.forEach(p => {
        // Mouse attraction
        const dx = (mx * width) - p.x;
        const dy = (my * height) - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.vx += dx * 0.00005;
          p.vy += dy * 0.00005;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Boundary wrap
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Speed limit
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 1) {
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        // Draw particle glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
        glow.addColorStop(0, p.color + '60');
        glow.addColorStop(1, p.color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw particle core
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connect nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - dist / 120) * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // ============ STARS ============
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5 + time * 2) % width;
        const sy = (i * 73.3) % (horizonY * 0.9);
        const twinkle = Math.sin(time * 3 + i) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + twinkle * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + twinkle * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // ============ EDGE GLOWS ============
      // Left purple
      const leftGlow = ctx.createLinearGradient(0, 0, 250, 0);
      leftGlow.addColorStop(0, 'rgba(170, 102, 255, 0.15)');
      leftGlow.addColorStop(1, 'rgba(170, 102, 255, 0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, 250, height);

      // Right green
      const rightGlow = ctx.createLinearGradient(width, 0, width - 250, 0);
      rightGlow.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
      rightGlow.addColorStop(1, 'rgba(0, 255, 136, 0)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(width - 250, 0, 250, height);

      // ============ VIGNETTE ============
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="tron-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -100,
        pointerEvents: 'none',
        display: 'block'
      }}
    />
  );
}
