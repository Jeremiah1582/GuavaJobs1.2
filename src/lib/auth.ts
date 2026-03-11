// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      ...schema,
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),

  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    // ✅ Removed invalid signUpFields — not a valid Better Auth option
  },

  plugins: [
    emailOTP({
      // ✅ Correct: imported plugin function, not a raw object
      async sendVerificationOTP({ email, otp, type }) {
        let subject = "InternHunt Login Code";
        let greeting = "Hello!";

        if (type === "email-verification") {
          subject = "Verify Your InternHunt Email";
          greeting = "Welcome to InternHunt!";
        } else if (type === "forget-password") {
          subject = "InternHunt Password Reset Code";
          greeting = "Password reset requested";
        }

        const { error } = await resend.emails.send({
          from: "InternHunt <onboarding@resend.dev>",
          to: email,
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2>${subject}</h2>
              <p>${greeting}</p>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 40px 0;">
                ${otp}
              </p>
              <p style="text-align: center; color: #666;">
                This code expires in 10 minutes.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                InternHunt – Helping you find great internships
              </p>
            </div>
          `,
        });

        if (error) {
          console.error("Resend error:", error);
          throw new Error("Failed to send OTP email");
        }

        console.log(`[Resend OTP] → ${email} | Code: ${otp} | Type: ${type}`);
      },
    }),
  ],

  emailVerification: {
    autoSignInAfterVerification: true,
  },

  session: {
    // ✅ Removed invalid strategy & cookie block — use expiresIn instead
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh if older than 1 day
  },

  advanced: {
    trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    // ✅ Cookie options belong here, not in session
    cookiePrefix: "internhunt",
    cookies: {
      session_token: {
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        },
      },
    },
  },
});