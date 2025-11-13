# Test logic xử lý chunks
def test_logic():
    # Giả lập dữ liệu từ request
    text = ""
    chunks = ["Test chunk 1", "Test chunk 2"]
    
    # Logic giống như trong server
    has_text = text and text.strip()
    has_chunks = chunks and len(chunks) > 0 and any(chunk.strip() for chunk in chunks)
    
    print(f"text = '{text}'")
    print(f"chunks = {chunks}")
    print(f"has_text = {has_text}")
    print(f"has_chunks = {has_chunks}")
    print(f"not has_text and not has_chunks = {not has_text and not has_chunks}")
    
    # Kiểm tra điều kiện chunks
    print(f"chunks = {chunks}")
    print(f"len(chunks) = {len(chunks) if chunks else 'None'}")
    print(f"chunks and len(chunks) >= 1 = {chunks and len(chunks) >= 1}")
    
    if not has_text and not has_chunks:
        print("ERROR: Text or chunks is required")
    elif chunks and len(chunks) >= 1:
        print("SUCCESS: Processing chunks")
    else:
        print("Processing single text")
        if not has_text:
            print("ERROR: Text is empty")

if __name__ == "__main__":
    test_logic()