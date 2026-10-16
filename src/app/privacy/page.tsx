import type { Metadata } from "next";
import Link from "next/link";
import { contentService } from "@/lib/content-service";
import styles from "./privacy.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy · Michael Johnson",
  description:
    "What this site measures with Google Analytics, what it does not collect, who receives it, and how to turn it off.",
};

// Bump this whenever the disclosures below change.
const UPDATED = "October 15, 2026";
const MEASUREMENT_ID = "G-4H86T3MD8N";

export default async function PrivacyPage() {
  const { content } = await contentService.getSiteContent();
  const { contact } = content;

  return (
    <>
      <header className={`${styles.head} on-navy`}>
        <div className={styles.headInner}>
          <Link className={styles.back} href="/">
            &larr; Michael Johnson
          </Link>
          <h1 className={styles.title}>Privacy</h1>
          <p className={styles.updated}>Last updated {UPDATED}</p>
        </div>
      </header>

      <main className={styles.doc}>
        <p className={styles.lede}>
          This is my personal career site. It has no accounts, no sign-up, and no forms &mdash; there is nothing here
          for you to fill in. The one thing it does collect is anonymous traffic measurement, through Google Analytics.
          This page explains exactly what that means.
        </p>

        <section aria-labelledby="what">
          <h2 id="what">What I measure, and why</h2>
          <p>
            I use Google Analytics 4 (measurement ID <code>{MEASUREMENT_ID}</code>), which loads on every page of this
            site. It records two things:
          </p>
          <ul>
            <li>
              <strong>Page views</strong> &mdash; each time a page here loads.
            </li>
            <li>
              <strong>Outbound clicks</strong> &mdash; when you click a link that leaves this site, such as my LinkedIn
              profile or one of my GitHub repositories.
            </li>
          </ul>
          <p>
            I built this site to find work. Measuring it tells me whether anyone is reaching it, which projects hold
            attention, and whether people follow through to my code or my r&eacute;sum&eacute;. That is the whole
            purpose. I am not building a profile of you, and there is nothing here to sell.
          </p>
        </section>

        <section aria-labelledby="collected">
          <h2 id="collected">What is actually collected</h2>
          <p>For each page view or click, Google Analytics records:</p>
          <ul>
            <li>the address and title of the page you are on, and the site or search engine you arrived from</li>
            <li>
              for an outbound click, the full web address you clicked, its domain (for example{" "}
              <code>linkedin.com</code>), and the visible text of the link
            </li>
            <li>your device type, browser, operating system, screen size, and language</li>
            <li>
              a general location &mdash; country, region, and usually city &mdash; that Google estimates from your IP
              address. Google states that it does not store the IP address itself in Analytics.
            </li>
            <li>the date and time</li>
            <li>
              a random number kept in cookies on your device (named <code>_ga</code> and <code>_ga_&hellip;</code>) so
              that a second visit counts as the same visitor rather than a new one. It holds no name, email, or account,
              just that number. By default it lasts up to two years, or until you delete it.
            </li>
          </ul>
          <p>
            None of this is tied to you by name. What I see in Google&rsquo;s reports are counts and patterns &mdash;
            &ldquo;fourteen people opened this page, three clicked through to GitHub&rdquo; &mdash; not a list of who
            visited.
          </p>
        </section>

        <section aria-labelledby="not-collected">
          <h2 id="not-collected">What I do not collect</h2>
          <ul>
            <li>No forms, newsletter, comments, or login. Nothing here takes anything you type.</li>
            <li>
              The <strong>Copy email</strong> button works entirely inside your browser. It writes my address to your
              clipboard and sends nothing anywhere.
            </li>
            <li>
              This site&rsquo;s database holds only my own content &mdash; my jobs, projects, and skills. It has no
              table for visitors, and nothing about your visit is written to it.
            </li>
            <li>
              The fonts are served from this site rather than from Google Fonts, so opening a page here does not report
              your visit to Google through the fonts.
            </li>
            <li>No advertising, ad personalization, remarketing, or Google signals.</li>
            <li>
              No payment details and no sensitive information. Nothing collected here is sold, rented, or handed to a
              data broker.
            </li>
          </ul>
        </section>

        <section aria-labelledby="who">
          <h2 id="who">Who receives it</h2>
          <p>Besides me, two companies are involved in your visit:</p>
          <p>
            <strong>Google LLC</strong> runs Google Analytics. The measurements above go to Google&rsquo;s servers,
            which are in the United States and other countries where Google operates, and Google processes them under
            its own terms. See <a href="https://policies.google.com/privacy">Google&rsquo;s privacy policy</a> and{" "}
            <a href="https://policies.google.com/technologies/partner-sites">
              how Google uses data from sites that use its tools
            </a>
            .
          </p>
          <p>
            <strong>Railway</strong> hosts this site. Your browser&rsquo;s request goes to Railway&rsquo;s servers to be
            served a page, and ordinary hosting logs there can include your IP address and which page you asked for. I
            look at those only when something is broken.
          </p>
        </section>

        <section aria-labelledby="choices">
          <h2 id="choices">Your choices</h2>
          <p className={styles.plain}>
            There is no cookie banner on this site. Analytics starts as soon as a page loads. I would rather say that
            outright than imply you were asked first.
          </p>
          <p>You can stop it at any time:</p>
          <ul>
            <li>
              <strong>Block or clear cookies for this site</strong> in your browser settings. Deleting the{" "}
              <code>_ga</code> cookies erases the random identifier.
            </li>
            <li>
              <strong>Use a browser or extension that blocks trackers.</strong> Safari, Firefox, Brave, and most content
              blockers already block Google Analytics by default, so plenty of visits here are never measured at all.
              That is fine by me.
            </li>
            <li>
              <strong>Install Google&rsquo;s own opt-out add-on</strong>:{" "}
              <a href="https://tools.google.com/dlpage/gaoptout">tools.google.com/dlpage/gaoptout</a>. It turns Google
              Analytics off on every site, not only mine.
            </li>
            <li>
              <strong>Browse in a private window</strong>, which discards the cookies when you close it.
            </li>
          </ul>
          <p>
            This site works completely when analytics is blocked. No content is withheld, nothing breaks, and nothing
            nags you about it.
          </p>
          <p>Two limits I should be straight about:</p>
          <ul>
            <li>
              This site does not currently detect &ldquo;Do Not Track&rdquo; or Global Privacy Control signals from your
              browser. If you send one, I am not acting on it, so use one of the options above instead.
            </li>
            <li>
              Because nothing here identifies you, I generally cannot locate &ldquo;your&rdquo; data to show or delete
              on request. Deleting the cookies yourself is the practical remedy. Beyond that, this property is set to
              delete event records after two months and visitor identifiers after fourteen months.
            </li>
          </ul>
        </section>

        <section aria-labelledby="eu">
          <h2 id="eu">If you are in the EU, EEA, or UK</h2>
          <p>
            Rules there generally require that analytics cookies be set only after you agree, and that declining be as
            easy as accepting. This site has no consent banner yet, so it does not meet that standard. I intend to add
            one. Until then, if you would rather not be measured here, block cookies or install the opt-out add-on above
            before browsing.
          </p>
        </section>

        <section aria-labelledby="ask">
          <h2 id="ask">Questions</h2>
          <p>
            Ask me anything about this page at <a href={`mailto:${contact.email}`}>{contact.email}</a>. If I change what
            the site collects, I will change this page and the date at the top of it.
          </p>
        </section>

        <p className={styles.foot}>
          <Link href="/">Back to the site</Link>
        </p>
      </main>
    </>
  );
}
