export const brandName = "DataFog";
export const landingPageTitle = "DataFog";
export const landingPageDescription = "Protect sensitive data in your forms with real-time scanning, inline alerts, and one-click redaction.";

/* 
Only if you are using Supabase for authentication
configure your website URL on Supabase https://docs.shipped.club/features/supabase#supabase-get-started
*/
export const websiteUrl = process.env.WEBSITE_URL || "https://datafog.vercel.app";

export const supportEmail = "support@email.com";
export const openGraphImageUrl = "https://myapp.com/images/og-image.jpg";
export const blogOpenGraphImageUrl = "https://myapp.com/images/og-image.jpg";

// the users will be redirected to this page after sign in
export const signInCallbackUrl = "/dashboard";

// only needed if you have the "talk to us" button in the landing page
export const demoCalendlyLink = "https://calendly.com/datafog/15-min-zoom-call";

// used by MailChimp, Loops, and MailPace
export const emailFrom = "no-reply@email.com";

// social links
export const discordLink = "https://discord.com/invite/bzDth394R4";
export const twitterLink = "https://x.com/_sidmohan";
export const youTubeLink = "https://youtube.com/@DataFog";

export const affiliateProgramLink =
  "https://yourstore.lemonsqueezy.com/affiliates";

export const twitterHandle = "@datafoginc";
export const twitterMakerHandle = "@_sidmohan";

export const cannyUrl = "https://datafog.canny.io/feedback";

type PaymentProvider = "lemon-squeezy" | "stripe";
export const paymentProvider: PaymentProvider = "stripe";

/* 
  do not edit this
*/
export { pricingPlans } from "./pricing.constants";
export { lifetimeDeals } from "./lifetime.constants";
