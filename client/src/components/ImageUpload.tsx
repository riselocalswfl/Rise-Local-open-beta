import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (imageUrl: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  aspectRatio?: "square" | "landscape" | "portrait" | "flexible";
  disabled?: boolean;
}

export function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  onRemove,
  maxSizeMB = 5,
  aspectRatio = "square",
  disabled = false,
}: ImageUploadProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size
      if (file.size > maxSizeBytes) {
        toast({
          title: "File too large",
          description: `Please select an image smaller than ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setUploading(true);
      setUploadProgress(0);

      try {
        // Step 1: Get presigned upload URL from backend
        const uploadUrlResponse = await apiRequest("POST", "/api/objects/upload");
        const { uploadURL } = await uploadUrlResponse.json();

        setUploadProgress(25);

        // Step 2: Upload file directly to object storage using presigned URL
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        setUploadProgress(75);

        // Step 3: Set ACL policy and get normalized path
        const aclResponse = await apiRequest("PUT", "/api/images", { imageURL: uploadURL });
        const { objectPath } = await aclResponse.json();

        setUploadProgress(100);

        // Cleanup preview
        URL.revokeObjectURL(previewUrl);
        setPreview(null);

        toast({
          title: "Upload successful",
          description: "Your image has been uploaded",
        });

        onUploadComplete(objectPath);
      } catch (error) {
        console.error("Upload error:", error);
        URL.revokeObjectURL(previewUrl);
        setPreview(null);
        toast({
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [maxSizeBytes, maxSizeMB, onUploadComplete, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    onRemove?.();
  };

  const displayImage = preview || currentImageUrl;

  const aspectRatioClass = {
    square: "aspect-square",
    landscape: "aspect-video",
    portrait: "aspect-[3/4]",
    flexible: "min-h-[200px]",
  }[aspectRatio];

  return (
    <div className="space-y-4">
      {displayImage ? (
        <div className="relative">
          <div className={`${aspectRatioClass} w-full overflow-hidden rounded-md border-2 border-border`}>
            <img
              src={displayImage}
              alt="Upload preview"
              className="w-full h-full object-cover"
              data-testid="img-upload-preview"
            />
          </div>
          {!uploading && onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              data-testid="button-remove-image"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="w-3/4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`${aspectRatioClass} w-full border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors hover-elevate active-elevate-2 ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          data-testid="dropzone-upload"
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                <div className="w-48">
                  <Progress value={uploadProgress} />
                </div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                {isDragActive ? (
                  <>
                    <Upload className="w-12 h-12 text-primary" />
                    <p className="text-sm font-medium text-primary">Drop image here</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Drag & drop an image, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF, WebP up to {maxSizeMB}MB
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
