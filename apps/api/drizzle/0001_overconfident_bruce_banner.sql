CREATE TABLE `provider_credential` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`credential_iv` text NOT NULL,
	`credential_ct` text NOT NULL,
	`hint` text NOT NULL,
	`status` text DEFAULT 'untested' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
