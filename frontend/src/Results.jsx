import React from 'react';
import { motion } from 'framer-motion';

const Results = () => {
  // You can retrieve the result from localStorage or a global state
  const classificationResult = localStorage.getItem('classificationResult') || 'No result found.';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        backgroundColor: '#000',
        padding: '2rem'
      }}
    >
      <h1>Classification Result</h1>
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: 'rgba(20, 20, 20, 0.75)',
        borderRadius: '12px',
        textAlign: 'left',
        maxWidth: '800px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
          {classificationResult}
        </p>
      </div>
      <button
        onClick={() => window.location.hash = ''}
        style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '50px',
            border: '1px solid white',
            background: 'transparent',
            color: 'white',
            cursor: 'pointer'
        }}
      >
        Start Over
      </button>
    </motion.div>
  );
};

export default Results;
