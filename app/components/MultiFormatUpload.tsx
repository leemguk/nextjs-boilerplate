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
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Import Customers from File</h3>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your file here or click to browse
            </p>
            <p className="text-gray-600 mb-4">
              Supports: CSV, Excel (.xlsx, .xls), TSV files
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
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
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.includes('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Format Instructions */}
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-900 mb-2">File Requirements:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Format:</strong> CSV, Excel (.xlsx/.xls), or TSV</li>
          <li>• <strong>Size:</strong> Maximum 10MB</li>
          <li>• <strong>Headers:</strong> Must include Name and Email columns</li>
          <li>• <strong>Data:</strong> One customer per row</li>
        </ul>
        
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">Example format:</p>
          <div className="mt-1 p-2 bg-white rounded border text-xs font-mono">
            Name,Email<br/>
            John Doe,john@example.com<br/>
            Jane Smith,jane@example.com
          </div>
        </div>
      </div>
    </div>
  );
}
