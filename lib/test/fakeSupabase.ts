// Cliente de Supabase falso para tests de server actions: registra cada consulta y responde con `respond`.
export type Call = {
  table?: string;
  rpc?: string;
  op: 'select' | 'update' | 'delete' | 'insert' | 'upsert' | 'rpc';
  payload?: unknown;
  columns?: string;
  filters: [string, unknown][];
};
export type Result = { data?: unknown; error?: { message: string } | null };

export function fakeSupabase(respond: (call: Call) => Result) {
  const calls: Call[] = [];
  const builder = (call: Call) => {
    const run = () => {
      calls.push(call);
      const r = respond(call);
      return { data: r.data ?? null, error: r.error ?? null };
    };
    const b = {
      select(columns?: string) {
        if (call.op === 'select') call.columns = columns;
        return b;
      },
      eq(col: string, v: unknown) {
        call.filters.push([col, v]);
        return b;
      },
      in(col: string, v: unknown) {
        call.filters.push([col, v]);
        return b;
      },
      maybeSingle: () => Promise.resolve(run()),
      single: () => Promise.resolve(run()),
      then: (ok: (v: Result) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, ko),
    };
    return b;
  };
  const client = {
    from: (table: string) => ({
      select: (columns?: string) => builder({ table, op: 'select', columns, filters: [] }),
      update: (payload: unknown) => builder({ table, op: 'update', payload, filters: [] }),
      delete: () => builder({ table, op: 'delete', filters: [] }),
      insert: (payload: unknown) => builder({ table, op: 'insert', payload, filters: [] }),
      upsert: (payload: unknown) => builder({ table, op: 'upsert', payload, filters: [] }),
    }),
    rpc: (rpc: string, payload: unknown) => builder({ rpc, op: 'rpc', payload, filters: [] }),
  };
  return { client, calls };
}
