/**
 * Text Chunker Utility
 * Chia nhỏ văn bản thành các đoạn phù hợp cho TTS
 */

class TextChunker {
    constructor(options = {}) {
        this.maxChunkLength = options.maxChunkLength || 500; // Độ dài tối đa mỗi chunk
        this.minChunkLength = options.minChunkLength || 50;  // Độ dài tối thiểu mỗi chunk
        this.sentenceBreakers = options.sentenceBreakers || ['.', '!', '?', '。', '！', '？'];
        this.phraseBreakers = options.phraseBreakers || [',', ';', ':', '，', '；', '：'];
        this.lineBreakers = options.lineBreakers || ['\n', '\r\n'];
    }

    /**
     * Chia văn bản thành các chunk
     * @param {string} text - Văn bản cần chia
     * @returns {Array} Mảng các chunk
     */
    chunkText(text) {
        if (!text || text.trim().length === 0) {
            return [];
        }

        text = text.trim();
        
        // Nếu văn bản ngắn hơn maxChunkLength, trả về nguyên văn
        if (text.length <= this.maxChunkLength) {
            return [text];
        }

        const chunks = [];
        let currentChunk = '';
        
        // Chia theo câu trước
        const sentences = this.splitBySentences(text);
        
        for (const sentence of sentences) {
            // Nếu câu hiện tại quá dài, chia nhỏ hơn nữa
            if (sentence.length > this.maxChunkLength) {
                // Lưu chunk hiện tại nếu có
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                
                // Chia câu dài thành các phần nhỏ hơn
                const subChunks = this.splitLongSentence(sentence);
                chunks.push(...subChunks);
            } else {
                // Kiểm tra xem có thể thêm câu vào chunk hiện tại không
                const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
                
                if (potentialChunk.length <= this.maxChunkLength) {
                    currentChunk = potentialChunk;
                } else {
                    // Lưu chunk hiện tại và bắt đầu chunk mới
                    if (currentChunk.trim()) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = sentence;
                }
            }
        }
        
        // Thêm chunk cuối cùng
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return this.optimizeChunks(chunks);
    }

    /**
     * Chia văn bản theo câu
     * @param {string} text 
     * @returns {Array}
     */
    splitBySentences(text) {
        const sentences = [];
        let currentSentence = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            currentSentence += char;
            
            // Kiểm tra dấu kết thúc câu
            if (this.sentenceBreakers.includes(char)) {
                // Kiểm tra xem có phải là số thập phân không (ví dụ: 3.14)
                if (char === '.' && i > 0 && i < text.length - 1) {
                    const prevChar = text[i - 1];
                    const nextChar = text[i + 1];
                    if (/\d/.test(prevChar) && /\d/.test(nextChar)) {
                        continue; // Bỏ qua dấu chấm trong số thập phân
                    }
                }
                
                sentences.push(currentSentence.trim());
                currentSentence = '';
            }
        }
        
        // Thêm phần còn lại
        if (currentSentence.trim()) {
            sentences.push(currentSentence.trim());
        }
        
        return sentences.filter(s => s.length > 0);
    }

    /**
     * Chia câu dài thành các phần nhỏ hơn
     * @param {string} sentence 
     * @returns {Array}
     */
    splitLongSentence(sentence) {
        if (sentence.length <= this.maxChunkLength) {
            return [sentence];
        }

        const chunks = [];
        
        // Thử chia theo dấu phẩy, chấm phẩy trước
        const phrases = this.splitByPhrases(sentence);
        let currentChunk = '';
        
        for (const phrase of phrases) {
            if (phrase.length > this.maxChunkLength) {
                // Nếu phrase vẫn quá dài, chia theo từ
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                
                const wordChunks = this.splitByWords(phrase);
                chunks.push(...wordChunks);
            } else {
                const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + phrase;
                
                if (potentialChunk.length <= this.maxChunkLength) {
                    currentChunk = potentialChunk;
                } else {
                    if (currentChunk.trim()) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = phrase;
                }
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    /**
     * Chia theo cụm từ (dấu phẩy, chấm phẩy)
     * @param {string} text 
     * @returns {Array}
     */
    splitByPhrases(text) {
        const phrases = [];
        let currentPhrase = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            currentPhrase += char;
            
            if (this.phraseBreakers.includes(char)) {
                phrases.push(currentPhrase.trim());
                currentPhrase = '';
            }
        }
        
        if (currentPhrase.trim()) {
            phrases.push(currentPhrase.trim());
        }
        
        return phrases.filter(p => p.length > 0);
    }

    /**
     * Chia theo từ (phương án cuối cùng)
     * @param {string} text 
     * @returns {Array}
     */
    splitByWords(text) {
        const words = text.split(/\s+/);
        const chunks = [];
        let currentChunk = '';
        
        for (const word of words) {
            const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;
            
            if (potentialChunk.length <= this.maxChunkLength) {
                currentChunk = potentialChunk;
            } else {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                
                // Nếu từ đơn lẻ vẫn quá dài, cắt cứng
                if (word.length > this.maxChunkLength) {
                    const wordChunks = this.hardSplit(word);
                    chunks.push(...wordChunks);
                    currentChunk = '';
                } else {
                    currentChunk = word;
                }
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks;
    }

    /**
     * Cắt cứng văn bản quá dài
     * @param {string} text 
     * @returns {Array}
     */
    hardSplit(text) {
        const chunks = [];
        for (let i = 0; i < text.length; i += this.maxChunkLength) {
            chunks.push(text.slice(i, i + this.maxChunkLength));
        }
        return chunks;
    }

    /**
     * Tối ưu hóa các chunk (gộp các chunk quá ngắn)
     * @param {Array} chunks 
     * @returns {Array}
     */
    optimizeChunks(chunks) {
        const optimized = [];
        let currentChunk = '';
        
        for (const chunk of chunks) {
            if (chunk.length < this.minChunkLength && currentChunk) {
                const combined = currentChunk + ' ' + chunk;
                if (combined.length <= this.maxChunkLength) {
                    currentChunk = combined;
                    continue;
                }
            }
            
            if (currentChunk) {
                optimized.push(currentChunk);
            }
            currentChunk = chunk;
        }
        
        if (currentChunk) {
            optimized.push(currentChunk);
        }
        
        return optimized.filter(chunk => chunk.trim().length > 0);
    }

    /**
     * Ước tính thời gian đọc cho mỗi chunk
     * @param {string} chunk 
     * @returns {number} Thời gian tính bằng giây
     */
    estimateReadingTime(chunk) {
        // Ước tính 150 từ/phút cho tiếng Việt
        const wordsPerMinute = 150;
        const words = chunk.split(/\s+/).length;
        return Math.max(1, Math.ceil((words / wordsPerMinute) * 60));
    }
}

// Export cho sử dụng trong extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextChunker;
} else if (typeof window !== 'undefined') {
    window.TextChunker = TextChunker;
}