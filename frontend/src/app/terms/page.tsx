export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <div className="container-page py-12">
      <article className="prose prose-gray mx-auto max-w-3xl">
        <h1>Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500">Last updated: September 2026</p>

        <h2>1. About these terms</h2>
        <p>
          By accessing or purchasing from Digital Marketplace you agree to these terms. The
          platform sells digital products — PDFs, ZIP archives, documents, eBooks and access to
          external lecture playlists.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must provide accurate registration details and keep your credentials secure. You are
          responsible for all activity under your account. Accounts may be suspended or banned for
          abuse, chargeback fraud, or violation of these terms.
        </p>

        <h2>3. Purchases and access</h2>
        <p>
          Prices are shown in INR. Access to purchased content is granted after server-side payment
          verification. Downloads may be limited per product and links expire for security. Sharing
          purchased files or lecture access is prohibited and may result in access revocation.
        </p>

        <h2>4. Acceptable use</h2>
        <p>
          You may not redistribute, resell, or publicly share purchased content. Automated scraping,
          link extraction, or circumvention of access controls is not permitted.
        </p>

        <h2>5. Intellectual property</h2>
        <p>
          All content sold on the platform remains the property of its creators. Purchases grant
          you a personal, non-transferable license to use the content.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the platform constitutes
          acceptance of the updated terms.
        </p>
      </article>
    </div>
  );
}
