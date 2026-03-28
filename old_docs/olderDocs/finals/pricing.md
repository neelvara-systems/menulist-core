### **MenuListAI: The Final Product Pricing & Strategy Document**

**Date:** June 28, 2025
**Version:** 2.0 (Go-to-Market, Regional)

### **Overall Summary & Core Strategy**

This document outlines the finalized **Hybrid, Dual-Market Subscription Model** for MenuListAI. Our strategy is built on two core principles:

1.  **The Hybrid Model:** We combine the predictable revenue of monthly subscriptions with the margin protection of a usage-based credit system for high-cost AI operations.
2.  **The Dual-Market Strategy:** We recognize that the global (USD) and Indian (INR) markets are fundamentally different. Therefore, we will deploy two distinct, tailored pricing structures to maximize customer acquisition and lifetime value in each region.

This document serves as the single source of truth for all pricing, features, and strategic rationale.

---

### **Market Analysis & Strategic Pricing Rationale**

The decision to adopt a dual-market pricing strategy is the most critical strategic choice we have made. It is based on the following market analysis:

#### **1. The Global Market (USD Pricing)**

- **Market Maturity:** Mature. SMBs in North America, Europe, etc., are accustomed to paying for specialized SaaS tools that save time or drive growth.
- **Competitive Landscape:** Customers will compare MenuListAI to other premium creative and marketing tools like Canva ($15/mo), Squarespace ($23/mo), and Mailchimp ($20+/mo).
- **Strategic Decision:** Our USD pricing is positioned as a **premium, value-based tool**. The `$29 -> $79 -> $149` ladder is standard for this market. The goal is to deliver overwhelming value upfront (e.g., 100 credits in the Starter plan) and upsell based on powerful professional features like Google Analytics integration, higher project limits, and the Interactive Studio. The pricing reflects the immense ROI of automating creative and marketing work.

#### **2. The Indian Market (INR Pricing)**

- **Market Maturity:** Emerging. SMBs are highly price-sensitive and often view software as a "cost center" to be minimized.
- **Competitive Landscape:** Customers will incorrectly compare MenuListAI's price to their operational software (e.g., Petpooja, Salonist), which manages their entire business for a similar annual cost.
- **Strategic Decision:** Our INR pricing is designed as a **low-friction, high-volume customer acquisition engine**. The entry-level **₹499 Starter plan** is an "irresistible hook" designed to remove the barrier to entry and get thousands of users on the platform. The strategy is to prove our value with a generous (but limited) "taste" of the magic, and then drive upgrades based on critical professional features like using a **Custom Domain** and **removing our branding**.

---

### **Final Pricing Plans**

#### **B2C Plans: For Business Owners**

| Plan                   | Global (USD) Monthly | Global (USD) Yearly | India (INR) Monthly | India (INR) Yearly |
| :--------------------- | :------------------- | :------------------ | :------------------ | :----------------- |
| **Starter**            | **$29** /mo          | **$290** /yr        | **₹499** /mo        | **₹4,990** /yr     |
| **Pro** (Most Popular) | **$79** /mo          | **$790** /yr        | **₹1,499** /mo      | **₹14,990** /yr    |
| **Premium**            | **$149** /mo         | **$1,490** /yr      | **₹3,999** /mo      | **₹39,990** /yr    |

#### **B2B Plans: For Developers & Agencies (Global Pricing)**

| Plan            | Monthly Price | Yearly Price   |
| :-------------- | :------------ | :------------- |
| **Starter API** | **$69** /mo   | **$690** /yr   |
| **Growth API**  | **$249** /mo  | **$2,490** /yr |
| **Scale API**   | **Custom**    | **Custom**     |

#### **Add-On Credit Top-Up Packs (Global Pricing)**

| Pack Name        | Credits | Price (USD) | Price (INR) |
| :--------------- | :------ | :---------- | :---------- |
| **Starter Pack** | 100     | **$15**     | **₹1,250**  |
| **Value Pack**   | 250     | **$35**     | **₹2,999**  |
| **Pro Pack**     | 500     | **$60**     | **₹4,999**  |

---

### **The Credit System Explained**

#### **1. Value of a Credit**

The system is anchored to the baseline credit pack price:

- **1 Credit = $0.15 (USD)**
- **1 Credit = ₹12.50 (INR)**

#### **2. How Credits Work for Your Business (Your Costs)**

We incur a small, direct cost from our provider (Google AI) for each AI action:

- **Data Extraction:** ~$0.0014 per document.
- **AI Image Generation:** ~$0.03 per image.
- **AI Image Editing:** ~$0.039 per image.

#### **3. How Credits Work for Your Customers (Their Costs)**

Customers receive a monthly allowance of credits. Core actions like data extraction and designing are free. Credits are only used for high-cost AI creative tasks:

- **AI Art Director** (Generate Image): **5 Credits**
- **AI Photo Editor** (Edit Image): **6 Credits**
- **Interactive Studio** (Combine Images): **20 Credits**

This system ensures that our pricing is always profitable while providing immense value.

---

### **Profit Margin Analysis**

Even our lowest-priced, entry-level plans are highly profitable, confirming their strategic value as acquisition tools. The analysis below is for the "worst-case" scenario where a user consumes all their monthly credits.

| Plan            | Revenue  | Max User Action    | Your Cost | **Gross Profit** | **Gross Margin** |
| :-------------- | :------- | :----------------- | :-------- | :--------------- | :--------------- |
| **INR Starter** | **₹499** | Generate 15 images | ~₹37.58   | **~₹461.42**     | **~92.5%**       |
| **USD Starter** | **$29**  | Generate 20 images | ~$0.60    | **~$28.40**      | **~98%**         |

**Conclusion:** The pricing is financially sound. The primary business goal is to acquire users via the low-cost Starter plans and drive revenue through upgrades to the higher-margin Pro and Premium tiers.

---

### **Finalized Feature & JSON Structure**

To implement the dual-market strategy, the feature set and credit allowances differ between regions for similarly named plans. The JSON structure below reflects this.

#### **Final JSON Structure**

This structure separates pricing and features by region, allowing you to display the correct plan based on user location while maintaining a consistent `planId`.

<details>
<summary>Click to view the Final B2C Plans JSON</summary>

```json
[
  {
    "planId": "starter",
    "billingInterval": "MONTH",
    "priceUSD": { "price": 2900, "monthlyCredits": 100 },
    "priceINR": { "price": 49900, "monthlyCredits": 75 }
  },
  {
    "planId": "starter",
    "billingInterval": "YEAR",
    "priceUSD": { "price": 29000, "monthlyCredits": 100 },
    "priceINR": { "price": 499000, "monthlyCredits": 75 }
  },
  {
    "planId": "pro",
    "billingInterval": "MONTH",
    "priceUSD": { "price": 7900, "monthlyCredits": 400 },
    "priceINR": { "price": 149900, "monthlyCredits": 200 }
  },
  {
    "planId": "pro",
    "billingInterval": "YEAR",
    "priceUSD": { "price": 79000, "monthlyCredits": 400 },
    "priceINR": { "price": 1499000, "monthlyCredits": 200 }
  },
  {
    "planId": "premium",
    "billingInterval": "MONTH",
    "priceUSD": { "price": 14900, "monthlyCredits": 1000 },
    "priceINR": { "price": 399900, "monthlyCredits": 600 }
  },
  {
    "planId": "premium",
    "billingInterval": "YEAR",
    "priceUSD": { "price": 149000, "monthlyCredits": 1000 },
    "priceINR": { "price": 3999000, "monthlyCredits": 600 }
  }
]
```

</details>

This document represents our complete, finalized, and actionable pricing strategy. It is built on thorough market analysis, sound financial modeling, and a clear understanding of our target customers in different regions.
