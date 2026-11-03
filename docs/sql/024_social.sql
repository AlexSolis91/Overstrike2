-- Overstrike 2 · Paso 24: JUGADORES EN LÍNEA, CHAT Y DESAFÍOS AMISTOSOS (2026-11-03).
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run. Se puede volver a ejecutar. Requiere 002 y 008.
-- · En línea: cada jugador con sesión avisa cada 15 s (social_latido). Cuenta como en línea si avisó en los últimos 70 s.
-- · Chat: global e individual, 300 caracteres, 1 mensaje por segundo, se guarda 7 días. Solo los participantes leen un privado.
-- · Desafíos: 30 s para responder, 60 s para elegir equipo y batalla en vivo (misma técnica que la Arena). Sin premios.

create table if not exists public.social_en_linea (
  jugador uuid primary key references public.jugadores (id) on delete cascade,
  nombre  text not null,
  estado  text not null default 'libre' check (estado in ('libre', 'combate')),
  visto   timestamptz not null default now()
);
create table if not exists public.chat_mensajes (
  id         bigint generated always as identity primary key,
  de         uuid not null references public.jugadores (id) on delete cascade,
  de_nombre  text not null,
  para       uuid references public.jugadores (id) on delete cascade,   -- null = chat global
  texto      text not null check (char_length(texto) between 1 and 300),
  leido      boolean not null default false,
  creado     timestamptz not null default now()
);
create index if not exists chat_global_idx on public.chat_mensajes (id desc) where para is null;
create index if not exists chat_privado_idx on public.chat_mensajes (para, de, id desc) where para is not null;
create index if not exists chat_de_idx on public.chat_mensajes (de, id desc);
create table if not exists public.desafios (
  id            uuid primary key default gen_random_uuid(),
  de            uuid not null references public.jugadores (id) on delete cascade,
  para          uuid not null references public.jugadores (id) on delete cascade,
  de_nombre     text not null,
  para_nombre   text not null,
  version       text not null,
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'rechazado', 'cancelado', 'expirado', 'version', 'equipos', 'listo', 'terminado')),
  creado        timestamptz not null default now(),
  expira        timestamptz not null,
  equipos_hasta timestamptz,
  semilla       integer
);
create index if not exists desafios_de_idx on public.desafios (de, creado desc);
create index if not exists desafios_para_idx on public.desafios (para, creado desc);
-- En su propia tabla, sin permisos de lectura: así nadie ve el equipo del rival mientras elige el suyo
create table if not exists public.desafio_equipos (
  desafio uuid not null references public.desafios (id) on delete cascade,
  jugador uuid not null references public.jugadores (id) on delete cascade,
  equipo  text[] not null,
  primary key (desafio, jugador)
);

alter table public.social_en_linea enable row level security;
alter table public.chat_mensajes enable row level security;
alter table public.desafios enable row level security;
alter table public.desafio_equipos enable row level security;
revoke all on public.social_en_linea, public.chat_mensajes, public.desafios, public.desafio_equipos from anon, authenticated;
grant select on public.chat_mensajes, public.desafios to authenticated;
drop policy if exists "chat visible" on public.chat_mensajes;
create policy "chat visible" on public.chat_mensajes for select to authenticated
  using (creado > now() - interval '7 days' and (para is null or de = auth.uid() or para = auth.uid()));
drop policy if exists "desafio visible" on public.desafios;
create policy "desafio visible" on public.desafios for select to authenticated using (de = auth.uid() or para = auth.uid());

-- Avisos instantáneos por Supabase Realtime (si fallan, social_latido los entrega igual en unos segundos)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_mensajes') then
    alter publication supabase_realtime add table public.chat_mensajes; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'desafios') then
    alter publication supabase_realtime add table public.desafios; end if;
end $$;

-- Datos de un desafío para uno de sus jugadores. Los equipos solo se entregan cuando los dos ya eligieron.
create or replace function public._desafio_json(p_id uuid, p_yo uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare d public.desafios; v_rival uuid; v_mio text[]; v_suyo text[]; r jsonb;
begin
  select * into d from public.desafios where id = p_id and (de = p_yo or para = p_yo);
  if not found then raise exception 'Ese desafío no existe'; end if;
  v_rival := case when d.de = p_yo then d.para else d.de end;
  r := jsonb_build_object('id', d.id, 'de', d.de, 'para', d.para, 'de_nombre', d.de_nombre, 'para_nombre', d.para_nombre, 'estado', d.estado, 'expira', d.expira,
    'equipos_hasta', d.equipos_hasta, 'soy', case when d.de = p_yo then 'a' else 'b' end, 'yo_elegi', exists (select 1 from public.desafio_equipos where desafio = p_id and jugador = p_yo));
  if d.estado = 'listo' then
    select equipo into v_mio from public.desafio_equipos where desafio = p_id and jugador = p_yo;
    select equipo into v_suyo from public.desafio_equipos where desafio = p_id and jugador = v_rival;
    r := r || jsonb_build_object('semilla', d.semilla, 'mio', v_mio, 'suyo', v_suyo,
      'equipo_mio', public._arena_equipo_json(p_yo, v_mio), 'equipo_suyo', public._arena_equipo_json(v_rival, v_suyo));
  end if;
  return r;
end $$;

-- Cierra lo vencido: desafíos sin responder y selecciones de equipo abandonadas (15 s de gracia por si el aviso va en camino)
create or replace function public._social_vencer() returns void language sql security definer set search_path = '' as $$
  update public.desafios set estado = 'expirado' where estado = 'pendiente' and expira <= now();
  update public.desafios set estado = 'cancelado' where estado = 'equipos' and equipos_hasta + interval '15 seconds' <= now();
$$;

-- Cada 15 s: avisa que sigo en línea y recibe quién más está, el desafío activo, el último mensaje global y los privados sin leer
create or replace function public.social_latido(p_estado text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_nombre text; v_des uuid;
begin
  if p_estado not in ('libre', 'combate') then raise exception 'Estado desconocido'; end if;
  select nombre into v_nombre from public.jugadores where id = v_yo;
  insert into public.social_en_linea (jugador, nombre, estado, visto) values (v_yo, v_nombre, p_estado, now())
    on conflict (jugador) do update set nombre = excluded.nombre, estado = excluded.estado, visto = now();
  delete from public.social_en_linea where visto < now() - interval '10 minutes';
  perform public._social_vencer();
  select id into v_des from public.desafios where (de = v_yo or para = v_yo) and estado in ('pendiente', 'equipos', 'listo')
    and creado > now() - interval '15 minutes' order by creado desc limit 1;
  return jsonb_build_object(
    'jugadores', coalesce((select jsonb_agg(jsonb_build_object('id', jugador, 'nombre', nombre, 'estado', estado) order by lower(nombre))
      from (select * from public.social_en_linea where jugador <> v_yo and visto > now() - interval '70 seconds' order by visto desc limit 200) x), '[]'),
    'desafio', case when v_des is null then null else public._desafio_json(v_des, v_yo) end,
    'ultimo_global', (select max(id) from public.chat_mensajes where para is null),
    'no_leidos', coalesce((select jsonb_agg(jsonb_build_object('de', de, 'de_nombre', de_nombre, 'n', n))
      from (select de, max(de_nombre) as de_nombre, count(*) as n from public.chat_mensajes
        where para = v_yo and not leido and creado > now() - interval '7 days' group by de) y), '[]'));
end $$;

-- ============================================================ CHAT
create or replace function public.chat_enviar(p_para uuid, p_texto text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_texto text := btrim(coalesce(p_texto, '')); v_nombre text; m public.chat_mensajes;
begin
  if char_length(v_texto) not between 1 and 300 then raise exception 'El mensaje debe tener de 1 a 300 caracteres'; end if;
  if p_para = v_yo then raise exception 'No puedes escribirte a ti mismo'; end if;
  if p_para is not null and not exists (select 1 from public.jugadores where id = p_para) then raise exception 'Ese jugador no existe'; end if;
  if exists (select 1 from public.chat_mensajes where de = v_yo and creado > now() - interval '1 second') then raise exception 'Vas muy rápido: espera un segundo'; end if;
  delete from public.chat_mensajes where creado < now() - interval '7 days';
  select nombre into v_nombre from public.jugadores where id = v_yo;
  insert into public.chat_mensajes (de, de_nombre, para, texto) values (v_yo, v_nombre, p_para, v_texto) returning * into m;
  return to_jsonb(m);
end $$;

-- Últimos 100 mensajes de una sala: p_con null = global; si no, la conversación con ese jugador
create or replace function public.chat_historial(p_con uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from (
    select * from public.chat_mensajes c
    where c.creado > now() - interval '7 days'
      and (case when p_con is null then c.para is null
           else (c.de = v_yo and c.para = p_con) or (c.de = p_con and c.para = v_yo) end)
    order by c.id desc limit 100) m), '[]');
end $$;

-- Mis conversaciones privadas de los últimos 7 días, con el nombre del otro jugador y lo que no he leído
create or replace function public.chat_conversaciones() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('con', x.con, 'nombre', j.nombre, 'no_leidos', x.n) order by x.ultimo desc)
    from (select case when c.de = v_yo then c.para else c.de end as con, max(c.id) as ultimo,
            count(*) filter (where c.para = v_yo and not c.leido) as n
          from public.chat_mensajes c
          where c.para is not null and (c.de = v_yo or c.para = v_yo) and c.creado > now() - interval '7 days'
          group by 1) x join public.jugadores j on j.id = x.con), '[]');
end $$;

create or replace function public.chat_leer(p_con uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  update public.chat_mensajes set leido = true where para = v_yo and de = p_con and not leido;
end $$;

-- ============================================================ DESAFÍOS
create or replace function public.desafio_enviar(p_para uuid, p_version text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); v_mi text; v_su text; v_id uuid;
begin
  if p_para = v_yo then raise exception 'No puedes desafiarte a ti mismo'; end if;
  perform public._social_vencer();
  select nombre into v_mi from public.jugadores where id = v_yo;
  select nombre into v_su from public.social_en_linea where jugador = p_para and estado = 'libre' and visto > now() - interval '70 seconds';
  if not found then raise exception 'Ese jugador ya no está disponible'; end if;
  if (select count(*) from public.coleccion where jugador = v_yo) < 5 then raise exception 'Necesitas al menos 5 campeones para desafiar'; end if;
  if exists (select 1 from public.desafios where estado in ('pendiente', 'equipos') and (de in (v_yo, p_para) or para in (v_yo, p_para))) then
    raise exception 'Uno de los dos ya tiene un desafío activo'; end if;
  if exists (select 1 from public.desafios where de = v_yo and para = p_para and creado > now() - interval '15 seconds') then
    raise exception 'Espera unos segundos para volver a desafiarlo'; end if;
  insert into public.desafios (de, para, de_nombre, para_nombre, version, expira) values (v_yo, p_para, v_mi, v_su, p_version, now() + interval '30 seconds') returning id into v_id;
  return public._desafio_json(v_id, v_yo);
end $$;

create or replace function public.desafio_responder(p_id uuid, p_aceptar boolean, p_version text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); d public.desafios;
begin
  select * into d from public.desafios where id = p_id and para = v_yo for update;
  if not found then raise exception 'Ese desafío no existe'; end if;
  if d.estado <> 'pendiente' or d.expira <= now() then raise exception 'Ese desafío ya no está activo'; end if;
  if not p_aceptar then update public.desafios set estado = 'rechazado' where id = p_id;
  elsif d.version <> p_version then update public.desafios set estado = 'version' where id = p_id;   -- las dos pantallas deben correr el mismo juego
  elsif (select count(*) from public.coleccion where jugador = v_yo) < 5 then raise exception 'Necesitas al menos 5 campeones para aceptar';
  else update public.desafios set estado = 'equipos', equipos_hasta = now() + interval '60 seconds' where id = p_id; end if;
  return public._desafio_json(p_id, v_yo);
end $$;

create or replace function public.desafio_cancelar(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  update public.desafios set estado = 'cancelado' where id = p_id and (de = v_yo or para = v_yo) and estado in ('pendiente', 'equipos');
  return public._desafio_json(p_id, v_yo);
end $$;

create or replace function public.desafio_equipo(p_id uuid, p_equipo text[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo(); d public.desafios;
begin
  select * into d from public.desafios where id = p_id and (de = v_yo or para = v_yo) for update;
  if not found then raise exception 'Ese desafío no existe'; end if;
  if d.estado <> 'equipos' or d.equipos_hasta + interval '15 seconds' <= now() then raise exception 'Ese desafío ya no está activo'; end if;
  if cardinality(p_equipo) <> 5 or (select count(distinct x) from unnest(p_equipo) x) <> 5 then raise exception 'El equipo debe tener 5 campeones distintos'; end if;
  if (select count(*) from public.coleccion where jugador = v_yo and campeon = any (p_equipo)) <> 5 then raise exception 'Solo puedes usar tus campeones'; end if;
  insert into public.desafio_equipos (desafio, jugador, equipo) values (p_id, v_yo, p_equipo)
    on conflict (desafio, jugador) do update set equipo = excluded.equipo;
  if (select count(*) from public.desafio_equipos where desafio = p_id) = 2 then
    update public.desafios set estado = 'listo', semilla = floor(random() * 2000000000)::int where id = p_id;
  end if;
  return public._desafio_json(p_id, v_yo);
end $$;

create or replace function public.desafio_datos(p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  perform public._social_vencer();
  return public._desafio_json(p_id, v_yo);
end $$;

create or replace function public.desafio_terminar(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._yo();
begin
  update public.desafios set estado = 'terminado' where id = p_id and (de = v_yo or para = v_yo) and estado = 'listo';
  delete from public.desafios where creado < now() - interval '7 days';
end $$;

-- Permisos de las funciones
revoke all on function public._desafio_json(uuid, uuid), public._social_vencer(), public.social_latido(text), public.chat_enviar(uuid, text),
  public.chat_historial(uuid), public.chat_conversaciones(), public.chat_leer(uuid), public.desafio_enviar(uuid, text),
  public.desafio_responder(uuid, boolean, text), public.desafio_cancelar(uuid), public.desafio_equipo(uuid, text[]),
  public.desafio_datos(uuid), public.desafio_terminar(uuid) from public, anon, authenticated;
grant execute on function public.social_latido(text), public.chat_enviar(uuid, text),
  public.chat_historial(uuid), public.chat_conversaciones(), public.chat_leer(uuid), public.desafio_enviar(uuid, text),
  public.desafio_responder(uuid, boolean, text), public.desafio_cancelar(uuid), public.desafio_equipo(uuid, text[]),
  public.desafio_datos(uuid), public.desafio_terminar(uuid) to authenticated;
