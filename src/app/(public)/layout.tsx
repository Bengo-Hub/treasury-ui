import { PublicProviders } from './providers';

/**
 * Public layout – no auth, no sidebar.
 * Used for payment callback and other public pages (see shared-docs/paystack-callback-page.md).
 * The pay page's method forms read the server through react-query, so the route needs its own
 * QueryClient (the org shell's provider does not cover public routes).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicProviders>{children}</PublicProviders>;
}
