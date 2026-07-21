CREATE INDEX "incidents_neighborhood_id_idx" ON "incidents" USING btree ("neighborhood_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_neighborhood_id_idx" ON "users" USING btree ("neighborhood_id");