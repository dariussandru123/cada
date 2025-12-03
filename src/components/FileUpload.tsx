import { Upload } from 'lucide-react';
import { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md">
      <div
        onClick={handleClick}
        className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".shp,.zip"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        <Upload className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isLoading ? 'Se procesează...' : 'Încarcă fișier Shapefile'}
        </p>
        <p className="text-sm text-gray-500">
          Acceptă fișiere .zip
        </p>
      </div>
    </div>
  );
}
