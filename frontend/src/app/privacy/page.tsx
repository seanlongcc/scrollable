import type { Metadata } from "next";

import { LegalPage } from "@/app/legal-page";
import { createPageMetadata } from "@/lib/seo";

const contactEmail = "contact@scrollable.app";
const dsarUrl =
  "https://app.termly.io/dsar/b755aac4-938b-4a6e-bf69-26b6c1b541a7";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Privacy Policy",
    description:
      "How Scrollable handles account data, saved configuration metadata, local files, and runtime-only third-party media.",
    path: "/privacy",
  }),
};

const updatedAt = "May 3, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt={updatedAt}
      intro={[
        'This Privacy Notice for Scrollable ("we," "us," or "our") explains how and why we access, collect, store, use, and share personal information when you use Scrollable, including when you visit https://scrollable.app or any Scrollable page that links to this notice.',
        `Questions or concerns? Reading this notice will help you understand your privacy rights and choices. If you do not agree with this notice, please do not use Scrollable. For questions, privacy requests, or abuse reports, contact ${contactEmail}.`,
      ]}
      sections={[
        {
          title: "Summary Of Key Points",
          paragraphs: [
            "Scrollable is built around runtime-only third-party media handling. Scrollable stores user-authored configuration metadata and account records, not third-party media payloads.",
            "Scrollable does not sell personal information, does not share personal information for targeted advertising, does not use advertising trackers, and does not use Reddit content to train AI models.",
            `Scrollable may process account information, saved configuration metadata, local browser data, and operational logs depending on how you use the service. You can request access, correction, deletion, or other privacy actions by contacting ${contactEmail} or by submitting a data subject access request at ${dsarUrl}.`,
          ],
        },
        {
          title: "1. What Information Do We Collect?",
          subsections: [
            {
              title: "Personal Information You Provide",
              paragraphs: [
                "We collect personal information that you voluntarily provide when you register, use Scrollable features, save configuration metadata, share links, or contact us. This may include:",
              ],
              bullets: [
                "account information, such as email address, username, authentication identifiers, and password credentials handled by our authentication providers;",
                "optional profile information, such as display name;",
                "feed configuration names and user-pasted source URLs, including Reddit post permalinks and subreddit listing URLs;",
                "collection names, descriptions, tags, NSFW flags, share settings, ownership, and timestamps;",
                "viewer workspace/session metadata, including tab names, layout mode, grid dimensions, timer settings, slots, layers, and source configuration metadata;",
                "free-layout template metadata, including empty box rectangles, layers, active layer, and timer settings;",
                `support, privacy, or abuse-report messages sent to ${contactEmail}.`,
              ],
              footerParagraphs: [
                "All personal information you provide should be true, complete, and accurate.",
              ],
            },
            {
              title: "Sensitive Information",
              paragraphs: [
                "We do not ask you to provide sensitive personal information. Some saved metadata, such as tags, NSFW flags, source names, or user-pasted URLs, may reveal preferences or interests if you choose to provide them. Do not save or share metadata you do not want others to see.",
              ],
            },
            {
              title: "Social Login Data",
              paragraphs: [
                "Scrollable may let you register or sign in with Google. If you use Google sign-in, we may receive profile information from Google, such as your name, email address, profile image, and authentication identifiers, depending on your Google settings and the permissions shown during sign-in.",
                "Our use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements: https://developers.google.com/terms/api-services-user-data-policy.",
              ],
            },
            {
              title: "Information Automatically Collected",
              paragraphs: [
                "Scrollable and its providers may automatically process technical data needed to run, secure, and improve the service. This may include:",
              ],
              bullets: [
                "IP address, user agent, browser type, device characteristics, operating system, language preferences, referring URLs, and request metadata;",
                "log and usage data, such as date/time stamps, pages or features used, diagnostics, error reports, and performance data;",
                "imprecise location inferred from IP address or provider logs;",
                "authentication session data, security records, rate-limit records, and abuse-prevention records.",
              ],
              footerParagraphs: [
                "Scrollable does not ask for GPS location access.",
              ],
            },
          ],
        },
        {
          title: "2. Reddit And Third-Party Media Data",
          paragraphs: [
            "Scrollable may fetch public Reddit post or listing data at runtime when you provide a Reddit URL or source configuration. Scrollable may also resolve other supported user-provided URLs at runtime.",
            "Scrollable does not intentionally persist:",
          ],
          bullets: [
            "third-party media files;",
            "third-party media URLs or thumbnails;",
            "Reddit post/listing payloads;",
            "cached Reddit JSON responses;",
            "raw Reddit item or post IDs;",
            "raw provider HTML or JSON;",
            "raw yt-dlp output;",
            "normalized runtime feed or media items;",
            "third-party cookies or runtime request headers.",
          ],
          footerParagraphs: [
            "User-hidden Reddit listing or post media items may be saved only as opaque sha256: hashes of runtime Reddit item IDs scoped to the source configuration. These hashes are used to remember that you hid an item without storing the raw Reddit ID or media details.",
          ],
        },
        {
          title: "3. Local Browser Data",
          paragraphs: [
            "Scrollable may store data in your browser, including localStorage, sessionStorage, and IndexedDB.",
            "If you select local image, video, or audio files, Scrollable may use temporary browser object URLs during the current session. If you save a local layout, Scrollable may store copies of those user-selected local file bytes in your own browser's IndexedDB so the layout can be restored on that device.",
            "Local browser data stays on your device unless a feature clearly says otherwise. Scrollable does not store absolute local filesystem paths. Scrollable cannot remotely delete browser-only data, but you can clear it through your browser settings.",
          ],
        },
        {
          title: "4. How Do We Process Your Information?",
          paragraphs: ["We process information to:"],
          bullets: [
            "provide the viewer, multi-view layouts, saved configurations, collections, templates, and shared links;",
            "create, authenticate, and manage accounts;",
            "fetch user-directed runtime sources;",
            "remember user preferences and local layouts;",
            "enforce quotas, rate limits, access controls, and security rules;",
            "diagnose errors and improve reliability;",
            "respond to support, privacy, or abuse requests;",
            "comply with law and third-party platform rules;",
            "protect the rights, safety, and integrity of Scrollable, users, and others.",
          ],
        },
        {
          title: "5. What Legal Bases Do We Rely On?",
          paragraphs: [
            "If you are located in the European Economic Area, United Kingdom, Switzerland, Canada, or another jurisdiction that requires a legal basis for processing, we rely on the legal bases that apply to the specific activity, including:",
          ],
          bullets: [
            "performance of a contract when processing is needed to provide Scrollable and account features;",
            "consent when you choose optional features or where law requires consent;",
            "legitimate interests, such as security, fraud prevention, service reliability, and product improvement;",
            "legal obligations when we must comply with applicable law, legal process, or regulatory requests;",
            "vital interests where processing is necessary to protect someone's safety.",
          ],
          footerParagraphs: [
            "You may withdraw consent where we rely on consent. Withdrawing consent does not affect processing that happened before withdrawal or processing based on another lawful basis.",
          ],
        },
        {
          title: "6. When And With Whom Do We Share Personal Information?",
          paragraphs: [
            "We may share or process information with service providers that help operate Scrollable, including:",
          ],
          bullets: [
            "Supabase for authentication and cloud database services;",
            "Google for optional Google sign-in;",
            "Reddit for user-directed public content/API access;",
            "Vercel for hosting, deployment, logs, and performance tools;",
            `ImprovMX for forwarding contact email sent to ${contactEmail};`,
            "other third-party sites or media providers only when you choose or paste source URLs that require runtime access.",
          ],
          footerParagraphs: [
            "We may also share information in connection with a merger, financing, acquisition, bankruptcy, or sale of all or part of the service; if required by law, subpoena, court order, or legal process; to protect rights, safety, and security; to prevent abuse; or to enforce our legal terms.",
            "Shared links may make saved configuration metadata visible to anyone with the link, subject to Scrollable's access controls. Do not create shared links for metadata you do not want others to see.",
          ],
        },
        {
          title: "7. How Long Do We Keep Your Information?",
          paragraphs: [
            "We keep cloud-saved account data and configuration metadata for as long as needed to provide Scrollable, comply with legal obligations, resolve disputes, enforce agreements, maintain security, or until deleted.",
            `You may request deletion of your Scrollable account and cloud-saved data by contacting ${contactEmail} or by submitting a data subject access request at ${dsarUrl}.`,
            "When we have no ongoing legitimate need to process personal information, we will delete or anonymize it where reasonably possible. Backup copies may remain for a limited period until deletion is possible.",
          ],
        },
        {
          title: "8. How Do We Keep Your Information Safe?",
          paragraphs: [
            "Scrollable uses reasonable technical and organizational measures designed to protect cloud-saved data. However, no internet service or storage technology can be guaranteed to be 100% secure. You are responsible for keeping your account credentials, browser, and devices secure.",
          ],
        },
        {
          title: "9. Do We Collect Information From Minors?",
          paragraphs: [
            "Scrollable is not intended for users under 13, and we do not knowingly collect personal information from children under 13.",
            "Users must be at least 18 years old, or the age of majority in their jurisdiction, to use Scrollable to view, configure, save, or share sources marked or reasonably likely to contain adult or NSFW content.",
            `If you believe we collected personal information from a child under 13, contact ${contactEmail} and we will take reasonable steps to delete it.`,
          ],
        },
        {
          title: "10. What Are Your Privacy Rights?",
          paragraphs: ["Depending on where you live, you may have rights to:"],
          bullets: [
            "know whether we process your personal information;",
            "access personal information we maintain about you;",
            "correct inaccurate personal information;",
            "request deletion of personal information;",
            "receive a copy of personal information you provided;",
            "withdraw consent where processing is based on consent;",
            "object to or restrict certain processing;",
            "appeal a privacy-rights decision where applicable;",
            "avoid discrimination for exercising privacy rights.",
          ],
          footerParagraphs: [
            `You may exercise these rights by contacting ${contactEmail} or by submitting a data subject access request at ${dsarUrl}.`,
            "We may need to verify your identity before responding. Authorized agents may be required to provide proof of authority.",
            "If you are located in the EEA, UK, Switzerland, or Canada, you may also have the right to complain to your local data protection authority.",
          ],
        },
        {
          title: "11. Controls For Do-Not-Track Features",
          paragraphs: [
            'Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT") setting. Because no uniform technology standard for recognizing and implementing DNT signals has been finalized, Scrollable does not currently respond to DNT browser signals. If a standard is adopted that we must follow, we will update this notice.',
          ],
        },
        {
          title: "12. United States Privacy Notice",
          paragraphs: [
            "Residents of some US states, including California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, and Virginia, may have specific privacy rights.",
            "In the past 12 months, Scrollable may have collected these categories of personal information:",
          ],
          bullets: [
            "identifiers, such as email address, username, account identifiers, online identifiers, and IP address;",
            "internet or similar network activity, such as pages or features used, request logs, diagnostics, and interactions with Scrollable;",
            "imprecise geolocation data inferred from IP address or provider logs;",
            "user-provided content and configuration metadata, such as saved source names, tags, NSFW flags, and user-pasted URLs.",
          ],
          footerParagraphs: [
            "Scrollable has not sold personal information or shared personal information for targeted advertising in the past 12 months. Scrollable does not knowingly sell or share personal information of minors.",
            "We may disclose personal information to service providers for business purposes described in this notice, including hosting, authentication, database operation, security, support, analytics, and performance monitoring.",
            "California residents may request information under California's Shine The Light law about any disclosure of personal information to third parties for direct marketing purposes. Scrollable does not disclose personal information to third parties for their direct marketing.",
          ],
        },
        {
          title: "13. International Use",
          paragraphs: [
            "Scrollable is operated from Virginia, United States. If you use Scrollable from another location, your information may be processed in the United States or other countries where Scrollable's providers operate.",
          ],
        },
        {
          title: "14. Do We Make Updates To This Notice?",
          paragraphs: [
            'We may update this Privacy Notice from time to time. The updated version will be posted with a new "Last updated" date. If we make material changes, we may notify you by prominently posting a notice or by other reasonable means.',
          ],
        },
        {
          title: "15. How Can You Contact Us About This Notice?",
          paragraphs: [
            `If you have questions or comments about this notice, email ${contactEmail}.`,
            "Scrollable is operated from Virginia, United States. We do not currently provide postal mail support for privacy requests; please use the email address or data subject access request form above.",
          ],
        },
        {
          title: "16. How Can You Review, Update, Or Delete Your Data?",
          paragraphs: [
            `To request access, correction, deletion, or another privacy action, email ${contactEmail} or submit a data subject access request at ${dsarUrl}.`,
            "This Privacy Policy was created using Termly's Privacy Policy Generator: https://termly.io/products/privacy-policy-generator/",
          ],
        },
      ]}
    />
  );
}
