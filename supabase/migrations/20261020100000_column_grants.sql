-- Permisos de UPDATE por columna. Las políticas RLS solo comprueban la fila (is_admin(group_id)),
-- así que un admin de dos grupos podía mover filas de miembros (group_id, user_id) entre grupos,
-- fijar a mano groups.invite_code o cambiar groups.created_by. Aquí limitamos qué columnas puede
-- escribir el rol authenticated. invite_code lo cambia solo la RPC regenerate_invite (security
-- definer, no depende de estos grants); lo mismo create_group y join_group (solo insertan).
-- La app solo actualiza: group_members.role, groups.name (aún sin uso) y profiles.full_name.

revoke update on public.group_members from authenticated, anon;
grant update (role) on public.group_members to authenticated;

revoke update on public.groups from authenticated, anon;
grant update (name) on public.groups to authenticated;

revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;
