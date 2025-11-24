import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
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

function Router() {
  return (
    <Switch>
      {/* Public Pages - Browsable without login */}
      <Route path="/join" component={Join} />
      <Route path="/products" component={Products} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendor/:id" component={VendorProfile} />
      <Route path="/restaurant/:id" component={RestaurantProfile} />
      <Route path="/eat-local" component={EatLocal} />
      <Route path="/live-local" component={LiveLocal} />
      <Route path="/services" component={Services} />
      <Route path="/services/:id" component={ServiceProviderProfile} />
      <Route path="/events" component={EventsLayout} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/spotlight" component={Spotlight} />
      
      {/* Cart - browsable without login, checkout requires auth */}
      <Route path="/cart" component={Cart} />
      
      {/* Protected Account Features - Require authentication */}
      <Route path="/events/my">
        {() => (
          <ProtectedRoute>
            <EventsLayout />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Protected Vendor Routes */}
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
            <CustomerProfile />
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
      
      {/* Admin */}
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
      <Route path="/" component={Home} />
      
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
