import { notFound } from "next/navigation";

const PAGES: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms & Conditions",
    body: [
      "By purchasing any product on Nexora, you explicitly confirm and agree that you accept all store policies, terms, and conditions under all circumstances without exception.",
      "Digital Voucher & Gift Code Terms: All digital gift codes and vouchers are provided strictly on an 'AS-IS' and 'AT YOUR OWN RISK' basis. Nexora provides NO GUARANTEE of code correctness, validity, balance, or redemption ability. You purchase all codes entirely at your own risk.",
      "Strict No-Refund Policy: Absolutely NO REFUNDS, returns, exchanges, or chargebacks will be made once a voucher or code has been processed or delivered under any condition, whether the code is right or wrong, valid or invalid, redeemed or unredeemed.",
      "Personal Use Only: You agree to use purchased content and codes for personal, non-commercial use only.",
      "Nexora reserves the right to update product content, pricing, and availability at any time. Historical order records always remain available in your account.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect only the information required to operate the marketplace: your name, email address, order history, payment references, and digital delivery activity.",
      "Passwords are stored using strong one-way cryptographic hashing. Account data is protected with bank-grade encryption.",
      "Order activity (timestamps, email dispatch, and IP addresses) is logged for security, fraud prevention, and audit compliance.",
      "We do not sell your personal information to third parties. You may request account deletion, subject to statutory transaction record requirements.",
    ],
  },
  "refund-policy": {
    title: "Refund Policy",
    body: [
      "Strict No-Refund Policy for Digital Vouchers & Gift Codes: By placing an order, you agree that you accept this policy in all conditions without exception.",
      "No Guarantee of Code Correctness: Digital gift vouchers are supplied strictly on an 'AS-IS' basis. Nexora provides NO GUARANTEE of code correctness. All purchases are made entirely at your own risk.",
      "Absolute No Refund Condition: Any type of refund is strictly NOT MADE after a code has been processed or delivered, whether the code is right or wrong, active or redeemed.",
      "For non-code digital goods (e.g. eBooks), refunds are strictly evaluated on a case-by-case basis within 24 hours of purchase only if access could not be provisioned.",
    ],
  },
  about: {
    title: "About Nexora",
    body: [
      "Nexora is a digital learning marketplace where educators publish premium notes, eBooks, code bundles and lecture series — and learners get instant, secure access after purchase.",
      "Every purchase is protected: server-verified payments, expiring download links, and a personal library that keeps your content organized forever.",
    ],
  },
  contact: {
    title: "Contact Us",
    body: [
      "Support email: r22541873@gmail.com",
      "For order issues, include your order number and registered email address.",
      "Business hours: Monday–Saturday, 10:00–18:00 IST.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((legal) => ({ legal }));
}

export default async function LegalPage({ params }: { params: Promise<{ legal: string }> }) {
  const { legal } = await params;
  const page = PAGES[legal];
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <div className="card mt-6 space-y-4 p-8 text-sm leading-relaxed text-slate-600">
        {page.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
