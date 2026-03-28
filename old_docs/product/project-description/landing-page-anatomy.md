# MenuListAI Landing Page Content Overview

This document outlines the content and structure of the MenuListAI landing page.

## 1. Navbar

The navigation bar is sticky at the top of the page and provides primary navigation and utility actions.

- **Logo**:
  - Displays "MenuListAI" text with a "Zap" icon.
  - Links to the top of the landing page (`/`).
- **Navigation Links**:
  - "Features": Scrolls smoothly to the "Features" section (`#features`).
  - "How It Works": Scrolls smoothly to the "How It Works" section (`#how-it-works`).
  - "Use Cases": Scrolls smoothly to the "Use Cases" section (`#use-cases`).
  - "Pricing": Scrolls smoothly to the "Pricing" section (`#pricing`).
- **Utility Controls**:
  - **Theme Toggle**: Allows users to switch between "Light", "Dark", and "System" themes. Displays a Sun or Moon icon based on the current effective theme.
  - **Login Button**: Ghost-styled button with "Login" text and a "LogIn" icon. Placeholder link (`#`).
  - **Get Started Button**: Primary-styled button with "Get Started" text and an "ArrowRight" icon. Placeholder link (`#`).

## 2. Hero Section

This is the first section users see, designed to grab attention and introduce the product.

- **Headline**: "Turn Your Menu into Your Best Salesperson"
- **Sub-headline/Paragraph**: "Stop wasting time with paper menus. Create a stunning, interactive digital menu that attracts more customers, makes updates instant, and helps you sell more of your most profitable dishes."
- **Call-to-Action Buttons**:
  - "Create My Free Menu": Primary button with a "Zap" icon. Placeholder link (`#`).
  - "Learn More": Outline button. Links to the "Features" section (`#features`).
- **Image**:
  - A prominent placeholder image representing an "App Screenshot - Menu List AI".
  - Dimensions: 1200x675.
  - `data-ai-hint`: "app dashboard"

## 3. Trust Badges Section

A small section to build immediate trust and highlight key value propositions.

- **Badge 1**:
  - Icon: "Sparkles"
  - Text: "Perfectly Accurate, Every Time"
- **Badge 2**:
  - Icon: "CalendarClock"
  - Text: "From Paper to Digital in 5 Mins"
- **Badge 3**:
  - Icon: "ThumbsUp"
  - Text: "Loved by Restaurants & Developers"

## 4. Features Section (Core AI-Powered Features)

Details the main AI-driven functionalities of MenuListAI.

- **Section Title**: "A Smarter Menu That Works For You."
- **Section Description**: "We've packed powerful tools into a simple platform, so you can focus on what you do best: serving your customers."
- **Feature Cards (Displayed in a 2-column grid on md+ screens)**:
  - **Card 1: AI-Powered Data Extraction**
    - Icon: "UploadCloud"
    - Title: "Go from Paper to Pixel-Perfect in Seconds"
    - Description: "Tired of typing? Just upload a photo or PDF of your current menu. Our AI instantly reads everything—items, descriptions, prices—and builds your digital menu for you. No more tedious data entry."
    - Benefit: "Save hours of work and eliminate costly typos."
  - **Card 2: AI Description Generation**
    - Icon: "FileText"
    - Title: "Write Descriptions That Make Mouths Water"
    - Description: "Struggling to find the right words? Our AI helps you craft tempting, persuasive descriptions for every item, turning casual browsers into paying customers."
    - Benefit: "Sell more of your signature dishes, effortlessly."
  - **Card 3: AI Image Generation**
    - Icon: "Sparkles" (Note: same as trust badge, might consider a different icon like `ImageIcon` if available and distinct)
    - Title: "A Stunning Photo for Every Dish"
    - Description: "Don't have a professional photographer? No problem. Generate beautiful, unique, and appetizing images for any menu item with a single click."
    - Benefit: "Make your menu visually irresistible and increase order values."
  - **Card 4: AI-Powered Multi-Language Menus**
    - Icon: "Layers"
    - Title: "Welcome Customers from Around the World"
    - Description: "Serve a diverse clientele? Instantly translate your entire menu into any language with our advanced AI, ensuring every guest feels right at home."
    - Benefit: "Expand your customer base and provide a 5-star experience."

## 4.5. Analytics Highlights Section

This section prominently showcases key benefits and insights derived from the analytics dashboard.

- **Section ID**: `analytics-highlights`
- **Placement**: After "Features Section" and before "Problem Solution Section".
- **Section Title**: "Know What Your Customers Love."
- **Section Description**: "Get simple insights to make smart decisions. See what's popular, what's not, and how your customers are finding you."
- **Highlight Cards (Displayed in a 3-column grid on md+ screens)**:
  - **Card 1: Identify Top Performers**
    - Icon: `FaChartLine` (from `react-icons/fa`)
    - Title: "Pinpoint Your Bestsellers"
    - Description: "Instantly see which menu items are your bestsellers and which might need a boost to optimize your offerings."
  - **Card 2: Understand Customer Behavior**
    - Icon: `FaUsers` (from `react-icons/fa`)
    - Title: "See What's Popular (and What's Not)"
    - Description: "Gain insights into customer demographics, including device usage and location, to tailor your offerings and marketing."
  - **Card 3: Measure Marketing Effectiveness**
    - Icon: `FaBullseye` (from `react-icons/fa`)
    - Title: "Track Which Promotions Are Working"
    - Description: "Track the success of your promotional campaigns with detailed UTM (source, medium, campaign) breakdowns."

## 5. Problem Solution Section

Addresses common pain points and positions MenuListAI as the solution.

- **Section Title**: "Stop Struggling, Start Thriving."
- **Problem/Solution Points (Displayed in a 2-column grid on md+ screens)**:
  - **Point 1**:
    - Icon: "BarChartBig"
    - Title: "Is Your Menu Working Against You?"
    - Description: "Tired of static paper menus, costly reprints, and an online presence that doesn't impress? MenuListAI helps you create a stunning, interactive digital menu that captivates customers and can be updated in seconds."
  - **Point 2**:
    - Icon: "Database"
    - Title: "Are You a Developer? Get the Data You Need."
    - Description: "Stop wasting time with unreliable data scraping. Get clean, structured menu data via our robust API. Perfect for food apps, ordering platforms, and more. [Link: View API Docs]"

## 6. How It Works Section

Explains the process of using MenuListAI in simple steps.

- **Section Title**: "Your Stunning New Menu in 3 Easy Steps"
- **Section Description**: "Transform your menu management effortlessly."
- **Steps (Displayed in a 3-column grid on md+ screens)**:
  - **Step 1: Upload Your Menu**
    - Icon: "UploadCloud"
    - Title: "1. Snap or Upload Your Old Menu"
    - Description: "Just give us your existing menu in any format (PDF, JPG, PNG)."
    - Image: Placeholder 400x300, `data-ai-hint`: "upload interface"
  - **Step 2: AI Extracts & You Refine**
    - Icon: "Cpu"
    - Title: "2. Watch the Magic Happen (and Add Your Touch)"
    - Description: "Our AI builds your new menu in seconds. You can easily review and tweak any detail in our simple editor."
    - Image: Placeholder 400x300, `data-ai-hint`: "ai process"
  - **Step 3: Deploy or Integrate**
    - Icon: "Layers"
    - Title: "3. Share Your New Menu & Wow Customers"
    - Description: "Your beautiful new digital menu is ready! Share it with a link, a QR code, and watch the compliments (and orders) roll in."
    - Image: Placeholder 400x300, `data-ai-hint`: "review publish"

## 7. Use Cases Section

Highlights how different user segments can benefit from MenuListAI.

- **Section Title**: "Tailored for Your Success"
- **Section Description**: "Whether you're a business owner or a developer, MenuListAI provides the tools you need."
- **Use Case Cards (Displayed in a 2-column grid on lg+ screens)**:
  - **Use Case 1: For Restaurants, Cafes & Salons (B2C)**
    - Icon: "Zap"
    - Category Text: "For Restaurants, Cafes & Salons (B2C)"
    - Title: "Elevate Your Customer Experience"
    - Description: "Create beautiful, interactive digital menus that are easy to update and share. Attract more customers and enhance your brand."
    - Image: Placeholder 600x338, `data-ai-hint`: "restaurant menu"
    - Checklist:
      - "Effortless AI Digitization"
      - "Customizable Menu Designs"
      - "Instant Updates, No Reprints"
      - "Image & Description AI Tools"
  - **Use Case 2: For Developers & Agencies (B2B)**
    - Icon: "Database"
    - Category Text: "For Developers & Agencies (B2B)"
    - Title: "Power Your Applications with Menu Data"
    - Description: "Get accurate, structured JSON menu data via API or download. Accelerate development and build innovative solutions."
    - Image: Placeholder 600x338, `data-ai-hint`: "developer code"
    - Checklist:
      - "Reliable AI Data Extraction"
      - "Seamless API Integration"
      - "JSON & XLSX Downloads"
      - "Focus on Building, Not Scraping"

## 8. Why Choose Us Section

Emphasizes the unique selling propositions of MenuListAI.

- **Section Title**: "Why Choose MenuListAI?"
- **Section Description**: "Discover the advantages that make MenuListAI the preferred choice for modern menu management."
- **Points (Displayed in a 4-column grid on lg+ screens, 2-column on md)**:
  - **Point 1: Dual-Purpose Platform**
    - Icon: "Layers"
    - Title: "Dual-Purpose Platform"
    - Description: "Uniquely serves both B2C businesses needing beautiful digital menus AND B2B users needing structured data."
  - **Point 2: AI at its Core**
    - Icon: "Cpu"
    - Title: "AI at its Core"
    - Description: "From intelligent extraction to AI-assisted image and description generation, MenuListAI streamlines every step."
  - **Point 3: Comprehensive Customization**
    - Icon: "Wrench"
    - Title: "Comprehensive Customization"
    - Description: "Extensive options for both B2C visual presentation and B2B data handling, ensuring a perfect fit for your needs."
  - **Point 4: User-Friendly Interface**
    - Icon: "ThumbsUp"
    - Title: "User-Friendly Interface"
    - Description: "Designed for ease of use, empowering both non-technical business owners and savvy developers alike."

## 9. Testimonials Section

Builds social proof with quotes from satisfied users.

- **Section Title**: "Loved by Businesses & Developers"
- **Section Description**: "Hear what our users are saying about MenuListAI."
- **Testimonial Cards (Displayed in a 3-column grid on lg+ screens)**:
  - **Testimonial 1**:
    - Quote: "MenuListAI didn't just save us time, it transformed our data accuracy. We've cut menu-related errors by over 95%. Indispensable!"
    - Name: "Elena Rodriguez"
    - Title: "COO, Gourmet Group Holdings"
    - Avatar: Fallback text "ER"
    - Company Logo: Placeholder 100x40, `data-ai-hint`: "corporate logo"
  - **Testimonial 2**:
    - Quote: "The API is a dream. We integrated MenuListAI into our platform in under a day, and our clients are thrilled with the speed of menu updates."
    - Name: "Marcus Chen"
    - Title: "Lead Developer, FoodieTech Solutions"
    - Avatar: Fallback text "MC"
    - Company Logo: Placeholder 100x40, `data-ai-hint`: "tech logo"
  - **Testimonial 3**:
    - Quote: "As a multi-location franchise, consistency is key. MenuListAI ensures all our digital menus are perfectly synchronized and up-to-date. A huge operational win."
    - Name: "Aisha Khan"
    - Title: "Franchise Operations Director, QuickBite International"
    - Avatar: Fallback text "AK"
    - Company Logo: Placeholder 100x40, `data-ai-hint`: "food franchise"

## 10. Pricing Section

Outlines the available subscription plans.

- **Section Title**: "Simple, Transparent Pricing"
- **Section Description**: "Choose the plan that's right for your business."
- **Pricing Cards (Displayed in a 3-column grid on lg+ screens)**:
  - **Plan 1: Starter**
    - Title: "Starter"
    - Price: "$29/mo"
    - Features:
      - "Up to 50 menu items"
      - "Basic AI extraction"
      - "Standard description generation"
      - "Email support"
    - CTA: "Choose Starter" (Placeholder link `#`)
  - **Plan 2: Pro (Most Popular)**
    - Title: "Pro"
    - Price: "$79/mo"
    - Features:
      - "Up to 200 menu items"
      - "Advanced AI extraction"
      - "Premium description generation"
      - "AI image generation (100 images/mo)"
      - "Priority email support"
    - Popular Badge: "Most Popular" displayed above the card.
    - CTA: "Choose Pro" (Placeholder link `#`)
  - **Plan 3: Enterprise**
    - Title: "Enterprise"
    - Price: "Custom"
    - Features:
      - "Unlimited menu items"
      - "All Pro features"
      - "API access"
      - "Dedicated account manager"
      - "Custom integrations"
    - CTA: "Contact Us" (Placeholder link `#`)

## 11. Footer

Contains secondary navigation, copyright information, and legal links.

- **Logo**:
  - Displays "MenuListAI" text with a "Zap" icon.
- **Navigation Links**:
  - "Features": Scrolls smoothly to `#features`.
  - "How It Works": Scrolls smoothly to `#how-it-works`.
  - "Use Cases": Scrolls smoothly to `#use-cases`.
  - "Pricing": Scrolls smoothly to `#pricing`.
  - "Contact": Links to `/contact`.
- **Copyright**: "© [Current Year] MenuListAI. All rights reserved."
- **Legal Links**:
  - "Privacy Policy": Links to `/privacy`.
  - "Terms of Service": Links to `/terms`.
  - (Separated by a "|" character)

---

_This document reflects the content structure as of the last update. Icons are typically from the `lucide-react` library._
