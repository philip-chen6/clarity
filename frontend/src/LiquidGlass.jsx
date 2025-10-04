import React, { useEffect, useRef } from 'react';
import './LiquidGlass.css';

const LiquidGlass = ({ children }) => {
  const glassRef = useRef(null);

  useEffect(() => {
    const currentRef = glassRef.current;
    const handleMouseMove = (e) => {
      if (!currentRef) return;
      const rect = currentRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top; // Corrected from 'top' to 'rect.top'
      const specular = currentRef.querySelector('.glass-specular');
      if (specular) {
        specular.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0) 60%)`;
      }
    };
    const handleMouseLeave = () => {
      if (!currentRef) return;
      const specular = currentRef.querySelector('.glass-specular');
      if (specular) {
        specular.style.background = 'none';
      }
    };
    currentRef?.addEventListener('mousemove', handleMouseMove);
    currentRef?.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      currentRef?.removeEventListener('mousemove', handleMouseMove);
      currentRef?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="glass-search-container">
      <div className="glass-search" ref={glassRef}>
        <div className="glass-filter" />
        <div className="glass-overlay" />
        <div className="glass-specular" />
        <div className="glass-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LiquidGlass;
