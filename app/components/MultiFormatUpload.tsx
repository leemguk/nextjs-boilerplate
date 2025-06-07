'use client';

import { useState, useRef } from 'react';

interface Customer {
  name: string;
  email: string;
  originalRow?: number;
  originalSheet?: string;
}

interface FileUploadProps {
  onCustomersImported: (customers: Customer[]) => void;
}

export default function MultiFormatUpload({ onCustomersImported }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    // Check file type
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && 
        !fileName.endsWith('.xls') && !fileName.endsWith('.tsv')) {
      setMessage('❌ Please select a CSV, Excel, or TSV file');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage('❌ File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/upload/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const { customers, validation } = result.data;
        
        if (customers.length === 0) {
          setMessage('❌ No valid customers found in file. Please check the format.');
          return;
        }

        // Import the customers
        onCustomersImported(customers);
        
        setMessage(`✅ Successfully imported ${validation.valid} customers! ${
          validation.duplicates > 0 ? `(${validation.duplicates} duplicates removed)` : ''
        }`);

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <div>
            {/* File Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your file here or click to browse
            </h3>
            <p className="text-gray-500 mb-6">
              Supports: CSV, Excel (.xlsx, .xls), TSV files
            </p>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose File
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* File Requirements */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">File Requirements:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Format:</strong> CSV, Excel (.xlsx/.xls), or TSV</li>
          <li>• <strong>Size:</strong> Maximum 10MB</li>
          <li>• <strong>Headers:</strong> Must include Name and Email columns</li>
          <li>• <strong>Data:</strong> One customer per row</li>
        </ul>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Example format:</p>
          <div className="bg-white rounded border p-3 text-sm font-mono">
            <div className="text-gray-600">Name,Email</div>
            <div className="text-gray-800">John Doe,john@example.com</div>
            <div className="text-gray-800">Jane Smith,jane@example.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
