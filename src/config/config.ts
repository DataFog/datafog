export const brandName = "My App";
export const landingPageTitle = "My App";
export const landingPageDescription = "Make money today with My App";

/* 
Only if you are using Supabase for authentication
configure your website URL on Supabase https://docs.shipped.club/features/supabase#supabase-get-started
*/
export const websiteUrl = process.env.WEBSITE_URL || "";

export const supportEmail = "support@email.com";
export const openGraphImageUrl = "https://myapp.com/images/og-image.jpg";
export const blogOpenGraphImageUrl = "https://myapp.com/images/og-image.jpg";

// the users will be redirected to this page after sign in
export const signInCallbackUrl = "/dashboard";

// only needed if you have the "talk to us" button in the landing page
export const demoCalendlyLink = "https://calendly.com/myself/15min";

// used by MailChimp, Loops, and MailPace
export const emailFrom = "no-reply@email.com";

// social links
export const discordLink = "https://discordlink";
export const twitterLink = "https://x.com/johndoe";
export const youTubeLink = "https://youtube.com/johndoe";

export const affiliateProgramLink =
  "https://yourstore.lemonsqueezy.com/affiliates";

export const twitterHandle = "@myapp";
export const twitterMakerHandle = "@johndoe";

export const cannyUrl = "https://yourstore.canny.io";

type PaymentProvider = "lemon-squeezy" | "stripe";
export const paymentProvider: PaymentProvider = "lemon-squeezy";

/* 
  do not edit this
*/
export { pricingPlans } from "./pricing.constants";
export { lifetimeDeals } from "./lifetime.constants";
