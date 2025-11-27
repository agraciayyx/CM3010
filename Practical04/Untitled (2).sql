CREATE TABLE `roles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., Administrator, Manager, Standard User'
);

CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(100) NOT NULL COMMENT 'In production: store hashed',
  `role_id` INT NOT NULL
);

CREATE TABLE `categories` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE `products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `category_id` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0 COMMENT 'Updated by draws and additions'
);

CREATE TABLE `stock_movements` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `type` ENUM(IN,OUT) NOT NULL,
  `quantity` INT NOT NULL,
  `user_id` INT NOT NULL,
  `timestamp` DATETIME DEFAULT (NOW())
);

ALTER TABLE `users` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

ALTER TABLE `products` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `stock_movements` ADD FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `stock_movements` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
