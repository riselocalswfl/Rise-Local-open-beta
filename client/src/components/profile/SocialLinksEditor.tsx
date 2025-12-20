import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiInstagram, SiFacebook, SiTiktok, SiYoutube, SiX } from "react-icons/si";

interface SocialLinks {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  twitter?: string | null;
}

interface SocialLinksEditorProps {
  value: SocialLinks;
  onChange: (field: keyof SocialLinks, value: string) => void;
  disabled?: boolean;
}

const SOCIAL_PLATFORMS = [
  { key: "instagram" as const, label: "Instagram", icon: SiInstagram, placeholder: "@yourbusiness" },
  { key: "facebook" as const, label: "Facebook", icon: SiFacebook, placeholder: "YourBusinessPage" },
  { key: "tiktok" as const, label: "TikTok", icon: SiTiktok, placeholder: "@yourbusiness" },
  { key: "youtube" as const, label: "YouTube", icon: SiYoutube, placeholder: "@yourchannel" },
  { key: "twitter" as const, label: "X (Twitter)", icon: SiX, placeholder: "@yourbusiness" },
];

export function SocialLinksEditor({ value, onChange, disabled }: SocialLinksEditorProps) {
  return (
    <div className="space-y-3">
      {SOCIAL_PLATFORMS.map((platform) => {
        const Icon = platform.icon;
        return (
          <div key={platform.key} className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-muted">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Label htmlFor={`social-${platform.key}`} className="sr-only">{platform.label}</Label>
              <Input
                id={`social-${platform.key}`}
                value={value[platform.key] || ""}
                onChange={(e) => onChange(platform.key, e.target.value)}
                placeholder={platform.placeholder}
                disabled={disabled}
                className="h-10"
                data-testid={`input-social-${platform.key}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SocialLinksDisplay({ links }: { links: SocialLinks }) {
  const filledLinks = SOCIAL_PLATFORMS.filter((p) => links[p.key]);
  
  if (filledLinks.length === 0) return null;

  return (
    <div className="flex gap-3">
      {filledLinks.map((platform) => {
        const Icon = platform.icon;
        const value = links[platform.key];
        let href = value || "";
        
        if (platform.key === "instagram" && value) {
          href = value.startsWith("http") ? value : `https://instagram.com/${value.replace(/^@/, "")}`;
        } else if (platform.key === "facebook" && value) {
          href = value.startsWith("http") ? value : `https://facebook.com/${value}`;
        } else if (platform.key === "tiktok" && value) {
          href = value.startsWith("http") ? value : `https://tiktok.com/${value.replace(/^@/, "")}`;
        } else if (platform.key === "youtube" && value) {
          href = value.startsWith("http") ? value : `https://youtube.com/${value.replace(/^@/, "")}`;
        } else if (platform.key === "twitter" && value) {
          href = value.startsWith("http") ? value : `https://x.com/${value.replace(/^@/, "")}`;
        }

        return (
          <a
            key={platform.key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted hover-elevate active-elevate-2"
            data-testid={`link-social-${platform.key}`}
          >
            <Icon className="w-5 h-5" />
          </a>
        );
      })}
    </div>
  );
}
