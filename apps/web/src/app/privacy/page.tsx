export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">Last updated: March 5, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide directly: email address, name, and social media
              account connections. We also collect usage data such as content generated, credits
              used, and publishing activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Provide and improve the KAME service</li>
              <li>Generate and publish AI content on your behalf</li>
              <li>Process credit purchases and payments</li>
              <li>Communicate with you about your account</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Social Media Data</h2>
            <p>
              When you connect social media accounts, we store encrypted OAuth tokens to publish
              content on your behalf. We access only the permissions you explicitly grant. We do
              not read your private messages or personal social media data beyond what is needed
              for publishing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Security</h2>
            <p>
              All OAuth tokens are encrypted using AES-256-GCM before storage. Passwords are
              hashed with bcrypt. All connections use HTTPS/TLS encryption. We follow industry
              best practices for data protection.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Data Sharing</h2>
            <p>
              We do not sell your personal data. We share data only with third-party services
              necessary to operate KAME: AI providers (for content generation), social media
              platforms (for publishing), and payment processors (for credit purchases).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
            <p>
              We retain your data as long as your account is active. You may request account
              deletion at any time by contacting us. Upon deletion, your personal data and
              encrypted tokens will be permanently removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use
              tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Disconnect social media accounts at any time</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of significant
              changes via email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Contact</h2>
            <p>
              For privacy-related questions, contact us at privacy@kairos-777.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
