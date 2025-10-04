import React from 'react';
import { GridLoader } from 'react-spinners';
import { motion } from 'framer-motion';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
    >
      <GridLoader color={"#ffffff"} loading={true} size={25} />
    </motion.div>
  );
};

export default LoadingScreen;
