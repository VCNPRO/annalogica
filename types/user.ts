/**
 * User types for Annalogica
 */

export type UserRole = 'user' | 'admin';

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'free' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  monthly_quota: number;
  monthly_usage: number;
  quota_reset_date: string | null;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_cancel_at_period_end?: boolean;
  subscription_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  exp?: number;
}

export interface SubscriptionData {
  plan: SubscriptionPlan;
  filesUsed: number;
  filesTotal: number;
  resetDate: Date | null;
  daysUntilReset: number;
}
