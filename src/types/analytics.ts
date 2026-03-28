export interface GA4PageView {
    page_title: string;
    page_path: string;
    send_page_view: boolean;
}

export interface GA4Event {
    // Common parameters
    value?: number;
    currency?: string;
    items?: GA4Item[];
    
    // E-commerce parameters
    transaction_id?: string;
    
    // Menu specific parameters
    menu_id?: string;
    menu_name?: string;
    content_type?: string;
    
    // Location parameters
    city?: string;
    region?: string;
    country?: string;
    
    // Timestamp
    timestamp?: string;
}

export interface GA4Item {
    item_id: string;
    item_name: string;
    price: number;
    quantity?: number;
    item_category?: string;
}
