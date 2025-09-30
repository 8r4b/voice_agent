import os
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import traceback

load_dotenv()

app = Flask(__name__)
# Configure CORS - Allow all origins for now
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "OPTIONS"])

def fetch_call_details(call_id):
    url = f"https://api.vapi.ai/call/{call_id}"
    headers = {
        "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}"
    }
    
    print(f"Fetching call details for ID: {call_id}")
    print(f"API URL: {url}")
    api_key_full = os.getenv('VAPI_API_KEY')
    print(f"API Key loaded: {api_key_full is not None}")
    print(f"API Key length: {len(api_key_full) if api_key_full else 0}")
    print(f"API Key starts with: {api_key_full[:10]}..." if api_key_full else "No API Key found")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"VAPI API Response Status: {response.status_code}")
        print(f"VAPI API Response: {response.text}")
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"VAPI API returned {response.status_code}: {response.text}"}
            
    except Exception as e:
        print(f"Exception in fetch_call_details: {str(e)}")
        raise e

@app.route("/call-details", methods=["GET"])
def get_call_details():
    try:
        call_id = request.args.get("call_id")
        print(f"Received request for call_id: {call_id}")
        
        if not call_id:
            print("Error: No call_id provided")
            return jsonify({"error": "Call ID is required"}), 400
        
        # Check if VAPI_API_KEY is loaded
        api_key = os.getenv('VAPI_API_KEY')
        if not api_key:
            print("Error: VAPI_API_KEY not found in environment")
            return jsonify({"error": "VAPI API key not configured"}), 500
        
        response = fetch_call_details(call_id)
        print(f"Full VAPI Response: {response}")
        
        # Check if response contains error
        if "error" in response:
            return jsonify(response), 500
        
        summary = response.get("summary")
        analysis = response.get("analysis")
        
        print(f"Summary: {summary}")
        print(f"Analysis: {analysis}")
        
        return jsonify({
            "analysis": analysis, 
            "summary": summary
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"Exception in get_call_details: {error_msg}")
        print(f"Full traceback: {error_trace}")
        return jsonify({
            "error": error_msg,
            "traceback": error_trace
        }), 500

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "Backend is running",
        "vapi_api_key_configured": bool(os.getenv('VAPI_API_KEY'))
    }), 200

# For Render deployment
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)