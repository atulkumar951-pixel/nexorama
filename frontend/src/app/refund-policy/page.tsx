export const metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <div className="container-page py-12">
      <article className="prose prose-gray mx-auto max-w-3xl">
        <h1>Refund Policy</h1>
        <p className="text-sm text-gray-500">Last updated: September 2026</p>

        <h2>Digital products</h2>
        <p>
          Because digital products are delivered instantly, refunds are generally not available
          once files have been downloaded or lecture access has been used — except where required
          by law or where the product is faulty.
        </p>

        <h2>You may be eligible for a refund if</h2>
        <ul>
          <li>The file is corrupted or materially different from its description.</li>
          <li>You were charged twice for the same product.</li>
          <li>You have not downloaded any files or accessed any lectures.</li>
        </ul>

        <h2>How refunds work</h2>
        <p>
          Approved refunds are processed to the original payment method via Razorpay within 5–7
          business days. Unless support tells you otherwise, access to the refunded product is
          revoked once the refund is processed.
        </p>

        <h2>Contact</h2>
        <p>
          For refund requests or questions, contact our support team through the contact page with
          your order number.
        </p>
      </article>
    </div>
  );
}
