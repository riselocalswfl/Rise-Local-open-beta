import { useState } from "react";
import { CheckCircle, XCircle, Users, ShoppingBag, Calendar, Star } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { toast } = useToast();

  // todo: remove mock functionality
  const [pendingVendors, setPendingVendors] = useState([
    { id: "v4", name: "Farm Table Bistro", city: "Fort Myers", email: "bistro@farmtable.com" },
    { id: "v5", name: "Coastal Crafts", city: "Fort Myers", email: "coastal@crafts.com" },
  ]);

  const stats = [
    { label: "Total Users", value: "1,234", icon: Users, color: "text-chart-1" },
    { label: "Active Vendors", value: "156", icon: ShoppingBag, color: "text-chart-2" },
    { label: "Products Listed", value: "892", icon: ShoppingBag, color: "text-chart-3" },
    { label: "Upcoming Events", value: "23", icon: Calendar, color: "text-chart-4" },
  ];

  const handleVerifyVendor = (id: string, name: string) => {
    setPendingVendors(vendors => vendors.filter(v => v.id !== id));
    toast({
      title: "Vendor Verified",
      description: `${name} has been verified and can now sell products.`,
    });
  };

  const handleRejectVendor = (id: string, name: string) => {
    setPendingVendors(vendors => vendors.filter(v => v.id !== id));
    toast({
      title: "Vendor Rejected",
      description: `${name}'s application has been rejected.`,
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <Badge variant="destructive">Admin Access</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold font-mono">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Vendor Verifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Vendor Verifications</CardTitle>
            <CardDescription>
              Review and approve vendor applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingVendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending verifications
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{vendor.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {vendor.city} • {vendor.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerifyVendor(vendor.id, vendor.name)}
                        data-testid={`button-verify-${vendor.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectVendor(vendor.id, vendor.name)}
                        data-testid={`button-reject-${vendor.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spotlight Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Fort Myers Spotlight Management
            </CardTitle>
            <CardDescription>
              Create and manage featured content for the Fort Myers community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Discover Fort Myers Local Treasures</h3>
                    <p className="text-sm text-muted-foreground">Active • Fort Myers</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Explore the vibrant community of local artisans...
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" data-testid="button-edit-spotlight">
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" data-testid="button-deactivate-spotlight">
                    Deactivate
                  </Button>
                </div>
              </div>
              <Button className="w-full" data-testid="button-create-spotlight">
                Create New Spotlight
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
