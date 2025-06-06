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

type FileFormat = 'csv' | 'xlsx' | 'xls' | 'tsv' | 'google-sheets';

export default function MultiFormatUpload({ onCustomersImported }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileFormat, setFileFormat] = useState<FileFormat>('csv');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [parsedData, setParsedData] = useState<{
    data: string[][];
    sheets?: string[];
    currentSheet?: string;
  }>({ data: [] });
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState<number>(0);
  const [emailColumn, setEmailColumn] = useState<number>(1);
  const [previewData, setPreviewData] = useState<Customer[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: number;
    duplicates: number;
    invalidEmails: number;
  }>({ valid: 0, duplicates: 0, invalidEmails: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<Record<string, string[][]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = {
    csv: { name: 'CSV', extensions: ['.csv'], icon: '📄' },
    xlsx: { name: 'Excel (New)', extensions: ['.xlsx'], icon: '📊' },
    xls: { name: 'Excel (Legacy)', extensions: ['.xls'], icon: '📊' },
    tsv: { name: 'Tab Separated', extensions: ['.tsv', '.txt'], icon: '📝' },
    'google-sheets': { name: 'Google Sheets', extensions: [], icon: '🔗' }
  };

  const parseCSV = (text: string, delimiter: string = ','): string[][] => {
    const lines = text.split('\n');
    const result: string[][] = [];
    
    for (let line of lines) {
      if (line.trim() === '') continue;
      
      // Handle quoted fields
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && (i === 0 || line[i-1] === delimiter)) {
          inQuotes = true;
        } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === delimiter)) {
          inQuotes = false;
        } else if (char === delimiter && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      
      result.push(row);
    }
    
    return result;
  };

  const parseExcel = async (file: File): Promise<{ data: string[][]; sheets: string[]; sheetData: Record<string, string[][]> }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          
          // Load SheetJS dynamically
          const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
          
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellText: false,
            cellDates: true
          });
          
          const sheets = workbook.SheetNames;
          const allSheetData: Record<string, string[][]> = {};
          
          // Parse all sheets
          for (const sheetName of sheets) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              raw: false,
              dateNF: 'yyyy-mm-dd'
            }) as string[][];
            
            // Filter out empty rows
            const filteredData = jsonData.filter(row => 
              row.some(cell => cell && cell.toString().trim() !== '')
            );
            
            allSheetData[sheetName] = filteredData;
          }
          
          // Use first sheet as default
          const firstSheet = sheets[0];
          const firstSheetData = allSheetData[firstSheet];
          
          resolve({
            data: firstSheetData,
            sheets,
            sheetData: allSheetData
          });
          
        } catch (error) {
          console.error('Excel parsing error:', error);
          reject(new Error('Failed to parse Excel file. Please ensure it\'s a valid Excel file.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseGoogleSheets = async (url: string): Promise<string[][]> => {
    try {
      // Extract sheet ID from various Google Sheets URL formats
      const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL');
      }
      
      const sheetId = sheetIdMatch[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      
      // Note: This will only work if the sheet is publicly accessible
      const response = await fetch(csvUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error('Unable to access Google Sheet. Please make sure it\'s publicly accessible.');
      }
      
      const text = await response.text();
      return parseCSV(text);
    } catch (error) {
      throw new Error('Failed to import from Google Sheets. Please check the URL and permissions.');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const processData = (data: string[][], nameCol: number, emailCol: number, sheetName?: string) => {
    const customers: Customer[] = [];
    const emailsSeen = new Set<string>();
    let validCount = 0;
    let duplicateCount = 0;
    let invalidEmailCount = 0;

    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length <= Math.max(nameCol, emailCol)) continue;

      const name = row[nameCol]?.toString().trim() || '';
      const email = row[emailCol]?.toString().trim().toLowerCase() || '';

      if (!name || !email) continue;

      // Check for duplicate emails
      if (emailsSeen.has(email)) {
        duplicateCount++;
        continue;
      }

      // Validate email format
      if (!validateEmail(email)) {
        invalidEmailCount++;
        continue;
      }

      emailsSeen.add(email);
      customers.push({
        name,
        email,
        originalRow: i + 1,
        originalSheet: sheetName
      });
      validCount++;
    }

    setPreviewData(customers);
    setValidationResults({
      valid: validCount,
      duplicates: duplicateCount,
      invalidEmails: invalidEmailCount
    });

    return customers;
  };

  const detectColumns = (headers: string[]) => {
    const headerRow = headers.map(h => h?.toString().toLowerCase() || '');
    const nameIndex = headerRow.findIndex(h => 
      h.includes('name') || h.includes('customer') || h.includes('first') || h.includes('full')
    );
    const emailIndex = headerRow.findIndex(h => 
      h.includes('email') || h.includes('mail') || h.includes('@')
    );

    setNameColumn(nameIndex >= 0 ? nameIndex : 0);
    setEmailColumn(emailIndex >= 0 ? emailIndex : 1);
    
    return { nameIndex: nameIndex >= 0 ? nameIndex : 0, emailIndex: emailIndex >= 0 ? emailIndex : 1 };
  };

  const handleFileSelect = async (file: File) => {
    const fileName = file.name.toLowerCase();
    let detectedFormat: FileFormat = 'csv';
    
    if (fileName.endsWith('.xlsx')) detectedFormat = 'xlsx';
    else if (fileName.endsWith('.xls')) detectedFormat = 'xls';
    else if (fileName.endsWith('.tsv') || fileName.endsWith('.txt')) detectedFormat = 'tsv';
    else if (!fileName.endsWith('.csv')) {
      alert('Unsupported file format. Please use CSV, Excel, or TSV files.');
      return;
    }

    setIsProcessing(true);
    setFileFormat(detectedFormat);
    
    try {
      let parsed: { data: string[][]; sheets?: string[]; sheetData?: Record<string, string[][]> };
      
      switch (detectedFormat) {
        case 'xlsx':
        case 'xls':
          parsed = await parseExcel(file);
          setAvailableSheets(parsed.sheets || []);
          setSheetData(parsed.sheetData || {});
          setSelectedSheet(parsed.sheets?.[0] || '');
          break;
        case 'tsv':
          const tsvText = await file.text();
          parsed = { data: parseCSV(tsvText, '\t') };
          break;
        default: // csv
          const csvText = await file.text();
          parsed = { data: parseCSV(csvText) };
      }
      
      if (parsed.data.length < 2) {
        alert('File must contain at least a header row and one data row');
        setIsProcessing(false);
        return;
      }

      setParsedData(parsed);
      setHeaders(parsed.data[0]);

      // Auto-detect columns and process data
      const { nameIndex, emailIndex } = detectColumns(parsed.data[0]);
      processData(parsed.data, nameIndex, emailIndex, parsed.sheets?.[0]);
      setShowPreview(true);

    } catch (error) {
      alert(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('File parsing error:', error);
    }
    
    setIsProcessing(false);
  };

  const handleSheetChange = (newSheetName: string) => {
    setSelectedSheet(newSheetName);
    const newData = sheetData[newSheetName];
    if (newData) {
      setHeaders(newData[0]);
      setParsedData({ ...parsedData, data: newData });
      const { nameIndex, emailIndex } = detectColumns(newData[0]);
      processData(newData, nameIndex, emailIndex, newSheetName);
    }
  };

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl.trim()) {
      alert('Please enter a Google Sheets URL');
      return;
    }

    setIsProcessing(true);
    
    try {
      const data = await parseGoogleSheets(googleSheetsUrl);
      
      if (data.length < 2) {
        alert('Sheet must contain at least a header row and one data row');
        setIsProcessing(false);
        return;
      }

      setParsedData({ data });
      setHeaders(data[0]);
      
      const { nameIndex, emailIndex } = detectColumns(data[0]);
      processData(data, nameIndex, emailIndex, 'Google Sheet');
      setShowPreview(true);

    } catch (error) {
      alert(`Error importing Google Sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Google Sheets import error:', error);
    }
    
    setIsProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleColumnChange = () => {
    if (parsedData.data.length > 0) {
      processData(parsedData.data, nameColumn, emailColumn, selectedSheet);
    }
  };

  const handleImport = () => {
    onCustomersImported(previewData);
    resetUpload();
  };

  const resetUpload = () => {
    setParsedData({ data: [] });
    setHeaders([]);
    setShowPreview(false);
    setPreviewData([]);
    setGoogleSheetsUrl('');
    setSelectedSheet('');
    setAvailableSheets([]);
    setSheetData({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showPreview) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Import Preview ({supportedFormats[fileFormat].name})</h3>
          <button
            onClick={resetUpload}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕ Cancel
          </button>
        </div>

        {/* Sheet Selection (for Excel files) */}
        {availableSheets.length > 1 && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Sheet
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {availableSheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Column Mapping */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name Column
            </label>
            <select
              value={nameColumn}
              onChange={(e) => {
                setNameColumn(parseInt(e.target.value));
                setTimeout(handleColumnChange, 0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  Column {index + 1}: {header?.toString() || `Column ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Column
            </label>
            <select
              value={emailColumn}
              onChange={(e) => {
                setEmailColumn(parseInt(e.target.value));
                setTimeout(handleColumnChange, 0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  Column {index + 1}: {header?.toString() || `Column ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-600">{validationResults.valid}</div>
            <div className="text-sm text-green-700">Valid Customers</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-2xl font-bold text-yellow-600">{validationResults.duplicates}</div>
            <div className="text-sm text-yellow-700">Duplicates Removed</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded">
            <div className="text-2xl font-bold text-red-600">{validationResults.invalidEmails}</div>
            <div className="text-sm text-red-700">Invalid Emails</div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="max-h-64 overflow-y-auto border rounded">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {previewData.slice(0, 10).map((customer, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{customer.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{customer.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {customer.originalSheet || 'Row'} {customer.originalRow}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {previewData.length > 10 && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
              ... and {previewData.length - 10} more customers
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={resetUpload}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={validationResults.valid === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {validationResults.valid} Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Import Customers</h3>
      
      {/* Format Selection Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(supportedFormats).map(([format, info]) => (
          <button
            key={format}
            onClick={() => setFileFormat(format as FileFormat)}
            className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${
              fileFormat === format
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{info.icon}</span>
            <span>{info.name}</span>
          </button>
        ))}
      </div>

      {/* Google Sheets URL Input */}
      {fileFormat === 'google-sheets' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Sheets URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={googleSheetsUrl}
                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGoogleSheetsImport}
                disabled={isProcessing || !googleSheetsUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">📋 Google Sheets Setup:</h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Click "Share" and set to "Anyone with the link can view"</li>
              <li>Copy the share URL and paste it above</li>
            </ol>
          </div>
        </div>
      ) : (
        /* File Upload Area */
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
              <p className="text-gray-600">Processing {supportedFormats[fileFormat].name} file...</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">{supportedFormats[fileFormat].icon}</div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your {supportedFormats[fileFormat].name} file here
              </p>
              <p className="text-gray-600 mb-4">
                Supported: {supportedFormats[fileFormat].extensions.join(', ') || 'Web URL'}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Choose {supportedFormats[fileFormat].name} File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={supportedFormats[fileFormat].extensions.join(',')}
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
      )}

      {/* Format Instructions */}
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-900 mb-2">Supported Formats:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>📄 CSV/TSV:</strong> Comma or tab separated values
          </div>
          <div>
            <strong>📊 Excel:</strong> .xlsx and .xls files (all sheets)
          </div>
          <div>
            <strong>🔗 Google Sheets:</strong> Direct import via share link
          </div>
          <div>
            <strong>📝 Text Files:</strong> Tab-delimited .txt files
          </div>
        </div>
        
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">Required columns:</p>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>• Customer Name (or First Name)</li>
            <li>• Email Address</li>
            <li>• Header row with column names</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
