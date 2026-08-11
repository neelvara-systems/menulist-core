import type { CampaignCueBusinessType, CampaignCueChannel } from "@type/campaigncue";

export type CampaignCueDailyDeskActionTarget =
    | "home"
    | "details"
    | "sources"
    | "delivery"
    | "settings"
    | "cues"
    | "campaigns"
    | "creative"
    | "editor"
    | "video"
    | "ugc"
    | "whatsapp"
    | "google"
    | "ads"
    | "trust"
    | "calendar"
    | "assets"
    | "analytics"
    | "agency"
    | "locations"
    | "visibility"
    | "billing";

export type CampaignCueDailyDeskTaskKind =
    | "business_detail"
    | "source_input"
    | "asset_rights"
    | "asset_reuse"
    | "photo_task"
    | "print_export"
    | "campaign_pack"
    | "manual_delivery"
    | "manual_post"
    | "result_memory"
    | "approval"
    | "location_variant"
    | "local_visibility"
    | "operating_pulse"
    | "commercial_safety"
    | "staff_execution";

export type CampaignCueDailyDeskMissingInputType =
    | "business_cta"
    | "current_offer"
    | "price_or_date"
    | "offer_end_date"
    | "available_time_slot"
    | "booking_link"
    | "branch_location"
    | "menu_service_item"
    | "approved_asset"
    | "asset_rights"
    | "photo"
    | "logo"
    | "terms"
    | "destination_url"
    | "location_detail"
    | "approval"
    | "result_note"
    | "local_visibility"
    | "commercial_policy"
    | "capacity_or_stock"
    | "review_destination"
    | "completed_customer_interaction"
    | "owner_managed_audience"
    | "target_language";

export type CampaignCueDailyDeskOwnerGoal =
    | "bring_people_today"
    | "fill_slots"
    | "sell_product"
    | "book_service"
    | "remind_customers"
    | "prepare_local_pack"
    | "collect_reviews"
    | "bring_back_customers";

export interface CampaignCueDailyDeskResultSignal {
    id: string;
    label: string;
    note: string;
}

export interface CampaignCueDailyDeskRecipe {
    id: string;
    businessTypes: CampaignCueBusinessType[];
    title: string;
    scenario: "daily_default" | "slow_period" | "slot_fill" | "new_offer" | "review_push" | "retention" | "asset_reuse" | "local_visibility";
    ownerOutcome: string;
    ownerGoal: CampaignCueDailyDeskOwnerGoal;
    plainAction: string;
    whenToUse: string;
    requiredInputs: string[];
    recommendedChannels: CampaignCueChannel[];
    outputFormats: string[];
    printFormats: string[];
    photoTasks: string[];
    guardrails: string[];
    manualDeliveryTasks: string[];
    resultQuestion: string;
    resultOptions: CampaignCueDailyDeskResultSignal[];
}

export const CAMPAIGNCUE_DAILY_DESK_RECIPES: CampaignCueDailyDeskRecipe[] = [
    {
        id: "restaurant_today_item_push",
        businessTypes: ["restaurant", "multi_location", "agency_client"],
        title: "Today item push",
        scenario: "daily_default",
        ownerOutcome: "Bring attention to one available item, offer, or meal moment without rebuilding every channel separately.",
        ownerGoal: "bring_people_today",
        plainAction: "Promote one item people can order or ask about today.",
        whenToUse: "Use when one menu item, offer, meal time, or local event is more useful than a broad brand post.",
        requiredInputs: [
            "Item or offer name",
            "Current price, date, or availability when used",
            "Menu, phone, WhatsApp, or website next step",
            "Approved food, storefront, or simple brand image",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "video", "calendar"],
        outputFormats: [
            "WhatsApp text",
            "Google update draft",
            "Instagram square caption",
            "Story/reel brief",
            "Staff sharing text",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "A4 counter flyer",
            "Window poster",
            "Table tent with QR or phone",
            "Takeaway bag insert",
            "Coupon slip",
        ],
        photoTasks: [
            "Take one bright close photo of the item on the counter or table.",
            "Take one storefront or staff handoff photo if the item photo is not ready.",
            "Avoid showing unavailable items, old prices, or unrelated menu boards.",
        ],
        guardrails: [
            "Check price, availability, date, and menu link before use.",
            "Do not imply items, portions, or offers that are not currently available.",
            "Use only owner-approved photos.",
        ],
        manualDeliveryTasks: [
            "Copy the WhatsApp text into the owner-managed WhatsApp workflow.",
            "Paste the Google update manually after checking price, date, photo, and link.",
            "Download the creative or flyer and share it only after the owner has checked the menu details.",
        ],
        resultQuestion: "What happened after using this item push?",
        resultOptions: [
            { id: "orders_or_inquiries", label: "Got orders or inquiries", note: "Owner reported orders, calls, replies, or walk-ins." },
            { id: "people_mentioned_it", label: "People mentioned it", note: "Owner heard customers mention the campaign." },
            { id: "not_used", label: "Not used yet", note: "Owner downloaded or prepared the pack but has not used it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the pack useful for this business moment." },
        ],
    },
    {
        id: "salon_slot_fill",
        businessTypes: ["salon"],
        title: "Appointment slot fill",
        scenario: "daily_default",
        ownerOutcome: "Fill open appointment slots with one clear service, booking path, and safe visual direction.",
        ownerGoal: "fill_slots",
        plainAction: "Promote one service or open slot with a clear booking path.",
        whenToUse: "Use when the owner has an open slot, a service to highlight, or a staff schedule gap.",
        requiredInputs: [
            "Service or offer name",
            "Booking link, WhatsApp, or phone",
            "Available date, time window, or staff note",
            "Approved service, salon, or treatment-room photo",
        ],
        recommendedChannels: ["whatsapp", "creative", "ugc", "video", "calendar"],
        outputFormats: [
            "WhatsApp booking text",
            "Instagram square caption",
            "Story/reel brief",
            "Staff sharing text",
            "Creator script",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "Reception flyer",
            "Window poster",
            "Service card",
            "QR booking card",
            "WhatsApp reply card",
        ],
        photoTasks: [
            "Take one clean photo of the service area, chair, product, or finished setup.",
            "Use before/after or customer images only with clear consent.",
            "Avoid health, beauty-result, or transformation promises.",
        ],
        guardrails: [
            "Check booking link, date, and service details before use.",
            "Confirm consent before using any person, staff, or customer image.",
            "Avoid guaranteed result claims.",
        ],
        manualDeliveryTasks: [
            "Copy the booking text into the owner-managed WhatsApp or inbox workflow.",
            "Download the story or post asset and share it manually after checking slot time.",
            "Keep before/after or customer photos out unless consent is confirmed.",
        ],
        resultQuestion: "What happened after using this slot-fill pack?",
        resultOptions: [
            { id: "bookings_received", label: "Got bookings", note: "Owner reported bookings or appointment replies." },
            { id: "replies_only", label: "Got replies only", note: "Owner got interest but not confirmed bookings." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the pack but has not shared it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this pack useful." },
        ],
    },
    {
        id: "local_service_reminder",
        businessTypes: ["local_service"],
        title: "Service reminder",
        scenario: "daily_default",
        ownerOutcome: "Turn one common service, seasonal need, or availability window into a simple customer reminder.",
        ownerGoal: "book_service",
        plainAction: "Remind nearby customers to book or request one service.",
        whenToUse: "Use for repair, cleaning, maintenance, home service, local professional, or similar appointment-led work.",
        requiredInputs: [
            "Service name",
            "Service area",
            "Phone, website, booking link, or WhatsApp",
            "Approved job, vehicle, storefront, staff, or brand photo",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp reminder text",
            "Google update draft",
            "Square service post",
            "Staff sharing text",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "A4 service flyer",
            "Door hanger note",
            "Counter sign",
            "Referral card",
            "Service checklist card",
        ],
        photoTasks: [
            "Take one clean photo of a real job setup, vehicle, storefront, or service tool.",
            "Avoid showing customer homes, license plates, or people without permission.",
            "Use before/after images only when the owner can prove consent.",
        ],
        guardrails: [
            "Check service area, price range, and contact path before use.",
            "Do not promise guaranteed repair, medical, legal, financial, or safety outcomes.",
            "Use only owner-approved photos.",
        ],
        manualDeliveryTasks: [
            "Copy the customer reminder into the owner-managed messaging workflow.",
            "Paste the Google update manually after checking service area and contact details.",
            "Download the flyer for counter, vehicle, or handout use.",
        ],
        resultQuestion: "What happened after using this service reminder?",
        resultOptions: [
            { id: "requests_received", label: "Got requests", note: "Owner reported calls, messages, or booking requests." },
            { id: "repeat_customers", label: "Repeat customers replied", note: "Existing customers responded or asked for service." },
            { id: "not_used", label: "Not used yet", note: "Owner has not shared or printed the pack yet." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the reminder useful." },
        ],
    },
    {
        id: "retail_product_push",
        businessTypes: ["retail"],
        title: "Product push",
        scenario: "daily_default",
        ownerOutcome: "Promote one in-stock product, offer, or small collection with safe price and availability checks.",
        ownerGoal: "sell_product",
        plainAction: "Promote one product customers can ask about or buy today.",
        whenToUse: "Use when a shop has a featured product, new arrival, limited stock, or local walk-in offer.",
        requiredInputs: [
            "Product or offer name",
            "Price, stock, or offer date when used",
            "Phone, website, WhatsApp, or store visit next step",
            "Approved product or storefront photo",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp product text",
            "Google update draft",
            "Instagram square caption",
            "Story brief",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "Shelf talker",
            "Window poster",
            "Counter card",
            "Coupon slip",
            "Bag insert",
        ],
        photoTasks: [
            "Take one clear product photo in good light with the current item only.",
            "Take a shelf or counter photo if the product photo is not ready.",
            "Avoid showing old price tags, unavailable stock, or unrelated products.",
        ],
        guardrails: [
            "Check price, stock, offer date, and next step before use.",
            "Do not imply inventory, discounts, or product guarantees that are not true.",
            "Use only owner-approved photos.",
        ],
        manualDeliveryTasks: [
            "Copy product text into the owner-managed message or social workflow.",
            "Paste the Google update manually after checking stock, price, and photo.",
            "Download the shelf or counter format for in-store use.",
        ],
        resultQuestion: "What happened after using this product push?",
        resultOptions: [
            { id: "sales_or_questions", label: "Got sales or questions", note: "Owner reported product sales, calls, or questions." },
            { id: "store_visits", label: "More store visits", note: "Owner saw walk-ins mention or inspect the product." },
            { id: "not_used", label: "Not used yet", note: "Owner has not shared or printed the pack yet." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the product pack useful." },
        ],
    },
    {
        id: "fitness_class_fill",
        businessTypes: ["fitness"],
        title: "Class fill",
        scenario: "daily_default",
        ownerOutcome: "Fill a class, session, or local fitness offer with consent-safe copy and a clear booking path.",
        ownerGoal: "fill_slots",
        plainAction: "Promote one class, session, or trial with a booking/contact path.",
        whenToUse: "Use when a gym, studio, trainer, or class-based business needs signups for a dated session.",
        requiredInputs: [
            "Class or session name",
            "Date, time, or availability window",
            "Booking link, phone, website, or WhatsApp",
            "Approved studio, equipment, staff, or class photo",
        ],
        recommendedChannels: ["whatsapp", "creative", "video", "ugc", "calendar"],
        outputFormats: [
            "WhatsApp signup text",
            "Instagram square caption",
            "Story/reel brief",
            "Staff sharing text",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "Reception flyer",
            "Window poster",
            "Class schedule card",
            "Referral card",
            "QR signup card",
        ],
        photoTasks: [
            "Take one real class, equipment, studio, or trainer photo with consent when people appear.",
            "Use transformation or body-result photos only with explicit consent and proof.",
            "Avoid health, weight-loss, or guaranteed outcome claims.",
        ],
        guardrails: [
            "Check date, time, booking path, capacity, and consent before use.",
            "Avoid guaranteed health, fitness, body, or medical outcomes.",
            "Do not use member images without consent.",
        ],
        manualDeliveryTasks: [
            "Copy signup text into the owner-managed message workflow.",
            "Download the story or post asset and share it manually after checking class time.",
            "Use print cards only after capacity and booking path are confirmed.",
        ],
        resultQuestion: "What happened after using this class-fill pack?",
        resultOptions: [
            { id: "signups_received", label: "Got signups", note: "Owner reported class signups or trial requests." },
            { id: "questions_received", label: "Got questions", note: "Owner got interest but not confirmed signups." },
            { id: "not_used", label: "Not used yet", note: "Owner has not shared the pack yet." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this pack useful." },
        ],
    },
    {
        id: "clinic_appointment_reminder",
        businessTypes: ["clinic"],
        title: "Appointment reminder",
        scenario: "daily_default",
        ownerOutcome: "Prepare a careful appointment or availability reminder without unsupported medical claims.",
        ownerGoal: "remind_customers",
        plainAction: "Remind customers or patients about availability with a safe contact path.",
        whenToUse: "Use for clinics, wellness offices, dental practices, and appointment-led health-adjacent businesses that need conservative copy.",
        requiredInputs: [
            "Service or appointment type",
            "Availability window or booking path",
            "Phone, website, booking link, or WhatsApp",
            "Approved clinic, room, staff, or brand image",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "Appointment reminder text",
            "Google update draft",
            "Clinic notice caption",
            "Reception sharing text",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "Reception notice",
            "Appointment reminder card",
            "Window notice",
            "QR booking card",
            "Counter card",
        ],
        photoTasks: [
            "Use a clinic, room, exterior, team, or brand image approved by the owner.",
            "Do not show patients or private records.",
            "Avoid before/after, diagnosis, treatment result, or health outcome visuals.",
        ],
        guardrails: [
            "Check booking path, availability, and regulated-claim boundaries before use.",
            "Do not make diagnosis, cure, guaranteed outcome, emergency, or medical advice claims.",
            "Keep patient privacy protected.",
        ],
        manualDeliveryTasks: [
            "Copy reminder text into the owner-managed messaging workflow only where appropriate.",
            "Paste the Google update manually after checking service wording and booking path.",
            "Download the reception notice after confirming it has no private or medical-claim issue.",
        ],
        resultQuestion: "What happened after using this appointment reminder?",
        resultOptions: [
            { id: "appointments_received", label: "Got appointments", note: "Owner reported appointment bookings or inquiries." },
            { id: "calls_received", label: "Got calls", note: "Owner reported calls or questions." },
            { id: "not_used", label: "Not used yet", note: "Owner has not shared or printed the pack yet." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this reminder useful." },
        ],
    },
    {
        id: "generic_local_campaign",
        businessTypes: ["other"],
        title: "Local business campaign",
        scenario: "daily_default",
        ownerOutcome: "Prepare one source-backed campaign pack for a clear local business action without starting from a blank canvas.",
        ownerGoal: "prepare_local_pack",
        plainAction: "Promote one current thing with a clear next step.",
        whenToUse: "Use when the business does not fit a specific vertical yet but still has one useful thing to promote.",
        requiredInputs: [
            "Business name",
            "Current offer, service, product, event, or owner note",
            "Phone, website, booking link, WhatsApp, or visit next step",
            "Approved photo, logo, or simple brand image",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp text",
            "Google update draft",
            "Square post caption",
            "Staff sharing text",
            "Downloadable campaign pack",
        ],
        printFormats: [
            "A4 flyer",
            "Window poster",
            "Counter card",
            "QR card",
            "Handout note",
        ],
        photoTasks: [
            "Take one real business, product, service, storefront, or staff photo with permission.",
            "Avoid showing private customer details or unsupported claims.",
            "Use a logo or simple brand image when a current photo is not ready.",
        ],
        guardrails: [
            "Check the current offer, date, contact path, and business name before use.",
            "Do not make guarantees, regulated claims, or fake testimonial claims.",
            "Use only owner-approved photos.",
        ],
        manualDeliveryTasks: [
            "Copy the prepared text into the owner-managed message or posting workflow.",
            "Paste Google or social text manually after checking current facts.",
            "Download the pack and use only the assets the owner has approved.",
        ],
        resultQuestion: "What happened after using this local campaign?",
        resultOptions: [
            { id: "inquiries_received", label: "Got inquiries", note: "Owner reported calls, messages, visits, or questions." },
            { id: "customers_mentioned_it", label: "Customers mentioned it", note: "Customers or staff mentioned seeing the campaign." },
            { id: "not_used", label: "Not used yet", note: "Owner has not shared or printed the pack yet." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this pack useful." },
        ],
    },
    {
        id: "restaurant_slow_lunch_push",
        businessTypes: ["restaurant"],
        title: "Slow lunch push",
        scenario: "slow_period",
        ownerOutcome: "Prepare a lunch-time pack when the owner needs nearby customers to notice one available item or combo.",
        ownerGoal: "bring_people_today",
        plainAction: "Promote one lunch item or combo people can order today.",
        whenToUse: "Use when weekday lunch, takeaway, or dine-in traffic needs a simple same-day push.",
        requiredInputs: [
            "Lunch item or combo name",
            "Current price or offer terms",
            "Menu, phone, WhatsApp, or order link",
            "Approved current food photo",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp lunch text",
            "Google offer/update draft",
            "Instagram square caption",
            "Counter poster text",
            "Staff sharing text",
            "Downloadable lunch pack",
        ],
        printFormats: ["Counter poster", "Table tent", "Takeaway insert", "Coupon slip", "QR order card"],
        photoTasks: [
            "Take one current food photo under bright light before lunch starts.",
            "Keep old prices, old menu boards, and unavailable items out of frame.",
            "Use storefront or counter photo only if the food photo is not ready.",
        ],
        guardrails: [
            "Confirm price, availability, order path, and offer end time.",
            "Do not promote an item that is not available today.",
            "Use only owner-approved food images.",
        ],
        manualDeliveryTasks: [
            "Send the short WhatsApp lunch text through the owner-managed workflow.",
            "Paste the Google update manually after checking price, photo, and link.",
            "Print the counter or table version only after the same-day offer is confirmed.",
        ],
        resultQuestion: "What happened after the lunch push?",
        resultOptions: [
            { id: "lunch_orders", label: "Got lunch orders", note: "Owner reported orders, calls, replies, or walk-ins for lunch." },
            { id: "staff_shared", label: "Staff shared it", note: "Staff used the pack in their own customer workflow." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the lunch pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this lunch pack useful." },
        ],
    },
    {
        id: "salon_weekend_slots",
        businessTypes: ["salon"],
        title: "Weekend slot fill",
        scenario: "slot_fill",
        ownerOutcome: "Fill weekend availability with one service, one booking path, and consent-safe visuals.",
        ownerGoal: "fill_slots",
        plainAction: "Promote weekend slots for one service.",
        whenToUse: "Use when the owner has Friday, Saturday, or Sunday appointment capacity.",
        requiredInputs: [
            "Service name",
            "Weekend date or time window",
            "Booking link, WhatsApp, or phone",
            "Approved salon/service photo",
        ],
        recommendedChannels: ["whatsapp", "creative", "ugc", "calendar"],
        outputFormats: [
            "WhatsApp slot text",
            "Story text",
            "Instagram square caption",
            "Reception poster text",
            "Staff sharing text",
            "Downloadable slot-fill pack",
        ],
        printFormats: ["Reception flyer", "QR booking card", "Service card", "Mirror note", "Window poster"],
        photoTasks: [
            "Take one clean chair, setup, service, or product photo.",
            "Use customer result images only with clear consent.",
            "Avoid before/after or guaranteed result claims.",
        ],
        guardrails: [
            "Confirm slot time, service name, booking path, and capacity.",
            "Do not promise guaranteed beauty or wellness results.",
            "Confirm rights before using any person image.",
        ],
        manualDeliveryTasks: [
            "Copy the weekend slot text into WhatsApp or the owner-managed inbox.",
            "Download the story/post asset and share manually after checking slot time.",
            "Use the reception flyer only while the slots are still open.",
        ],
        resultQuestion: "What happened after the weekend slot pack?",
        resultOptions: [
            { id: "weekend_bookings", label: "Got weekend bookings", note: "Owner reported weekend appointments." },
            { id: "slot_questions", label: "Got slot questions", note: "Owner got replies or questions about availability." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this slot pack useful." },
        ],
    },
    {
        id: "retail_new_arrival",
        businessTypes: ["retail"],
        title: "New arrival push",
        scenario: "new_offer",
        ownerOutcome: "Turn a new product or small collection into a safe sales pack with price and stock checks.",
        ownerGoal: "sell_product",
        plainAction: "Promote one new arrival or in-stock product.",
        whenToUse: "Use when a shop has new stock, a small collection, or a time-sensitive product offer.",
        requiredInputs: [
            "Product or collection name",
            "Price, stock, or offer terms",
            "Store visit, phone, WhatsApp, or catalog link",
            "Approved current product photo",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp product text",
            "Google update draft",
            "Square product caption",
            "Story text",
            "Shelf talker text",
            "Downloadable product pack",
        ],
        printFormats: ["Shelf talker", "Counter card", "Window note", "Coupon slip", "Bag insert"],
        photoTasks: [
            "Take one clear product photo with the current item only.",
            "Avoid showing old price tags or unavailable stock.",
            "Use a simple storefront photo only if the product photo is not ready.",
        ],
        guardrails: [
            "Confirm price, stock, date, and destination before use.",
            "Do not imply stock, discount, or product guarantees that are not true.",
            "Use only owner-approved product images.",
        ],
        manualDeliveryTasks: [
            "Copy the product text into the owner-managed WhatsApp or social workflow.",
            "Paste the Google update manually after checking product, price, and photo.",
            "Use shelf/counter material only while the product is available.",
        ],
        resultQuestion: "What happened after the new-arrival pack?",
        resultOptions: [
            { id: "product_sales", label: "Got product sales", note: "Owner reported product sales or purchase intent." },
            { id: "product_questions", label: "Got product questions", note: "Owner got calls, messages, or walk-in questions." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the product pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find this product pack useful." },
        ],
    },
    {
        id: "local_review_request",
        businessTypes: ["restaurant", "salon", "retail", "local_service", "fitness", "clinic", "other", "multi_location", "agency_client"],
        title: "Customer review request",
        scenario: "review_push",
        ownerOutcome: "Ask recent customers for an honest review using a verified destination and a simple staff handoff.",
        ownerGoal: "collect_reviews",
        plainAction: "Prepare a polite review request for customers who already used the business.",
        whenToUse: "Use after a real customer visit, order, appointment, or completed service when the owner has a verified review destination.",
        requiredInputs: [
            "Verified Google review or feedback destination",
            "Completed customer visit, order, booking, or service",
            "Owner-managed follow-up audience",
            "Staff instruction for when to ask",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp review request",
            "Customer follow-up text",
            "Staff review request script",
            "Counter review card",
            "Google review handoff",
            "Downloadable reputation pack",
        ],
        printFormats: ["Counter review card", "Receipt insert", "QR feedback card", "Front-desk prompt", "Takeaway insert"],
        photoTasks: [
            "Use the business logo or a current storefront image only if a visual is useful.",
            "Do not use a customer photo or testimonial without explicit consent.",
            "Keep the review destination visible and easy to verify.",
        ],
        guardrails: [
            "Ask only real customers for an honest review.",
            "Do not offer rewards for positive reviews or ask staff to fabricate reviews.",
            "Keep sending manual and owner-controlled; CampaignCue does not store customer contact lists.",
        ],
        manualDeliveryTasks: [
            "Copy the review request into the owner-managed customer conversation after a completed service or purchase.",
            "Give staff the short request script and verified review destination.",
            "Use the QR or counter card only after the owner checks the destination.",
        ],
        resultQuestion: "What happened after the review request?",
        resultOptions: [
            { id: "reviews_received", label: "Got reviews", note: "Owner reported one or more genuine customer reviews." },
            { id: "customers_opened_link", label: "Customers opened it", note: "Owner reported interest or link opens without claiming a review." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the reputation pack but has not used it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the review-request pack useful." },
        ],
    },
    {
        id: "return_customer_reminder",
        businessTypes: ["restaurant", "salon", "retail", "local_service", "fitness", "clinic", "other", "multi_location", "agency_client"],
        title: "Return-customer reminder",
        scenario: "retention",
        ownerOutcome: "Prepare a useful reminder for an owner-managed customer audience without importing contacts or inventing an offer.",
        ownerGoal: "bring_back_customers",
        plainAction: "Remind recent or past customers about one current reason to return.",
        whenToUse: "Use when the owner has a legitimate customer relationship and a current service, item, availability window, or update worth sharing.",
        requiredInputs: [
            "Owner-managed customer audience description",
            "Current item, service, availability, or update",
            "Confirmed next step or destination",
            "Offer terms only when an approved offer exists",
        ],
        recommendedChannels: ["whatsapp", "creative", "google_local", "calendar"],
        outputFormats: [
            "WhatsApp return-customer message",
            "SMS or email reminder",
            "Customer reply script",
            "Staff follow-up note",
            "Optional social reminder",
            "Downloadable retention pack",
        ],
        printFormats: ["Receipt insert", "Return-visit card", "Booking reminder card", "Bag insert", "Counter note"],
        photoTasks: [
            "Prefer one current real business, item, service, or storefront image.",
            "Do not include customer names, phone numbers, or private contact lists in the campaign pack.",
            "Use customer photos only with clear consent.",
        ],
        guardrails: [
            "Use only an owner-managed audience with an existing customer relationship.",
            "Do not invent a discount or create a contact database inside CampaignCue.",
            "Keep sending manual and follow the owner's consent and messaging obligations.",
        ],
        manualDeliveryTasks: [
            "Copy the reminder into the owner-managed WhatsApp, SMS, or email workflow.",
            "Send only to customers the owner is allowed to contact.",
            "Record replies, bookings, orders, or opt-out concerns as an owner-reported result.",
        ],
        resultQuestion: "What happened after the return-customer reminder?",
        resultOptions: [
            { id: "customers_returned", label: "Customers returned", note: "Owner reported orders, bookings, visits, or repeat inquiries." },
            { id: "customers_replied", label: "Customers replied", note: "Owner reported genuine replies or questions." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the retention pack but has not used it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the return-customer pack useful." },
        ],
    },
    {
        id: "asset_reuse_old_poster",
        businessTypes: ["restaurant", "salon", "retail", "local_service", "fitness", "clinic", "other", "multi_location", "agency_client"],
        title: "Reuse old poster",
        scenario: "asset_reuse",
        ownerOutcome: "Reuse an existing flat image or old poster while keeping the original safe and changing only verified details.",
        ownerGoal: "prepare_local_pack",
        plainAction: "Reuse an old image or poster safely.",
        whenToUse: "Use when the owner has an old JPG, WhatsApp image, agency file, generated image, or poster that still has useful layout.",
        requiredInputs: [
            "Old image or poster",
            "Verified new date, price, phone, or CTA if changing text",
            "Owner confirmation that the image can be reused",
            "Export format needed today",
        ],
        recommendedChannels: ["creative", "whatsapp", "google_local", "calendar"],
        outputFormats: [
            "Reusable image",
            "Updated WhatsApp image",
            "Updated poster",
            "Google image handoff",
            "Original preserved copy",
            "Downloadable reuse pack",
        ],
        printFormats: ["Updated poster", "Counter sign", "Window note", "QR card", "A4 flyer"],
        photoTasks: [
            "Upload the existing image from the owner device.",
            "Confirm any new date, phone, price, or offer before editing.",
            "Keep unverified original text as image when it cannot be safely checked.",
        ],
        guardrails: [
            "Do not claim perfect source-file recovery.",
            "Keep the original image preserved as backup.",
            "Only edit business facts that are confirmed.",
        ],
        manualDeliveryTasks: [
            "Open CueLayers from Asset Library or Editor.",
            "Review any text that could not be safely verified.",
            "Export PNG manually after owner approval.",
        ],
        resultQuestion: "What happened after reusing the old poster?",
        resultOptions: [
            { id: "reuse_saved_time", label: "Saved time", note: "Owner reused an existing image instead of rebuilding." },
            { id: "reuse_shared", label: "Shared updated poster", note: "Owner used the updated image or poster." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the reuse flow but did not export." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the image reuse useful." },
        ],
    },
    {
        id: "google_local_visibility_refresh",
        businessTypes: ["restaurant", "salon", "retail", "local_service", "fitness", "clinic", "other", "multi_location", "agency_client"],
        title: "Local visibility refresh",
        scenario: "local_visibility",
        ownerOutcome: "Prepare a fresh, fact-safe local update when business facts, locality, hours, or service/menu visibility need attention.",
        ownerGoal: "prepare_local_pack",
        plainAction: "Refresh local visibility with current facts and a fresh update.",
        whenToUse: "Use when Google/local discovery needs a recent update, clear locality, current service/menu detail, or expired-offer cleanup.",
        requiredInputs: [
            "Business locality or branch",
            "Current service, item, offer, or update",
            "Destination link, phone, booking link, or menu/service page",
            "Approved image or logo",
        ],
        recommendedChannels: ["google_local", "creative", "whatsapp", "calendar"],
        outputFormats: [
            "Google update draft",
            "Local FAQ-style answer",
            "Fresh offer/update caption",
            "WhatsApp reminder text",
            "Profile-check task",
            "Downloadable visibility pack",
        ],
        printFormats: ["QR info card", "Counter update", "Window notice", "Service card", "A4 local flyer"],
        photoTasks: [
            "Use a fresh storefront, product, service, room, or logo image.",
            "Avoid stale hours, stale offers, and unavailable services in visible text.",
            "Use only approved images for public profile updates.",
        ],
        guardrails: [
            "Confirm name, address/locality, phone, hours, destination, and offer dates.",
            "Do not publish expired offers or unsupported locality/service claims.",
            "Keep Google updates manual until provider publishing is explicitly enabled.",
        ],
        manualDeliveryTasks: [
            "Open Google Business Profile manually and choose Update, Offer, or Event.",
            "Paste the prepared fields after checking dates, link, and image.",
            "Record whether customers mentioned or found the update later.",
        ],
        resultQuestion: "What happened after the local visibility refresh?",
        resultOptions: [
            { id: "profile_views_or_calls", label: "Got calls or visits", note: "Owner noticed calls, visits, or questions after the update." },
            { id: "fresh_profile_done", label: "Profile refreshed", note: "Owner posted or prepared a fresh local update." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the visibility pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the visibility pack useful." },
        ],
    },
    {
        id: "restaurant_catering_inquiry",
        businessTypes: ["restaurant"],
        title: "Catering inquiry pack",
        scenario: "new_offer",
        ownerOutcome: "Turn one confirmed catering option into a clear inquiry pack without inventing package sizes, prices, or availability.",
        ownerGoal: "book_service",
        plainAction: "Invite catering inquiries for one confirmed package or service.",
        whenToUse: "Use when the restaurant can accept catering, group-order, office-meal, or event-food inquiries.",
        requiredInputs: [
            "Current catering package, menu, or service",
            "Price range, minimum order, date, or availability terms",
            "Phone, WhatsApp, menu, or inquiry destination",
            "Approved food, packaging, team, or event photo",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp catering inquiry text",
            "Google catering update draft",
            "Instagram square caption",
            "Catering flyer text",
            "Staff inquiry reply script",
            "Downloadable catering pack",
        ],
        printFormats: ["Catering flyer", "Counter inquiry card", "Office menu insert", "QR inquiry card", "Takeaway insert"],
        photoTasks: [
            "Take one current group-order, packaging, spread, or signature-item photo.",
            "Avoid showing an event, customer, or venue without permission.",
            "Keep unavailable menu items and old prices out of frame.",
        ],
        guardrails: [
            "Confirm package scope, price or minimum order, service area, date, and inquiry destination.",
            "Do not promise capacity, delivery coverage, or event availability that is not confirmed.",
            "Use only owner-approved images and claims.",
        ],
        manualDeliveryTasks: [
            "Copy the inquiry text into the owner-managed WhatsApp or email workflow.",
            "Paste the Google update manually after checking package and destination details.",
            "Give staff the reply script only while the catering option is available.",
        ],
        resultQuestion: "What happened after the catering inquiry pack?",
        resultOptions: [
            { id: "catering_inquiries", label: "Got catering inquiries", note: "Owner reported qualified catering or group-order questions." },
            { id: "catering_booking", label: "Got a catering booking", note: "Owner reported a confirmed catering or group-order booking." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the catering pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the catering pack useful." },
        ],
    },
    {
        id: "salon_membership_reminder",
        businessTypes: ["salon"],
        title: "Membership reminder",
        scenario: "retention",
        ownerOutcome: "Prepare a renewal or return-visit reminder for an owner-managed customer group without importing contacts or inventing benefits.",
        ownerGoal: "bring_back_customers",
        plainAction: "Remind eligible customers about one confirmed membership or return-visit option.",
        whenToUse: "Use when an existing membership, package, or repeat-service option is current and the owner may contact the audience.",
        requiredInputs: [
            "Owner-managed eligible customer audience",
            "Current membership, package, or repeat-service detail",
            "Price, expiry, benefits, or booking terms",
            "Booking link, phone, or WhatsApp destination",
        ],
        recommendedChannels: ["whatsapp", "creative", "calendar"],
        outputFormats: [
            "WhatsApp membership reminder",
            "SMS or email reminder",
            "Customer reply script",
            "Reception reminder card",
            "Staff follow-up note",
            "Downloadable retention pack",
        ],
        printFormats: ["Reception card", "Membership reminder card", "Mirror note", "QR booking card", "Service receipt insert"],
        photoTasks: [
            "Use an approved salon, service-area, product, or brand image.",
            "Use customer or result photos only with explicit consent.",
            "Avoid transformation or guaranteed-result visuals.",
        ],
        guardrails: [
            "Confirm eligibility, benefits, price, expiry, and booking path.",
            "Do not import or store customer contact lists in CampaignCue.",
            "Do not promise beauty, wellness, or treatment outcomes.",
        ],
        manualDeliveryTasks: [
            "Copy the reminder into the owner's existing consented customer workflow.",
            "Give staff the follow-up note without customer personal data.",
            "Stop using the pack when membership terms or eligibility change.",
        ],
        resultQuestion: "What happened after the membership reminder?",
        resultOptions: [
            { id: "members_renewed", label: "Got renewals", note: "Owner reported membership or package renewals." },
            { id: "members_replied", label: "Got customer replies", note: "Owner reported questions or return-visit interest." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the reminder but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the reminder useful." },
        ],
    },
    {
        id: "retail_back_in_stock",
        businessTypes: ["retail"],
        title: "Back-in-stock update",
        scenario: "new_offer",
        ownerOutcome: "Prepare a current stock update for one product without implying inventory, price, or urgency that the owner did not confirm.",
        ownerGoal: "sell_product",
        plainAction: "Tell customers one confirmed product is available again.",
        whenToUse: "Use when a requested or useful product has returned and its current stock and purchase path are known.",
        requiredInputs: [
            "Product name and current stock confirmation",
            "Current price or offer terms",
            "Store visit, phone, WhatsApp, website, or catalog destination",
            "Approved current product photo",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp stock update",
            "Google product update draft",
            "Instagram square caption",
            "Story text",
            "Shelf or counter note",
            "Downloadable stock pack",
        ],
        printFormats: ["Shelf talker", "Counter card", "Window note", "QR product card", "Bag insert"],
        photoTasks: [
            "Take one current photo of the exact in-stock product.",
            "Avoid old price tags, unavailable variants, or unrelated stock.",
            "Use packaging claims only when visible and current.",
        ],
        guardrails: [
            "Confirm product, price, stock, variants, and destination immediately before use.",
            "Do not create false scarcity or guaranteed availability language.",
            "Stop using the pack when stock changes.",
        ],
        manualDeliveryTasks: [
            "Copy the stock update into the owner-managed customer workflow.",
            "Paste the Google update manually after checking current inventory.",
            "Remove print material when the item becomes unavailable.",
        ],
        resultQuestion: "What happened after the back-in-stock update?",
        resultOptions: [
            { id: "stock_sales", label: "Got product sales", note: "Owner reported sales of the returned product." },
            { id: "stock_questions", label: "Got stock questions", note: "Owner reported calls, messages, or walk-in questions." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the stock pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the stock pack useful." },
        ],
    },
    {
        id: "local_service_seasonal_maintenance",
        businessTypes: ["local_service"],
        title: "Seasonal maintenance reminder",
        scenario: "new_offer",
        ownerOutcome: "Turn one real seasonal service need into a local reminder without inventing urgency, risk, or guaranteed outcomes.",
        ownerGoal: "book_service",
        plainAction: "Remind nearby customers about one timely maintenance service.",
        whenToUse: "Use only when the owner confirms a seasonal or local maintenance need, service area, and current availability.",
        requiredInputs: [
            "Current maintenance service",
            "Owner-confirmed seasonal or local reason",
            "Service area, price range, date, or availability",
            "Phone, WhatsApp, website, or booking destination",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "WhatsApp maintenance reminder",
            "Google service update draft",
            "Local service post",
            "Customer reply script",
            "Service checklist",
            "Downloadable maintenance pack",
        ],
        printFormats: ["Service checklist", "A4 local flyer", "Door hanger", "Invoice insert", "Referral card"],
        photoTasks: [
            "Take one approved photo of the real equipment, vehicle, tool, or completed setup.",
            "Avoid customer property details, addresses, license plates, or people without permission.",
            "Use before/after photos only with consent and no guaranteed-outcome claim.",
        ],
        guardrails: [
            "Confirm the seasonal reason, service area, availability, and contact path.",
            "Do not create emergency, safety, legal, or guaranteed repair claims.",
            "Use only owner-approved job images.",
        ],
        manualDeliveryTasks: [
            "Copy the reminder into the owner-managed customer workflow.",
            "Paste the Google update manually after checking locality and availability.",
            "Use the checklist or flyer only during the confirmed service window.",
        ],
        resultQuestion: "What happened after the maintenance reminder?",
        resultOptions: [
            { id: "maintenance_requests", label: "Got service requests", note: "Owner reported calls, messages, or bookings." },
            { id: "maintenance_questions", label: "Got customer questions", note: "Owner reported useful questions without a confirmed booking." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the maintenance pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the maintenance pack useful." },
        ],
    },
    {
        id: "fitness_trial_session",
        businessTypes: ["fitness"],
        title: "Trial session pack",
        scenario: "slot_fill",
        ownerOutcome: "Fill one confirmed trial, intro class, or consultation window without promising health, weight, or body outcomes.",
        ownerGoal: "fill_slots",
        plainAction: "Invite customers to one confirmed trial or intro session.",
        whenToUse: "Use when a gym, studio, trainer, or class business has a real dated trial or introduction session.",
        requiredInputs: [
            "Trial or intro session name",
            "Date, time, capacity, price, or eligibility terms",
            "Booking link, phone, website, or WhatsApp",
            "Approved studio, equipment, trainer, or class photo",
        ],
        recommendedChannels: ["whatsapp", "creative", "video", "calendar"],
        outputFormats: [
            "WhatsApp trial invite",
            "Instagram square caption",
            "Story or reel brief",
            "Reception signup card",
            "Staff reply script",
            "Downloadable trial pack",
        ],
        printFormats: ["Reception signup card", "Window poster", "QR booking card", "Class handout", "Referral card"],
        photoTasks: [
            "Take one real studio, equipment, trainer, or class-setup photo.",
            "Confirm consent for every identifiable person.",
            "Avoid transformation, weight-loss, or guaranteed-result imagery.",
        ],
        guardrails: [
            "Confirm session date, time, capacity, eligibility, price, and booking path.",
            "Do not promise medical, health, weight, fitness, or body outcomes.",
            "Use member or participant images only with consent.",
        ],
        manualDeliveryTasks: [
            "Copy the invite into the owner-managed customer workflow.",
            "Download the story or post after checking capacity and time.",
            "Remove signup material when capacity is full or the session passes.",
        ],
        resultQuestion: "What happened after the trial-session pack?",
        resultOptions: [
            { id: "trial_signups", label: "Got trial signups", note: "Owner reported confirmed trial or intro-session signups." },
            { id: "trial_questions", label: "Got trial questions", note: "Owner reported questions or interest." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the trial pack but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the trial pack useful." },
        ],
    },
    {
        id: "clinic_service_availability",
        businessTypes: ["clinic"],
        title: "Service availability notice",
        scenario: "slot_fill",
        ownerOutcome: "Prepare a conservative availability notice for one approved service without diagnosis, urgency, or treatment-result claims.",
        ownerGoal: "fill_slots",
        plainAction: "Share one confirmed service or appointment availability window.",
        whenToUse: "Use when the clinic has an approved service description and a current appointment window for routine manual handoff.",
        requiredInputs: [
            "Approved service or appointment description",
            "Date, time, capacity, or availability window",
            "Phone, website, booking link, or WhatsApp",
            "Approved clinic, room, staff, or brand image",
        ],
        recommendedChannels: ["whatsapp", "google_local", "creative", "calendar"],
        outputFormats: [
            "Appointment availability text",
            "Google service update draft",
            "Clinic notice caption",
            "Reception notice",
            "Staff response script",
            "Downloadable availability pack",
        ],
        printFormats: ["Reception notice", "Appointment card", "QR booking card", "Window notice", "Service information card"],
        photoTasks: [
            "Use an owner-approved clinic, room, exterior, team, or brand image.",
            "Do not show patients, files, screens, labels, or private records.",
            "Avoid before/after and treatment-result visuals.",
        ],
        guardrails: [
            "Confirm the approved service wording, availability, booking path, and applicable review requirements.",
            "Do not provide diagnosis, emergency guidance, medical advice, cure claims, or guaranteed outcomes.",
            "Protect patient privacy and keep sending owner-controlled.",
        ],
        manualDeliveryTasks: [
            "Copy the notice only into an appropriate owner-managed workflow.",
            "Paste the Google update manually after checking service wording and availability.",
            "Remove the notice when the availability window ends.",
        ],
        resultQuestion: "What happened after the service availability notice?",
        resultOptions: [
            { id: "service_appointments", label: "Got appointments", note: "Owner reported appointment bookings or appropriate inquiries." },
            { id: "service_calls", label: "Got calls or questions", note: "Owner reported calls or service questions." },
            { id: "not_used", label: "Not used yet", note: "Owner prepared the notice but did not use it." },
            { id: "not_useful", label: "Not useful", note: "Owner did not find the notice useful." },
        ],
    },
];

export const CAMPAIGNCUE_DAILY_DESK_DEFAULT_RECIPE_ID = "restaurant_today_item_push";

export const CAMPAIGNCUE_DAILY_DESK_MAX_MISSING_INPUTS = 5;
export const CAMPAIGNCUE_DAILY_DESK_MAX_OUTPUT_FORMATS = 6;
export const CAMPAIGNCUE_DAILY_DESK_MAX_PRINT_FORMATS = 5;
export const CAMPAIGNCUE_DAILY_DESK_MAX_PHOTO_TASKS = 3;
export const CAMPAIGNCUE_DAILY_DESK_MAX_MANUAL_DELIVERY_TASKS = 4;
export const CAMPAIGNCUE_DAILY_DESK_MAX_ASSET_REUSE_TASKS = 2;
export const CAMPAIGNCUE_DAILY_DESK_MAX_RESULT_OPTIONS = 4;

export const CAMPAIGNCUE_DAILY_DESK_COPY = {
    title: "Daily campaign desk",
    eyebrow: "Today",
    noProviderPosting: "Download the pack and post it manually. CampaignCue does not connect social accounts.",
    todayCueTitle: "Today's cue",
    missingInputTitle: "Small details to confirm",
    readyPackTitle: "Ready campaign pack",
    manualDeliveryTitle: "Use it manually",
    assetReuseTitle: "Reuse an existing image",
    printPackTitle: "Print and in-store uses",
    photoTaskTitle: "Photo task",
    resultMemoryTitle: "Result memory",
} as const;
