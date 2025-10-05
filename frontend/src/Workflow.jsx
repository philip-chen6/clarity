import React, { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import './Workflow.css';
import { motion, AnimatePresence } from 'framer-motion';
import { MdOutlineSpaceBar } from 'react-icons/md';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GridLoader } from 'react-spinners';
import DarkVeil from './DarkVeil';
import LoadingScreen from './LoadingScreen';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const initialState = {
  step: 'prompt_front',
  countdown: 3,
  imgFront: null,
  imgBack: null,
  isLoading: false,
  handDetected: false,
  classificationResult: null,
};

function workflowReducer(state, action) {
  switch (action.type) {
    case 'START_COUNTDOWN':
      return { ...state, step: 'countdown' };
    case 'TICK_COUNTDOWN':
      return { ...state, countdown: state.countdown - 1 };
    case 'START_CAPTURE':
      return { ...state, step: 'capturing' };
    case 'CAPTURE_FRONT_SUCCESS':
      return { ...state, imgFront: action.payload, step: 'prompt_back', countdown: 3 };
    case 'CAPTURE_BACK_SUCCESS':
      return { ...state, imgBack: action.payload, step: 'prompt_classify', countdown: 3 };
    case 'START_CLASSIFY':
      return { ...state, step: 'classifying', isLoading: true, classificationResult: null };
    case 'CLASSIFY_SUCCESS':
      return { ...state, step: 'result', isLoading: false, classificationResult: action.payload };
    case 'CLASSIFY_ERROR':
      return { ...state, step: 'result', isLoading: false, classificationResult: 'Failed to classify.|||Please try again.|||0' };
    case 'SET_HAND_DETECTED':
      return { ...state, handDetected: action.payload };
    case 'RESET_WORKFLOW':
      return { ...initialState };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const classifyingTexts = [
  "initializing classification matrix...",
  "authenticating with neural network...",
  "establishing secure data link...",
  "cross-referencing visual markers...",
  "analyzing imprint data...",
  "querying pharmaceutical database (US)...",
  "querying pharmaceutical database (EU)...",
  "verifying shape and color consistency...",
  "deconstructing molecular appearance...",
  "running spectral analysis simulation...",
  "calibrating optical character recognition...",
  "checking for coating anomalies...",
  "validating pill scorer geometry...",
  "comparing against known formulations...",
  "rendering 3d model for comparison...",
  "scanning for micro-imprints...",
  "evaluating surface texture...",
  "cross-checking against FDA registry...",
  "analyzing light refraction properties...",
  "finalizing identification vector...",
  "generating confidence score...",
  "performing peer-review check...",
  "compiling results...",
  "encrypting report...",
  "preparing final report...",
  "almost there...",
  "classification complete.",
];

const Workflow = () => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const { step, countdown, imgFront, imgBack, isLoading, handDetected, classificationResult } = state;
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [classifyingText, setClassifyingText] = useState(classifyingTexts[0]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const boundingBoxRef = useRef(null);

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      dispatch({ type: 'SET_HAND_DETECTED', payload: true });
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#ADD8E6', lineWidth: 5 });
        drawLandmarks(ctx, landmarks, { color: '#FFFFFF', lineWidth: 2 });
      }
      
      const landmarks = results.multiHandLandmarks[0];
      let x_min = canvas.width, y_min = canvas.height, x_max = 0, y_max = 0;
      for (const landmark of landmarks) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        if (x < x_min) x_min = x;
        if (y < y_min) y_min = y;
        if (x > x_max) x_max = x;
        if (y > y_max) y_max = y;
      }

      const padding = 50;
      x_min = Math.max(0, x_min - padding);
      y_min = Math.max(0, y_min - padding);
      x_max = Math.min(canvas.width, x_max + padding);
      y_max = Math.min(canvas.height, y_max + padding);
      
      boundingBoxRef.current = { x_min, y_min, x_max, y_max };

      ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(x_min, y_min, (x_max - x_min), (y_max - y_min));
      ctx.setLineDash([]);

    } else {
      dispatch({ type: 'SET_HAND_DETECTED', payload: false });
      boundingBoxRef.current = null;
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    handsRef.current = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    handsRef.current.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handsRef.current.onResults(onResults);

    const videoElement = videoRef.current;
    if (videoElement) {
      const camera = new Camera(videoElement, {
        onFrame: async () => {
          if (videoElement) {
            await handsRef.current.send({ image: videoElement });
          }
        },
        width: 1280,
        height: 720,
      });

      videoElement.oncanplay = () => setIsVideoLoading(false);
      camera.start();
    }
    return () => {
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [onResults]);

  const capture = useCallback(() => {
    if (!handDetected || !boundingBoxRef.current) {
      alert("No hand detected. Please position your hand clearly in the frame.");
      return null;
    }
    const video = videoRef.current;
    const box = boundingBoxRef.current;
    const tempCanvas = document.createElement('canvas');
    const sWidth = box.x_max - box.x_min;
    const sHeight = box.y_max - box.y_min;
    tempCanvas.width = sWidth;
    tempCanvas.height = sHeight;
    const context = tempCanvas.getContext('2d');
    context.drawImage(video, box.x_min, box.y_min, sWidth, sHeight, 0, 0, sWidth, sHeight);
    return tempCanvas.toDataURL('image/jpeg');
  }, [handDetected]);

  const fileToGenerativePart = (dataUrl, mimeType) => ({
    inlineData: { data: dataUrl.split(',')[1], mimeType },
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (step === 'prompt_front' || step === 'prompt_back') dispatch({ type: 'START_COUNTDOWN' });
        else if (step === 'prompt_classify') dispatch({ type: 'START_CLASSIFY' });
        else if (step === 'result') dispatch({ type: 'RESET_WORKFLOW' });
      } else if (e.code === 'KeyR' && (step === 'prompt_classify' || step === 'result')) {
        e.preventDefault();
        dispatch({ type: 'RESET_WORKFLOW' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  useEffect(() => {
    let timer;
    if (step === 'countdown' && countdown > 0) {
      timer = setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
    } else if (step === 'countdown' && countdown === 0) {
      dispatch({ type: 'START_CAPTURE' });
    } else if (step === 'capturing') {
      timer = setTimeout(() => {
        const imageDataUrl = capture();
        if (imageDataUrl) {
          if (!imgFront) {
            dispatch({ type: 'CAPTURE_FRONT_SUCCESS', payload: imageDataUrl });
          } else {
            dispatch({ type: 'CAPTURE_BACK_SUCCESS', payload: imageDataUrl });
          }
        } else {
          const resetStep = imgFront ? 'prompt_back' : 'prompt_front';
          dispatch({ type: 'RESET_WORKFLOW', payload: { step: resetStep } });
        }
      }, 200);
    } else if (step === 'classifying') {
      // Handle dynamic text
      let textIndex = 0;
      const textInterval = setInterval(() => {
        textIndex = (textIndex + 1) % classifyingTexts.length;
        setClassifyingText(classifyingTexts[textIndex]);
      }, 1000); // Change text every second

      const handleClassify = async () => {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
          const prompt = "Analyze the pill in the images. Based on its color, identify if it is Advil (typically orange) or Tylenol (typically white). Provide a detailed description of the identified medication, including its common uses, active ingredients, and typical dosage. Finally, provide a confidence score for your identification as a percentage. Format your response as follows: [Pill Name]|||[Detailed Description]|||[Confidence Score %]";
          const imageParts = [
            fileToGenerativePart(imgFront, "image/jpeg"),
            fileToGenerativePart(imgBack, "image/jpeg"),
          ];
          const result = await model.generateContent([prompt, ...imageParts]);
          const response = await result.response;
          clearInterval(textInterval); // Stop changing text
          dispatch({ type: 'CLASSIFY_SUCCESS', payload: response.text() });
        } catch (error) {
          console.error("Classification error:", error);
          clearInterval(textInterval); // Stop changing text
          dispatch({ type: 'CLASSIFY_ERROR' });
        }
      };
      
      // Add a delay before starting classification to show the first message
      setTimeout(handleClassify, 1000);

      return () => clearInterval(textInterval);
    }
    return () => clearTimeout(timer);
  }, [step, countdown, capture, imgFront, imgBack]);

  const [pillName, , confidence] = classificationResult ? classificationResult.split('|||') : ['','',''];

  return (
    <div className="workflow-container">
      <div className="dark-veil-background">
        <DarkVeil speed={0.5} hueShift={10} noiseIntensity={0.1} scanlineFrequency={2} scanlineIntensity={0.1} warpAmount={2} />
      </div>
      <div className="camera-container">
        {isVideoLoading && <LoadingScreen />}
        <video ref={videoRef} className="webcam-stream" autoPlay playsInline style={{ display: 'none' }}></video>
        <canvas ref={canvasRef} className="webcam-overlay" width="1280" height="720" style={{ opacity: isVideoLoading ? 0 : 1 }}></canvas>
        <AnimatePresence>
          {(!isVideoLoading && (step === 'prompt_front' || step === 'prompt_back')) && (
            <motion.div className="camera-overlay-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Instruction text={step === 'prompt_front' ? "hold up the front of the pill" : "hold up the back of the pill"} showPrompt={handDetected} />
            </motion.div>
          )}
          {step === 'capturing' && (
            <motion.div className="camera-overlay-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="acknowledge-flash" />
            </motion.div>
          )}
        </AnimatePresence>
        {step === 'countdown' && (<div className="countdown-container"><div className="countdown-text">{countdown}</div></div>)}
      </div>
      <AnimatePresence>
        {(imgFront || step === 'result') && (
          <motion.div className="controls-container" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ ease: "easeInOut", duration: 0.5 }}>
            <div className="captures">
              <div className="capture-slot"><p>front image</p>{imgFront ? <img src={imgFront} alt="Front" /> : <div className="placeholder" />}</div>
              <div className="capture-slot"><p>back image</p>{imgBack ? <img src={imgBack} alt="Back" /> : <div className="placeholder" />}</div>
            </div>
            <div className="status-panel">
              {step === 'prompt_classify' && <Instruction text="does this look clear?" showPrompt={true} promptType="classify" />}
              {isLoading && (
                <div className="classifying-status">
                  <h3>{classifyingText}</h3>
                  <div className="spinner-container">
                    <GridLoader color={"#ffffff"} loading={true} size={15} speedMultiplier={0.1} />
                  </div>
                </div>
              )}
              {classificationResult && !isLoading && (
                <div className="classification-result">
                  <h2>{pillName}</h2>
                  <p>Confidence: {confidence}</p>
                  <Instruction text="" showPrompt={true} promptType="result" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Instruction = ({ text, showPrompt, promptType = 'snap' }) => (
  <div className="instruction-text">
    {text}
    {showPrompt && (
      <div className="instruction-prompt-container">
        {promptType === 'snap' && (
          <div className="instruction-prompt snap-prompt">
            press <span className="keyboard-key">space</span> to snap!
          </div>
        )}
        {promptType === 'classify' && (
          <>
            <div className="instruction-prompt">
              press <span className="keyboard-key">space</span> to continue
            </div>
            <div className="instruction-prompt">
              press <span className="keyboard-key">r</span> to restart
            </div>
          </>
        )}
        {promptType === 'result' && (
            <div className="instruction-prompt">
              press <span className="keyboard-key">r</span> to restart
            </div>
        )}
      </div>
    )}
  </div>
);

export default Workflow;