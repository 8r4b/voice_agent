import AssistantSpeechIndicator from "./AssistantSpeechIndicator";
import VolumeLevel from "./VolumeLevel";
import CallStatusIndicator from "./CallStatusIndicator";

const ActiveCallDetails = ({
  assistantIsSpeaking,
  userIsSpeaking,
  volumeLevel,
  endCallCallback,
}) => {
  return (
    <div className="active-call-detail">
      <div className="call-info">
        <CallStatusIndicator 
          assistantIsSpeaking={assistantIsSpeaking}
          userIsSpeaking={userIsSpeaking}
        />
        
        <AssistantSpeechIndicator isSpeaking={assistantIsSpeaking} />
        <VolumeLevel volume={volumeLevel} />
      </div>
      <div className="end-call-button">
        <button onClick={endCallCallback}>End Call</button>
      </div>
    </div>
  );
};

export default ActiveCallDetails
