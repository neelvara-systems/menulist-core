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
    | "local_visibility";

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
    | "local_visibility";

export type CampaignCueDailyDeskOwnerGoal =
    | "bring_people_today"
    | "fill_slots"
    | "sell_product"
    | "book_service"
    | "remind_customers"
    | "prepare_local_pack";

export interface CampaignCueDailyDeskResultSignal {
    id: string;
    label: string;
    note: string;
}

export interface CampaignCueDailyDeskRecipe {
    id: string;
    businessTypes: CampaignCueBusinessType[];
    title: string;
    scenario: "daily_default" | "slow_period" | "slot_fill" | "new_offer" | "review_push" | "asset_reuse" | "local_visibility";
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
            "Layered image reuse",
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
