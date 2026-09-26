export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
        <p className="mt-2 text-sm text-gray-500">
          Questions about a product, order, or refund? We&apos;re here to help.
        </p>

        <div className="card mt-8 p-8">
          <h2 className="font-semibold text-gray-900">Support</h2>
          <p className="mt-2 text-sm text-gray-600">
            Email: <span className="font-medium text-primary-700">support@example.com</span>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Typical response time: within 24–48 hours on business days.
          </p>

          <h2 className="mt-8 font-semibold text-gray-900">Before you write</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>Include your order number (e.g. ORD-2026-000124).</li>
            <li>Describe the issue and attach screenshots if relevant.</li>
            <li>Check the refund policy for refund-related questions.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
