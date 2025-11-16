import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Truck, Package } from "lucide-react";
import type { FulfillmentOptions } from "@shared/schema";

interface FulfillmentEditorProps {
  value: FulfillmentOptions;
  onChange: (value: FulfillmentOptions) => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function FulfillmentEditor({ value, onChange }: FulfillmentEditorProps) {
  const [localValue, setLocalValue] = useState<FulfillmentOptions>(
    value || { pickup: { enabled: false }, delivery: { enabled: false }, shipping: { enabled: false } }
  );

  const updateValue = (newValue: FulfillmentOptions) => {
    setLocalValue(newValue);
    onChange({ ...newValue, lastUpdated: new Date().toISOString() });
  };

  const togglePickup = (enabled: boolean) => {
    updateValue({
      ...localValue,
      pickup: {
        enabled,
        locations: enabled ? localValue.pickup?.locations || [] : [],
      },
    });
  };

  const addPickupLocation = () => {
    const newLocation = {
      id: crypto.randomUUID(),
      name: "",
      address: "",
      days: [],
      timeWindow: "",
      instructions: "",
    };
    updateValue({
      ...localValue,
      pickup: {
        ...localValue.pickup,
        enabled: true,
        locations: [...(localValue.pickup?.locations || []), newLocation],
      },
    });
  };

  const updatePickupLocation = (id: string, field: string, newValue: any) => {
    updateValue({
      ...localValue,
      pickup: {
        ...localValue.pickup,
        enabled: true,
        locations: localValue.pickup?.locations?.map(loc =>
          loc.id === id ? { ...loc, [field]: newValue } : loc
        ),
      },
    });
  };

  const removePickupLocation = (id: string) => {
    updateValue({
      ...localValue,
      pickup: {
        ...localValue.pickup,
        enabled: true,
        locations: localValue.pickup?.locations?.filter(loc => loc.id !== id),
      },
    });
  };

  const togglePickupDay = (locationId: string, day: string) => {
    const location = localValue.pickup?.locations?.find(loc => loc.id === locationId);
    if (!location) return;

    const days = location.days.includes(day)
      ? location.days.filter(d => d !== day)
      : [...location.days, day];

    updatePickupLocation(locationId, "days", days);
  };

  const toggleDelivery = (enabled: boolean) => {
    updateValue({
      ...localValue,
      delivery: {
        enabled,
        radiusMiles: enabled ? localValue.delivery?.radiusMiles || 10 : undefined,
        baseFeeCents: enabled ? localValue.delivery?.baseFeeCents || 0 : undefined,
        minOrderCents: enabled ? localValue.delivery?.minOrderCents || 0 : undefined,
        leadTimeHours: enabled ? localValue.delivery?.leadTimeHours || 24 : undefined,
        instructions: enabled ? localValue.delivery?.instructions || "" : undefined,
      },
    });
  };

  const updateDelivery = (field: string, newValue: any) => {
    updateValue({
      ...localValue,
      delivery: {
        ...localValue.delivery,
        enabled: true,
        [field]: newValue,
      },
    });
  };

  const toggleShipping = (enabled: boolean) => {
    updateValue({
      ...localValue,
      shipping: {
        enabled,
        pricingMode: enabled ? localValue.shipping?.pricingMode || "flat" : undefined,
        flatFeeCents: enabled ? localValue.shipping?.flatFeeCents || 0 : undefined,
        carriers: enabled ? localValue.shipping?.carriers || [] : undefined,
        instructions: enabled ? localValue.shipping?.instructions || "" : undefined,
      },
    });
  };

  const updateShipping = (field: string, newValue: any) => {
    updateValue({
      ...localValue,
      shipping: {
        ...localValue.shipping,
        enabled: true,
        [field]: newValue,
      },
    });
  };

  const addCarrier = (carrier: string) => {
    if (!carrier.trim() || localValue.shipping?.carriers?.includes(carrier)) return;
    updateShipping("carriers", [...(localValue.shipping?.carriers || []), carrier.trim()]);
  };

  const removeCarrier = (carrier: string) => {
    updateShipping("carriers", localValue.shipping?.carriers?.filter(c => c !== carrier));
  };

  return (
    <div className="space-y-6">
      {/* Pickup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Pickup</CardTitle>
                <CardDescription>Customers pick up orders at your location</CardDescription>
              </div>
            </div>
            <Checkbox
              checked={localValue.pickup?.enabled}
              onCheckedChange={togglePickup}
              data-testid="checkbox-pickup-enabled"
            />
          </div>
        </CardHeader>
        {localValue.pickup?.enabled && (
          <CardContent className="space-y-4">
            {localValue.pickup.locations?.map((location) => (
              <Card key={location.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Label>Location Name</Label>
                      <Input
                        value={location.name}
                        onChange={(e) => updatePickupLocation(location.id, "name", e.target.value)}
                        placeholder="Main Store"
                        data-testid={`input-pickup-name-${location.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePickupLocation(location.id)}
                      data-testid={`button-remove-location-${location.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={location.address}
                      onChange={(e) => updatePickupLocation(location.id, "address", e.target.value)}
                      placeholder="123 Main St, Fort Myers, FL 33901"
                      data-testid={`input-pickup-address-${location.id}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Available Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Badge
                          key={day}
                          variant={location.days.includes(day) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => togglePickupDay(location.id, day)}
                          data-testid={`badge-pickup-day-${day}-${location.id}`}
                        >
                          {day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Window</Label>
                    <Input
                      value={location.timeWindow}
                      onChange={(e) => updatePickupLocation(location.id, "timeWindow", e.target.value)}
                      placeholder="9am-5pm"
                      data-testid={`input-pickup-time-${location.id}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instructions (optional)</Label>
                    <Textarea
                      value={location.instructions || ""}
                      onChange={(e) => updatePickupLocation(location.id, "instructions", e.target.value)}
                      placeholder="Park in the back, ring the doorbell..."
                      rows={2}
                      data-testid={`input-pickup-instructions-${location.id}`}
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addPickupLocation}
              className="w-full"
              data-testid="button-add-pickup-location"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pickup Location
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Delivery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Local Delivery</CardTitle>
                <CardDescription>Deliver orders within a service area</CardDescription>
              </div>
            </div>
            <Checkbox
              checked={localValue.delivery?.enabled}
              onCheckedChange={toggleDelivery}
              data-testid="checkbox-delivery-enabled"
            />
          </div>
        </CardHeader>
        {localValue.delivery?.enabled && (
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Radius (miles)</Label>
                <Input
                  type="number"
                  min="0"
                  value={localValue.delivery.radiusMiles || ""}
                  onChange={(e) => updateDelivery("radiusMiles", parseFloat(e.target.value) || 0)}
                  placeholder="10"
                  data-testid="input-delivery-radius"
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(localValue.delivery.baseFeeCents || 0) / 100}
                    onChange={(e) => updateDelivery("baseFeeCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                    placeholder="5.00"
                    className="pl-7"
                    data-testid="input-delivery-fee"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Order</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(localValue.delivery.minOrderCents || 0) / 100}
                    onChange={(e) => updateDelivery("minOrderCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                    placeholder="25.00"
                    className="pl-7"
                    data-testid="input-delivery-min-order"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lead Time (hours)</Label>
                <Input
                  type="number"
                  min="0"
                  value={localValue.delivery.leadTimeHours || ""}
                  onChange={(e) => updateDelivery("leadTimeHours", parseFloat(e.target.value) || 0)}
                  placeholder="24"
                  data-testid="input-delivery-lead-time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Instructions (optional)</Label>
              <Textarea
                value={localValue.delivery.instructions || ""}
                onChange={(e) => updateDelivery("instructions", e.target.value)}
                placeholder="Available Tuesday and Thursday evenings..."
                rows={2}
                data-testid="input-delivery-instructions"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Shipping</CardTitle>
                <CardDescription>Ship orders anywhere via carriers</CardDescription>
              </div>
            </div>
            <Checkbox
              checked={localValue.shipping?.enabled}
              onCheckedChange={toggleShipping}
              data-testid="checkbox-shipping-enabled"
            />
          </div>
        </CardHeader>
        {localValue.shipping?.enabled && (
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pricing Mode</Label>
                <Select
                  value={localValue.shipping.pricingMode}
                  onValueChange={(value) => updateShipping("pricingMode", value)}
                >
                  <SelectTrigger data-testid="select-shipping-pricing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="calculated">Calculated (settled later)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {localValue.shipping.pricingMode === "flat" && (
                <div className="space-y-2">
                  <Label>Flat Shipping Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(localValue.shipping.flatFeeCents || 0) / 100}
                      onChange={(e) => updateShipping("flatFeeCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                      placeholder="10.00"
                      className="pl-7"
                      data-testid="input-shipping-flat-fee"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Carriers Available</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {localValue.shipping.carriers?.map((carrier) => (
                  <Badge
                    key={carrier}
                    variant="secondary"
                    className="gap-2"
                    data-testid={`badge-carrier-${carrier}`}
                  >
                    {carrier}
                    <button
                      type="button"
                      onClick={() => removeCarrier(carrier)}
                      className="hover:text-destructive"
                      data-testid={`button-remove-carrier-${carrier}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add carrier (USPS, UPS, FedEx...)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCarrier(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                  data-testid="input-add-carrier"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addCarrier(input.value);
                    input.value = "";
                  }}
                  data-testid="button-add-carrier"
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shipping Instructions (optional)</Label>
              <Textarea
                value={localValue.shipping.instructions || ""}
                onChange={(e) => updateShipping("instructions", e.target.value)}
                placeholder="Orders ship within 2-3 business days..."
                rows={2}
                data-testid="input-shipping-instructions"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom Fulfillment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <div>
              <CardTitle>Custom Fulfillment Methods</CardTitle>
              <CardDescription>Add any other ways customers can receive orders (e.g., Farmers Market Booth, Curbside Pickup)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {localValue.custom && localValue.custom.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {localValue.custom.map((method, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {method}
                  <button
                    type="button"
                    onClick={() => {
                      updateValue({
                        ...localValue,
                        custom: localValue.custom?.filter((_, i) => i !== index),
                      });
                    }}
                    className="hover:text-destructive"
                    data-testid={`button-remove-custom-method-${index}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add custom fulfillment method..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    updateValue({
                      ...localValue,
                      custom: [...(localValue.custom || []), value],
                    });
                    e.currentTarget.value = "";
                  }
                }
              }}
              data-testid="input-add-custom-method"
            />
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                const value = input.value.trim();
                if (value) {
                  updateValue({
                    ...localValue,
                    custom: [...(localValue.custom || []), value],
                  });
                  input.value = "";
                }
              }}
              data-testid="button-add-custom-method"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
