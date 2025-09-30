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

  useEffect(() => {
    vapi
      .on("call-start", () => {
        setLoading(false);
        setStarted(true);
      })
      .on("call-end", () => {
        setStarted(false);
        setLoading(false);
        setAssistantIsSpeaking(false);
        setUserIsSpeaking(false);
      })
      .on("speech-start", () => {
        setAssistantIsSpeaking(true);
        setUserIsSpeaking(false);
      })
      .on("speech-end", () => {
        setAssistantIsSpeaking(false);
      })
      .on("volume-level", (level) => {
        setVolumeLevel(level);
        // Detect user speaking based on volume level
        if (level > 0.1 && !assistantIsSpeaking) {
          setUserIsSpeaking(true);
        } else if (level < 0.05) {
          setUserIsSpeaking(false);
        }
      })
      // Listen for user speech events
      .on("user-speech-start", () => {
        setUserIsSpeaking(true);
        setAssistantIsSpeaking(false);
      })
      .on("user-speech-end", () => {
        setUserIsSpeaking(false);
      });
  }, [assistantIsSpeaking]);

  const handleStart = async () => {
    setLoading(true);
    const data = await startAssistant();
    setCallId(data.id);
  };

  const handleStop = () => {
    stopAssistant();
    getCallDetails();
  };

  const getCallDetails = (interval = 3000) => {
    setLoadingResult(true);
    fetch(`${BACKEND_URL}/call-details?call_id=${callId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.analysis && data.summary) {
          console.log(data);
          setCallResult(data);
          setLoadingResult(false);
        } else {
          setTimeout(() => getCallDetails(interval), interval);
        }
      })
      .catch((error) => alert(error));
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
        <div className="call-result">
          <h2>📊 Call Analysis Results</h2>
          
          <div style={{ 
            backgroundColor: '#2d2d2d', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #444'
          }}>
            <h3>📝 Summary</h3>
            <p style={{ color: '#e0e0e0', lineHeight: '1.6' }}>{callResult.summary}</p>
          </div>

          {callResult.analysis && (
            <div style={{ 
              backgroundColor: '#2d2d2d', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #444'
            }}>
              <h3>🗂️ Extracted Data</h3>
              
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
                  
                  <pre style={{ 
                    backgroundColor: '#1a1a1a', 
                    padding: '15px', 
                    borderRadius: '4px', 
                    color: '#e0e0e0',
                    fontSize: '14px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(callResult.analysis.structuredData, null, 2)}
                  </pre>
                </div>
              ) : (
                <p style={{ color: '#888' }}>No structured data available for this call.</p>
              )}
            </div>
          )}
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