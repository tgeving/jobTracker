-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

-- Drop table

-- DROP TABLE public.applied;

CREATE TABLE public.applied (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT applied_id_not_null NOT NULL id,
	CONSTRAINT applied_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE public.declined;

CREATE TABLE public.declined (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT declined_id_not_null NOT NULL id,
	CONSTRAINT declined_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE public.disappointing;

CREATE TABLE public.disappointing (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT disappointing_id_not_null NOT NULL id,
	CONSTRAINT disappointing_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE public.withdrew;

-- DROP TABLE public.withdrew; (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT withdrew_id_not_null NOT NULL id,
	CONSTRAINT withdrew_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE public.new_jobs_found;

CREATE TABLE public.new_jobs_found (
	id serial4 NOT NULL,
	bucket varchar(50) DEFAULT 'New Jobs'::character varying NULL,
	company varchar(255) NOT NULL,
	"position" varchar(255) NOT NULL,
	date_applied varchar(100) NULL,
	wfh varchar(50) NULL,
	job_link text NULL,
	notes text NULL,
	CONSTRAINT new_jobs_found_company_not_null NOT NULL company,
	CONSTRAINT new_jobs_found_id_not_null NOT NULL id,
	CONSTRAINT new_jobs_found_pkey PRIMARY KEY (id),
	CONSTRAINT new_jobs_found_position_not_null NOT NULL "position",
	CONSTRAINT unique_job UNIQUE (company, "position")
);

-- Drop table

-- DROP TABLE public.pending;

CREATE TABLE public.pending (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	no_of_interviews varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT pending_id_not_null NOT NULL id,
	CONSTRAINT pending_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE public.unresponsive;

CREATE TABLE public.unresponsive (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT unresponsive_id_not_null NOT NULL id,
	CONSTRAINT unresponsive_pkey PRIMARY KEY (id)
);

-- Drop table

-- DROP TABLE public.waiting_to_hear_back;

CREATE TABLE public.waiting_to_hear_back (
	company varchar NULL,
	date_applied varchar NULL,
	"position" varchar NULL,
	wfh varchar NULL,
	scheduled varchar NULL,
	"type" varchar NULL,
	response_back varchar NULL,
	notes varchar NULL,
	job_link varchar NULL,
	id serial4 NOT NULL,
	no_of_interviews int4 NULL,
	CONSTRAINT waiting_to_hear_back_id_not_null NOT NULL id,
	CONSTRAINT waiting_to_hear_back_pkey PRIMARY KEY (id)
);
