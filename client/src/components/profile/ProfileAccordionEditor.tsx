import { useState, useEffect, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Building2, MapPin, Share2, Clock, Image as ImageIcon, Heart, User } from "lucide-react";
import { HoursEditor, type HoursData } from "./HoursEditor";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { ValuesEditor } from "./ValuesEditor";
import { BrandingUploader } from "./BrandingUploader";
import type { Vendor } from "@shared/schema";

type SectionId = "basics" | "contact" | "location" | "social" | "hours" | "branding" | "values";

interface ProfileFormData {
  businessName: string;
  contactName: string;
  tagline: string;
  bio: string;
  contactEmail: string;
  phone: string;
  website: string;
  address: string;
  addressLine2: string;
  city: string;
  zipCode: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  hours: HoursData | Record<string, string> | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  showLocalSourcing: boolean;
  localSourcingPercent: number;
  values: string[];
}

interface ProfileAccordionEditorProps {
  vendor: Vendor;
  onFieldChange: (updates: Partial<ProfileFormData>) => void;
  isSaving: boolean;
}

function getInitialFormData(vendor: Vendor): ProfileFormData {
  const contact = vendor.contact as any;
  return {
    businessName: vendor.businessName || "",
    contactName: vendor.contactName || "",
    tagline: vendor.tagline || "",
    bio: vendor.bio || "",
    contactEmail: vendor.contactEmail || "",
    phone: contact?.phone || vendor.phone || "",
    website: vendor.website || "",
    address: vendor.address || "",
    addressLine2: (vendor as any).addressLine2 || "",
    city: vendor.city || "Fort Myers",
    zipCode: vendor.zipCode || "",
    instagram: vendor.instagram || "",
    facebook: vendor.facebook || "",
    tiktok: vendor.tiktok || "",
    youtube: vendor.youtube || "",
    twitter: vendor.twitter || "",
    hours: vendor.hours as any,
    logoUrl: vendor.logoUrl || null,
    bannerUrl: vendor.bannerUrl || null,
    showLocalSourcing: vendor.showLocalSourcing || false,
    localSourcingPercent: vendor.localSourcingPercent || 0,
    values: vendor.values || [],
  };
}

export function ProfileAccordionEditor({ vendor, onFieldChange, isSaving }: ProfileAccordionEditorProps) {
  const [formData, setFormData] = useState<ProfileFormData>(() => getInitialFormData(vendor));
  const [openSection, setOpenSection] = useState<string>("basics");
  const [bioLength, setBioLength] = useState(vendor.bio?.length || 0);

  useEffect(() => {
    setFormData(getInitialFormData(vendor));
    setBioLength(vendor.bio?.length || 0);
  }, [vendor]);

  const updateField = <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveField = <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    onFieldChange({ [field]: value } as Partial<ProfileFormData>);
  };

  const saveSocialField = (field: "instagram" | "facebook" | "tiktok" | "youtube" | "twitter", value: string) => {
    updateField(field, value);
    onFieldChange({ [field]: value });
  };

  const sectionComplete = useMemo(() => {
    return {
      basics: !!(formData.businessName && formData.contactName),
      contact: !!(formData.contactEmail || formData.phone),
      location: !!(formData.city && formData.zipCode),
      social: !!(formData.instagram || formData.facebook || formData.tiktok || formData.youtube || formData.twitter),
      hours: !!formData.hours,
      branding: !!(formData.logoUrl || formData.bannerUrl),
      values: !!(formData.showLocalSourcing || formData.values.length > 0),
    };
  }, [formData]);

  const goToNextSection = (current: SectionId) => {
    const sections: SectionId[] = ["basics", "contact", "location", "social", "hours", "branding", "values"];
    const currentIndex = sections.indexOf(current);
    if (currentIndex < sections.length - 1) {
      setOpenSection(sections[currentIndex + 1]);
    }
  };

  const SectionIcon = ({ complete }: { complete: boolean }) => (
    complete 
      ? <Check className="w-4 h-4 text-primary" /> 
      : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
  );

  return (
    <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="space-y-2">
      <AccordionItem value="basics" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.basics} />
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Basics</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name <span className="text-destructive">*</span></Label>
            <Input
              id="businessName"
              value={formData.businessName}
              placeholder="e.g., Sunshine Grove Farm"
              onChange={(e) => updateField("businessName", e.target.value)}
              onBlur={(e) => saveField("businessName", e.target.value)}
              disabled={isSaving}
              data-testid="input-business-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Owner / Contact Name <span className="text-destructive">*</span></Label>
            <Input
              id="contactName"
              value={formData.contactName}
              placeholder="e.g., Jane Smith"
              onChange={(e) => updateField("contactName", e.target.value)}
              onBlur={(e) => saveField("contactName", e.target.value)}
              disabled={isSaving}
              data-testid="input-contact-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              placeholder="A short memorable phrase"
              onChange={(e) => updateField("tagline", e.target.value)}
              onBlur={(e) => saveField("tagline", e.target.value)}
              disabled={isSaving}
              data-testid="input-tagline"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className="text-xs text-muted-foreground">{bioLength}/300</span>
            </div>
            <Textarea
              id="bio"
              value={formData.bio}
              maxLength={300}
              rows={4}
              placeholder="Tell your story..."
              onChange={(e) => {
                updateField("bio", e.target.value);
                setBioLength(e.target.value.length);
              }}
              onBlur={(e) => saveField("bio", e.target.value)}
              disabled={isSaving}
              data-testid="input-bio"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => goToNextSection("basics")}
            data-testid="button-continue-basics"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="contact" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.contact} />
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Contact</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              placeholder="contact@example.com"
              onChange={(e) => updateField("contactEmail", e.target.value)}
              onBlur={(e) => saveField("contactEmail", e.target.value)}
              disabled={isSaving}
              data-testid="input-contact-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              placeholder="(239) 555-0123"
              onChange={(e) => updateField("phone", e.target.value)}
              onBlur={(e) => {
                saveField("phone", e.target.value);
                onFieldChange({ contact: { phone: e.target.value } } as any);
              }}
              disabled={isSaving}
              data-testid="input-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              placeholder="https://yourwebsite.com"
              onChange={(e) => updateField("website", e.target.value)}
              onBlur={(e) => saveField("website", e.target.value)}
              disabled={isSaving}
              data-testid="input-website"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => goToNextSection("contact")}
            data-testid="button-continue-contact"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="location" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.location} />
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Location</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address (optional)</Label>
            <Input
              id="address"
              value={formData.address}
              placeholder="123 Main Street"
              onChange={(e) => updateField("address", e.target.value)}
              onBlur={(e) => saveField("address", e.target.value)}
              disabled={isSaving}
              data-testid="input-address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2 (optional)</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              placeholder="Suite, Apt, Floor"
              onChange={(e) => updateField("addressLine2", e.target.value)}
              onBlur={(e) => saveField("addressLine2", e.target.value)}
              disabled={isSaving}
              data-testid="input-address-line-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                placeholder="Fort Myers"
                onChange={(e) => updateField("city", e.target.value)}
                onBlur={(e) => saveField("city", e.target.value)}
                disabled={isSaving}
                data-testid="input-city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                inputMode="numeric"
                value={formData.zipCode}
                placeholder="33901"
                onChange={(e) => updateField("zipCode", e.target.value)}
                onBlur={(e) => saveField("zipCode", e.target.value)}
                disabled={isSaving}
                data-testid="input-zip-code"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => goToNextSection("location")}
            data-testid="button-continue-location"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="social" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.social} />
            <Share2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Social Links</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <SocialLinksEditor
            value={{
              instagram: formData.instagram,
              facebook: formData.facebook,
              tiktok: formData.tiktok,
              youtube: formData.youtube,
              twitter: formData.twitter,
            }}
            onChange={saveSocialField}
            disabled={isSaving}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => goToNextSection("social")}
            data-testid="button-continue-social"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="hours" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.hours} />
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Hours</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <HoursEditor
            value={formData.hours}
            onChange={(hours) => {
              updateField("hours", hours);
              onFieldChange({ hours: hours as any });
            }}
            disabled={isSaving}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => goToNextSection("hours")}
            data-testid="button-continue-hours"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="branding" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.branding} />
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Branding</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <BrandingUploader
            logoUrl={formData.logoUrl}
            bannerUrl={formData.bannerUrl}
            businessName={formData.businessName}
            onLogoChange={(url) => {
              updateField("logoUrl", url);
              onFieldChange({ logoUrl: url });
            }}
            onBannerChange={(url) => {
              updateField("bannerUrl", url);
              onFieldChange({ bannerUrl: url });
            }}
            disabled={isSaving}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => goToNextSection("branding")}
            data-testid="button-continue-branding"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="values" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <SectionIcon complete={sectionComplete.values} />
            <Heart className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Values</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <ValuesEditor
            showLocalSourcing={formData.showLocalSourcing}
            localSourcingPercent={formData.localSourcingPercent}
            values={formData.values}
            onShowLocalSourcingChange={(show) => {
              updateField("showLocalSourcing", show);
              onFieldChange({ showLocalSourcing: show });
            }}
            onLocalSourcingPercentChange={(percent) => {
              updateField("localSourcingPercent", percent);
              onFieldChange({ localSourcingPercent: percent });
            }}
            onValuesChange={(values) => {
              updateField("values", values);
              onFieldChange({ values });
            }}
            disabled={isSaving}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
