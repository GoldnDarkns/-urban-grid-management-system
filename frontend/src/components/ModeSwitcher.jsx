import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Cpu, MapPinned } from 'lucide-react';
import { useAppMode, getStoredMode } from '../utils/useAppMode';

export default function ModeSwitcher() {
  const { mode, setMode } = useAppMode();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [particles, setParticles] = useState([]);
  const [cityDrawingProgress, setCityDrawingProgress] = useState(0);
  
  // Always read from localStorage to ensure accuracy (single source of truth)
  const currentMode = getStoredMode();
  
  // Verify mode matches localStorage on every render
  useEffect(() => {
    if (currentMode !== mode) {
      // Force sync if mismatch detected
      setMode(currentMode);
    }
  }, [currentMode, mode, setMode]);

  const handleModeChange = (newMode) => {
    if (isTransitioning || newMode === currentMode) return;
    
    setIsTransitioning(true);
    setCityDrawingProgress(0);
    
    // Create particle explosion effect
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 300 - 150,
      y: Math.random() * 300 - 150,
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.4
    }));
    setParticles(newParticles);
    
    // Animate city drawing
    const drawInterval = setInterval(() => {
      setCityDrawingProgress(prev => {
        if (prev >= 100) {
          clearInterval(drawInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 20);
    
    // Trigger full-page transition with city drawing
    const transitionOverlay = document.createElement('div');
    transitionOverlay.className = 'mode-transition-overlay';
    transitionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${newMode === 'city' 
        ? 'radial-gradient(circle at center, rgba(0,255,136,0.98), rgba(0,212,255,0.9))' 
        : 'radial-gradient(circle at center, rgba(170,102,255,0.98), rgba(0,212,255,0.9))'};
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;
    
    // City SVG drawing container
    const cityContainer = document.createElement('div');
    cityContainer.className = 'city-drawing-container';
    cityContainer.style.cssText = `
      width: 500px;
      height: 350px;
      position: relative;
      margin-bottom: 40px;
    `;
    
    // Create SVG for city drawing
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '500');
    svg.setAttribute('height', '350');
    svg.setAttribute('viewBox', '0 0 500 350');
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    
    // Create defs for filters and gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Strong glow filter for city outline
    const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glowFilter.setAttribute('id', 'city-glow');
    glowFilter.setAttribute('x', '-100%');
    glowFilter.setAttribute('y', '-100%');
    glowFilter.setAttribute('width', '300%');
    glowFilter.setAttribute('height', '300%');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '6');
    feGaussianBlur.setAttribute('result', 'coloredBlur');
    
    const feColorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    feColorMatrix.setAttribute('in', 'coloredBlur');
    feColorMatrix.setAttribute('type', 'matrix');
    feColorMatrix.setAttribute('values', newMode === 'city' 
      ? '0 0 0 0 0  0 1 0.5 0 0  0 0.5 1 0 0  0 0 0 1.5 0'
      : '1 0 0.6 0 0  0 0.4 1 0 0  0 0 0 1.5 0  0 0 0 1 0');
    feColorMatrix.setAttribute('result', 'coloredBlur');
    
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    
    glowFilter.appendChild(feGaussianBlur);
    glowFilter.appendChild(feColorMatrix);
    glowFilter.appendChild(feMerge);
    defs.appendChild(glowFilter);
    
    // Gradient for city fill (darker, more visible)
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'city-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', newMode === 'city' ? 'rgba(0,255,136,0.4)' : 'rgba(170,102,255,0.4)');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', newMode === 'city' ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.2)');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    
    svg.appendChild(defs);
    
    // City skyline path (more detailed and visible) - DARKER COLORS
    const cityPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cityPath.setAttribute('d', `
      M 60 300 L 60 240 L 80 240 L 80 200 L 100 200 L 100 260 L 120 260 L 120 160 L 140 160 L 140 240 L 160 240 L 160 190 L 180 190 L 180 280 L 200 280 L 200 170 L 220 170 L 220 250 L 240 250 L 240 200 L 260 200 L 260 230 L 280 230 L 280 140 L 300 140 L 300 220 L 320 220 L 320 180 L 340 180 L 340 300 L 360 300 L 360 210 L 380 210 L 380 270 L 400 270 L 400 190 L 420 190 L 420 300 L 440 300 L 440 220 L 440 300 L 60 300 Z
    `);
    // Use much darker, more visible colors
    cityPath.setAttribute('fill', 'url(#city-gradient)');
    cityPath.setAttribute('stroke', newMode === 'city' ? '#00ff88' : '#aa66ff');
    cityPath.setAttribute('stroke-width', '8'); // Much thicker stroke
    cityPath.setAttribute('stroke-linecap', 'round');
    cityPath.setAttribute('stroke-linejoin', 'round');
    cityPath.setAttribute('stroke-dasharray', '1200');
    cityPath.setAttribute('stroke-dashoffset', '1200');
    cityPath.setAttribute('filter', 'url(#city-glow)');
    cityPath.style.transition = 'stroke-dashoffset 2s ease-out';
    svg.appendChild(cityPath);
    
    // Add a darker outline layer for extra visibility
    const cityOutline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cityOutline.setAttribute('d', `
      M 60 300 L 60 240 L 80 240 L 80 200 L 100 200 L 100 260 L 120 260 L 120 160 L 140 160 L 140 240 L 160 240 L 160 190 L 180 190 L 180 280 L 200 280 L 200 170 L 220 170 L 220 250 L 240 250 L 240 200 L 260 200 L 260 230 L 280 230 L 280 140 L 300 140 L 300 220 L 320 220 L 320 180 L 340 180 L 340 300 L 360 300 L 360 210 L 380 210 L 380 270 L 400 270 L 400 190 L 420 190 L 420 300 L 440 300 L 440 220 L 440 300 L 60 300 Z
    `);
    cityOutline.setAttribute('fill', 'none');
    cityOutline.setAttribute('stroke', '#000000'); // Black outline for maximum contrast
    cityOutline.setAttribute('stroke-width', '10');
    cityOutline.setAttribute('stroke-linecap', 'round');
    cityOutline.setAttribute('stroke-linejoin', 'round');
    cityOutline.setAttribute('stroke-dasharray', '1200');
    cityOutline.setAttribute('stroke-dashoffset', '1200');
    cityOutline.setAttribute('opacity', '0.6');
    cityOutline.style.transition = 'stroke-dashoffset 2s ease-out';
    svg.insertBefore(cityOutline, cityPath); // Insert before so it's behind
    
    cityContainer.appendChild(svg);
    
    const modeText = document.createElement('div');
    modeText.className = 'mode-transition-text';
    modeText.style.cssText = `
      font-family: var(--font-display);
      font-size: 3.5rem;
      font-weight: 900;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      text-shadow: 
        0 0 20px rgba(0,0,0,0.8),
        0 0 40px rgba(0,0,0,0.6),
        2px 2px 4px rgba(0,0,0,0.9);
      margin-top: 30px;
      background: rgba(255,255,255,0.1);
      padding: 20px 40px;
      border-radius: 12px;
      border: 3px solid rgba(0,0,0,0.3);
    `;
    modeText.textContent = newMode === 'city' ? 'CITY LIVE' : 'SIMULATED';
    
    transitionOverlay.appendChild(cityContainer);
    transitionOverlay.appendChild(modeText);
    document.body.appendChild(transitionOverlay);
    
    // Animate overlay and city drawing
    setTimeout(() => {
      transitionOverlay.style.opacity = '1';
      transitionOverlay.style.transition = 'opacity 0.3s ease-out';
      
      // Animate city drawing - animate both outline and main path
      setTimeout(() => {
        cityPath.style.strokeDashoffset = '0';
        cityOutline.style.strokeDashoffset = '0';
      }, 100);
    }, 10);
    
    // Change mode after animation starts
    setTimeout(() => {
      setMode(newMode);
    }, 200);
    
    // Remove overlay and trigger page update
    setTimeout(() => {
      transitionOverlay.style.opacity = '0';
      transitionOverlay.style.transition = 'opacity 0.4s ease-in';
      setTimeout(() => {
        document.body.removeChild(transitionOverlay);
        setIsTransitioning(false);
        setParticles([]);
        setCityDrawingProgress(0);
        clearInterval(drawInterval);
        window.dispatchEvent(new CustomEvent('ugms-mode-transition-complete', { detail: { mode: newMode } }));
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }, 400);
    }, 2000); // Longer duration to show city drawing
  };

  const isCity = currentMode === 'city';

  return (
    <div className="mode-switcher-wrap">
      <div className="mode-buttons-container">
        <AnimatePresence mode="wait">
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              className="mode-particle"
              initial={{ 
                x: 0, 
                y: 0, 
                opacity: 1, 
                scale: 0.5 
              }}
              animate={{ 
                x: particle.x, 
                y: particle.y, 
                opacity: 0, 
                scale: 0 
              }}
              transition={{ 
                delay: particle.delay,
                duration: particle.duration,
                ease: "easeOut"
              }}
            />
          ))}
        </AnimatePresence>

        {/* City Live Button */}
        <motion.button
          type="button"
          className={`mode-button mode-button-city ${isCity ? 'active' : ''}`}
          onClick={() => handleModeChange('city')}
          disabled={isTransitioning || isCity}
          whileHover={!isCity && !isTransitioning ? { scale: 1.05, y: -2 } : {}}
          whileTap={!isCity && !isTransitioning ? { scale: 0.95 } : {}}
          animate={{
            scale: isCity ? 1 : 0.95,
            opacity: isCity ? 1 : 0.5
          }}
          transition={{ duration: 0.2 }}
          title="Switch to City Live mode"
        >
          <MapPinned size={16} />
          <span>City Live</span>
          {isCity && (
            <motion.div
              className="mode-button-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>

        {/* Simulated Button */}
        <motion.button
          type="button"
          className={`mode-button mode-button-sim ${!isCity ? 'active' : ''}`}
          onClick={() => handleModeChange('sim')}
          disabled={isTransitioning || !isCity}
          whileHover={isCity && !isTransitioning ? { scale: 1.05, y: -2 } : {}}
          whileTap={isCity && !isTransitioning ? { scale: 0.95 } : {}}
          animate={{
            scale: !isCity ? 1 : 0.95,
            opacity: !isCity ? 1 : 0.5
          }}
          transition={{ duration: 0.2 }}
          title="Switch to Simulated mode"
        >
          <Cpu size={16} />
          <span>Simulated</span>
          {!isCity && (
            <motion.div
              className="mode-button-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>

      <style>{`
        .mode-switcher-wrap { 
          position: relative;
          z-index: 10;
        }
        
        .mode-buttons-container {
          position: relative;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .mode-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          border: 2px solid rgba(0, 212, 255, 0.3);
          background: rgba(5, 10, 20, 0.8);
          backdrop-filter: blur(20px);
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          user-select: none;
          min-width: 140px;
        }
        
        .mode-button:disabled {
          cursor: not-allowed;
        }
        
        .mode-button-city.active {
          background: linear-gradient(135deg, 
            rgba(0,255,136,0.95) 0%, 
            rgba(0,212,255,0.85) 100%
          );
          border-color: rgba(0,255,136,0.8);
          color: #000;
          font-weight: 700;
          box-shadow: 
            0 0 20px rgba(0,255,136,0.4),
            0 0 40px rgba(0,212,255,0.3),
            inset 0 0 20px rgba(255,255,255,0.2);
        }
        
        .mode-button-sim.active {
          background: linear-gradient(135deg, 
            rgba(170,102,255,0.95) 0%, 
            rgba(0,212,255,0.85) 100%
          );
          border-color: rgba(170,102,255,0.8);
          color: #000;
          font-weight: 700;
          box-shadow: 
            0 0 20px rgba(170,102,255,0.4),
            0 0 40px rgba(0,212,255,0.3),
            inset 0 0 20px rgba(255,255,255,0.2);
        }
        
        .mode-button:not(.active):hover:not(:disabled) {
          border-color: rgba(0, 255, 136, 0.5);
          background: rgba(5, 10, 20, 0.95);
          color: var(--text-primary);
        }
        
        .mode-button-glow {
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%);
          border-radius: 12px;
          pointer-events: none;
        }
        
        .mode-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: var(--accent-primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--accent-primary);
          z-index: 3;
          pointer-events: none;
        }
        
        .city-drawing-container {
          filter: drop-shadow(0 0 40px rgba(0,255,136,1)) drop-shadow(0 0 20px rgba(0,0,0,0.8));
          animation: city-pulse 2s ease-in-out infinite;
        }
        
        @keyframes city-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 40px rgba(0,255,136,1)) drop-shadow(0 0 20px rgba(0,0,0,0.8));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 60px rgba(0,255,136,1)) drop-shadow(0 0 30px rgba(0,0,0,1));
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
