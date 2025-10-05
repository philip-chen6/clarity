import React, { useState, useEffect } from 'react';
import Orb from './Orb';
import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
import { MdOutlineSpaceBar } from 'react-icons/md';
import LiquidGlass from './LiquidGlass';
import DarkVeil from './DarkVeil';
import ModelViewer from './ModelViewer';
import Workflow from './Workflow';
import Results from './Results';
import SplashCursor from './SplashCursor';
import LoadingScreen from './LoadingScreen';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentView, setCurrentView] = useState(window.location.hash);
  const [showContent, setShowContent] = useState(true); // Added from remote version

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    const handleKeyDown = (e) => {
      // Combined logic: works when not fading and not on workflow screen
      if (e.code === 'Space' && !isFadingOut && currentView !== '#workflow') {
        e.preventDefault();
        setIsFadingOut(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFadingOut, currentView]);

  if (currentView === '#results') {
    return <Results />;
  }

  // Kept your routing logic
  if (currentView === '#workflow') {
    return <Workflow />;
  }

  const appVariants = {
    initial: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1 } },
    hidden: { opacity: 0, transition: { duration: 0.5 } }
  };

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>

      {!isLoading && (
        <motion.div
          className="App"
          variants={appVariants}
          initial="initial"
          animate={isFadingOut ? 'hidden' : 'visible'}
          onAnimationComplete={() => {
            if (isFadingOut) {
              setShowContent(false);
              window.location.hash = 'workflow';
            }
          }}
        >
          {showContent && (
            <>
              <SplashCursor SPLAT_RADIUS={0.05} />
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
                    defaultZoom={1.67}
                    autoRotate
                    enableManualRotation={true}
                    enableManualZoom={false}
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
                      press <span className="keyboard-key">SPACE</span> to continue
                    </LiquidGlass>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </>
  );
}

export default App;