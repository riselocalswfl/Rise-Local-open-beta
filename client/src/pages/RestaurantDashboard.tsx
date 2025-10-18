import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Save } from "lucide-react";
import type { Restaurant, MenuItem, Event, RestaurantFAQ } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function RestaurantDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // For demo purposes, using a hardcoded restaurant ID
  // In real app, this would come from auth context
  const restaurantId = "demo-restaurant-id";

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurantId, "menu-items"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/restaurants", restaurantId, "events"],
  });

  const { data: faqs = [] } = useQuery<RestaurantFAQ[]>({
    queryKey: ["/api/restaurants", restaurantId, "faqs"],
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">
            Restaurant Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your restaurant profile, menu, events, and more
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-dashboard">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="menu" data-testid="tab-menu">Menu</TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
            <TabsTrigger value="faqs" data-testid="tab-faqs">FAQs</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ProfileEditor restaurant={restaurant} />
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <MenuManager restaurantId={restaurantId} menuItems={menuItems} />
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <EventManager restaurantId={restaurantId} events={events} />
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs">
            <FAQManager restaurantId={restaurantId} faqs={faqs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Profile Editor Component
function ProfileEditor({ restaurant }: { restaurant?: Restaurant }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    restaurantName: restaurant?.restaurantName || "",
    tagline: restaurant?.tagline || "",
    bio: restaurant?.bio || "",
    cuisineType: restaurant?.cuisineType || "",
    priceRange: restaurant?.priceRange || "",
    contactEmail: restaurant?.contactEmail || "",
    contactPhone: restaurant?.contactPhone || "",
    address: restaurant?.address || "",
    city: restaurant?.city || "Fort Myers",
    zipCode: restaurant?.zipCode || "",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/restaurants/${restaurant?.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restaurant Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="restaurantName">Restaurant Name *</Label>
              <Input
                id="restaurantName"
                value={formData.restaurantName}
                onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                required
                data-testid="input-restaurant-name"
              />
            </div>
            <div>
              <Label htmlFor="cuisineType">Cuisine Type *</Label>
              <Input
                id="cuisineType"
                value={formData.cuisineType}
                onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                placeholder="e.g., Italian, Mexican, Farm-to-Table"
                required
                data-testid="input-cuisine-type"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="A short, catchy description"
              data-testid="input-tagline"
            />
          </div>

          <div>
            <Label htmlFor="bio">About Your Restaurant *</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={6}
              required
              data-testid="textarea-bio"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceRange">Price Range</Label>
              <Input
                id="priceRange"
                value={formData.priceRange}
                onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                placeholder="$, $$, $$$, or $$$$"
                data-testid="input-price-range"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                data-testid="input-contact-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                data-testid="input-contact-phone"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                data-testid="input-city"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                data-testid="input-zip-code"
              />
            </div>
          </div>

          <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-profile">
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Menu Manager Component
function MenuManager({ restaurantId, menuItems }: { restaurantId: string; menuItems: MenuItem[] }) {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/menu-items", "POST", { ...data, restaurantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "menu-items"] });
      setShowNewForm(false);
      toast({ title: "Menu item created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/menu-items/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "menu-items"] });
      setEditingItem(null);
      toast({ title: "Menu item updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/menu-items/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "menu-items"] });
      toast({ title: "Menu item deleted successfully" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Menu Items</CardTitle>
          <Button onClick={() => setShowNewForm(true)} data-testid="button-add-menu-item">
            <Plus className="w-4 h-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showNewForm && (
          <MenuItemForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowNewForm(false)}
            isPending={createMutation.isPending}
          />
        )}

        <div className="space-y-4 mt-4">
          {menuItems.map((item) => (
            <div key={item.id} className="border rounded-md p-4" data-testid={`menu-item-card-${item.id}`}>
              {editingItem?.id === item.id ? (
                <MenuItemForm
                  item={editingItem}
                  onSubmit={(data) => updateMutation.mutate({ id: item.id, data })}
                  onCancel={() => setEditingItem(null)}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <p className="text-sm font-semibold text-primary">
                      ${(item.priceCents / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingItem(item)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {menuItems.length === 0 && !showNewForm && (
            <p className="text-muted-foreground text-center py-8">
              No menu items yet. Click "Add Menu Item" to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MenuItemForm({
  item,
  onSubmit,
  onCancel,
  isPending,
}: {
  item?: MenuItem;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    priceCents: item?.priceCents || 0,
    category: item?.category || "Entrees",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-md p-4 bg-muted/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-item-name"
          />
        </div>
        <div>
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Appetizers, Entrees, Desserts, Drinks"
            required
            data-testid="input-category"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          data-testid="textarea-description"
        />
      </div>

      <div>
        <Label htmlFor="price">Price *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={formData.priceCents / 100}
          onChange={(e) => setFormData({ ...formData, priceCents: Math.round(parseFloat(e.target.value) * 100) })}
          required
          data-testid="input-price"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} data-testid="button-save-item">
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Event Manager Component
function EventManager({ restaurantId, events }: { restaurantId: string; events: Event[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Event management coming soon...</p>
      </CardContent>
    </Card>
  );
}

// FAQ Manager Component
function FAQManager({ restaurantId, faqs }: { restaurantId: string; faqs: RestaurantFAQ[] }) {
  const { toast } = useToast();
  const [editingFAQ, setEditingFAQ] = useState<RestaurantFAQ | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/restaurant-faqs", "POST", { ...data, restaurantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "faqs"] });
      setShowNewForm(false);
      toast({ title: "FAQ created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/restaurant-faqs/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "faqs"] });
      setEditingFAQ(null);
      toast({ title: "FAQ updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/restaurant-faqs/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "faqs"] });
      toast({ title: "FAQ deleted successfully" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Frequently Asked Questions</CardTitle>
          <Button onClick={() => setShowNewForm(true)} data-testid="button-add-faq">
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showNewForm && (
          <FAQForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowNewForm(false)}
            isPending={createMutation.isPending}
          />
        )}

        <div className="space-y-4 mt-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border rounded-md p-4" data-testid={`faq-card-${faq.id}`}>
              {editingFAQ?.id === faq.id ? (
                <FAQForm
                  faq={editingFAQ}
                  onSubmit={(data) => updateMutation.mutate({ id: faq.id, data })}
                  onCancel={() => setEditingFAQ(null)}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingFAQ(faq)}
                      data-testid={`button-edit-faq-${faq.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteMutation.mutate(faq.id)}
                      data-testid={`button-delete-faq-${faq.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {faqs.length === 0 && !showNewForm && (
            <p className="text-muted-foreground text-center py-8">
              No FAQs yet. Click "Add FAQ" to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FAQForm({
  faq,
  onSubmit,
  onCancel,
  isPending,
}: {
  faq?: RestaurantFAQ;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    question: faq?.question || "",
    answer: faq?.answer || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-md p-4 bg-muted/30">
      <div>
        <Label htmlFor="question">Question *</Label>
        <Input
          id="question"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          required
          data-testid="input-question"
        />
      </div>

      <div>
        <Label htmlFor="answer">Answer *</Label>
        <Textarea
          id="answer"
          value={formData.answer}
          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
          rows={4}
          required
          data-testid="textarea-answer"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} data-testid="button-save-faq">
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-faq">
          Cancel
        </Button>
      </div>
    </form>
  );
}
