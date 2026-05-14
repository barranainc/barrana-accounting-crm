export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-white/10 bg-white/95 shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact your Barrana Accounting team to reset your password.
          </p>
        </div>
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Password reset is handled by your account administrator. Please email{" "}
          <a href="mailto:support@barranaaccounting.ai" className="underline font-medium">
            support@barranaaccounting.ai
          </a>{" "}
          for assistance.
        </div>
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-brand-navy hover:underline">
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
