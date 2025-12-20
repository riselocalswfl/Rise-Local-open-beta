import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface BrandingUploaderProps {
  logoUrl: string | null | undefined;
  bannerUrl: string | null | undefined;
  businessName: string;
  onLogoChange: (url: string | null) => void;
  onBannerChange: (url: string | null) => void;
  disabled?: boolean;
}

export function BrandingUploader({
  logoUrl,
  bannerUrl,
  businessName,
  onLogoChange,
  onBannerChange,
  disabled,
}: BrandingUploaderProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Profile photo / Logo</Label>
            <p className="text-xs text-muted-foreground">Square image, 400x400px recommended</p>
          </div>
          {logoUrl && (
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={logoUrl} alt={businessName} />
              <AvatarFallback>{businessName?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
        </div>
        <ImageUpload
          currentImageUrl={logoUrl}
          onUploadComplete={onLogoChange}
          onRemove={() => onLogoChange(null)}
          maxSizeMB={5}
          aspectRatio="square"
          disabled={disabled}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Cover banner</Label>
            <p className="text-xs text-muted-foreground">Wide image, 1200x400px recommended</p>
          </div>
        </div>
        {bannerUrl && (
          <div className="w-full h-24 rounded-lg overflow-hidden bg-muted">
            <img 
              src={bannerUrl} 
              alt="Cover banner" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <ImageUpload
          currentImageUrl={bannerUrl}
          onUploadComplete={onBannerChange}
          onRemove={() => onBannerChange(null)}
          maxSizeMB={5}
          aspectRatio="landscape"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface BrandingDisplayProps {
  logoUrl: string | null | undefined;
  bannerUrl: string | null | undefined;
  businessName: string;
  tagline?: string | null;
}

export function BrandingDisplay({ logoUrl, bannerUrl, businessName, tagline }: BrandingDisplayProps) {
  return (
    <div className="relative">
      {bannerUrl ? (
        <div className="w-full h-32 sm:h-40 rounded-lg overflow-hidden bg-muted">
          <img 
            src={bannerUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-32 sm:h-40 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
      
      <div className="absolute -bottom-10 left-4">
        <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
          <AvatarImage src={logoUrl || undefined} alt={businessName} />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {businessName?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
