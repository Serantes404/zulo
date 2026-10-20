import type { Metadata } from 'next';
import { AuthPage } from '../login/AuthPage';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthPage mode="signup" searchParams={searchParams} />;
}
