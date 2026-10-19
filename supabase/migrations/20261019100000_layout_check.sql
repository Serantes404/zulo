-- El plano guardado debe ser un objeto JSON pequeño (menos de 8 KB): evita que un admin
-- llene la base de datos con JSON arbitrario en warehouses.layout.
alter table public.warehouses
  add constraint warehouses_layout_check
  check (layout is null or (jsonb_typeof(layout) = 'object' and pg_column_size(layout) < 8192));
