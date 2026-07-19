"""
Text extraction service.

Supports:
  - PDF files  (via pdfplumber)
  - DOCX files (via python-docx)
  - Plain text (direct decode)

All functions accept raw bytes and return a clean string.
"""

import io
import logging

import pdfplumber
from docx import Document

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF byte stream using pdfplumber."""
    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all paragraph text from a DOCX byte stream using python-docx."""
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_bytes: bytes, content_type: str, filename: str = "") -> str:
    """
    Dispatcher: choose the right extractor based on MIME type or file extension.

    Args:
        file_bytes:   Raw file contents.
        content_type: MIME type reported by the browser (e.g. 'application/pdf').
        filename:     Original filename — used as fallback when MIME type is generic.

    Returns:
        Extracted plain text string.

    Raises:
        ValueError: If the file type is not supported.
    """
    ct = content_type.lower()
    name = filename.lower()

    if ct == "application/pdf" or name.endswith(".pdf"):
        logger.info("Extracting text from PDF (%d bytes)", len(file_bytes))
        return extract_text_from_pdf(file_bytes)

    if ct in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or name.endswith(".docx") or name.endswith(".doc"):
        logger.info("Extracting text from DOCX (%d bytes)", len(file_bytes))
        return extract_text_from_docx(file_bytes)

    if ct.startswith("text/") or name.endswith(".txt"):
        logger.info("Decoding plain text (%d bytes)", len(file_bytes))
        return file_bytes.decode("utf-8", errors="replace")

    raise ValueError(
        f"Unsupported file type: content_type='{content_type}', filename='{filename}'. "
        "Please upload a PDF, DOCX, or plain text file."
    )
