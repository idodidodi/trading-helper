'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="navbar">
      <Link href="/dashboard" className="navbar-brand">
        <span>⚡</span>
        <span>AlertManager</span>
      </Link>

      <div className="navbar-nav">
        <Link
          href="/dashboard"
          className={pathname === '/dashboard' ? 'active' : ''}
        >
          Dashboard
        </Link>
        <Link
          href="/settings"
          className={pathname === '/settings' ? 'active' : ''}
        >
          Settings
        </Link>
        <button className="btn btn-ghost" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
