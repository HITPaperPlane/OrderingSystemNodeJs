CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dishId` INT NOT NULL,      -- 外键指向 dishes(id)
  `userId` INT NOT NULL,      -- 外键指向 users(id)
  `time` DATETIME DEFAULT NULL,  
  `pickupTime` DATETIME DEFAULT NULL,
  `specialRequests` TEXT,
  `photo` VARCHAR(255) DEFAULT NULL,
  `dname` VARCHAR(255) DEFAULT NULL,
  `price` DECIMAL(10,2) DEFAULT 0.00,
  `quantity` INT DEFAULT 1,
  `paymentType` VARCHAR(50) DEFAULT NULL,
  `states` VARCHAR(50) DEFAULT 'NA',

  -- 外键约束 
  CONSTRAINT `fk_orders_dishId`
    FOREIGN KEY (`dishId`)
    REFERENCES `dishes` (`id`)
    ON DELETE CASCADE 
    ON UPDATE CASCADE,

  CONSTRAINT `fk_orders_userId`
    FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
