"use client";

import { useCallback, useRef, useState } from "react";

interface UploadSectionProps {
  onFileChange: (file: File | null) => void;
  accept?: string;
  label: string;
  id: string;
  currentFile?: File | null;
}

export default function UploadSection({
  onFileChange,
  accept = ".pdf,.docx,.doc,.txt",
  label,
  id,
  currentFile,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      // Basic client-side type check
      const ok = /\.(pdf|docx?|txt)$/i.test(file.name);
      if (!ok) {
        alert("Please upload a PDF, DOCX, or TXT file.");
        return;
      }
      onFileChange(file);
    },
    [onFileChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0] ?? null;
      handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);

  const onClick = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
  };

  const onRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const sizeKB = currentFile ? (currentFile.size / 1024).toFixed(1) : null;

  return (
    <div>
      <p className="section-label">{label}</p>
      <div
        id={id}
        className={`upload-zone ${isDragging ? "drag-over" : ""} ${currentFile ? "has-file" : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={currentFile ? undefined : onClick}
        role="button"
        aria-label={currentFile ? `${currentFile.name} selected` : `Upload ${label}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !currentFile) onClick();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          id={`${id}-input`}
          style={{ display: "none" }}
          onChange={onInputChange}
          aria-hidden="true"
        />

        {currentFile ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 32 }}>📄</span>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "var(--green)", fontSize: 14, marginBottom: 2 }}>
                {currentFile.name}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{sizeKB} KB</p>
            </div>
            <button id={`${id}-remove`} className="btn-ghost" onClick={onRemove} type="button">
              ✕ Remove
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 36, opacity: 0.6 }}>⬆️</span>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-secondary)" }}>
              Drag & drop or <span style={{ color: "var(--accent)" }}>browse</span>
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              PDF, DOCX, or TXT · Max 10 MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
