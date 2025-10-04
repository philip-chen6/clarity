import { useEffect, useRef } from 'react';
import './LiquidGlass.css';

const LiquidGlass = ({ children }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Adapted from the original JS files
    const handleMouseMove = (e) => {
      const { left, top, width, height } = container.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const mouseX = x / width;
      const mouseY = y / height;
      container.style.setProperty('--mouse-x', mouseX);
      container.style.setProperty('--mouse-y', mouseY);
    };

    const handleMouseLeave = () => {
      container.style.setProperty('--mouse-x', 0.5);
      container.style.setProperty('--mouse-y', 0.5);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Set initial state
    handleMouseLeave();

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="glass-container">
      <div className="glass-effect"></div>
      <div className="glass-content">{children}</div>
    </div>
  );
};

export default LiquidGlass;
