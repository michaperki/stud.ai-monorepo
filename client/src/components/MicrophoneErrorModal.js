// src/components/MicrophoneErrorModal.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsMicMute, BsInfoCircle, BsXLg, BsArrowRightCircle, BsTools } from 'react-icons/bs';
import MicrophoneDiagnostics from './MicrophoneDiagnostics';

const MicrophoneErrorModal = ({ 
  isOpen, 
  onClose, 
  errorMessage, 
  onContinueWithoutMic,
  isCritical
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {showDiagnostics ? (
            <MicrophoneDiagnostics 
              onClose={() => setShowDiagnostics(false)} 
            />
          ) : (
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className="modal-header">
                <div className="modal-icon">
                  <BsMicMute size={28} />
                </div>
                <h2 className="modal-title">Microphone Issue Detected</h2>
                <button className="modal-close-button" onClick={onClose}>
                  <BsXLg size={18} />
                </button>
              </div>
              
              <div className="modal-body">
                <p className="modal-error-message">{errorMessage}</p>
                
                <div className="modal-info-box">
                  <BsInfoCircle size={20} />
                  <div className="modal-info-text">
                    <p>Try these troubleshooting steps:</p>
                    <ol>
                      <li>Check if your microphone is connected properly</li>
                      <li>Make sure no other applications are using your microphone</li>
                      <li>Verify browser permissions for microphone access</li>
                      <li>Try refreshing the page</li>
                      <li>Try a different browser (Chrome or Firefox recommended)</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="button secondary"
                  onClick={() => setShowDiagnostics(true)}
                >
                  <BsTools size={18} />
                  <span>Run Diagnostics</span>
                </button>
                
                <button 
                  className="button secondary"
                  onClick={onClose}
                >
                  Try Again
                </button>
                
                <button 
                  className="button primary"
                  onClick={onContinueWithoutMic}
                >
                  Continue Without Microphone
                  <BsArrowRightCircle size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MicrophoneErrorModal;
