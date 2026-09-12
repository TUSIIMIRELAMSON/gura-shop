CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`button_label` text DEFAULT 'Shop this offer' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`subcategory` text DEFAULT '' NOT NULL,
	`product_id` text,
	`image_key` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "promotion_date_order" CHECK("promotions"."ends_at" > "promotions"."starts_at")
);
--> statement-breakpoint
CREATE INDEX `promotions_schedule` ON `promotions` (`active`,`starts_at`,`ends_at`);--> statement-breakpoint
ALTER TABLE `products` ADD `subcategory` text DEFAULT '' NOT NULL;