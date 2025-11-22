-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PRODUCTS TABLE
create table products (
  id uuid primary key default uuid_generate_v4(),
  barcode text unique not null,
  description text not null,
  price numeric not null default 0,
  stock integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICES TABLE
create table services (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SALES TABLE (Header)
create table sales (
  id uuid primary key default uuid_generate_v4(),
  total numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SALE ITEMS TABLE (Detail)
create table sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references sales(id) on delete cascade not null,
  product_id uuid references products(id),
  service_id uuid references services(id),
  quantity integer not null default 1,
  unit_price numeric not null, -- Price at the moment of sale
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraint: Must be either product or service, not both (or handle in logic)
  constraint item_must_have_reference check (
    (product_id is not null and service_id is null) or
    (product_id is null and service_id is not null)
  )
);

-- Enable Realtime for Products (to update stock across devices)
alter publication supabase_realtime add table products;
