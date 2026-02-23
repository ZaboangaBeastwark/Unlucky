import sys
try:
    import PyPDF2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    import PyPDF2

try:
    reader = PyPDF2.PdfReader('DH-Livro-BasicoBR.pdf')
    text = ''
    for i in range(12, 82):
        if i < len(reader.pages):
            text += reader.pages[i].extract_text() + '\n'
    with open('dh_rules_extracted.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Extracted successfully.")
except Exception as e:
    print(f"Error: {e}")
