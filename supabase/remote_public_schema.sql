--
-- PostgreSQL database dump
--

-- \restrict 4D67wGqoo4MJ4qJSCMI8iFqz8ObX7zBRtMiEUEwevmaxIlCL7fW6gUAlXdqYFQu

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: is_active_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_active_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.id = auth.uid()
      and ap.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_active_admin"() OWNER TO "postgres";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: admin_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."admin_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_profiles_email_not_blank" CHECK (("char_length"("btrim"("email")) > 0)),
    CONSTRAINT "admin_profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."admin_profiles" OWNER TO "postgres";

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "grace_days" integer NOT NULL,
    "payment_reminder_template" "text" NOT NULL,
    "suspension_notice_template" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_settings_grace_days_check" CHECK ((("grace_days" >= 0) AND ("grace_days" <= 30))),
    CONSTRAINT "app_settings_payment_template_not_blank" CHECK (("char_length"("btrim"("payment_reminder_template")) > 0)),
    CONSTRAINT "app_settings_singleton_check" CHECK (("id" = 1)),
    CONSTRAINT "app_settings_suspension_template_not_blank" CHECK (("char_length"("btrim"("suspension_notice_template")) > 0))
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "text" NOT NULL,
    "actor_admin_id" "uuid",
    CONSTRAINT "audit_logs_action_not_blank" CHECK (("char_length"("btrim"("action")) > 0)),
    CONSTRAINT "audit_logs_entity_id_not_blank" CHECK (("char_length"("btrim"("entity_id")) > 0)),
    CONSTRAINT "audit_logs_entity_type_not_blank" CHECK (("char_length"("btrim"("entity_type")) > 0)),
    CONSTRAINT "audit_logs_result_check" CHECK (("result" = ANY (ARRAY['ok'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";


--
-- Name: crops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."crops" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "size" real,
    "start_date" "date",
    "end_date" "date",
    "user" "uuid"
);


ALTER TABLE "public"."crops" OWNER TO "postgres";

--
-- Name: crops_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."crops" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."crops_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "expense_type" bigint,
    "amount" double precision,
    "crop_id" smallint
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."expenses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."expenses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expenses_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."expenses_type" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."expenses_type" OWNER TO "postgres";

--
-- Name: expenses_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."expenses_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."expenses_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "paid_at" timestamp with time zone,
    "due_at" "date" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_cents_positive_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "payments_currency_usd_check" CHECK (("currency" = 'USD'::"text")),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan" "text" NOT NULL,
    "status" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "next_billing_date" "date",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    CONSTRAINT "subscriptions_amount_cents_positive_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "subscriptions_billing_date_check" CHECK ((("next_billing_date" IS NULL) OR ("next_billing_date" >= "start_date"))),
    CONSTRAINT "subscriptions_currency_usd_check" CHECK (("currency" = 'USD'::"text")),
    CONSTRAINT "subscriptions_plan_not_blank" CHECK (("char_length"("btrim"("plan")) > 0)),
    CONSTRAINT "subscriptions_source_not_blank" CHECK (("char_length"("btrim"("source")) > 0)),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['activa'::"text", 'gracia'::"text", 'suspendida'::"text", 'terminada'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "whatsapp" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    CONSTRAINT "users_full_name_not_blank" CHECK (("char_length"("btrim"("full_name")) > 0)),
    CONSTRAINT "users_whatsapp_not_blank" CHECK (("char_length"("btrim"("whatsapp")) > 0))
);


ALTER TABLE "public"."users" OWNER TO "postgres";

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");


--
-- Name: admin_profiles admin_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_email_key" UNIQUE ("email");


--
-- Name: admin_profiles admin_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id");


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: crops crops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."crops"
    ADD CONSTRAINT "crops_pkey" PRIMARY KEY ("id");


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");


--
-- Name: expenses_type expenses_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expenses_type"
    ADD CONSTRAINT "expenses_type_pkey" PRIMARY KEY ("id");


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: subscriptions subscriptions_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_unique" UNIQUE ("user_id");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: users users_whatsapp_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_whatsapp_unique" UNIQUE ("whatsapp");


--
-- Name: admin_profiles_active_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "admin_profiles_active_role_idx" ON "public"."admin_profiles" USING "btree" ("is_active", "role");


--
-- Name: audit_logs_actor_admin_lookup_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_actor_admin_lookup_idx" ON "public"."audit_logs" USING "btree" ("actor_admin_id", "occurred_at" DESC) WHERE ("actor_admin_id" IS NOT NULL);


--
-- Name: audit_logs_entity_lookup_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_entity_lookup_idx" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id", "occurred_at" DESC);


--
-- Name: audit_logs_occurred_at_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_occurred_at_desc_idx" ON "public"."audit_logs" USING "btree" ("occurred_at" DESC);


--
-- Name: payments_paid_only_paid_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payments_paid_only_paid_at_idx" ON "public"."payments" USING "btree" ("paid_at" DESC) WHERE ("status" = 'paid'::"text");


--
-- Name: payments_status_paid_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payments_status_paid_at_idx" ON "public"."payments" USING "btree" ("status", "paid_at" DESC);


--
-- Name: payments_subscription_paid_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payments_subscription_paid_at_idx" ON "public"."payments" USING "btree" ("subscription_id", "paid_at" DESC);


--
-- Name: payments_user_paid_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payments_user_paid_at_idx" ON "public"."payments" USING "btree" ("user_id", "paid_at" DESC);


--
-- Name: subscriptions_created_at_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscriptions_created_at_desc_idx" ON "public"."subscriptions" USING "btree" ("created_at" DESC);


--
-- Name: subscriptions_next_billing_date_not_null_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscriptions_next_billing_date_not_null_idx" ON "public"."subscriptions" USING "btree" ("next_billing_date") WHERE ("next_billing_date" IS NOT NULL);


--
-- Name: subscriptions_status_next_billing_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "subscriptions_status_next_billing_idx" ON "public"."subscriptions" USING "btree" ("status", "next_billing_date");


--
-- Name: users_created_at_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_created_at_desc_idx" ON "public"."users" USING "btree" ("created_at" DESC);


--
-- Name: users_full_name_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_full_name_trgm_idx" ON "public"."users" USING "gin" ("full_name" "public"."gin_trgm_ops");


--
-- Name: users_whatsapp_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_whatsapp_trgm_idx" ON "public"."users" USING "gin" ("whatsapp" "public"."gin_trgm_ops");


--
-- Name: admin_profiles set_admin_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_admin_profiles_updated_at" BEFORE UPDATE ON "public"."admin_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: app_settings set_app_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_app_settings_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: payments set_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: subscriptions set_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: users set_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "set_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: admin_profiles admin_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."admin_profiles"
    ADD CONSTRAINT "admin_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin_profiles"("id") ON DELETE SET NULL;


--
-- Name: crops crops_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."crops"
    ADD CONSTRAINT "crops_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_expense_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_expense_type_fkey" FOREIGN KEY ("expense_type") REFERENCES "public"."expenses_type"("id") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: admin_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."admin_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_profiles admin_profiles_select_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin_profiles_select_active_admin" ON "public"."admin_profiles" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: admin_profiles admin_profiles_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "admin_profiles_select_own" ON "public"."admin_profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings_select_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "app_settings_select_active_admin" ON "public"."app_settings" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: app_settings app_settings_update_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "app_settings_update_active_admin" ON "public"."app_settings" FOR UPDATE TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_insert_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "audit_logs_insert_active_admin" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_admin"());


--
-- Name: audit_logs audit_logs_select_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "audit_logs_select_active_admin" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: crops; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."crops" ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses_type; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."expenses_type" ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_delete_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "payments_delete_active_admin" ON "public"."payments" FOR DELETE TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: payments payments_insert_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "payments_insert_active_admin" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_admin"());


--
-- Name: payments payments_select_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "payments_select_active_admin" ON "public"."payments" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: payments payments_update_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "payments_update_active_admin" ON "public"."payments" FOR UPDATE TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_delete_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscriptions_delete_active_admin" ON "public"."subscriptions" FOR DELETE TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: subscriptions subscriptions_insert_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscriptions_insert_active_admin" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_admin"());


--
-- Name: subscriptions subscriptions_select_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscriptions_select_active_admin" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: subscriptions subscriptions_update_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "subscriptions_update_active_admin" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_delete_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_delete_active_admin" ON "public"."users" FOR DELETE TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: users users_insert_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_insert_active_admin" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_admin"());


--
-- Name: users users_select_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_select_active_admin" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());


--
-- Name: users users_update_active_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users_update_active_admin" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "is_active_admin"(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION "public"."is_active_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_admin"() TO "service_role";


--
-- Name: FUNCTION "set_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


--
-- Name: TABLE "admin_profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."admin_profiles" TO "anon";
GRANT ALL ON TABLE "public"."admin_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_profiles" TO "service_role";


--
-- Name: TABLE "app_settings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";


--
-- Name: TABLE "audit_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";


--
-- Name: SEQUENCE "audit_logs_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";


--
-- Name: TABLE "crops"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."crops" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."crops" TO "authenticated";
GRANT ALL ON TABLE "public"."crops" TO "service_role";


--
-- Name: SEQUENCE "crops_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."crops_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."crops_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."crops_id_seq" TO "service_role";


--
-- Name: TABLE "expenses"; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."expenses" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";


--
-- Name: SEQUENCE "expenses_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "service_role";


--
-- Name: TABLE "expenses_type"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."expenses_type" TO "anon";
GRANT ALL ON TABLE "public"."expenses_type" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses_type" TO "service_role";


--
-- Name: SEQUENCE "expenses_type_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."expenses_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expenses_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expenses_type_id_seq" TO "service_role";


--
-- Name: TABLE "payments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";


--
-- Name: TABLE "subscriptions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";


--
-- Name: TABLE "users"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

-- \unrestrict 4D67wGqoo4MJ4qJSCMI8iFqz8ObX7zBRtMiEUEwevmaxIlCL7fW6gUAlXdqYFQu

