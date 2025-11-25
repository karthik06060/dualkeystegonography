import { useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  preview?: string;
  className?: string;
}

export const ImageUpload = ({ onImageSelect, preview, className }: ImageUploadProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={cn('relative', className)}>
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border-2 border-border group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-h-96 object-contain bg-muted"
          />
          <label className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Change Image</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-card hover:bg-secondary/50 transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium text-foreground">
              <span className="text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, or JPEG (MAX. 10MB)</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
};
