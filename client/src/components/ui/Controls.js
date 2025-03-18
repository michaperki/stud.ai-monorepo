
// src/components/Controls.js
import React from 'react';

const Controls = ({ recordingState, loading, onGetWord, onStopRecording, onSubmitRecording, onRerecord, audioUrl }) => {
  return (
    <div className="controls-container">
      {recordingState === 'idle' && (
        <button 
          className="button primary" 
          onClick={onGetWord} 
          disabled={loading}
        >
          {loading ? <span className="spinner"></span> : 'Get Word'}
        </button>
      )}

      {recordingState === 'recording' && (
        <button className="button danger" onClick={onStopRecording}>
          🛑 Force Stop
        </button>
      )}

      {recordingState === 'recorded' && (
        <div className="recording-controls">
          {audioUrl && (
            <audio src={audioUrl} controls className="audio-player"></audio>
          )}
          <div className="button-group">
            <button 
              className="button primary" 
              onClick={onSubmitRecording}
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : 'Submit Recording'}
            </button>
            <button 
              className="button secondary" 
              onClick={onRerecord}
              disabled={loading}
            >
              Record Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;
