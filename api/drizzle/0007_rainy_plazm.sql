ALTER TABLE "points_transactions" ADD COLUMN "contract_id" text;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD COLUMN "type" text DEFAULT 'bonus' NOT NULL;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
CREATE INDEX "points_tx_contract_idx" ON "points_transactions" USING btree ("contract_id");--> statement-breakpoint
ALTER TABLE "points_balances" ADD CONSTRAINT "points_balances_min_balance" CHECK ("points_balances"."balance" >= -10);--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_tx_type_check" CHECK ("points_transactions"."type" in ('service_payment','bonus','correction'));--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_tx_status_check" CHECK ("points_transactions"."status" in ('pending','completed','cancelled'));