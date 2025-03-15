

// src/components/StatusIndicator.js
import React from 'react';

const StatusIndicator = ({ recordingState }) => {
  return (
    <div className="status-indicator">
      {recordingState === 'idle' && <span className="status idle">Ready</span>}
      {recordingState === 'recording' && <span className="status recording">Recording...</span>}
      {recordingState === 'recorded' && <span className="status recorded">Recording Complete</span>}
    </div>
  );
};

export default StatusIndicator;
