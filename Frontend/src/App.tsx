import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppBackground } from "@/components/AppBackground";
import { AppFooter } from "@/components/AppFooter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Builder from "./pages/Builder.tsx";
import Editor from "./pages/Editor.tsx";
import CoverLetter from "./pages/CoverLetter.tsx";
import Billing from "./pages/Billing.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppBackground />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
              <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
              <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
              <Route path="/cover-letter" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
              <Route path="/cover-letter/:id" element={<ProtectedRoute><CoverLetter /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <AppFooter />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
