CREATE TABLE `cart` (
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`user_id`, `product_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cart_positive" CHECK("cart"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`price` integer NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer NOT NULL,
	`image` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_positive" CHECK("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`request_id` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`delivery_fee` integer NOT NULL,
	`currency` text NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`delivery_date` text DEFAULT '' NOT NULL,
	`recipient` text NOT NULL,
	`address` text NOT NULL,
	`phone` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_id_unique` ON `orders` (`request_id`);--> statement-breakpoint
CREATE INDEX `orders_user_date` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_product` ON `photos` (`product_id`,`position`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`unit` text NOT NULL,
	`quantity` integer NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`cover_image` text,
	`sort_key` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("products"."quantity" >= 0),
	CONSTRAINT "price_nonnegative" CHECK("products"."price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `products_browse` ON `products` (`active`,`sort_key`);--> statement-breakpoint
CREATE INDEX `products_category` ON `products` (`category`,`active`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'customer' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`avatar` text,
	`recipient` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`delivery_phone` text DEFAULT '' NOT NULL,
	`country` text DEFAULT 'Uganda' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`notifications` integer DEFAULT 1 NOT NULL,
	`gold_requested` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "user_role" CHECK("users"."role" IN ('admin','customer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_shop_owner` ON `users` (`role`) WHERE "users"."role" = 'admin';
