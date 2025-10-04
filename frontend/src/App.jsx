import Orb from './Orb';
import './App.css';
import { motion } from 'framer-motion';
import { MdOutlineSpaceBar } from 'react-icons/md';
import LiquidGlass from './LiquidGlass';
import DarkVeil from './DarkVeil';
import ModelViewer from './ModelViewer';

function App() {
  return (
    <div className="App">
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
        <Orb>
          <ModelViewer
            url="/pill.glb"
            width={400}
            height={400}
            defaultZoom={1.5}
            autoRotate
            enableManualRotation={false}
            enableManualZoom={false}
            showScreenshotButton={false}
            environmentPreset="none"
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
    </div>
  );
}

export default App;
