#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để kiểm tra performance của extension mà không cần API key
"""

import requests
import time
import json

def test_local_tts_performance():
    """Test performance của Local TTS server"""
    print("🔍 Kiểm tra Local TTS Server Performance...")
    
    url = "http://127.0.0.1:8765/tts"
    
    # Test với văn bản ngắn
    short_text = "Xin chào, đây là test ngắn."
    
    # Test với văn bản dài
    long_text = """
    Trí tuệ nhân tạo đang thay đổi cách chúng ta sống và làm việc. 
    Từ việc tự động hóa các tác vụ đơn giản đến việc giải quyết các vấn đề phức tạp, 
    AI đã trở thành một phần không thể thiếu trong cuộc sống hiện đại. 
    Các ứng dụng AI có thể được tìm thấy trong nhiều lĩnh vực khác nhau như y tế, giáo dục, giao thông, và giải trí.
    """
    
    def test_tts(text, description):
        """Test TTS với một đoạn văn bản"""
        print(f"\n📝 Test {description} ({len(text)} ký tự)...")
        
        payload = {
            "text": text,
            "languageCode": "vi-VN"
        }
        
        try:
            start_time = time.time()
            
            response = requests.post(
                url,
                json=payload,
                timeout=30
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            print(f"⏱️  Thời gian phản hồi: {response_time:.2f} giây")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('audioContent'):
                    audio_size = len(data['audioContent'])
                    print(f"✅ Thành công! Kích thước audio: {audio_size} bytes")
                    return response_time, True
                else:
                    print(f"❌ Lỗi: {data.get('error', 'Unknown error')}")
                    return response_time, False
            else:
                print(f"❌ Lỗi HTTP {response.status_code}")
                return response_time, False
                
        except requests.exceptions.Timeout:
            print(f"⏰ Timeout sau 30 giây")
            return 30, False
        except requests.exceptions.ConnectionError:
            print(f"❌ Không thể kết nối với TTS server")
            return 0, False
        except Exception as e:
            print(f"❌ Lỗi: {str(e)}")
            return 0, False
    
    # Test TTS performance
    short_time, short_success = test_tts(short_text, "văn bản ngắn")
    long_time, long_success = test_tts(long_text, "văn bản dài")
    
    print("\n" + "="*50)
    print("📊 KẾT QUẢ TTS PERFORMANCE:")
    print("="*50)
    
    if short_success:
        print(f"✅ Văn bản ngắn: {short_time:.2f}s")
    else:
        print(f"❌ Văn bản ngắn: Thất bại")
    
    if long_success:
        print(f"✅ Văn bản dài: {long_time:.2f}s")
    else:
        print(f"❌ Văn bản dài: Thất bại")
    
    if short_success and long_success:
        avg_time = (short_time + long_time) / 2
        print(f"📈 Thời gian trung bình: {avg_time:.2f}s")
        
        if avg_time > 10:
            print("⚠️  CẢNH BÁO: TTS quá chậm (>10s)")
        elif avg_time > 5:
            print("⚠️  TTS hơi chậm (>5s)")
        else:
            print("✅ TTS hoạt động bình thường")

def check_server_status():
    """Kiểm tra trạng thái các server"""
    print("🔍 Kiểm tra trạng thái server...")
    
    # Kiểm tra TTS server
    try:
        response = requests.get("http://127.0.0.1:8765/", timeout=5)
        print("✅ TTS Server đang chạy")
    except:
        print("❌ TTS Server không phản hồi")
    
    # Kiểm tra kết nối internet
    try:
        response = requests.get("https://www.google.com", timeout=5)
        print("✅ Kết nối internet bình thường")
    except:
        print("❌ Có vấn đề với kết nối internet")

def analyze_potential_issues():
    """Phân tích các vấn đề tiềm ẩn"""
    print("\n🔍 PHÂN TÍCH CÁC VẤN ĐỀ TIỀM ẨN:")
    print("="*50)
    
    issues = []
    
    # Kiểm tra file cấu hình
    try:
        with open('requirements.txt', 'r') as f:
            requirements = f.read()
            if 'pydub' not in requirements:
                issues.append("❌ Thiếu pydub trong requirements.txt")
            else:
                print("✅ requirements.txt có pydub")
    except:
        issues.append("❌ Không tìm thấy requirements.txt")
    
    # Kiểm tra batch file
    try:
        with open('Start_Gemini_TTS_Server.bat', 'r', encoding='utf-8') as f:
            batch_content = f.read()
            if 'pip install -r' in batch_content:
                print("✅ Batch file cài đặt dependencies")
            else:
                issues.append("⚠️  Batch file có thể không cài đặt đầy đủ dependencies")
    except:
        issues.append("❌ Không tìm thấy Start_Gemini_TTS_Server.bat")
    
    if issues:
        print("\n🚨 CÁC VẤN ĐỀ PHÁT HIỆN:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ Không phát hiện vấn đề cấu hình")
    
    print("\n💡 ĐỀ XUẤT KHẮC PHỤC:")
    print("1. Kiểm tra kết nối mạng")
    print("2. Đảm bảo Gemini API key hợp lệ")
    print("3. Restart TTS server nếu cần")
    print("4. Kiểm tra firewall/antivirus")
    print("5. Thử với văn bản ngắn hơn")

if __name__ == "__main__":
    print("🚀 KIỂM TRA PERFORMANCE EXTENSION")
    print("="*50)
    
    check_server_status()
    test_local_tts_performance()
    analyze_potential_issues()