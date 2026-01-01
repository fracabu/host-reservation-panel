import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onProcessFiles: (files: FileList) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onProcessFiles }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      onProcessFiles(files);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [onProcessFiles]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div 
      className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${dragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleChange}
        className="hidden"
        id="file-upload-input"
      />
      <label htmlFor="file-upload-input" className="cursor-pointer">
        <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold text-indigo-600">Trascina i tuoi report</span> o clicca per caricarli
            </p>
            <p className="text-xs text-gray-500 mt-1">
                Supporta CSV, Excel (XLS/XLSX), Immagini e PDF
            </p>
            <button
              type="button"
              onClick={onButtonClick}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Seleziona File
            </button>
        </div>
      </label>
    </div>
  );
};

export default FileUpload;
