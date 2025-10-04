import Orb from './Orb';
import './App.css';
import { motion } from 'framer-motion';
import { MdOutlineSpaceBar } from 'react-icons/md';

function App() {
  return (
    <div className="App">
      <div className="left-panel">
        <Orb />
      </div>
      <div className="right-panel">
        <div className="content">
          <h1 className="title">CLARITY</h1>
          <p className="subtitle">a rapid pill identification system</p>
          <motion.div
            className="prompt"
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          >
            press <MdOutlineSpaceBar /> to continue
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default App;
