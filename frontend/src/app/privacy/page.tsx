export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <article className="prose prose-gray mx-auto max-w-3xl">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: September 2026</p>

        <h2>What we collect</h2>
        <p>
          Account details (name, email, profile image), order and payment references, and download
          activity (timestamps, IP address) needed to provide the service and prevent abuse.
        </p>

        <h2>How we use it</h2>
        <p>
          To operate your account, process purchases through Razorpay, grant and protect access to
          content, provide support, and send transactional notifications (order confirmations,
          refund updates).
        </p>

        <h2>Payments</h2>
        <p>
          Card and payment details are handled entirely by Razorpay. We never store full payment
          credentials — only payment references and status.
        </p>

        <h2>Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal data. Financial
          records required for accounting and legal purposes are retained as required by law.
        </p>

        <h2>Security</h2>
        <p>
          Passwords are hashed, sessions are token-based, files are stored privately with expiring
          access links, and all authorization is enforced server-side.
        </p>
      </article>
    </div>
  );
}
