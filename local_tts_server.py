from flask import Flask, request, jsonify
from flask_cors import CORS
from gtts import gTTS
import io
import base64
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pydub import AudioSegment
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Thread pool để xử lý song song
executor = ThreadPoolExecutor(max_workers=4)

def create_audio_chunk(text, lang, chunk_index):
    """Tạo audio cho một chunk văn bản"""
    try:
        print(f"Đang xử lý chunk {chunk_index}: {text[:50]}...")
        tts = gTTS(text=text, lang=lang)
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        audio_data = mp3_fp.read()
        print(f"Hoàn thành chunk {chunk_index}")
        return {
            'index': chunk_index,
            'audio_data': audio_data,
            'success': True
        }
    except Exception as e:
        print(f"Lỗi khi xử lý chunk {chunk_index}: {str(e)}")
        return {
            'index': chunk_index,
            'error': str(e),
            'success': False
        }

def merge_audio_chunks(audio_chunks):
    """Ghép nối các chunk audio thành một file hoàn chỉnh"""
    try:
        if not audio_chunks:
            raise Exception("Không có audio chunks để ghép nối")
        
        # Sắp xếp theo index
        audio_chunks.sort(key=lambda x: x['index'])
        
        # Tạo file tạm thời để lưu audio đầu tiên
        combined_audio = None
        
        for i, chunk in enumerate(audio_chunks):
            if not chunk['success']:
                raise Exception(f"Chunk {chunk['index']} bị lỗi: {chunk.get('error', 'Unknown error')}")
            
            # Tạo AudioSegment từ dữ liệu MP3
            audio_segment = AudioSegment.from_mp3(io.BytesIO(chunk['audio_data']))
            
            if combined_audio is None:
                combined_audio = audio_segment
            else:
                # Thêm khoảng dừng ngắn giữa các chunk (200ms)
                silence = AudioSegment.silent(duration=200)
                combined_audio = combined_audio + silence + audio_segment
        
        # Xuất ra BytesIO
        output_buffer = io.BytesIO()
        combined_audio.export(output_buffer, format="mp3")
        output_buffer.seek(0)
        
        return output_buffer.read()
    except Exception as e:
        print(f"Lỗi khi ghép nối audio: {str(e)}")
        raise e

@app.route('/tts', methods=['POST'])
def tts_endpoint():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
        
        print(f"=== RECEIVED DATA: {data}")
        
        text = data.get('text', '')
        chunks = data.get('chunks', [])
        language_code = data.get('languageCode', 'vi-VN')
        
        print(f"=== EXTRACTED - text: '{text}', chunks: {chunks}")
        
        lang_map = {
            'vi': 'vi', 'vi-VN': 'vi',
            'en': 'en', 'en-US': 'en', 'en-GB': 'en',
            'ja': 'ja', 'ja-JP': 'ja',
            'zh': 'zh-cn', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw'
        }
        gtts_lang = lang_map.get(language_code, 'vi')

        # Kiểm tra xem có text hoặc chunks không
        has_text = text and text.strip()
        has_chunks = chunks and len(chunks) > 0 and any(chunk.strip() for chunk in chunks)
        
        print(f"=== DEBUG: has_text={has_text}, has_chunks={has_chunks}")
        print(f"=== DEBUG: text='{text}', chunks={chunks}")
        
        if not has_text and not has_chunks:
            print("=== DEBUG: Returning 'Text or chunks is required' error")
            return jsonify({'success': False, 'error': 'Text or chunks is required'}), 400

        # Nếu có chunks, xử lý song song
        if chunks and len(chunks) >= 1:
            print(f"Xử lý {len(chunks)} chunks song song...")
            
            # Gửi các task xử lý song song
            future_to_chunk = {}
            for i, chunk_text in enumerate(chunks):
                if chunk_text.strip():
                    future = executor.submit(create_audio_chunk, chunk_text.strip(), gtts_lang, i)
                    future_to_chunk[future] = i
            
            # Thu thập kết quả
            audio_chunks = []
            for future in as_completed(future_to_chunk):
                result = future.result()
                audio_chunks.append(result)
            
            # Ghép nối các audio chunks
            merged_audio = merge_audio_chunks(audio_chunks)
            audio_base64 = base64.b64encode(merged_audio).decode('utf-8')
            
            return jsonify({
                'success': True, 
                'audioContent': audio_base64,
                'chunksProcessed': len(chunks),
                'processingTime': 'parallel'
            }), 200
        
        # Xử lý đơn lẻ như cũ
        else:
            print("=== DEBUG: Processing single text")
            if not has_text:
                print("=== DEBUG: Text is empty in single processing")
                return jsonify({'success': False, 'error': 'Text is empty'}), 400

            print(f"=== DEBUG: Creating gTTS with text length: {len(text)}, lang: {gtts_lang}")
            
            # Kiểm tra độ dài văn bản - nếu quá dài thì chia nhỏ
            MAX_TEXT_LENGTH = 800  # Giới hạn an toàn cho tiếng Việt
            
            if len(text) > MAX_TEXT_LENGTH:
                print(f"=== DEBUG: Text too long ({len(text)} chars), splitting into chunks")
                # Chia văn bản thành các đoạn nhỏ
                text_chunks = []
                sentences = text.split('. ')
                current_chunk = ""
                
                for sentence in sentences:
                    if len(current_chunk + sentence + '. ') <= MAX_TEXT_LENGTH:
                        current_chunk += sentence + '. '
                    else:
                        if current_chunk:
                            text_chunks.append(current_chunk.strip())
                        current_chunk = sentence + '. '
                
                if current_chunk:
                    text_chunks.append(current_chunk.strip())
                
                print(f"=== DEBUG: Split into {len(text_chunks)} chunks")
                
                # Xử lý từng chunk song song
                with ThreadPoolExecutor(max_workers=4) as executor:
                    future_to_chunk = {}
                    for i, chunk_text in enumerate(text_chunks):
                        if chunk_text.strip():
                            future = executor.submit(create_audio_chunk, chunk_text.strip(), gtts_lang, i)
                            future_to_chunk[future] = i
                    
                    # Thu thập kết quả
                    audio_chunks = []
                    for future in as_completed(future_to_chunk):
                        result = future.result()
                        audio_chunks.append(result)
                    
                    # Ghép nối các audio chunks
                    merged_audio = merge_audio_chunks(audio_chunks)
                    audio_base64 = base64.b64encode(merged_audio).decode('utf-8')
                    
                    return jsonify({
                        'success': True, 
                        'audioContent': audio_base64,
                        'chunksProcessed': len(text_chunks),
                        'processingTime': 'auto-chunked'
                    }), 200
            
            # Xử lý văn bản ngắn bình thường
            try:
                tts = gTTS(text=text, lang=gtts_lang)
                print("=== DEBUG: gTTS object created successfully")
                
                mp3_fp = io.BytesIO()
                print("=== DEBUG: Writing to BytesIO...")
                tts.write_to_fp(mp3_fp)
                print("=== DEBUG: Write completed")
                
                mp3_fp.seek(0)
                audio_data = mp3_fp.read()
                print(f"=== DEBUG: Audio data size: {len(audio_data)} bytes")
                
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                print(f"=== DEBUG: Base64 encoded size: {len(audio_base64)} characters")

                return jsonify({'success': True, 'audioContent': audio_base64}), 200
            except Exception as e:
                print(f"=== DEBUG: Error in single text processing: {str(e)}")
                return jsonify({'success': False, 'error': f'TTS Error: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Lỗi TTS: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/tts-chunk', methods=['POST'])
def tts_chunk_endpoint():
    """Endpoint riêng để xử lý một chunk đơn lẻ"""
    try:
        data = request.get_json(silent=True) or {}
        text = (data.get('text') or '').strip()
        language_code = data.get('languageCode', 'vi-VN')
        chunk_index = data.get('chunkIndex', 0)
        
        lang_map = {
            'vi': 'vi', 'vi-VN': 'vi',
            'en': 'en', 'en-US': 'en', 'en-GB': 'en',
            'ja': 'ja', 'ja-JP': 'ja',
            'zh': 'zh-cn', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw'
        }
        gtts_lang = lang_map.get(language_code, 'vi')

        if not text:
            return jsonify({'success': False, 'error': 'Text is empty'}), 400

        result = create_audio_chunk(text, gtts_lang, chunk_index)
        
        if result['success']:
            audio_base64 = base64.b64encode(result['audio_data']).decode('utf-8')
            return jsonify({
                'success': True, 
                'audioContent': audio_base64,
                'chunkIndex': chunk_index
            }), 200
        else:
            return jsonify({
                'success': False, 
                'error': result['error'],
                'chunkIndex': chunk_index
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8765, debug=False)