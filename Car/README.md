# WayFair - Smart Ridesharing Landing Page

A stunning, modern landing page for WayFair ridesharing platform with interactive animations, pricing tiers, testimonials, and more.

## Features

- **Interactive Hero Section**: Smooth scroll animations with responsive media
- **Features Showcase**: 6 key features with hover animations and gradients
- **Animated Stats**: Real-time counters showing trusted metrics
- **Flexible Pricing**: Monthly/yearly toggle with confetti animations
- **Testimonials Carousel**: Infinite scrolling testimonials
- **FAQ Section**: Expandable Q&A with smooth animations
- **Contact Cards**: Three contact options with hover effects
- **Modern Design**: Gradient backgrounds, glassmorphism effects, smooth transitions
- **Fully Responsive**: Works perfectly on all screen sizes
- **TypeScript Support**: Fully typed for better DX

## Tech Stack

- **React 18.3+**: UI library
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety
- **Tailwind CSS 4.0**: Utility-first CSS framework
- **Framer Motion**: Motion library for smooth animations
- **Lucide React**: Icon library
- **Radix UI**: Headless UI components
- **Canvas Confetti**: Confetti animation effects
- **Number Flow**: Animated number counters
- **React Use Measure**: DOM measurement hook

## Project Structure

```
car/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── avatar.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── label.tsx
│   │       └── switch.tsx
│   ├── lib/
│   │   └── utils.ts           # Utility functions (cn)
│   ├── App.tsx                # Main landing page component
│   ├── main.tsx               # React entry point
│   ├── index.css              # Global styles
│   └── vite-env.d.ts          # TypeScript Vite definitions
│
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## Installation

### Prerequisites

- **Node.js 16+** (Download from https://nodejs.org)
- **npm** or **yarn** (comes with Node.js)

### Setup Steps

1. **Navigate to the project directory**:
   ```bash
   cd car
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   The app will open at `http://localhost:5173`

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

## Available Commands

```bash
# Start development server with hot reload
npm run dev

# Build optimized production version
npm run build

# Preview the production build locally
npm run preview

# Run ESLint code quality checks
npm run lint
```

## Component Overview

### Main Sections

1. **HeroSection**: 
   - Interactive scroll-based animation
   - Expanding media container
   - Animated hero text
   - Welcome content reveal

2. **FeaturesSection**:
   - 6 feature cards
   - Icon rotation animations
   - Hover scale effects
   - Animated background elements

3. **FeaturesSection**:
   - Animated stat counters
   - Infinite scrolling company logos
   - Hover interactions

4. **PricingSection**:
   - 3 pricing tiers (Free, Premium, Business)
   - Monthly/yearly billing toggle
   - Confetti animations on click
   - Animated number transitions

5. **TestimonialsSection**:
   - Infinite carousel of testimonials
   - Gradient backgrounds
   - Avatar images
   - Hover pause effect

6. **FAQSection**:
   - Expandable Q&A items
   - Smooth height animations
   - Chevron rotation on toggle

7. **ContactSection**:
   - 3 contact cards (Phone, Email, Address)
   - Icon rotation animations
   - Hover shadow effects

8. **Footer**:
   - Multi-column layout
   - Product, Company, Support links
   - Responsive grid

## Styling System

### Color Scheme

- **Backgrounds**: Dark slate and purple gradients
- **Text**: Cyan and white with transparency
- **Accents**: Cyan, purple, pink gradients
- **Borders**: Purple with transparency

### Custom Utilities

The `cn()` utility function (from `@/lib/utils`) merges Tailwind classes with proper precedence:
```tsx
cn("px-2 py-1", isActive && "bg-blue-500")
```

### Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Responsive typography and spacing
- Mobile menu hidden by default

## Interactive Features

### Animations

- **Scroll-based**: Hero section zoom effect
- **Hover effects**: Cards scale, rotate, change colors
- **Entrance animations**: Elements fade-in and slide-up on viewport entry
- **Continuous**: Floating icons, animated backgrounds
- **Click interactions**: Confetti effects on buttons
- **Transitions**: Smooth color, position, and scale changes

### User Interactions

- Scroll detection in hero section
- Toggle pricing plans (monthly/yearly)
- Expandable FAQ items
- Hover effects on all interactive elements
- Confetti triggered by button clicks

## Performance Optimization

- **Code splitting**: Components are modular and independently loaded
- **CSS purging**: Tailwind only includes used styles
- **Animation optimization**: Framer Motion uses hardware acceleration
- **Image optimization**: External images via Unsplash
- **Lazy rendering**: Components only animate when in viewport

## Customization

### Changing Colors

Modify the gradient colors in the hero and section backgrounds:
```tsx
// In HeroSection or Feature cards
className="bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900"
```

### Adjusting Animation Speed

Modify the `transition` property in motion components:
```tsx
transition={{ duration: 1.5 }} // Increase duration for slower animations
```

### Adding New Pricing Plans

Edit the `plans` array in `PricingSection`:
```tsx
const plans = [
  {
    name: "CUSTOM",
    price: "199",
    // ... rest of plan config
  },
]
```

### Updating Text Content

All text is easily editable in the component JSX:
- Headlines, descriptions, feature titles
- Testimonial quotes
- FAQ questions and answers
- Footer links

## Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized files ready for deployment.

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

1. Connect your GitHub repo
2. Set build command: `npm run build`
3. Set publish directory: `dist`

### Deploy to GitHub Pages

```bash
npm run build
# Deploy the dist folder to gh-pages branch
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Environment Variables

Create a `.env` file for environment-specific settings (optional):
```
VITE_APP_TITLE=WayFair
VITE_API_URL=https://api.example.com
```

## Troubleshooting

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### Dependencies won't install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tailwind classes not working
- Save the file to trigger HMR
- Check that file path is in `tailwind.config.js` content array
- Restart the dev server

### Animations not smooth
- Check browser GPU acceleration is enabled
- Ensure your device supports WebGL 2.0
- Try disabling extensions that modify CSS

## Learning Resources

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)

## License

MIT License - Feel free to use this project for personal and commercial purposes.

## Credits

Built with modern React best practices, smooth animations, and beautiful design patterns for the ultimate landing page experience.

---

**Need help?** Check the inline code comments or create an issue on GitHub!
