const CallStatusIndicator = ({ assistantIsSpeaking, userIsSpeaking }) => {
  const getStatus = () => {
    if (userIsSpeaking) {
      return {
        text: "🎤 You are speaking...",
        color: "#4CAF50",
        backgroundColor: "#1a5c1a",
        spinnerColor: "#4CAF50"
      };
    } else if (assistantIsSpeaking) {
      return {
        text: "🤖 AI is responding...",
        color: "#2196F3",
        backgroundColor: "#1a3a5c",
        spinnerColor: "#2196F3"
      };
    } else {
      return {
        text: "👂 AI is listening...",
        color: "#888",
        backgroundColor: "#2d2d2d",
        spinnerColor: "#888"
      };
    }
  };

  const status = getStatus();

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      padding: '12px 16px',
      backgroundColor: status.backgroundColor,
      borderRadius: '8px',
      marginBottom: '15px',
      border: `1px solid ${status.color}40`,
      transition: 'all 0.3s ease'
    }}>
      <div 
        className="spinner" 
        style={{ 
          width: '18px', 
          height: '18px', 
          border: `2px solid ${status.spinnerColor}40`,
          borderTop: `2px solid ${status.spinnerColor}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <span style={{ 
        color: status.color, 
        fontWeight: '600',
        fontSize: '14px'
      }}>
        {status.text}
      </span>
    </div>
  );
};

export default CallStatusIndicator;