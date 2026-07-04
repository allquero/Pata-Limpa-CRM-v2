--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: admin_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_sales (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    paid_at date NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_sales_id_seq OWNED BY public.admin_sales.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    pet_id integer NOT NULL,
    client_id integer NOT NULL,
    service_id integer,
    package_id integer,
    scheduled_date timestamp with time zone NOT NULL,
    status text DEFAULT 'aguardando'::text NOT NULL,
    total_price numeric(10,2) NOT NULL,
    notes text,
    recurring_weeks integer,
    recurring_group_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    extra_service_ids json
);


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: financial_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_entries (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    date date NOT NULL,
    category text,
    appointment_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.financial_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: financial_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.financial_entries_id_seq OWNED BY public.financial_entries.id;


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_templates_id_seq OWNED BY public.message_templates.id;


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    price_by_sizes jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;


--
-- Name: pets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pets (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name text NOT NULL,
    breed text,
    size text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sex text,
    neutered boolean DEFAULT false,
    coat text,
    behavior text,
    health_notes text,
    photo_url text,
    grooming_preferences text,
    senior boolean DEFAULT false
);


--
-- Name: pets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pets_id_seq OWNED BY public.pets.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    name text NOT NULL,
    description text,
    size text NOT NULL,
    price numeric(10,2) NOT NULL,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id character varying,
    access_start date,
    access_end date,
    scheduling_method character varying(20) DEFAULT 'hora'::character varying NOT NULL
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash character varying,
    is_admin boolean DEFAULT false NOT NULL
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: admin_sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sales ALTER COLUMN id SET DEFAULT nextval('public.admin_sales_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: financial_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_entries ALTER COLUMN id SET DEFAULT nextval('public.financial_entries_id_seq'::regclass);


--
-- Name: message_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates ALTER COLUMN id SET DEFAULT nextval('public.message_templates_id_seq'::regclass);


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: pets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets ALTER COLUMN id SET DEFAULT nextval('public.pets_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: -
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: admin_sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_sales (id, tenant_id, description, amount, paid_at, period_start, period_end, created_at) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, tenant_id, pet_id, client_id, service_id, package_id, scheduled_date, status, total_price, notes, recurring_weeks, recurring_group_id, created_at, updated_at, extra_service_ids) FROM stdin;
24	1	9	5	59	\N	2026-05-21 16:00:00+00	concluido	150.00	Banho e tosa na tesoura 	\N	\N	2026-05-21 11:22:54.534391+00	2026-05-21 11:22:54.534391+00	\N
25	1	10	6	31	\N	2026-05-21 16:00:00+00	concluido	70.00	75,00	\N	\N	2026-05-21 11:32:30.228341+00	2026-05-21 11:32:30.228341+00	\N
42	1	21	11	24	\N	2026-05-22 12:00:00+00	concluido	55.00	\N	\N	\N	2026-05-22 21:00:37.177041+00	2026-05-22 21:00:37.177041+00	\N
43	1	23	10	32	\N	2026-05-22 12:00:00+00	concluido	90.00	\N	\N	\N	2026-05-22 21:05:34.923446+00	2026-05-22 21:05:34.923446+00	[64]
45	1	22	12	26	8	2026-05-29 11:00:00+00	concluido	0.00	\N	\N	d82e2389-4b12-4178-8616-dcdabb04210d	2026-05-22 21:09:37.424089+00	2026-05-22 21:09:37.424089+00	\N
46	1	22	12	26	8	2026-06-05 09:00:00+00	aguardando	0.00	\N	\N	d82e2389-4b12-4178-8616-dcdabb04210d	2026-05-22 21:09:37.441113+00	2026-05-22 21:09:37.441113+00	\N
50	1	25	14	43	\N	2026-05-23 11:00:00+00	concluido	100.00	\N	\N	\N	2026-05-22 21:26:46.545313+00	2026-05-22 21:26:46.545313+00	\N
51	1	26	14	45	\N	2026-05-23 11:00:00+00	concluido	80.00	\N	\N	\N	2026-05-22 21:29:34.741486+00	2026-05-22 21:29:34.741486+00	\N
53	1	27	15	24	\N	2026-05-23 12:00:00+00	concluido	55.00	\N	\N	\N	2026-05-22 21:34:22.210525+00	2026-05-22 21:34:22.210525+00	\N
54	1	28	16	44	\N	2026-05-23 11:00:00+00	concluido	100.00	\N	\N	\N	2026-05-22 21:38:31.304178+00	2026-05-22 21:38:31.304178+00	\N
55	1	29	17	25	\N	2026-05-23 13:00:00+00	concluido	45.00	\N	\N	\N	2026-05-23 16:10:14.741519+00	2026-05-23 16:10:14.741519+00	\N
56	1	31	18	39	\N	2026-05-26 11:00:00+00	concluido	80.00	\N	\N	\N	2026-05-26 17:23:16.059736+00	2026-05-26 17:23:16.059736+00	\N
57	1	33	19	39	\N	2026-05-26 11:30:00+00	concluido	80.00	\N	\N	\N	2026-05-26 20:52:49.780985+00	2026-05-26 20:52:49.780985+00	\N
58	1	35	20	33	\N	2026-05-28 12:30:00+00	concluido	75.00	\N	\N	\N	2026-05-26 20:57:32.9728+00	2026-05-26 20:57:32.9728+00	\N
59	1	36	21	24	\N	2026-05-26 11:00:00+00	concluido	55.00	\N	\N	\N	2026-05-26 21:02:03.802736+00	2026-05-26 21:02:03.802736+00	\N
60	1	38	22	31	\N	2026-05-27 16:00:00+00	concluido	110.00	\N	\N	\N	2026-05-26 21:30:22.210753+00	2026-05-26 21:30:22.210753+00	[63]
61	1	41	23	36	\N	2026-05-27 11:00:00+00	concluido	85.00	\N	\N	\N	2026-05-26 21:35:55.918769+00	2026-05-26 21:35:55.918769+00	\N
62	1	43	24	31	\N	2026-06-02 16:00:00+00	aguardando	80.00	\N	\N	\N	2026-05-27 16:03:27.358847+00	2026-05-27 16:03:27.358847+00	\N
63	1	42	24	33	\N	2026-06-02 16:00:00+00	aguardando	75.00	\N	\N	\N	2026-05-27 16:03:57.776362+00	2026-05-27 16:03:57.776362+00	\N
64	1	46	25	50	\N	2026-05-27 16:00:00+00	concluido	150.00	\N	\N	\N	2026-05-27 21:06:35.133286+00	2026-05-27 21:06:35.133286+00	\N
65	1	48	26	31	\N	2026-05-30 11:00:00+00	concluido	80.00	\N	\N	\N	2026-05-28 11:34:40.198237+00	2026-05-28 11:34:40.198237+00	\N
66	1	50	27	25	\N	2026-05-30 11:00:00+00	concluido	45.00	\N	\N	\N	2026-05-28 16:27:43.108829+00	2026-05-28 16:27:43.108829+00	\N
68	1	51	28	24	\N	2026-05-29 16:00:00+00	concluido	55.00	\N	\N	\N	2026-05-28 16:32:47.398424+00	2026-05-28 16:32:47.398424+00	\N
69	1	52	28	24	\N	2026-05-29 16:00:00+00	concluido	55.00	\N	\N	\N	2026-05-28 16:33:25.163906+00	2026-05-28 16:33:25.163906+00	\N
70	1	53	29	43	\N	2026-05-28 16:30:00+00	concluido	100.00	\N	\N	\N	2026-05-28 16:37:17.181383+00	2026-05-28 16:37:17.181383+00	\N
71	1	54	30	34	\N	2026-05-29 16:00:00+00	concluido	95.00	\N	\N	\N	2026-05-28 16:40:11.442521+00	2026-05-28 16:40:11.442521+00	\N
72	1	55	31	28	\N	2026-05-30 11:00:00+00	concluido	70.00	\N	\N	\N	2026-05-30 11:24:59.782215+00	2026-05-30 11:24:59.782215+00	\N
73	1	56	32	24	\N	2026-05-30 11:00:00+00	concluido	55.00	\N	\N	\N	2026-05-30 11:27:40.273005+00	2026-05-30 11:27:40.273005+00	\N
74	1	57	33	29	\N	2026-05-30 12:00:00+00	concluido	60.00	\N	\N	\N	2026-05-30 16:10:12.316731+00	2026-05-30 16:10:12.316731+00	\N
75	1	52	28	33	\N	2026-06-11 16:00:00+00	concluido	75.00	\N	\N	\N	2026-05-30 16:16:04.680798+00	2026-05-30 16:16:04.680798+00	\N
76	1	51	28	33	\N	2026-06-11 16:00:00+00	concluido	75.00	\N	\N	\N	2026-05-30 16:17:01.93067+00	2026-05-30 16:17:01.93067+00	\N
47	1	22	12	26	8	2026-06-12 09:00:00+00	concluido	0.00	Inclui: Banho + Tosa Higiênica	\N	d82e2389-4b12-4178-8616-dcdabb04210d	2026-05-22 21:09:37.458073+00	2026-06-23 23:11:49.487+00	\N
79	1	38	22	21	8	2026-07-02 14:00:00+00	aguardando	0.00	\N	4	2b5c2396-7e8f-4315-9c06-29dbea015094	2026-06-24 01:50:47.04038+00	2026-06-24 01:50:47.04038+00	\N
80	1	38	22	21	8	2026-07-09 14:00:00+00	aguardando	0.00	\N	4	2b5c2396-7e8f-4315-9c06-29dbea015094	2026-06-24 01:50:47.122867+00	2026-06-24 01:50:47.122867+00	\N
81	1	38	22	21	8	2026-07-16 14:00:00+00	aguardando	0.00	Inclui: Banho + Tosa Higiênica	4	2b5c2396-7e8f-4315-9c06-29dbea015094	2026-06-24 01:50:47.126013+00	2026-06-24 01:50:47.126013+00	\N
78	1	38	22	21	8	2026-06-25 14:00:00+00	aguardando	0.00	\N	4	2b5c2396-7e8f-4315-9c06-29dbea015094	2026-06-24 01:50:46.958725+00	2026-06-24 02:08:06.036+00	\N
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, tenant_id, name, phone, email, address, notes, created_at, updated_at) FROM stdin;
5	1	Flávia Vidal de oliveira fraga	44991021903	\N	\N	\N	2026-05-21 11:22:53.601224+00	2026-05-21 11:22:53.601224+00
6	1	Nathalia fraga Scioli	44991617335	\N	\N	\N	2026-05-21 11:32:29.263404+00	2026-05-21 11:32:29.263404+00
10	1	Izabela Fernandes Paro	44997500097	\N	\N	\N	2026-05-22 20:48:26.924935+00	2026-05-22 20:48:26.924935+00
11	1	Sidnei Alves Moro	44988553468	\N	\N	\N	2026-05-22 20:55:52.721981+00	2026-05-22 20:55:52.721981+00
12	1	Cristina Franco de Lima	44998229310	\N	\N	\N	2026-05-22 20:58:35.159502+00	2026-05-22 20:58:35.159502+00
14	1	Danielly  Miguel dos Santos     	44988678360	\N	\N	\N	2026-05-22 21:23:24.430091+00	2026-05-22 21:23:24.430091+00
15	1	Rafael Bená	44991142505	\N	\N	\N	2026-05-22 21:31:47.544552+00	2026-05-22 21:31:47.544552+00
16	1	Gisele Miguel	44998296905	\N	\N	\N	2026-05-22 21:35:49.521569+00	2026-05-22 21:35:49.521569+00
17	1	Luis Paulo Pinheiro cardoso	11964855033	\N	\N	\N	2026-05-23 16:10:13.935127+00	2026-05-23 16:10:13.935127+00
18	1	Adriana Rabelo	44988684067	\N	\N	\N	2026-05-26 17:23:15.236804+00	2026-05-26 17:23:15.236804+00
19	1	Nelsai- lili	44997675733	\N	\N	\N	2026-05-26 20:52:48.87717+00	2026-05-26 20:52:48.87717+00
20	1	Claudia Moreno	44998524255	\N	\N	\N	2026-05-26 20:57:32.159143+00	2026-05-26 20:57:32.159143+00
21	1	ROZANA APARECIDA RISSATO PITARELLI	44998001034	\N	\N	\N	2026-05-26 21:02:03.197218+00	2026-05-26 21:02:03.197218+00
22	1	ANDREIA  ALMEIDA	44988099366	\N	\N	\N	2026-05-26 21:30:21.613252+00	2026-05-26 21:30:21.613252+00
23	1	LUZIA RATI DE OLIVEIRA COSTA      	44998732666	\N	\N	\N	2026-05-26 21:32:36.170993+00	2026-05-26 21:32:36.170993+00
24	1	Cristiane Martão	44999680109	\N	\N	\N	2026-05-27 16:00:21.479358+00	2026-05-27 16:00:21.479358+00
25	1	DENISE CORRÊA       	44991191209	\N	\N	\N	2026-05-27 21:04:46.926472+00	2026-05-27 21:04:46.926472+00
26	1	IDALINA ROSA PEREIRA    	44984538983	\N	\N	\N	2026-05-28 11:33:39.27987+00	2026-05-28 11:33:39.27987+00
27	1	Maria Helena Luciano	44999444199	\N	\N	\N	2026-05-28 16:25:08.663457+00	2026-05-28 16:25:08.663457+00
28	1	Francielle Roberta Mazia Trabuco	44999072939	\N	\N	\N	2026-05-28 16:31:12.828337+00	2026-05-28 16:31:12.828337+00
29	1	Jéssica Regina Aparecida Poli	44999707558	\N	\N	\N	2026-05-28 16:35:40.146245+00	2026-05-28 16:35:40.146245+00
30	1	Flavia Sayuri	44997150796	\N	\N	\N	2026-05-28 16:38:31.605175+00	2026-05-28 16:38:31.605175+00
31	1	BRUNA DE OLIVEIRA  ALVES     	44998746041	\N	\N	\N	2026-05-30 11:23:56.347975+00	2026-05-30 11:23:56.347975+00
32	1	EDILSON MORELI      	44988211584	\N	\N	\N	2026-05-30 11:26:15.647409+00	2026-05-30 11:26:15.647409+00
33	1	FATIMA  ZANOTIN         	44999944746	\N	\N	\N	2026-05-30 16:09:09.64985+00	2026-05-30 16:09:09.64985+00
34	1	Mabili Tatianne de Andrade	44998518485	\N	\N	\N	2026-06-04 23:32:38.069284+00	2026-06-04 23:32:38.069284+00
35	1	Mayara Santos Dourado Trosdtolf	44998978232	\N	\N	\N	2026-06-04 23:44:23.434213+00	2026-06-04 23:44:23.434213+00
36	1	Magara Dalmarco Cassola	44999220071	\N	\N	\N	2026-06-04 23:46:59.733896+00	2026-06-04 23:46:59.733896+00
37	1	Patricia Cardoso	44991670531	\N	\N	\N	2026-06-04 23:49:43.36426+00	2026-06-04 23:49:43.36426+00
38	1	Guilherne Casagrande	44998466028	\N	\N	\N	2026-06-04 23:53:04.567872+00	2026-06-04 23:53:04.567872+00
39	1	Cleusa Nunes	44997518000	\N	\N	\N	2026-06-04 23:56:35.166019+00	2026-06-04 23:56:35.166019+00
40	1	Claudineia Oliveira Moreira	41997003712	\N	\N	\N	2026-06-04 23:58:47.064482+00	2026-06-04 23:58:47.064482+00
41	1	Cyntia Barbieri Navarro	44999310846	\N	\N	\N	2026-06-05 00:00:41.575588+00	2026-06-05 00:00:41.575588+00
42	1	Valdecir José de Souza Junior	44998279395	\N	\N	\N	2026-06-05 00:03:49.868798+00	2026-06-05 00:03:49.868798+00
43	1	Mariana Marques Winand	44999154830	\N	\N	\N	2026-06-11 11:04:16.578158+00	2026-06-11 11:04:16.578158+00
\.


--
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.financial_entries (id, tenant_id, type, description, amount, date, category, appointment_id, created_at, updated_at) FROM stdin;
14	1	receita	Venda de pacote: 4 Semanas — Rex	155.00	2026-05-22	Pacotes	\N	2026-05-22 14:58:47.721387+00	2026-05-22 14:58:47.721387+00
15	1	receita	Venda de pacote: 4 Semanas — Rex	155.00	2026-05-22	Pacotes	\N	2026-05-22 16:45:54.542512+00	2026-05-22 16:45:54.542512+00
16	1	receita	Venda de pacote: 4 Semanas — Rex	155.00	2026-05-23	Pacotes	\N	2026-05-22 16:53:00.507471+00	2026-05-22 16:53:00.507471+00
17	1	receita	Venda de pacote: 4 Semanas — Bolinha	145.00	2026-05-22	Pacotes	\N	2026-05-22 21:09:37.474793+00	2026-05-22 21:09:37.474793+00
18	1	receita	Venda de pacote: 4 Semanas — Romeu	160.00	2026-06-25	Pacotes	\N	2026-06-24 01:50:47.12922+00	2026-06-24 01:50:47.12922+00
\.


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_templates (id, tenant_id, name, type, content, created_at, updated_at) FROM stdin;
41	1	Confirmação de Presença	confirmacao	Olá {nome_cliente}! 🐾 Tudo bem?\n\nPassando para confirmar o agendamento do(a) {nome_pet} em {data} às {horario}.\n\nResponda SIM para confirmar ou nos avise para remarcarmos. Obrigado! 😊	2026-06-12 20:45:45.652702+00	2026-06-12 20:45:45.652702+00
42	1	Lembrete de Agendamento	lembrete	Oi {nome_cliente}! 🐾 Lembrando que o(a) {nome_pet} tem {servico} agendado para amanhã, {data} às {horario}.\n\nNos vemos em breve! 🐶✂️	2026-06-12 20:45:46.057681+00	2026-06-12 20:45:46.057681+00
43	1	Agradecimento após atendimento	agradecimento	Olá {nome_cliente}! Obrigado por trazer o(a) {nome_pet} hoje! 🐶✨\n\nEsperamos que tenham gostado do serviço. Até a próxima! 🐾	2026-06-12 20:45:46.464373+00	2026-06-12 20:45:46.464373+00
44	1	Reativação de cliente	leads	Oi {nome_cliente}! 🐾 Faz um tempinho que não vemos o(a) {nome_pet} por aqui.\n\nQue tal agendar um banho e tosa? Entre em contato e garanta o horário! 😊	2026-06-12 20:45:46.888287+00	2026-06-12 20:45:46.888287+00
\.


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.packages (id, tenant_id, name, description, created_at, updated_at, service_items, price_by_sizes) FROM stdin;
8	1	4 Semanas	3 Banhos + 1 Banho com Tosa Higiênica	2026-05-19 15:15:59.324388+00	2026-05-19 15:15:59.324388+00	[{"quantity": 4, "serviceName": "Banho"}, {"quantity": 1, "serviceName": "Banho + Tosa Higiênica"}]	[{"size": "mini_curto", "price": 140}, {"size": "mini_longo", "price": 155}, {"size": "pequeno_curto", "price": 145}, {"size": "pequeno_longo", "price": 160}, {"size": "medio_curto", "price": 200}, {"size": "medio_longo", "price": 260}, {"size": "grande_curto", "price": 300}, {"size": "grande_longo", "price": 320}]
9	1	5 Semanas	4 Banhos + 1 Banho com tosa higiênica	2026-05-19 15:19:28.33745+00	2026-05-19 15:19:28.33745+00	[{"quantity": 5, "serviceName": "Banho"}, {"quantity": 1, "serviceName": "Banho + Tosa Higiênica"}]	[{"size": "mini_curto", "price": 157}, {"size": "mini_longo", "price": 182}, {"size": "pequeno_curto", "price": 167}, {"size": "pequeno_longo", "price": 207}, {"size": "medio_curto", "price": 197}, {"size": "medio_longo", "price": 227}, {"size": "grande_curto", "price": 237}, {"size": "grande_longo", "price": 250}]
\.


--
-- Data for Name: pets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pets (id, client_id, name, breed, size, notes, created_at, updated_at, sex, neutered, coat, behavior, health_notes, photo_url, grooming_preferences, senior) FROM stdin;
9	5	Luigi	Spitz alemão	mini_longo	\N	2026-05-21 11:22:54.134221+00	2026-05-21 11:22:54.134221+00	\N	f	\N	\N	\N	\N	\N	f
10	6	Romeu	Spitz alemão	pequeno_longo	\N	2026-05-21 11:32:29.768974+00	2026-05-21 11:32:29.768974+00	\N	f	\N	\N	\N	\N	\N	f
16	10	Eliza	SRD	medio_curto	\N	2026-05-22 20:49:46.53483+00	2026-05-22 20:49:46.53483+00	\N	f	\N	\N	\N	\N	\N	f
18	6	Fiorela	Spitz Alemão	pequeno_longo	\N	2026-05-22 20:51:24.067072+00	2026-05-22 20:51:24.067072+00	\N	f	\N	\N	\N	\N	\N	f
19	6	Cleo	York	mini_longo	\N	2026-05-22 20:51:52.02646+00	2026-05-22 20:51:52.02646+00	\N	f	\N	\N	\N	\N	\N	f
21	11	Juca	Lhasa apso	pequeno_curto	\N	2026-05-22 20:56:55.018621+00	2026-05-22 20:56:55.018621+00	\N	f	\N	\N	\N	\N	\N	f
22	12	Bolinha	Lhasa Apso	pequeno_curto	\N	2026-05-22 20:59:27.63741+00	2026-05-22 20:59:27.63741+00	\N	f	\N	\N	\N	\N	\N	f
23	10	Mel	Lhasa Apso	mini_longo	\N	2026-05-22 21:04:53.196349+00	2026-05-22 21:04:53.196349+00	\N	f	\N	\N	\N	\N	\N	f
25	14	Flocos 	Lhasa Apso	pequeno_curto	\N	2026-05-22 21:23:51.47176+00	2026-05-22 21:23:51.47176+00	\N	f	\N	\N	\N	\N	\N	f
26	14	Meg	Lhasa Apso	mini_curto	\N	2026-05-22 21:24:27.191622+00	2026-05-22 21:24:27.191622+00	\N	f	\N	\N	\N	\N	\N	f
27	15	Zola	Buldog Françês	pequeno_curto	\N	2026-05-22 21:32:59.810017+00	2026-05-22 21:32:59.810017+00	\N	f	\N	\N	\N	\N	\N	f
28	16	Kiara	Lhasa Apso	pequeno_longo	\N	2026-05-22 21:37:36.831573+00	2026-05-22 21:37:36.831573+00	\N	f	\N	\N	\N	\N	\N	f
29	17	Maia	SRD	mini_curto	\N	2026-05-23 16:10:14.281165+00	2026-05-23 16:10:14.281165+00	\N	f	\N	\N	\N	\N	\N	f
30	17	Maia	SRD	mini_curto	\N	2026-05-23 16:10:55.418612+00	2026-05-23 16:10:55.418612+00	\N	f	\N	\N	\N	\N	\N	f
33	19	Lili	York	mini_longo	\N	2026-05-26 20:52:49.303482+00	2026-05-26 20:52:49.303482+00	\N	f	\N	\N	\N	\N	\N	f
34	19	Lili	York	mini_longo	\N	2026-05-26 20:53:28.221997+00	2026-05-26 20:53:28.221997+00	\N	f	\N	\N	\N	\N	\N	f
35	20	Luna	Lhasa Apso	pequeno_curto	\N	2026-05-26 20:57:32.616783+00	2026-05-26 20:57:32.616783+00	\N	f	\N	\N	\N	\N	\N	f
36	21	Bob	Lhasa Apso	pequeno_curto	\N	2026-05-26 21:02:03.46836+00	2026-05-26 21:02:03.46836+00	\N	f	\N	\N	\N	\N	\N	f
41	23	Diesil	SRD	medio_curto	\N	2026-05-26 21:34:46.218913+00	2026-05-26 21:34:46.218913+00	\N	f	\N	\N	\N	\N	\N	f
42	24	Lilica	Lhasa Apso	pequeno_curto	\N	2026-05-27 16:00:44.411975+00	2026-05-27 16:00:44.411975+00	\N	f	\N	\N	\N	\N	\N	f
43	24	Sindy	Lhasa Apso	pequeno_longo	\N	2026-05-27 16:01:04.848189+00	2026-05-27 16:01:04.848189+00	\N	f	\N	\N	\N	\N	\N	f
44	24	Thor	SRD	pequeno_curto	\N	2026-05-27 16:01:49.878334+00	2026-05-27 16:01:49.878334+00	\N	f	\N	\N	\N	\N	\N	f
45	24	Marley	Lhasa Apso	medio_curto	\N	2026-05-27 16:02:45.453774+00	2026-05-27 16:02:45.453774+00	\N	f	\N	\N	\N	\N	\N	f
46	25	FiFi	Spitz Alemão	mini_longo	\N	2026-05-27 21:05:22.326681+00	2026-05-27 21:05:22.326681+00	\N	f	\N	\N	\N	\N	\N	f
47	25	Boby	Spitz Alemão	mini_longo	\N	2026-05-27 21:05:57.919836+00	2026-05-27 21:05:57.919836+00	\N	f	\N	\N	\N	\N	\N	f
48	26	Bruninha	Lhasa Apso	pequeno_longo	\N	2026-05-28 11:34:10.115249+00	2026-05-28 11:34:10.115249+00	\N	f	\N	\N	\N	\N	\N	f
49	27	Nina	Lhasa Apso	pequeno_curto	\N	2026-05-28 16:25:57.056683+00	2026-05-28 16:25:57.056683+00	\N	f	\N	\N	\N	\N	\N	f
50	27	Judite	Pug	mini_curto	\N	2026-05-28 16:27:05.035283+00	2026-05-28 16:27:05.035283+00	\N	f	\N	\N	\N	\N	\N	f
51	28	Xico	Lhasa Apso	pequeno_curto	\N	2026-05-28 16:31:52.086761+00	2026-05-28 16:31:52.086761+00	\N	f	\N	\N	\N	\N	\N	f
52	28	Cléo	Lhasa Apso	pequeno_curto	\N	2026-05-28 16:32:13.108839+00	2026-05-28 16:32:13.108839+00	\N	f	\N	\N	\N	\N	\N	f
53	29	Jorge	SRD	pequeno_curto	\N	2026-05-28 16:36:17.877329+00	2026-05-28 16:36:17.877329+00	\N	f	\N	\N	\N	\N	\N	f
54	30	Ragnar 	Golden Retrivel	medio_longo	\N	2026-05-28 16:39:38.081237+00	2026-05-28 16:39:38.081237+00	\N	f	\N	\N	\N	\N	\N	f
55	31	Tigre	SRD	medio_curto	\N	2026-05-30 11:24:37.625412+00	2026-05-30 11:24:37.625412+00	\N	f	\N	\N	\N	\N	\N	f
56	32	Lily	piquenês	pequeno_curto	\N	2026-05-30 11:27:20.975197+00	2026-05-30 11:27:20.975197+00	\N	f	\N	\N	\N	\N	\N	f
57	33	Bolinha	Lhasa Apso	pequeno_longo	\N	2026-05-30 16:09:51.801922+00	2026-05-30 16:09:51.801922+00	\N	f	\N	\N	\N	\N	\N	f
58	34	Pipoca	poodle	pequeno_curto	cuidado ao fazer higienica no bumbum	2026-06-04 23:43:24.833778+00	2026-06-04 23:43:24.833778+00	\N	f	\N	\N	\N	\N	\N	f
59	35	Marrie	york	mini_curto	Cuidado em fazer a higienica e a completa animal bem agitada!	2026-06-04 23:46:26.479319+00	2026-06-04 23:46:26.479319+00	\N	f	\N	\N	\N	\N	\N	f
60	35	Marrie	york	mini_curto	Cuidado em fazer a higienica e a completa animal bem agitada!	2026-06-04 23:46:26.670473+00	2026-06-04 23:46:26.670473+00	\N	f	\N	\N	\N	\N	\N	f
61	36	Mally	Lhasa Apso	pequeno_longo	medrosa, medo de altura , cuidado com a mesa de tosa e secagem	2026-06-04 23:49:13.689029+00	2026-06-04 23:49:13.689029+00	\N	f	\N	\N	\N	\N	\N	f
63	37	Belinha	Lhasa Apso	pequeno_curto	briguenta	2026-06-04 23:52:08.411981+00	2026-06-04 23:52:08.411981+00	\N	f	\N	\N	\N	\N	\N	f
64	38	Bill	poodle	pequeno_curto	nervoso devido a idade	2026-06-04 23:54:58.60862+00	2026-06-04 23:54:58.60862+00	\N	f	\N	\N	\N	\N	\N	f
65	38	Venus	SRD	pequeno_curto	medrosa e muito forte	2026-06-04 23:55:48.236289+00	2026-06-04 23:55:48.236289+00	\N	f	\N	\N	\N	\N	\N	f
66	39	Mel	york	pequeno_curto	faz xixi e senta encima	2026-06-04 23:58:06.3586+00	2026-06-04 23:58:06.3586+00	\N	f	\N	\N	\N	\N	\N	f
67	40	Samuel	golden	grande_longo	tranquilo	2026-06-05 00:00:10.741926+00	2026-06-05 00:00:10.741926+00	\N	f	\N	\N	\N	\N	\N	f
68	41	Chloe	spitz alemão	mini_longo	faz xixi no colo	2026-06-05 00:02:03.336381+00	2026-06-05 00:02:03.336381+00	\N	f	\N	\N	\N	\N	\N	f
69	41	Mel	Spitz Alemão	pequeno_longo	coco grudado na bunda sempre	2026-06-05 00:03:13.18498+00	2026-06-05 00:03:13.18498+00	\N	f	\N	\N	\N	\N	\N	f
70	42	Otávio	schnauzer Miniatura	pequeno_curto	morde, e sem perfume	2026-06-05 00:05:48.889971+00	2026-06-05 00:05:48.889971+00	\N	f	\N	\N	\N	\N	\N	f
71	43	Zara	Spitz Alemão	mini_longo	milindrosa	2026-06-11 11:10:35.28579+00	2026-06-11 11:10:35.28579+00	\N	f	\N	\N	\N	\N	\N	f
72	43	Valentino	Spitz Alemão	mini_longo	barulhento	2026-06-11 11:12:24.856733+00	2026-06-11 11:12:24.856733+00	\N	f	\N	\N	\N	\N	\N	f
31	18	Otávio	Yok	mini_longo	\N	2026-05-26 17:23:15.71063+00	2026-06-24 00:31:18.466+00	\N	t	\N	\N	\N	\N	\N	f
38	22	Romeu	Spitz Alemão	pequeno_longo	\N	2026-05-26 21:30:21.878329+00	2026-06-24 00:48:01.599+00	\N	t	longa	\N	\N	\N	\N	t
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, tenant_id, name, description, size, price, duration_minutes, created_at, updated_at) FROM stdin;
21	1	Banho	\N	gigante	140.00	60	2026-05-19 15:02:42.430671+00	2026-05-19 15:02:42.430671+00
22	1	Banho	\N	mini_longo	50.00	60	2026-05-19 15:02:42.42735+00	2026-05-19 15:02:42.42735+00
23	1	Banho	\N	grande_curto	110.00	60	2026-05-19 15:02:42.429615+00	2026-05-19 15:02:42.429615+00
24	1	Banho	\N	pequeno_curto	55.00	60	2026-05-19 15:02:42.428885+00	2026-05-19 15:02:42.428885+00
25	1	Banho	\N	mini_curto	45.00	60	2026-05-19 15:02:42.68923+00	2026-05-19 15:02:42.68923+00
26	1	Banho	\N	medio_longo	80.00	60	2026-05-19 15:02:42.690584+00	2026-05-19 15:02:42.690584+00
27	1	Banho	\N	grande_longo	120.00	60	2026-05-19 15:02:42.704401+00	2026-05-19 15:02:42.704401+00
28	1	Banho	\N	medio_curto	70.00	60	2026-05-19 15:02:42.707492+00	2026-05-19 15:02:42.707492+00
29	1	Banho	\N	pequeno_longo	60.00	60	2026-05-19 15:02:42.709354+00	2026-05-19 15:02:42.709354+00
30	1	Banho + Tosa Higiênica	\N	grande_curto	120.00	60	2026-05-19 15:04:24.541869+00	2026-05-19 15:04:24.541869+00
31	1	Banho + Tosa Higiênica	\N	pequeno_longo	80.00	60	2026-05-19 15:04:24.538487+00	2026-05-19 15:04:24.538487+00
32	1	Banho + Tosa Higiênica	\N	mini_longo	70.00	60	2026-05-19 15:04:24.538036+00	2026-05-19 15:04:24.538036+00
33	1	Banho + Tosa Higiênica	\N	pequeno_curto	75.00	60	2026-05-19 15:04:24.542347+00	2026-05-19 15:04:24.542347+00
34	1	Banho + Tosa Higiênica	\N	medio_longo	95.00	60	2026-05-19 15:04:24.539385+00	2026-05-19 15:04:24.539385+00
35	1	Banho + Tosa Higiênica	\N	gigante	180.00	60	2026-05-19 15:04:24.991117+00	2026-05-19 15:04:24.991117+00
36	1	Banho + Tosa Higiênica	\N	medio_curto	85.00	60	2026-05-19 15:04:24.992469+00	2026-05-19 15:04:24.992469+00
37	1	Banho + Tosa Higiênica	\N	mini_curto	65.00	60	2026-05-19 15:04:24.993562+00	2026-05-19 15:04:24.993562+00
38	1	Banho + Tosa Higiênica	\N	grande_longo	145.00	60	2026-05-19 15:04:24.995723+00	2026-05-19 15:04:24.995723+00
39	1	Banho + Tosa Maquina	\N	mini_longo	80.00	90	2026-05-19 15:05:34.540847+00	2026-05-19 15:05:34.540847+00
40	1	Banho + Tosa Maquina	\N	medio_longo	140.00	90	2026-05-19 15:05:34.54975+00	2026-05-19 15:05:34.54975+00
41	1	Banho + Tosa Maquina	\N	medio_curto	120.00	90	2026-05-19 15:05:34.585323+00	2026-05-19 15:05:34.585323+00
42	1	Banho + Tosa Maquina	\N	grande_curto	150.00	90	2026-05-19 15:05:34.593644+00	2026-05-19 15:05:34.593644+00
43	1	Banho + Tosa Maquina	\N	pequeno_curto	100.00	90	2026-05-19 15:05:34.59573+00	2026-05-19 15:05:34.59573+00
44	1	Banho + Tosa Maquina	\N	pequeno_longo	100.00	90	2026-05-19 15:05:34.650741+00	2026-05-19 15:05:34.650741+00
45	1	Banho + Tosa Maquina	\N	mini_curto	75.00	90	2026-05-19 15:05:34.652079+00	2026-05-19 15:05:34.652079+00
46	1	Banho + Tosa Maquina	\N	grande_longo	175.00	90	2026-05-19 15:05:35.070058+00	2026-05-19 15:05:35.070058+00
47	1	Banho + Tosa Tesoura	\N	pequeno_longo	150.00	120	2026-05-19 15:12:51.636801+00	2026-05-19 15:12:51.636801+00
48	1	Banho + Tosa Tesoura	\N	medio_longo	175.00	120	2026-05-19 15:12:51.637323+00	2026-05-19 15:12:51.637323+00
49	1	Banho + Tosa Tesoura	\N	grande_longo	250.00	120	2026-05-19 15:12:52.06388+00	2026-05-19 15:12:52.06388+00
50	1	Banho + Tosa Tesoura	\N	mini_longo	130.00	120	2026-05-19 15:12:52.128188+00	2026-05-19 15:12:52.128188+00
51	1	Tosa Maquina Avulso	\N	grande_curto	50.00	60	2026-05-19 15:13:19.442974+00	2026-05-19 15:13:19.442974+00
52	1	Tosa Maquina Avulso	\N	pequeno_longo	45.00	60	2026-05-19 15:13:19.452823+00	2026-05-19 15:13:19.452823+00
53	1	Tosa Maquina Avulso	\N	mini_curto	40.00	60	2026-05-19 15:13:19.453588+00	2026-05-19 15:13:19.453588+00
54	1	Tosa Maquina Avulso	\N	grande_longo	55.00	60	2026-05-19 15:13:19.454637+00	2026-05-19 15:13:19.454637+00
55	1	Tosa Maquina Avulso	\N	pequeno_curto	40.00	60	2026-05-19 15:13:19.455536+00	2026-05-19 15:13:19.455536+00
56	1	Tosa Maquina Avulso	\N	medio_curto	45.00	60	2026-05-19 15:13:19.456338+00	2026-05-19 15:13:19.456338+00
57	1	Tosa Maquina Avulso	\N	medio_longo	50.00	60	2026-05-19 15:13:19.456998+00	2026-05-19 15:13:19.456998+00
58	1	Tosa Maquina Avulso	\N	mini_longo	40.00	60	2026-05-19 15:13:19.461357+00	2026-05-19 15:13:19.461357+00
59	1	Tosa Tesoura para Pacotista	\N	mini_longo	55.00	90	2026-05-19 15:14:17.14045+00	2026-05-19 15:14:17.14045+00
60	1	Tosa Tesoura para Pacotista	\N	pequeno_longo	55.00	90	2026-05-19 15:14:17.163271+00	2026-05-19 15:14:17.163271+00
61	1	Tosa Tesoura para Pacotista	\N	medio_longo	65.00	90	2026-05-19 15:14:17.167339+00	2026-05-19 15:14:17.167339+00
62	1	Tosa Tesoura para Pacotista	\N	grande_longo	85.00	90	2026-05-19 15:14:17.202977+00	2026-05-19 15:14:17.202977+00
63	1	Desembolo	\N	pequeno_longo	20.00	60	2026-05-22 15:25:23.377349+00	2026-05-22 15:25:23.377349+00
64	1	Desembolo	\N	mini_longo	20.00	60	2026-05-22 15:25:23.374163+00	2026-05-22 15:25:23.374163+00
65	1	Desembolo	\N	pequeno_curto	20.00	60	2026-05-22 15:25:23.490429+00	2026-05-22 15:25:23.490429+00
66	1	Desembolo	\N	grande_curto	35.00	60	2026-05-22 15:25:23.491673+00	2026-05-22 15:25:23.491673+00
67	1	Desembolo	\N	medio_curto	25.00	60	2026-05-22 15:25:23.492985+00	2026-05-22 15:25:23.492985+00
68	1	Desembolo	\N	mini_curto	15.00	60	2026-05-22 15:25:23.50004+00	2026-05-22 15:25:23.50004+00
69	1	Desembolo	\N	medio_longo	30.00	60	2026-05-22 15:25:23.501023+00	2026-05-22 15:25:23.501023+00
70	1	Desembolo	\N	grande_longo	40.00	60	2026-05-22 15:25:23.502544+00	2026-05-22 15:25:23.502544+00
71	1	Desembolo	\N	gigante	50.00	60	2026-05-22 15:25:23.82619+00	2026-05-22 15:25:23.82619+00
72	1	Corte de Unha	\N	mini_longo	10.00	60	2026-05-22 15:25:41.62601+00	2026-05-22 15:25:41.62601+00
73	1	Corte de Unha	\N	pequeno_longo	10.00	60	2026-05-22 15:25:41.738444+00	2026-05-22 15:25:41.738444+00
74	1	Corte de Unha	\N	pequeno_curto	10.00	60	2026-05-22 15:25:41.750644+00	2026-05-22 15:25:41.750644+00
75	1	Corte de Unha	\N	medio_longo	10.00	60	2026-05-22 15:25:41.810107+00	2026-05-22 15:25:41.810107+00
76	1	Corte de Unha	\N	grande_longo	10.00	60	2026-05-22 15:25:41.817795+00	2026-05-22 15:25:41.817795+00
77	1	Corte de Unha	\N	gigante	10.00	60	2026-05-22 15:25:41.822951+00	2026-05-22 15:25:41.822951+00
78	1	Corte de Unha	\N	mini_curto	10.00	60	2026-05-22 15:25:41.826215+00	2026-05-22 15:25:41.826215+00
79	1	Corte de Unha	\N	grande_curto	10.00	60	2026-05-22 15:25:41.8332+00	2026-05-22 15:25:41.8332+00
80	1	Corte de Unha	\N	medio_curto	10.00	60	2026-05-22 15:25:41.834317+00	2026-05-22 15:25:41.834317+00
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
0de4e3f20d4261d518495135027186050892802d2649541cced28c80a968d82a	{"user": {"id": "37402339", "email": "allquero@gmail.com", "lastName": "Rodrigues", "firstName": "Allysson", "profileImageUrl": "https://lh3.googleusercontent.com/a/ACg8ocIGtqARTY4C5JX8rkCD0Rx3ahutYHte_uwdQhNAkStjfh-EqllafQ=s96-c"}, "expires_at": 1779179282, "access_token": "8PgC00UZ9mqPqJLOVi2iDb6w7b4qJJpVIQp0IwHZWy_", "refresh_token": "ozRUb-nRlCwZVQICbX9KV3kgA8b1giHKw1-W7R1yBWb"}	2026-05-26 07:28:03.823
5f131f0d4c62eaca228822559d90944241edc5bde6ef4ed43e394226786039bc	{"user": {"id": "4bfbbe00-7caa-40cd-8fd3-73b25b991c07", "email": "contato@dogwash.pet", "isAdmin": false, "lastName": null, "firstName": "Dog Wash", "profileImageUrl": null}}	2026-08-01 05:43:43.503
ce6b5895abd71df24a5b54cfca1ad2e4c6f82772b01663ce2c104ef9aeeb999f	{"user": {"id": "4bfbbe00-7caa-40cd-8fd3-73b25b991c07", "email": "contato@dogwash.pet", "isAdmin": false, "lastName": null, "firstName": "Dog Wash", "profileImageUrl": null}}	2026-08-01 16:32:21.31
bbd9dafcc9d28b6e650a0d0549f86d91d23f2c3d8f0df3ff1b1ecb1d8fd3115e	{"user": {"id": "4bfbbe00-7caa-40cd-8fd3-73b25b991c07", "email": "contato@dogwash.pet", "isAdmin": false, "lastName": null, "firstName": "Dog Wash", "profileImageUrl": null}}	2026-08-02 14:31:58.448
113f15b0a4fae2bc7533e10ee421fd908924e613878063fc9294e90fea6c462f	{"user": {"id": "4bfbbe00-7caa-40cd-8fd3-73b25b991c07", "email": "contato@dogwash.pet", "isAdmin": false, "lastName": null, "firstName": "Dog Wash", "profileImageUrl": null}}	2026-08-02 14:32:38.486
8006931edb46f5bddd19412d63ec855859ddb9ae1dff4a66fff1c27f909caf23	{"user": {"id": "4bfbbe00-7caa-40cd-8fd3-73b25b991c07", "email": "contato@dogwash.pet", "isAdmin": false, "lastName": null, "firstName": "Dog Wash", "profileImageUrl": null}}	2026-08-02 14:42:52.462
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, phone, email, address, created_at, updated_at, user_id, access_start, access_end, scheduling_method) FROM stdin;
1	Dog Wash | Estética Animal	(44) 99927-0651	petpontocaomga@gmail.com	Osires Sthenghel Guimarães	2026-05-12 03:39:57.50044+00	2026-06-24 00:17:38.806+00	4bfbbe00-7caa-40cd-8fd3-73b25b991c07	2026-05-19	2026-07-19	periodo
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at, password_hash, is_admin) FROM stdin;
59063320	petpontocaomga@gmail.com	Agenda	Dog Wash	https://lh3.googleusercontent.com/a/ACg8ocJ_dSMn747fmzVL2gWd2__UDWl9qtH-f9IZOu_Hs0MQA-kmayU=s96-c	2026-05-19 09:03:30.842655+00	2026-05-19 14:02:32.028+00	$2b$12$YtH8aDgA7mhS4YH8IbjR2.AXBUSuVzPoXTunaHzsZChg9B1/lUB2S	t
4bfbbe00-7caa-40cd-8fd3-73b25b991c07	contato@dogwash.pet	Dog Wash	\N	\N	2026-06-12 21:30:09.558457+00	2026-06-12 21:30:09.558457+00	$2b$12$wJ3Pw8sWDAyrb3Wyd9WPQ.rwe7uCAeN4v8zcIhS3evgOB.BRF7CgK	f
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: -
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: admin_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_sales_id_seq', 1, false);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointments_id_seq', 81, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 43, true);


--
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.financial_entries_id_seq', 18, true);


--
-- Name: message_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_templates_id_seq', 44, true);


--
-- Name: packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.packages_id_seq', 9, true);


--
-- Name: pets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pets_id_seq', 72, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 80, true);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenants_id_seq', 2, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_sales admin_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sales
    ADD CONSTRAINT admin_sales_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: tenants_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_user_id_unique ON public.tenants USING btree (user_id);


--
-- Name: admin_sales admin_sales_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_sales
    ADD CONSTRAINT admin_sales_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_package_id_packages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_package_id_packages_id_fk FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_pet_id_pets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pet_id_pets_id_fk FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: clients clients_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: financial_entries financial_entries_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT financial_entries_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: message_templates message_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: packages packages_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: pets pets_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: services services_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hdpmLThgmcTMI4PRdX4udHga7k5TEkVzAln4ehHVR5Te5Wbf6UfOGe7LJ2HfWi0

