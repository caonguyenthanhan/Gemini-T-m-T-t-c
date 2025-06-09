// Import các module cần thiết của Node.js
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// --- CẤU HÌNH: Vui lòng điền thông tin của bạn vào đây ---
const APP_ID = 'up69ibbf';           // Thay bằng APPID của bạn
const API_KEY = 'f562b001693e0d9dd0657a5510f31420';         // Thay bằng APIKey của bạn
const API_SECRET = 'bd0626fbf8883a63ba8e72ba635e3e9e';   // Thay bằng APISecret của bạn
const TEXT_TO_SYNTHESIZE = 'Xin chào Việt Nam, tôi là trợ lý ảo của iFLYTEK.';
const OUTPUT_FILE = 'output.mp3';
// -------------------------------------------------------------

const HOST = 'tts-api.xfyun.cn';
const PATH = '/v2/tts';

/**
 * Hàm chính để chạy kiểm tra
 */
async function runTest() {
    console.log("Bắt đầu kiểm tra API iFLYTEK TTS...");

    try {
        // 1. Tạo URL xác thực
        const authUrl = getAuthorizationUrl();
        console.log("Đã tạo URL xác thực thành công.");

        // 2. Gửi yêu cầu đến API
        const audioBase64 = await sendRequest(authUrl);
        console.log("Đã nhận được dữ liệu âm thanh từ API.");

        // 3. Lưu tệp âm thanh
        saveAudioFile(audioBase64);
        console.log(`✅ Thành công! Tệp âm thanh đã được lưu tại: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ Đã xảy ra lỗi trong quá trình kiểm tra:", error.message);
    }
}

/**
 * Tạo URL chứa thông tin xác thực
 * @returns {string} URL đầy đủ để gọi API
 */
function getAuthorizationUrl() {
    const date = new Date().toUTCString();
    const requestLine = `POST ${PATH} HTTP/1.1`;

    // Tạo chuỗi signature
    const signatureOrigin = `host: ${HOST}\ndate: ${date}\n${requestLine}`;
    const signature = crypto
        .createHmac('sha256', API_SECRET)
        .update(signatureOrigin)
        .digest('base64');

    // Tạo chuỗi authorization
    const authOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authOrigin).toString('base64');

    // Trả về URL hoàn chỉnh
    return `https://${HOST}${PATH}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${HOST}`;
}

/**
 * Gửi yêu cầu POST đến API iFLYTEK
 * @param {string} url - URL đã có xác thực
 * @returns {Promise<string>} Dữ liệu âm thanh được mã hóa base64
 */
function sendRequest(url) {
    return new Promise((resolve, reject) => {
        // Cấu trúc body của request
        const requestBody = JSON.stringify({
            header: {
                app_id: APP_ID,
                status: 3,
            },
            parameter: {
                tts: {
                    vcn: 'banmai', // Giọng đọc tiếng Việt
                    volume: 50,
                    speed: 50,
                    pitch: 50,
                    aue: 'raw', // Định dạng MP3
                    tte: 'UTF8',
                },
            },
            payload: {
                text: {
                    encoding: 'UTF8',
                    status: 3,
                    text: Buffer.from(TEXT_TO_SYNTHESIZE).toString('base64'),
                },
            },
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
            },
        };

        const req = https.request(url, options, (res) => {
            let fullResponse = '';
            res.on('data', (chunk) => {
                fullResponse += chunk;
            });
            res.on('end', () => {
                try {
                    const responseJson = JSON.parse(fullResponse);
                    if (responseJson.header.code === 0) {
                        resolve(responseJson.payload.audio.audio);
                    } else {
                        reject(new Error(`API trả về lỗi: [${responseJson.header.code}] ${responseJson.header.message}`));
                    }
                } catch (e) {
                    reject(new Error(`Không thể phân tích phản hồi JSON: ${fullResponse}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Yêu cầu thất bại: ${e.message}`));
        });

        // Gửi body
        req.write(requestBody);
        req.end();
    });
}

/**
 * Giải mã base64 và lưu tệp âm thanh
 * @param {string} audioBase64 - Chuỗi base64 chứa dữ liệu âm thanh
 */
function saveAudioFile(audioBase64) {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(OUTPUT_FILE, audioBuffer);
}

// Chạy hàm test
runTest();