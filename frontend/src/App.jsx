import { useState, useEffect } from "react";
import { vapi, startAssistant, stopAssistant } from "./ai";
import ActiveCallDetails from "./call/ActiveCallDetails";

function App() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [callId, setCallId] = useState("");
  const [callResult, setCallResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const [transcript, setTranscript] = useState(""); // Add transcript state
  const [messages, setMessages] = useState([]); // Add messages array for conversation

  // Get backend URL from environment variable
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    vapi
      .on("call-start", () => {
        setLoading(false);
        setStarted(true);
        setTranscript(""); // Clear transcript when call starts
        setMessages([]); // Clear messages when call starts
        console.log("Call started - transcript reset");
      })
      .on("call-end", () => {
        setStarted(false);
        setLoading(false);
      })
      .on("speech-start", () => {
        setAssistantIsSpeaking(true);
      })
      .on("speech-end", () => {
        setAssistantIsSpeaking(false);
      })
      .on("volume-level", (level) => {
        setVolumeLevel(level);
      })
      // Try multiple transcript event names
      .on("transcript", (data) => {
        console.log("Transcript event:", data);
        handleTranscriptData(data);
      })
      .on("user-transcript", (data) => {
        console.log("User transcript event:", data);
        handleTranscriptData(data, "user");
      })
      .on("assistant-transcript", (data) => {
        console.log("Assistant transcript event:", data);
        handleTranscriptData(data, "assistant");
      })
      .on("message", (message) => {
        console.log("Message event:", message);
        // Handle different message types
        if (message.type === "transcript" || message.type === "user-transcript" || message.type === "assistant-transcript") {
          handleTranscriptData(message);
        }
        
        if (message.type === "function-call" && message.functionCall) {
          console.log("Function call:", message.functionCall);
        }
      })
      // Catch all events for debugging
      .on("*", (eventName, data) => {
        console.log(`VAPI Event [${eventName}]:`, data);
        
        // Check for transcript-related events
        if (eventName.includes('transcript') || eventName.includes('speech')) {
          console.log("Potential transcript event found:", eventName, data);
          handleTranscriptData(data);
        }
      });
  }, []);

  // Helper function to handle transcript data
  const handleTranscriptData = (data, role = null) => {
    if (!data) return;
    
    const text = data.text || data.transcript || data.content || data.message || "";
    const speaker = role || data.role || data.speaker || (data.user ? "user" : "assistant");
    const isFinal = data.isFinal || data.final || data.type === "final";
    
    console.log("Processing transcript:", { text, speaker, isFinal });
    
    if (text) {
      // Update live transcript
      setTranscript(text);
      
      // Add to messages history if it's final
      if (isFinal) {
        setMessages(prev => [...prev, {
          role: speaker,
          text: text,
          timestamp: new Date().toLocaleTimeString()
        }]);
        
        // Clear live transcript after adding to history
        setTimeout(() => setTranscript(""), 1000);
      }
    }
  };

  // Test function for debugging
  const testTranscript = () => {
    setTranscript("Testing live transcript...");
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "This is a test message from the assistant",
        timestamp: new Date().toLocaleTimeString()
      }]);
      setTranscript("");
    }, 2000);
  };

  const handleStart = async () => {
    setLoading(true);
    const data = await startAssistant();
    setCallId(data.id);
  };

  const handleStop = () => {
    stopAssistant();
    setLoadingResult(true); // Show spinner immediately when user clicks End Call
    // Wait 30 seconds before trying to fetch call details to allow VAPI to process
    console.log("Call stopped. Waiting 30 seconds for VAPI to process the call...");
    setTimeout(() => {
      getCallDetails();
    }, 30000); // 30 seconds delay
  };

  const getCallDetails = (interval = 10000, maxRetries = 12, currentRetry = 0) => {
    // Loading state is already set in handleStop, no need to set it again
    
    console.log(`Making request to: ${BACKEND_URL}/call-details?call_id=${callId} (Attempt ${currentRetry + 1}/${maxRetries})`);
    
    fetch(`${BACKEND_URL}/call-details?call_id=${callId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Backend response:", data);
        
        // Check if we have the analysis data
        if (data.analysis && data.summary) {
          console.log("✅ Call analysis retrieved successfully!");
          console.log("Analysis structure:", JSON.stringify(data.analysis, null, 2));
          setCallResult(data);
          setLoadingResult(false);
        } else if (currentRetry < maxRetries - 1) {
          console.log(`⏳ Call analysis not ready yet. Retrying in ${interval/1000} seconds... (${currentRetry + 1}/${maxRetries})`);
          setTimeout(() => getCallDetails(interval, maxRetries, currentRetry + 1), interval);
        } else {
          console.log("❌ Max retries reached. Analysis may not be available for this call.");
          setLoadingResult(false);
          alert("Call analysis is taking longer than expected. The call may have been too short to generate analysis, or there may be an issue with the VAPI service.");
        }
      })
      .catch((error) => {
        console.error("Error fetching call details:", error);
        
        if (currentRetry < maxRetries - 1) {
          console.log(`🔄 Retrying due to error... (${currentRetry + 1}/${maxRetries})`);
          setTimeout(() => getCallDetails(interval, maxRetries, currentRetry + 1), interval);
        } else {
          alert(`Error fetching call details: ${error.message}`);
          setLoadingResult(false);
        }
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
      {loadingResult && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '40px',
          gap: '20px'
        }}>
          <div className="spinner"></div>
          <p style={{ fontSize: '16px', color: '#666' }}>
            Analyzing your call... This may take up to 30 sec
          </p>
        </div>
      )}
      {!loadingResult && callResult && (
        <div className="call-result" style={{ 
          padding: '30px', 
          maxWidth: '800px', 
          margin: '0 auto',
          backgroundColor: '#1e1e1e',
          borderRadius: '12px',
          border: '1px solid #333'
        }}>
          <h2 style={{ color: '#ff5722', marginBottom: '20px' }}>📊 Call Analysis Results</h2>
          
          {/* Summary Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#fff', marginBottom: '10px' }}>📝 Summary</h3>
            <p style={{ 
              backgroundColor: '#2a2a2a', 
              padding: '15px', 
              borderRadius: '8px',
              lineHeight: '1.6',
              border: '1px solid #444'
            }}>
              {callResult.summary}
            </p>
          </div>

          {/* Structured Data Section */}
          {callResult.analysis?.structuredData && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>🗂️ Extracted Data</h3>
              <p style={{ color: '#ccc', marginBottom: '15px', fontSize: '14px' }}>
                This is the data extracted based on the conversation.
              </p>
              <pre style={{ 
                backgroundColor: '#2a2a2a', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #444',
                overflow: 'auto',
                fontSize: '14px',
                color: '#e0e0e0',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace'
              }}>
                {JSON.stringify(callResult.analysis.structuredData, null, 2)}
              </pre>
            </div>
          )}

          {/* Qualified Status */}
          <div style={{ 
            padding: '15px', 
            backgroundColor: callResult.analysis?.structuredData?.is_qualified ? '#1b5e20' : '#d32f2f',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <strong>
              Status: {callResult.analysis?.structuredData?.is_qualified ? '✅ Qualified' : '❌ Not Qualified'}
            </strong>
          </div>
        </div>
      )}
      {(loading || loadingResult) && <div className="loading"></div>}
      {started && (
        <>
          <ActiveCallDetails
            assistantIsSpeaking={assistantIsSpeaking}
            volumeLevel={volumeLevel}
            endCallCallback={handleStop}
          />
          
          {/* Live Transcript Display */}
          <div className="transcript-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>📝 Live Conversation</h3>
              <button onClick={testTranscript} style={{ 
                padding: '5px 10px', 
                fontSize: '12px', 
                background: '#ff5722', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}>
                Test Transcript
              </button>
            </div>
            
            {/* Current live transcript */}
            {transcript && (
              <div className="live-transcript">
                <strong>Speaking:</strong> {transcript}
              </div>
            )}
            
            {/* Message history */}
            <div className="messages-history">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-header">
                    {message.role === 'assistant' ? '🤖 Assistant' : '👤 You'} - {message.timestamp}
                  </div>
                  <div className="message-text">{message.text}</div>
                </div>
              ))}
            </div>
            
            {messages.length === 0 && !transcript && (
              <div className="no-conversation">
                Conversation will appear here...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
