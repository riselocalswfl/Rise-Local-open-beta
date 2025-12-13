import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DealsPage from "@/pages/DealsPage";
import DealDetailPage from "@/pages/DealDetailPage";
import Products from "@/pages/Products";
import Vendors from "@/pages/Vendors";
import EatLocal from "@/pages/EatLocal";
import LiveLocal from "@/pages/LiveLocal";
import Services from "@/pages/Services";
import ServiceProviderProfile from "@/pages/ServiceProviderProfile";
import EventsLayout from "@/pages/EventsLayout";
import EventDetail from "@/pages/EventDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Orders from "@/pages/Orders";
import Spotlight from "@/pages/Spotlight";
import Join from "@/pages/Join";
import Admin from "@/pages/Admin";
import VendorProfile from "@/pages/VendorProfile";
import RestaurantProfile from "@/pages/RestaurantProfile";
import BusinessDashboard from "@/pages/BusinessDashboard";
import UnifiedOnboarding from "@/pages/UnifiedOnboarding";
import CustomerProfile from "@/pages/CustomerProfile";
import Messages from "@/pages/Messages";
import MessageThread from "@/pages/MessageThread";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignupBanner } from "@/components/SignupBanner";
import AppShell from "@/components/layout/AppShell";

function Router() {
  return (
    <Switch>
      {/* Deals Hub - New Home Experience */}
      <Route path="/">
        {() => <Redirect to="/deals" />}
      </Route>
      <Route path="/deals">
        {() => (
          <AppShell>
            <DealsPage />
          </AppShell>
        )}
      </Route>
      <Route path="/deals/:id">
        {(params) => (
          <AppShell hideTabs>
            <DealDetailPage />
          </AppShell>
        )}
      </Route>
      
      {/* Legacy Home (accessible but hidden from nav) */}
      <Route path="/home">
        {() => (
          <AppShell>
            <Home />
          </AppShell>
        )}
      </Route>
      
      {/* Public Pages - Browsable without login */}
      <Route path="/join" component={Join} />
      <Route path="/products">
        {() => (
          <AppShell>
            <Products />
          </AppShell>
        )}
      </Route>
      <Route path="/vendors">
        {() => (
          <AppShell>
            <Vendors />
          </AppShell>
        )}
      </Route>
      <Route path="/vendor/:id">
        {(params) => (
          <AppShell hideTabs>
            <VendorProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/restaurant/:id">
        {(params) => (
          <AppShell hideTabs>
            <RestaurantProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/eat-local">
        {() => (
          <AppShell>
            <EatLocal />
          </AppShell>
        )}
      </Route>
      <Route path="/live-local">
        {() => (
          <AppShell>
            <LiveLocal />
          </AppShell>
        )}
      </Route>
      <Route path="/services">
        {() => (
          <AppShell>
            <Services />
          </AppShell>
        )}
      </Route>
      <Route path="/services/:id">
        {(params) => (
          <AppShell hideTabs>
            <ServiceProviderProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/events">
        {() => (
          <AppShell>
            <EventsLayout />
          </AppShell>
        )}
      </Route>
      <Route path="/events/:id">
        {(params) => (
          <AppShell hideTabs>
            <EventDetail />
          </AppShell>
        )}
      </Route>
      <Route path="/spotlight">
        {() => (
          <AppShell>
            <Spotlight />
          </AppShell>
        )}
      </Route>
      
      {/* Cart - no tabs */}
      <Route path="/cart" component={Cart} />
      
      {/* Protected Account Features - Require authentication */}
      <Route path="/events/my">
        {() => (
          <ProtectedRoute>
            <AppShell>
              <EventsLayout />
            </AppShell>
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Protected Vendor Routes - no tabs */}
      <Route path="/onboarding">
        {() => (
          <ProtectedRoute>
            <UnifiedOnboarding />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <BusinessDashboard />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Protected Customer Routes */}
      <Route path="/checkout">
        {() => (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/order-confirmation">
        {() => (
          <ProtectedRoute>
            <OrderConfirmation />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/orders">
        {() => (
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <ProtectedRoute>
            <AppShell>
              <CustomerProfile />
            </AppShell>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/messages">
        {() => (
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/messages/:userId">
        {() => (
          <ProtectedRoute>
            <MessageThread />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Admin - no tabs */}
      <Route path="/admin">
        {() => (
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Legacy Redirects */}
      <Route path="/restaurant-dashboard">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route path="/service-provider-dashboard">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route path="/my-events">
        {() => <Redirect to="/events/my" />}
      </Route>
      <Route path="/onboarding/shop">
        {() => <Redirect to="/onboarding" />}
      </Route>
      <Route path="/onboarding/dine">
        {() => <Redirect to="/onboarding" />}
      </Route>
      <Route path="/onboarding/services">
        {() => <Redirect to="/onboarding" />}
      </Route>
      <Route path="/login">
        {() => <Redirect to="/join" />}
      </Route>
      <Route path="/signup">
        {() => <Redirect to="/join" />}
      </Route>
      <Route path="/join/buyer">
        {() => <Redirect to="/join" />}
      </Route>
      <Route path="/join/vendor">
        {() => <Redirect to="/join" />}
      </Route>
      <Route path="/join/restaurant">
        {() => <Redirect to="/join" />}
      </Route>
      <Route path="/join/service-provider">
        {() => <Redirect to="/join" />}
      </Route>
      
      {/* Home route at the end to avoid matching all paths */}
      <Route path="/">
        {() => (
          <AppShell>
            <Home />
          </AppShell>
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Router />
          <SignupBanner />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
