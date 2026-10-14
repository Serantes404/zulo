import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions';
import { Button } from '@/components/ui/button';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between p-3">
        <Link href="/" className="font-semibold">Zulo</Link>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">Salir</Button>
        </form>
      </div>
    </header>
  );
}
