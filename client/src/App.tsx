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
import NavMenu from "@/components/NavMenu";
import { NavMenuProvider } from "@/contexts/NavMenuContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public Landing Page - Only page accessible without login */}
      <Route path="/join" component={Join} />
      
      {/* Protected Marketplace Pages - Require authentication */}
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/products">
        {() => (
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/vendors">
        {() => (
          <ProtectedRoute>
            <Vendors />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/vendor/:id">
        {() => (
          <ProtectedRoute>
            <VendorProfile />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/restaurant/:id">
        {() => (
          <ProtectedRoute>
            <RestaurantProfile />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/eat-local">
        {() => (
          <ProtectedRoute>
            <EatLocal />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/live-local">
        {() => (
          <ProtectedRoute>
            <LiveLocal />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/services">
        {() => (
          <ProtectedRoute>
            <Services />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/services/:id">
        {() => (
          <ProtectedRoute>
            <ServiceProviderProfile />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/events">
        {() => (
          <ProtectedRoute>
            <EventsLayout />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/events/my">
        {() => (
          <ProtectedRoute>
            <EventsLayout />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/events/:id">
        {() => (
          <ProtectedRoute>
            <EventDetail />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/spotlight">
        {() => (
          <ProtectedRoute>
            <Spotlight />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/cart">
        {() => (
          <ProtectedRoute>
            <Cart />
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
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <NavMenuProvider>
            <Toaster />
            <Router />
            <NavMenu />
          </NavMenuProvider>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
