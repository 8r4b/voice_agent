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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
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

  const handleInputChange = (setter) => (event) => {
    setter(event.target.value);
  };

  const handleStart = async () => {
    setLoading(true);
    const data = await startAssistant(firstName, lastName, email, phoneNumber);
    setCallId(data.id);
  };

  const handleStop = () => {
    stopAssistant();
    getCallDetails();
  };

  const getCallDetails = (interval = 3000) => {
    setLoadingResult(true);
    console.log(`Making request to: ${BACKEND_URL}/call-details?call_id=${callId}`);
    
    fetch(`${BACKEND_URL}/call-details?call_id=${callId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Backend response:", data);
        if (data.analysis && data.summary) {
          setCallResult(data);
          setLoadingResult(false);
        } else {
          console.log("Call details not ready, retrying...");
          setTimeout(() => getCallDetails(interval), interval);
        }
      })
      .catch((error) => {
        console.error("Error fetching call details:", error);
        alert(`Error fetching call details: ${error.message}`);
        setLoadingResult(false);
      });
  };

  const showForm = !loading && !started && !loadingResult && !callResult;
  const allFieldsFilled = firstName && lastName && email && phoneNumber;

  return (
    <div className="app-container">
      {showForm && (
        <>
          <h1>Contact Details (Required)</h1>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            className="input-field"
            onChange={handleInputChange(setFirstName)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            className="input-field"
            onChange={handleInputChange(setLastName)}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            className="input-field"
            onChange={handleInputChange(setEmail)}
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phoneNumber}
            className="input-field"
            onChange={handleInputChange(setPhoneNumber)}
          />
          {!started && (
            <button
              onClick={handleStart}
              disabled={!allFieldsFilled}
              className="button"
            >
              Start Application Call
            </button>
          )}
        </>
      )}
      {loadingResult && <p>Loading call details... please wait</p>}
      {!loadingResult && callResult && (
        <div className="call-result">
          <p>Qualified: {callResult.analysis.structuredData.is_qualified.toString()}</p>
          <p>{callResult.summary}</p>
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
