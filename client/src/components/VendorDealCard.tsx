import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Ticket, Edit, Pause, Play, Trash2, Eye } from "lucide-react";
import type { Deal } from "@shared/schema";

interface VendorDealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onPublish: (dealId: string) => void;
  onPause: (dealId: string) => void;
  onDelete: (dealId: string) => void;
  isPublishing?: boolean;
  isPausing?: boolean;
  isDeleting?: boolean;
}

export function VendorDealCard({
  deal,
  onEdit,
  onPublish,
  onPause,
  onDelete,
  isPublishing = false,
  isPausing = false,
  isDeleting = false,
}: VendorDealCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const dealStatus = deal.status || (deal.isActive ? 'published' : 'draft');
  
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Draft" },
    published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
    paused: { bg: "bg-amber-100", text: "text-amber-700", label: "Paused" },
    expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired" },
  };
  
  const status = statusConfig[dealStatus] || statusConfig.draft;
  const isPaused = dealStatus === 'paused';
  const isPublished = dealStatus === 'published';
  const isDraft = dealStatus === 'draft';

  const handleDelete = () => {
    onDelete(deal.id);
    setDeleteDialogOpen(false);
  };

  const metadataItems = [
    deal.valueLabel && { value: deal.valueLabel, highlight: true },
    deal.category,
    deal.city,
  ].filter((item): item is { value: string; highlight: boolean } | string => Boolean(item));

  return (
    <>
      <Card 
        className={`transition-opacity ${isPaused ? 'opacity-80' : ''}`}
        data-testid={`deal-card-${deal.id}`}
      >
        <CardContent className="p-4">
          {/* Top row: Title + Status + Actions */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 
                className="text-base font-semibold leading-snug line-clamp-2"
                data-testid={`deal-title-${deal.id}`}
              >
                {deal.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge 
                className={`${status.bg} ${status.text} border-0`}
                data-testid={`deal-status-${deal.id}`}
              >
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9"
                    data-testid={`deal-actions-menu-${deal.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isPublished && (
                    <DropdownMenuItem asChild>
                      <Link 
                        href={`/dashboard/deals/${deal.id}/redeem`}
                        className="flex items-center gap-2 cursor-pointer"
                        data-testid={`menu-redeem-${deal.id}`}
                      >
                        <Ticket className="h-4 w-4" />
                        Redeem Code
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onEdit(deal)}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid={`menu-edit-${deal.id}`}
                  >
                    <Edit className="h-4 w-4" />
                    Edit Deal
                  </DropdownMenuItem>
                  {isDraft && (
                    <DropdownMenuItem 
                      onClick={() => onPublish(deal.id)}
                      disabled={isPublishing}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`menu-publish-${deal.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      Publish
                    </DropdownMenuItem>
                  )}
                  {isPublished && (
                    <DropdownMenuItem 
                      onClick={() => onPause(deal.id)}
                      disabled={isPausing}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`menu-pause-${deal.id}`}
                    >
                      <Pause className="h-4 w-4" />
                      Pause Deal
                    </DropdownMenuItem>
                  )}
                  {isPaused && (
                    <DropdownMenuItem 
                      onClick={() => onPublish(deal.id)}
                      disabled={isPublishing}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`menu-resume-${deal.id}`}
                    >
                      <Play className="h-4 w-4" />
                      Resume Deal
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    data-testid={`menu-delete-${deal.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Metadata row with dot separators */}
          {metadataItems.length > 0 && (
            <div className="flex items-center flex-wrap gap-x-1 text-sm text-muted-foreground mb-2">
              {metadataItems.map((item, index) => {
                const isHighlight = typeof item === 'object' && item.highlight;
                const value = typeof item === 'object' ? item.value : item;
                return (
                  <span key={index} className="flex items-center">
                    {index > 0 && <span className="mx-1.5">•</span>}
                    <span className={isHighlight ? "font-medium text-green-600" : ""}>
                      {value}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Description */}
          <p 
            className="text-sm text-muted-foreground line-clamp-2 mb-3"
            data-testid={`deal-description-${deal.id}`}
          >
            {deal.description}
          </p>

          {/* Tag pills row */}
          <div className="flex items-center flex-wrap gap-1.5">
            {deal.tier && (
              <Badge variant="outline" className="text-xs">
                {deal.tier === "member" ? "Members Only" : deal.tier === "free" ? "Free" : "Standard"}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {deal.dealType === "bogo" ? "BOGO" : deal.dealType === "percent" ? "% Off" : "Add-on"}
            </Badge>
            {deal.maxRedemptionsPerUser && deal.maxRedemptionsPerUser > 1 && (
              <Badge variant="outline" className="text-xs">
                {deal.maxRedemptionsPerUser}x per person
              </Badge>
            )}
            {deal.endsAt && (
              <Badge variant="outline" className="text-xs">
                Ends: {new Date(deal.endsAt).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Quick Redeem button for published deals on mobile */}
          {isPublished && (
            <div className="mt-3 sm:hidden">
              <Link href={`/dashboard/deals/${deal.id}/redeem`}>
                <Button 
                  variant="default" 
                  className="w-full h-11"
                  data-testid={`button-quick-redeem-${deal.id}`}
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Redeem Code
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deal.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`cancel-delete-${deal.id}`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={`confirm-delete-${deal.id}`}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
