import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { NoticeRecord, ExtractedEvent } from '../types';
import { apiClient } from '../lib/api-client';

interface UploadViewProps {
  onUploadSuccess: (notice: NoticeRecord, events: ExtractedEvent[]) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB



  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB, which exceeds the 10 MB size limit.`);
      setSelectedFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a PDF (.pdf) or image (.png, .jpg, .jpeg).');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // Suggest title from file name
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadAndProcess = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // Stage 1
      setProgressStage('Validating document integrity and 10MB limits...');
      setProgressPercent(15);
      await new Promise(r => setTimeout(r, 200));

      let result: any;

      if (activeTab === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload');
        }

        // Stage 2
        setProgressStage(`Extracting text layer and running OCR on ${selectedFile.name}...`);
        setProgressPercent(35);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title || selectedFile.name);

        result = await apiClient.upload('/api/notices/upload', formData);
      } else {
        if (!rawText.trim()) {
          throw new Error('Please enter or paste the document text');
        }

        setProgressStage('Parsing unstructured text segments...');
        setProgressPercent(40);

        result = await apiClient.post('/api/notices/upload', {
          title: title || 'Pasted Document',
          text: rawText,
        });
      }

      // Stage 3
      setProgressStage('Classifying document purpose & extracting actionable points...');
      setProgressPercent(70);
      await new Promise(r => setTimeout(r, 250));

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to process document');
      }

      // Stage 4
      setProgressStage('Normalizing dates, time intervals and detecting conflicts...');
      setProgressPercent(90);
      await new Promise(r => setTimeout(r, 200));

      setProgressStage('Extraction complete! Loading review gate...');
      setProgressPercent(100);
      await new Promise(r => setTimeout(r, 150));

      onUploadSuccess(result.data.notice, result.data.events);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during document extraction');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Upload & Analyze Document</h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload circulars, office memos, meeting minutes, interview calls, conference announcements, or public advisories to extract clear, actionable information.
        </p>
      </div>

      {/* Upload Box Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        
        {/* Title Input */}
        <div>
          <label htmlFor="notice-title" className="block text-xs font-semibold text-slate-700 mb-1">
            Document Title <span className="text-slate-400 font-normal">(Optional — auto-detected if empty)</span>
          </label>
          <input
            id="notice-title"
            type="text"
            placeholder="e.g. Q4 Executive Team Sync, TechConf 2026 CFP, or Circular No. 42"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            disabled={isProcessing}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
        </div>

        {/* Tab Switcher: File Upload vs Direct Text */}
        <div className="flex flex-col sm:flex-row border-b border-slate-200 gap-1 sm:gap-0">
          <button
            onClick={() => { setActiveTab('file'); setErrorMessage(null); }}
            className={`pb-2.5 sm:pb-3 px-3 sm:px-4 text-xs font-semibold transition border-b-2 flex items-center justify-center sm:justify-start space-x-2 ${
              activeTab === 'file'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="truncate">Upload Document / Scan (PDF, Image)</span>
          </button>
          <button
            onClick={() => { setActiveTab('text'); setErrorMessage(null); }}
            className={`pb-2.5 sm:pb-3 px-3 sm:px-4 text-xs font-semibold transition border-b-2 flex items-center justify-center sm:justify-start space-x-2 ${
              activeTab === 'text'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Paste Document Text</span>
          </button>
        </div>

        {/* Tab 1: File Drag and Drop */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition ${
                isDragging 
                  ? 'border-brand-500 bg-brand-50/50' 
                  : selectedFile 
                    ? 'border-emerald-400 bg-emerald-50/30' 
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{selectedFile.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for extraction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Drag & Drop your document here, or <span className="text-brand-600 underline">browse</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF, PNG, and JPEG files up to 10 MB.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                    <span>PDF text extraction</span>
                    <span>•</span>
                    <span>OCR for scans</span>
                    <span>•</span>
                    <span>10MB size limit</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Raw Text Paste */}
        {activeTab === 'text' && (
          <div className="space-y-2">
            <label htmlFor="raw-notice-text" className="block text-xs font-semibold text-slate-700">
              Document Text
            </label>
            <textarea
              id="raw-notice-text"
              rows={7}
              placeholder="Paste the circular, email, memo, or notice text directly here..."
              value={rawText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRawText(e.target.value)}
              disabled={isProcessing}
              className="w-full text-xs font-mono p-3.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition leading-relaxed"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Characters: {rawText.length}</span>
              <span>100% Client-side validated</span>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Validation or Extraction Error:</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Progress Bar & Stage Indicator */}
        {isProcessing && (
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                <span>{progressStage}</span>
              </span>
              <span className="font-mono text-slate-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleUploadAndProcess}
            disabled={isProcessing || (activeTab === 'file' && !selectedFile) || (activeTab === 'text' && !rawText.trim())}
            className="inline-flex items-center space-x-2 bg-navy-900 hover:bg-navy-850 text-white font-medium px-6 py-3 rounded-xl text-xs shadow-md transition disabled:opacity-50"
          >
            <span>{isProcessing ? 'Analyzing Document...' : 'Analyze & Extract Information'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
