import type { Metadata } from "next";

import { LegalPage } from "@/app/legal-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Terms of Service",
    description:
      "Rules for using Scrollable, including accounts, shared metadata links, local files, third-party media, and acceptable use.",
    path: "/terms",
  }),
};

const updatedAt = "April 30, 2026";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updatedAt={updatedAt}
      intro={[
        "These Terms of Service govern your use of Scrollable, available at https://scrollable.app. If you do not agree to these Terms, do not use Scrollable.",
        "For questions, privacy requests, or abuse reports, contact contact@scrollable.app.",
      ]}
      sections={[
        {
          title: "1. What Scrollable Does",
          paragraphs: [
            "Scrollable is a mobile-first media viewer that lets users build personal viewing sessions from user-directed sources, including Reddit post or listing URLs, other supported media URLs, and local files. Scrollable supports single-feed viewing, multi-view layouts, grids, free-form layouts, layers, timers, saved configurations, collections, templates, and shared metadata links.",
            "Scrollable does not post, comment, vote, message users, moderate communities, or operate automated Reddit accounts. Reddit is a runtime content source only.",
          ],
        },
        {
          title: "2. Eligibility",
          paragraphs: [
            "You must be at least 13 years old to use Scrollable. You must be at least 18 years old, or the age of majority in your jurisdiction, to use Scrollable to view, configure, save, or share sources marked or reasonably likely to contain adult or NSFW content.",
            "You are responsible for complying with the laws that apply to you and with the rules of any third-party service or community you access through Scrollable.",
          ],
        },
        {
          title: "3. Accounts",
          paragraphs: [
            "Some features require an account, including cloud-saved configurations, collections, layouts, templates, and shared links. Authentication may be provided through Supabase, email and password, or Google sign-in.",
            "You are responsible for keeping your account credentials secure and for activity under your account.",
          ],
        },
        {
          title: "4. User-Directed Sources And Third-Party Content",
          paragraphs: [
            "Scrollable displays content from sources you select or paste. Third-party content remains owned by its original owners or rightsholders. Scrollable does not claim ownership of Reddit posts, Reddit media, third-party media, or local files you select.",
            "You may use Scrollable only with content and sources you are allowed to access. You may not use Scrollable to violate copyright, privacy rights, platform rules, community rules, or applicable law.",
            "Scrollable is not affiliated with, endorsed by, or sponsored by Reddit. Your use of Reddit content and Reddit APIs remains subject to Reddit's terms, policies, rate limits, and developer rules.",
          ],
        },
        {
          title: "5. Saved Data And Sharing",
          paragraphs: [
            "When you save configurations, collections, viewer sessions, templates, or shared links, you grant Scrollable a limited license to store, process, display, and transmit that data only as needed to operate Scrollable and the features you use.",
            "Shared links may expose configuration metadata to people who have the link.",
            "Scrollable is designed not to persist or rehost third-party media. Saved views should contain configuration metadata, not third-party media previews or copied third-party payloads.",
          ],
        },
        {
          title: "6. Local Files",
          paragraphs: [
            "If you select local image, video, or audio files, Scrollable may use browser object URLs for the current session. If you save a local layout, Scrollable may store copies of those user-selected local files in your own browser's IndexedDB so that the layout can be restored on that device.",
            "Local file bytes are not uploaded to Scrollable's cloud database unless the product changes and you are told before that behavior is introduced. Scrollable does not store absolute local filesystem paths.",
          ],
        },
        {
          title: "7. Acceptable Use",
          paragraphs: ["You may not use Scrollable to:"],
          bullets: [
            "access, view, configure, save, share, or distribute illegal content;",
            "harass, spam, impersonate, or harm other people;",
            "violate third-party platform terms, including Reddit's terms and API rules;",
            "bypass access controls, rate limits, authentication, or security protections;",
            "upload malware or attempt to disrupt Scrollable or its providers;",
            "persist, proxy-cache, rehost, scrape, bulk export, resell, or train AI models on Reddit or third-party content through Scrollable;",
            "misrepresent Scrollable as affiliated with or endorsed by Reddit or any third-party service.",
          ],
        },
        {
          title: "8. Non-Commercial Status",
          paragraphs: [
            "Scrollable is currently provided as a non-commercial project with no ads, subscriptions, paid plans, affiliate revenue, sponsorships, or sale of Reddit data. If commercial features are introduced later, additional terms may apply, and Reddit approval or a separate Reddit agreement may be required before launch.",
          ],
        },
        {
          title: "9. Suspension And Termination",
          paragraphs: [
            "We may suspend or terminate access, delete hosted account data, or disable shared links if we believe use of Scrollable violates these Terms, applicable law, third-party platform rules, or creates security, abuse, or operational risk.",
            "You may stop using Scrollable at any time. You may request deletion of your Scrollable account and cloud-saved data by contacting contact@scrollable.app.",
          ],
        },
        {
          title: "10. Open Source License",
          paragraphs: [
            "Scrollable source code is licensed under the GNU General Public License version 3, as stated in the repository license. The code license governs your rights to copy, modify, and distribute the source code. These Terms govern use of the hosted Scrollable service.",
          ],
        },
        {
          title: "11. No Warranty",
          paragraphs: [
            'Scrollable is provided "as is" and "as available." We do not guarantee that Scrollable will be uninterrupted, secure, error-free, or compatible with every source, provider, browser, file, or device. Third-party APIs and media sources may change, rate-limit, block, remove, or alter content at any time.',
          ],
        },
        {
          title: "12. Limitation Of Liability",
          paragraphs: [
            "To the maximum extent permitted by law, Scrollable and its operator will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost data, lost profits, or service interruptions arising from your use of Scrollable.",
          ],
        },
        {
          title: "13. Changes",
          paragraphs: [
            'We may update these Terms from time to time. Updated Terms will be posted on this page with a new "Last updated" date. Continued use of Scrollable after changes means you accept the updated Terms.',
          ],
        },
        {
          title: "14. Governing Law",
          paragraphs: [
            "These Terms are governed by the laws of Virginia, United States, excluding conflict of law rules, unless applicable law requires otherwise.",
          ],
        },
        {
          title: "15. Contact",
          paragraphs: [
            "Questions, privacy requests, or abuse reports: contact@scrollable.app",
          ],
        },
      ]}
    />
  );
}
