import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import Vendors from "@/pages/Vendors";
import Events from "@/pages/Events";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Spotlight from "@/pages/Spotlight";
import Values from "@/pages/Values";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Join from "@/pages/Join";
import BuyerSignup from "@/pages/BuyerSignup";
import VendorSignup from "@/pages/VendorSignup";
import Admin from "@/pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/events" component={Events} />
      <Route path="/values" component={Values} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/spotlight" component={Spotlight} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/join" component={Join} />
      <Route path="/join/buyer" component={BuyerSignup} />
      <Route path="/join/vendor" component={VendorSignup} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
