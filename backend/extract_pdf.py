#!/usr/bin/env python3
"""
PDF Text Extraction using PyMuPDF4LLM
Extracts clean, structured text from PDFs for LLM processing
"""

import sys
import json
import pymupdf4llm

def extract_text_from_pdf(pdf_path):
    """
    Extract text from PDF using PyMuPDF4LLM
    Returns clean markdown-formatted text
    """
    try:
        # Extract text as markdown (preserves structure)
        md_text = pymupdf4llm.to_markdown(pdf_path)
        
        return {
            "success": True,
            "text": md_text,
            "length": len(md_text)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage: python3 extract_pdf.py <pdf_path>"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_text_from_pdf(pdf_path)
    print(json.dumps(result))
