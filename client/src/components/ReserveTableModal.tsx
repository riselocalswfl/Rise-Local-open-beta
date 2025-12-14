import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Users, ExternalLink, Phone, CheckCircle2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "@shared/schema";

interface ReserveTableModalProps {
  restaurantId: string;
  restaurantName: string;
  availableDeals?: Deal[];
  trigger?: React.ReactNode;
}

interface ReservationResponse {
  reservationId: string;
  status: string;
  reservationMethod: string | null;
  restaurantName: string;
  redirectUrl?: string;
  phone?: string;
  message: string;
}

type ModalStep = "form" | "confirmation";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useState(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      setMatches(media.matches);
      const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  });

  return matches;
}

export default function ReserveTableModal({
  restaurantId,
  restaurantName,
  availableDeals = [],
  trigger,
}: ReserveTableModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("form");
  const [partySize, setPartySize] = useState("2");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [reservationResult, setReservationResult] = useState<ReservationResponse | null>(null);
  const { toast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const reservationMutation = useMutation({
    mutationFn: async (): Promise<ReservationResponse> => {
      const requestedTime = new Date(`${date}T${time}`);
      const response = await apiRequest("POST", "/api/reservations/initiate", {
        restaurantId,
        partySize: parseInt(partySize),
        requestedTime: requestedTime.toISOString(),
        dealClaimId: selectedDeal?.id || null,
        specialRequests: specialRequests || null,
      });
      return response.json();
    },
    onSuccess: (data: ReservationResponse) => {
      setReservationResult(data);
      setStep("confirmation");
      
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Reservation Failed",
        description: error.message || "Unable to initiate reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!date || !time) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your reservation.",
        variant: "destructive",
      });
      return;
    }
    reservationMutation.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("form");
      setPartySize("2");
      setDate("");
      setTime("");
      setSelectedDeal(null);
      setSpecialRequests("");
      setReservationResult(null);
    }, 300);
  };

  const formContent = (
    <div className="space-y-5 px-1">
      <div className="space-y-2">
        <Label htmlFor="partySize" className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          Party Size
        </Label>
        <Select value={partySize} onValueChange={setPartySize}>
          <SelectTrigger id="partySize" data-testid="select-party-size">
            <SelectValue placeholder="Select party size" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size} {size === 1 ? "Guest" : "Guests"}
              </SelectItem>
            ))}
            <SelectItem value="11">Large Party (11+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full"
            data-testid="input-date"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Time
          </Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
            data-testid="input-time"
          />
        </div>
      </div>

      {availableDeals.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Attach a Deal (Optional)
          </Label>
          <div className="space-y-2">
            {availableDeals.map((deal) => (
              <button
                key={deal.id}
                type="button"
                onClick={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedDeal?.id === deal.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover-elevate"
                }`}
                data-testid={`button-deal-${deal.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{deal.description}</p>
                  </div>
                  {selectedDeal?.id === deal.id && (
                    <Badge variant="default" className="shrink-0">Selected</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="specialRequests" className="text-sm font-medium">
          Special Requests (Optional)
        </Label>
        <Textarea
          id="specialRequests"
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Allergies, celebrations, seating preferences..."
          className="resize-none"
          rows={2}
          data-testid="input-special-requests"
        />
      </div>
    </div>
  );

  const confirmationContent = (
    <div className="space-y-6 text-center px-1">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Reservation Started</h3>
        <p className="text-sm text-muted-foreground">
          Your reservation will be completed through {restaurantName}'s official booking system.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Party Size</span>
          <span className="font-medium">{partySize} {parseInt(partySize) === 1 ? "Guest" : "Guests"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Date & Time</span>
          <span className="font-medium">
            {date && new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {time}
          </span>
        </div>
        {selectedDeal && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deal</span>
            <span className="font-medium text-primary">{selectedDeal.title}</span>
          </div>
        )}
      </div>

      {selectedDeal && (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Your Deal QR Code</p>
          <div className="flex justify-center">
            <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <div className="text-center">
                <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">QR Code</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Show this to your server when you arrive to redeem your deal.
          </p>
        </div>
      )}

      {reservationResult?.redirectUrl && (
        <Button
          className="w-full gap-2"
          onClick={() => window.open(reservationResult.redirectUrl, "_blank", "noopener,noreferrer")}
          data-testid="button-open-booking"
        >
          <ExternalLink className="h-4 w-4" />
          Open Booking Page
        </Button>
      )}

      {reservationResult?.phone && !reservationResult?.redirectUrl && (
        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={() => window.open(`tel:${reservationResult.phone}`, "_self")}
          data-testid="button-call-restaurant"
        >
          <Phone className="h-4 w-4" />
          Call {reservationResult.phone}
        </Button>
      )}
    </div>
  );

  const defaultTrigger = (
    <Button data-testid="button-reserve-table">
      Reserve a Table
    </Button>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "form" ? `Reserve at ${restaurantName}` : "Reservation Initiated"}
            </DialogTitle>
            <DialogDescription>
              {step === "form"
                ? "Select your preferred date, time, and party size."
                : reservationResult?.message || "Complete your booking through the restaurant."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            {step === "form" ? formContent : confirmationContent}
          </div>

          {step === "form" && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={reservationMutation.isPending}
                className="flex-1"
                data-testid="button-submit-reservation"
              >
                {reservationMutation.isPending ? "Processing..." : "Continue"}
              </Button>
            </div>
          )}

          {step === "confirmation" && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
              data-testid="button-done"
            >
              Done
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DrawerTrigger asChild>
        {trigger || defaultTrigger}
      </DrawerTrigger>
      <DrawerContent>
        <div className="max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {step === "form" ? `Reserve at ${restaurantName}` : "Reservation Initiated"}
            </DrawerTitle>
            <DrawerDescription>
              {step === "form"
                ? "Select your preferred date, time, and party size."
                : reservationResult?.message || "Complete your booking through the restaurant."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4">
            {step === "form" ? formContent : confirmationContent}
          </div>
        </div>

        <DrawerFooter className="border-t pt-4">
          {step === "form" ? (
            <div className="flex gap-3">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1" data-testid="button-cancel-mobile">
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                onClick={handleSubmit}
                disabled={reservationMutation.isPending}
                className="flex-1"
                data-testid="button-submit-reservation-mobile"
              >
                {reservationMutation.isPending ? "Processing..." : "Continue"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
              data-testid="button-done-mobile"
            >
              Done
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
