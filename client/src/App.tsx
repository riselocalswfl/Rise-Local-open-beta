import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}
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
import Spotlight from "@/pages/Spotlight";
import Auth from "@/pages/Auth";
import Welcome from "@/pages/Welcome";
import Admin from "@/pages/Admin";
import VendorProfile from "@/pages/VendorProfile";
import RestaurantProfile from "@/pages/RestaurantProfile";
import BusinessDashboard from "@/pages/BusinessDashboard";
import UnifiedOnboarding from "@/pages/UnifiedOnboarding";
import CustomerProfile from "@/pages/CustomerProfile";
import AccountPage from "@/pages/AccountPage";
import Messages from "@/pages/Messages";
import MessageThread from "@/pages/MessageThread";
import MessagesPage from "@/pages/MessagesPage";
import ConversationPage from "@/pages/ConversationPage";
import MyDeals from "@/pages/MyDeals";
import ClaimedDealScreen from "@/pages/ClaimedDealScreen";
import VendorRedeemScreen from "@/pages/VendorRedeemScreen";
import Discover from "@/pages/Discover";
import Browse from "@/pages/Browse";
import Favorites from "@/pages/Favorites";
import Membership from "@/pages/Membership";
import MembershipFaq from "@/pages/MembershipFaq";
import Start from "@/pages/Start";
import Businesses from "@/pages/Businesses";
import BusinessProfile from "@/pages/BusinessProfile";
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
      
      {/* Businesses - Public view of local businesses */}
      <Route path="/businesses">
        {() => (
          <AppShell>
            <Businesses />
          </AppShell>
        )}
      </Route>
      <Route path="/businesses/:id">
        {() => (
          <AppShell>
            <BusinessProfile />
          </AppShell>
        )}
      </Route>
      {/* Legacy route redirects */}
      <Route path="/app/businesses">
        {() => <Redirect to="/businesses" />}
      </Route>
      <Route path="/app/businesses/:vendorId">
        {(params) => <Redirect to={`/businesses/${params.vendorId}`} />}
      </Route>
      
      <Route path="/membership" component={Membership} />
      <Route path="/membership/faq" component={MembershipFaq} />
      
      {/* Legacy Deals Hub - Redirect to Discover */}
      <Route path="/deals">
        {() => <Redirect to="/discover" />}
      </Route>
      <Route path="/deals/:id">
        {(params) => (
          <AppShell>
            <DealDetailPage />
          </AppShell>
        )}
      </Route>
      
      {/* Consumer Claimed Deal Screen with countdown timer */}
      <Route path="/deals/:id/claimed/:redemptionId">
        {() => (
          <AppShell>
            <ClaimedDealScreen />
          </AppShell>
        )}
      </Route>
      
      {/* Vendor Code Redemption Screen */}
      <Route path="/account/deals/:dealId/redeem">
        {() => (
          <AppShell>
            <VendorRedeemScreen />
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
      
      {/* Welcome - Multi-slide introduction carousel for new users */}
      <Route path="/welcome" component={Welcome} />
      {/* Legacy Products - Redirect to Discover (Rise Local is deals-focused, not marketplace) */}
      <Route path="/products">
        {() => <Redirect to="/discover" />}
      </Route>
      {/* Legacy vendor routes - redirect to businesses */}
      <Route path="/vendors">
        {() => <Redirect to="/businesses" />}
      </Route>
      <Route path="/vendor/:id">
        {(params) => <Redirect to={`/businesses/${params.id}`} />}
      </Route>
      <Route path="/restaurant/:id">
        {(params) => <Redirect to={`/businesses/${params.id}`} />}
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
      
      {/* Legacy /account routes - redirect to /dashboard */}
      <Route path="/account">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route path="/account/profile">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route path="/account/deals">
        {() => <Redirect to="/dashboard?tab=deals" />}
      </Route>
      <Route path="/account/settings">
        {() => <Redirect to="/dashboard" />}
      </Route>
      
      {/* Customer Routes */}
      <Route path="/profile">
        {() => (
          <AppShell>
            <CustomerProfile />
          </AppShell>
        )}
      </Route>
      <Route path="/messages">
        {() => (
          <AppShell>
            <MessagesPage />
          </AppShell>
        )}
      </Route>
      <Route path="/messages/:conversationId">
        {() => (
          <AppShell>
            <ConversationPage />
          </AppShell>
        )}
      </Route>
      {/* Legacy direct message routes */}
      <Route path="/dm" component={Messages} />
      <Route path="/dm/:userId" component={MessageThread} />
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
        <ScrollToTop />
        <Toaster />
        <AuthBoundary>
          <Router />
        </AuthBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
