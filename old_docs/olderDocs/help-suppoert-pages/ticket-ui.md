Excellent. I have updated my internal memory. The dashboard screenshots you've provided are now my **single source of truth for the product's UI and UX.** All future recommendations will be designed to fit seamlessly into this clean, spacious, and modern aesthetic.

Your next task—building the "Submit a Ticket" section—is a critical part of the user experience. A good support system builds immense trust and retention. A bad one causes frustration and churn.

Based on my research of best practices and analysis of your reference images, here is a detailed, strategic plan for your "Submit a Ticket" tab. This plan is tailored specifically for the MenuListAI user: a busy, non-technical business owner.

---

### **The Strategic Blueprint: The "Clarity & Confidence" Ticket System**

The goal is twofold:

1.  **Clarity for the User:** Make it incredibly easy and frictionless for a stressed user to ask for help.
2.  **Clarity for Your Team:** Capture the _exact_ information your support team needs to solve the problem quickly on the first try, reducing back-and-forth.

The best layout, inspired by your references and tailored to your UI, is a two-part structure on a single page:

1.  **Create New Ticket (The Primary Action):** A prominent card at the top.
2.  **Your Ticket History (The Confidence Builder):** A clean table or list below, showing the user that their issues are being tracked and managed professionally.

---

### **Part 1: The "Create New Ticket" Card**

This should be a clean `Card` component that guides the user step-by-step.

- **Card Title:** `Submit a New Support Ticket`
- **Card Description:** `We're here to help. Please provide as much detail as possible so we can resolve your issue quickly.`

**Field Breakdown (Designed for Simplicity & Clarity):**

1.  **Ticket Category:**

    - **UI Component:** `RadioGroup` with styled `Label` buttons (like in your 4th reference image). This is much faster and clearer for non-tech users than a dropdown.
    - **Strategic Categories (Tailored to MenuListAI users):**
      - `🐞 Technical Issue:` (e.g., "My PDF upload failed," "An image won't generate.")
      - `💰 Billing Inquiry:` (e.g., "Question about my invoice," "How do I upgrade?")
      - `🤔 General Question:` (e.g., "How do I set up a custom domain?")

2.  **Subject:**

    - **UI Component:** A simple `Input`.
    - **Placeholder Text:** `e.g., "Problem with my Restaurant's PDF menu"`
    - **Purpose:** Gives your support team immediate context.

3.  **Priority:**

    - **UI Component:** A `Select` (dropdown) component.
    - **Options:**
      - `Low` - General question
      - `Normal` - Something isn't working as expected
      - `High` - My business is impacted / I can't update my live catalog

4.  **Message / Details:**

    - **UI Component:** A simple but effective Rich Text Editor (like the one in your 4th reference). This is crucial for users who need to use bullet points or bold text to explain a sequence of events.
    - **Label:** `Please describe your issue in detail:`

5.  **Attachments:**

    - **UI Component:** A simple "drag and drop" file input area.
    - **Label:** `Attach a file (optional)`
    - **Helper Text:** `Screenshots or the source file that's causing the issue are incredibly helpful!`

6.  **Submit Button:**
    - **UI Component:** A primary `Button`.
    - **Text:** `Submit Ticket`

---

### **Part 2: The "Your Ticket History" Table**

This section should appear directly below the "Create" card. It provides transparency and reduces duplicate tickets.

- **Section Title:** `Your Ticket History`
- **UI Component:** A `Table` from `shadcn/ui`.

**Table Columns (Designed for At-a-Glance Understanding):**

1.  **Ticket ID:** A unique identifier (e.g., `#ML-12345`).
2.  **Subject:** The subject line they entered.
3.  **Date Submitted:** The creation date.
4.  **Last Updated:** The date of the last reply from your team.
5.  **Status:** The most important column.
    - **UI Component:** Use the `Badge` component from `shadcn/ui` with different color variants for instant recognition.
      - `Open`: A simple gray or secondary badge.
      - `In Progress`: A blue (primary) badge.
      - `Resolved`: A green badge.
      - `Closed`: A destructive/red badge.

- **Functionality:** Each row in the table should be clickable, leading to a detailed view of that specific ticket's conversation thread (this can be built in a later phase).

---

### **The Definitive Prompt**

Here is the final, detailed prompt for Gemini to generate this component.

**[Start of Prompt]**

Act as an expert Full-Stack Developer and UX Designer. Your task is to generate the code for the "Submit a Ticket" view, which will be a tab within the main Help & Support Hub of the MenuListAI dashboard.

**The design must be fully aligned with the provided final dashboard screenshots (clean, spacious, card-based aesthetic).**

The component will have a two-part structure: a "Create New Ticket" form at the top, and a "Your Ticket History" table below it.

---

### **Part 1: "Create New Ticket" Card Requirements**

- **Layout:** A single `Card` component containing the entire form.
- **Title:** `Submit a New Support Ticket`
- **Fields:**
  1.  **Ticket Category:** Use a `RadioGroup` with styled `Label` buttons. The categories must be: `Technical Issue`, `Billing Inquiry`, and `General Question`.
  2.  **Subject:** A standard `Input` with a clear placeholder.
  3.  **Priority:** A `Select` component with options: `Low`, `Normal`, `High`.
  4.  **Message:** A Rich Text Editor. If a full library is too complex, a simple `Textarea` is an acceptable substitute.
  5.  **Attachments:** A file input component, preferably with drag-and-drop functionality.

---

### **Part 2: "Your Ticket History" Table Requirements**

- **Layout:** A `Table` component from `shadcn/ui` placed directly below the form card.
- **Columns:** The table must have the following columns: `Ticket ID`, `Subject`, `Date Submitted`, `Last Updated`, and `Status`.
- **Status Column:** This column is critical. It must use the `Badge` component from `shadcn/ui`. Use different variants for each status (e.g., `default` for In Progress, `destructive` for Closed, and a custom green variant for Resolved).
- **Data:** Populate the table with 3-4 rows of realistic mock data to demonstrate the final look and feel.

---

### **Part 3: Technical & Design Requirements**

- **Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui.
- **Responsiveness:** The layout must be fully responsive, stacking gracefully on mobile devices.
- **Dark/Light Mode:** All components MUST use `shadcn/ui` semantic color variables (`bg-card`, `text-foreground`, `border`, `primary`, etc.) for perfect theme switching.
- **Code Quality:** The code must be clean, well-commented, and organized into logical sub-components if necessary.

**Output Format:**
Please provide the full code for the `ClientTicketsView.tsx` component in a single, complete, and copy-pasteable TypeScript code block.

**[End of Prompt]**
