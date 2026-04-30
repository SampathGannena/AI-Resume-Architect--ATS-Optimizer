import { Star } from "lucide-react";

const reviews = [
  {
    name: "Sarah Chen",
    role: "Software Engineer",
    company: "Stripe",
    avatar: "SC",
    rating: 5,
    text: "CareerForge took my resume from 67 to 94 ATS score in one rewrite. Landed interviews at 5 FAANG companies within 2 weeks. The keyword extraction is genuinely magical.",
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager",
    company: "Airbnb",
    avatar: "MJ",
    rating: 5,
    text: "I was skeptical of AI resume tools, but CareerForge actually understands context. It rewrote my bullets to highlight impact without sounding like a robot. Highly recommend.",
  },
  {
    name: "Emily Rodriguez",
    role: "UX Designer",
    company: "Figma",
    avatar: "ER",
    rating: 5,
    text: "The cover letter generator saved me hours. It matched my tone perfectly and the JD keyword matching is spot-on. Got hired at my dream company last month!",
  },
  {
    name: "David Park",
    role: "Data Scientist",
    company: "OpenAI",
    avatar: "DP",
    rating: 5,
    text: "My previous resume was getting zero callbacks. After CareerForge optimized it with ATS keywords, I received 3 interview requests in the first week. The ROI is undeniable.",
  },
  {
    name: "Jessica Williams",
    role: "Marketing Director",
    company: "Notion",
    avatar: "JW",
    rating: 5,
    text: "The premium templates are stunning. I used the Executive template and the PDF export is pixel-perfect every time. Recruiters have complimented my resume design.",
  },
  {
    name: "Alex Thompson",
    role: "DevOps Engineer",
    company: "Datadog",
    avatar: "AT",
    rating: 5,
    text: "Workday and Greenhouse both parsed my resume perfectly after CareerForge optimization. Finally, an AI tool that actually understands how ATS systems work.",
  },
  {
    name: "Priya Patel",
    role: "Frontend Engineer",
    company: "Vercel",
    avatar: "PP",
    rating: 5,
    text: "The JD Scanner found keywords I would have missed entirely. It broke down exactly what each keyword meant for the role. Game changer for tech interviews.",
  },
  {
    name: "Ryan O'Brien",
    role: "Sales Manager",
    company: "HubSpot",
    avatar: "RO",
    rating: 5,
    text: "I switched careers from teaching to tech sales. CareerForge helped me translate my transferable skills in a way that resonated with hiring managers.",
  },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: rating }).map((_, i) => (
      <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
    ))}
  </div>
);

const ReviewCard = ({ review }: { review: typeof reviews[number] }) => (
  <div className="flex-shrink-0 w-80 mx-4">
    <div className="h-full p-6 rounded-2xl bg-gradient-card border border-border shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
          {review.avatar}
        </div>
        <div>
          <div className="font-semibold text-sm">{review.name}</div>
          <div className="text-xs text-muted-foreground">{review.role} · {review.company}</div>
        </div>
      </div>
      <StarRating rating={review.rating} />
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-4">
        "{review.text}"
      </p>
    </div>
  </div>
);

const ReviewCards = () => {
  const doubled = [...reviews, ...reviews];

  return (
    <section className="py-16 overflow-hidden">
      <div className="container mb-10">
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Testimonials</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-4 tracking-tight">
            Loved by job seekers worldwide
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands who landed their dream jobs with CareerForge.
          </p>
        </div>
      </div>

      <div className="relative">
        <div
          className="flex"
          style={{
            animation: "scroll-reviews 60s linear infinite",
            width: "max-content",
          }}
        >
          {doubled.map((review, i) => (
            <ReviewCard key={`${review.name}-${i}`} review={review} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scroll-reviews {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-50% - 2rem));
          }
        }
      `}</style>
    </section>
  );
};

export default ReviewCards;
