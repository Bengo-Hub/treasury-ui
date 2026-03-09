/**
 * Public layout – no auth, no sidebar.
 * Used for payment callback and other public pages (see shared-docs/paystack-callback-page.md).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
