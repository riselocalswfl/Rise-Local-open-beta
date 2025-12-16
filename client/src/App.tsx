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
import Auth from "@/pages/Auth";
import WelcomePage from "@/pages/WelcomePage";
import Admin from "@/pages/Admin";
import VendorProfile from "@/pages/VendorProfile";
import RestaurantProfile from "@/pages/RestaurantProfile";
import BusinessDashboard from "@/pages/BusinessDashboard";
import UnifiedOnboarding from "@/pages/UnifiedOnboarding";
import CustomerProfile from "@/pages/CustomerProfile";
import Messages from "@/pages/Messages";
import MessageThread from "@/pages/MessageThread";
import MyDeals from "@/pages/MyDeals";
import Discover from "@/pages/Discover";
import Browse from "@/pages/Browse";
import Favorites from "@/pages/Favorites";
import Membership from "@/pages/Membership";
import Start from "@/pages/Start";
import { AuthBoundary } from "@/components/AuthBoundary";
import AppShell from "@/components/layout/AppShell";

function Router() {
  return (
    <Switch>
      {/* Discover - New Mobile-First Home Experience */}
      <Route path="/">
        {() => <Redirect to="/discover" />}
      </Route>
      <Route path="/discover">
        {() => (
          <AppShell>
            <Discover />
          </AppShell>
        )}
      </Route>
      <Route path="/browse">
        {() => (
          <AppShell>
            <Browse />
          </AppShell>
        )}
      </Route>
      <Route path="/favorites">
        {() => (
          <AppShell>
            <Favorites />
          </AppShell>
        )}
      </Route>
      <Route path="/membership" component={Membership} />
      
      {/* Legacy Deals Hub */}
      <Route path="/deals">
        {() => (
          <AppShell>
            <DealsPage />
          </AppShell>
        )}
      </Route>
      <Route path="/deals/:id">
        {(params) => (
          <AppShell>
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
      
      {/* Auth - Single unified authentication page (no footer) */}
      <Route path="/auth" component={Auth} />
      
      {/* Start - Universal gate for role-based routing */}
      <Route path="/start" component={Start} />
      
      {/* Welcome - Legacy post-auth screen (redirects to /start) */}
      <Route path="/welcome">
        {() => <Redirect to="/start" />}
      </Route>
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
          <AppShell>
            <VendorProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/restaurant/:id">
        {(params) => (
          <AppShell>
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
          <AppShell>
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
          <AppShell>
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
      
      {/* Cart - hidden, redirect to deals */}
      <Route path="/cart">
        {() => <Redirect to="/deals" />}
      </Route>
      
      {/* Protected Account Features - Require authentication */}
      <Route path="/events/my">
        {() => (
          <AppShell>
            <EventsLayout />
          </AppShell>
        )}
      </Route>
      
      {/* Vendor Routes - no tabs */}
      <Route path="/onboarding" component={UnifiedOnboarding} />
      <Route path="/dashboard" component={BusinessDashboard} />
      
      {/* Customer Routes */}
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />
      <Route path="/orders" component={Orders} />
      <Route path="/profile">
        {() => (
          <AppShell>
            <CustomerProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:userId" component={MessageThread} />
      <Route path="/my-deals" component={MyDeals} />
      
      {/* Admin - no tabs */}
      <Route path="/admin" component={Admin} />
      
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
      
      {/* Auth Redirects - All old auth routes redirect to /auth */}
      <Route path="/join">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/login">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/signup">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/sign-in">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/sign-up">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/register">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/join/buyer">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/join/vendor">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/join/restaurant">
        {() => <Redirect to="/auth" />}
      </Route>
      <Route path="/join/service-provider">
        {() => <Redirect to="/auth" />}
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
          <AuthBoundary>
            <Router />
          </AuthBoundary>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
