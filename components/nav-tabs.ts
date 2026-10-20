import { HandCoins, Search, Users, Warehouse, type LucideIcon } from 'lucide-react';
import type { TabKey } from '@/lib/nav';

/** Definición única de las pestañas, compartida con la cabecera de escritorio. */
export const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'almacenes', label: 'Almacenes', icon: Warehouse },
  { key: 'buscar', label: 'Buscar', icon: Search },
  { key: 'prestamos', label: 'Préstamos', icon: HandCoins },
  { key: 'grupo', label: 'Grupo', icon: Users },
];
