import { useState, useEffect } from "react";
import { vapi, startAssistant, stopAssistant } from "./ai";
import ActiveCallDetails from "./call/ActiveCallDetails";

function App() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [userIsSpeaking, setUserIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [callId, setCallId] = useState("");
  const [callResult, setCallResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Get backend URL from environment variable
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Add global error handler for unhandled promise rejections and errors
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the default behavior (which would log to console)
      event.preventDefault();
    };

    const handleError = (event) => {
      console.error('Unhandled error:', event.error);
      // Prevent the default behavior if it's a VAPI-related error
      if (event.error && event.error.message && event.error.message.includes('Meeting has ended')) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    let hasHandledCallEnd = false;

    const handleCallStart = () => {
      console.log('Call started');
      setLoading(false);
      setStarted(true);
      hasHandledCallEnd = false; // Reset flag when call starts
    };

    const handleCallEnd = (callEndedEvent) => {
      if (hasHandledCallEnd) return; // Prevent duplicate handling
      hasHandledCallEnd = true;
      
      console.log('Call ended:', callEndedEvent);
      setStarted(false);
      setLoading(false);
      setAssistantIsSpeaking(false);
      setUserIsSpeaking(false);
    };

    const handleSpeechStart = () => {
      setAssistantIsSpeaking(true);
      setUserIsSpeaking(false);
    };

    const handleSpeechEnd = () => {
      setAssistantIsSpeaking(false);
    };

    const handleVolumeLevel = (level) => {
      setVolumeLevel(level);
      // Detect user speaking based on volume level
      if (level > 0.1 && !assistantIsSpeaking) {
        setUserIsSpeaking(true);
      } else if (level < 0.05) {
        setUserIsSpeaking(false);
      }
    };

    const handleUserSpeechStart = () => {
      setUserIsSpeaking(true);
      setAssistantIsSpeaking(false);
    };

    const handleUserSpeechEnd = () => {
      setUserIsSpeaking(false);
    };

    const handleError = (error) => {
      if (hasHandledCallEnd) return; // If we already handled call end, ignore subsequent errors
      
      console.error('VAPI Error in component:', error);
      
      // Check if this is a "meeting ended" error
      if (error.errorMsg && error.errorMsg.includes('Meeting has ended')) {
        console.log('Meeting ended due to ejection - this is normal behavior');
        hasHandledCallEnd = true;
        // Reset state silently for meeting end
        setStarted(false);
        setLoading(false);
        setAssistantIsSpeaking(false);
        setUserIsSpeaking(false);
      } else {
        // Reset state on other errors
        setLoading(false);
        setStarted(false);
        setAssistantIsSpeaking(false);
        setUserIsSpeaking(false);
        // Show user-friendly error message for non-meeting-end errors
        alert('Voice call encountered an error: ' + (error.errorMsg || error.message || 'Unknown error'));
      }
    };

    // Attach event listeners
    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("volume-level", handleVolumeLevel);
    vapi.on("user-speech-start", handleUserSpeechStart);
    vapi.on("user-speech-end", handleUserSpeechEnd);
    vapi.on("error", handleError);

    // Cleanup function to remove event listeners
    return () => {
      vapi.off("call-start", handleCallStart);
      vapi.off("call-end", handleCallEnd);
      vapi.off("speech-start", handleSpeechStart);
      vapi.off("speech-end", handleSpeechEnd);
      vapi.off("volume-level", handleVolumeLevel);
      vapi.off("user-speech-start", handleUserSpeechStart);
      vapi.off("user-speech-end", handleUserSpeechEnd);
      vapi.off("error", handleError);
    };
  }, [assistantIsSpeaking]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const data = await startAssistant();
      setCallId(data.id);
    } catch (error) {
      console.error('Failed to start assistant:', error);
      setLoading(false);
      alert('Failed to start voice call. Please check your microphone permissions and try again.');
    }
  };

  const handleStop = () => {
    stopAssistant();
    getCallDetails();
  };

  const getCallDetails = (interval = 3000) => {
    setLoadingResult(true);
    fetch(`${BACKEND_URL}/call-details?call_id=${callId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.analysis && data.summary) {
          console.log('Call details received:', data);
          setCallResult(data);
          setLoadingResult(false);
        } else {
          console.log('Waiting for call analysis to complete...');
          setTimeout(() => getCallDetails(interval), interval);
        }
      })
      .catch((error) => {
        console.error('Error fetching call details:', error);
        setLoadingResult(false);
        alert('Failed to fetch call details: ' + error.message);
      });
  };

  return (
    <div className="app-container">
      {!loading && !started && !loadingResult && !callResult && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h1>Voice Assistant</h1>
          <button
            onClick={handleStart}
            className="button"
            style={{ 
              padding: '15px 30px', 
              fontSize: '18px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            Start Voice Call
          </button>
        </div>
      )}
      {loadingResult && <p>Loading call details... please wait</p>}
      {!loadingResult && callResult && (
        <div className="call-result" style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px',
          margin: '20px',
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #333'
        }}>
          <div style={{ 
            position: 'sticky', 
            top: 0, 
            backgroundColor: '#1a1a1a', 
            paddingBottom: '10px',
            marginBottom: '20px',
            borderBottom: '2px solid #333',
            zIndex: 10
          }}>
            <h2 style={{ margin: 0, color: '#fff' }}>📊 Call Analysis Results</h2>
            <button 
              onClick={() => setCallResult(null)}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ 
            backgroundColor: '#2d2d2d', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #444'
          }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>📝 Summary</h3>
            <p style={{ 
              color: '#e0e0e0', 
              lineHeight: '1.6',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '10px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px'
            }}>
              {callResult.summary}
            </p>
          </div>

          {callResult.analysis && (
            <div style={{ 
              backgroundColor: '#2d2d2d', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #444'
            }}>
              <h3 style={{ color: '#fff', marginTop: 0 }}>🗂️ Extracted Data</h3>
              
              {callResult.analysis.structuredData ? (
                <div>
                  {callResult.analysis.structuredData.is_qualified !== undefined && (
                    <div style={{ 
                      padding: '10px', 
                      borderRadius: '4px', 
                      backgroundColor: callResult.analysis.structuredData.is_qualified ? '#1a5c1a' : '#5c1a1a',
                      marginBottom: '15px'
                    }}>
                      <strong>Status:</strong> {callResult.analysis.structuredData.is_qualified ? '✅ Qualified' : '❌ Not Qualified'}
                    </div>
                  )}
                  
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    border: '1px solid #555',
                    borderRadius: '4px'
                  }}>
                    <pre style={{ 
                      backgroundColor: '#1a1a1a', 
                      padding: '15px', 
                      margin: 0,
                      color: '#e0e0e0',
                      fontSize: '14px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {JSON.stringify(callResult.analysis.structuredData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#888' }}>No structured data available for this call.</p>
              )}
            </div>
          )}
          
          <div style={{ 
            marginTop: '30px', 
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px solid #333'
          }}>
            <button 
              onClick={() => setCallResult(null)}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Start New Call
            </button>
          </div>
        </div>
      )}
      {(loading || loadingResult) && <div className="loading"></div>}
      {started && (
        <ActiveCallDetails
          assistantIsSpeaking={assistantIsSpeaking}
          userIsSpeaking={userIsSpeaking}
          volumeLevel={volumeLevel}
          endCallCallback={handleStop}
        />
      )}
    </div>
  );
}

export default App;