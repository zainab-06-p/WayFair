import * as React from "react";
import { motion, useMotionValue, animate, useScroll, useTransform, useSpring } from "framer-motion";
import { Check, Star, Car, Users, Shield, Zap, MapPin, DollarSign, ChevronDown, Phone, Mail, MapPinIcon, Navigation, Gauge, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import useMeasure from "react-use-measure";

// Utility function
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

// Custom Cursor Component
function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'button' || 
          target.tagName.toLowerCase() === 'a' ||
          target.closest('button') ||
          target.closest('a')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <div className="hidden md:block">
      <motion.div
        className="fixed top-0 left-0 w-4 h-4 bg-cyan-400 rounded-full pointer-events-none z-[9999] mix-blend-screen shadow-[0_0_15px_rgba(34,211,238,0.8)]"
        animate={{
          x: mousePosition.x - 8,
          y: mousePosition.y - 8,
          scale: isHovering ? 2.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 border-2 border-purple-500/50 rounded-full pointer-events-none z-[9998]"
        animate={{
          x: mousePosition.x - 24,
          y: mousePosition.y - 24,
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? "rgba(168, 85, 247, 0.1)" : "rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 250, damping: 20, mass: 0.8 }}
      />
    </div>
  );
}

// Scroll Scale Wrapper Component
function ScrollScaleSection({ children, className }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"]
  });
  
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.3, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);

  return (
    <motion.div 
      ref={ref} 
      style={{ scale, opacity, y }} 
      className={cn("w-full origin-bottom", className)}
    >
      {children}
    </motion.div>
  );
}

// Floating Navigation Component
function FloatingNav() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 200], [-100, 0]);
  const opacity = useTransform(scrollY, [0, 200], [0, 1]);

  return (
    <motion.div 
      style={{ y, opacity }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-md border border-purple-500/30 rounded-full px-6 py-3 hidden md:flex items-center gap-6 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
    >
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-bold text-lg">WayFair</span>
      <div className="w-px h-6 bg-purple-500/30" />
      <a href="#features" className="text-sm text-cyan-100 hover:text-cyan-400 transition-colors">Features</a>
      <a href="#pricing" className="text-sm text-cyan-100 hover:text-cyan-400 transition-colors">Pricing</a>
      <MagneticButton>
        <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full h-8 border-0">Ride Now</Button>
      </MagneticButton>
    </motion.div>
  );
}

// Infinite Slider Component
type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  duration?: number;
  durationOnHover?: number;
  direction?: "horizontal" | "vertical";
  reverse?: boolean;
  className?: string;
};

function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentDuration, setCurrentDuration] = useState(duration);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let controls: any;
    const size = direction === "horizontal" ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    if (isTransitioning) {
      controls = animate(translation, [translation.get(), to], {
        ease: "linear",
        duration:
          currentDuration * Math.abs((translation.get() - to) / contentSize),
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prevKey) => prevKey + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: "linear",
        duration: currentDuration,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from);
        },
      });
    }

    return controls?.stop;
  }, [
    key,
    translation,
    currentDuration,
    width,
    height,
    gap,
    isTransitioning,
    direction,
    reverse,
  ]);

  const hoverProps = durationOnHover
    ? {
        onHoverStart: () => {
          setIsTransitioning(true);
          setCurrentDuration(durationOnHover);
        },
        onHoverEnd: () => {
          setIsTransitioning(true);
          setCurrentDuration(duration);
        },
      }
    : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === "horizontal"
            ? { x: translation }
            : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === "horizontal" ? "row" : "column",
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}

// Testimonial Card Component
interface TestimonialAuthor {
  name: string;
  handle: string;
  avatar: string;
}

interface TestimonialCardProps {
  author: TestimonialAuthor;
  text: string;
  href?: string;
  className?: string;
}

function TestimonialCard({
  author,
  text,
  href,
  className,
}: TestimonialCardProps) {
  const CardElement = href ? "a" : "div";

  return (
    <CardElement
      {...(href ? { href } : {})}
      className={cn(
        "flex flex-col rounded-lg border-t",
        "bg-gradient-to-b from-muted/50 to-muted/10",
        "p-4 text-start sm:p-6",
        "hover:from-muted/60 hover:to-muted/20",
        "max-w-[320px] sm:max-w-[320px]",
        "transition-colors duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={author.avatar} alt={author.name} />
        </Avatar>
        <div className="flex flex-col items-start">
          <h3 className="text-md font-semibold leading-none">{author.name}</h3>
          <p className="text-sm text-muted-foreground">{author.handle}</p>
        </div>
      </div>
      <p className="sm:text-md mt-4 text-sm text-muted-foreground">{text}</p>
    </CardElement>
  );
}

// Hero Section
function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const mediaWidth = useTransform(scrollYProgress, [0, 0.8], ["65vw", "100vw"]);
  const mediaHeight = useTransform(scrollYProgress, [0, 0.8], ["75vh", "100vh"]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.8], ["2rem", "0rem"]);
  const textTranslateX = useTransform(scrollYProgress, [0, 0.8], [0, 250]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0.6, 0.2]);

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 400]);

  return (
    <section ref={containerRef} className="relative h-[200vh] bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">
        <motion.div style={{ y: y1 }} className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></motion.div>
        
        {/* Floating Cars Animation */}
        <motion.div
          className="absolute top-20 left-10 text-yellow-400/30"
          style={{ y: y2 }}
          animate={{
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Car className="w-20 h-20" />
        </motion.div>
        <motion.div
          className="absolute top-40 right-20 text-green-400/30"
          style={{ y: y3 }}
          animate={{
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <Navigation className="w-16 h-16" />
        </motion.div>
        <motion.div
          className="absolute bottom-40 left-20 text-pink-400/30"
          style={{ y: y2 }}
          animate={{
            x: [0, 15, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        >
          <Gauge className="w-20 h-20" />
        </motion.div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <motion.div
            className="relative z-0 overflow-hidden shadow-2xl shadow-cyan-500/50"
            style={{
              width: mediaWidth,
              height: mediaHeight,
              borderRadius: borderRadius,
            }}
          >
            <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600">
              <div className="absolute inset-0 flex items-center justify-center">
                <Car className="w-64 h-64 text-white/20" />
              </div>
              <motion.div
                className="absolute inset-0 bg-black/30"
                style={{ opacity: overlayOpacity }}
              />
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none px-4"
          style={{ opacity: textOpacity }}
        >
          <div className="flex gap-4">
            <motion.h1
              className="text-7xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-lg"
              style={{ x: useTransform(textTranslateX, (val) => -val) }}
            >
              Way
            </motion.h1>
            <motion.h1
              className="text-7xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 drop-shadow-lg"
              style={{ x: textTranslateX }}
            >
              Fair
            </motion.h1>
          </div>
          <p className="text-2xl md:text-3xl text-white font-semibold max-w-3xl mt-8 drop-shadow-md">
            Your journey, shared or solo. Ride smarter, save more, connect better.
          </p>
          <p className="text-cyan-200 font-medium mt-6 text-lg drop-shadow-md">
            Scroll to explore ↓
          </p>
          <div className="mt-12 pointer-events-auto">
            <MagneticButton className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
              <Button size="lg" className="relative bg-slate-950 text-white border border-purple-500/50 hover:bg-slate-900 rounded-full px-10 py-8 text-xl font-bold flex items-center gap-3">
                Start Riding <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </MagneticButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Magnetic Button Component
function MagneticButton({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

// Tilt Card Component
function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={cn("relative h-full w-full rounded-xl transition-all duration-200 ease-linear", className)}
    >
      <div
        style={{
          transform: "translateZ(50px)",
          transformStyle: "preserve-3d",
        }}
        className="h-full w-full rounded-xl"
      >
        {children}
      </div>
    </motion.div>
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Carpool & Connect",
      description: "Share rides, split costs, and make new friends on your daily commute.",
    },
    {
      icon: <Car className="w-8 h-8" />,
      title: "Private Rides",
      description: "Book exclusive one-to-one car services for comfort and privacy.",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Verified",
      description: "All drivers are background-checked and vehicles are inspected.",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Booking",
      description: "Find and book rides in seconds with our smart matching algorithm.",
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Save Money",
      description: "Reduce your commute costs by up to 70% with carpooling.",
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Real-time Tracking",
      description: "Track your ride in real-time and share your trip with loved ones.",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            Why Choose WayFair?
          </h2>
          <p className="text-xl text-cyan-200 max-w-2xl mx-auto">
            Experience the perfect blend of community carpooling and premium private rides
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-1000">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="h-full"
            >
              <TiltCard>
                <Card className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all duration-300 h-full cursor-pointer group backdrop-blur-sm">
                  <CardHeader>
                    <motion.div 
                      className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white mb-4 group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-purple-500/50"
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">{feature.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-cyan-200 group-hover:text-white transition-colors">{feature.description}</p>
                  </CardContent>
                </Card>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

function PricingSection() {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const plans: PricingPlan[] = [
    {
      name: "RIDER",
      price: "0",
      yearlyPrice: "0",
      period: "forever",
      features: [
        "Unlimited carpool rides",
        "Basic ride matching",
        "Standard support",
        "Community features",
        "Safety features included",
      ],
      description: "Perfect for daily commuters",
      buttonText: "Start Riding",
      href: "#",
      isPopular: false,
    },
    {
      name: "PREMIUM",
      price: "29",
      yearlyPrice: "23",
      period: "per month",
      features: [
        "Everything in Rider",
        "Priority ride matching",
        "Private ride discounts",
        "24/7 premium support",
        "Advanced booking",
        "Flexible cancellation",
        "Exclusive driver pool",
      ],
      description: "Best for frequent travelers",
      buttonText: "Go Premium",
      href: "#",
      isPopular: true,
    },
    {
      name: "BUSINESS",
      price: "99",
      yearlyPrice: "79",
      period: "per month",
      features: [
        "Everything in Premium",
        "Corporate accounts",
        "Team management",
        "Expense reporting",
        "Dedicated account manager",
        "Custom billing",
        "API access",
        "Analytics dashboard",
      ],
      description: "For teams and organizations",
      buttonText: "Contact Sales",
      href: "#",
      isPopular: false,
    },
  ];

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#06b6d4", "#8b5cf6", "#ec4899"],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
      });
    }
  };

  return (
    <section className="py-24 bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Choose the plan that works for you. All plans include access to our platform and safety features.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <label className="relative inline-flex items-center cursor-pointer">
            <Label>
              <Switch
                ref={switchRef as any}
                checked={!isMonthly}
                onCheckedChange={handleToggle}
                className="relative"
              />
            </Label>
          </label>
          <span className="ml-2 font-semibold text-white">
            Annual billing <span className="text-cyan-400">(Save 20%)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 1 }}
              whileInView={
                isDesktop
                  ? {
                      y: plan.isPopular ? -20 : 0,
                      opacity: 1,
                      scale: plan.isPopular ? 1.05 : 1.0,
                    }
                  : {}
              }
              viewport={{ once: true }}
              transition={{
                duration: 1.6,
                type: "spring",
                stiffness: 100,
                damping: 30,
                delay: 0.4,
              }}
              className={cn(
                "rounded-2xl border-2 p-6 bg-gradient-to-br from-purple-900/50 to-cyan-900/50 text-center flex flex-col relative",
                plan.isPopular ? "border-cyan-400" : "border-purple-500/30"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-purple-500 py-1 px-3 rounded-bl-xl rounded-tr-xl flex items-center">
                  <Star className="text-white h-4 w-4 fill-current" />
                  <span className="text-white ml-1 font-semibold text-sm">
                    Popular
                  </span>
                </div>
              )}
              <div className="flex-1 flex flex-col">
                <p className="text-base font-semibold text-cyan-300">
                  {plan.name}
                </p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                    )}
                  </span>
                  <span className="text-sm font-semibold text-purple-300">
                    / {plan.period}
                  </span>
                </div>

                <p className="text-xs text-purple-300 mt-2">
                  {isMonthly ? "billed monthly" : "billed annually"}
                </p>

                <ul className="mt-6 gap-3 flex flex-col">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-left">
                      <Check className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white">{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="w-full my-6 border-purple-500/30" />

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <MagneticButton
                    className={cn(
                      "w-full text-lg font-semibold group relative overflow-hidden rounded-md px-4 py-2",
                      plan.isPopular
                        ? "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                        : "bg-purple-700 hover:bg-purple-600 text-white"
                    )}
                    onClick={() => {
                      confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { x: 0.5, y: 0.6 },
                        colors: ["#06b6d4", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"],
                      });
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {plan.buttonText}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </MagneticButton>
                </motion.div>
                <p className="mt-4 text-xs text-purple-300">
                  {plan.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      author: {
        name: "Sarah Johnson",
        handle: "@sarahcommutes",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
      },
      text: "WayFair has transformed my daily commute! I've saved over $200 a month and made amazing friends along the way.",
    },
    {
      author: {
        name: "Michael Chen",
        handle: "@mikerides",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      },
      text: "The private ride service is exceptional. Professional drivers, clean cars, and always on time. Highly recommend!",
    },
    {
      author: {
        name: "Emily Rodriguez",
        handle: "@emilyonthego",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      },
      text: "As a driver, WayFair has been a great way to earn extra income while helping others. The platform is easy to use and support is fantastic.",
    },
    {
      author: {
        name: "David Park",
        handle: "@daviddrives",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      },
      text: "Safety features are top-notch. I feel secure every time I book a ride. The real-time tracking gives me peace of mind.",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50"></div>
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            Loved by Thousands
          </h2>
          <p className="text-xl text-cyan-200 max-w-2xl mx-auto">
            Join our community of happy riders and drivers
          </p>
        </div>

        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
          <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row [--duration:40s]">
            <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
              {[...Array(4)].map((_, setIndex) =>
                testimonials.map((testimonial, i) => (
                  <TestimonialCard key={`${setIndex}-${i}`} {...testimonial} />
                ))
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-slate-950" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-slate-950" />
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const faqs = [
    {
      question: "How does carpooling work on WayFair?",
      answer: "Simply enter your route and time, and we'll match you with riders or drivers going the same way. You can review profiles, ratings, and choose who you want to ride with.",
    },
    {
      question: "Is WayFair safe?",
      answer: "Absolutely! All drivers undergo background checks, vehicles are inspected, and we have real-time tracking, emergency support, and a rating system to ensure safety.",
    },
    {
      question: "What's the difference between carpool and private rides?",
      answer: "Carpooling means sharing a ride with others going the same direction, splitting costs. Private rides are one-to-one services where you have the car to yourself.",
    },
    {
      question: "How much can I save with carpooling?",
      answer: "On average, users save 60-70% on their commute costs by sharing rides. The more you carpool, the more you save!",
    },
    {
      question: "Can I become a driver?",
      answer: "Yes! If you have a valid license, a reliable car, and pass our verification process, you can start earning by offering rides.",
    },
    {
      question: "What if I need to cancel?",
      answer: "Premium members enjoy flexible cancellation. Free users can cancel up to 2 hours before the scheduled ride without penalty.",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-purple-200">
            Everything you need to know about WayFair
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card 
                className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border-purple-500/30 hover:border-cyan-400/60 transition-all duration-300 cursor-pointer group"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">{faq.question}</h3>
                    <motion.div
                      animate={{ rotate: expandedIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    </motion.div>
                  </div>
                </CardHeader>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: expandedIndex === index ? "auto" : 0,
                    opacity: expandedIndex === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: "hidden" }}
                >
                  <CardContent>
                    <p className="text-cyan-200">{faq.answer}</p>
                  </CardContent>
                </motion.div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Stats Counter Component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!hasAnimated) return;
    
    let start = 0;
    const end = value;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, hasAnimated]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => setHasAnimated(true)}
    >
      {hasAnimated ? count : 0}{suffix}
    </motion.div>
  );
}

// Proof Section (Social Proof / Stats)
function ProofSection() {
  const stats = [
    { value: 500, label: "Active Users", suffix: "K+", color: "from-yellow-400 to-orange-400" },
    { value: 2, label: "Rides Completed", suffix: "M+", color: "from-green-400 to-emerald-400" },
    { value: 50, label: "Saved by Users", suffix: "M+", color: "from-pink-400 to-rose-400" },
    { value: 4.9, label: "Average Rating", suffix: "/5", color: "from-cyan-400 to-blue-400" },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-xl text-cyan-200">
            Join the fastest-growing rideshare community
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center cursor-pointer group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className={`text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color} mb-2 group-hover:scale-110 transition-transform relative z-10`}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-lg text-cyan-200 group-hover:text-white transition-colors relative z-10">{stat.label}</div>
              <motion.div
                className="mx-auto mt-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent relative z-10"
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-20">
          <div className="text-center mb-8">
            <p className="text-cyan-300 font-semibold">Trusted by leading companies</p>
          </div>
          <div className="relative py-6">
            <InfiniteSlider gap={112} duration={40}>
              <div className="flex items-center justify-center w-32">
                <div className="text-white/60 font-bold text-2xl">TechCorp</div>
              </div>
              <div className="flex items-center justify-center w-32">
                <div className="text-white/60 font-bold text-2xl">StartupX</div>
              </div>
              <div className="flex items-center justify-center w-32">
                <div className="text-white/60 font-bold text-2xl">MegaCo</div>
              </div>
              <div className="flex items-center justify-center w-32">
                <div className="text-white/60 font-bold text-2xl">InnovateLab</div>
              </div>
              <div className="flex items-center justify-center w-32">
                <div className="text-white/60 font-bold text-2xl">FutureInc</div>
              </div>
            </InfiniteSlider>
          </div>
        </div>
      </div>
    </section>
  );
}

// Contact Section
function ContactSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
            Get in Touch
          </h2>
          <p className="text-xl text-purple-200">
            Have questions? We're here to help!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 perspective-1000">
          <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring", stiffness: 300 }} className="h-full">
            <TiltCard>
              <Card className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border-purple-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-300 cursor-pointer group h-full backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 shadow-lg shadow-cyan-500/50"
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Phone className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">Call Us</h3>
                  <p className="text-cyan-200 group-hover:text-white transition-colors">+1 (555) 123-4567</p>
                </CardContent>
              </Card>
            </TiltCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring", stiffness: 300 }} className="h-full">
            <TiltCard>
              <Card className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border-purple-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300 cursor-pointer group h-full backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 shadow-lg shadow-purple-500/50"
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Mail className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">Email Us</h3>
                  <p className="text-cyan-200 group-hover:text-white transition-colors">support@wayfair.com</p>
                </CardContent>
              </Card>
            </TiltCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -10 }} transition={{ type: "spring", stiffness: 300 }} className="h-full">
            <TiltCard>
              <Card className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 border-purple-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all duration-300 cursor-pointer group h-full backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 shadow-lg shadow-green-500/50"
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.6 }}
                  >
                    <MapPinIcon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-300 transition-colors">Visit Us</h3>
                  <p className="text-cyan-200 group-hover:text-white transition-colors">123 Ride Street, SF, CA</p>
                </CardContent>
              </Card>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-purple-500/30 py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              WayFair
            </h3>
            <p className="text-cyan-200">
              Your journey, shared or solo. Ride smarter, save more, connect better.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-cyan-200">
              <li><a href="#" className="hover:text-cyan-400">Carpool</a></li>
              <li><a href="#" className="hover:text-cyan-400">Private Rides</a></li>
              <li><a href="#" className="hover:text-cyan-400">Become a Driver</a></li>
              <li><a href="#" className="hover:text-cyan-400">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-cyan-200">
              <li><a href="#" className="hover:text-cyan-400">About Us</a></li>
              <li><a href="#" className="hover:text-cyan-400">Careers</a></li>
              <li><a href="#" className="hover:text-cyan-400">Blog</a></li>
              <li><a href="#" className="hover:text-cyan-400">Press</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-cyan-200">
              <li><a href="#" className="hover:text-cyan-400">Help Center</a></li>
              <li><a href="#" className="hover:text-cyan-400">Safety</a></li>
              <li><a href="#" className="hover:text-cyan-400">Terms</a></li>
              <li><a href="#" className="hover:text-cyan-400">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-purple-500/30 pt-8 text-center text-cyan-200">
          <p>&copy; 2024 WayFair. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// Main Component
function WayFairLanding() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      <CustomCursor />
      <FloatingNav />
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 origin-left z-[100]"
        style={{ scaleX }}
      />
      <style>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-100% - var(--gap)));
          }
        }
        .animate-marquee {
          animation: marquee var(--duration) linear infinite;
        }
        @media (min-width: 768px) {
          body {
            cursor: none;
          }
          a, button, [role="button"] {
            cursor: none;
          }
        }
      `}</style>
      <HeroSection />
      <ScrollScaleSection><FeaturesSection /></ScrollScaleSection>
      <ScrollScaleSection><ProofSection /></ScrollScaleSection>
      <ScrollScaleSection><PricingSection /></ScrollScaleSection>
      <ScrollScaleSection><TestimonialsSection /></ScrollScaleSection>
      <ScrollScaleSection><FAQSection /></ScrollScaleSection>
      <ScrollScaleSection><ContactSection /></ScrollScaleSection>
      <Footer />
    </div>
  );
}

export default WayFairLanding;
