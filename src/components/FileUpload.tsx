import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 transition-all duration-300",
        isDragActive ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 hover:border-slate-300 bg-white",
        isProcessing && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          isDragActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
        )}>
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {isProcessing ? "Analyzing ESG Report..." : "Upload ESG Report"}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Drag and drop your sustainability report (PDF) here to start the verification process.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
          <FileText className="w-4 h-4" />
          <span>PDF files only (max 20MB)</span>
        </div>
      </div>
    </div>
  );
};
