from flask import Flask, request, jsonify
from flask_cors import CORS
from gtts import gTTS
import io
import base64
import json

app = Flask(__name__)
CORS(app)

@app.route('/tts', methods=['POST'])
def tts_endpoint():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            try:
                raw = request.data.decode('utf-8') if request.data else ''
                data = json.loads(raw) if raw else {}
            except Exception:
                return jsonify({'success': False, 'error': 'Invalid JSON'}), 400
        text = (data.get('text') or '').strip()
        language_code = data.get('languageCode', 'vi-VN')
        lang_map = {
            'vi': 'vi', 'vi-VN': 'vi',
            'en': 'en', 'en-US': 'en', 'en-GB': 'en',
            'ja': 'ja', 'ja-JP': 'ja',
            'zh': 'zh-cn', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw'
        }
        gtts_lang = lang_map.get(language_code, 'vi')

        if not text:
            return jsonify({'success': False, 'error': 'Text is empty'}), 400

        tts = gTTS(text=text, lang=gtts_lang)
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        audio_base64 = base64.b64encode(mp3_fp.read()).decode('utf-8')

        return jsonify({'success': True, 'audioContent': audio_base64}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=False)