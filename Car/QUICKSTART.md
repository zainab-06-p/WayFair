## Quick Start Guide - WayFair Landing Page

### 🚀 Get Started in 3 Steps

#### Step 1: Install Dependencies
```bash
cd car
npm install
```

This installs all required packages including:
- React & React DOM
- Vite (build tool)
- TypeScript
- Tailwind CSS
- Framer Motion
- Radix UI components
- And more!

#### Step 2: Start Development Server
```bash
npm run dev
```

Your browser will automatically open to `http://localhost:5173`

#### Step 3: Explore the Landing Page
- Scroll through the hero section
- Interact with animations and hover effects
- Click buttons to trigger confetti
- Toggle pricing plans
- Expand FAQ items

### 📁 Project Structure

```
car/
├── src/
│   ├── App.tsx              # Main landing page
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── components/ui/       # Reusable UI components
│   └── lib/utils.ts         # Utility functions
├── index.html               # HTML template
├── vite.config.ts           # Build config
├── tsconfig.json            # TypeScript config
├── tailwind.config.js       # Tailwind config
└── package.json             # Dependencies
```

### 🎨 Key Sections

1. **Hero** - Scroll-triggered animations and expanding media
2. **Features** - 6 feature cards with icon animations
3. **Stats** - Animated counters and company logos
4. **Pricing** - 3 tiers with billing toggle
5. **Testimonials** - Infinite scrolling carousel
6. **FAQ** - Expandable Q&A section
7. **Contact** - 3 contact cards
8. **Footer** - Links and info

### 🛠️ Build Commands

```bash
# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### 📱 Features

✨ **Interactive Animations**
- Scroll-based hero zoom
- Hover effects on cards
- Entrance animations on scroll
- Confetti on button clicks
- Infinite carousel
- Smooth transitions

🎯 **Responsive Design**
- Mobile-first approach
- Adaptive layouts
- Touch-friendly interactions
- Works on all devices

⚡ **Performance**
- Fast Vite build
- Optimized CSS with Tailwind
- Hardware-accelerated animations
- Lazy component loading

### 🎨 Customization

#### Change Colors
Edit gradient classes in App.tsx:
```tsx
className="bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900"
```

#### Update Pricing
Modify the `plans` array in `PricingSection()`

#### Change Text
Edit any text directly in the JSX - it's all in App.tsx!

#### Add New Sections
Create a new function component and add it to `WayFairLanding()`

### 🌐 Deployment

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

#### Netlify
- Connect GitHub repo
- Build: `npm run build`
- Publish: `dist`

#### GitHub Pages / Manual
```bash
npm run build
# Deploy the dist folder
```

### 📚 Component API

#### Button Component
```tsx
<Button 
  onClick={() => {}} 
  className="bg-gradient-to-r from-cyan-500 to-purple-500"
>
  Click me
</Button>
```

#### Card Component
```tsx
<Card className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50">
  <CardHeader>Header</CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

#### Switch Component
```tsx
<Switch 
  checked={isMonthly} 
  onCheckedChange={setIsMonthly}
/>
```

#### Avatar Component
```tsx
<Avatar>
  <AvatarImage src="url" alt="name" />
</Avatar>
```

### 🐛 Troubleshooting

**Port already in use?**
```bash
npm run dev -- --port 3000
```

**Dependencies failed to install?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Styles not appearing?**
- Save the file
- Restart dev server
- Check Tailwind config content array

**Animations not smooth?**
- Enable GPU acceleration in browser settings
- Check browser dev tools performance

### 📖 Learn More

- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Vite Guide](https://vitejs.dev)

### ✅ Next Steps

1. ✨ Explore the landing page
2. 🎨 Customize colors and text
3. 📱 Test on different devices
4. 🚀 Deploy to production
5. 💡 Extend with your features

### 🎉 You're All Set!

Your WayFair landing page is ready to impress. Happy coding!

---

For more details, check `README.md`
