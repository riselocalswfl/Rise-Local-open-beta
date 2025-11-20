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
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Join from "@/pages/Join";
import BuyerSignup from "@/pages/BuyerSignup";
import VendorSignup from "@/pages/VendorSignup";
import RestaurantSignup from "@/pages/RestaurantSignup";
import ServiceProviderSignup from "@/pages/ServiceProviderSignup";
import Admin from "@/pages/Admin";
import VendorProfile from "@/pages/VendorProfile";
import VendorDashboard from "@/pages/VendorDashboard";
import RestaurantProfile from "@/pages/RestaurantProfile";
import BusinessDashboard from "@/pages/BusinessDashboard";
import ShopOnboarding from "@/pages/ShopOnboarding";
import DineOnboarding from "@/pages/DineOnboarding";
import ServicesOnboarding from "@/pages/ServicesOnboarding";
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
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendor/:id" component={VendorProfile} />
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <BusinessDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/restaurant/:id" component={RestaurantProfile} />
      <Route path="/restaurant-dashboard">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route path="/service-provider-dashboard">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route path="/eat-local" component={EatLocal} />
      <Route path="/live-local" component={LiveLocal} />
      <Route path="/services" component={Services} />
      <Route path="/services/:id" component={ServiceProviderProfile} />
      <Route path="/events" component={EventsLayout} />
      <Route path="/events/my" component={EventsLayout} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/my-events">
        {() => <Redirect to="/events/my" />}
      </Route>
      <Route path="/cart" component={Cart} />
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
      <Route path="/spotlight" component={Spotlight} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/join" component={Join} />
      <Route path="/join/buyer" component={BuyerSignup} />
      <Route path="/join/vendor" component={VendorSignup} />
      <Route path="/join/restaurant" component={RestaurantSignup} />
      <Route path="/join/service-provider" component={ServiceProviderSignup} />
      <Route path="/onboarding">
        {() => (
          <ProtectedRoute>
            <UnifiedOnboarding />
          </ProtectedRoute>
        )}
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
      <Route path="/admin">
        {() => (
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
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
