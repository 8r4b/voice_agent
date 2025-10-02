import Vapi from "@vapi-ai/web";

export const vapi = new Vapi(import.meta.env.VITE_VAPI_API_KEY);
const assistantId = import.meta.env.VITE_ASSISTANT_ID;

let lastErrorTime = 0;
const ERROR_DEBOUNCE_MS = 1000; // Prevent duplicate errors within 1 second

// Add global error handler for unhandled VAPI errors
vapi.on('error', (error) => {
    const now = Date.now();
    
    // Debounce duplicate errors
    if (now - lastErrorTime < ERROR_DEBOUNCE_MS && 
        error.errorMsg && error.errorMsg.includes('Meeting has ended')) {
        return; // Skip duplicate "meeting ended" errors
    }
    
    lastErrorTime = now;
    console.error('VAPI Error:', error);
    // Don't throw - just log the error to prevent crashes
});

export const startAssistant = async () => {
    try {
        return await vapi.start(assistantId);
    } catch (error) {
        console.error('Failed to start assistant:', error);
        throw error;
    }
};

export const stopAssistant = () => {
    try {
        vapi.stop();
    } catch (error) {
        console.error('Error stopping assistant:', error);
        // Don't throw - we want to ensure cleanup happens
    }
}
