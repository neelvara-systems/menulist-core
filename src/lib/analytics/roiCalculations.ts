/**
 * ROI Calculation Logic for Chat Admin Panel
 * 
 * Calculates business value metrics from chat analytics data
 * Used by: ROI Calculator component
 * 
 * @module roiCalculations
 */

export interface ChatAnalyticsData {
    totalConversations: number;
    resolvedConversations: number;
    averageResolutionTime: number; // in minutes
    positiveFeedback: number;
    negativeFeedback: number;
    dateRange: {
        start: Date;
        end: Date;
    };
}

export interface ROIMetrics {
    // Time Savings
    totalHoursSaved: number;
    monthlyHoursSaved: number;
    
    // Cost Savings
    totalCostSaved: number;
    monthlyCostSaved: number;
    
    // Automation Metrics
    conversationsHandled: number;
    automationRate: number; // percentage
    
    // Revenue Protection
    satisfiedCustomers: number;
    estimatedRevenueProtected: number;
    churnReductionRate: number;
    
    // ROI Metrics
    platformCost: number;
    netSavings: number;
    roi: number; // percentage
    paybackPeriod: number; // months
}

export interface ROICalculationParams {
    // Required: From analytics
    analyticsData: ChatAnalyticsData;
    
    // User-configurable parameters
    avgSupportAgentHourlyCost?: number; // Default: $25/hr USD
    avgCustomerLifetimeValue?: number; // Default: $500
    platformMonthlyCost?: number; // Default: $99 (Pro plan)
    
    // Assumptions
    avgHumanResponseTime?: number; // minutes per conversation, Default: 15
    churnRateWithoutAI?: number; // percentage, Default: 20%
    churnRateWithAI?: number; // percentage, Default: 15%
}

/**
 * Calculate comprehensive ROI metrics from chat analytics
 */
export function calculateROI(params: ROICalculationParams): ROIMetrics {
    const {
        analyticsData,
        avgSupportAgentHourlyCost = 25, // $25/hr
        avgCustomerLifetimeValue = 500, // $500 LTV
        platformMonthlyCost = 99, // $99/month Pro plan
        avgHumanResponseTime = 15, // 15 min per chat
        churnRateWithoutAI = 0.20, // 20% churn
        churnRateWithAI = 0.15, // 15% churn (5% improvement)
    } = params;

    const { totalConversations, resolvedConversations, averageResolutionTime, positiveFeedback, negativeFeedback } = analyticsData;

    // Calculate date range in days
    const dateRangeDays = Math.ceil(
        (analyticsData.dateRange.end.getTime() - analyticsData.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const monthsInRange = dateRangeDays / 30;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. TIME SAVINGS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // AI average response time (from analytics)
    const aiAverageTimePerConversation = averageResolutionTime; // already in minutes
    
    // Human average response time (assumption)
    const humanAverageTimePerConversation = avgHumanResponseTime;
    
    // Time saved per conversation
    const timeSavedPerConversation = Math.max(0, humanAverageTimePerConversation - aiAverageTimePerConversation);
    
    // Total time saved (in hours)
    const totalMinutesSaved = totalConversations * timeSavedPerConversation;
    const totalHoursSaved = totalMinutesSaved / 60;
    
    // Monthly time saved
    const monthlyHoursSaved = monthsInRange > 0 ? totalHoursSaved / monthsInRange : 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. COST SAVINGS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Cost saved = Hours saved × Hourly rate
    const totalCostSaved = totalHoursSaved * avgSupportAgentHourlyCost;
    const monthlyCostSaved = monthlyHoursSaved * avgSupportAgentHourlyCost;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. AUTOMATION METRICS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const conversationsHandled = totalConversations;
    const automationRate = resolvedConversations > 0 ? (resolvedConversations / totalConversations) * 100 : 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. REVENUE PROTECTION (Churn Reduction)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Satisfied customers (positive feedback)
    const satisfiedCustomers = positiveFeedback;
    
    // Churn reduction: AI reduces churn by 5% (configurable)
    const churnReductionRate = ((churnRateWithoutAI - churnRateWithAI) / churnRateWithoutAI) * 100;
    
    // Estimate customers retained due to better support
    // Assumption: Positive feedback correlates with retention
    const customersRetained = satisfiedCustomers * (churnRateWithoutAI - churnRateWithAI);
    
    // Estimated revenue protected
    const estimatedRevenueProtected = customersRetained * avgCustomerLifetimeValue;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. ROI CALCULATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    // Total value generated
    const totalValueGenerated = totalCostSaved + estimatedRevenueProtected;
    
    // Platform cost over the period
    const totalPlatformCost = platformMonthlyCost * monthsInRange;
    
    // Net savings
    const netSavings = totalValueGenerated - totalPlatformCost;
    
    // ROI percentage
    const roi = totalPlatformCost > 0 ? (netSavings / totalPlatformCost) * 100 : 0;
    
    // Payback period (months)
    const monthlyNetSavings = monthlyCostSaved + (estimatedRevenueProtected / monthsInRange) - platformMonthlyCost;
    const paybackPeriod = monthlyNetSavings > 0 ? platformMonthlyCost / monthlyNetSavings : Infinity;

    return {
        // Time Savings
        totalHoursSaved: Math.round(totalHoursSaved),
        monthlyHoursSaved: Math.round(monthlyHoursSaved),
        
        // Cost Savings
        totalCostSaved: Math.round(totalCostSaved),
        monthlyCostSaved: Math.round(monthlyCostSaved),
        
        // Automation Metrics
        conversationsHandled,
        automationRate: Math.round(automationRate * 10) / 10, // 1 decimal place
        
        // Revenue Protection
        satisfiedCustomers,
        estimatedRevenueProtected: Math.round(estimatedRevenueProtected),
        churnReductionRate: Math.round(churnReductionRate * 10) / 10,
        
        // ROI Metrics
        platformCost: Math.round(totalPlatformCost),
        netSavings: Math.round(netSavings),
        roi: Math.round(roi * 10) / 10,
        paybackPeriod: paybackPeriod === Infinity ? Infinity : Math.round(paybackPeriod * 10) / 10,
    };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: 'USD' | 'INR' = 'USD'): string {
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${Math.round(amount).toLocaleString()}`;
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
    if (hours < 1) {
        return `${Math.round(hours * 60)} min`;
    }
    return `${Math.round(hours)} hrs`;
}

/**
 * Format payback period for display
 */
export function formatPaybackPeriod(months: number): string {
    if (months === Infinity) {
        return 'N/A';
    }
    if (months < 1) {
        return '<1 month';
    }
    if (months === 1) {
        return '1 month';
    }
    return `${Math.round(months)} months`;
}

/**
 * Get default calculation parameters
 * Can be overridden by user preferences
 */
export function getDefaultROIParams(analyticsData: ChatAnalyticsData): ROICalculationParams {
    return {
        analyticsData,
        avgSupportAgentHourlyCost: 25, // $25/hr
        avgCustomerLifetimeValue: 500, // $500
        platformMonthlyCost: 99, // $99/month
        avgHumanResponseTime: 15, // 15 minutes
        churnRateWithoutAI: 0.20, // 20%
        churnRateWithAI: 0.15, // 15%
    };
}
