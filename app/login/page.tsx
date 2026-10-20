import type { Metadata } from 'next';
import { AuthPage } from './AuthPage';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
