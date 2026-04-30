import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import TrustedCompanies from "@/components/TrustedCompanies";
import ReviewCards from "@/components/ReviewCards";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <h1 className="sr-only">CareerForge Pro — ATS-Proof Resume Generator & Job Matcher</h1>
        <Hero />
        <Features />
        <TrustedCompanies />
        <HowItWorks />
        <ReviewCards />
        <Pricing />
        <CTA />
      </main>
    </div>
  );
};

export default Index;
