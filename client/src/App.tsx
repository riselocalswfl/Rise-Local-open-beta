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
import EventsLayout from "@/pages/EventsLayout";
import EventDetail from "@/pages/EventDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Spotlight from "@/pages/Spotlight";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Join from "@/pages/Join";
import BuyerSignup from "@/pages/BuyerSignup";
import VendorSignup from "@/pages/VendorSignup";
import RestaurantSignup from "@/pages/RestaurantSignup";
import Admin from "@/pages/Admin";
import VendorProfile from "@/pages/VendorProfile";
import VendorDashboard from "@/pages/VendorDashboard";
import RestaurantProfile from "@/pages/RestaurantProfile";
import RestaurantDashboard from "@/pages/RestaurantDashboard";
import BusinessDashboard from "@/pages/BusinessDashboard";
import LoyaltyHistory from "@/pages/LoyaltyHistory";
import CustomerProfile from "@/pages/CustomerProfile";
import NavMenu from "@/components/NavMenu";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendor/:id" component={VendorProfile} />
      <Route path="/dashboard" component={BusinessDashboard} />
      <Route path="/vendor-dashboard" component={VendorDashboard} />
      <Route path="/restaurant/:id" component={RestaurantProfile} />
      <Route path="/restaurant-dashboard" component={RestaurantDashboard} />
      <Route path="/eat-local" component={EatLocal} />
      <Route path="/events" component={EventsLayout} />
      <Route path="/events/my" component={EventsLayout} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/my-events">
        {() => <Redirect to="/events/my" />}
      </Route>
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/spotlight" component={Spotlight} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/join" component={Join} />
      <Route path="/join/buyer" component={BuyerSignup} />
      <Route path="/join/vendor" component={VendorSignup} />
      <Route path="/join/restaurant" component={RestaurantSignup} />
      <Route path="/loyalty" component={LoyaltyHistory} />
      <Route path="/profile" component={CustomerProfile} />
      <Route path="/admin" component={Admin} />
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
          <NavMenu />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
