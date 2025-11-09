// Simple file uploader component using native input
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "../hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (contentType?: string) => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (uploadURLs: string[]) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 3,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} is larger than ${maxFileSize / 1024 / 1024}MB`,
        });
        return false;
      }
      return true;
    });

    if (validFiles.length + selectedFiles.length > maxNumberOfFiles) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `Maximum ${maxNumberOfFiles} files allowed`,
      });
      return;
    }

    setSelectedFiles(current => [...current, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selectedFiles) {
        const { url } = await onGetUploadParameters(file.type);
        
        const response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        uploadedUrls.push(url);
      }

      onComplete?.(uploadedUrls);
      setShowModal(false);
      setSelectedFiles([]);
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${uploadedUrls.length} file(s)`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Button 
        type="button" 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        data-testid="button-upload"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                data-testid="input-file"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Maximum {maxNumberOfFiles} files, up to {(maxFileSize / 1024 / 1024).toFixed(0)}MB each
              </div>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Selected {selectedFiles.length} file(s):
                </div>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex justify-between items-center">
                    <span>{file.name} ({(file.size / 1024).toFixed(0)}KB)</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={uploading}
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="flex-1"
                data-testid="button-confirm-upload"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}