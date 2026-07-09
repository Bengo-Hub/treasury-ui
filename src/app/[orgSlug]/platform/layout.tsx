'use client';

import { useMe } from '@/hooks/useMe';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Shield } from 'lucide-react';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { data: user } = useMe();
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  // isSuperUser is a TENANT-scoped role, not platform-wide — excluded so a tenant's own
  // admin/superuser can never reach /platform/* routes.
  const isPlatformOwner = user?.isPlatformOwner || orgSlug === 'codevertex';

  useEffect(() => {
    if (user && !isPlatformOwner) {
      router.replace(`/${orgSlug}`);
    }
  }, [user, isPlatformOwner, orgSlug, router]);

  if (!user) {
    return null;
  }

  if (!isPlatformOwner) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground text-sm">This section is only accessible to platform administrators.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
