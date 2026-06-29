ALTER TABLE "users" ADD COLUMN "neighborhood_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_lat" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_lng" real;