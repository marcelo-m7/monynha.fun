import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Submit from "./pages/Submit";
import VideoDetails from "./pages/VideoDetails";
import Videos from "./pages/Videos";
import Favorites from "./pages/Favorites";
import Community from "./pages/Community"; // New import
import About from "./pages/About";         // New import
import Rules from "./pages/Rules";         // New import
import Contact from "./pages/Contact";       // New import
import FAQ from "./pages/FAQ";             // New import
import NotFound from "./pages/NotFound";
import './i18n/config'; // Import i18n configuration to initialize it

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/videos/:videoId" element={<VideoDetails />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/community" element={<Community />} /> {/* New route */}
            <Route path="/about" element={<About />} />         {/* New route */}
            <Route path="/rules" element={<Rules />} />         {/* New route */}
            <Route path="/contact" element={<Contact />} />       {/* New route */}
            <Route path="/faq" element={<FAQ />} />             {/* New route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;