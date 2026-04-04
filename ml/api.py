from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

env_path = os.path.join(os.path.dirname(__file__), '..', 'app', '.env')
load_dotenv(dotenv_path=env_path)

from teacher_analyzer import TeacherAnalyzer

app = Flask(__name__)
CORS(app) # Enable CORS for the React frontend
analyzer = TeacherAnalyzer()

@app.route('/api/analyze/<email>', methods=['GET'])
def analyze_teacher(email):
    try:
        result = analyzer.get_teacher_analysis(email)
        if result:
            return jsonify({"success": True, "data": result}), 200
        else:
            return jsonify({"success": False, "message": "Teacher not found or no data available."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/analyze/all', methods=['GET'])
def analyze_all_teachers():
    try:
        results = analyzer.compute_teacher_metrics()
        return jsonify({"success": True, "data": results}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("FLASK_PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"Starting ML API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=debug)
