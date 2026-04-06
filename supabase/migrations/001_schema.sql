-- Masters Pool Schema

-- Tiers
create table if not exists tiers (
  id         serial primary key,
  name       text    not null,
  label      text    not null,
  sort_order int     not null default 0,
  is_amateur boolean not null default false
);

-- Golfers
create table if not exists golfers (
  id      serial primary key,
  name    text not null,
  tier_id int  not null references tiers(id) on delete cascade,
  odds    int  null
);

-- Entries
create table if not exists entries (
  id               serial primary key,
  participant_name text        not null,
  created_at       timestamptz not null default now()
);

-- Picks (one per entry per tier)
create table if not exists picks (
  id        serial primary key,
  entry_id  int not null references entries(id) on delete cascade,
  tier_id   int not null references tiers(id),
  golfer_id int not null references golfers(id),
  unique(entry_id, tier_id)
);

-- Scores (upserted by cron job)
create table if not exists scores (
  id            serial primary key,
  golfer_id     int         not null references golfers(id) on delete cascade unique,
  total_strokes int         not null default 0,
  missed_cut    boolean     not null default false,
  last_updated  timestamptz not null default now()
);

-- Settings (key/value)
create table if not exists settings (
  key   text primary key,
  value text not null
);

-- Default settings
insert into settings (key, value) values ('picks_locked', 'false')
  on conflict (key) do nothing;

-- Seed tiers
insert into tiers (name, label, sort_order, is_amateur) values
  ('Tier 1', 'Elite',       1, false),
  ('Tier 2', 'Contenders',  2, false),
  ('Tier 3', 'Threats',     3, false),
  ('Tier 4', 'Dark Horses', 4, false),
  ('Tier 5', 'Longshots',   5, false),
  ('Tier 6', 'Field',       6, false),
  ('Tier 7', 'Amateur',     7, true)
on conflict do nothing;

-- Seed golfers
do $$
declare t1 int; t2 int; t3 int; t4 int; t5 int; t6 int; t7 int;
begin
  select id into t1 from tiers where sort_order = 1;
  select id into t2 from tiers where sort_order = 2;
  select id into t3 from tiers where sort_order = 3;
  select id into t4 from tiers where sort_order = 4;
  select id into t5 from tiers where sort_order = 5;
  select id into t6 from tiers where sort_order = 6;
  select id into t7 from tiers where sort_order = 7;

  -- Tier 1: Elite (440–1075)
  insert into golfers (name, tier_id, odds) values
    ('Scottie Scheffler',   t1, 440),
    ('Jon Rahm',            t1, 910),
    ('Rory McIlroy',        t1, 1075),
    ('Bryson DeChambeau',   t1, 1075);

  -- Tier 2: Contenders (1700–2500)
  insert into golfers (name, tier_id, odds) values
    ('Ludvig Aberg',        t2, 1700),
    ('Xander Schauffele',   t2, 1800),
    ('Cameron Young',       t2, 2350),
    ('Tommy Fleetwood',     t2, 2450),
    ('Matthew Fitzpatrick', t2, 2500);

  -- Tier 3: Threats (3100–4700)
  insert into golfers (name, tier_id, odds) values
    ('Collin Morikawa',     t3, 3100),
    ('Justin Rose',         t3, 3500),
    ('Brooks Koepka',       t3, 3700),
    ('Robert Macintyre',    t3, 3700),
    ('Hideki Matsuyama',    t3, 3800),
    ('Christopher Gotterup',t3, 4200),
    ('Jordan Spieth',       t3, 4300),
    ('Patrick Reed',        t3, 4400),
    ('Si Woo Kim',          t3, 4500),
    ('Viktor Hovland',      t3, 4500),
    ('Russell Henley',      t3, 4700);

  -- Tier 4: Dark Horses (5300–8000)
  insert into golfers (name, tier_id, odds) values
    ('Min Woo Lee',         t4, 5300),
    ('Justin Thomas',       t4, 5400),
    ('Patrick Cantlay',     t4, 5600),
    ('Akshay Bhatia',       t4, 5700),
    ('Adam Scott',          t4, 6100),
    ('Jason Day',           t4, 6700),
    ('Tyrrell Hatton',      t4, 6700),
    ('Jake Knapp',          t4, 6800),
    ('Shane Lowry',         t4, 6900),
    ('Sam Burns',           t4, 7000),
    ('J.J. Spaun',          t4, 7200),
    ('Sepp Straka',         t4, 7400),
    ('Corey Conners',       t4, 8000);

  -- Tier 5: Longshots (8200–15500)
  insert into golfers (name, tier_id, odds) values
    ('Nicolai Hojgaard',    t5, 8200),
    ('Kurt Kitayama',       t5, 8600),
    ('Jacob Bridgeman',     t5, 9200),
    ('Maverick McNealy',    t5, 9400),
    ('Cameron Smith',       t5, 9800),
    ('Harris English',      t5, 10000),
    ('Daniel Berger',       t5, 10500),
    ('Gary Woodland',       t5, 10500),
    ('Ben Griffin',         t5, 11000),
    ('Sungjae Im',          t5, 11500),
    ('Max Homa',            t5, 12000),
    ('Rasmus Hojgaard',     t5, 12500),
    ('Keegan Bradley',      t5, 13500),
    ('Harry Hall',          t5, 15500);

  -- Tier 6: Field (16000+)
  insert into golfers (name, tier_id, odds) values
    ('Alexander Noren',          t6, 16000),
    ('Ryan Gerard',              t6, 16500),
    ('Nick Taylor',              t6, 18000),
    ('Aaron Rai',                t6, 19000),
    ('Brian Harman',             t6, 20000),
    ('Sam Stevens',              t6, 20000),
    ('Ryan Fox',                 t6, 21000),
    ('Wyndham Clark',            t6, 21000),
    ('Sergio Garcia',            t6, 22000),
    ('Dustin Johnson',           t6, 23000),
    ('Carlos Ortiz',             t6, 25000),
    ('Tom McKibbin',             t6, 26000),
    ('Haotong Li',               t6, 30000),
    ('Nico Echavarria',          t6, 30000),
    ('Aldrich Potgieter',        t6, 39000),
    ('Danny Willett',            t6, 250000),
    ('Ben Campbell',             t6, 250000),
    ('Angel Cabrera',            t6, 350000),
    ('Bubba Watson',             t6, 57500),
    ('Charl Schwartzel',         t6, 57500),
    ('Zach Johnson',             t6, 57500),
    ('Davis Riley',              t6, 55000),
    ('Fred Couples',             t6, 500000),
    ('Jose Maria Olazabal',      t6, 500000),
    ('Mike Weir',                t6, 500000),
    ('Vijay Singh',              t6, 450000);

  -- Tier 7: Amateur
  insert into golfers (name, tier_id, odds) values
    ('Mason Howell',        t7, 400000),
    ('Jackson Herrington',  t7, 450000),
    ('Brandon Holtz',       t7, null),
    ('Ethan Fang',          t7, 250000),
    ('Fifa Laopakdee',      t7, 350000),
    ('Mateo Pulcini',       t7, 450000);

end $$;

-- Initialize scores for every golfer (E, not MC)
insert into scores (golfer_id, total_strokes, missed_cut)
  select id, 0, false from golfers
on conflict (golfer_id) do nothing;
