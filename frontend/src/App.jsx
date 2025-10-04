import React, { useState, useEffect } from 'react';
import Orb from './Orb';
import './App.css';
import { motion } from 'framer-motion';
import { MdOutlineSpaceBar } from 'react-icons/md';
import LiquidGlass from './LiquidGlass';
import DarkVeil from './DarkVeil';
import ModelViewer from './ModelViewer';
import Workflow from './Workflow'; // Import the new component

function App() {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentView, setCurrentView] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && currentView !== '#workflow') {
        e.preventDefault();
        setIsFadingOut(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView]);

  if (currentView === '#workflow') {
    return <Workflow />;
  }

  return (
    <motion.div
      className="App"
      initial={{ opacity: 0 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 1 }}
      onAnimationComplete={() => {
        if (isFadingOut) {
          window.location.hash = 'workflow';
        }
      }}
    >
      <div className="dark-veil-background">
        <DarkVeil
          speed={1.3}
          hueShift={35}
          noiseIntensity={0.2}
          scanlineFrequency={5}
          scanlineIntensity={0.51}
          warpAmount={5}
        />
      </div>
      <div className="left-panel">
        <Orb hoverIntensity={0.8}>
          <ModelViewer
            url="/pill.glb"
            width={400}
            height={400}
            defaultZoom={1.5}
            autoRotate
            enableManualRotation={true}
            enableManualZoom={true}
            showScreenshotButton={false}
            environmentPreset="none"
            keyLightIntensity={2.5}
            rimLightIntensity={1.5}
            enableMouseParallax
            enableHoverRotation
          />
        </Orb>
      </div>
      <div className="right-panel">
        <div className="content">
          <h1 className="title">CLARITY</h1>
          <p className="subtitle">a rapid pill identification system</p>
          <motion.div
            className="prompt"
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
            }}
          >
            <LiquidGlass>
              press <MdOutlineSpaceBar /> to continue
            </LiquidGlass>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default App;
