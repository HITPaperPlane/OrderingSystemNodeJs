CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderId` INT NOT NULL, -- 外键指向 orders.id
  `userId` INT NOT NULL,  -- 外键指向 users.id
  `rating` INT DEFAULT 0,
  `comment` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `adminReply` TEXT,
  `adminReplyCreatedAt` DATETIME DEFAULT NULL,
  `adminReplyRead` TINYINT(1) DEFAULT 0,

  -- 外键约束
  CONSTRAINT `fk_feedbacks_orderId`
    FOREIGN KEY (`orderId`)
    REFERENCES `orders` (`id`)
    ON DELETE CASCADE 
    ON UPDATE CASCADE,

  CONSTRAINT `fk_feedbacks_userId`
    FOREIGN KEY (`userId`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
