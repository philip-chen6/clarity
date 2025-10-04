import React, { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import './Workflow.css';
import { motion, AnimatePresence } from 'framer-motion';
import { MdOutlineSpaceBar } from 'react-icons/md';

// --- State Management with a Reducer ---
const initialState = {
  step: 'prompt_front', // prompt_front, acknowledge, countdown, prompt_back, prompt_classify, classifying, result
  countdown: 3,
  imgFront: null,
  imgBack: null,
  result: '',
  isLoading: false,
};

function workflowReducer(state, action) {
  switch (action.type) {
    case 'START_CAPTURE':
      return { ...state, step: 'acknowledge' };
    case 'START_COUNTDOWN':
      return { ...state, step: 'countdown' };
    case 'TICK_COUNTDOWN':
      return { ...state, countdown: state.countdown - 1 };
    case 'CAPTURE_FRONT_SUCCESS':
      return { ...state, imgFront: action.payload, step: 'prompt_back', countdown: 3 };
    case 'CAPTURE_BACK_SUCCESS':
      return { ...state, imgBack: action.payload, step: 'prompt_classify', countdown: 3 };
    case 'START_CLASSIFY':
      return { ...state, step: 'classifying', isLoading: true };
    case 'CLASSIFY_SUCCESS':
      return { ...state, step: 'result', isLoading: false, result: action.payload };
    case 'CLASSIFY_ERROR':
      return { ...state, step: 'result', isLoading: false, result: 'Failed to classify.' };
    default:
      throw new Error();
  }
}

// --- Main Component ---
const Workflow = () => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const { step, countdown, imgFront, imgBack, result, isLoading } = state;
  const canvasRef = useRef(null);

  const capture = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    try {
      const response = await fetch('http://127.0.0.1:5000/capture');
      if (!response.ok) throw new Error('Failed to capture from backend.');
      const data = await response.json();
      if (!data.image || !data.boxes || data.boxes.length === 0) throw new Error('No hand detected.');
      
      const box = data.boxes[0];
      const img = new Image();
      
      const imageDataUrl = await new Promise((resolve, reject) => {
        img.onload = () => {
          const sWidth = box.x_max - box.x_min;
          const sHeight = box.y_max - box.y_min;
          canvas.width = sWidth;
          canvas.height = sHeight;
          const context = canvas.getContext('2d');
          context.drawImage(img, box.x_min, box.y_min, sWidth, sHeight, 0, 0, sWidth, sHeight);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => reject(new Error('Failed to load captured image.'));
        img.src = `data:image/jpeg;base64,${data.image}`;
      });
      return imageDataUrl;

    } catch (error) {
      alert(error.message);
      console.error("Capture error:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (step === 'prompt_front' || step === 'prompt_back') dispatch({ type: 'START_CAPTURE' });
        else if (step === 'prompt_classify') dispatch({ type: 'START_CLASSIFY' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  useEffect(() => {
    if (step === 'acknowledge') {
      setTimeout(() => dispatch({ type: 'START_COUNTDOWN' }), 200);
    } 
    else if (step === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
      return () => clearTimeout(timer);
    }
    else if (step === 'countdown' && countdown === 0) {
      capture().then(imageDataUrl => {
        if (imageDataUrl) {
          if (!imgFront) {
            dispatch({ type: 'CAPTURE_FRONT_SUCCESS', payload: imageDataUrl });
          } else {
            dispatch({ type: 'CAPTURE_BACK_SUCCESS', payload: imageDataUrl });
          }
        }
      });
    }
    else if (step === 'classifying') {
      const handleClassify = async () => {
        const payload = { front_image: imgFront.split(',')[1], back_image: imgBack.split(',')[1] };
        try {
          const response = await fetch('http://127.0.0.1:5000/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error();
          const data = await response.json();
          dispatch({ type: 'CLASSIFY_SUCCESS', payload: data.classification || 'No result found.' });
        } catch (error) {
          dispatch({ type: 'CLASSIFY_ERROR' });
        }
      };
      handleClassify();
    }
  }, [step, countdown, capture, imgFront, imgBack]);

  return (
    <div className="workflow-container">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="camera-container">
        <AnimatePresence>
          {(step === 'prompt_front' || step === 'prompt_back') && (
            <motion.div className="camera-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {step === 'prompt_front' && <Instruction text="Hold up the FRONT of the pill" />}
              {step === 'prompt_back' && <Instruction text="Hold up the BACK of the pill" />}
            </motion.div>
          )}
          {step === 'acknowledge' && (
             <motion.div className="camera-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="acknowledge-flash" /></motion.div>
          )}
        </AnimatePresence>
        {step === 'countdown' && (<div className="countdown-container"><div className="countdown-text">{countdown}</div></div>)}
        <img src="http://127.0.0.1:5000/video_feed" alt="Live camera feed" className="webcam-stream" />
      </div>
      <div className="controls-container">
        <div className="captures">
          <div className="capture-slot"><p>Front Image</p>{imgFront ? <img src={imgFront} alt="Front" /> : <div className="placeholder" />}</div>
          <div className="capture-slot"><p>Back Image</p>{imgBack ? <img src={imgBack} alt="Back" /> : <div className="placeholder" />}</div>
        </div>
        <div className="status-panel">
          {step === 'prompt_classify' && <Instruction text="Ready to Classify" />}
          {isLoading && <h3>Classifying...</h3>}
          {step === 'result' && result && (<div className="results"><h3>Classification Result:</h3><p>{result}</p></div>)}
        </div>
      </div>
    </div>
  );
};

const Instruction = ({ text }) => (
  <div className="instruction-text">
    {text}
    <div className="instruction-prompt">Press <MdOutlineSpaceBar /> to capture</div>
  </div>
);

export default Workflow;
